import { useCallback, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Ban, CalendarCheck2, CheckCircle2, Crown, Info, Loader2, MessageSquare, Repeat, Send, TriangleAlert, UserCheck, UserRound, Users, XCircle, type LucideIcon } from "lucide-react";
import { APPOINTMENT_LIMITS, MEETING_MODE_LABEL, type MeetingMode } from "@abg-dispatch/shared";
import { api, newKey } from "../../lib/api";
import { stamp, when } from "../../lib/format";
import { toast } from "../../components/toast";
import { Card, ErrorNote, Field, KeyValue, Modal, Spinner, cx } from "../../components/ui";
import { HistoryList, TONE_BAR, type HistoryEntry } from "../../components/StatusChip";
import { AppointmentStatusBadge, ModeTag, UrgentTag, appointmentTone, dhakaHm, dhakaIso, meetingWhen, toInstant } from "./parts";
import type { Appointment, AppointmentUpdate } from "./types";

type Dialog = "CONFIRM" | "PROPOSE" | "DECLINE" | "ACCEPT" | "CANCEL" | "COMPLETE" | "ADD_NOTE";

const COPY: Record<Dialog, { title: string; subtitle: string; label: string; icon: LucideIcon; field: string; placeholder: string; required?: boolean; danger?: boolean }> = {
  CONFIRM: { title: "Confirm the meeting", subtitle: "Choose the time and place. The requester is told at once.", label: "Confirm", icon: CalendarCheck2, field: "Note for the requester (optional)", placeholder: "e.g. Bring both quotations." },
  PROPOSE: { title: "Propose another time", subtitle: "The requester is asked to accept the new time.", label: "Propose time", icon: Repeat, field: "Why another time", placeholder: "e.g. The MD is at the BERC hearing that day.", required: true },
  DECLINE: { title: "Decline the request", subtitle: "A reason is required — the requester sees it.", label: "Decline", icon: XCircle, field: "Reason", placeholder: "e.g. Please take this to HR first.", required: true, danger: true },
  ACCEPT: { title: "Accept the proposed time", subtitle: "The meeting is confirmed at the new time and the host's office is told.", label: "Accept", icon: CheckCircle2, field: "", placeholder: "" },
  CANCEL: { title: "Cancel the meeting", subtitle: "A reason is required. The other side is told.", label: "Cancel meeting", icon: Ban, field: "Reason", placeholder: "e.g. Sorted by email.", required: true, danger: true },
  COMPLETE: { title: "Mark the meeting held", subtitle: "Optionally note what was decided; the requester is sent the note.", label: "Mark held", icon: CheckCircle2, field: "Outcome (optional)", placeholder: "e.g. Approved the renewal; Legal to register it on Thursday." },
  ADD_NOTE: { title: "Add a note", subtitle: "Kept in the history; the other side is told.", label: "Add note", icon: MessageSquare, field: "Note", placeholder: "e.g. Board pack sent by email.", required: true },
};

function describe(u: AppointmentUpdate): HistoryEntry {
  const base = { id: u.id, at: u.createdAt, note: u.note };
  const at = typeof u.metadata?.scheduledAt === "string" ? meetingWhen(u.metadata.scheduledAt as string) : null;
  if (u.type === "SUBMITTED") return { ...base, icon: Send, tone: "bg-active-soft text-active", text: `${u.actor} asked for the meeting` };
  if (u.type === "NOTE_ADDED") return { ...base, icon: MessageSquare, tone: "bg-platinum-bright text-navy-500", text: `${u.actor} added a note` };
  if (u.type === "TIME_PROPOSED") return { ...base, icon: Repeat, tone: "bg-pending-soft text-pending", text: `${u.actor} proposed ${at ?? "another time"}` };
  switch (u.toStatus) {
    case "CONFIRMED":
      return { ...base, icon: CalendarCheck2, tone: "bg-active-soft text-active", text: u.fromStatus === "PROPOSED" ? `${u.actor} accepted the new time` : `${u.actor} confirmed${at ? ` for ${at}` : ""}` };
    case "COMPLETED":
      return { ...base, icon: CheckCircle2, tone: "bg-success-soft text-success", text: `${u.actor} marked it held` };
    case "DECLINED":
      return { ...base, icon: XCircle, tone: "bg-danger-soft text-danger", text: `${u.actor} declined` };
    case "CANCELLED":
      return { ...base, icon: Ban, tone: "bg-neutral-soft text-neutral", text: `${u.actor} cancelled the meeting` };
    default:
      return { ...base, icon: Info, tone: "bg-platinum-bright text-navy-500", text: u.actor };
  }
}

export function AppointmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [text, setText] = useState("");
  const [choice, setChoice] = useState<"PREFERRED" | "ALTERNATIVE" | "OTHER">("PREFERRED");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [idemKey, setIdemKey] = useState(newKey);
  const appt = useQuery({ queryKey: ["appointment", id], queryFn: () => api.get<Appointment>(`/appointments/${id}`) });

  const act = useMutation({
    mutationFn: (d: Dialog) => {
      const a = appt.data!;
      const note = text.trim() || undefined;
      const other = date && time ? toInstant(date, time) : undefined;
      switch (d) {
        case "CONFIRM": {
          const at = choice === "ALTERNATIVE" ? (a.alternativeAt ?? undefined) : choice === "OTHER" ? other : a.preferredAt;
          return api.post<Appointment>(`/appointments/${id}/confirm`, { at, location: location.trim() || undefined, note }, idemKey);
        }
        case "PROPOSE":
          return api.post<Appointment>(`/appointments/${id}/propose`, { at: other, location: location.trim() || undefined, note }, idemKey);
        case "DECLINE":
          return api.post<Appointment>(`/appointments/${id}/decline`, { note }, idemKey);
        case "ACCEPT":
          return api.post<Appointment>(`/appointments/${id}/accept`, {}, idemKey);
        case "CANCEL":
          return api.post<Appointment>(`/appointments/${id}/cancel`, { note }, idemKey);
        case "COMPLETE":
          return api.post<Appointment>(`/appointments/${id}/complete`, { note }, idemKey);
        case "ADD_NOTE":
          return api.post<Appointment>(`/appointments/${id}/notes`, { note }, idemKey);
      }
    },
    onSuccess: (next, d) => {
      qc.setQueryData(["appointment", id], next);
      void qc.invalidateQueries({ queryKey: ["appointments"] });
      const done: Record<Dialog, string> = {
        CONFIRM: `Confirmed for ${meetingWhen(next.scheduledAt)} — the requester has been told.`,
        PROPOSE: "New time proposed — waiting for the requester.",
        DECLINE: "Declined — the requester has been told why.",
        ACCEPT: "Meeting confirmed.",
        CANCEL: "Meeting cancelled.",
        COMPLETE: "Marked held.",
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
    setChoice("PREFERRED");
    setDate("");
    setTime("");
    setLocation("");
    setIdemKey(newKey());
    act.reset();
  };
  const close = useCallback(() => closeRef.current(), []);

  if (appt.isLoading) return <Spinner label="Loading the appointment" />;
  if (appt.error || !appt.data) return <ErrorNote error={appt.error ?? new Error("Appointment not found.")} />;
  const a = appt.data;
  const actions = new Set(a.viewer.actions);
  const copy = dialog ? COPY[dialog] : null;
  const open = (d: Dialog) => {
    setDialog(d);
    setLocation(a.location ?? "");
    const base = a.scheduledAt ?? a.preferredAt;
    setDate(dhakaIso(base));
    setTime(dhakaHm(base));
  };
  const needsTime = dialog === "PROPOSE" || (dialog === "CONFIRM" && choice === "OTHER");
  const textOk = !copy?.required || text.trim().length >= (dialog === "ADD_NOTE" ? 2 : APPOINTMENT_LIMITS.reasonMin);
  const timeOk = !needsTime || (!!date && !!time);
  const hostSide = a.viewer.isHost || a.viewer.isOffice;

  return (
    <div className="space-y-6">
      <Link to="/appointments" className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-muted hover:text-navy">
        <ArrowLeft className="h-4 w-4" /> Request for Appointment
      </Link>

      <section className="card overflow-hidden">
        <div className={cx("h-1", TONE_BAR[appointmentTone(a.status)])} />
        <div className="flex flex-wrap items-start justify-between gap-4 px-5 pb-5 pt-5 sm:px-6">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="mono text-sm text-navy-500">{a.referenceNumber}</span>
              <AppointmentStatusBadge status={a.status} />
              <ModeTag mode={a.mode} />
              {a.urgent && <UrgentTag />}
            </div>
            <h1 className="mt-2 break-words font-display text-[24px] font-extrabold leading-tight tracking-tight text-navy sm:text-[26px]">{a.subject}</h1>
            <p className="mt-1 text-sm text-ink-muted">
              {a.requester.name} with {a.host.name} · {a.scheduledAt ? meetingWhen(a.scheduledAt, a.durationMinutes) : `asked for ${meetingWhen(a.preferredAt, a.durationMinutes)}`}
            </p>
          </div>
          {a.viewer.actions.length > 0 && (
            <div className="flex w-full flex-wrap gap-2 sm:w-auto">
              {actions.has("ADD_NOTE") && (
                <button className="btn-ghost" onClick={() => open("ADD_NOTE")}>
                  <MessageSquare className="h-4 w-4" /> Add note
                </button>
              )}
              {actions.has("CANCEL") && (
                <button className="btn-secondary" onClick={() => open("CANCEL")}>
                  <Ban className="h-4 w-4" /> Cancel
                </button>
              )}
              {actions.has("DECLINE") && (
                <button className="btn-secondary text-danger" onClick={() => open("DECLINE")}>
                  <XCircle className="h-4 w-4" /> Decline
                </button>
              )}
              {actions.has("PROPOSE") && (
                <button className="btn-secondary" onClick={() => open("PROPOSE")}>
                  <Repeat className="h-4 w-4" /> {a.status === "CONFIRMED" ? "Move" : "Propose time"}
                </button>
              )}
              {actions.has("COMPLETE") && (
                <button className="btn-primary" onClick={() => open("COMPLETE")}>
                  <CheckCircle2 className="h-4 w-4" /> Mark held
                </button>
              )}
              {actions.has("ACCEPT") && (
                <button className="btn-primary" onClick={() => open("ACCEPT")}>
                  <CheckCircle2 className="h-4 w-4" /> Accept {meetingWhen(a.scheduledAt).split(" · ")[1]}
                </button>
              )}
              {actions.has("CONFIRM") && (
                <button className="btn-primary" onClick={() => open("CONFIRM")}>
                  <CalendarCheck2 className="h-4 w-4" /> Confirm
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      {a.status === "PROPOSED" && a.scheduledAt && (
        <div className="flex items-start gap-3 rounded-2xl border border-pending/25 bg-pending-soft px-5 py-4 text-sm text-pending">
          <Repeat className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
          <div>
            <p className="font-semibold">New time proposed: {meetingWhen(a.scheduledAt, a.durationMinutes)}</p>
            <p className="mt-0.5 text-pending/90">{a.viewer.isRequester ? "Accept it, or cancel if it does not suit you." : `Waiting for ${a.requester.name} to accept.`}</p>
          </div>
        </div>
      )}
      {hostSide && a.clashes.length > 0 && (
        <div className="flex items-start gap-3 rounded-2xl border border-danger/20 bg-danger-soft px-5 py-4 text-sm text-danger" role="alert">
          <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
          <div>
            <p className="font-semibold">Clashes with {a.clashes.length === 1 ? "a confirmed meeting" : `${a.clashes.length} confirmed meetings`}</p>
            {a.clashes.map((c) => (
              <p key={c.id} className="mt-0.5 text-danger/90">
                <Link to={`/appointments/${c.id}`} className="underline">
                  {c.subject}
                </Link>{" "}
                with {c.with} · {meetingWhen(c.scheduledAt)}
              </p>
            ))}
          </div>
        </div>
      )}
      {a.viewer.isOffice && (
        <div className="flex items-start gap-3 rounded-2xl border border-active/20 bg-active-soft px-5 py-4 text-sm text-navy">
          <Crown className="mt-0.5 h-5 w-5 shrink-0 text-active" aria-hidden />
          <p>You are answering for {a.host.name} as the executive office.</p>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-6">
          <Card title="Meeting">
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <KeyValue label="About">{a.purposeLabel}</KeyValue>
              <KeyValue label="How">{MEETING_MODE_LABEL[a.mode as MeetingMode] ?? a.mode}</KeyValue>
              <KeyValue label="Length">{a.durationMinutes} minutes</KeyValue>
              <KeyValue label={a.status === "PROPOSED" ? "Proposed" : "Scheduled"}>{a.scheduledAt ? meetingWhen(a.scheduledAt, a.durationMinutes) : "Not yet"}</KeyValue>
              <KeyValue label="Preferred">{meetingWhen(a.preferredAt, a.durationMinutes)}</KeyValue>
              <KeyValue label="Alternative">{a.alternativeAt ? meetingWhen(a.alternativeAt, a.durationMinutes) : "—"}</KeyValue>
              <KeyValue label="Where">{a.location ?? (a.mode === "IN_PERSON" ? "To be confirmed" : "Link or number sent by the office")}</KeyValue>
              <KeyValue label="Asked">{stamp(a.createdAt)}</KeyValue>
            </dl>
            {a.agenda && <p className="mt-5 whitespace-pre-line border-t border-line pt-4 text-[15px] leading-relaxed text-ink">{a.agenda}</p>}
          </Card>
          <Card title="History" action={<span className="text-xs text-ink-subtle">Append-only · Asia/Dhaka</span>}>
            <HistoryList entries={a.updates.map(describe)} />
          </Card>
        </div>
        <div className="space-y-6">
          <Card title="People">
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <span className={cx("grid h-10 w-10 shrink-0 place-items-center rounded-full", a.host.executive ? "bg-navy text-platinum-bright" : "bg-platinum-bright text-navy-500")}>
                  {a.host.executive ? <Crown className="h-5 w-5" /> : <UserCheck className="h-5 w-5" />}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink">{a.host.name}</p>
                  <p className="text-xs text-ink-muted">{[a.host.designation, a.host.department].filter(Boolean).join(" · ") || "Host"}</p>
                  {a.respondedByName && a.respondedByName !== a.host.name && <p className="mt-0.5 text-xs text-ink-subtle">Answered by {a.respondedByName}</p>}
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-platinum-bright text-navy-500">
                  <UserRound className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink">{a.requester.name}</p>
                  <p className="text-xs text-ink-muted">{[a.requester.designation, a.requester.department, a.branch.code].filter(Boolean).join(" · ")}</p>
                  {a.requester.phone && (
                    <a href={`tel:${a.requester.phone}`} className="mt-1 inline-block text-xs font-semibold text-active hover:underline">
                      {a.requester.phone}
                    </a>
                  )}
                </div>
              </li>
              {a.attendees.length > 0 && (
                <li className="flex items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-platinum-bright text-navy-500">
                    <Users className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink">Also joining</p>
                    <p className="text-xs text-ink-muted">{a.attendees.join(", ")}</p>
                  </div>
                </li>
              )}
            </ul>
          </Card>
          {a.statusNote && (
            <Card title={a.status === "DECLINED" ? "Reason given" : a.status === "CANCELLED" ? "Reason for cancelling" : a.status === "COMPLETED" ? "Outcome" : "Latest note"}>
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
        footer={
          copy && (
            <>
              <button className="btn-ghost" onClick={close}>
                Back
              </button>
              <button className={copy.danger ? "btn-danger" : "btn-primary"} disabled={act.isPending || !textOk || !timeOk} onClick={() => act.mutate(dialog!)}>
                {act.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <copy.icon className="h-4 w-4" />} {copy.label}
              </button>
            </>
          )
        }
      >
        {dialog === "CONFIRM" && (
          <div className="space-y-2" role="radiogroup" aria-label="Meeting time">
            {(
              [
                ["PREFERRED", `Preferred — ${meetingWhen(a.preferredAt, a.durationMinutes)}`],
                ...(a.alternativeAt ? [["ALTERNATIVE", `Alternative — ${meetingWhen(a.alternativeAt, a.durationMinutes)}`]] : []),
                ["OTHER", "Another time"],
              ] as [typeof choice, string][]
            ).map(([v, label]) => (
              <button key={v} type="button" role="radio" aria-checked={choice === v} onClick={() => setChoice(v)} className={cx("flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm", choice === v ? "border-navy bg-navy/[0.04] font-semibold text-navy ring-1 ring-navy" : "border-line text-ink")}>
                <span className={cx("h-4 w-4 shrink-0 rounded-full border-2", choice === v ? "border-navy bg-navy shadow-[inset_0_0_0_2px_white]" : "border-line-strong")} aria-hidden />
                {label}
              </button>
            ))}
          </div>
        )}
        {needsTime && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Day">{(fid) => <input id={fid} type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />}</Field>
            <Field label="Time (Dhaka)">{(fid) => <input id={fid} type="time" step={900} className="input" value={time} onChange={(e) => setTime(e.target.value)} />}</Field>
          </div>
        )}
        {(dialog === "CONFIRM" || dialog === "PROPOSE") && (
          <Field label="Where">{(fid) => <input id={fid} className="input" maxLength={APPOINTMENT_LIMITS.locationMax} value={location} onChange={(e) => setLocation(e.target.value)} placeholder={a.mode === "IN_PERSON" ? "e.g. MD's Office, Level 9" : "e.g. Teams link sent by email"} />}</Field>
        )}
        {copy && copy.field && (
          <Field label={copy.field}>
            {(fid) => <textarea id={fid} className="input min-h-[88px] py-2.5" placeholder={copy.placeholder} value={text} onChange={(e) => setText(e.target.value)} maxLength={APPOINTMENT_LIMITS.noteMax} />}
          </Field>
        )}
        <ErrorNote error={act.error} />
      </Modal>
    </div>
  );
}
