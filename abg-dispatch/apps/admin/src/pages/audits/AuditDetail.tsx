import { useCallback, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Ban,
  BadgeCheck,
  ClipboardCheck,
  ClipboardList,
  FilePlus2,
  FileSearch,
  Info,
  Loader2,
  MapPin,
  MessageSquare,
  Play,
  Send,
  Undo2,
  UserCheck,
  UserCog,
  Users,
  type LucideIcon,
} from "lucide-react";
import {
  AUDIT_LIMITS,
  AUDIT_RATING_LABEL,
  AUDIT_TYPE_LABEL,
  AuditRating,
  FINDING_DUE_DAYS,
  FINDING_SEVERITY_LABEL,
  FINDING_SEVERITY_ORDER,
  FindingSeverity,
  type AuditType,
} from "@abg-dispatch/shared";
import { api, newKey } from "../../lib/api";
import { dhakaDay, stamp, when } from "../../lib/format";
import { toast } from "../../components/toast";
import { Card, Empty, ErrorNote, Field, KeyValue, Modal, Spinner, cx } from "../../components/ui";
import { HistoryList, TONE_BAR, type HistoryEntry } from "../../components/StatusChip";
import { PersonPicker, type PickedPerson } from "../../components/PersonPicker";
import { AuditStatusBadge, AuditTypeTag, FindingStatusBadge, FindingsBar, OverdueTag, RatingBadge, SeverityTag, auditDates, auditTone, calendarDay } from "./parts";
import type { Audit, AuditUpdate, Finding } from "./types";

type AuditDialog = "START" | "ADD_FINDING" | "COMPLETE_FIELDWORK" | "CLOSE" | "CANCEL" | "ADD_NOTE";
type FindingDialog = "SUBMIT" | "VERIFY" | "REOPEN" | "REASSIGN";

const addDays = (d: string, n: number) => new Date(new Date(`${d}T00:00:00Z`).getTime() + n * 86_400_000).toISOString().slice(0, 10);

function describe(u: AuditUpdate): HistoryEntry {
  const base = { id: u.id, at: u.createdAt, note: u.note };
  const n = typeof u.metadata?.number === "string" ? `${u.metadata.number} ` : "";
  switch (u.type) {
    case "CREATED":
      return { ...base, icon: ClipboardList, tone: "bg-active-soft text-active", text: `${u.actor} planned the audit` };
    case "FINDING_ADDED":
      return { ...base, note: null, icon: FilePlus2, tone: "bg-pending-soft text-pending", text: `${u.actor} recorded ${n}— ${u.note}` };
    case "FINDING_SUBMITTED":
      return { ...base, icon: Send, tone: "bg-active-soft text-active", text: `${u.actor} submitted the fix for ${n.trim()}` };
    case "FINDING_VERIFIED":
      return { ...base, icon: BadgeCheck, tone: "bg-success-soft text-success", text: `${u.actor} verified ${n.trim()}` };
    case "FINDING_REOPENED":
      return { ...base, icon: Undo2, tone: "bg-pending-soft text-pending", text: `${u.actor} sent ${n.trim()} back` };
    case "FINDING_REASSIGNED":
      return { ...base, icon: UserCog, tone: "bg-platinum-bright text-navy-500", text: `${u.actor} reassigned ${n.trim()}` };
    case "NOTE_ADDED":
      return { ...base, icon: MessageSquare, tone: "bg-platinum-bright text-navy-500", text: `${u.actor} added a note` };
    default:
      switch (u.toStatus) {
        case "IN_PROGRESS":
          return { ...base, icon: Play, tone: "bg-active-soft text-active", text: `${u.actor} started the fieldwork` };
        case "FOLLOW_UP":
          return { ...base, icon: FileSearch, tone: "bg-pending-soft text-pending", text: `${u.actor} completed the fieldwork; corrective actions are open` };
        case "CLOSED":
          return { ...base, icon: ClipboardCheck, tone: "bg-success-soft text-success", text: `${u.actor} closed the audit` };
        case "CANCELLED":
          return { ...base, icon: Ban, tone: "bg-neutral-soft text-neutral", text: `${u.actor} cancelled the audit` };
        default:
          return { ...base, icon: Info, tone: "bg-platinum-bright text-navy-500", text: u.actor };
      }
  }
}

function FindingCard({ f, onAction }: { f: Finding; onAction: (d: FindingDialog, f: Finding) => void }) {
  const actions = new Set(f.actions);
  return (
    <li className={cx("rounded-2xl border bg-white p-4", f.overdue ? "border-danger/30" : "border-line")}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mono text-[12px] font-semibold text-navy">{f.number}</span>
            <SeverityTag severity={f.severity} />
            <FindingStatusBadge status={f.status} />
            {f.overdue && <OverdueTag />}
          </div>
          <p className="mt-1.5 text-[15px] font-semibold text-ink">{f.title}</p>
          {f.detail && <p className="mt-1 whitespace-pre-line text-sm text-ink-muted">{f.detail}</p>}
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-subtle">
            {f.clause && <span>Clause: {f.clause}</span>}
            {f.area && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3" aria-hidden /> {f.area}
              </span>
            )}
          </div>
        </div>
        {f.owner && (
          <div className="w-full shrink-0 rounded-xl bg-surface px-3 py-2 sm:w-[220px]">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-subtle">Owner</p>
            <p className="truncate text-sm font-semibold text-ink">{f.owner.name}</p>
            <p className="truncate text-xs text-ink-muted">{f.owner.designation ?? "—"}</p>
            {f.dueDate && <p className={cx("mt-1 text-xs", f.overdue ? "font-semibold text-danger" : "text-ink-subtle")}>Due {calendarDay(f.dueDate)}</p>}
          </div>
        )}
      </div>
      {f.recommendation && (
        <p className="mt-3 rounded-lg bg-platinum-bright/60 px-3 py-2 text-sm text-ink">
          <span className="font-semibold text-navy">Recommended: </span>
          {f.recommendation}
        </p>
      )}
      {f.response && (
        <p className="mt-2 rounded-lg bg-active-soft px-3 py-2 text-sm text-navy">
          <span className="font-semibold">Fix: </span>
          {f.response}
          {f.submittedAt && <span className="block text-xs text-ink-subtle">Submitted {when(f.submittedAt)}</span>}
        </p>
      )}
      {f.verifiedAt && (
        <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-success">
          <BadgeCheck className="h-3.5 w-3.5" aria-hidden /> Verified by {f.verifiedByName} · {when(f.verifiedAt)}
        </p>
      )}
      {f.actions.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">
          {actions.has("SUBMIT") && (
            <button className="btn-primary h-9" onClick={() => onAction("SUBMIT", f)}>
              <Send className="h-4 w-4" /> Submit the fix
            </button>
          )}
          {actions.has("VERIFY") && (
            <button className="btn-primary h-9" onClick={() => onAction("VERIFY", f)}>
              <BadgeCheck className="h-4 w-4" /> Verify
            </button>
          )}
          {actions.has("REOPEN") && (
            <button className="btn-secondary h-9" onClick={() => onAction("REOPEN", f)}>
              <Undo2 className="h-4 w-4" /> Send back
            </button>
          )}
          {actions.has("REASSIGN") && (
            <button className="btn-ghost h-9" onClick={() => onAction("REASSIGN", f)}>
              <UserCog className="h-4 w-4" /> Reassign
            </button>
          )}
        </div>
      )}
    </li>
  );
}

export function AuditDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const today = dhakaDay();
  const audit = useQuery({ queryKey: ["audit", id], queryFn: () => api.get<Audit>(`/audits/${id}`) });
  const [dialog, setDialog] = useState<AuditDialog | null>(null);
  const [fDialog, setFDialog] = useState<{ d: FindingDialog; f: Finding } | null>(null);
  const [text, setText] = useState("");
  const [idemKey, setIdemKey] = useState(newKey);
  // Add-finding form.
  const [fTitle, setFTitle] = useState("");
  const [fDetail, setFDetail] = useState("");
  const [fSeverity, setFSeverity] = useState<string>(FindingSeverity.MAJOR);
  const [fClause, setFClause] = useState("");
  const [fArea, setFArea] = useState("");
  const [fRecommendation, setFRecommendation] = useState("");
  const [fOwner, setFOwner] = useState<PickedPerson | null>(null);
  const [fDue, setFDue] = useState("");
  // Fieldwork form.
  const [rating, setRating] = useState<string>(AuditRating.SATISFACTORY);
  const [score, setScore] = useState("");

  const done = (next: Audit, message: string) => {
    qc.setQueryData(["audit", id], next);
    void qc.invalidateQueries({ queryKey: ["audits"] });
    toast.success(message);
    closeRef.current();
  };
  const act = useMutation({
    mutationFn: (d: AuditDialog) => {
      const note = text.trim() || undefined;
      switch (d) {
        case "START":
          return api.post<Audit>(`/audits/${id}/start`, {}, idemKey);
        case "ADD_FINDING":
          return api.post<Audit>(
            `/audits/${id}/findings`,
            {
              title: fTitle.trim(),
              detail: fDetail.trim() || undefined,
              severity: fSeverity,
              clause: fClause.trim() || undefined,
              area: fArea.trim() || undefined,
              recommendation: fRecommendation.trim() || undefined,
              ownerUserId: fSeverity === FindingSeverity.OBSERVATION ? undefined : fOwner?.userId ?? undefined,
              dueDate: fSeverity === FindingSeverity.OBSERVATION ? undefined : fDue || undefined,
            },
            idemKey,
          );
        case "COMPLETE_FIELDWORK":
          return api.post<Audit>(`/audits/${id}/complete-fieldwork`, { rating, score: score ? Number(score) : undefined, conclusion: text.trim() }, idemKey);
        case "CLOSE":
          return api.post<Audit>(`/audits/${id}/close`, { note }, idemKey);
        case "CANCEL":
          return api.post<Audit>(`/audits/${id}/cancel`, { note }, idemKey);
        case "ADD_NOTE":
          return api.post<Audit>(`/audits/${id}/notes`, { note }, idemKey);
      }
    },
    onSuccess: (next, d) =>
      done(
        next,
        {
          START: "Fieldwork started — record findings as you go.",
          ADD_FINDING: next.findings.at(-1)?.owner ? `${next.findings.at(-1)!.number} recorded; ${next.findings.at(-1)!.owner!.name} has been told.` : `${next.findings.at(-1)?.number ?? "Finding"} recorded.`,
          COMPLETE_FIELDWORK: next.status === "CLOSED" ? "Fieldwork complete — nothing left open, so the audit is closed." : "Fieldwork complete — corrective actions are being followed up.",
          CLOSE: "Audit closed.",
          CANCEL: "Audit cancelled.",
          ADD_NOTE: "Note added.",
        }[d],
      ),
  });
  const [newOwner, setNewOwner] = useState<PickedPerson | null>(null);
  const [newDue, setNewDue] = useState("");
  const fAct = useMutation({
    mutationFn: ({ d, f }: { d: FindingDialog; f: Finding }) => {
      const note = text.trim() || undefined;
      switch (d) {
        case "SUBMIT":
          return api.post<Audit>(`/audits/findings/${f.id}/submit`, { response: text.trim() }, idemKey);
        case "VERIFY":
          return api.post<Audit>(`/audits/findings/${f.id}/verify`, { note }, idemKey);
        case "REOPEN":
          return api.post<Audit>(`/audits/findings/${f.id}/reopen`, { note }, idemKey);
        case "REASSIGN":
          return api.post<Audit>(`/audits/findings/${f.id}/reassign`, { ownerUserId: newOwner?.userId, dueDate: newDue || undefined }, idemKey);
      }
    },
    onSuccess: (next, { d, f }) => done(next, { SUBMIT: "Fix submitted — the audit lead verifies it next.", VERIFY: `${f.number} verified.`, REOPEN: `${f.number} sent back to ${f.owner?.name ?? "the owner"}.`, REASSIGN: `${f.number} reassigned.` }[d]),
  });

  const closeRef = useRef<() => void>(() => undefined);
  closeRef.current = () => {
    setDialog(null);
    setFDialog(null);
    setText("");
    setIdemKey(newKey());
    setFTitle("");
    setFDetail("");
    setFSeverity(FindingSeverity.MAJOR);
    setFClause("");
    setFArea("");
    setFRecommendation("");
    setFOwner(null);
    setFDue("");
    setRating(AuditRating.SATISFACTORY);
    setScore("");
    setNewOwner(null);
    setNewDue("");
    act.reset();
    fAct.reset();
  };
  const close = useCallback(() => closeRef.current(), []);

  if (audit.isLoading) return <Spinner label="Loading the audit" />;
  if (audit.error || !audit.data) return <ErrorNote error={audit.error ?? new Error("Audit not found.")} />;
  const a = audit.data;
  const actions = new Set(a.viewer.actions);
  const observation = fSeverity === FindingSeverity.OBSERVATION;
  const defaultDue = observation ? "" : addDays(today, FINDING_DUE_DAYS[fSeverity as keyof typeof FINDING_DUE_DAYS]);
  const openFinding = () => {
    setDialog("ADD_FINDING");
    setFDue(addDays(today, FINDING_DUE_DAYS.MAJOR));
  };

  const auditCopy: Record<AuditDialog, { title: string; subtitle: string; label: string; icon: LucideIcon; danger?: boolean }> = {
    START: { title: "Start the fieldwork", subtitle: "Marks the audit in progress. You can then record findings.", label: "Start", icon: Play },
    ADD_FINDING: { title: "Record a finding", subtitle: "Every finding except an observation gets an owner and a due date; the owner is told at once.", label: "Record finding", icon: FilePlus2 },
    COMPLETE_FIELDWORK: { title: "Complete the fieldwork", subtitle: a.counts.open + a.counts.submitted ? "Record the result. The audit stays open until every corrective action is verified." : "Record the result. Nothing is left open, so the audit closes.", label: "Complete fieldwork", icon: FileSearch },
    CLOSE: { title: "Close the audit", subtitle: "Every corrective action is verified. The office's admins are told.", label: "Close audit", icon: ClipboardCheck },
    CANCEL: { title: "Cancel the audit", subtitle: "A reason is required. The office's admins are told.", label: "Cancel audit", icon: Ban, danger: true },
    ADD_NOTE: { title: "Add a note", subtitle: "Kept in the audit's history; the lead is told.", label: "Add note", icon: MessageSquare },
  };
  const copy = dialog ? auditCopy[dialog] : null;
  const auditOk =
    dialog === "ADD_FINDING"
      ? fTitle.trim().length >= AUDIT_LIMITS.findingTitleMin && (observation || !!fOwner?.userId)
      : dialog === "COMPLETE_FIELDWORK"
        ? text.trim().length >= 3 && (!score || (Number(score) >= 0 && Number(score) <= 100))
        : dialog === "CANCEL" || dialog === "ADD_NOTE"
          ? text.trim().length >= (dialog === "ADD_NOTE" ? 2 : AUDIT_LIMITS.reasonMin)
          : true;
  const fCopy = fDialog
    ? {
        SUBMIT: { title: `Submit the fix for ${fDialog.f.number}`, subtitle: "Say what was done. The audit lead verifies it.", label: "Submit fix", icon: Send, field: "What was done", placeholder: "e.g. Bunded pallets installed and a spill kit placed by the door.", min: AUDIT_LIMITS.reasonMin },
        VERIFY: { title: `Verify ${fDialog.f.number}`, subtitle: "Confirms the corrective action is done; the owner is told.", label: "Verify", icon: BadgeCheck, field: "Note (optional)", placeholder: "e.g. Checked on site.", min: 0 },
        REOPEN: { title: `Send ${fDialog.f.number} back`, subtitle: "Tell the owner what is still missing. It goes back to open.", label: "Send back", icon: Undo2, field: "What is still missing", placeholder: "e.g. Add a drip tray under the tap too.", min: AUDIT_LIMITS.reasonMin },
        REASSIGN: { title: `Reassign ${fDialog.f.number}`, subtitle: "The new owner is told; you can move the due date too.", label: "Reassign", icon: UserCog, field: "", placeholder: "", min: 0 },
      }[fDialog.d]
    : null;
  const fOk = fDialog?.d === "REASSIGN" ? !!newOwner?.userId : text.trim().length >= (fCopy?.min ?? 0);

  return (
    <div className="space-y-6">
      <Link to="/audits" className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-muted hover:text-navy">
        <ArrowLeft className="h-4 w-4" /> Audit
      </Link>

      <section className="card overflow-hidden">
        <div className={cx("h-1", TONE_BAR[auditTone(a.status)])} />
        <div className="flex flex-wrap items-start justify-between gap-4 px-5 pb-5 pt-5 sm:px-6">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="mono text-sm text-navy-500">{a.referenceNumber}</span>
              <AuditStatusBadge status={a.status} />
              <AuditTypeTag type={a.type} />
              <RatingBadge rating={a.rating} />
            </div>
            <h1 className="mt-2 break-words font-display text-[24px] font-extrabold leading-tight tracking-tight text-navy sm:text-[26px]">{a.title}</h1>
            <p className="mt-1 text-sm text-ink-muted">
              {a.branch.name} · {auditDates(a.plannedStart, a.plannedEnd)}
              {a.externalBody ? ` · ${a.externalBody}` : ""}
            </p>
          </div>
          {a.viewer.actions.length > 0 && (
            <div className="flex w-full flex-wrap gap-2 sm:w-auto">
              {actions.has("ADD_NOTE") && (
                <button className="btn-ghost" onClick={() => setDialog("ADD_NOTE")}>
                  <MessageSquare className="h-4 w-4" /> Add note
                </button>
              )}
              {actions.has("CANCEL") && (
                <button className="btn-secondary" onClick={() => setDialog("CANCEL")}>
                  <Ban className="h-4 w-4" /> Cancel
                </button>
              )}
              {actions.has("ADD_FINDING") && (
                <button className="btn-secondary" onClick={openFinding}>
                  <FilePlus2 className="h-4 w-4" /> Record finding
                </button>
              )}
              {actions.has("START") && (
                <button className="btn-primary" onClick={() => setDialog("START")}>
                  <Play className="h-4 w-4" /> Start fieldwork
                </button>
              )}
              {actions.has("COMPLETE_FIELDWORK") && (
                <button className="btn-primary" onClick={() => setDialog("COMPLETE_FIELDWORK")}>
                  <FileSearch className="h-4 w-4" /> Complete fieldwork
                </button>
              )}
              {actions.has("CLOSE") && (
                <button className="btn-primary" onClick={() => setDialog("CLOSE")}>
                  <ClipboardCheck className="h-4 w-4" /> Close audit
                </button>
              )}
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-px border-t border-line bg-line sm:grid-cols-4">
          {[
            ["Findings", a.counts.total],
            ["Actions open", a.counts.open + a.counts.submitted],
            ["Overdue", a.counts.overdue],
            ["Verified", a.counts.verified],
          ].map(([label, value]) => (
            <div key={label} className="bg-surface/60 px-5 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-subtle">{label}</p>
              <p className={cx("tabular font-display text-xl font-extrabold", label === "Overdue" && Number(value) > 0 ? "text-danger" : "text-navy")}>{value}</p>
            </div>
          ))}
        </div>
      </section>

      {a.viewer.partial && (
        <div className="flex items-start gap-3 rounded-2xl border border-active/20 bg-active-soft px-5 py-4 text-sm text-navy">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-active" aria-hidden />
          <p>You see the findings assigned to you. Submit each fix once it is done; {a.lead.name} verifies it.</p>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-6">
          <Card title="Findings" action={<FindingsBar counts={a.counts} />}>
            {a.findings.length === 0 ? (
              <Empty icon={ClipboardList} title={a.status === "PLANNED" ? "Fieldwork has not started" : "No findings recorded"} hint={a.status === "IN_PROGRESS" ? "Use Record finding for each gap the auditors raise." : undefined} />
            ) : (
              <ul className="space-y-3">
                {[...a.findings]
                  .sort((x, y) => FINDING_SEVERITY_ORDER.indexOf(x.severity as FindingSeverity) - FINDING_SEVERITY_ORDER.indexOf(y.severity as FindingSeverity) || x.number.localeCompare(y.number))
                  .map((f) => (
                    <FindingCard key={f.id} f={f} onAction={(d, finding) => setFDialog({ d, f: finding })} />
                  ))}
              </ul>
            )}
          </Card>
          {a.updates.length > 0 && (
            <Card title="History" action={<span className="text-xs text-ink-subtle">Append-only · Asia/Dhaka</span>}>
              <HistoryList entries={a.updates.map(describe)} />
            </Card>
          )}
        </div>
        <div className="space-y-6">
          {a.conclusion && (
            <Card title="Result">
              <div className="flex flex-wrap items-center gap-2">
                <RatingBadge rating={a.rating} />
                {a.score !== null && <span className="tabular text-sm font-semibold text-navy">Score {a.score}/100</span>}
              </div>
              <p className="mt-3 text-sm leading-relaxed text-ink">{a.conclusion}</p>
              {a.fieldworkCompletedAt && <p className="mt-2 text-xs text-ink-subtle">Fieldwork completed {stamp(a.fieldworkCompletedAt)}</p>}
            </Card>
          )}
          <Card title="Audit">
            <dl className="grid grid-cols-1 gap-4">
              <KeyValue label="Type">{AUDIT_TYPE_LABEL[a.type as AuditType] ?? a.type}</KeyValue>
              <KeyValue label="Office">
                {a.branch.name} <span className="mono text-xs text-ink-muted">{a.branch.code}</span>
              </KeyValue>
              <KeyValue label="Fieldwork">{auditDates(a.plannedStart, a.plannedEnd)}</KeyValue>
              {a.externalBody && <KeyValue label="Audit body">{a.externalBody}</KeyValue>}
              <KeyValue label="Planned by">{a.createdByName}</KeyValue>
            </dl>
            {a.scope && <p className="mt-4 whitespace-pre-line border-t border-line pt-4 text-sm leading-relaxed text-ink">{a.scope}</p>}
          </Card>
          <Card title="People">
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-platinum-bright text-navy-500">
                  <UserCheck className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink">{a.lead.name}</p>
                  <p className="text-xs text-ink-muted">Audit lead{a.lead.designation ? ` · ${a.lead.designation}` : ""}</p>
                </div>
              </li>
              {a.team.length > 0 && (
                <li className="flex items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-platinum-bright text-navy-500">
                    <Users className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink">Audit team</p>
                    <p className="text-xs text-ink-muted">{a.team.join(", ")}</p>
                  </div>
                </li>
              )}
            </ul>
          </Card>
          {a.statusNote && (
            <Card title={a.status === "CANCELLED" ? "Reason for cancelling" : "Note"}>
              <p className="text-sm italic leading-relaxed text-ink">“{a.statusNote}”</p>
              <p className="mt-2 text-xs text-ink-subtle">{when(a.statusChangedAt)}</p>
            </Card>
          )}
        </div>
      </div>

      <Modal
        open={!!copy}
        onClose={close}
        title={copy?.title ?? ""}
        subtitle={copy?.subtitle}
        width={dialog === "ADD_FINDING" ? "max-w-2xl" : "max-w-lg"}
        footer={
          copy && (
            <>
              <button className="btn-ghost" onClick={close}>
                Back
              </button>
              <button className={copy.danger ? "btn-danger" : "btn-primary"} disabled={act.isPending || !auditOk} onClick={() => act.mutate(dialog!)}>
                {act.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <copy.icon className="h-4 w-4" />} {copy.label}
              </button>
            </>
          )
        }
      >
        {dialog === "ADD_FINDING" && (
          <>
            <Field label="Finding">{(fid) => <input id={fid} className="input" maxLength={AUDIT_LIMITS.findingTitleMax} value={fTitle} onChange={(e) => setFTitle(e.target.value)} placeholder="e.g. No secondary containment for solvent drums" />}</Field>
            <div>
              <p className="label">Severity</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="Severity">
                {FINDING_SEVERITY_ORDER.map((s) => (
                  <button
                    key={s}
                    type="button"
                    role="radio"
                    aria-checked={fSeverity === s}
                    onClick={() => {
                      setFSeverity(s);
                      if (s !== FindingSeverity.OBSERVATION) setFDue(addDays(today, FINDING_DUE_DAYS[s as keyof typeof FINDING_DUE_DAYS]));
                    }}
                    className={cx("h-10 rounded-xl border text-sm font-semibold", fSeverity === s ? (s === "CRITICAL" ? "border-danger bg-danger text-white" : "border-navy bg-navy text-white") : "border-line text-ink-muted hover:border-line-strong")}
                  >
                    {FINDING_SEVERITY_LABEL[s]}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-xs text-ink-subtle">{observation ? "An observation is noted; no corrective action is owed." : `Due by default in ${FINDING_DUE_DAYS[fSeverity as keyof typeof FINDING_DUE_DAYS]} days.`}</p>
            </div>
            <Field label="Detail (optional)">{(fid) => <textarea id={fid} className="input min-h-[64px] py-2.5" maxLength={AUDIT_LIMITS.findingDetailMax} value={fDetail} onChange={(e) => setFDetail(e.target.value)} placeholder="What the auditors saw" />}</Field>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Standard or clause (optional)">{(fid) => <input id={fid} className="input" maxLength={AUDIT_LIMITS.clauseMax} value={fClause} onChange={(e) => setFClause(e.target.value)} placeholder="e.g. ISO 45001 8.1.4" />}</Field>
              <Field label="Where (optional)">{(fid) => <input id={fid} className="input" maxLength={AUDIT_LIMITS.clauseMax} value={fArea} onChange={(e) => setFArea(e.target.value)} placeholder="e.g. Boiler room" />}</Field>
            </div>
            <Field label="Recommendation (optional)">{(fid) => <input id={fid} className="input" maxLength={AUDIT_LIMITS.findingDetailMax} value={fRecommendation} onChange={(e) => setFRecommendation(e.target.value)} placeholder="What the auditors recommend" />}</Field>
            {!observation && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_170px]">
                <PersonPicker label="Owner of the corrective action" value={fOwner} onChange={setFOwner} needsAccount allowMe icon={UserCog} emptyText="Choose who fixes it" />
                <Field label="Due">{(fid) => <input id={fid} type="date" className="input" min={today} value={fDue || defaultDue} onChange={(e) => setFDue(e.target.value)} />}</Field>
              </div>
            )}
          </>
        )}
        {dialog === "COMPLETE_FIELDWORK" && (
          <>
            <div>
              <p className="label">Overall result</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Overall result">
                {Object.values(AuditRating).map((r) => (
                  <button key={r} type="button" role="radio" aria-checked={rating === r} onClick={() => setRating(r)} className={cx("h-10 rounded-xl border text-sm font-semibold", rating === r ? "border-navy bg-navy text-white" : "border-line text-ink-muted hover:border-line-strong")}>
                    {AUDIT_RATING_LABEL[r]}
                  </button>
                ))}
              </div>
            </div>
            <Field label="Score out of 100 (optional)">{(fid) => <input id={fid} className="input tabular w-[140px]" inputMode="numeric" value={score} onChange={(e) => setScore(e.target.value.replace(/[^\d]/g, ""))} />}</Field>
          </>
        )}
        {copy && dialog !== "START" && dialog !== "ADD_FINDING" && dialog !== "CLOSE" && (
          <Field label={dialog === "COMPLETE_FIELDWORK" ? "Conclusion" : dialog === "CANCEL" ? "Reason" : "Note"}>
            {(fid) => (
              <textarea
                id={fid}
                className="input min-h-[88px] py-2.5"
                maxLength={AUDIT_LIMITS.findingDetailMax}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={dialog === "COMPLETE_FIELDWORK" ? "e.g. Working-hours records and the chemical store need attention before the follow-up visit." : dialog === "CANCEL" ? "e.g. Merged into the year-end external audit." : "e.g. Buyer's follow-up visit set for 14 December."}
              />
            )}
          </Field>
        )}
        <ErrorNote error={act.error} />
      </Modal>

      <Modal
        open={!!fCopy}
        onClose={close}
        title={fCopy?.title ?? ""}
        subtitle={fCopy?.subtitle}
        footer={
          fCopy && (
            <>
              <button className="btn-ghost" onClick={close}>
                Back
              </button>
              <button className="btn-primary" disabled={fAct.isPending || !fOk} onClick={() => fAct.mutate(fDialog!)}>
                {fAct.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <fCopy.icon className="h-4 w-4" />} {fCopy.label}
              </button>
            </>
          )
        }
      >
        {fDialog && (
          <p className="rounded-xl bg-surface px-3 py-2.5 text-sm text-ink">
            <span className="mono text-xs text-navy-500">{fDialog.f.number}</span> {fDialog.f.title}
          </p>
        )}
        {fDialog?.d === "REASSIGN" ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_170px]">
            <PersonPicker label="New owner" value={newOwner} onChange={setNewOwner} needsAccount allowMe icon={UserCog} emptyText={fDialog.f.owner ? `Now: ${fDialog.f.owner.name}` : "Choose who fixes it"} />
            <Field label="Due">{(fid) => <input id={fid} type="date" className="input" min={today} value={newDue || fDialog.f.dueDate || ""} onChange={(e) => setNewDue(e.target.value)} />}</Field>
          </div>
        ) : (
          fCopy && (
            <Field label={fCopy.field}>
              {(fid) => <textarea id={fid} className="input min-h-[96px] py-2.5" placeholder={fCopy.placeholder} value={text} onChange={(e) => setText(e.target.value)} maxLength={AUDIT_LIMITS.findingDetailMax} />}
            </Field>
          )
        )}
        <ErrorNote error={fAct.error} />
      </Modal>
    </div>
  );
}
