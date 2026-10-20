import { useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Ban,
  Camera,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  EyeOff,
  FilePenLine,
  Hammer,
  ImageIcon,
  Loader2,
  MapPin,
  MessageSquare,
  RotateCcw,
  ShieldAlert,
  UserRound,
  X,
  type LucideIcon,
} from "lucide-react";
import { createPortal } from "react-dom";
import {
  INCIDENT_CATEGORY_HINT,
  INCIDENT_CATEGORY_LABEL,
  INCIDENT_LIMITS,
  INCIDENT_SEVERITY_LABEL,
  INCIDENT_STATUS_LABEL,
  INCIDENT_STATUS_TONE,
  IncidentCategory,
  IncidentStatus,
  type IncidentSeverity,
} from "@abg-dispatch/shared";
import { api, newKey, upload } from "../lib/api";
import { stamp, when } from "../lib/format";
import type { Incident, IncidentPhoto, IncidentUpdate } from "../lib/types";
import { Card, ErrorNote, Field, IncidentStatusBadge, KeyValue, Modal, Pill, SeverityBadge, Spinner, cx } from "../components/ui";
import { toast } from "../components/toast";

type StatusAction = "START_PROCESSING" | "MARK_DONE" | "DECLINE" | "REOPEN";

const STATUS_ACTION: Record<StatusAction, { to: IncidentStatus; label: string; icon: LucideIcon; title: string; prompt: string; placeholder: string; required?: boolean }> = {
  START_PROCESSING: {
    to: IncidentStatus.PROCESSING,
    label: "Start processing",
    icon: Hammer,
    title: "Start processing this report",
    prompt: "Tell the reporter what is being done. They see this message in the app.",
    placeholder: "e.g. Cleaning team is on the way.",
  },
  MARK_DONE: {
    to: IncidentStatus.DONE,
    label: "Mark done",
    icon: CheckCircle2,
    title: "Mark this report as done",
    prompt: "Say how it was fixed. Adding a photo of the fix afterwards helps the reporter trust it.",
    placeholder: "e.g. Floor cleaned and an anti-slip mat placed at the door.",
  },
  DECLINE: {
    to: IncidentStatus.DECLINED,
    label: "Decline",
    icon: Ban,
    title: "Decline this report",
    prompt: "A reason is required — the reporter is told why.",
    placeholder: "e.g. This is handled by the building owner; we have forwarded it.",
    required: true,
  },
  REOPEN: {
    to: IncidentStatus.PROCESSING,
    label: "Reopen",
    icon: RotateCcw,
    title: "Reopen this report",
    prompt: "It goes back to Processing and the reporter is told.",
    placeholder: "e.g. The leak is back after last night's rain.",
  },
};

const TONE_BAR: Record<string, string> = { pending: "bg-pending", active: "bg-active", success: "bg-success", neutral: "bg-neutral", danger: "bg-danger" };

function Progress({ incident }: { incident: Incident }) {
  const declined = incident.status === IncidentStatus.DECLINED;
  const steps = [
    { label: "Submitted", at: incident.createdAt, reached: true },
    { label: "Processing", at: incident.processingAt, reached: !!incident.processingAt || incident.status !== IncidentStatus.PENDING },
    declined ? { label: "Declined", at: incident.declinedAt, reached: true } : { label: "Done", at: incident.doneAt, reached: incident.status === IncidentStatus.DONE },
  ];
  const current = incident.status === IncidentStatus.PENDING ? 0 : incident.status === IncidentStatus.PROCESSING ? 1 : 2;
  return (
    <ol className="grid grid-cols-3" aria-label="Report progress">
      {steps.map((s, i) => {
        const skipped = i === 1 && !incident.processingAt && current === 2;
        return (
          <li key={s.label} className="relative flex flex-col items-center text-center">
            {i > 0 && <span className={cx("absolute right-1/2 top-[13px] h-[2px] w-full", s.reached ? (declined && i === 2 ? "bg-neutral" : "bg-navy") : "bg-line")} aria-hidden />}
            <span
              className={cx(
                "relative z-10 grid h-7 w-7 place-items-center rounded-full border-2 text-[11px] font-bold",
                s.reached && !skipped ? (declined && i === 2 ? "border-neutral bg-neutral text-white" : "border-navy bg-navy text-white") : i === current ? "border-navy bg-white text-navy" : "border-line-strong bg-white text-ink-subtle",
              )}
            >
              {declined && i === 2 ? <Ban className="h-4 w-4" /> : s.reached && !skipped ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
            </span>
            <span className={cx("mt-2 text-xs font-semibold", s.reached || i === current ? "text-navy" : "text-ink-subtle")}>{s.label}</span>
            <span className="text-[11px] text-ink-subtle">{s.at ? when(s.at) : skipped ? "Skipped" : i === current ? "Now" : ""}</span>
          </li>
        );
      })}
    </ol>
  );
}

function describe(u: IncidentUpdate): { icon: LucideIcon; tone: string; text: string } {
  switch (u.type) {
    case "SUBMITTED":
      return { icon: ShieldAlert, tone: "bg-pending-soft text-pending", text: `${u.actor} reported this` };
    case "STATUS_CHANGED": {
      const to = u.toStatus as IncidentStatus;
      const reopened = to === IncidentStatus.PROCESSING && (u.fromStatus === IncidentStatus.DONE || u.fromStatus === IncidentStatus.DECLINED);
      const tone = to === IncidentStatus.DONE ? "bg-success-soft text-success" : to === IncidentStatus.DECLINED ? "bg-neutral-soft text-neutral" : "bg-active-soft text-active";
      const icon = to === IncidentStatus.DONE ? CheckCircle2 : to === IncidentStatus.DECLINED ? Ban : reopened ? RotateCcw : Hammer;
      return { icon, tone, text: reopened ? `${u.actor} reopened it` : `${u.actor} moved it to ${INCIDENT_STATUS_LABEL[to] ?? to}` };
    }
    case "NOTE_ADDED":
      return { icon: MessageSquare, tone: "bg-active-soft text-active", text: `${u.actor} sent the reporter an update` };
    case "PHOTO_ADDED":
      return { icon: Camera, tone: "bg-platinum-bright text-navy-500", text: u.metadata.kind === "RESOLUTION" ? `${u.actor} added a photo of the fix` : `${u.actor} added a photo` };
    case "DETAILS_CHANGED": {
      const changes = u.metadata as Record<string, { before: string; after: string }>;
      const parts = Object.entries(changes).map(([k, v]) =>
        k === "severity"
          ? `urgency ${INCIDENT_SEVERITY_LABEL[v.before as IncidentSeverity] ?? v.before} → ${INCIDENT_SEVERITY_LABEL[v.after as IncidentSeverity] ?? v.after}`
          : `kind ${INCIDENT_CATEGORY_LABEL[v.before as IncidentCategory] ?? v.before} → ${INCIDENT_CATEGORY_LABEL[v.after as IncidentCategory] ?? v.after}`,
      );
      return { icon: FilePenLine, tone: "bg-platinum-bright text-navy-500", text: `${u.actor} changed ${parts.join(", ") || "details"}` };
    }
    default:
      return { icon: MessageSquare, tone: "bg-platinum-bright text-navy-500", text: u.actor };
  }
}

function Lightbox({ photos, index, onClose, onMove }: { photos: IncidentPhoto[]; index: number; onClose: () => void; onMove: (i: number) => void }) {
  const p = photos[index];
  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-midnight/90 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Photo"
      tabIndex={-1}
      ref={(el) => el?.focus()}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
        if (e.key === "ArrowRight" && index < photos.length - 1) onMove(index + 1);
        if (e.key === "ArrowLeft" && index > 0) onMove(index - 1);
      }}
    >
      <img src={p.url} alt={p.kind === "RESOLUTION" ? "Photo of the fix" : "Photo of the problem"} className="max-h-[86vh] max-w-full rounded-xl object-contain shadow-raised" />
      <button className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20" onClick={onClose} aria-label="Close photo">
        <X className="h-5 w-5" />
      </button>
      {index > 0 && (
        <button className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20" onClick={() => onMove(index - 1)} aria-label="Previous photo">
          <ChevronLeft className="h-6 w-6" />
        </button>
      )}
      {index < photos.length - 1 && (
        <button className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20" onClick={() => onMove(index + 1)} aria-label="Next photo">
          <ChevronRight className="h-6 w-6" />
        </button>
      )}
      <p className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-xs text-white">
        {p.kind === "RESOLUTION" ? "Fix" : "Problem"} · {stamp(p.createdAt)} · {index + 1} of {photos.length}
      </p>
    </div>,
    document.body,
  );
}

function PhotoGrid({ photos, all, onOpen }: { photos: IncidentPhoto[]; all: IncidentPhoto[]; onOpen: (i: number) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {photos.map((p) => (
        <button key={p.id} className="group relative aspect-[4/3] overflow-hidden rounded-xl bg-platinum-bright ring-1 ring-line focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy" onClick={() => onOpen(all.indexOf(p))} aria-label="Open photo">
          <img src={p.url} alt="" className="h-full w-full object-cover transition group-hover:scale-[1.03]" />
          <span className="absolute bottom-1.5 left-1.5 rounded-md bg-midnight/70 px-1.5 py-0.5 text-[10px] font-medium text-white">{when(p.createdAt)}</span>
        </button>
      ))}
    </div>
  );
}

export function IncidentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [statusAction, setStatusAction] = useState<StatusAction | null>(null);
  const [noteOpen, setNoteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [text, setText] = useState("");
  const [severity, setSeverity] = useState("");
  const [category, setCategory] = useState("");
  const [viewing, setViewing] = useState<number | null>(null);
  const [idemKey, setIdemKey] = useState(newKey);

  const incident = useQuery({
    queryKey: ["incident", id],
    queryFn: () => api.get<Incident>(`/incidents/${id}`),
    // Photo links are signed for ten minutes; refresh well before that.
    refetchInterval: 5 * 60_000,
  });

  const refreshAll = (next?: Incident) => {
    if (next) qc.setQueryData(["incident", id], next);
    void qc.invalidateQueries({ queryKey: ["admin", "incidents"] });
  };
  // A function declaration so the mutations below can call it on success.
  function closeDialogs() {
    setStatusAction(null);
    setNoteOpen(false);
    setEditOpen(false);
    setText("");
    setIdemKey(newKey());
    changeStatus.reset();
    addNote.reset();
    editDetails.reset();
  }

  const changeStatus = useMutation({
    mutationFn: (a: StatusAction) => api.post<Incident>(`/incidents/${id}/status`, { status: STATUS_ACTION[a].to, note: text.trim() || undefined }, idemKey),
    onSuccess: (next, a) => {
      toast.success(a === "REOPEN" ? "Report reopened — the reporter has been told." : `Marked ${INCIDENT_STATUS_LABEL[next.status as IncidentStatus]} — the reporter has been told.`);
      closeDialogs();
      refreshAll(next);
    },
  });
  const addNote = useMutation({
    mutationFn: () => api.post<Incident>(`/incidents/${id}/notes`, { note: text.trim() }, idemKey),
    onSuccess: (next) => {
      toast.success("Update sent to the reporter.");
      closeDialogs();
      refreshAll(next);
    },
  });
  const editDetails = useMutation({
    mutationFn: () => api.patch<Incident | { id: string; movedToHeadOffice: true }>(`/incidents/${id}`, { severity, category }),
    onSuccess: (next) => {
      closeDialogs();
      if ("movedToHeadOffice" in next) {
        toast.success("Marked as misconduct and handed to head office. It is no longer visible to your office.");
        void qc.invalidateQueries({ queryKey: ["admin", "incidents"] });
        navigate("/incidents");
        return;
      }
      toast.success("Details updated.");
      refreshAll(next);
    },
  });
  const addPhoto = useMutation({
    mutationFn: (file: File) => upload<Incident>(`/incidents/${id}/photos`, file, {}, "photo"),
    onSuccess: (next) => {
      toast.success("Photo of the fix added — the reporter can see it.");
      refreshAll(next);
    },
    onError: toast.error,
  });

  if (incident.isLoading) return <Spinner label="Loading report" />;
  if (incident.error || !incident.data) return <ErrorNote error={incident.error ?? new Error("Report not found.")} />;
  const i = incident.data;
  const actions = new Set(i.viewer.actions);
  const reportPhotos = i.photos.filter((p) => p.kind === "REPORT");
  const fixPhotos = i.photos.filter((p) => p.kind === "RESOLUTION");
  const tone = INCIDENT_STATUS_TONE[i.status as IncidentStatus] ?? "neutral";
  const primary = (["START_PROCESSING", "MARK_DONE", "REOPEN"] as StatusAction[]).filter((a) => actions.has(a));
  const misconduct = i.category === IncidentCategory.MISCONDUCT;
  const sa = statusAction ? STATUS_ACTION[statusAction] : null;

  return (
    <div className="space-y-6">
      <Link to="/incidents" className="no-print inline-flex items-center gap-1.5 text-sm font-semibold text-ink-muted hover:text-navy">
        <ArrowLeft className="h-4 w-4" /> Incident reports
      </Link>

      <section className="card overflow-hidden">
        <div className={cx("h-1", TONE_BAR[tone])} />
        <div className="flex flex-wrap items-start justify-between gap-4 px-6 pb-5 pt-5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="mono text-sm text-navy-500">{i.referenceNumber}</span>
              <IncidentStatusBadge status={i.status} />
              <SeverityBadge severity={i.severity} />
              {i.anonymous && (
                <Pill tone="neutral">
                  <EyeOff className="h-3 w-3" /> Anonymous
                </Pill>
              )}
              {misconduct && (
                <span className="inline-flex items-center gap-1 rounded-md bg-navy px-1.5 py-0.5 text-[11px] font-semibold text-platinum-bright">
                  <ShieldAlert className="h-3 w-3" /> Confidential · head office only
                </span>
              )}
            </div>
            <h1 className="mt-2 font-display text-[26px] font-extrabold leading-tight tracking-tight text-navy">{i.title}</h1>
            <p className="mt-1 text-sm text-ink-muted">
              {INCIDENT_CATEGORY_LABEL[i.category as IncidentCategory] ?? i.category} · {i.branch.name} · reported {stamp(i.createdAt)}
            </p>
          </div>
          {i.viewer.canManage && (
            <div className="no-print flex flex-wrap gap-2">
              {actions.has("ADD_NOTE") && (
                <button className="btn-secondary" onClick={() => setNoteOpen(true)}>
                  <MessageSquare className="h-4 w-4" /> Send update
                </button>
              )}
              {actions.has("DECLINE") && (
                <button className="btn-secondary" onClick={() => setStatusAction("DECLINE")}>
                  <Ban className="h-4 w-4" /> Decline
                </button>
              )}
              {primary.map((a) => {
                const m = STATUS_ACTION[a];
                return (
                  <button key={a} className={a === "MARK_DONE" ? "btn-primary" : primary.length > 1 ? "btn-secondary" : "btn-primary"} onClick={() => setStatusAction(a)}>
                    <m.icon className="h-4 w-4" /> {m.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <div className="border-t border-line bg-surface/50 px-6 py-5">
          <Progress incident={i} />
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-6">
          <Card title="What was reported">
            {i.description ? <p className="whitespace-pre-line text-[15px] leading-relaxed text-ink">{i.description}</p> : <p className="text-sm text-ink-muted">No description — see the photos.</p>}
            <div className="mt-5">
              {reportPhotos.length ? (
                <PhotoGrid photos={reportPhotos} all={i.photos} onOpen={setViewing} />
              ) : (
                <div className="flex items-center gap-2 rounded-xl border border-dashed border-line-strong px-4 py-3 text-sm text-ink-muted">
                  <ImageIcon className="h-4 w-4" /> No photo was attached.
                </div>
              )}
            </div>
          </Card>

          <Card
            title="Photos of the fix"
            action={
              actions.has("ADD_RESOLUTION_PHOTO") && (
                <>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      e.target.value = "";
                      if (f) addPhoto.mutate(f);
                    }}
                  />
                  <button className="btn-secondary h-9" onClick={() => fileRef.current?.click()} disabled={addPhoto.isPending}>
                    {addPhoto.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />} Add photo
                  </button>
                </>
              )
            }
          >
            {fixPhotos.length ? (
              <PhotoGrid photos={fixPhotos} all={i.photos} onOpen={setViewing} />
            ) : (
              <p className="text-sm text-ink-muted">
                {i.viewer.canManage ? `When it is fixed, add up to ${INCIDENT_LIMITS.maxResolutionPhotos} photos — the reporter sees them next to their report.` : "No photos of the fix yet."}
              </p>
            )}
          </Card>

          <Card title="History" action={<span className="text-xs text-ink-subtle">Append-only · Asia/Dhaka</span>}>
            <ol className="space-y-0">
              {i.updates.map((u, idx) => {
                const d = describe(u);
                return (
                  <li key={u.id} className="relative flex gap-3 pb-5 last:pb-0">
                    {idx < i.updates.length - 1 && <span className="absolute left-[15px] top-8 h-[calc(100%-24px)] w-px bg-line" aria-hidden />}
                    <span className={cx("relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full", d.tone)}>
                      <d.icon className="h-4 w-4" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1 pt-1">
                      <p className="text-sm font-medium text-ink">{d.text}</p>
                      <p className="text-xs text-ink-subtle">{stamp(u.createdAt)}</p>
                      {u.note && <p className="mt-1.5 rounded-lg bg-surface px-3 py-2 text-sm text-ink">{u.note}</p>}
                    </div>
                  </li>
                );
              })}
            </ol>
          </Card>
        </div>

        <div className="space-y-6">
          {i.statusNote && (
            <Card title="Latest update to the reporter">
              <p className="text-sm italic leading-relaxed text-ink">“{i.statusNote}”</p>
              <p className="mt-2 text-xs text-ink-subtle">Shown on the reporter's phone · {when(i.statusChangedAt)}</p>
            </Card>
          )}

          <Card title="Reported by">
            {i.reporter ? (
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-platinum-bright text-navy-500">
                  <UserRound className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink">
                    {i.reporter.name} {i.reporter.employeeCode && <span className="mono text-xs font-medium text-ink-muted">{i.reporter.employeeCode}</span>}
                  </p>
                  <p className="text-xs text-ink-muted">{[i.reporter.designation, i.reporter.department].filter(Boolean).join(" · ") || "—"}</p>
                  {i.reporter.phone && (
                    <a href={`tel:${i.reporter.phone}`} className="mt-1 inline-block text-xs font-semibold text-active hover:underline">
                      {i.reporter.phone}
                    </a>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-neutral-soft text-neutral">
                  <EyeOff className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-ink">Anonymous employee</p>
                  <p className="text-xs text-ink-muted">The reporter chose not to share their name. They still see every update you send.</p>
                </div>
              </div>
            )}
          </Card>

          <Card
            title="Details"
            action={
              actions.has("EDIT_DETAILS") && (
                <button
                  className="btn-ghost h-8 px-2 text-xs"
                  onClick={() => {
                    setSeverity(i.severity);
                    setCategory(i.category);
                    setEditOpen(true);
                  }}
                >
                  <FilePenLine className="h-3.5 w-3.5" /> Edit
                </button>
              )
            }
          >
            <dl className="grid grid-cols-1 gap-4">
              <KeyValue label="Office">
                {i.branch.name} <span className="mono text-xs text-ink-muted">{i.branch.code}</span>
              </KeyValue>
              <KeyValue label="Area">{i.location?.path ?? "Not given"}</KeyValue>
              <KeyValue label="Exact spot">
                {i.locationDetail ? (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-ink-subtle" /> {i.locationDetail}
                  </span>
                ) : (
                  "Not given"
                )}
              </KeyValue>
              <KeyValue label="Kind of problem">{INCIDENT_CATEGORY_LABEL[i.category as IncidentCategory] ?? i.category}</KeyValue>
              <KeyValue label="Urgency">{INCIDENT_SEVERITY_LABEL[i.severity as IncidentSeverity] ?? i.severity}</KeyValue>
              <KeyValue label="Last change">{stamp(i.statusChangedAt)}</KeyValue>
            </dl>
          </Card>
        </div>
      </div>

      <Modal
        open={!!sa}
        onClose={closeDialogs}
        title={sa?.title ?? ""}
        subtitle={sa?.prompt}
        footer={
          sa && (
            <>
              <button className="btn-ghost" onClick={closeDialogs}>
                Cancel
              </button>
              <button className={statusAction === "DECLINE" ? "btn-danger" : "btn-primary"} disabled={changeStatus.isPending || (sa.required && text.trim().length < 3)} onClick={() => changeStatus.mutate(statusAction!)}>
                {changeStatus.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <sa.icon className="h-4 w-4" />} {sa.label}
              </button>
            </>
          )
        }
      >
        <Field label={sa?.required ? "Reason for the reporter" : "Message for the reporter (optional)"}>
          {(fid) => <textarea id={fid} className="input min-h-[96px] py-2.5" placeholder={sa?.placeholder} value={text} onChange={(e) => setText(e.target.value)} maxLength={INCIDENT_LIMITS.noteMax} />}
        </Field>
        <ErrorNote error={changeStatus.error} />
      </Modal>

      <Modal
        open={noteOpen}
        onClose={closeDialogs}
        title="Send the reporter an update"
        subtitle="The status stays the same; the reporter gets a notification with your message."
        footer={
          <>
            <button className="btn-ghost" onClick={closeDialogs}>
              Cancel
            </button>
            <button className="btn-primary" disabled={addNote.isPending || text.trim().length < 2} onClick={() => addNote.mutate()}>
              {addNote.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />} Send update
            </button>
          </>
        }
      >
        <Field label="Message">{(fid) => <textarea id={fid} className="input min-h-[96px] py-2.5" placeholder="e.g. Parts are ordered; the fix is planned for Thursday." value={text} onChange={(e) => setText(e.target.value)} maxLength={INCIDENT_LIMITS.noteMax} />}</Field>
        <ErrorNote error={addNote.error} />
      </Modal>

      <Modal
        open={editOpen}
        onClose={closeDialogs}
        title="Edit details"
        subtitle="Correct the urgency or the kind of problem. Every change is kept in the history."
        footer={
          <>
            <button className="btn-ghost" onClick={closeDialogs}>
              Cancel
            </button>
            <button className="btn-primary" disabled={editDetails.isPending || (severity === i.severity && category === i.category)} onClick={() => editDetails.mutate()}>
              {editDetails.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Save
            </button>
          </>
        }
      >
        <Field label="Urgency">
          {(fid) => (
            <select id={fid} className="input" value={severity} onChange={(e) => setSeverity(e.target.value)}>
              {Object.entries(INCIDENT_SEVERITY_LABEL).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field label="Kind of problem" hint={INCIDENT_CATEGORY_HINT[category as IncidentCategory]}>
          {(fid) => (
            <select id={fid} className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
              {Object.entries(INCIDENT_CATEGORY_LABEL).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          )}
        </Field>
        {category === IncidentCategory.MISCONDUCT && !misconduct && (
          <p className="flex items-start gap-2 rounded-xl bg-pending-soft px-3 py-2.5 text-sm text-pending">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" /> Misconduct reports are handled by head office only. If you are a branch admin, this report will leave your list once saved.
          </p>
        )}
        <ErrorNote error={editDetails.error} />
      </Modal>

      {viewing !== null && i.photos[viewing] && <Lightbox photos={i.photos} index={viewing} onClose={() => setViewing(null)} onMove={setViewing} />}
    </div>
  );
}
