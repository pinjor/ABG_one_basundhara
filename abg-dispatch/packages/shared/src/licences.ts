import type { StatusTone } from "./labels";

/**
 * Regulatory licence register: every licence, permit and certificate the
 * group's sites must hold, with expiry countdowns, renewal progress, scanned
 * copies and automatic escalation as expiry approaches.
 */
export const LicenceCategory = {
  TRADE: "TRADE",
  FACTORY: "FACTORY",
  ENVIRONMENT: "ENVIRONMENT",
  FIRE_SAFETY: "FIRE_SAFETY",
  ENERGY_REGULATORY: "ENERGY_REGULATORY",
  EXPLOSIVES: "EXPLOSIVES",
  BOILER: "BOILER",
  IMPORT_EXPORT: "IMPORT_EXPORT",
  STANDARDS: "STANDARDS",
  OTHER: "OTHER",
} as const;
export type LicenceCategory = (typeof LicenceCategory)[keyof typeof LicenceCategory];

/** Where a renewal has got to; drives the progress bar. */
export const RenewalStage = {
  NOT_STARTED: "NOT_STARTED",
  DOCUMENTS_PREPARED: "DOCUMENTS_PREPARED",
  APPLICATION_SUBMITTED: "APPLICATION_SUBMITTED",
  INSPECTION_SCHEDULED: "INSPECTION_SCHEDULED",
  FEE_PAID: "FEE_PAID",
  RENEWED: "RENEWED",
} as const;
export type RenewalStage = (typeof RenewalStage)[keyof typeof RenewalStage];

export const RENEWAL_STAGES: readonly RenewalStage[] = [
  RenewalStage.NOT_STARTED,
  RenewalStage.DOCUMENTS_PREPARED,
  RenewalStage.APPLICATION_SUBMITTED,
  RenewalStage.INSPECTION_SCHEDULED,
  RenewalStage.FEE_PAID,
  RenewalStage.RENEWED,
];

/** A licence's standing, worked out from its expiry date. */
export const LicenceState = {
  VALID: "VALID",
  /** Inside its renewal window (renewalLeadDays). */
  DUE_SOON: "DUE_SOON",
  /** 30 days or less to go. */
  EXPIRING: "EXPIRING",
  EXPIRED: "EXPIRED",
} as const;
export type LicenceState = (typeof LicenceState)[keyof typeof LicenceState];

export const LicenceEventType = {
  CREATED: "CREATED",
  DETAILS_CHANGED: "DETAILS_CHANGED",
  RENEWAL_STAGE_CHANGED: "RENEWAL_STAGE_CHANGED",
  RENEWED: "RENEWED",
  DOCUMENT_UPLOADED: "DOCUMENT_UPLOADED",
  ESCALATED: "ESCALATED",
  NOTE_ADDED: "NOTE_ADDED",
} as const;
export type LicenceEventType = (typeof LicenceEventType)[keyof typeof LicenceEventType];

/** Days before expiry at which the register raises an alert, each once per expiry date. */
export const LICENCE_ALERT_DAYS: readonly number[] = [90, 60, 30, 15, 7, 0];

const DAY_MS = 86_400_000;

export function daysUntil(expiresAt: Date | string, now: Date = new Date()): number {
  return Math.ceil((new Date(expiresAt).getTime() - now.getTime()) / DAY_MS);
}

export function licenceState(expiresAt: Date | string, renewalLeadDays = 90, now: Date = new Date()): LicenceState {
  const days = daysUntil(expiresAt, now);
  if (days < 0) return LicenceState.EXPIRED;
  if (days <= 30) return LicenceState.EXPIRING;
  if (days <= renewalLeadDays) return LicenceState.DUE_SOON;
  return LicenceState.VALID;
}

/** 0–100 for the renewal progress bar. */
export function renewalProgress(stage: string): number {
  const i = RENEWAL_STAGES.indexOf(stage as RenewalStage);
  return i <= 0 ? 0 : Math.round((i / (RENEWAL_STAGES.length - 1)) * 100);
}

export const LICENCE_CATEGORY_LABEL: Record<LicenceCategory, string> = {
  TRADE: "Trade licence",
  FACTORY: "Factory licence",
  ENVIRONMENT: "Environmental clearance",
  FIRE_SAFETY: "Fire safety",
  ENERGY_REGULATORY: "Energy regulatory (BERC)",
  EXPLOSIVES: "Explosives / LPG storage",
  BOILER: "Boiler certificate",
  IMPORT_EXPORT: "Import / export (IRC / ERC)",
  STANDARDS: "Standards (BSTI)",
  OTHER: "Other",
};

export const RENEWAL_STAGE_LABEL: Record<RenewalStage, string> = {
  NOT_STARTED: "Not started",
  DOCUMENTS_PREPARED: "Documents prepared",
  APPLICATION_SUBMITTED: "Application submitted",
  INSPECTION_SCHEDULED: "Inspection scheduled",
  FEE_PAID: "Fee paid",
  RENEWED: "Renewed",
};

export const LICENCE_STATE_LABEL: Record<LicenceState, string> = {
  VALID: "Valid",
  DUE_SOON: "Renewal due",
  EXPIRING: "Expiring",
  EXPIRED: "Expired",
};

export const LICENCE_STATE_TONE: Record<LicenceState, StatusTone> = {
  VALID: "success",
  DUE_SOON: "pending",
  EXPIRING: "danger",
  EXPIRED: "danger",
};

export const LICENCE_LIMITS = {
  nameMax: 160,
  numberMax: 80,
  authorityMax: 160,
  noteMax: 1000,
  minLeadDays: 7,
  maxLeadDays: 365,
} as const;
