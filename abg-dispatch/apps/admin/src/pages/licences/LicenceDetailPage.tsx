import { useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Archive,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  BellRing,
  Building2,
  CalendarDays,
  Check,
  Eye,
  FileBadge,
  FilePenLine,
  FileText,
  FileUp,
  Landmark,
  Loader2,
  MessageSquare,
  RotateCcw,
  Send,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import {
  LICENCE_LIMITS,
  RENEWAL_STAGES,
  RENEWAL_STAGE_LABEL,
  RenewalStage,
  addCalendarDays,
  dhakaToday,
  isRenewalMoveBack,
  licenceAlertLevel,
  licenceAlertThreshold,
  licenceAlertThresholds,
  type LicenceAlertLevel as AlertLevel,
} from "@abg-dispatch/shared";
import { api, newKey, upload } from "../../lib/api";
import { stamp, when } from "../../lib/format";
import { toast } from "../../components/toast";
import { Card, ErrorNote, Field, KeyValue, Modal, Pill, Spinner, cx } from "../../components/ui";
import { CountdownBadge, CountdownRing, DocumentPreviewModal, LicenceFormModal, RenewalBar, StateBadge, fmtDate, fmtSize, fmtTaka } from "./components";
import type { Licence, LicenceEvent } from "./types";

const ACCEPT = "application/pdf,image/jpeg,image/png,image/webp";
const LEVEL_SHORT: Record<AlertLevel, string> = {
  OWNER: "Owner and compliance",
  OFFICE: "+ office admins",
  LEADERSHIP: "+ head office and MD / Chairman",
};
const FIELD_LABEL: Record<string, string> = {
  name: "name",
  licenceNumber: "licence number",
  category: "kind",
  issuingAuthority: "issuing authority",
  office: "office",
  owner: "owner",
  issuedAt: "issue date",
  expiresAt: "expiry date",
  renewalLeadDays: "renewal window",
  renewalFee: "renewal fee",
  notes: "notes",
};

function stageLabel(stage: unknown): string {
  return RENEWAL_STAGE_LABEL[stage as RenewalStage] ?? String(stage ?? "");
}

function changeValue(field: string, value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (field === "expiresAt" || field === "issuedAt") return fmtDate(String(value));
  if (field === "renewalFee") return fmtTaka(Number(value));
  if (field === "renewalLeadDays") return `${value} days`;
  return String(value);
}

function describe(e: LicenceEvent): { icon: LucideIcon; tone: string; text: string; detail?: string } {
  const m = e.metadata ?? {};
  switch (e.type) {
    case "CREATED":
      return { icon: FileBadge, tone: "bg-platinum-bright text-navy-500", text: `${e.actor} added this licence to the register` };
    case "DETAILS_CHANGED": {
      const changes = (m.changes ?? {}) as Record<string, { before: unknown; after: unknown }>;
      if (changes.active) return { icon: Archive, tone: "bg-neutral-soft text-neutral", text: changes.active.after ? `${e.actor} brought the licence back into use` : `${e.actor} retired the licence from the register` };
      const parts = Object.entries(changes)
        .filter(([k]) => k !== "notes")
        .map(([k, v]) => `${FIELD_LABEL[k] ?? k} ${changeValue(k, v.before)} → ${changeValue(k, v.after)}`);
      if (changes.notes) parts.push("notes updated");
      return { icon: FilePenLine, tone: "bg-platinum-bright text-navy-500", text: `${e.actor} changed the details`, detail: `${parts.join(" · ")}${m.alertsReset ? " · alerts restart for the new expiry date" : ""}` };
    }
    case "RENEWAL_STAGE_CHANGED":
      return m.direction === "BACK"
        ? { icon: RotateCcw, tone: "bg-pending-soft text-pending", text: `${e.actor} moved the renewal back to ${stageLabel(m.to)}` }
        : { icon: ArrowRight, tone: "bg-active-soft text-active", text: `${e.actor} moved the renewal to ${stageLabel(m.to)}` };
    case "RENEWED":
      return { icon: BadgeCheck, tone: "bg-success-soft text-success", text: `${e.actor} recorded the renewal`, detail: `Valid until ${fmtDate(m.newExpiresAt)} (was ${fmtDate(m.previousExpiresAt)})${m.renewalFee !== undefined ? ` · fee ${fmtTaka(m.renewalFee)}` : ""}` };
    case "DOCUMENT_UPLOADED":
      return { icon: FileUp, tone: "bg-platinum-bright text-navy-500", text: `${e.actor} ${m.replaced ? "replaced" : "uploaded"} the scanned copy`, detail: [m.fileName, fmtSize(m.size)].filter(Boolean).join(" · ") };
    case "ESCALATED": {
      const t = Number(m.thresholdDays);
      const notified = (m.notified as string[] | undefined) ?? [];
      return {
        icon: BellRing,
        tone: t <= 7 ? "bg-danger-soft text-danger" : t <= 30 ? "bg-pending-soft text-pending" : "bg-active-soft text-active",
        text: t === 0 ? (Number(m.daysLeft) < 0 ? "Expiry alert: the licence has expired" : "Expiry alert: the licence expires today") : `Expiry alert: ${t} days before expiry`,
        detail: notified.length ? `Sent to ${notified.join(", ")}` : undefined,
      };
    }
    case "NOTE_ADDED":
      return { icon: MessageSquare, tone: "bg-active-soft text-active", text: `${e.actor} added a note` };
    default:
      return { icon: MessageSquare, tone: "bg-platinum-bright text-navy-500", text: e.actor };
  }
}

/** Documents prepared → Application submitted → Inspection scheduled → Fee paid → Renewed. */
function RenewalStepper({ licence }: { licence: Licence }) {
  const steps = RENEWAL_STAGES.slice(1);
  const reached = RENEWAL_STAGES.indexOf(licence.renewalStage as RenewalStage);
  return (
    <ol className="grid gap-3 sm:grid-cols-5 sm:gap-0" aria-label="Renewal progress">
      {steps.map((s, i) => {
        const done = i < reached;
        const current = i === reached;
        return (
          <li key={s} className="relative flex items-center gap-3 sm:flex-col sm:gap-0 sm:text-center" aria-current={current ? "step" : undefined}>
            {i > 0 && <span className={cx("absolute right-1/2 top-[15px] hidden h-[2px] w-full sm:block", done ? "bg-navy" : "bg-line")} aria-hidden />}
            <span
              className={cx(
                "relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 text-xs font-bold",
                done ? (s === RenewalStage.RENEWED ? "border-success bg-success text-white" : "border-navy bg-navy text-white") : current ? "border-navy bg-white text-navy" : "border-line-strong bg-white text-ink-subtle",
              )}
            >
              {done ? <Check className="h-4 w-4" aria-hidden /> : i + 1}
            </span>
            <span className={cx("text-xs font-semibold sm:mt-2", done || current ? "text-navy" : "text-ink-subtle")}>
              {RENEWAL_STAGE_LABEL[s]}
              {current && <span className="ml-1 font-medium text-active sm:ml-0 sm:block">Next</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/** The alert ladder for the current expiry date: what has gone out, and what comes next. */
function AlertLadder({ licence }: { licence: Licence }) {
  const thresholds = licenceAlertThresholds(licence.renewalLeadDays);
  const reachedNow = licenceAlertThreshold(licence.daysLeft, licence.renewalLeadDays);
  return (
    <ol className="space-y-2.5">
      {thresholds.map((t) => {
        const sent = licence.history.find((e) => e.type === "ESCALATED" && Number(e.metadata.thresholdDays) === t && e.metadata.expiresAt === licence.expiresAt);
        const on = addCalendarDays(licence.expiresAt, -t);
        const level = licenceAlertLevel(t);
        let status: { label: string; tone: "success" | "active" | "pending" | "neutral" };
        if (sent) status = { label: `Sent ${when(sent.createdAt)}`, tone: "success" };
        else if (!licence.active) status = { label: "Off — retired", tone: "neutral" };
        else if (licence.alerts.due && t === reachedNow) status = { label: "Due — goes out on the next check", tone: "pending" };
        else if (t === licence.alerts.nextDays) status = { label: `Next · ${fmtDate(on)}`, tone: "active" };
        else if (t >= licence.daysLeft) status = { label: "Passed", tone: "neutral" };
        else status = { label: fmtDate(on), tone: "neutral" };
        return (
          <li key={t} className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink">{t === 0 ? "On the expiry date" : `${t} days before`}</p>
              <p className="text-xs text-ink-muted">{LEVEL_SHORT[level]}</p>
            </div>
            <Pill tone={status.tone}>
              {sent && <Check className="h-3 w-3" aria-hidden />}
              {status.label}
            </Pill>
          </li>
        );
      })}
    </ol>
  );
}

export function LicenceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [stageOpen, setStageOpen] = useState(false);
  const [renewOpen, setRenewOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [targetStage, setTargetStage] = useState<string>("");
  const [text, setText] = useState("");
  const [note, setNote] = useState("");
  const [renewal, setRenewal] = useState({ newExpiresAt: "", issuedAt: "", renewalFee: "", note: "" });
  const [renewFile, setRenewFile] = useState<File | null>(null);
  const [idemKey, setIdemKey] = useState(newKey);

  const query = useQuery({
    queryKey: ["licence", id],
    queryFn: () => api.get<Licence>(`/licences/${id}`),
    // Document links are signed for ten minutes; refresh well before that.
    refetchInterval: 5 * 60_000,
  });

  const updated = (next: Licence, message: string) => {
    qc.setQueryData(["licence", id], next);
    void qc.invalidateQueries({ queryKey: ["licences"] });
    toast.success(message);
  };

  const moveStage = useMutation({
    mutationFn: () => api.post<Licence>(`/licences/${id}/renewal`, { stage: targetStage, note: text.trim() || undefined }, idemKey),
    onSuccess: (next) => {
      setStageOpen(false);
      setText("");
      setIdemKey(newKey());
      updated(next, `Renewal moved to “${RENEWAL_STAGE_LABEL[next.renewalStage as RenewalStage]}”.`);
    },
  });

  const renew = useMutation({
    mutationFn: () => {
      const fields: Record<string, string> = { newExpiresAt: renewal.newExpiresAt };
      if (renewal.issuedAt) fields.issuedAt = renewal.issuedAt;
      if (renewal.renewalFee.trim()) fields.renewalFee = renewal.renewalFee.trim();
      if (renewal.note.trim()) fields.note = renewal.note.trim();
      if (renewFile) return upload<Licence>(`/licences/${id}/renew`, renewFile, fields);
      return api.post<Licence>(`/licences/${id}/renew`, { ...fields, renewalFee: fields.renewalFee ? Number(fields.renewalFee.replace(/[,\s]/g, "")) : undefined }, idemKey);
    },
    onSuccess: (next) => {
      setRenewOpen(false);
      setRenewFile(null);
      setIdemKey(newKey());
      updated(next, `Renewed — valid until ${fmtDate(next.expiresAt)}. Everyone who was alerted has been told.`);
    },
  });

  const uploadDoc = useMutation({
    mutationFn: (file: File) => upload<Licence>(`/licences/${id}/document`, file, {}),
    onSuccess: (next) => updated(next, "Scanned copy saved."),
    onError: toast.error,
  });

  const addNote = useMutation({
    mutationFn: () => api.post<Licence>(`/licences/${id}/notes`, { note: note.trim() }, idemKey),
    onSuccess: (next) => {
      setNote("");
      setIdemKey(newKey());
      updated(next, "Note added to the history.");
    },
    onError: toast.error,
  });

  const pickFile = (file: File | undefined, then: (f: File) => void) => {
    if (!file) return;
    if (file.size > LICENCE_LIMITS.documentMaxBytes) return toast.error(new Error("The scanned copy must be 15 MB or smaller."));
    then(file);
  };

  if (query.isLoading) return <Spinner label="Loading licence" />;
  if (query.error || !query.data) return <ErrorNote error={query.error ?? new Error("Licence not found.")} />;
  const l = query.data;
  const actions = new Set(l.viewer.actions);
  const currentIndex = RENEWAL_STAGES.indexOf(l.renewalStage as RenewalStage);
  const today = dhakaToday();
  const minNewExpiry = addCalendarDays(l.expiresAt > today ? l.expiresAt : today, 1);
  const back = targetStage ? isRenewalMoveBack(l.renewalStage, targetStage) : false;
  const doc = l.document;

  const openStage = () => {
    // Suggest the next step; from "Fee paid" the only way forward is Mark renewed.
    setTargetStage(currentIndex + 1 < RENEWAL_STAGES.length - 1 ? RENEWAL_STAGES[currentIndex + 1] : "");
    setText("");
    moveStage.reset();
    setStageOpen(true);
  };
  const openRenew = () => {
    setRenewal({ newExpiresAt: addCalendarDays(l.expiresAt > today ? l.expiresAt : today, 365), issuedAt: today, renewalFee: l.renewalFee === null ? "" : String(l.renewalFee), note: "" });
    setRenewFile(null);
    renew.reset();
    setRenewOpen(true);
  };
  const openPreview = () => {
    // Fetch a fresh signed link so the preview never opens on a lapsed one.
    void query.refetch();
    setPreviewOpen(true);
  };

  const uploadButton = (label: string, className = "btn-secondary h-9") =>
    actions.has("UPLOAD_DOCUMENT") && (
      <button className={className} onClick={() => fileRef.current?.click()} disabled={uploadDoc.isPending}>
        {uploadDoc.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />} {label}
      </button>
    );

  return (
    <div className="space-y-6">
      <Link to="/licences" className="no-print inline-flex items-center gap-1.5 text-sm font-semibold text-ink-muted hover:text-navy">
        <ArrowLeft className="h-4 w-4" /> Licence register
      </Link>

      <input
        ref={fileRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          pickFile(f, (file) => uploadDoc.mutate(file));
        }}
      />

      <section className="card overflow-hidden">
        <div className="bg-hero px-5 py-6 text-white sm:px-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="overline text-platinum-deep">{l.categoryLabel}</p>
              <h1 className="mt-1 font-display text-[26px] font-extrabold leading-tight tracking-tight">{l.name}</h1>
              <p className="mono mt-1 break-all text-sm text-platinum">{l.licenceNumber}</p>
              <p className="mt-2 text-sm text-platinum-deep">
                {l.branch.name} · {l.issuingAuthority}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <StateBadge state={l.state} active={l.active} />
                <CountdownBadge daysLeft={l.daysLeft} state={l.state} active={l.active} solid />
                <span className="tabular text-xs text-platinum-deep">
                  {l.daysLeft < 0 ? "Expired on" : "Expires on"} {fmtDate(l.expiresAt)}
                </span>
              </div>
            </div>
            <CountdownRing licence={l} />
          </div>
          <div className="mt-5 max-w-md">
            <RenewalBar stage={l.renewalStage} progress={l.renewalProgress} onDark />
          </div>
        </div>
        {(l.viewer.canManage || !l.active) && (
          <div className="no-print flex flex-wrap items-center justify-between gap-3 border-t border-line bg-white px-5 py-3 sm:px-6">
            {!l.active ? (
              <p className="flex items-center gap-2 text-sm text-ink-muted">
                <Archive className="h-4 w-4" aria-hidden /> Retired from the register — no alerts are sent. Edit it to bring it back into use.
              </p>
            ) : (
              <p className="text-sm text-ink-muted">{l.alerts.nextDays !== null ? `Next alert ${l.alerts.nextDays === 0 ? "on the expiry date" : `${l.alerts.nextDays} days before expiry`} (${fmtDate(l.alerts.nextOn)}).` : "All expiry alerts for this date have gone out."}</p>
            )}
            {l.viewer.canManage && (
              <div className="flex flex-wrap gap-2">
                {actions.has("EDIT") && (
                  <button className="btn-secondary h-9" onClick={() => setEditOpen(true)}>
                    <FilePenLine className="h-4 w-4" /> Edit
                  </button>
                )}
                {actions.has("ADVANCE_RENEWAL") && (
                  <button className="btn-secondary h-9" onClick={openStage}>
                    <ArrowRight className="h-4 w-4" /> Advance stage
                  </button>
                )}
                {actions.has("MARK_RENEWED") && (
                  <button className="btn-primary h-9" onClick={openRenew}>
                    <BadgeCheck className="h-4 w-4" /> Mark renewed
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </section>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-6">
          <Card title="Renewal" action={l.renewalStartedAt ? <span className="text-xs text-ink-subtle">Started {stamp(l.renewalStartedAt)}</span> : undefined}>
            <RenewalStepper licence={l} />
            <p className="mt-5 text-sm text-ink-muted">
              {currentIndex > 0
                ? `Now at “${RENEWAL_STAGE_LABEL[l.renewalStage as RenewalStage]}”. When the new certificate arrives, use Mark renewed with its expiry date.`
                : l.renewalWindowOpensOn <= today
                  ? `Not started. The renewal window opened on ${fmtDate(l.renewalWindowOpensOn)} (${l.renewalLeadDays} days before expiry).`
                  : `Not started. The renewal window opens on ${fmtDate(l.renewalWindowOpensOn)} (${l.renewalLeadDays} days before expiry).`}
            </p>
          </Card>

          <Card title="Scanned copy" action={doc ? uploadButton("Replace") : undefined}>
            {doc ? (
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <button
                  className="group relative grid h-40 w-full shrink-0 place-items-center overflow-hidden rounded-xl bg-platinum-bright ring-1 ring-line focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy sm:w-56"
                  onClick={openPreview}
                  aria-label="Preview the scanned copy"
                >
                  {doc.isPdf ? (
                    <span className="flex flex-col items-center gap-2 text-navy-500">
                      <FileText className="h-10 w-10" aria-hidden />
                      <span className="rounded-md bg-navy px-2 py-0.5 text-[11px] font-bold tracking-wide text-white">PDF</span>
                    </span>
                  ) : (
                    <img src={doc.url} alt="" className="h-full w-full object-cover transition group-hover:scale-[1.03]" />
                  )}
                  <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1.5 bg-midnight/70 py-1.5 text-xs font-semibold text-white opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
                    <Eye className="h-3.5 w-3.5" aria-hidden /> Preview
                  </span>
                </button>
                <div className="min-w-0 space-y-1">
                  <p className="truncate font-semibold text-ink">{doc.name}</p>
                  <p className="text-sm text-ink-muted">
                    {doc.isPdf ? "PDF document" : "Image"} · {fmtSize(doc.size)}
                  </p>
                  <p className="text-xs text-ink-subtle">
                    {doc.uploadedBy ? `Uploaded by ${doc.uploadedBy} · ` : ""}
                    {stamp(doc.uploadedAt)}
                  </p>
                  <button className="btn-secondary mt-2 h-9" onClick={openPreview}>
                    <Eye className="h-4 w-4" /> Preview
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-line-strong px-4 py-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="flex items-center gap-2 text-sm text-ink-muted">
                  <FileText className="h-4 w-4" aria-hidden /> No scanned copy yet. Keep the current certificate here so anyone can check it.
                </p>
                {uploadButton("Upload scan")}
              </div>
            )}
          </Card>

          <Card title="History" action={<span className="text-xs text-ink-subtle">Append-only · Asia/Dhaka</span>}>
            <ol>
              {[...l.history].reverse().map((e, idx, all) => {
                const d = describe(e);
                return (
                  <li key={e.id} className="relative flex gap-3 pb-5 last:pb-0">
                    {idx < all.length - 1 && <span className="absolute left-[15px] top-8 h-[calc(100%-24px)] w-px bg-line" aria-hidden />}
                    <span className={cx("relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full", d.tone)}>
                      <d.icon className="h-4 w-4" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1 pt-1">
                      <p className="text-sm font-medium text-ink">{d.text}</p>
                      <p className="text-xs text-ink-subtle">{stamp(e.createdAt)}</p>
                      {d.detail && <p className="mt-1 break-words text-xs text-ink-muted">{d.detail}</p>}
                      {e.note && <p className="mt-1.5 whitespace-pre-line rounded-lg bg-surface px-3 py-2 text-sm text-ink">{e.note}</p>}
                    </div>
                  </li>
                );
              })}
            </ol>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Details">
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-1">
              <KeyValue label="Licence number">
                <span className="mono break-all">{l.licenceNumber}</span>
              </KeyValue>
              <KeyValue label="Issuing authority">
                <span className="inline-flex items-start gap-1.5">
                  <Landmark className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-subtle" aria-hidden /> {l.issuingAuthority}
                </span>
              </KeyValue>
              <KeyValue label="Office">
                <span className="inline-flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-ink-subtle" aria-hidden /> {l.branch.name} <span className="mono text-xs text-ink-muted">{l.branch.code}</span>
                </span>
              </KeyValue>
              <KeyValue label="Owner">
                {l.owner ? (
                  <span className="inline-flex items-start gap-1.5">
                    <UserRound className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-subtle" aria-hidden />
                    <span>
                      {l.owner.name}
                      {l.owner.designation && <span className="block text-xs font-normal text-ink-muted">{l.owner.designation}</span>}
                      {l.owner.phone && (
                        <a href={`tel:${l.owner.phone}`} className="block text-xs font-semibold text-active hover:underline">
                          {l.owner.phone}
                        </a>
                      )}
                    </span>
                  </span>
                ) : (
                  <span className="text-ink-subtle">Not set — alerts go to the compliance team</span>
                )}
              </KeyValue>
              <KeyValue label="Issued on">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5 text-ink-subtle" aria-hidden /> {fmtDate(l.issuedAt)}
                </span>
              </KeyValue>
              <KeyValue label="Expires on">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5 text-ink-subtle" aria-hidden /> {fmtDate(l.expiresAt)}
                </span>
              </KeyValue>
              <KeyValue label="Renewal window">
                {l.renewalLeadDays} days before expiry · opens {fmtDate(l.renewalWindowOpensOn)}
              </KeyValue>
              <KeyValue label="Renewal fee">{fmtTaka(l.renewalFee)}</KeyValue>
            </dl>
            {l.notes && <p className="mt-4 whitespace-pre-line rounded-xl bg-surface px-3 py-2.5 text-sm text-ink">{l.notes}</p>}
          </Card>

          <Card title="Expiry alerts" action={<BellRing className="h-4 w-4 text-ink-subtle" aria-hidden />}>
            <AlertLadder licence={l} />
            <p className="mt-4 text-xs text-ink-subtle">Each alert goes out once for this expiry date. Recording a renewal starts the ladder again for the new date.</p>
          </Card>

          {actions.has("ADD_NOTE") && (
            <Card title="Add a note">
              <Field label="Note for the history" hint="Visible to everyone who can see this licence.">
                {(fid) => (
                  <textarea id={fid} className="input min-h-[88px] py-2.5" maxLength={LICENCE_LIMITS.noteMax} placeholder="e.g. Inspector visit confirmed for Tuesday; hydrant test report attached to the file." value={note} onChange={(e) => setNote(e.target.value)} />
                )}
              </Field>
              <div className="mt-3 flex justify-end">
                <button className="btn-primary h-9" disabled={note.trim().length < 2 || addNote.isPending} onClick={() => addNote.mutate()}>
                  {addNote.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Add note
                </button>
              </div>
            </Card>
          )}
        </div>
      </div>

      <Modal
        open={stageOpen}
        onClose={() => setStageOpen(false)}
        title="Advance the renewal"
        subtitle="Pick where the renewal has got to. Stages can be skipped; moving back needs a reason."
        footer={
          <>
            <button className="btn-ghost" onClick={() => setStageOpen(false)}>
              Cancel
            </button>
            <button className={back ? "btn-secondary" : "btn-primary"} disabled={!targetStage || moveStage.isPending || (back && text.trim().length < 3)} onClick={() => moveStage.mutate()}>
              {moveStage.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : back ? <RotateCcw className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />} {back ? "Move back" : "Save stage"}
            </button>
          </>
        }
      >
        <fieldset className="space-y-2">
          <legend className="label">Renewal stage</legend>
          {RENEWAL_STAGES.slice(0, -1).map((s, i) => {
            const isCurrent = s === l.renewalStage;
            return (
              <label
                key={s}
                className={cx(
                  "flex min-h-[44px] cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 text-sm transition",
                  isCurrent ? "cursor-default border-line bg-surface text-ink-subtle" : targetStage === s ? "border-navy bg-active-soft/40 text-ink ring-1 ring-navy" : "border-line hover:border-line-strong",
                )}
              >
                <input type="radio" name="stage" value={s} checked={targetStage === s} disabled={isCurrent} onChange={() => setTargetStage(s)} className="h-4 w-4 accent-[#0C1727]" />
                <span className="flex-1 font-medium">{RENEWAL_STAGE_LABEL[s]}</span>
                {isCurrent ? <span className="text-xs">Current</span> : i < currentIndex ? <span className="text-xs text-pending">Back</span> : null}
              </label>
            );
          })}
          <p className="pt-1 text-xs text-ink-subtle">“Renewed” is recorded with Mark renewed, together with the new expiry date.</p>
        </fieldset>
        <Field label={back ? "Why is it moving back?" : "Note (optional)"}>
          {(fid) => (
            <textarea id={fid} className="input min-h-[80px] py-2.5" maxLength={LICENCE_LIMITS.noteMax} placeholder={back ? "e.g. The authority returned the file: holding tax receipt missing." : "e.g. Submitted on the DIFE portal, application no. …"} value={text} onChange={(e) => setText(e.target.value)} />
          )}
        </Field>
        <ErrorNote error={moveStage.error} />
      </Modal>

      <Modal
        open={renewOpen}
        onClose={() => setRenewOpen(false)}
        title="Mark renewed"
        subtitle={`Record the renewed licence. The current expiry date is ${fmtDate(l.expiresAt)}.`}
        footer={
          <>
            <button className="btn-ghost" onClick={() => setRenewOpen(false)}>
              Cancel
            </button>
            <button className="btn-primary" disabled={!renewal.newExpiresAt || renew.isPending} onClick={() => renew.mutate()}>
              {renew.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <BadgeCheck className="h-4 w-4" />} Mark renewed
            </button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="New expiry date">{(fid) => <input id={fid} type="date" className="input" min={minNewExpiry} value={renewal.newExpiresAt} onChange={(e) => setRenewal((r) => ({ ...r, newExpiresAt: e.target.value }))} />}</Field>
          <Field label="Issued on">{(fid) => <input id={fid} type="date" className="input" max={today} value={renewal.issuedAt} onChange={(e) => setRenewal((r) => ({ ...r, issuedAt: e.target.value }))} />}</Field>
          <Field label="Fee paid, Tk (optional)">
            {(fid) => <input id={fid} type="number" inputMode="numeric" min={0} className="input tabular" value={renewal.renewalFee} onChange={(e) => setRenewal((r) => ({ ...r, renewalFee: e.target.value }))} />}
          </Field>
          <Field label="Scan of the new certificate (optional)" hint="PDF, JPEG, PNG or WebP, up to 15 MB.">
            {(fid) => (
              <input
                id={fid}
                type="file"
                accept={ACCEPT}
                className="block w-full text-sm text-ink-muted file:mr-3 file:h-10 file:rounded-xl file:border-0 file:bg-platinum-bright file:px-3 file:text-sm file:font-semibold file:text-navy hover:file:bg-silver"
                onChange={(e) => pickFile(e.target.files?.[0], (f) => setRenewFile(f))}
              />
            )}
          </Field>
        </div>
        <Field label="Note (optional)">
          {(fid) => <textarea id={fid} className="input min-h-[72px] py-2.5" maxLength={LICENCE_LIMITS.noteMax} placeholder="e.g. Renewed for FY 2027-28; original filed in the compliance cabinet." value={renewal.note} onChange={(e) => setRenewal((r) => ({ ...r, note: e.target.value }))} />}
        </Field>
        <p className="rounded-xl bg-surface px-3 py-2.5 text-xs text-ink-muted">
          The renewal tracker goes back to “Not started” and the alert ladder starts again for the new date.{" "}
          {l.alerts.lastDays !== null && l.alerts.lastDays <= 30 && "Everyone who was alerted about this expiry is told it has been renewed."}
        </p>
        <ErrorNote error={renew.error} />
      </Modal>

      <LicenceFormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        licence={l}
        onSaved={(saved) => {
          setEditOpen(false);
          if ("movedOutOfScope" in saved) {
            toast.success("Saved. The licence now belongs to an office outside your view.");
            void qc.invalidateQueries({ queryKey: ["licences"] });
            navigate("/licences");
            return;
          }
          updated(saved, saved.active === l.active ? "Licence details saved." : saved.active ? "Licence is back in use; alerts will resume." : "Licence retired from the register.");
        }}
      />

      <DocumentPreviewModal licence={l} open={previewOpen} onClose={() => setPreviewOpen(false)} actions={uploadButton("Replace", "btn-ghost h-9")} />
    </div>
  );
}
