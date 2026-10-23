import type { StatusTone } from "./labels";

/**
 * Leave: an employee applies for leave of a type, their head of department
 * approves, then HR approves and the days come off the year's balance.
 * Balances are per person, per type, per calendar year (Asia/Dhaka).
 */
export const LeaveType = {
  CASUAL: "CASUAL",
  SICK: "SICK",
  EARNED: "EARNED",
  MATERNITY: "MATERNITY",
  PATERNITY: "PATERNITY",
  UNPAID: "UNPAID",
} as const;
export type LeaveType = (typeof LeaveType)[keyof typeof LeaveType];

export const LeaveStatus = {
  /** Waiting for the head of department (the approver on the application). */
  PENDING_HOD: "PENDING_HOD",
  /** Waiting for HR. */
  PENDING_HR: "PENDING_HR",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  CANCELLED: "CANCELLED",
} as const;
export type LeaveStatus = (typeof LeaveStatus)[keyof typeof LeaveStatus];

/** A one-day application may cover half the day. */
export const HalfDaySession = {
  FIRST_HALF: "FIRST_HALF",
  SECOND_HALF: "SECOND_HALF",
} as const;
export type HalfDaySession = (typeof HalfDaySession)[keyof typeof HalfDaySession];

export const LeaveUpdateType = {
  SUBMITTED: "SUBMITTED",
  STATUS_CHANGED: "STATUS_CHANGED",
  NOTE_ADDED: "NOTE_ADDED",
} as const;
export type LeaveUpdateType = (typeof LeaveUpdateType)[keyof typeof LeaveUpdateType];

export const LEAVE_TRANSITIONS: Record<LeaveStatus, readonly LeaveStatus[]> = {
  PENDING_HOD: [LeaveStatus.PENDING_HR, LeaveStatus.REJECTED, LeaveStatus.CANCELLED],
  PENDING_HR: [LeaveStatus.APPROVED, LeaveStatus.REJECTED, LeaveStatus.CANCELLED],
  // Approved leave can be cancelled until it starts; the days go back to the balance.
  APPROVED: [LeaveStatus.CANCELLED],
  REJECTED: [],
  CANCELLED: [],
};

export function canLeaveTransition(from: string, to: string): boolean {
  return LEAVE_TRANSITIONS[from as LeaveStatus]?.includes(to as LeaveStatus) ?? false;
}

/** Waiting for a decision. These days are held against the balance. */
export const OPEN_LEAVE_STATUSES: readonly LeaveStatus[] = [LeaveStatus.PENDING_HOD, LeaveStatus.PENDING_HR];
/** Counted against the balance: approved, plus pending (held until decided). */
export const HELD_LEAVE_STATUSES: readonly LeaveStatus[] = [LeaveStatus.PENDING_HOD, LeaveStatus.PENDING_HR, LeaveStatus.APPROVED];
export const CLOSED_LEAVE_STATUSES: readonly LeaveStatus[] = [LeaveStatus.REJECTED, LeaveStatus.CANCELLED];

export const LeaveAwaiting = {
  HOD: "HOD",
  HR: "HR",
} as const;
export type LeaveAwaiting = (typeof LeaveAwaiting)[keyof typeof LeaveAwaiting];

export function leaveAwaiting(status: string): LeaveAwaiting | null {
  if (status === LeaveStatus.PENDING_HOD) return LeaveAwaiting.HOD;
  if (status === LeaveStatus.PENDING_HR) return LeaveAwaiting.HR;
  return null;
}

export const LEAVE_AWAITING_LABEL: Record<LeaveAwaiting, string> = {
  HOD: "Head of department",
  HR: "HR",
};

export const LeaveAction = {
  APPROVE: "APPROVE",
  REJECT: "REJECT",
  CANCEL: "CANCEL",
  ADD_NOTE: "ADD_NOTE",
} as const;
export type LeaveAction = (typeof LeaveAction)[keyof typeof LeaveAction];

export const LeaveDecision = {
  APPROVE: "APPROVE",
  REJECT: "REJECT",
} as const;
export type LeaveDecision = (typeof LeaveDecision)[keyof typeof LeaveDecision];

/** The approval chain, for progress steppers. */
export const LEAVE_PIPELINE: readonly LeaveStatus[] = [LeaveStatus.PENDING_HOD, LeaveStatus.PENDING_HR, LeaveStatus.APPROVED];

export interface LeaveTypeRule {
  /** Days a year; null means no balance is kept (leave without pay). */
  annualDays: number | null;
  /** Count every calendar day (maternity) rather than working days. */
  calendarDays: boolean;
  halfDayAllowed: boolean;
  /** How many days back an application may start (falling sick, an emergency). */
  backdateDays: number;
  /** Apply at least this many days before the leave starts. */
  noticeDays: number;
  /** At most this many days in one application; null for no limit beyond the balance. */
  maxPerRequest: number | null;
}

/** The group's leave policy, after the Bangladesh Labour Act 2006 where it sets one. */
export const LEAVE_TYPE_RULES: Record<LeaveType, LeaveTypeRule> = {
  CASUAL: { annualDays: 10, calendarDays: false, halfDayAllowed: true, backdateDays: 7, noticeDays: 0, maxPerRequest: 3 },
  SICK: { annualDays: 14, calendarDays: false, halfDayAllowed: true, backdateDays: 7, noticeDays: 0, maxPerRequest: null },
  EARNED: { annualDays: 18, calendarDays: false, halfDayAllowed: false, backdateDays: 0, noticeDays: 3, maxPerRequest: null },
  MATERNITY: { annualDays: 112, calendarDays: true, halfDayAllowed: false, backdateDays: 0, noticeDays: 0, maxPerRequest: 112 },
  PATERNITY: { annualDays: 5, calendarDays: false, halfDayAllowed: false, backdateDays: 3, noticeDays: 0, maxPerRequest: 5 },
  UNPAID: { annualDays: null, calendarDays: false, halfDayAllowed: false, backdateDays: 0, noticeDays: 3, maxPerRequest: 30 },
};

/** The order types appear in pickers and balance cards. */
export const LEAVE_TYPE_ORDER: readonly LeaveType[] = [LeaveType.CASUAL, LeaveType.SICK, LeaveType.EARNED, LeaveType.MATERNITY, LeaveType.PATERNITY, LeaveType.UNPAID];

export const LEAVE_TYPE_LABEL: Record<LeaveType, string> = {
  CASUAL: "Casual leave",
  SICK: "Sick leave",
  EARNED: "Earned leave",
  MATERNITY: "Maternity leave",
  PATERNITY: "Paternity leave",
  UNPAID: "Leave without pay",
};

/** One line under each type in the picker. */
export const LEAVE_TYPE_HINT: Record<LeaveType, string> = {
  CASUAL: "10 days a year · up to 3 days at a time",
  SICK: "14 days a year · medical certificate for more than 2 days",
  EARNED: "18 days a year · apply at least 3 days ahead",
  MATERNITY: "16 weeks, counted in calendar days",
  PATERNITY: "5 working days around the birth",
  UNPAID: "No balance · up to 30 days, apply 3 days ahead",
};

export const LEAVE_STATUS_LABEL: Record<LeaveStatus, string> = {
  PENDING_HOD: "Pending HOD approval",
  PENDING_HR: "Pending HR approval",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
};

export const LEAVE_STAGE_LABEL: Record<LeaveStatus, string> = {
  PENDING_HOD: "HOD",
  PENDING_HR: "HR",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
};

export const LEAVE_STATUS_TONE: Record<LeaveStatus, StatusTone> = {
  PENDING_HOD: "pending",
  PENDING_HR: "pending",
  APPROVED: "success",
  REJECTED: "danger",
  CANCELLED: "neutral",
};

export const HALF_DAY_LABEL: Record<HalfDaySession, string> = {
  FIRST_HALF: "First half (morning)",
  SECOND_HALF: "Second half (afternoon)",
};

export const LEAVE_LIMITS = {
  reasonMin: 3,
  reasonMax: 500,
  noteMax: 1000,
  addressMax: 200,
  /** Applications can be made at most this far ahead. */
  maxLeadDays: 180,
  /** A year's entitlement HR may set for one type. */
  maxEntitlementDays: 365,
} as const;

/** App settings keys. */
export const LEAVE_SETTING_WEEKEND = "leave.weekendDays";
export const LEAVE_SETTING_HOLIDAYS = "leave.holidays";
/** Friday is the weekly holiday (Bangladesh Labour Act s.103). 0 = Sunday … 6 = Saturday. */
export const DEFAULT_WEEKEND_DAYS: readonly number[] = [5];

export interface PublicHoliday {
  /** YYYY-MM-DD */
  date: string;
  name: string;
}

const DAY_MS = 86_400_000;
const isoDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const dayMs = (d: string) => Date.parse(`${d}T00:00:00Z`);

/**
 * Days an application takes from the balance. Working-day types skip the
 * weekly holiday and public holidays; maternity counts every calendar day.
 * A half day is 0.5. Dates are YYYY-MM-DD, both ends included.
 */
export function countLeaveDays(
  startDate: string,
  endDate: string,
  opts: { type: string; halfDay?: string | null; weekendDays?: readonly number[]; holidays?: readonly string[] },
): number {
  const start = dayMs(startDate);
  const end = dayMs(endDate);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return 0;
  const rule = LEAVE_TYPE_RULES[opts.type as LeaveType];
  if (rule?.calendarDays) return Math.round((end - start) / DAY_MS) + 1;
  const weekend = new Set(opts.weekendDays ?? DEFAULT_WEEKEND_DAYS);
  const holidays = new Set(opts.holidays ?? []);
  let days = 0;
  for (let t = start; t <= end; t += DAY_MS) {
    if (weekend.has(new Date(t).getUTCDay()) || holidays.has(isoDay(t))) continue;
    days += 1;
  }
  if (opts.halfDay && days === 1 && startDate === endDate) return 0.5;
  return days;
}

/** "1 day", "2.5 days", "½ day". */
export function formatLeaveDays(days: number): string {
  if (days === 0.5) return "½ day";
  const n = Number.isInteger(days) ? String(days) : days.toFixed(1);
  return `${n} ${days === 1 ? "day" : "days"}`;
}

/** ABG-LV-YYYY-NNN, e.g. ABG-LV-2026-041. */
export function formatLeaveNumber(year: number, sequence: number): string {
  return `ABG-LV-${year}-${String(sequence).padStart(3, "0")}`;
}

/** Consecutive YYYY-MM-DD dates from start to end, both included. */
export function leaveDates(startDate: string, endDate: string): string[] {
  const out: string[] = [];
  const end = dayMs(endDate);
  for (let t = dayMs(startDate); t <= end && out.length < 400; t += DAY_MS) out.push(isoDay(t));
  return out;
}
