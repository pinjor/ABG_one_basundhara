import { useCallback, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Ban, CheckCircle2, Hourglass, Info, Loader2, MessageSquare, Send, UserCheck, UserRound, Users, XCircle, type LucideIcon } from "lucide-react";
import { HALF_DAY_LABEL, LEAVE_LIMITS, LEAVE_TYPE_LABEL, formatLeaveDays, type HalfDaySession, type LeaveType } from "@abg-dispatch/shared";
import { api, newKey } from "../../lib/api";
import { stamp, when } from "../../lib/format";
import { toast } from "../../components/toast";
import { Card, ErrorNote, Field, KeyValue, Modal, Spinner, cx } from "../../components/ui";
import { HistoryList, ProgressSteps, TONE_BAR, type HistoryEntry } from "../../components/StatusChip";
import { BalanceCard, LeaveStatusBadge, LeaveTypeTag, OnLeaveTag, calendarDay, leaveDates, leaveTone } from "./parts";
import type { Leave, LeaveUpdate } from "./types";

type Dialog = "APPROVE" | "REJECT" | "CANCEL" | "ADD_NOTE";

const STAGE_TITLES = { SUBMITTED: "Applied", PENDING_HOD: "Head of department", PENDING_HR: "HR approval", APPROVED: "Approved", CANCELLED: "Cancelled" };
const STAGE_ICONS: Record<string, LucideIcon> = { SUBMITTED: Send, PENDING_HOD: UserCheck, PENDING_HR: Hourglass, APPROVED: CheckCircle2 };

function copyFor(d: Dialog, l: Leave): { title: string; subtitle: string; label: string; icon: LucideIcon; field: string; placeholder: string; required?: boolean; danger?: boolean } {
  switch (d) {
    case "APPROVE":
      return l.awaiting === "HOD"
        ? { title: "Approve as head of department", subtitle: "It goes to HR for the final approval. The applicant is told.", label: "Approve", icon: UserCheck, field: "Note for the applicant (optional)", placeholder: "e.g. Approved — hand over the court files to Rubina." }
        : { title: "Give the HR approval", subtitle: "The leave is approved and the days come off the balance. The applicant and their head of department are told.", label: "Approve leave", icon: CheckCircle2, field: "Note (optional)", placeholder: "e.g. Approved as per policy." };
    case "REJECT":
      return { title: "Do not approve", subtitle: "A reason is required — the applicant sees it.", label: "Reject", icon: XCircle, field: "Reason for the applicant", placeholder: "e.g. Quarter-end close that week — please choose the following week.", required: true, danger: true };
    case "CANCEL":
      return l.viewer.isApplicant
        ? { title: "Cancel this leave", subtitle: "A reason is required. Whoever is handling it is told, and the days go back to your balance.", label: "Cancel leave", icon: Ban, field: "Reason", placeholder: "e.g. The wedding moved to December.", required: true, danger: true }
        : { title: "Cancel approved leave", subtitle: "HR can cancel approved leave — the days go back to the balance. The applicant and their head of department are told; it is recorded in the audit log.", label: "Cancel leave", icon: Ban, field: "Reason", placeholder: "e.g. Recalled for the year-end audit.", required: true, danger: true };
    case "ADD_NOTE":
      return { title: "Add a note", subtitle: "Kept in the history; the other side is told.", label: "Add note", icon: MessageSquare, field: "Note", placeholder: "e.g. Medical certificate given to HR.", required: true };
  }
}

function describe(u: LeaveUpdate): HistoryEntry {
  const base = { id: u.id, at: u.createdAt, note: u.note };
  if (u.type === "SUBMITTED") return { ...base, icon: Send, tone: "bg-active-soft text-active", text: `${u.actor} applied` };
  if (u.type === "NOTE_ADDED") return { ...base, icon: MessageSquare, tone: "bg-platinum-bright text-navy-500", text: `${u.actor} added a note` };
  switch (u.toStatus) {
    case "PENDING_HR":
      return { ...base, icon: UserCheck, tone: "bg-success-soft text-success", text: `${u.actor} approved as head of department` };
    case "APPROVED":
      return { ...base, icon: CheckCircle2, tone: "bg-success-soft text-success", text: `${u.actor} gave the HR approval` };
    case "REJECTED":
      return { ...base, icon: XCircle, tone: "bg-danger-soft text-danger", text: `${u.actor} did not approve it` };
    case "CANCELLED":
      return { ...base, icon: Ban, tone: "bg-neutral-soft text-neutral", text: `${u.actor} cancelled it` };
    default:
      return { ...base, icon: Info, tone: "bg-platinum-bright text-navy-500", text: u.actor };
  }
}

export function LeaveDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [text, setText] = useState("");
  const [idemKey, setIdemKey] = useState(newKey);
  const leave = useQuery({ queryKey: ["leave", "one", id], queryFn: () => api.get<Leave>(`/leave/${id}`) });

  const act = useMutation({
    mutationFn: (d: Dialog) => {
      const note = text.trim() || undefined;
      switch (d) {
        case "APPROVE":
          return api.post<Leave>(`/leave/${id}/decision`, { decision: "APPROVE", note }, idemKey);
        case "REJECT":
          return api.post<Leave>(`/leave/${id}/decision`, { decision: "REJECT", note }, idemKey);
        case "CANCEL":
          return api.post<Leave>(`/leave/${id}/cancel`, { note }, idemKey);
        case "ADD_NOTE":
          return api.post<Leave>(`/leave/${id}/notes`, { note }, idemKey);
      }
    },
    onSuccess: (next, d) => {
      qc.setQueryData(["leave", "one", id], next);
      void qc.invalidateQueries({ queryKey: ["leave"] });
      const done: Record<Dialog, string> = {
        APPROVE: next.status === "APPROVED" ? "Leave approved — the applicant has been told." : "Approved — now with HR.",
        REJECT: "Not approved — the applicant has been told why.",
        CANCEL: "Leave cancelled; the days are back on the balance.",
        ADD_NOTE: "Note added.",
      };
      toast.success(done[d]);
      closeRef.current();
    },
  });
  const closeRef = useRef<() => void>(() => undefined);
  closeRef.current = () => {
    setDialog(null);
    setText("");
    setIdemKey(newKey());
    act.reset();
  };
  const close = useCallback(() => closeRef.current(), []);

  if (leave.isLoading) return <Spinner label="Loading the leave application" />;
  if (leave.error || !leave.data) return <ErrorNote error={leave.error ?? new Error("Leave application not found.")} />;
  const l = leave.data;
  const actions = new Set(l.viewer.actions);
  const copy = dialog ? copyFor(dialog, l) : null;
  const textOk = !copy?.required || text.trim().length >= (dialog === "ADD_NOTE" ? 2 : LEAVE_LIMITS.reasonMin);
  const label = LEAVE_TYPE_LABEL[l.type as LeaveType] ?? l.type;

  return (
    <div className="space-y-6">
      <Link to="/leave" className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-muted hover:text-navy">
        <ArrowLeft className="h-4 w-4" /> Leave
      </Link>

      <section className="card overflow-hidden">
        <div className={cx("h-1", TONE_BAR[leaveTone(l.status)])} />
        <div className="flex flex-wrap items-start justify-between gap-4 px-5 pb-5 pt-5 sm:px-6">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="mono text-sm text-navy-500">{l.referenceNumber}</span>
              <LeaveStatusBadge status={l.status} />
              <LeaveTypeTag type={l.type} />
              {l.onLeaveNow && <OnLeaveTag />}
            </div>
            <h1 className="mt-2 break-words font-display text-[24px] font-extrabold leading-tight tracking-tight text-navy sm:text-[26px]">
              {label} · {formatLeaveDays(l.days)}
            </h1>
            <p className="mt-1 text-sm text-ink-muted">
              {l.applicant.name} · {leaveDates(l.startDate, l.endDate)}
              {l.halfDay ? ` · ${HALF_DAY_LABEL[l.halfDay as HalfDaySession]}` : ""}
            </p>
          </div>
          {l.viewer.actions.length > 0 && (
            <div className="flex w-full flex-wrap gap-2 sm:w-auto">
              {actions.has("ADD_NOTE") && (
                <button className="btn-ghost" onClick={() => setDialog("ADD_NOTE")}>
                  <MessageSquare className="h-4 w-4" /> Add note
                </button>
              )}
              {actions.has("CANCEL") && (
                <button className="btn-secondary" onClick={() => setDialog("CANCEL")}>
                  <Ban className="h-4 w-4" /> Cancel leave
                </button>
              )}
              {actions.has("REJECT") && (
                <button className="btn-secondary text-danger" onClick={() => setDialog("REJECT")}>
                  <XCircle className="h-4 w-4" /> Reject
                </button>
              )}
              {actions.has("APPROVE") && (
                <button className="btn-primary" onClick={() => setDialog("APPROVE")}>
                  <CheckCircle2 className="h-4 w-4" /> {l.awaiting === "HOD" ? "Approve" : "Approve leave"}
                </button>
              )}
            </div>
          )}
        </div>
        <div className="border-t border-line bg-surface/50 px-5 py-5 sm:px-6">
          <ProgressSteps stages={l.pipeline} titles={STAGE_TITLES} icons={STAGE_ICONS} />
        </div>
      </section>

      {l.viewer.blockedReason === "SEPARATION_OF_DUTIES" && (
        <div className="flex items-start gap-3 rounded-2xl border border-active/20 bg-active-soft px-5 py-4 text-sm text-navy">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-active" aria-hidden />
          <p>You approved this leave as head of department, so another HR member gives the HR approval.</p>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-6">
          <Card title="Application">
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <KeyValue label="Type">{label}</KeyValue>
              <KeyValue label="Days">{formatLeaveDays(l.days)}</KeyValue>
              <KeyValue label="First day">{calendarDay(l.startDate, true)}</KeyValue>
              <KeyValue label="Last day">{calendarDay(l.endDate, true)}</KeyValue>
              {l.halfDay && <KeyValue label="Half day">{HALF_DAY_LABEL[l.halfDay as HalfDaySession]}</KeyValue>}
              <KeyValue label="Office">
                {l.branch.name} <span className="mono text-xs text-ink-muted">{l.branch.code}</span>
              </KeyValue>
              {l.addressDuringLeave && <KeyValue label="Address during leave">{l.addressDuringLeave}</KeyValue>}
              {l.contactPhone && (
                <KeyValue label="Phone while away">
                  <a href={`tel:${l.contactPhone}`} className="text-active hover:underline">
                    {l.contactPhone}
                  </a>
                </KeyValue>
              )}
              <KeyValue label="Applied">{stamp(l.createdAt)}</KeyValue>
            </dl>
            {l.reason && <p className="mt-5 whitespace-pre-line border-t border-line pt-4 text-[15px] leading-relaxed text-ink">{l.reason}</p>}
          </Card>

          {l.updates.length > 0 && (
            <Card title="History" action={<span className="text-xs text-ink-subtle">Append-only · Asia/Dhaka</span>}>
              <HistoryList entries={l.updates.map(describe)} />
            </Card>
          )}
        </div>

        <div className="space-y-6">
          {l.balance && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">{l.applicant.name.split(" ")[0]}'s balance · {l.year}</p>
              <BalanceCard b={l.balance} />
            </div>
          )}
          <Card title="People">
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-platinum-bright text-navy-500">
                  <UserRound className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink">
                    {l.applicant.name} {l.applicant.employeeCode && <span className="mono text-xs font-medium text-ink-muted">{l.applicant.employeeCode}</span>}
                  </p>
                  <p className="text-xs text-ink-muted">{[l.applicant.designation, l.applicant.department].filter(Boolean).join(" · ") || "Applicant"}</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-platinum-bright text-navy-500">
                  <UserCheck className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink">{l.approver.name}</p>
                  <p className="text-xs text-ink-muted">Head of department{l.approver.designation ? ` · ${l.approver.designation}` : ""}</p>
                  <p className="mt-0.5 text-xs text-ink-subtle">{l.hodApprovedAt ? `Approved ${when(l.hodApprovedAt)}` : l.status === "PENDING_HOD" ? "Decision pending" : "Did not approve"}</p>
                </div>
              </li>
              {l.reliever && (
                <li className="flex items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-platinum-bright text-navy-500">
                    <Users className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink">{l.reliever.name}</p>
                    <p className="text-xs text-ink-muted">Covers the work{l.reliever.designation ? ` · ${l.reliever.designation}` : ""}</p>
                  </div>
                </li>
              )}
            </ul>
          </Card>
          {l.statusNote && (
            <Card title={l.status === "REJECTED" ? "Reason given" : l.status === "CANCELLED" ? "Reason for cancelling" : "Latest note"}>
              <p className="text-sm italic leading-relaxed text-ink">“{l.statusNote}”</p>
              <p className="mt-2 text-xs text-ink-subtle">{when(l.statusChangedAt)}</p>
            </Card>
          )}
        </div>
      </div>

      <Modal
        open={!!copy}
        onClose={close}
        title={copy?.title ?? ""}
        subtitle={copy?.subtitle}
        footer={
          copy && (
            <>
              <button className="btn-ghost" onClick={close}>
                Back
              </button>
              <button className={copy.danger ? "btn-danger" : "btn-primary"} disabled={act.isPending || !textOk} onClick={() => act.mutate(dialog!)}>
                {act.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <copy.icon className="h-4 w-4" />} {copy.label}
              </button>
            </>
          )
        }
      >
        {dialog === "APPROVE" && l.balance && l.balance.available !== null && (
          <p className="rounded-xl bg-surface px-3 py-2.5 text-sm text-ink">
            {l.applicant.name} has {formatLeaveDays(l.balance.available)} of {label.toLowerCase()} left after the pending applications ({l.balance.used} used of {l.balance.entitled}).
          </p>
        )}
        {copy && (
          <Field label={copy.field}>
            {(fid) => <textarea id={fid} className="input min-h-[96px] py-2.5" placeholder={copy.placeholder} value={text} onChange={(e) => setText(e.target.value)} maxLength={LEAVE_LIMITS.noteMax} />}
          </Field>
        )}
        <ErrorNote error={act.error} />
      </Modal>
    </div>
  );
}
