import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarCheck2, Loader2, Send, UserCheck, Users } from "lucide-react";
import {
  HALF_DAY_LABEL,
  HalfDaySession,
  LEAVE_LIMITS,
  LEAVE_TYPE_HINT,
  LEAVE_TYPE_LABEL,
  LEAVE_TYPE_ORDER,
  LEAVE_TYPE_RULES,
  LeaveType,
  countLeaveDays,
  formatLeaveDays,
} from "@abg-dispatch/shared";
import { api, newKey } from "../../lib/api";
import { dhakaDay } from "../../lib/format";
import { toast } from "../../components/toast";
import { ErrorNote, Field, Modal, cx } from "../../components/ui";
import { PersonPicker, type PickedPerson } from "../../components/PersonPicker";
import type { MeWithManager } from "../tours/types";
import { LEAVE_TYPE_COLOR, LEAVE_TYPE_ICON } from "./parts";
import type { Leave, LeaveBalance, LeaveSettings } from "./types";

const addDays = (d: string, n: number) => new Date(new Date(`${d}T00:00:00Z`).getTime() + n * 86_400_000).toISOString().slice(0, 10);

export function ApplyLeaveModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const today = dhakaDay();
  const me = useQuery({ queryKey: ["me"], queryFn: () => api.get<MeWithManager>("/auth/me"), enabled: open, staleTime: 60_000 });
  const settings = useQuery({ queryKey: ["leave", "calendar-settings"], queryFn: () => api.get<LeaveSettings>("/leave/calendar-settings"), enabled: open, staleTime: 5 * 60_000 });
  const balances = useQuery({ queryKey: ["leave", "balance"], queryFn: () => api.get<{ year: number; balances: LeaveBalance[] }>("/leave/balance"), enabled: open });
  const manager = me.data?.employee?.manager ?? null;

  const [idemKey, setIdemKey] = useState(newKey);
  const [type, setType] = useState<string>(LeaveType.CASUAL);
  const [startDate, setStartDate] = useState(addDays(today, 1));
  const [endDate, setEndDate] = useState(addDays(today, 1));
  const [halfDay, setHalfDay] = useState<string>("");
  const [reason, setReason] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [reliever, setReliever] = useState<PickedPerson | null>(null);
  const [approver, setApprover] = useState<PickedPerson | null>(null);
  const rule = LEAVE_TYPE_RULES[type as LeaveType];

  useEffect(() => {
    if (open && !approver && manager?.userId) setApprover({ id: manager.employeeId, userId: manager.userId, name: manager.fullName, designation: manager.designation });
  }, [open, manager, approver]);
  useEffect(() => {
    if (endDate < startDate) setEndDate(startDate);
  }, [startDate, endDate]);
  useEffect(() => {
    if (halfDay && (!rule.halfDayAllowed || startDate !== endDate)) setHalfDay("");
  }, [halfDay, rule, startDate, endDate]);

  const count = useMemo(
    () => (settings.data ? countLeaveDays(startDate, endDate, { type, halfDay: halfDay || null, weekendDays: settings.data.weekendDays, holidays: settings.data.holidays.map((h) => h.date) }) : 0),
    [settings.data, startDate, endDate, type, halfDay],
  );
  const holidaysInRange = (settings.data?.holidays ?? []).filter((h) => h.date >= startDate && h.date <= endDate);
  const balance = balances.data?.balances.find((b) => b.type === type);
  const earliest = rule.backdateDays > 0 ? addDays(today, -rule.backdateDays) : addDays(today, rule.noticeDays);

  const problems = useMemo(() => {
    const p: string[] = [];
    if (startDate < earliest) p.push(rule.backdateDays > 0 ? `${LEAVE_TYPE_LABEL[type as LeaveType]} can start at most ${rule.backdateDays} days back.` : `Apply at least ${rule.noticeDays} days ahead — the earliest start is ${earliest}.`);
    if (settings.data && count <= 0) p.push("Those dates are all weekly or public holidays.");
    if (rule.maxPerRequest !== null && count > rule.maxPerRequest) p.push(`At most ${formatLeaveDays(rule.maxPerRequest)} in one application.`);
    if (balance && balance.available !== null && count > balance.available) p.push(`You have ${formatLeaveDays(balance.available)} left.`);
    if (reason.trim().length < LEAVE_LIMITS.reasonMin) p.push("Say briefly why you need the leave.");
    if (!approver) p.push("Choose who approves your leave.");
    return p;
  }, [startDate, earliest, rule, type, settings.data, count, balance, reason, approver]);

  const reset = () => {
    setIdemKey(newKey());
    setType(LeaveType.CASUAL);
    setStartDate(addDays(today, 1));
    setEndDate(addDays(today, 1));
    setHalfDay("");
    setReason("");
    setAddress("");
    setPhone("");
    setReliever(null);
    setApprover(null);
  };
  const submit = useMutation({
    mutationFn: () =>
      api.post<Leave>(
        "/leave",
        {
          type,
          startDate,
          endDate,
          halfDay: halfDay || undefined,
          reason: reason.trim(),
          addressDuringLeave: address.trim() || undefined,
          contactPhone: phone.trim() || undefined,
          relieverEmployeeId: reliever?.id,
          approverEmployeeId: approver?.id,
        },
        idemKey,
      ),
    onSuccess: (leave) => {
      toast.success(`${leave.referenceNumber} sent to ${leave.approver.name} for approval.`);
      void qc.invalidateQueries({ queryKey: ["leave"] });
      closeRef.current();
      navigate(`/leave/${leave.id}`);
    },
  });
  // The modal refocuses its first field whenever onClose changes, so keep it stable.
  const closeRef = useRef<() => void>(() => undefined);
  closeRef.current = () => {
    reset();
    submit.reset();
    onClose();
  };
  const close = useCallback(() => closeRef.current(), []);

  return (
    <Modal
      open={open}
      onClose={close}
      title="Apply for leave"
      subtitle="Your head of department approves first, then HR. Pending days are held against your balance."
      width="max-w-2xl"
      footer={
        <>
          <button className="btn-ghost" onClick={close}>
            Cancel
          </button>
          <button className="btn-primary" disabled={submit.isPending || problems.length > 0} onClick={() => submit.mutate()}>
            {submit.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Apply{count > 0 ? ` for ${formatLeaveDays(count)}` : ""}
          </button>
        </>
      }
    >
      <div>
        <p className="label">Type of leave</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Type of leave">
          {LEAVE_TYPE_ORDER.map((t) => {
            const Icon = LEAVE_TYPE_ICON[t];
            const b = balances.data?.balances.find((x) => x.type === t);
            return (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={type === t}
                onClick={() => setType(t)}
                className={cx("flex items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition", type === t ? "border-navy bg-navy/[0.04] ring-1 ring-navy" : "border-line hover:border-line-strong")}
              >
                <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-platinum-bright" style={{ color: LEAVE_TYPE_COLOR[t] }}>
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="flex items-center gap-2 text-sm font-semibold text-ink">
                    {LEAVE_TYPE_LABEL[t]}
                    {b && b.available !== null && <span className="tabular rounded-md bg-platinum-bright px-1.5 text-[11px] text-navy-500">{b.available} left</span>}
                  </span>
                  <span className="block text-xs text-ink-muted">{LEAVE_TYPE_HINT[t]}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="First day">{(id) => <input id={id} type="date" className="input" min={earliest} value={startDate} onChange={(e) => setStartDate(e.target.value)} />}</Field>
        <Field label="Last day">{(id) => <input id={id} type="date" className="input" min={startDate} value={endDate} onChange={(e) => setEndDate(e.target.value)} />}</Field>
      </div>
      {rule.halfDayAllowed && startDate === endDate && (
        <Field label="Half day (optional)">
          {(id) => (
            <select id={id} className="input" value={halfDay} onChange={(e) => setHalfDay(e.target.value)}>
              <option value="">Full day</option>
              <option value={HalfDaySession.FIRST_HALF}>{HALF_DAY_LABEL.FIRST_HALF}</option>
              <option value={HalfDaySession.SECOND_HALF}>{HALF_DAY_LABEL.SECOND_HALF}</option>
            </select>
          )}
        </Field>
      )}
      <div className="flex items-start gap-3 rounded-xl bg-surface px-4 py-3 text-sm">
        <CalendarCheck2 className="mt-0.5 h-5 w-5 shrink-0 text-navy-500" aria-hidden />
        <div>
          <p className="font-semibold text-navy">
            {count > 0 ? formatLeaveDays(count) : "No working days"}
            {balance && balance.available !== null && <span className="font-normal text-ink-muted"> · {formatLeaveDays(Math.max(0, balance.available - count))} left after this</span>}
          </p>
          <p className="text-xs text-ink-muted">
            {rule.calendarDays ? "Counted in calendar days." : "Weekly and public holidays are not counted."}
            {holidaysInRange.length > 0 && ` Includes ${holidaysInRange.map((h) => h.name).join(", ")}.`}
          </p>
        </div>
      </div>

      <Field label="Reason">
        {(id) => <textarea id={id} className="input min-h-[72px] py-2.5" maxLength={LEAVE_LIMITS.reasonMax} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. My sister's wedding in Cumilla" />}
      </Field>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Address during leave (optional)">{(id) => <input id={id} className="input" maxLength={LEAVE_LIMITS.addressMax} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="e.g. Kandirpar, Cumilla" />}</Field>
        <Field label="Phone while away (optional)">{(id) => <input id={id} className="input" inputMode="tel" maxLength={20} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01XXXXXXXXX" />}</Field>
      </div>
      <PersonPicker label="Who covers your work (optional)" value={reliever} onChange={setReliever} optional icon={Users} emptyText="Nobody named" />
      <PersonPicker
        label="Approver (head of department)"
        value={approver}
        onChange={setApprover}
        needsAccount
        icon={UserCheck}
        emptyText={me.isLoading ? "Loading your line manager…" : manager && !manager.userId ? `${manager.fullName} has no ABG ONE account — choose someone else.` : "No line manager on record — choose an approver."}
      />
      {problems.length > 0 && reason && <p className="text-xs text-ink-subtle">To apply: {problems[0]}</p>}
      <ErrorNote error={submit.error} />
    </Modal>
  );
}
