import type { StatusTone } from "./labels";

/**
 * Factory and office visitor management: a host pre-registers a visitor (or
 * the gate registers a walk-in), the visitor gets a digital gate pass with a
 * QR code, and security checks them in and out. The on-site count is live.
 */
export const VisitPurpose = {
  MEETING: "MEETING",
  INTERVIEW: "INTERVIEW",
  VENDOR_SUPPLIER: "VENDOR_SUPPLIER",
  CONTRACTOR: "CONTRACTOR",
  AUDIT_INSPECTION: "AUDIT_INSPECTION",
  GOVERNMENT_OFFICIAL: "GOVERNMENT_OFFICIAL",
  DELIVERY: "DELIVERY",
  PERSONAL: "PERSONAL",
  OTHER: "OTHER",
} as const;
export type VisitPurpose = (typeof VisitPurpose)[keyof typeof VisitPurpose];

export const VisitStatus = {
  /** Pre-registered by the host; not yet arrived. */
  EXPECTED: "EXPECTED",
  /** At the site now. */
  CHECKED_IN: "CHECKED_IN",
  CHECKED_OUT: "CHECKED_OUT",
  CANCELLED: "CANCELLED",
  /** Never arrived; the pass lapsed at the end of its day. */
  EXPIRED: "EXPIRED",
} as const;
export type VisitStatus = (typeof VisitStatus)[keyof typeof VisitStatus];

export const VISIT_TRANSITIONS: Record<VisitStatus, readonly VisitStatus[]> = {
  EXPECTED: [VisitStatus.CHECKED_IN, VisitStatus.CANCELLED, VisitStatus.EXPIRED],
  CHECKED_IN: [VisitStatus.CHECKED_OUT],
  CHECKED_OUT: [],
  CANCELLED: [],
  EXPIRED: [],
};

export function canVisitTransition(from: string, to: string): boolean {
  return VISIT_TRANSITIONS[from as VisitStatus]?.includes(to as VisitStatus) ?? false;
}

/** Statuses after which nothing more can happen to a visit. */
export const CLOSED_VISIT_STATUSES: readonly VisitStatus[] = [VisitStatus.CHECKED_OUT, VisitStatus.CANCELLED, VisitStatus.EXPIRED];

/** The order purposes appear in pickers and charts: the factory's most common reasons first. */
export const VISIT_PURPOSE_ORDER: readonly VisitPurpose[] = [
  VisitPurpose.VENDOR_SUPPLIER,
  VisitPurpose.CONTRACTOR,
  VisitPurpose.DELIVERY,
  VisitPurpose.AUDIT_INSPECTION,
  VisitPurpose.MEETING,
  VisitPurpose.INTERVIEW,
  VisitPurpose.GOVERNMENT_OFFICIAL,
  VisitPurpose.PERSONAL,
  VisitPurpose.OTHER,
];

export const VISIT_PURPOSE_LABEL: Record<VisitPurpose, string> = {
  MEETING: "Meeting",
  INTERVIEW: "Interview",
  VENDOR_SUPPLIER: "Vendor / supplier",
  CONTRACTOR: "Contractor work",
  AUDIT_INSPECTION: "Audit / inspection",
  GOVERNMENT_OFFICIAL: "Government official",
  DELIVERY: "Delivery",
  PERSONAL: "Personal",
  OTHER: "Other",
};

/** One line under each purpose in the pickers, so the gate and the host pick the same one. */
export const VISIT_PURPOSE_HINT: Record<VisitPurpose, string> = {
  MEETING: "Bankers, partners, consultants",
  INTERVIEW: "Job candidates",
  VENDOR_SUPPLIER: "Samples, quotations, supplier visits",
  CONTRACTOR: "Repairs, maintenance, construction",
  AUDIT_INSPECTION: "Buyer audits, DIFE, Fire Service, DoE",
  GOVERNMENT_OFFICIAL: "Officials on duty, utilities, customs",
  DELIVERY: "Couriers, transport, goods drop-off",
  PERSONAL: "Family or personal visitors",
  OTHER: "Anything else",
};

export const VISIT_STATUS_LABEL: Record<VisitStatus, string> = {
  EXPECTED: "Expected",
  CHECKED_IN: "On site",
  CHECKED_OUT: "Checked out",
  CANCELLED: "Cancelled",
  EXPIRED: "Did not arrive",
};

export const VISIT_STATUS_TONE: Record<VisitStatus, StatusTone> = {
  EXPECTED: "pending",
  CHECKED_IN: "active",
  CHECKED_OUT: "success",
  CANCELLED: "neutral",
  EXPIRED: "neutral",
};

/** What a viewer may do to a visit now (`viewer.actions`). */
export const VisitAction = {
  CHECK_IN: "CHECK_IN",
  CHECK_OUT: "CHECK_OUT",
  CANCEL: "CANCEL",
} as const;
export type VisitAction = (typeof VisitAction)[keyof typeof VisitAction];

/**
 * What the gate is told when a pass is scanned. Blocking warnings mean the
 * pass cannot be used here and now; the others are for the guard's attention.
 */
export const PassWarning = {
  /** The pass is for an office the verifier does not cover. */
  WRONG_OFFICE: "WRONG_OFFICE",
  /** The pass is for a later day. */
  WRONG_DAY: "WRONG_DAY",
  /** More than an hour before the expected time. */
  EARLY: "EARLY",
  CANCELLED: "CANCELLED",
  EXPIRED: "EXPIRED",
  ALREADY_OUT: "ALREADY_OUT",
  /** Still on site after the expected end of the visit. */
  OVERSTAY: "OVERSTAY",
} as const;
export type PassWarning = (typeof PassWarning)[keyof typeof PassWarning];

export const BLOCKING_PASS_WARNINGS: readonly PassWarning[] = [
  PassWarning.WRONG_OFFICE,
  PassWarning.WRONG_DAY,
  PassWarning.CANCELLED,
  PassWarning.EXPIRED,
  PassWarning.ALREADY_OUT,
];

export const VISITOR_LIMITS = {
  nameMin: 2,
  nameMax: 120,
  companyMax: 120,
  purposeDetailMax: 200,
  vehicleMax: 40,
  carryingMax: 200,
  badgeMax: 20,
  noteMax: 500,
  maxPartySize: 20,
  /** How far ahead a visit can be pre-registered. */
  maxDaysAhead: 60,
  /** A visitor arriving "now": the expected time may be this many minutes in the past. */
  pastGraceMinutes: 15,
  /** Arriving earlier than this before the expected time raises an EARLY note at the gate. */
  earlyMinutes: 60,
} as const;

/** Bangladeshi mobile numbers: 01[3-9] and eight more digits (Grameenphone, Robi, Banglalink, Teletalk, Airtel). */
export const BD_MOBILE_PATTERN = /^01[3-9]\d{8}$/;

/** "+880 1711-223344", "8801711223344" and "01711 223344" all become "01711223344". */
export function normalizeBdMobile(raw: string): string {
  let digits = String(raw ?? "").replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) digits = digits.slice(1);
  if (digits.startsWith("880")) digits = digits.slice(2);
  if (digits.length === 10 && digits.startsWith("1")) digits = `0${digits}`;
  return digits;
}

export function isBdMobile(raw: string): boolean {
  return BD_MOBILE_PATTERN.test(normalizeBdMobile(raw));
}

/** Only the last four characters of an ID document are ever kept. */
export const ID_LAST4_PATTERN = /^[0-9A-Za-z]{4}$/;

/** VP-YYMMDD-OFFICE-NNN, e.g. VP-261021-FCA-012 — the gate pass number. YYMMDD is the visit's Dhaka day. */
export function formatVisitorPassNumber(dayStamp: string, branchCode: string, sequence: number): string {
  return `VP-${dayStamp}-${branchCode}-${String(sequence).padStart(3, "0")}`;
}

export const VISITOR_PASS_PATTERN = /^VP-(\d{6})-([A-Z0-9]{2,6})-(\d{3,})$/;

/** Accepts what a person types at the gate ("vp 261021 fca 12") and returns the canonical number, or null. */
export function normalizeVisitorPassNumber(raw: string): string | null {
  const m = String(raw ?? "")
    .trim()
    .toUpperCase()
    .match(/^VP[\s-]*(\d{6})[\s-]*([A-Z0-9]{2,6})[\s-]*(\d{1,6})$/);
  if (!m) return null;
  return formatVisitorPassNumber(m[1], m[2], Number(m[3]));
}
