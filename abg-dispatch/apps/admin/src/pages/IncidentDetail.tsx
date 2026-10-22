import { useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  EyeOff,
  FilePenLine,
  ImageIcon,
  Loader2,
  LockKeyhole,
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
  INCIDENT_CATEGORY_GROUP,
  INCIDENT_CATEGORY_HINT,
  INCIDENT_CATEGORY_LABEL,
  INCIDENT_CONFIDENTIAL_ROLES,
  INCIDENT_GROUPS,
  INCIDENT_GROUP_CATEGORIES,
  INCIDENT_GROUP_LABEL,
  INCIDENT_LIMITS,
  INCIDENT_RESOLUTIONS,
  INCIDENT_RESOLUTION_HINT,
  INCIDENT_RESOLUTION_LABEL,
  INCIDENT_SEVERITIES,
  INCIDENT_SEVERITY_HINT,
  INCIDENT_SEVERITY_LABEL,
  INCIDENT_STATUS_LABEL,
  INCIDENT_STATUS_TONE,
  IncidentGroup,
  IncidentResolution,
  IncidentSeverity,
  IncidentStatus,
  incidentForcesConfidential,
  incidentResolutionNeedsNote,
  isIncidentOpen,
  type IncidentCategory,
} from "@abg-dispatch/shared";
import { api, newKey, upload } from "../lib/api";
import { useAuth } from "../lib/auth";
import { stamp, when } from "../lib/format";
import type { Incident, IncidentPhoto, IncidentStage, IncidentUpdate } from "../lib/types";
import {
  Card,
  ConfidentialBadge,
  ErrorNote,
  Field,
  INCIDENT_GROUP_ICON,
  INCIDENT_STATUS_ICON,
  IncidentGroupIcon,
  IncidentStatusBadge,
  KeyValue,
  Modal,
  Pill,
  ResolutionBadge,
  SeverityBadge,
  Spinner,
  Toggle,
  cx,
} from "../components/ui";
import { toast } from "../components/toast";

/** Stage moves that take only an optional message; closing has its own dialog. */
type StageAction = "ACKNOWLEDGE" | "START_INVESTIGATION" | "REOPEN";

const STAGE_ACTION: Record<StageAction, { to: IncidentStatus; label: string; icon: LucideIcon; title: string; prompt: string; placeholder: string; done: string }> = {
  ACKNOWLEDGE: {
    to: IncidentStatus.ACKNOWLEDGED,
    label: "Acknowledge",
    icon: INCIDENT_STATUS_ICON.ACKNOWLEDGED,
    title: "Acknowledge this report",
    prompt: "Let the reporter know it has been seen. They see your message in the app.",
    placeholder: "e.g. Seen — the cleaning team has been told.",
    done: "Acknowledged — the reporter has been told.",
  },
  START_INVESTIGATION: {
    to: IncidentStatus.UNDER_INVESTIGATION,
    label: "Start investigation",
    icon: INCIDENT_STATUS_ICON.UNDER_INVESTIGATION,
    title: "Start the investigation",
    prompt: "Say what is being done about it. The reporter sees this message.",
    placeholder: "e.g. An electrician is on the way; the area is closed until it is safe.",
    done: "Under investigation — the reporter has been told.",
  },
  REOPEN: {
    to: IncidentStatus.UNDER_INVESTIGATION,
    label: "Reopen",
    icon: RotateCcw,
    title: "Reopen this report",
    prompt: "It goes back to Under Investigation and the reporter is told.",
    placeholder: "e.g. The leak is back after last night's rain.",
    done: "Reopened — the reporter has been told.",
  },
};

const TONE_BAR: Record<string, string> = { pending: "bg-pending", active: "bg-active", success: "bg-success", neutral: "bg-neutral", danger: "bg-danger" };

const RESOLUTION_ICON_TONE: Record<IncidentResolution, string> = {
  RESOLVED: "border-success/40 bg-success-soft text-success",
  NO_ACTION_NEEDED: "border-neutral/40 bg-neutral-soft text-neutral",
  DUPLICATE: "border-neutral/40 bg-neutral-soft text-neutral",
  REFERRED: "border-active/40 bg-active-soft text-active",
};

/** Reported ➔ Acknowledged ➔ Under Investigation ➔ Closed, with who moved it and when. */
function StageTracker({ stages }: { stages: IncidentStage[] }) {
  return (
    <ol className="grid grid-cols-4" aria-label="Stage">
      {stages.map((s, i) => {
        const Icon = INCIDENT_STATUS_ICON[s.status];
        const reached = s.state === "done" || s.state === "current";
        const lineOn = reached || stages.slice(i).some((x) => x.state === "done" || x.state === "current");
        return (
          <li key={s.status} className="relative flex min-w-0 flex-col items-center px-1 text-center" aria-current={s.state === "current" ? "step" : undefined}>
            {i > 0 && <span className={cx("absolute right-1/2 top-[17px] h-[2px] w-full", lineOn ? "bg-navy" : "bg-line")} aria-hidden />}
            <span
              className={cx(
                "relative z-10 grid h-9 w-9 place-items-center rounded-full border-2",
                s.state === "done" && (s.status === IncidentStatus.CLOSED ? "border-success bg-success text-white" : "border-navy bg-navy text-white"),
                s.state === "current" && "border-navy bg-white text-navy ring-4 ring-navy/10",
                s.state === "skipped" && "border-dashed border-line-strong bg-surface text-ink-subtle",
                s.state === "upcoming" && "border-line-strong bg-white text-ink-subtle",
              )}
            >
              {s.state === "done" ? <Check className="h-4 w-4" strokeWidth={3} aria-hidden /> : <Icon className="h-4 w-4" aria-hidden />}
            </span>
            <span className={cx("mt-2 text-xs font-semibold leading-tight", reached ? "text-navy" : "text-ink-subtle")}>{INCIDENT_STATUS_LABEL[s.status]}</span>
            <span className="mt-0.5 text-[11px] leading-tight text-ink-subtle">
              {s.state === "skipped" ? "Skipped" : s.state === "current" && !s.at ? "Now" : s.at ? when(s.at) : ""}
            </span>
            {s.by && s.state !== "upcoming" && <span className="mt-0.5 max-w-full truncate text-[11px] font-medium text-ink-muted">{s.by}</span>}
            {s.status === IncidentStatus.CLOSED && s.state === "done" && s.resolution && (
              <span className="mt-1">
                <ResolutionBadge resolution={s.resolution} />
              </span>
            )}
            <span className="sr-only">{s.state}</span>
          </li>
        );
      })}
    </ol>
  );
}

function describe(u: IncidentUpdate): { icon: LucideIcon; tone: string; text: string } {
  switch (u.type) {
    case "SUBMITTED":
      return { icon: INCIDENT_STATUS_ICON.REPORTED, tone: "bg-pending-soft text-pending", text: `${u.actor} reported this${u.metadata.confidential ? " in confidence" : ""}` };
    case "STATUS_CHANGED": {
      const to = u.toStatus as IncidentStatus;
      if (to === IncidentStatus.CLOSED) {
        const r = u.metadata.resolution as IncidentResolution | undefined;
        return { icon: INCIDENT_STATUS_ICON.CLOSED, tone: r === IncidentResolution.RESOLVED ? "bg-success-soft text-success" : "bg-neutral-soft text-neutral", text: `${u.actor} closed it${r ? ` — ${INCIDENT_RESOLUTION_LABEL[r] ?? r}` : ""}` };
      }
      if (u.fromStatus === IncidentStatus.CLOSED) return { icon: RotateCcw, tone: "bg-pending-soft text-pending", text: `${u.actor} reopened it` };
      if (to === IncidentStatus.ACKNOWLEDGED) return { icon: INCIDENT_STATUS_ICON.ACKNOWLEDGED, tone: "bg-active-soft text-active", text: `${u.actor} acknowledged it` };
      return { icon: INCIDENT_STATUS_ICON.UNDER_INVESTIGATION, tone: "bg-active-soft text-active", text: `${u.actor} started the investigation` };
    }
    case "NOTE_ADDED":
      return { icon: MessageSquare, tone: "bg-active-soft text-active", text: `${u.actor} sent the reporter an update` };
    case "PHOTO_ADDED":
      return { icon: Camera, tone: "bg-platinum-bright text-navy-500", text: u.metadata.kind === "RESOLUTION" ? `${u.actor} added a photo of the fix` : `${u.actor} added a photo` };
    case "DETAILS_CHANGED": {
      const changes = u.metadata as Record<string, { before: string | boolean; after: string | boolean }>;
      const parts = Object.entries(changes).map(([k, v]) => {
        if (k === "severity") return `severity ${INCIDENT_SEVERITY_LABEL[v.before as IncidentSeverity] ?? v.before} → ${INCIDENT_SEVERITY_LABEL[v.after as IncidentSeverity] ?? v.after}`;
        if (k === "group") return `group ${INCIDENT_GROUP_LABEL[v.before as IncidentGroup] ?? v.before} → ${INCIDENT_GROUP_LABEL[v.after as IncidentGroup] ?? v.after}`;
        if (k === "category") return `sub-category ${INCIDENT_CATEGORY_LABEL[v.before as IncidentCategory] ?? v.before} → ${INCIDENT_CATEGORY_LABEL[v.after as IncidentCategory] ?? v.after}`;
        if (k === "confidential") return v.after ? "marked it confidential (head office only)" : "shared it with the office's admins";
        if (k === "anonymous") return v.after ? "kept the reporter's name hidden" : "showed the reporter's name";
        return k;
      });
      return { icon: FilePenLine, tone: "bg-platinum-bright text-navy-500", text: `${u.actor} ${parts.join(", ") || "changed the details"}` };
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
      <p className="absolute bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-white/10 px-3 py-1 text-xs text-white">
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

function Segmented<T extends string>({ value, onChange, items, label }: { value: T; onChange: (v: T) => void; items: { value: T; label: string; icon?: LucideIcon; hint?: string }[]; label: string }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label={label}>
      {items.map((it) => {
        const on = it.value === value;
        return (
          <button
            key={it.value}
            type="button"
            role="radio"
            aria-checked={on}
            title={it.hint}
            onClick={() => onChange(it.value)}
            className={cx("flex h-11 items-center justify-center gap-1.5 rounded-xl border px-2 text-sm font-semibold transition", on ? "border-navy bg-navy text-white" : "border-line bg-white text-navy hover:border-line-strong")}
          >
            {it.icon && <it.icon className="h-4 w-4 shrink-0" aria-hidden />}
            <span className="truncate">{it.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function IncidentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const roles = useAuth((s) => s.profile?.roles ?? []);
  const seesConfidential = roles.some((r) => (INCIDENT_CONFIDENTIAL_ROLES as readonly string[]).includes(r));
  const [stageAction, setStageAction] = useState<StageAction | null>(null);
  const [closeOpen, setCloseOpen] = useState(false);
  const [resolution, setResolution] = useState<IncidentResolution>(IncidentResolution.RESOLVED);
  const [noteOpen, setNoteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [text, setText] = useState("");
  const [edit, setEdit] = useState({ group: "", category: "", severity: "", confidential: false });
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
    setStageAction(null);
    setCloseOpen(false);
    setNoteOpen(false);
    setEditOpen(false);
    setText("");
    setResolution(IncidentResolution.RESOLVED);
    setIdemKey(newKey());
    changeStage.reset();
    closeReport.reset();
    addNote.reset();
    editDetails.reset();
  }

  const changeStage = useMutation({
    mutationFn: (a: StageAction) => api.post<Incident>(`/incidents/${id}/status`, { status: STAGE_ACTION[a].to, note: text.trim() || undefined }, idemKey),
    onSuccess: (next, a) => {
      toast.success(STAGE_ACTION[a].done);
      closeDialogs();
      refreshAll(next);
    },
  });
  const closeReport = useMutation({
    mutationFn: () => api.post<Incident>(`/incidents/${id}/status`, { status: IncidentStatus.CLOSED, resolution, note: text.trim() || undefined }, idemKey),
    onSuccess: (next) => {
      toast.success(`Closed as ${INCIDENT_RESOLUTION_LABEL[next.resolution as IncidentResolution] ?? "closed"} — the reporter has been told.`);
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
    mutationFn: () => api.patch<Incident | { id: string; movedToHeadOffice: true }>(`/incidents/${id}`, edit),
    onSuccess: (next) => {
      closeDialogs();
      if ("movedToHeadOffice" in next) {
        toast.success("Marked confidential and handed to head office. It is no longer visible to your office.");
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
  const open = isIncidentOpen(i.status);
  const critical = i.severity === IncidentSeverity.CRITICAL && open;
  const tone = critical ? "danger" : (INCIDENT_STATUS_TONE[i.status as IncidentStatus] ?? "neutral");
  const sa = stageAction ? STAGE_ACTION[stageAction] : null;
  const closing = i.stages.find((s) => s.status === IncidentStatus.CLOSED);
  const closeNote = [...i.updates].reverse().find((u) => u.type === "STATUS_CHANGED" && u.toStatus === IncidentStatus.CLOSED)?.note ?? null;
  const needsNote = incidentResolutionNeedsNote(resolution);
  // The natural next step is the primary button.
  const primary: "ACKNOWLEDGE" | "START_INVESTIGATION" | "CLOSE" | null =
    i.status === IncidentStatus.REPORTED ? "ACKNOWLEDGE" : i.status === IncidentStatus.ACKNOWLEDGED ? "START_INVESTIGATION" : i.status === IncidentStatus.UNDER_INVESTIGATION ? "CLOSE" : null;
  const btn = (a: string) => (primary === a ? "btn-primary" : "btn-secondary");
  const editForced = incidentForcesConfidential(edit.category);
  const editChanged = edit.group !== i.group || edit.category !== i.category || edit.severity !== i.severity || edit.confidential !== i.confidential;
  const groupLabel = INCIDENT_GROUP_LABEL[i.group as IncidentGroup] ?? i.group;

  return (
    <div className="space-y-6">
      <Link to="/incidents" className="no-print inline-flex items-center gap-1.5 text-sm font-semibold text-ink-muted hover:text-navy">
        <ArrowLeft className="h-4 w-4" /> Incident & Facility Issues
      </Link>

      <section className="card overflow-hidden">
        <div className={cx("h-1", TONE_BAR[tone])} />
        <div className="flex flex-wrap items-start justify-between gap-4 px-5 pb-5 pt-5 sm:px-6">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="mono text-sm text-navy-500">{i.referenceNumber}</span>
              <IncidentStatusBadge status={i.status} />
              <SeverityBadge severity={i.severity} size="md" />
              {i.resolution && <ResolutionBadge resolution={i.resolution} />}
              {i.confidential && <ConfidentialBadge />}
              {i.anonymous && (
                <Pill tone="neutral">
                  <EyeOff className="h-3 w-3" /> Anonymous
                </Pill>
              )}
            </div>
            <h1 className="mt-2 break-words font-display text-[24px] font-extrabold leading-tight tracking-tight text-navy sm:text-[26px]">{i.title}</h1>
            <p className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-sm text-ink-muted">
              <IncidentGroupIcon group={i.group} className="h-4 w-4 text-navy-500" />
              <span className="font-medium text-ink">{groupLabel}</span>
              <span aria-hidden>›</span>
              <span>{INCIDENT_CATEGORY_LABEL[i.category as IncidentCategory] ?? i.category}</span>
              <span aria-hidden>·</span>
              <span>{i.branch.name}</span>
              <span aria-hidden>·</span>
              <span>reported {stamp(i.createdAt)}</span>
            </p>
          </div>
          {i.viewer.canManage && (
            <div className="no-print flex flex-wrap gap-2">
              {actions.has("ADD_NOTE") && (
                <button className="btn-secondary" onClick={() => setNoteOpen(true)}>
                  <MessageSquare className="h-4 w-4" /> Send update
                </button>
              )}
              {actions.has("ACKNOWLEDGE") && (
                <button className={btn("ACKNOWLEDGE")} onClick={() => setStageAction("ACKNOWLEDGE")}>
                  <STAGE_ACTION.ACKNOWLEDGE.icon className="h-4 w-4" /> Acknowledge
                </button>
              )}
              {actions.has("START_INVESTIGATION") && (
                <button className={btn("START_INVESTIGATION")} onClick={() => setStageAction("START_INVESTIGATION")}>
                  <STAGE_ACTION.START_INVESTIGATION.icon className="h-4 w-4" /> Start investigation
                </button>
              )}
              {actions.has("CLOSE") && (
                <button className={btn("CLOSE")} onClick={() => setCloseOpen(true)}>
                  <INCIDENT_STATUS_ICON.CLOSED className="h-4 w-4" /> Close
                </button>
              )}
              {actions.has("REOPEN") && (
                <button className="btn-secondary" onClick={() => setStageAction("REOPEN")}>
                  <RotateCcw className="h-4 w-4" /> Reopen
                </button>
              )}
            </div>
          )}
        </div>
        <div className="border-t border-line bg-surface/50 px-3 py-5 sm:px-6">
          <StageTracker stages={i.stages} />
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

          {i.status === IncidentStatus.CLOSED && i.resolution && (
            <Card title="Resolution">
              <div className="flex items-start gap-3">
                <span className={cx("grid h-10 w-10 shrink-0 place-items-center rounded-xl border", RESOLUTION_ICON_TONE[i.resolution as IncidentResolution] ?? RESOLUTION_ICON_TONE.RESOLVED)}>
                  <INCIDENT_STATUS_ICON.CLOSED className="h-5 w-5" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="font-semibold text-navy">{INCIDENT_RESOLUTION_LABEL[i.resolution as IncidentResolution] ?? i.resolution}</p>
                  <p className="text-xs text-ink-muted">
                    {INCIDENT_RESOLUTION_HINT[i.resolution as IncidentResolution]} · closed {stamp(i.closedAt)}
                    {closing?.by ? ` by ${closing.by}` : ""}
                  </p>
                  {closeNote && <p className="mt-2 rounded-lg bg-surface px-3 py-2 text-sm text-ink">{closeNote}</p>}
                </div>
              </div>
            </Card>
          )}

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
                      {u.note && <p className="mt-1.5 whitespace-pre-line rounded-lg bg-surface px-3 py-2 text-sm text-ink">{u.note}</p>}
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
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-neutral-soft text-neutral">{i.anonymous ? <EyeOff className="h-5 w-5" /> : <LockKeyhole className="h-5 w-5" />}</span>
                <div>
                  <p className="text-sm font-semibold text-ink">{i.anonymous ? "Anonymous employee" : "Identity protected"}</p>
                  <p className="text-xs text-ink-muted">
                    {i.anonymous
                      ? "The reporter chose not to share their name. They still see every update you send."
                      : "Reported in confidence: the reporter's name is not shown to anyone handling it. They still see every update you send."}
                  </p>
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
                    setEdit({ group: i.group, category: i.category, severity: i.severity, confidential: i.confidential });
                    setEditOpen(true);
                  }}
                >
                  <FilePenLine className="h-3.5 w-3.5" /> Edit
                </button>
              )
            }
          >
            <dl className="grid grid-cols-1 gap-4">
              <KeyValue label="Group">
                <span className="inline-flex items-center gap-1.5">
                  <IncidentGroupIcon group={i.group} className="h-3.5 w-3.5 text-navy-500" /> {groupLabel}
                </span>
              </KeyValue>
              <KeyValue label="Sub-category">
                {INCIDENT_CATEGORY_LABEL[i.category as IncidentCategory] ?? i.category}
                <span className="block text-xs font-normal text-ink-subtle">{INCIDENT_CATEGORY_HINT[i.category as IncidentCategory]}</span>
              </KeyValue>
              <KeyValue label="Severity">
                <SeverityBadge severity={i.severity} />
                <span className="mt-1 block text-xs font-normal text-ink-subtle">{INCIDENT_SEVERITY_HINT[i.severity as IncidentSeverity]}</span>
              </KeyValue>
              <KeyValue label="Confidentiality">
                {i.confidential ? (
                  <span className="inline-flex items-center gap-1.5">
                    <LockKeyhole className="h-3.5 w-3.5 text-navy-500" /> Confidential — head office only
                  </span>
                ) : (
                  "Office's admins and head office"
                )}
              </KeyValue>
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
              <button className="btn-primary" disabled={changeStage.isPending} onClick={() => changeStage.mutate(stageAction!)}>
                {changeStage.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <sa.icon className="h-4 w-4" />} {sa.label}
              </button>
            </>
          )
        }
      >
        <Field label="Message for the reporter (optional)">
          {(fid) => <textarea id={fid} className="input min-h-[96px] py-2.5" placeholder={sa?.placeholder} value={text} onChange={(e) => setText(e.target.value)} maxLength={INCIDENT_LIMITS.noteMax} />}
        </Field>
        <ErrorNote error={changeStage.error} />
      </Modal>

      <Modal
        open={closeOpen}
        onClose={closeDialogs}
        width="max-w-xl"
        title="Close this report"
        subtitle="Choose how it was closed. The reporter is told, with your message."
        footer={
          <>
            <button className="btn-ghost" onClick={closeDialogs}>
              Cancel
            </button>
            <button className="btn-primary" disabled={closeReport.isPending || (needsNote && text.trim().length < INCIDENT_LIMITS.reasonMin)} onClick={() => closeReport.mutate()}>
              {closeReport.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <INCIDENT_STATUS_ICON.CLOSED className="h-4 w-4" />} Close as {INCIDENT_RESOLUTION_LABEL[resolution]}
            </button>
          </>
        }
      >
        <fieldset>
          <legend className="label">Resolution</legend>
          <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Resolution">
            {INCIDENT_RESOLUTIONS.map((r) => {
              const on = r === resolution;
              return (
                <button
                  key={r}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setResolution(r)}
                  className={cx("flex items-start gap-3 rounded-xl border p-3 text-left transition", on ? "border-navy bg-navy/[0.04] ring-1 ring-navy" : "border-line hover:border-line-strong")}
                >
                  <span className={cx("mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border-2", on ? "border-navy bg-navy text-white" : "border-line-strong")}>{on && <Check className="h-3 w-3" strokeWidth={3} />}</span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-navy">{INCIDENT_RESOLUTION_LABEL[r]}</span>
                    <span className="block text-xs text-ink-muted">{INCIDENT_RESOLUTION_HINT[r]}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>
        <Field
          label={needsNote ? "Reason for the reporter (required)" : "Message for the reporter (optional)"}
          hint={needsNote ? undefined : "Adding a photo of the fix afterwards helps the reporter trust it."}
        >
          {(fid) => (
            <textarea
              id={fid}
              className="input min-h-[96px] py-2.5"
              placeholder={
                resolution === IncidentResolution.RESOLVED
                  ? "e.g. Floor cleaned and an anti-slip mat placed at the door."
                  : resolution === IncidentResolution.DUPLICATE
                    ? "e.g. Already reported this morning as INC-…; we are handling it there."
                    : resolution === IncidentResolution.REFERRED
                      ? "e.g. Referred to the building owner's maintenance team, who will repair it this week."
                      : "e.g. Checked with the electrician: the flicker is from a loose tube, which is safe; it will be replaced in the monthly round."
              }
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={INCIDENT_LIMITS.noteMax}
            />
          )}
        </Field>
        <ErrorNote error={closeReport.error} />
      </Modal>

      <Modal
        open={noteOpen}
        onClose={closeDialogs}
        title="Send the reporter an update"
        subtitle="The stage stays the same; the reporter gets a notification with your message."
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
        width="max-w-xl"
        title="Edit details"
        subtitle="Correct the group, sub-category, severity or confidentiality. Every change is kept in the history."
        footer={
          <>
            <button className="btn-ghost" onClick={closeDialogs}>
              Cancel
            </button>
            <button className="btn-primary" disabled={editDetails.isPending || !editChanged} onClick={() => editDetails.mutate()}>
              {editDetails.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Save
            </button>
          </>
        }
      >
        <div>
          <p className="label">Group</p>
          <Segmented
            label="Group"
            value={edit.group}
            onChange={(g) => {
              const first = INCIDENT_GROUP_CATEGORIES[g as IncidentGroup][0];
              setEdit((e) => ({ ...e, group: g, category: INCIDENT_CATEGORY_GROUP[e.category as IncidentCategory] === g ? e.category : first, confidential: incidentForcesConfidential(first) || e.confidential }));
            }}
            items={INCIDENT_GROUPS.map((g) => ({ value: g, label: INCIDENT_GROUP_LABEL[g], icon: INCIDENT_GROUP_ICON[g] }))}
          />
        </div>
        <Field label="Sub-category" hint={INCIDENT_CATEGORY_HINT[edit.category as IncidentCategory]}>
          {(fid) => (
            <select id={fid} className="input" value={edit.category} onChange={(e) => setEdit((x) => ({ ...x, category: e.target.value, confidential: incidentForcesConfidential(e.target.value) || x.confidential }))}>
              {(INCIDENT_GROUP_CATEGORIES[edit.group as IncidentGroup] ?? []).map((c) => (
                <option key={c} value={c}>
                  {INCIDENT_CATEGORY_LABEL[c]}
                </option>
              ))}
            </select>
          )}
        </Field>
        <div>
          <p className="label">Severity</p>
          <Segmented label="Severity" value={edit.severity} onChange={(v) => setEdit((x) => ({ ...x, severity: v }))} items={INCIDENT_SEVERITIES.map((v) => ({ value: v, label: INCIDENT_SEVERITY_LABEL[v], hint: INCIDENT_SEVERITY_HINT[v] }))} />
          <p className="mt-1 text-xs text-ink-subtle">{INCIDENT_SEVERITY_HINT[edit.severity as IncidentSeverity]}</p>
        </div>
        <div className="flex items-start justify-between gap-4 rounded-xl border border-line px-4 py-3">
          <div>
            <p className="flex items-center gap-1.5 text-sm font-semibold text-navy">
              <LockKeyhole className="h-4 w-4" /> Confidential
            </p>
            <p className="mt-0.5 text-xs text-ink-muted">{editForced ? "Misconduct reports are always confidential." : "Head office only; the reporter's identity is hidden from everyone handling it."}</p>
          </div>
          <Toggle checked={edit.confidential || editForced} disabled={editForced} onChange={(v) => setEdit((x) => ({ ...x, confidential: v }))} label="Confidential" />
        </div>
        {(edit.confidential || editForced) && !i.confidential && !seesConfidential && (
          <p className="flex items-start gap-2 rounded-xl bg-pending-soft px-3 py-2.5 text-sm text-pending">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" /> Confidential reports are handled by head office only. Once saved, this report leaves your office's list and head office is told.
          </p>
        )}
        {i.confidential && !edit.confidential && !editForced && (
          <p className="flex items-start gap-2 rounded-xl bg-active-soft px-3 py-2.5 text-sm text-navy">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-active" /> The office's admins will see this report and be told. The reporter's name stays hidden — it was reported in confidence.
          </p>
        )}
        <ErrorNote error={editDetails.error} />
      </Modal>

      {viewing !== null && i.photos[viewing] && <Lightbox photos={i.photos} index={viewing} onClose={() => setViewing(null)} onMove={setViewing} />}
    </div>
  );
}
