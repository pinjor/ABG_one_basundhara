import { Ban, Baby, CalendarCheck2, CheckCircle2, HeartPulse, Hourglass, Palmtree, Sun, Umbrella, UserCheck, Wallet, XCircle, type LucideIcon } from "lucide-react";
import { LEAVE_STATUS_LABEL, LEAVE_STATUS_TONE, LEAVE_TYPE_LABEL, formatLeaveDays, type LeaveStatus, type LeaveType, type StatusTone } from "@abg-dispatch/shared";
import { StatusChip } from "../../components/StatusChip";
import { cx } from "../../components/ui";
import type { LeaveBalance } from "./types";

export const LEAVE_STATUS_ICON: Record<string, LucideIcon> = {
  PENDING_HOD: UserCheck,
  PENDING_HR: Hourglass,
  APPROVED: CheckCircle2,
  REJECTED: XCircle,
  CANCELLED: Ban,
};

export const LEAVE_TYPE_ICON: Record<string, LucideIcon> = {
  CASUAL: Sun,
  SICK: HeartPulse,
  EARNED: Palmtree,
  MATERNITY: Baby,
  PATERNITY: Baby,
  UNPAID: Wallet,
};

/** One colour per type, for the calendars (identity, not status). */
export const LEAVE_TYPE_COLOR: Record<string, string> = {
  CASUAL: "#2a78d6",
  SICK: "#c0466a",
  EARNED: "#0e8a8a",
  MATERNITY: "#8a5cd0",
  PATERNITY: "#4b4fc4",
  UNPAID: "#7a8496",
};

export const leaveTone = (status: string): StatusTone => LEAVE_STATUS_TONE[status as LeaveStatus] ?? "neutral";

export function LeaveStatusBadge({ status, size = "md" }: { status: string; size?: "sm" | "md" }) {
  return <StatusChip label={LEAVE_STATUS_LABEL[status as LeaveStatus] ?? status} tone={leaveTone(status)} icon={LEAVE_STATUS_ICON[status]} size={size} />;
}

export function LeaveTypeTag({ type }: { type: string }) {
  const Icon = LEAVE_TYPE_ICON[type] ?? Umbrella;
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-md bg-platinum-bright px-1.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-navy-500 ring-1 ring-inset ring-line-strong">
      <Icon className="h-3 w-3" style={{ color: LEAVE_TYPE_COLOR[type] }} aria-hidden />
      {(LEAVE_TYPE_LABEL[type as LeaveType] ?? type).replace(" leave", "")}
    </span>
  );
}

export function OnLeaveTag() {
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-md bg-active px-1.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-white">
      <CalendarCheck2 className="h-3 w-3" aria-hidden /> On leave
    </span>
  );
}

const dayMonth = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", day: "numeric", month: "short" });
const dayMonthYear = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" });
const weekday = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short", year: "numeric" });
const asDate = (d: string) => new Date(`${d}T00:00:00Z`);

export function calendarDay(d: string | null | undefined, withWeekday = false): string {
  if (!d) return "—";
  return (withWeekday ? weekday : dayMonthYear).format(asDate(d));
}

/** "14–16 Nov 2026", "30 Nov – 2 Dec 2026". */
export function leaveDates(start: string, end: string): string {
  const a = asDate(start);
  const b = asDate(end);
  if (start === end) return dayMonthYear.format(a);
  if (a.getUTCFullYear() !== b.getUTCFullYear()) return `${dayMonthYear.format(a)} – ${dayMonthYear.format(b)}`;
  if (a.getUTCMonth() === b.getUTCMonth()) return `${a.getUTCDate()}–${dayMonthYear.format(b)}`;
  return `${dayMonth.format(a)} – ${dayMonthYear.format(b)}`;
}

export const days = (n: number) => formatLeaveDays(n);

/** A balance card: available of entitled, with used and pending. */
export function BalanceCard({ b, compact = false }: { b: LeaveBalance; compact?: boolean }) {
  const Icon = LEAVE_TYPE_ICON[b.type] ?? Umbrella;
  const pct = b.entitled ? Math.min(100, ((b.used + b.pending) / b.entitled) * 100) : 0;
  const usedPct = b.entitled ? Math.min(100, (b.used / b.entitled) * 100) : 0;
  return (
    <div className={cx("card min-w-0", compact ? "px-3.5 py-3" : "px-4 py-4")}>
      <div className="flex items-center gap-2">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-platinum-bright" style={{ color: LEAVE_TYPE_COLOR[b.type] }}>
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <p className="truncate text-xs font-semibold text-ink-muted">{LEAVE_TYPE_LABEL[b.type as LeaveType] ?? b.type}</p>
      </div>
      {b.entitled === null ? (
        <>
          <p className="tabular mt-2 font-display text-[22px] font-extrabold leading-tight text-navy">{b.used ? formatLeaveDays(b.used) : "—"}</p>
          <p className="text-[11.5px] text-ink-subtle">No balance · taken this year</p>
        </>
      ) : (
        <>
          <p className="mt-2 font-display leading-tight text-navy">
            <span className="tabular text-[22px] font-extrabold">{b.available}</span>
            <span className="tabular text-sm font-semibold text-ink-subtle"> / {b.entitled} days</span>
          </p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-platinum-bright" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label={`${LEAVE_TYPE_LABEL[b.type as LeaveType]} used`}>
            <div className="relative h-full" style={{ width: `${pct}%` }}>
              <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: pct ? `${(usedPct / pct) * 100}%` : 0, background: LEAVE_TYPE_COLOR[b.type] }} />
              <div className="absolute inset-y-0 right-0 rounded-full bg-pending/60" style={{ width: pct ? `${((pct - usedPct) / pct) * 100}%` : 0 }} />
            </div>
          </div>
          <p className="mt-1 truncate text-[11.5px] text-ink-subtle">
            {b.used} used{b.pending ? ` · ${b.pending} pending` : ""}
            {b.adjusted ? " · adjusted by HR" : ""}
          </p>
        </>
      )}
    </div>
  );
}
