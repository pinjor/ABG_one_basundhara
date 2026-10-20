import type { StatusTone } from "./labels";

/**
 * Workplace incident reports ("see something, say something"): any employee
 * photographs a problem — a cracked wall, an unhygienic cafeteria, a dirty
 * floor — and the office's admins are told at once. The reporter follows the
 * status until it is done.
 */
export const IncidentStatus = {
  PENDING: "PENDING",
  PROCESSING: "PROCESSING",
  DONE: "DONE",
  DECLINED: "DECLINED",
} as const;
export type IncidentStatus = (typeof IncidentStatus)[keyof typeof IncidentStatus];

export const IncidentCategory = {
  BUILDING_DAMAGE: "BUILDING_DAMAGE",
  CLEANLINESS: "CLEANLINESS",
  CAFETERIA_HYGIENE: "CAFETERIA_HYGIENE",
  WASHROOM: "WASHROOM",
  SAFETY_HAZARD: "SAFETY_HAZARD",
  ELECTRICAL: "ELECTRICAL",
  SECURITY: "SECURITY",
  MISCONDUCT: "MISCONDUCT",
  OTHER: "OTHER",
} as const;
export type IncidentCategory = (typeof IncidentCategory)[keyof typeof IncidentCategory];

export const IncidentSeverity = {
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
  URGENT: "URGENT",
} as const;
export type IncidentSeverity = (typeof IncidentSeverity)[keyof typeof IncidentSeverity];

/** Entries on an incident's own history. Append-only, like the custody ledger. */
export const IncidentUpdateType = {
  SUBMITTED: "SUBMITTED",
  STATUS_CHANGED: "STATUS_CHANGED",
  NOTE_ADDED: "NOTE_ADDED",
  PHOTO_ADDED: "PHOTO_ADDED",
  DETAILS_CHANGED: "DETAILS_CHANGED",
} as const;
export type IncidentUpdateType = (typeof IncidentUpdateType)[keyof typeof IncidentUpdateType];

export const IncidentPhotoKind = {
  /** Taken by the reporter: what the problem looks like. */
  REPORT: "REPORT",
  /** Taken by the admin side: proof it was fixed. */
  RESOLUTION: "RESOLUTION",
} as const;
export type IncidentPhotoKind = (typeof IncidentPhotoKind)[keyof typeof IncidentPhotoKind];

/** Done and Declined can be reopened; nothing goes back to Pending once someone has looked at it. */
export const INCIDENT_TRANSITIONS: Record<IncidentStatus, readonly IncidentStatus[]> = {
  PENDING: [IncidentStatus.PROCESSING, IncidentStatus.DONE, IncidentStatus.DECLINED],
  PROCESSING: [IncidentStatus.DONE, IncidentStatus.DECLINED],
  DONE: [IncidentStatus.PROCESSING],
  DECLINED: [IncidentStatus.PROCESSING],
};

export function canIncidentTransition(from: string, to: string): boolean {
  return INCIDENT_TRANSITIONS[from as IncidentStatus]?.includes(to as IncidentStatus) ?? false;
}

export const OPEN_INCIDENT_STATUSES: readonly IncidentStatus[] = [IncidentStatus.PENDING, IncidentStatus.PROCESSING];

export const INCIDENT_LIMITS = {
  maxReportPhotos: 3,
  maxResolutionPhotos: 3,
  titleMin: 3,
  titleMax: 120,
  descriptionMax: 2000,
  locationDetailMax: 160,
  noteMax: 1000,
} as const;

export const INCIDENT_STATUS_LABEL: Record<IncidentStatus, string> = {
  PENDING: "Pending",
  PROCESSING: "Processing",
  DONE: "Done",
  DECLINED: "Declined",
};

export const INCIDENT_STATUS_TONE: Record<IncidentStatus, StatusTone> = {
  PENDING: "pending",
  PROCESSING: "active",
  DONE: "success",
  DECLINED: "neutral",
};

export const INCIDENT_CATEGORY_LABEL: Record<IncidentCategory, string> = {
  BUILDING_DAMAGE: "Building damage",
  CLEANLINESS: "Cleanliness",
  CAFETERIA_HYGIENE: "Cafeteria hygiene",
  WASHROOM: "Washroom",
  SAFETY_HAZARD: "Safety hazard",
  ELECTRICAL: "Electrical",
  SECURITY: "Security",
  MISCONDUCT: "Misconduct",
  OTHER: "Other",
};

/** One-line prompt shown under each category so people pick the right one. */
export const INCIDENT_CATEGORY_HINT: Record<IncidentCategory, string> = {
  BUILDING_DAMAGE: "Cracked or fallen walls, ceiling, leaks, broken doors or windows",
  CLEANLINESS: "Dirty floors, corridors, stairs, overflowing bins",
  CAFETERIA_HYGIENE: "Unclean kitchen or serving area, food safety",
  WASHROOM: "Unclean washroom, no water or soap, blocked drains",
  SAFETY_HAZARD: "Wet floor without a sign, blocked fire exit, trip hazards",
  ELECTRICAL: "Exposed wiring, sparking sockets, lights or fans not working",
  SECURITY: "Unattended gate, broken lock, unknown person",
  MISCONDUCT: "Harassment, theft, fraud or other wrongdoing",
  OTHER: "Anything else the admin team should look at",
};

export const INCIDENT_SEVERITY_LABEL: Record<IncidentSeverity, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
};

/** INC-YYMMDD-OFFICE-NNN, e.g. INC-261020-FCA-007. */
export function formatIncidentNumber(dayStamp: string, branchCode: string, sequence: number): string {
  return `INC-${dayStamp}-${branchCode}-${String(sequence).padStart(3, "0")}`;
}

export function isIncidentNumber(value: string): boolean {
  return /^INC-\d{6}-[A-Z0-9]{2,6}-\d{3,}$/.test(value.trim().toUpperCase());
}

/** What admins see instead of the reporter's name on an anonymous report. */
export const ANONYMOUS_REPORTER = "Anonymous employee";
