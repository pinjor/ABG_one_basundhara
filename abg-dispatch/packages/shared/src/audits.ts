import type { StatusTone } from "./labels";

/**
 * Audits: compliance plans an audit at an office (internal, regulatory,
 * fire & safety, buyer, ISO…), records what the auditors found, gives each
 * finding an owner and a due date for the corrective action, verifies the
 * fixes, and closes the audit once nothing is left open.
 *
 * Not to be confused with the audit log (`audit.view`), the record of who
 * changed what in ABG ONE.
 */
export const AuditType = {
  INTERNAL: "INTERNAL",
  COMPLIANCE: "COMPLIANCE",
  SAFETY: "SAFETY",
  BUYER: "BUYER",
  ISO: "ISO",
  FINANCIAL: "FINANCIAL",
  ENVIRONMENT: "ENVIRONMENT",
} as const;
export type AuditType = (typeof AuditType)[keyof typeof AuditType];

export const AuditStatus = {
  PLANNED: "PLANNED",
  IN_PROGRESS: "IN_PROGRESS",
  /** Fieldwork done; corrective actions are still open. */
  FOLLOW_UP: "FOLLOW_UP",
  CLOSED: "CLOSED",
  CANCELLED: "CANCELLED",
} as const;
export type AuditStatus = (typeof AuditStatus)[keyof typeof AuditStatus];

export const AUDIT_TRANSITIONS: Record<AuditStatus, readonly AuditStatus[]> = {
  PLANNED: [AuditStatus.IN_PROGRESS, AuditStatus.CANCELLED],
  IN_PROGRESS: [AuditStatus.FOLLOW_UP, AuditStatus.CLOSED, AuditStatus.CANCELLED],
  FOLLOW_UP: [AuditStatus.CLOSED],
  CLOSED: [],
  CANCELLED: [],
};

export function canAuditTransition(from: string, to: string): boolean {
  return AUDIT_TRANSITIONS[from as AuditStatus]?.includes(to as AuditStatus) ?? false;
}

export const OPEN_AUDIT_STATUSES: readonly AuditStatus[] = [AuditStatus.PLANNED, AuditStatus.IN_PROGRESS, AuditStatus.FOLLOW_UP];

/** The overall result recorded when fieldwork ends. */
export const AuditRating = {
  SATISFACTORY: "SATISFACTORY",
  NEEDS_IMPROVEMENT: "NEEDS_IMPROVEMENT",
  UNSATISFACTORY: "UNSATISFACTORY",
} as const;
export type AuditRating = (typeof AuditRating)[keyof typeof AuditRating];

export const FindingSeverity = {
  CRITICAL: "CRITICAL",
  MAJOR: "MAJOR",
  MINOR: "MINOR",
  /** A note for improvement; no corrective action is owed. */
  OBSERVATION: "OBSERVATION",
} as const;
export type FindingSeverity = (typeof FindingSeverity)[keyof typeof FindingSeverity];

export const FindingStatus = {
  /** Corrective action owed by the owner. */
  OPEN: "OPEN",
  /** The owner says it is fixed; waiting for the auditor to verify. */
  SUBMITTED: "SUBMITTED",
  /** The auditor checked the fix. */
  VERIFIED: "VERIFIED",
  /** An observation: recorded, nothing owed. */
  NOTED: "NOTED",
} as const;
export type FindingStatus = (typeof FindingStatus)[keyof typeof FindingStatus];

export const FINDING_TRANSITIONS: Record<FindingStatus, readonly FindingStatus[]> = {
  // The auditor may verify straight away when the fix was made during the audit.
  OPEN: [FindingStatus.SUBMITTED, FindingStatus.VERIFIED],
  // Sent back to OPEN when the fix is not good enough.
  SUBMITTED: [FindingStatus.VERIFIED, FindingStatus.OPEN],
  VERIFIED: [],
  NOTED: [],
};

export function canFindingTransition(from: string, to: string): boolean {
  return FINDING_TRANSITIONS[from as FindingStatus]?.includes(to as FindingStatus) ?? false;
}

/** Findings that keep an audit from closing. */
export const OPEN_FINDING_STATUSES: readonly FindingStatus[] = [FindingStatus.OPEN, FindingStatus.SUBMITTED];

export const AuditUpdateType = {
  CREATED: "CREATED",
  STATUS_CHANGED: "STATUS_CHANGED",
  FINDING_ADDED: "FINDING_ADDED",
  FINDING_SUBMITTED: "FINDING_SUBMITTED",
  FINDING_VERIFIED: "FINDING_VERIFIED",
  FINDING_REOPENED: "FINDING_REOPENED",
  FINDING_REASSIGNED: "FINDING_REASSIGNED",
  NOTE_ADDED: "NOTE_ADDED",
} as const;
export type AuditUpdateType = (typeof AuditUpdateType)[keyof typeof AuditUpdateType];

export const AuditAction = {
  START: "START",
  ADD_FINDING: "ADD_FINDING",
  COMPLETE_FIELDWORK: "COMPLETE_FIELDWORK",
  CLOSE: "CLOSE",
  CANCEL: "CANCEL",
  ADD_NOTE: "ADD_NOTE",
} as const;
export type AuditAction = (typeof AuditAction)[keyof typeof AuditAction];

export const FindingAction = {
  SUBMIT: "SUBMIT",
  VERIFY: "VERIFY",
  REOPEN: "REOPEN",
  REASSIGN: "REASSIGN",
} as const;
export type FindingAction = (typeof FindingAction)[keyof typeof FindingAction];

export const AUDIT_TYPE_LABEL: Record<AuditType, string> = {
  INTERNAL: "Internal audit",
  COMPLIANCE: "Regulatory compliance",
  SAFETY: "Fire & safety",
  BUYER: "Buyer / customer audit",
  ISO: "ISO certification",
  FINANCIAL: "Financial / stock audit",
  ENVIRONMENT: "Environmental",
};

export const AUDIT_STATUS_LABEL: Record<AuditStatus, string> = {
  PLANNED: "Planned",
  IN_PROGRESS: "In progress",
  FOLLOW_UP: "Actions open",
  CLOSED: "Closed",
  CANCELLED: "Cancelled",
};

export const AUDIT_STATUS_TONE: Record<AuditStatus, StatusTone> = {
  PLANNED: "neutral",
  IN_PROGRESS: "active",
  FOLLOW_UP: "pending",
  CLOSED: "success",
  CANCELLED: "neutral",
};

export const AUDIT_RATING_LABEL: Record<AuditRating, string> = {
  SATISFACTORY: "Satisfactory",
  NEEDS_IMPROVEMENT: "Needs improvement",
  UNSATISFACTORY: "Unsatisfactory",
};

export const AUDIT_RATING_TONE: Record<AuditRating, StatusTone> = {
  SATISFACTORY: "success",
  NEEDS_IMPROVEMENT: "pending",
  UNSATISFACTORY: "danger",
};

export const FINDING_SEVERITY_LABEL: Record<FindingSeverity, string> = {
  CRITICAL: "Critical",
  MAJOR: "Major",
  MINOR: "Minor",
  OBSERVATION: "Observation",
};

export const FINDING_SEVERITY_TONE: Record<FindingSeverity, StatusTone> = {
  CRITICAL: "danger",
  MAJOR: "danger",
  MINOR: "pending",
  OBSERVATION: "neutral",
};

export const FINDING_SEVERITY_ORDER: readonly FindingSeverity[] = [FindingSeverity.CRITICAL, FindingSeverity.MAJOR, FindingSeverity.MINOR, FindingSeverity.OBSERVATION];

export const FINDING_STATUS_LABEL: Record<FindingStatus, string> = {
  OPEN: "Action open",
  SUBMITTED: "Fix submitted",
  VERIFIED: "Verified",
  NOTED: "Noted",
};

export const FINDING_STATUS_TONE: Record<FindingStatus, StatusTone> = {
  OPEN: "pending",
  SUBMITTED: "active",
  VERIFIED: "success",
  NOTED: "neutral",
};

/** Default time to fix, by severity (days from the day the finding is recorded). */
export const FINDING_DUE_DAYS: Record<Exclude<FindingSeverity, "OBSERVATION">, number> = {
  CRITICAL: 7,
  MAJOR: 30,
  MINOR: 60,
};

export const AUDIT_LIMITS = {
  titleMin: 3,
  titleMax: 140,
  scopeMax: 2000,
  bodyMax: 120,
  teamMax: 8,
  teamNameMax: 80,
  findingTitleMin: 3,
  findingTitleMax: 160,
  findingDetailMax: 2000,
  clauseMax: 80,
  noteMax: 1000,
  reasonMin: 3,
  /** Planned at most this far ahead. */
  maxLeadDays: 365,
  /** Fieldwork spans at most this many days. */
  maxDurationDays: 30,
  /** Corrective actions are due at most this far out. */
  maxDueDays: 365,
} as const;

/** ABG-AU-YYYY-NNN, e.g. ABG-AU-2026-012. */
export function formatAuditNumber(year: number, sequence: number): string {
  return `ABG-AU-${year}-${String(sequence).padStart(3, "0")}`;
}

/** F-01, F-02… within an audit. */
export function formatFindingNumber(sequence: number): string {
  return `F-${String(sequence).padStart(2, "0")}`;
}

/** True once an open corrective action's due date (YYYY-MM-DD) has passed in Asia/Dhaka. */
export function findingOverdue(status: string, dueDate: string | null | undefined, today: string): boolean {
  return !!dueDate && status === FindingStatus.OPEN && dueDate < today;
}
