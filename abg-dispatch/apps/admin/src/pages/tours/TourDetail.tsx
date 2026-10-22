import { useCallback, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Ban,
  CheckCircle2,
  Flag,
  Info,
  Loader2,
  MessageSquare,
  PlaneTakeoff,
  Send,
  Stamp,
  TriangleAlert,
  UserCheck,
  UserRound,
  Users,
  Wallet,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { TOUR_LIMITS, TOUR_PURPOSE_LABEL, TRANSPORT_MODE_LABEL, TourPurpose, TransportMode, formatTaka } from "@abg-dispatch/shared";
import { api, newKey } from "../../lib/api";
import { stamp, when } from "../../lib/format";
import { toast } from "../../components/toast";
import { Card, ErrorNote, Field, KeyValue, Modal, Spinner, cx } from "../../components/ui";
import { PassportTag, PipelineStepper, TONE_BAR, TRANSPORT_ICON, TourStatusBadge, TourTypeTag, calendarDay, place, tourTone, travelDates } from "./parts";
import type { Tour, TourUpdate } from "./types";

type Dialog = "APPROVE" | "REJECT" | "START" | "COMPLETE" | "CANCEL" | "ADD_NOTE";

interface DialogCopy {
  title: string;
  subtitle: string;
  label: string;
  icon: LucideIcon;
  field: string;
  placeholder: string;
  required?: boolean;
  danger?: boolean;
  budget?: boolean;
}

function copyFor(d: Dialog, t: Tour): DialogCopy {
  switch (d) {
    case "APPROVE":
      if (t.awaiting === "HOD")
        return { title: "Approve as head of department", subtitle: "It goes to HR & Finance for budget vetting next. The traveller is told.", label: "Approve", icon: UserCheck, field: "Note for the traveller (optional)", placeholder: "e.g. Approved — share the agenda with the team." };
      if (t.awaiting === "VETTING")
        return t.type === "FOREIGN"
          ? { title: "Vet budget & forward for sanction", subtitle: "Confirm the amount to be sanctioned. The MD / Chairman are asked to sanction it next.", label: "Vet & forward", icon: Wallet, field: "Note (optional)", placeholder: "e.g. Economy fares; hotel at the group rate.", budget: true }
          : { title: "Approve & sanction funds", subtitle: "HR & Finance approval completes a local tour. The traveller is told the sanctioned amount.", label: "Approve & sanction", icon: Wallet, field: "Note (optional)", placeholder: "e.g. Plant guest house available — hotel not needed.", budget: true };
      return { title: "Sanction overseas tour", subtitle: "Your sanction approves the tour and releases the funds; HR & Finance are told to release the advance.", label: "Sanction tour", icon: Stamp, field: "Note (optional)", placeholder: "e.g. Sanctioned. Share the minutes on return.", budget: true };
    case "REJECT":
      return { title: "Reject this request", subtitle: "A reason is required — the traveller sees it.", label: "Reject", icon: XCircle, field: "Reason for the traveller", placeholder: "e.g. Not in this year's training plan; the course also runs in Dhaka in January.", required: true, danger: true };
    case "START":
      return { title: "Start the tour", subtitle: "Marks the tour active. Your head of department is told you are on your way.", label: "Start tour", icon: PlaneTakeoff, field: "Note (optional)", placeholder: "e.g. Departing on the 9:40 flight." };
    case "COMPLETE":
      return { title: "Mark the tour completed", subtitle: t.advanceRequested ? "HR & Finance are asked to settle the advance." : "Closes the tour.", label: "Mark completed", icon: Flag, field: "Outcome (optional)", placeholder: "e.g. Back in Dhaka; report shared with Procurement." };
    case "CANCEL":
      return { title: "Cancel this request", subtitle: "A reason is required. Whoever is handling it is told.", label: "Cancel request", icon: Ban, field: "Reason", placeholder: "e.g. The supplier postponed the audit to January.", required: true, danger: true };
    case "ADD_NOTE":
      return { title: "Add a note", subtitle: "Kept in the history; the traveller (or, from the traveller, whoever is handling it) is told.", label: "Add note", icon: MessageSquare, field: "Note", placeholder: "e.g. Flight options sent by email.", required: true };
  }
}

function describe(u: TourUpdate): { icon: LucideIcon; tone: string; text: string } {
  const meta = u.metadata as Record<string, unknown>;
  switch (u.type) {
    case "SUBMITTED":
      return { icon: Send, tone: "bg-active-soft text-active", text: `${u.actor} applied${meta.approver ? ` — sent to ${meta.approver}` : ""}` };
    case "BUDGET_CHANGED":
      return {
        icon: Wallet,
        tone: "bg-success-soft text-success",
        text: `${u.actor} set the sanctioned budget to ${formatTaka(meta.after as number)}${typeof meta.before === "number" ? ` (was ${formatTaka(meta.before)})` : typeof meta.estimated === "number" ? ` (estimated ${formatTaka(meta.estimated)})` : ""}`,
      };
    case "NOTE_ADDED":
      return { icon: MessageSquare, tone: "bg-platinum-bright text-navy-500", text: `${u.actor} added a note` };
    default:
      switch (u.toStatus) {
        case "PENDING_VETTING":
          return { icon: UserCheck, tone: "bg-success-soft text-success", text: `${u.actor} approved as head of department` };
        case "PENDING_SANCTION":
          return { icon: Wallet, tone: "bg-success-soft text-success", text: `${u.actor} vetted the budget for HR & Finance` };
        case "APPROVED":
          return u.fromStatus === "PENDING_SANCTION"
            ? { icon: Stamp, tone: "bg-success-soft text-success", text: `${u.actor} sanctioned the tour` }
            : { icon: CheckCircle2, tone: "bg-success-soft text-success", text: `${u.actor} approved and sanctioned the funds` };
        case "REJECTED":
          return { icon: XCircle, tone: "bg-danger-soft text-danger", text: `${u.actor} rejected the request` };
        case "ACTIVE":
          return { icon: PlaneTakeoff, tone: "bg-active-soft text-active", text: `${u.actor} started the tour` };
        case "COMPLETED":
          return { icon: Flag, tone: "bg-neutral-soft text-neutral", text: `${u.actor} marked it completed` };
        case "CANCELLED":
          return { icon: Ban, tone: "bg-neutral-soft text-neutral", text: `${u.actor} cancelled the request` };
        default:
          return { icon: Info, tone: "bg-platinum-bright text-navy-500", text: u.actor };
      }
  }
}

export function TourDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [text, setText] = useState("");
  const [budget, setBudget] = useState("");
  const [idemKey, setIdemKey] = useState(newKey);

  const tour = useQuery({ queryKey: ["tour", id], queryFn: () => api.get<Tour>(`/tours/${id}`) });

  const act = useMutation({
    mutationFn: (d: Dialog) => {
      const note = text.trim() || undefined;
      switch (d) {
        case "APPROVE": {
          const amount = budget.replace(/[^\d]/g, "");
          return api.post<Tour>(`/tours/${id}/decision`, { decision: "APPROVE", note, sanctionedBudget: copyFor(d, tour.data!).budget && amount ? Number(amount) : undefined }, idemKey);
        }
        case "REJECT":
          return api.post<Tour>(`/tours/${id}/decision`, { decision: "REJECT", note }, idemKey);
        case "START":
          return api.post<Tour>(`/tours/${id}/start`, { note }, idemKey);
        case "COMPLETE":
          return api.post<Tour>(`/tours/${id}/complete`, { note }, idemKey);
        case "CANCEL":
          return api.post<Tour>(`/tours/${id}/cancel`, { note }, idemKey);
        case "ADD_NOTE":
          return api.post<Tour>(`/tours/${id}/notes`, { note }, idemKey);
      }
    },
    onSuccess: (next, d) => {
      qc.setQueryData(["tour", id], next);
      void qc.invalidateQueries({ queryKey: ["tours"] });
      const done: Record<Dialog, string> = {
        APPROVE: next.status === "APPROVED" ? "Approved — funds sanctioned and the traveller told." : `Approved — now with ${next.awaiting === "VETTING" ? "HR & Finance" : "the MD / Chairman"}.`,
        REJECT: "Rejected — the traveller has been told why.",
        START: "Tour started. Safe travels.",
        COMPLETE: "Tour marked completed.",
        CANCEL: "Request cancelled.",
        ADD_NOTE: "Note added.",
      };
      toast.success(done[d]);
      closeRef.current();
    },
  });

  // Stable close handler: the modal refocuses its first field when onClose changes.
  const closeRef = useRef<() => void>(() => undefined);
  closeRef.current = () => {
    setDialog(null);
    setText("");
    setBudget("");
    setIdemKey(newKey());
    act.reset();
  };
  const close = useCallback(() => closeRef.current(), []);

  if (tour.isLoading) return <Spinner label="Loading tour request" />;
  if (tour.error || !tour.data) return <ErrorNote error={tour.error ?? new Error("Tour request not found.")} />;
  const t = tour.data;
  const actions = new Set(t.viewer.actions);
  const tone = tourTone(t.status);
  const TransportIcon = TRANSPORT_ICON[t.transportMode] ?? PlaneTakeoff;
  const copy = dialog ? copyFor(dialog, t) : null;
  const open = (d: Dialog) => {
    setDialog(d);
    if (d === "APPROVE" && t.awaiting !== "HOD") setBudget(String(t.sanctionedBudget ?? t.estimatedBudget));
  };
  const approveCopy = actions.has("APPROVE") ? copyFor("APPROVE", t) : null;
  const sanctionedDiff = t.sanctionedBudget !== null ? t.sanctionedBudget - t.estimatedBudget : null;
  const budgetValue = Number(budget.replace(/[^\d]/g, "")) || 0;
  const textOk = !copy?.required || text.trim().length >= (dialog === "ADD_NOTE" ? 2 : TOUR_LIMITS.reasonMin);

  return (
    <div className="space-y-6">
      <Link to="/tours" className="no-print inline-flex items-center gap-1.5 text-sm font-semibold text-ink-muted hover:text-navy">
        <ArrowLeft className="h-4 w-4" /> Official Tour Requests
      </Link>

      <section className="card overflow-hidden">
        <div className={cx("h-1", TONE_BAR[tone])} />
        <div className="flex flex-wrap items-start justify-between gap-4 px-5 pb-5 pt-5 sm:px-6">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="mono text-sm text-navy-500">{t.referenceNumber}</span>
              <TourStatusBadge status={t.status} />
              <TourTypeTag type={t.type} />
              {t.passportAlert && <PassportTag />}
            </div>
            <h1 className="mt-2 break-words font-display text-[24px] font-extrabold leading-tight tracking-tight text-navy sm:text-[26px]">{t.title}</h1>
            <p className="mt-1 text-sm text-ink-muted">
              {t.traveller.name} · {place(t.destination, t.country)} · {travelDates(t.startDate, t.endDate)} · {t.durationDays} day{t.durationDays === 1 ? "" : "s"}
            </p>
          </div>
          {t.viewer.actions.length > 0 && (
            <div className="no-print flex w-full flex-wrap gap-2 sm:w-auto">
              {actions.has("ADD_NOTE") && (
                <button className="btn-ghost" onClick={() => open("ADD_NOTE")}>
                  <MessageSquare className="h-4 w-4" /> Add note
                </button>
              )}
              {actions.has("CANCEL") && (
                <button className="btn-secondary" onClick={() => open("CANCEL")}>
                  <Ban className="h-4 w-4" /> Cancel request
                </button>
              )}
              {actions.has("REJECT") && (
                <button className="btn-secondary text-danger" onClick={() => open("REJECT")}>
                  <XCircle className="h-4 w-4" /> Reject
                </button>
              )}
              {approveCopy && (
                <button className="btn-primary" onClick={() => open("APPROVE")}>
                  <approveCopy.icon className="h-4 w-4" /> {approveCopy.label}
                </button>
              )}
              {actions.has("START") && (
                <button className="btn-primary" onClick={() => open("START")}>
                  <PlaneTakeoff className="h-4 w-4" /> Start tour
                </button>
              )}
              {actions.has("COMPLETE") && (
                <button className="btn-primary" onClick={() => open("COMPLETE")}>
                  <Flag className="h-4 w-4" /> Mark completed
                </button>
              )}
            </div>
          )}
        </div>
        <div className="border-t border-line bg-surface/50 px-5 py-5 sm:px-6">
          <PipelineStepper stages={t.pipeline} />
        </div>
      </section>

      {t.passportAlert && (
        <div className="flex items-start gap-3 rounded-2xl border border-danger/20 bg-danger-soft px-5 py-4 text-sm text-danger" role="alert">
          <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
          <div>
            <p className="font-semibold">Passport expires within {TOUR_LIMITS.passportValidityMonths} months of the return date</p>
            <p className="mt-0.5 text-danger/90">
              Valid until {calendarDay(t.passportExpiry)}; the tour ends {calendarDay(t.endDate)}. Most countries refuse entry or a visa on less than six months' validity — renew before booking.
            </p>
          </div>
        </div>
      )}
      {t.viewer.blockedReason === "SEPARATION_OF_DUTIES" && (
        <div className="flex items-start gap-3 rounded-2xl border border-active/20 bg-active-soft px-5 py-4 text-sm text-navy">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-active" aria-hidden />
          <p>You approved this request as head of department, so another HR & Finance member must vet it.</p>
        </div>
      )}
      {t.status === "APPROVED" && t.viewer.isTraveller && !actions.has("START") && t.viewer.startableFrom && (
        <div className="flex items-start gap-3 rounded-2xl border border-success/20 bg-success-soft px-5 py-4 text-sm text-success">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
          <p>Approved and funds sanctioned. You can mark the tour started from {calendarDay(t.viewer.startableFrom)}.</p>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-6">
          <Card title="Trip details">
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <KeyValue label="Purpose">{TOUR_PURPOSE_LABEL[t.purpose as TourPurpose] ?? t.purpose}</KeyValue>
              <KeyValue label="Destination">{place(t.destination, t.country)}</KeyValue>
              <KeyValue label="Departure">{calendarDay(t.startDate, true)}</KeyValue>
              <KeyValue label="Return">{calendarDay(t.endDate, true)}</KeyValue>
              <KeyValue label="Duration">
                {t.durationDays} day{t.durationDays === 1 ? "" : "s"}
              </KeyValue>
              <KeyValue label="Transport">
                <span className="inline-flex items-center gap-1.5">
                  <TransportIcon className="h-4 w-4 text-ink-subtle" aria-hidden />
                  {TRANSPORT_MODE_LABEL[t.transportMode as TransportMode] ?? t.transportMode}
                </span>
              </KeyValue>
              <KeyValue label="Office">
                {t.branch.name} <span className="mono text-xs text-ink-muted">{t.branch.code}</span>
              </KeyValue>
              <KeyValue label="Applied">{stamp(t.createdAt)}</KeyValue>
            </dl>
            {t.description && <p className="mt-5 whitespace-pre-line border-t border-line pt-4 text-[15px] leading-relaxed text-ink">{t.description}</p>}
          </Card>

          <Card title="Co-travellers" action={<span className="text-xs text-ink-subtle">{t.coTravellers.length || "None"}</span>}>
            {t.coTravellers.length ? (
              <ul className="flex flex-wrap gap-2">
                {t.coTravellers.map((c) => (
                  <li key={c} className="inline-flex items-center gap-2 rounded-full bg-platinum-bright px-3 py-1.5 text-sm font-medium text-navy">
                    <Users className="h-3.5 w-3.5 text-navy-500" aria-hidden /> {c}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-muted">{t.traveller.name} is travelling alone.</p>
            )}
          </Card>

          <Card title="History" action={<span className="text-xs text-ink-subtle">Append-only · Asia/Dhaka</span>}>
            <ol>
              {t.updates.map((u, idx) => {
                const d = describe(u);
                return (
                  <li key={u.id} className="relative flex gap-3 pb-5 last:pb-0">
                    {idx < t.updates.length - 1 && <span className="absolute left-[15px] top-8 h-[calc(100%-24px)] w-px bg-line" aria-hidden />}
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
          <Card title="Budget">
            <dl className="space-y-3">
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-sm text-ink-muted">Estimated</dt>
                <dd className="tabular text-sm font-semibold text-ink">{formatTaka(t.estimatedBudget)}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-sm text-ink-muted">Advance requested</dt>
                <dd className="tabular text-sm font-semibold text-ink">{t.advanceRequested ? formatTaka(t.advanceRequested) : "None"}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3 border-t border-line pt-3">
                <dt className="text-sm font-semibold text-navy">Sanctioned</dt>
                <dd className={cx("tabular font-display text-lg font-extrabold", t.sanctionedBudget !== null ? "text-success" : "text-ink-subtle")}>{t.sanctionedBudget !== null ? formatTaka(t.sanctionedBudget) : "Not yet"}</dd>
              </div>
              {sanctionedDiff !== null && sanctionedDiff !== 0 && (
                <p className="text-right text-xs text-ink-subtle">
                  {sanctionedDiff < 0 ? `${formatTaka(-sanctionedDiff)} below the estimate` : `${formatTaka(sanctionedDiff)} above the estimate`}
                </p>
              )}
            </dl>
          </Card>

          <Card title="Traveller">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-platinum-bright text-navy-500">
                <UserRound className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink">
                  {t.traveller.name} {t.traveller.employeeCode && <span className="mono text-xs font-medium text-ink-muted">{t.traveller.employeeCode}</span>}
                </p>
                <p className="text-xs text-ink-muted">{[t.traveller.designation, t.traveller.department].filter(Boolean).join(" · ") || "—"}</p>
                {t.traveller.phone && (
                  <a href={`tel:${t.traveller.phone}`} className="mt-1 inline-block text-xs font-semibold text-active hover:underline">
                    {t.traveller.phone}
                  </a>
                )}
              </div>
            </div>
          </Card>

          <Card title="Head of department">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-platinum-bright text-navy-500">
                <UserCheck className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink">{t.approver.name}</p>
                <p className="text-xs text-ink-muted">{[t.approver.designation, t.approver.department].filter(Boolean).join(" · ") || "Approver"}</p>
                <p className="mt-1 text-xs text-ink-subtle">{t.hodApprovedAt ? `Approved ${when(t.hodApprovedAt)}` : t.status === "PENDING_HOD" ? "Decision pending" : "Did not approve"}</p>
              </div>
            </div>
          </Card>

          {t.type === "FOREIGN" && (
            <Card title="Passport">
              <dl className="grid grid-cols-2 gap-4">
                <KeyValue label="Number">
                  <span className="mono">{t.passportNumber ?? "—"}</span>
                </KeyValue>
                <KeyValue label="Valid until">
                  <span className={t.passportAlert ? "font-semibold text-danger" : undefined}>{calendarDay(t.passportExpiry)}</span>
                </KeyValue>
              </dl>
            </Card>
          )}

          {t.statusNote && (
            <Card title={t.status === "REJECTED" ? "Reason for rejection" : t.status === "CANCELLED" ? "Reason for cancelling" : "Latest note from approvers"}>
              <p className="text-sm italic leading-relaxed text-ink">“{t.statusNote}”</p>
              <p className="mt-2 text-xs text-ink-subtle">{when(t.statusChangedAt)}</p>
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
              <button className={copy.danger ? "btn-danger" : "btn-primary"} disabled={act.isPending || !textOk || (copy.budget && budgetValue <= 0 && budget.trim() !== "")} onClick={() => act.mutate(dialog!)}>
                {act.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <copy.icon className="h-4 w-4" />} {copy.label}
              </button>
            </>
          )
        }
      >
        {copy?.budget && (
          <Field label="Sanctioned budget (৳)" hint={`Estimated ${formatTaka(t.estimatedBudget)}${budgetValue ? ` · sanctioning ${formatTaka(budgetValue)}` : ""}`}>
            {(fid) => <input id={fid} className="input tabular" inputMode="numeric" value={budget} onChange={(e) => setBudget(e.target.value)} />}
          </Field>
        )}
        {dialog === "APPROVE" && t.passportAlert && (
          <p className="flex items-start gap-2 rounded-xl bg-pending-soft px-3 py-2.5 text-sm text-pending">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" /> The traveller's passport needs renewal before this trip.
          </p>
        )}
        {copy && (
          <Field label={copy.field}>
            {(fid) => <textarea id={fid} className="input min-h-[96px] py-2.5" placeholder={copy.placeholder} value={text} onChange={(e) => setText(e.target.value)} maxLength={TOUR_LIMITS.noteMax} />}
          </Field>
        )}
        <ErrorNote error={act.error} />
      </Modal>
    </div>
  );
}
