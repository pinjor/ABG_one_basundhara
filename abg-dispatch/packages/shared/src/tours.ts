import type { StatusTone } from "./labels";

/**
 * Official tour requests: an employee applies for a local or overseas trip;
 * their head of department approves, HR & Finance vet the budget, and overseas
 * tours also need the Managing Director's or Chairman's sanction before
 * tickets or foreign-exchange allowance can be released.
 */
export const TourType = {
  LOCAL: "LOCAL",
  FOREIGN: "FOREIGN",
} as const;
export type TourType = (typeof TourType)[keyof typeof TourType];

export const TourStatus = {
  /** Waiting for the head of department (the approver the traveller named). */
  PENDING_HOD: "PENDING_HOD",
  /** Waiting for HR & Finance to vet the budget and allowances. */
  PENDING_VETTING: "PENDING_VETTING",
  /** Overseas only: waiting for the MD's or Chairman's sanction. */
  PENDING_SANCTION: "PENDING_SANCTION",
  /** Approved, funds sanctioned; not yet travelling. */
  APPROVED: "APPROVED",
  /** The traveller is on the tour. */
  ACTIVE: "ACTIVE",
  COMPLETED: "COMPLETED",
  REJECTED: "REJECTED",
  CANCELLED: "CANCELLED",
} as const;
export type TourStatus = (typeof TourStatus)[keyof typeof TourStatus];

export const TourPurpose = {
  CONFERENCE: "CONFERENCE",
  TECHNICAL_INSPECTION: "TECHNICAL_INSPECTION",
  VENDOR_AUDIT: "VENDOR_AUDIT",
  TRAINING: "TRAINING",
  CLIENT_MEETING: "CLIENT_MEETING",
  PLANT_VISIT: "PLANT_VISIT",
  OTHER: "OTHER",
} as const;
export type TourPurpose = (typeof TourPurpose)[keyof typeof TourPurpose];

export const TransportMode = {
  AIR: "AIR",
  ROAD: "ROAD",
  RAIL: "RAIL",
  WATER: "WATER",
  POOL_CAR: "POOL_CAR",
} as const;
export type TransportMode = (typeof TransportMode)[keyof typeof TransportMode];

export const TourUpdateType = {
  SUBMITTED: "SUBMITTED",
  STATUS_CHANGED: "STATUS_CHANGED",
  NOTE_ADDED: "NOTE_ADDED",
  BUDGET_CHANGED: "BUDGET_CHANGED",
} as const;
export type TourUpdateType = (typeof TourUpdateType)[keyof typeof TourUpdateType];

/**
 * Allowed moves. Who may make each move is decided by the API: the named
 * approver (HOD), HR & Finance (vetting), the MD / Chairman (sanction), the
 * traveller (start, complete, cancel before approval).
 */
export const TOUR_TRANSITIONS: Record<TourStatus, readonly TourStatus[]> = {
  PENDING_HOD: [TourStatus.PENDING_VETTING, TourStatus.REJECTED, TourStatus.CANCELLED],
  PENDING_VETTING: [TourStatus.PENDING_SANCTION, TourStatus.APPROVED, TourStatus.REJECTED, TourStatus.CANCELLED],
  PENDING_SANCTION: [TourStatus.APPROVED, TourStatus.REJECTED, TourStatus.CANCELLED],
  APPROVED: [TourStatus.ACTIVE, TourStatus.CANCELLED],
  ACTIVE: [TourStatus.COMPLETED],
  COMPLETED: [],
  REJECTED: [],
  CANCELLED: [],
};

export function canTourTransition(from: string, to: string): boolean {
  return TOUR_TRANSITIONS[from as TourStatus]?.includes(to as TourStatus) ?? false;
}

/** Waiting for an approval decision. */
export const OPEN_TOUR_STATUSES: readonly TourStatus[] = [TourStatus.PENDING_HOD, TourStatus.PENDING_VETTING, TourStatus.PENDING_SANCTION];

/** Finished one way or another: nothing more will happen. */
export const CLOSED_TOUR_STATUSES: readonly TourStatus[] = [TourStatus.COMPLETED, TourStatus.REJECTED, TourStatus.CANCELLED];

/** Approved with funds sanctioned (whether or not the trip has happened yet). Counts against the travel budget. */
export const SANCTIONED_TOUR_STATUSES: readonly TourStatus[] = [TourStatus.APPROVED, TourStatus.ACTIVE, TourStatus.COMPLETED];

/** Whose decision a pending request is waiting for. */
export const TourAwaiting = {
  HOD: "HOD",
  VETTING: "VETTING",
  SANCTION: "SANCTION",
} as const;
export type TourAwaiting = (typeof TourAwaiting)[keyof typeof TourAwaiting];

export const TOUR_AWAITING: Partial<Record<TourStatus, TourAwaiting>> = {
  PENDING_HOD: TourAwaiting.HOD,
  PENDING_VETTING: TourAwaiting.VETTING,
  PENDING_SANCTION: TourAwaiting.SANCTION,
};

export const TOUR_AWAITING_LABEL: Record<TourAwaiting, string> = {
  HOD: "Head of department",
  VETTING: "HR & Finance",
  SANCTION: "MD / Chairman",
};

/** The stage a pending status belongs to, or null once the request has left the approval chain. */
export function tourAwaiting(status: string): TourAwaiting | null {
  return TOUR_AWAITING[status as TourStatus] ?? null;
}

/** What a viewer may do now; the API lists these in `viewer.actions` and re-checks each one. */
export const TourAction = {
  APPROVE: "APPROVE",
  REJECT: "REJECT",
  START: "START",
  COMPLETE: "COMPLETE",
  CANCEL: "CANCEL",
  ADD_NOTE: "ADD_NOTE",
} as const;
export type TourAction = (typeof TourAction)[keyof typeof TourAction];

export const TourDecision = {
  APPROVE: "APPROVE",
  REJECT: "REJECT",
} as const;
export type TourDecision = (typeof TourDecision)[keyof typeof TourDecision];

/** The stages a tour of this type passes through, for progress steppers. */
export function tourPipeline(type: string): TourStatus[] {
  return type === TourType.FOREIGN
    ? [TourStatus.PENDING_HOD, TourStatus.PENDING_VETTING, TourStatus.PENDING_SANCTION, TourStatus.APPROVED, TourStatus.ACTIVE, TourStatus.COMPLETED]
    : [TourStatus.PENDING_HOD, TourStatus.PENDING_VETTING, TourStatus.APPROVED, TourStatus.ACTIVE, TourStatus.COMPLETED];
}

export const TOUR_TYPE_LABEL: Record<TourType, string> = { LOCAL: "Local", FOREIGN: "Foreign" };

export const TOUR_STATUS_LABEL: Record<TourStatus, string> = {
  PENDING_HOD: "Pending HOD approval",
  PENDING_VETTING: "HR & Finance vetting",
  PENDING_SANCTION: "MD / Chairman sanction",
  APPROVED: "Approved & funds sanctioned",
  ACTIVE: "Tour active",
  COMPLETED: "Completed",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
};

/** Short labels for steppers and narrow badges. */
export const TOUR_STAGE_LABEL: Record<TourStatus, string> = {
  PENDING_HOD: "HOD",
  PENDING_VETTING: "HR & Finance",
  PENDING_SANCTION: "MD / Chairman",
  APPROVED: "Approved",
  ACTIVE: "On tour",
  COMPLETED: "Completed",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
};

export const TOUR_STATUS_TONE: Record<TourStatus, StatusTone> = {
  PENDING_HOD: "pending",
  PENDING_VETTING: "pending",
  PENDING_SANCTION: "pending",
  APPROVED: "success",
  ACTIVE: "active",
  COMPLETED: "neutral",
  REJECTED: "danger",
  CANCELLED: "neutral",
};

export const TOUR_PURPOSE_LABEL: Record<TourPurpose, string> = {
  CONFERENCE: "Conference",
  TECHNICAL_INSPECTION: "Technical inspection",
  VENDOR_AUDIT: "Vendor audit",
  TRAINING: "Training",
  CLIENT_MEETING: "Client meeting",
  PLANT_VISIT: "Plant / site visit",
  OTHER: "Other",
};

export const TRANSPORT_MODE_LABEL: Record<TransportMode, string> = {
  AIR: "Air",
  ROAD: "Road",
  RAIL: "Rail",
  WATER: "Water",
  POOL_CAR: "Pool car",
};

export const TOUR_LIMITS = {
  purposeMin: 3,
  titleMin: 3,
  titleMax: 140,
  descriptionMax: 2000,
  destinationMax: 120,
  countryMax: 60,
  noteMax: 1000,
  /** Rejections and cancellations must say why. */
  reasonMin: 3,
  maxCoTravellers: 10,
  coTravellerNameMax: 80,
  /** Taka. Anything larger is a typing mistake, not a business trip. */
  maxBudget: 100_000_000,
  /** One request covers at most this many days away. */
  maxDurationDays: 90,
  /** Requests can be made at most this far ahead. */
  maxLeadDays: 365,
  /** The traveller may mark the tour started this many days before the start date (overnight departures). */
  startEarlyDays: 1,
  /** Passports must be valid this many months beyond the return date. */
  passportValidityMonths: 6,
} as const;

/** Passport numbers: letters and digits, e.g. A01234567 or EB0123456. */
export const PASSPORT_NUMBER_PATTERN = /^[A-Z0-9]{6,12}$/;

/** Group-wide annual travel budget (Taka), kept in app_settings. */
export const TOUR_SETTING_ANNUAL_BUDGET = "tours.annualTravelBudget";
export const DEFAULT_ANNUAL_TRAVEL_BUDGET = 6_500_000;

/** ABG-TR-YYYY-NNN, e.g. ABG-TR-2026-088 (numbered per calendar year). */
export function formatTourNumber(year: number, sequence: number): string {
  return `ABG-TR-${year}-${String(sequence).padStart(3, "0")}`;
}

/** True when the passport expires less than six months after the tour ends. */
export function passportNeedsRenewal(passportExpiry: Date | string | null | undefined, tourEnd: Date | string): boolean {
  if (!passportExpiry) return false;
  const end = new Date(tourEnd);
  const limit = new Date(end);
  limit.setUTCMonth(limit.getUTCMonth() + TOUR_LIMITS.passportValidityMonths);
  return new Date(passportExpiry).getTime() < limit.getTime();
}

/** Days away, counting both the first and the last day. Dates are YYYY-MM-DD or UTC-midnight dates. */
export function tourDurationDays(start: Date | string, end: Date | string): number {
  const a = new Date(start).getTime();
  const b = new Date(end).getTime();
  return Math.max(1, Math.round((b - a) / 86_400_000) + 1);
}

/**
 * Taka with South Asian digit grouping, e.g. 6500000 → "৳ 65,00,000".
 * Whole Taka only; budgets are never fractional.
 */
export function formatTaka(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || !Number.isFinite(amount)) return "—";
  const negative = amount < 0;
  const digits = String(Math.round(Math.abs(amount)));
  const last3 = digits.slice(-3);
  const rest = digits.slice(0, -3);
  const grouped = rest ? `${rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",")},${last3}` : last3;
  return `${negative ? "-" : ""}৳ ${grouped}`;
}

/** Short Taka for tight spaces: ৳ 4.85 L (lakh), ৳ 1.2 Cr (crore). */
export function formatTakaShort(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || !Number.isFinite(amount)) return "—";
  const abs = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";
  const trim = (n: number, places: number) => n.toFixed(places).replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
  if (abs >= 10_000_000) return `${sign}৳ ${trim(abs / 10_000_000, 2)} Cr`;
  if (abs >= 100_000) return `${sign}৳ ${trim(abs / 100_000, 2)} L`;
  return formatTaka(amount);
}
