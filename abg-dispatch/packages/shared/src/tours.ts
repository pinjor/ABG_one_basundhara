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

export const OPEN_TOUR_STATUSES: readonly TourStatus[] = [TourStatus.PENDING_HOD, TourStatus.PENDING_VETTING, TourStatus.PENDING_SANCTION];

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
  titleMax: 140,
  descriptionMax: 2000,
  noteMax: 1000,
  maxCoTravellers: 10,
  /** Passports must be valid this many months beyond the return date. */
  passportValidityMonths: 6,
} as const;

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
