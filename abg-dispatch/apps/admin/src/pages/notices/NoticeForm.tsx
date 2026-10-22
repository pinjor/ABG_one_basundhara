import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Eye, FileText, Loader2, Paperclip, Save, Send, Trash2, Upload, X } from "lucide-react";
import {
  NOTICE_CATEGORY_LABEL,
  NOTICE_CHANNEL_LABEL,
  NOTICE_CHANNEL_SIGNATORY,
  NOTICE_LIMITS,
  NOTICE_TEXT_LIMITS,
  NoticeAudience,
  NoticeCategory,
  NoticeChannel,
  NoticeStatus,
  noticeChannelIsOfficeOnly,
  noticeChannelsFor,
} from "@abg-dispatch/shared";
import { api, newKey } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { ErrorNote, Field, Modal, Toggle, cx } from "../../components/ui";
import { toast } from "../../components/toast";
import { ChannelBadge, NoticeBody, UrgentBadge, fileSize, fromDhakaInput, looksLikePdf, sendForm, toDhakaInput, useOffices } from "./parts";
import type { Notice } from "./types";

interface Props {
  open: boolean;
  onClose: () => void;
  /** Editing an existing notice; omitted to post a new one. */
  notice?: Notice | null;
  onSaved: (notice: Notice, published: boolean) => void;
}

function SwitchRow({ label, hint, checked, onChange, disabled }: { label: string; hint: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-line bg-white px-3.5 py-3">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-ink">{label}</p>
        <p className="text-xs text-ink-muted">{hint}</p>
      </div>
      <Toggle checked={checked} onChange={onChange} label={label} disabled={disabled} />
    </div>
  );
}

/** Post a notice, edit a draft, or (once published) change only pin, urgency and expiry. */
export function NoticeFormModal({ open, onClose, notice, onSaved }: Props) {
  const profile = useAuth((s) => s.profile);
  const roles = profile?.roles ?? [];
  const offices = useOffices();
  const fileRef = useRef<HTMLInputElement>(null);
  const editing = !!notice;
  const publishedEdit = notice?.status === NoticeStatus.PUBLISHED;

  const myChannels = useMemo(() => noticeChannelsFor(roles), [roles]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [channel, setChannel] = useState<string>(myChannels[0] ?? NoticeChannel.HR);
  const [category, setCategory] = useState<string>(NoticeCategory.GENERAL);
  const [urgent, setUrgent] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [requiresAck, setRequiresAck] = useState(true);
  const [audience, setAudience] = useState<string>(NoticeAudience.ALL);
  const [branchIds, setBranchIds] = useState<string[]>([]);
  const [signedBy, setSignedBy] = useState("");
  const [expires, setExpires] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [removeAttachment, setRemoveAttachment] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [idemKey, setIdemKey] = useState(newKey);
  const [showPreview, setShowPreview] = useState(false);

  // Reset whenever the modal opens.
  useEffect(() => {
    if (!open) return;
    setTitle(notice?.title ?? "");
    setBody(notice?.body ?? "");
    setChannel(notice?.channel ?? myChannels[0] ?? NoticeChannel.HR);
    setCategory(notice?.category ?? NoticeCategory.GENERAL);
    setUrgent(notice?.urgent ?? false);
    setPinned(notice?.pinned ?? false);
    setRequiresAck(notice?.requiresAcknowledgement ?? true);
    setAudience(notice?.audience ?? NoticeAudience.ALL);
    setBranchIds(notice?.branches.map((b) => b.id) ?? []);
    setSignedBy(notice?.signedBy ?? "");
    setExpires(toDhakaInput(notice?.expiresAt));
    setFile(null);
    setRemoveAttachment(false);
    setProblem(null);
    setIdemKey(newKey());
    setShowPreview(false);
  }, [open, notice?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const officeOnly = noticeChannelIsOfficeOnly(roles, channel as NoticeChannel);
  useEffect(() => {
    if (officeOnly && audience !== NoticeAudience.BRANCHES) setAudience(NoticeAudience.BRANCHES);
  }, [officeOnly, audience]);
  const channelOptions = notice && !myChannels.includes(notice.channel as NoticeChannel) ? [...myChannels, notice.channel as NoticeChannel] : myChannels;
  const officeChoices = (offices.data ?? []).filter((o) => !officeOnly || profile?.scopedBranchIds.includes(o.id));
  const signatoryHint = `${profile?.displayName ?? "Your name"}, ${profile?.employee?.designation || NOTICE_CHANNEL_SIGNATORY[channel as NoticeChannel]}`;

  const validate = (): string | null => {
    if (publishedEdit) return expires && !fromDhakaInput(expires) ? "Give the expiry as a date and time." : null;
    if (title.trim().length < NOTICE_LIMITS.titleMin) return "Give the notice a title.";
    if (body.trim().length < NOTICE_TEXT_LIMITS.bodyMin) return `Write the notice — at least ${NOTICE_TEXT_LIMITS.bodyMin} characters.`;
    if (audience === NoticeAudience.BRANCHES && !branchIds.length) return "Choose at least one office.";
    const exp = fromDhakaInput(expires);
    if (expires && (!exp || new Date(exp).getTime() <= Date.now())) return "The expiry must be in the future.";
    return null;
  };

  const save = useMutation({
    mutationFn: async (publish: boolean): Promise<{ notice: Notice; published: boolean }> => {
      if (publishedEdit && notice) {
        const next = await api.patch<Notice>(`/notices/${notice.id}`, { pinned, urgent, expiresAt: fromDhakaInput(expires) });
        return { notice: next, published: false };
      }
      const fields = {
        title: title.trim(),
        body: body.trim(),
        channel,
        category,
        urgent,
        pinned,
        audience,
        branchIds: audience === NoticeAudience.BRANCHES ? branchIds : [],
        requiresAcknowledgement: requiresAck,
        signedBy: signedBy.trim(),
      };
      if (!notice) {
        const created = await sendForm<Notice>(
          "/notices",
          () => {
            const form = new FormData();
            for (const [k, v] of Object.entries(fields)) {
              if (Array.isArray(v)) v.forEach((id) => form.append(k, id));
              else form.append(k, String(v));
            }
            const exp = fromDhakaInput(expires);
            if (exp) form.append("expiresAt", exp);
            form.append("publish", String(publish));
            if (file) form.append("attachment", file, file.name);
            return form;
          },
          idemKey,
        );
        return { notice: created, published: publish };
      }
      let next = await api.patch<Notice>(`/notices/${notice.id}`, { ...fields, expiresAt: fromDhakaInput(expires), removeAttachment: removeAttachment && !file });
      if (file) {
        next = await sendForm<Notice>(`/notices/${notice.id}/attachment`, () => {
          const form = new FormData();
          form.append("attachment", file, file.name);
          return form;
        });
      }
      if (publish) next = await api.post<Notice>(`/notices/${notice.id}/publish`, {}, idemKey);
      return { notice: next, published: publish };
    },
    onSuccess: ({ notice: saved, published }) => {
      toast.success(publishedEdit ? "Notice updated." : published ? `Published ${saved.referenceNumber} — everyone in the audience has been notified.` : `Draft ${saved.referenceNumber} saved.`);
      onSaved(saved, published);
    },
  });

  const submit = (publish: boolean) => {
    const issue = validate();
    setProblem(issue);
    if (!issue) save.mutate(publish);
  };

  const pickFile = async (f: File | undefined) => {
    if (!f) return;
    if (f.size > NOTICE_LIMITS.attachmentMaxBytes) return setProblem("The PDF must be 15 MB or smaller.");
    if (!(await looksLikePdf(f))) return setProblem("That file is not a PDF. Attach the notice as a PDF document.");
    setProblem(null);
    setFile(f);
    setRemoveAttachment(false);
  };

  // The shared Modal refocuses its first field whenever onClose changes, so hand it a stable one.
  const closeRef = useRef(onClose);
  closeRef.current = save.isPending ? () => undefined : onClose;
  const stableClose = useCallback(() => closeRef.current(), []);

  const keptAttachment = notice?.attachment && !removeAttachment && !file ? notice.attachment : null;
  const busy = save.isPending;
  const toggleOffice = (id: string) => setBranchIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

  const preview = (
    <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-card">
      <div className="flex items-center justify-between gap-3 bg-hero px-4 py-3">
        <img src="/brand/abg-logo-light.png" alt="" className="h-7 w-auto" />
        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-platinum-deep">Preview</span>
      </div>
      {urgent && <div className="h-1 bg-danger" />}
      <div className="space-y-3 px-5 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <ChannelBadge channel={channel} size="sm" />
          {urgent && <UrgentBadge size="sm" />}
        </div>
        <h3 className="break-words font-display text-lg font-extrabold leading-snug text-navy">{title.trim() || "Your notice title"}</h3>
        {body.trim() ? <NoticeBody body={body} className="text-[13.5px] leading-relaxed" /> : <p className="text-sm text-ink-subtle">Paragraphs appear here as you type. Leave a blank line between paragraphs.</p>}
        <div className="border-t border-line pt-3">
          <p className="text-sm font-semibold text-navy">{signedBy.trim() || signatoryHint}</p>
          <p className="text-xs text-ink-subtle">{NOTICE_CHANNEL_LABEL[channel as NoticeChannel]}</p>
        </div>
      </div>
    </div>
  );

  return (
    <Modal
      open={open}
      onClose={stableClose}
      width={publishedEdit ? "max-w-lg" : "max-w-5xl"}
      title={publishedEdit ? "Change a published notice" : editing ? `Edit draft ${notice?.referenceNumber}` : "Post a notice"}
      subtitle={publishedEdit ? "The text, channel and audience are fixed once people have received it. You can pin it, mark it urgent or set when it leaves the board." : "Write it once; everyone in the audience gets it in the app straight away when you publish."}
      footer={
        <div className="flex w-full flex-wrap items-center justify-end gap-2">
          {!publishedEdit && <p className="mr-auto hidden text-xs text-ink-subtle md:block">Publishing notifies everyone in the audience at once.</p>}
          <button className="btn-ghost" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          {publishedEdit ? (
            <button className="btn-primary" onClick={() => submit(false)} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save changes
            </button>
          ) : (
            <>
              <button className="btn-secondary" onClick={() => submit(false)} disabled={busy}>
                {busy && save.variables === false ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save draft
              </button>
              <button className="btn-primary" onClick={() => submit(true)} disabled={busy}>
                {busy && save.variables === true ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Publish
              </button>
            </>
          )}
        </div>
      }
    >
      {publishedEdit ? (
        <div className="space-y-3">
          <SwitchRow label="Pin to the top" hint="Pinned notices stay above everything else on the board." checked={pinned} onChange={setPinned} />
          <SwitchRow label="Urgent" hint="Highlighted in red and sorted before other notices." checked={urgent} onChange={setUrgent} />
          <Field label="Leaves the board on (Dhaka time)" hint="Leave empty to keep it until it is archived.">
            {(id) => (
              <div className="flex gap-2">
                <input id={id} type="datetime-local" className="input" value={expires} onChange={(e) => setExpires(e.target.value)} />
                {expires && (
                  <button type="button" className="btn-ghost h-10 px-3" onClick={() => setExpires("")} aria-label="Remove expiry">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}
          </Field>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0 space-y-4">
            <Field label="Title">
              {(id) => <input id={id} className="input" value={title} maxLength={NOTICE_LIMITS.titleMax} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Foreign travel requires MD / Chairman sanction" data-autofocus />}
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="From (channel)" hint={channelOptions.length === 1 ? "Your role publishes on this channel." : undefined}>
                {(id) => (
                  <select id={id} className="input" value={channel} onChange={(e) => setChannel(e.target.value)}>
                    {channelOptions.map((c) => (
                      <option key={c} value={c}>
                        {NOTICE_CHANNEL_LABEL[c]}
                      </option>
                    ))}
                  </select>
                )}
              </Field>
              <Field label="Category">
                {(id) => (
                  <select id={id} className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
                    {Object.entries(NOTICE_CATEGORY_LABEL).map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </select>
                )}
              </Field>
            </div>
            <Field label="Notice" hint={`Leave a blank line between paragraphs · ${body.length.toLocaleString("en")} / ${NOTICE_LIMITS.bodyMax.toLocaleString("en")}`}>
              {(id) => (
                <textarea
                  id={id}
                  className="input min-h-[220px] py-2.5 leading-relaxed"
                  value={body}
                  maxLength={NOTICE_LIMITS.bodyMax}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder={"Dear colleagues,\n\nWrite the notice here…"}
                />
              )}
            </Field>
            <button type="button" className="btn-ghost -mt-2 h-9 px-2 text-xs lg:hidden" onClick={() => setShowPreview((v) => !v)} aria-expanded={showPreview}>
              <Eye className="h-3.5 w-3.5" /> {showPreview ? "Hide preview" : "Show preview"}
            </button>
            {showPreview && <div className="lg:hidden">{preview}</div>}

            <div className="grid gap-3 sm:grid-cols-3">
              <SwitchRow label="Urgent" hint="Red highlight, sorted first" checked={urgent} onChange={setUrgent} />
              <SwitchRow label="Pin to top" hint="Stays above the rest" checked={pinned} onChange={setPinned} />
              <SwitchRow label="Ask to acknowledge" hint="Readers confirm they read it" checked={requiresAck} onChange={setRequiresAck} />
            </div>

            <fieldset>
              <legend className="label">Who receives it</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {[
                  { value: NoticeAudience.ALL, label: "Everyone in the group", hint: "All offices, factories and the warehouse" },
                  { value: NoticeAudience.BRANCHES, label: "Chosen offices", hint: officeOnly ? "Office admins publish to their own offices" : "Only people based in these offices" },
                ].map((o) => {
                  const disabled = o.value === NoticeAudience.ALL && officeOnly;
                  return (
                    <label
                      key={o.value}
                      className={cx(
                        "flex cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-3 transition",
                        audience === o.value ? "border-navy bg-surface ring-2 ring-navy/10" : "border-line bg-white hover:border-line-strong",
                        disabled && "cursor-not-allowed opacity-50",
                      )}
                    >
                      <input type="radio" name="audience" className="mt-1 accent-navy" checked={audience === o.value} disabled={disabled} onChange={() => setAudience(o.value)} />
                      <span>
                        <span className="block text-sm font-semibold text-ink">{o.label}</span>
                        <span className="block text-xs text-ink-muted">{o.hint}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
              {audience === NoticeAudience.BRANCHES && (
                <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Offices">
                  {offices.isLoading && <p className="text-sm text-ink-muted">Loading offices…</p>}
                  {officeChoices.map((o) => {
                    const on = branchIds.includes(o.id);
                    return (
                      <button
                        key={o.id}
                        type="button"
                        aria-pressed={on}
                        onClick={() => toggleOffice(o.id)}
                        className={cx("inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition", on ? "border-navy bg-navy text-white" : "border-line-strong bg-white text-navy hover:bg-surface")}
                      >
                        {o.name} <span className={cx("mono text-[10.5px]", on ? "text-platinum" : "text-ink-subtle")}>{o.code}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </fieldset>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Signed by" hint="Shown under the notice">
                {(id) => <input id={id} className="input" value={signedBy} maxLength={NOTICE_TEXT_LIMITS.signedByMax} onChange={(e) => setSignedBy(e.target.value)} placeholder={signatoryHint} />}
              </Field>
              <Field label="Leaves the board on (optional)" hint="Asia/Dhaka time">
                {(id) => <input id={id} type="datetime-local" className="input" value={expires} onChange={(e) => setExpires(e.target.value)} />}
              </Field>
            </div>

            <div>
              <p className="label">PDF attachment (optional)</p>
              <input ref={fileRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(e) => (void pickFile(e.target.files?.[0]), (e.target.value = ""))} />
              {file || keptAttachment ? (
                <div className="flex items-center gap-3 rounded-xl border border-line bg-surface px-3.5 py-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-danger-soft text-danger">
                    <FileText className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">{file?.name ?? keptAttachment?.name}</p>
                    <p className="text-xs text-ink-muted">PDF · {fileSize(file?.size ?? keptAttachment?.sizeBytes ?? 0)}{file && editing ? " · replaces the current file" : ""}</p>
                  </div>
                  <button type="button" className="btn-ghost h-9 px-2 text-xs" onClick={() => fileRef.current?.click()}>
                    <Upload className="h-3.5 w-3.5" /> Replace
                  </button>
                  <button type="button" className="btn-ghost h-9 px-2 text-danger" aria-label="Remove attachment" onClick={() => (file ? setFile(null) : setRemoveAttachment(true))}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => (e.preventDefault(), void pickFile(e.dataTransfer.files?.[0]))}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line-strong bg-white px-4 py-5 text-sm font-medium text-ink-muted transition hover:border-navy hover:text-navy"
                >
                  <Paperclip className="h-4 w-4" /> Attach the signed circular as a PDF (up to 15 MB)
                </button>
              )}
            </div>
          </div>
          <aside className="hidden lg:block">
            <p className="label">Live preview</p>
            <div className="sticky top-0">{preview}</div>
          </aside>
        </div>
      )}
      {problem && <ErrorNote error={new Error(problem)} />}
      <ErrorNote error={save.error} />
    </Modal>
  );
}
