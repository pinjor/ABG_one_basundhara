import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Crown, Loader2, Plus, Search, Send, UserCheck, X } from "lucide-react";
import { APPOINTMENT_DURATIONS, APPOINTMENT_LIMITS, APPOINTMENT_PURPOSE_LABEL, AppointmentPurpose, MEETING_MODE_LABEL, MeetingMode, withinMeetingHours } from "@abg-dispatch/shared";
import { api, newKey, qs } from "../../lib/api";
import { dhakaDay } from "../../lib/format";
import { toast } from "../../components/toast";
import { ErrorNote, Field, Modal, Toggle, cx } from "../../components/ui";
import { MODE_ICON, meetingWhen, toInstant } from "./parts";
import type { Appointment, Host } from "./types";

const addDays = (d: string, n: number) => new Date(new Date(`${d}T00:00:00Z`).getTime() + n * 86_400_000).toISOString().slice(0, 10);

export function RequestAppointmentModal({ open, onClose, hostUserId }: { open: boolean; onClose: () => void; hostUserId?: string }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const today = dhakaDay();
  const [idemKey, setIdemKey] = useState(newKey);
  const [host, setHost] = useState<Host | null>(null);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [subject, setSubject] = useState("");
  const [purpose, setPurpose] = useState<string>(AppointmentPurpose.BUSINESS_REVIEW);
  const [mode, setMode] = useState<string>(MeetingMode.IN_PERSON);
  const [duration, setDuration] = useState(30);
  const [date, setDate] = useState(addDays(today, 1));
  const [time, setTime] = useState("11:00");
  const [altDate, setAltDate] = useState("");
  const [altTime, setAltTime] = useState("15:00");
  const [agenda, setAgenda] = useState("");
  const [attendees, setAttendees] = useState<string[]>([]);
  const [attendeeDraft, setAttendeeDraft] = useState("");
  const [urgent, setUrgent] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 250);
    return () => clearTimeout(t);
  }, [search]);
  const hosts = useQuery({ queryKey: ["appointments", "hosts", debounced], queryFn: () => api.get<{ items: Host[] }>(`/appointments/hosts${qs({ q: debounced || undefined })}`), enabled: open });
  useEffect(() => {
    if (open && hostUserId && !host) {
      const h = hosts.data?.items.find((x) => x.userId === hostUserId);
      if (h) setHost(h);
    }
  }, [open, hostUserId, host, hosts.data]);

  const preferred = toInstant(date, time);
  const alternative = altDate ? toInstant(altDate, altTime) : null;
  const problems = useMemo(() => {
    const p: string[] = [];
    if (!host) p.push("Choose who you would like to meet.");
    if (subject.trim().length < APPOINTMENT_LIMITS.subjectMin) p.push("Give the meeting a short subject.");
    if (new Date(preferred).getTime() < Date.now() + APPOINTMENT_LIMITS.minLeadMinutes * 60_000) p.push("Choose a time at least 15 minutes from now.");
    if (!withinMeetingHours(new Date(preferred), duration)) p.push(`Meetings are between ${APPOINTMENT_LIMITS.dayStartHour}:00 and ${APPOINTMENT_LIMITS.dayEndHour}:00.`);
    if (alternative && !withinMeetingHours(new Date(alternative), duration)) p.push("The alternative time is outside meeting hours.");
    if (alternative && alternative === preferred) p.push("The alternative is the same as the preferred time.");
    return p;
  }, [host, subject, preferred, alternative, duration]);

  const reset = () => {
    setIdemKey(newKey());
    setHost(null);
    setSearch("");
    setSubject("");
    setPurpose(AppointmentPurpose.BUSINESS_REVIEW);
    setMode(MeetingMode.IN_PERSON);
    setDuration(30);
    setDate(addDays(today, 1));
    setTime("11:00");
    setAltDate("");
    setAgenda("");
    setAttendees([]);
    setAttendeeDraft("");
    setUrgent(false);
  };
  const submit = useMutation({
    mutationFn: () =>
      api.post<Appointment>(
        "/appointments",
        { hostUserId: host!.userId, subject: subject.trim(), purpose, agenda: agenda.trim() || undefined, mode, durationMinutes: duration, preferredAt: preferred, alternativeAt: alternative ?? undefined, attendees, urgent },
        idemKey,
      ),
    onSuccess: (a) => {
      toast.success(`${a.referenceNumber} sent to ${a.host.executive ? `the office of ${a.host.name}` : a.host.name}.`);
      void qc.invalidateQueries({ queryKey: ["appointments"] });
      closeRef.current();
      navigate(`/appointments/${a.id}`);
    },
  });
  const closeRef = useRef<() => void>(() => undefined);
  closeRef.current = () => {
    reset();
    submit.reset();
    onClose();
  };
  const close = useCallback(() => closeRef.current(), []);
  const addAttendee = () => {
    const name = attendeeDraft.replace(/\s+/g, " ").trim();
    if (name.length >= 2 && attendees.length < APPOINTMENT_LIMITS.maxAttendees && !attendees.some((a) => a.toLowerCase() === name.toLowerCase())) setAttendees([...attendees, name]);
    setAttendeeDraft("");
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Request for appointment"
      subtitle="Ask the MD, the Chairman or a head of department for a meeting. Their office confirms it, proposes another time or declines."
      width="max-w-2xl"
      footer={
        <>
          <button className="btn-ghost" onClick={close}>
            Cancel
          </button>
          <button className="btn-primary" disabled={submit.isPending || problems.length > 0} onClick={() => submit.mutate()}>
            {submit.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Send request
          </button>
        </>
      }
    >
      <div>
        <p className="label">Meet with</p>
        {host ? (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-line px-3 py-2.5">
            <div className="flex min-w-0 items-center gap-3">
              <span className={cx("grid h-9 w-9 shrink-0 place-items-center rounded-full", host.executive ? "bg-navy text-platinum-bright" : "bg-platinum-bright text-navy-500")}>
                {host.executive ? <Crown className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">{host.name}</p>
                <p className="truncate text-xs text-ink-muted">{[host.designation, host.department].filter(Boolean).join(" · ")}</p>
              </div>
            </div>
            <button type="button" className="btn-ghost h-9 shrink-0 px-3 text-xs" onClick={() => setHost(null)}>
              Change
            </button>
          </div>
        ) : (
          <div className="rounded-xl border border-line p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subtle" aria-hidden />
              <input className="input pl-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="The MD, the Chairman, or search by name or department" aria-label="Search people" />
            </div>
            <ul className="mt-2 max-h-56 overflow-y-auto">
              {hosts.isLoading && <li className="px-3 py-2 text-xs text-ink-subtle">Loading…</li>}
              {(hosts.data?.items ?? []).map((h) => (
                <li key={h.userId}>
                  <button type="button" onClick={() => setHost(h)} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-surface">
                    <span className={cx("grid h-8 w-8 shrink-0 place-items-center rounded-full", h.executive ? "bg-navy text-platinum-bright" : "bg-platinum-bright text-navy-500")}>
                      {h.executive ? <Crown className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-ink">{h.name}</span>
                      <span className="block truncate text-xs text-ink-muted">{[h.designation, h.department, h.office].filter(Boolean).join(" · ")}</span>
                    </span>
                    {h.executive && <span className="shrink-0 rounded-md bg-navy px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-platinum-bright">Executive</span>}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <Field label="Subject">{(id) => <input id={id} className="input" maxLength={APPOINTMENT_LIMITS.subjectMax} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Lease agreement for the Chattogram refinery land" />}</Field>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="About">
          {(id) => (
            <select id={id} className="input" value={purpose} onChange={(e) => setPurpose(e.target.value)}>
              {Object.values(AppointmentPurpose).map((p) => (
                <option key={p} value={p}>
                  {APPOINTMENT_PURPOSE_LABEL[p]}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field label="Length">
          {(id) => (
            <select id={id} className="input" value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
              {APPOINTMENT_DURATIONS.map((d) => (
                <option key={d} value={d}>
                  {d < 60 ? `${d} minutes` : `${d / 60} hour${d > 60 ? "s" : ""}`.replace("1.5 hours", "1½ hours")}
                </option>
              ))}
            </select>
          )}
        </Field>
      </div>
      <div>
        <p className="label">How</p>
        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Meeting mode">
          {Object.values(MeetingMode).map((m) => {
            const Icon = MODE_ICON[m];
            return (
              <button key={m} type="button" role="radio" aria-checked={mode === m} onClick={() => setMode(m)} className={cx("flex h-11 items-center justify-center gap-2 rounded-xl border text-sm font-semibold", mode === m ? "border-navy bg-navy text-white" : "border-line text-ink-muted hover:border-line-strong")}>
                <Icon className="h-4 w-4" aria-hidden /> {MEETING_MODE_LABEL[m]}
              </button>
            );
          })}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Preferred day">{(id) => <input id={id} type="date" className="input" min={today} value={date} onChange={(e) => setDate(e.target.value)} />}</Field>
        <Field label="Time (Dhaka)">{(id) => <input id={id} type="time" className="input" step={900} value={time} onChange={(e) => setTime(e.target.value)} />}</Field>
        <Field label="Alternative day (optional)">{(id) => <input id={id} type="date" className="input" min={today} value={altDate} onChange={(e) => setAltDate(e.target.value)} />}</Field>
        <Field label="Time">{(id) => <input id={id} type="time" className="input" step={900} value={altTime} disabled={!altDate} onChange={(e) => setAltTime(e.target.value)} />}</Field>
      </div>
      <p className="-mt-2 text-xs text-ink-subtle">
        Preferred: {meetingWhen(preferred, duration)}
        {alternative ? ` · Alternative: ${meetingWhen(alternative, duration)}` : ""}
      </p>
      <Field label="Agenda (optional)">
        {(id) => <textarea id={id} className="input min-h-[72px] py-2.5" maxLength={APPOINTMENT_LIMITS.agendaMax} value={agenda} onChange={(e) => setAgenda(e.target.value)} placeholder="What you need decided, and what you will bring" />}
      </Field>
      <div>
        <p className="label">Colleagues joining you (optional)</p>
        <div className="flex gap-2">
          <input className="input" value={attendeeDraft} onChange={(e) => setAttendeeDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addAttendee())} placeholder="Name, then Enter" aria-label="Colleague's name" />
          <button type="button" className="btn-secondary h-10 shrink-0" onClick={addAttendee} disabled={attendeeDraft.trim().length < 2}>
            <Plus className="h-4 w-4" /> Add
          </button>
        </div>
        {attendees.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-2">
            {attendees.map((a) => (
              <li key={a} className="inline-flex items-center gap-1.5 rounded-full bg-platinum-bright py-1 pl-3 pr-1 text-sm font-medium text-navy">
                {a}
                <button type="button" className="rounded-full p-1 hover:bg-white" onClick={() => setAttendees(attendees.filter((x) => x !== a))} aria-label={`Remove ${a}`}>
                  <X className="h-3 w-3" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="flex items-center justify-between gap-3 rounded-xl border border-line px-3 py-2.5">
        <div>
          <p className="text-sm font-semibold text-ink">Urgent</p>
          <p className="text-xs text-ink-muted">Flagged in red for the office; use it only when it cannot wait.</p>
        </div>
        <Toggle checked={urgent} onChange={setUrgent} label="Urgent" />
      </div>
      {problems.length > 0 && subject && <p className="text-xs text-ink-subtle">To send: {problems[0]}</p>}
      <ErrorNote error={submit.error} />
    </Modal>
  );
}
