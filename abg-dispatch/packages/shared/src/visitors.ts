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

export const VISITOR_LIMITS = {
  nameMin: 2,
  nameMax: 120,
  companyMax: 120,
  noteMax: 500,
  maxPartySize: 20,
} as const;

/** VP-YYMMDD-OFFICE-NNN, e.g. VP-261021-FCA-012 — the gate pass number. */
export function formatVisitorPassNumber(dayStamp: string, branchCode: string, sequence: number): string {
  return `VP-${dayStamp}-${branchCode}-${String(sequence).padStart(3, "0")}`;
}
