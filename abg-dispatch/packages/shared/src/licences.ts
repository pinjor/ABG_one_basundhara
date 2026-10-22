import type { StatusTone } from "./labels";

/**
 * Regulatory licence register: every licence, permit and certificate the
 * group's sites must hold, with expiry countdowns, renewal progress, scanned
 * copies and automatic escalation as expiry approaches.
 *
 * Expiry dates are calendar dates. Every countdown is worked out in whole
 * Asia/Dhaka days, so "expires today" means the same thing on the portal, the
 * phone and in the alert engine whatever the device's own time zone.
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

/**
 * What the register can be filtered by: a state, licences with a renewal under
 * way, or licences retired from the register (no longer required).
 */
export const LicenceFilter = {
  ...LicenceState,
  RENEWAL_IN_PROGRESS: "RENEWAL_IN_PROGRESS",
  RETIRED: "RETIRED",
} as const;
export type LicenceFilter = (typeof LicenceFilter)[keyof typeof LicenceFilter];

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
/** Asia/Dhaka is UTC+6 with no daylight saving. */
const DHAKA_OFFSET_MS = 6 * 3_600_000;

/** Whole Asia/Dhaka calendar days since 1970-01-01 for an instant (or a YYYY-MM-DD date). */
function dhakaDayNumber(value: Date | string): number {
  return Math.floor((new Date(value).getTime() + DHAKA_OFFSET_MS) / DAY_MS);
}

/**
 * Calendar days from today (Asia/Dhaka) to the expiry date: 0 on the expiry
 * date itself, negative once it has passed.
 */
export function daysUntil(expiresAt: Date | string, now: Date = new Date()): number {
  return dhakaDayNumber(expiresAt) - dhakaDayNumber(now);
}

/** Today's date in Asia/Dhaka as YYYY-MM-DD. */
export function dhakaToday(now: Date = new Date()): string {
  return new Date(dhakaDayNumber(now) * DAY_MS).toISOString().slice(0, 10);
}

/** YYYY-MM-DD `days` calendar days after `date` (YYYY-MM-DD). */
export function addCalendarDays(date: string, days: number): string {
  return new Date(new Date(`${date}T00:00:00Z`).getTime() + days * DAY_MS).toISOString().slice(0, 10);
}

/** True for a real calendar date written as YYYY-MM-DD (rejects 2026-02-30). */
export function isCalendarDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

export function licenceStateForDays(days: number, renewalLeadDays = 90): LicenceState {
  if (days < 0) return LicenceState.EXPIRED;
  if (days <= 30) return LicenceState.EXPIRING;
  if (days <= renewalLeadDays) return LicenceState.DUE_SOON;
  return LicenceState.VALID;
}

export function licenceState(expiresAt: Date | string, renewalLeadDays = 90, now: Date = new Date()): LicenceState {
  return licenceStateForDays(daysUntil(expiresAt, now), renewalLeadDays);
}

/** 0–100 for the renewal progress bar. */
export function renewalProgress(stage: string): number {
  const i = RENEWAL_STAGES.indexOf(stage as RenewalStage);
  return i <= 0 ? 0 : Math.round((i / (RENEWAL_STAGES.length - 1)) * 100);
}

/** A renewal is under way once work has started and until the licence is renewed. */
export function isRenewalInProgress(stage: string): boolean {
  return stage !== RenewalStage.NOT_STARTED && stage !== RenewalStage.RENEWED && RENEWAL_STAGES.includes(stage as RenewalStage);
}

/**
 * Stages a renewal can be moved to by hand. Forward moves may skip a stage
 * (not every licence needs an inspection); moving back needs a reason. The
 * final step, Renewed, is only reached by recording the new expiry date.
 */
export function canMoveRenewal(from: string, to: string): boolean {
  const a = RENEWAL_STAGES.indexOf(from as RenewalStage);
  const b = RENEWAL_STAGES.indexOf(to as RenewalStage);
  return a >= 0 && b >= 0 && a !== b && to !== RenewalStage.RENEWED;
}

export function isRenewalMoveBack(from: string, to: string): boolean {
  return RENEWAL_STAGES.indexOf(to as RenewalStage) < RENEWAL_STAGES.indexOf(from as RenewalStage);
}

// ── Escalation ──

/** Who hears about an approaching expiry; each level adds people to the one before. */
export const LicenceAlertLevel = {
  /** The licence's owner and the compliance officers. */
  OWNER: "OWNER",
  /** …and the office's branch admins (30 days or less). */
  OFFICE: "OFFICE",
  /** …and head office admins, the MD and the Chairman (7 days or less, or expired). */
  LEADERSHIP: "LEADERSHIP",
} as const;
export type LicenceAlertLevel = (typeof LicenceAlertLevel)[keyof typeof LicenceAlertLevel];

export const LICENCE_ALERT_LEVEL_LABEL: Record<LicenceAlertLevel, string> = {
  OWNER: "Owner and compliance",
  OFFICE: "Owner, compliance and office admins",
  LEADERSHIP: "Owner, compliance, office admins, head office and MD / Chairman",
};

export function licenceAlertLevel(thresholdDays: number): LicenceAlertLevel {
  if (thresholdDays <= 7) return LicenceAlertLevel.LEADERSHIP;
  if (thresholdDays <= 30) return LicenceAlertLevel.OFFICE;
  return LicenceAlertLevel.OWNER;
}

/**
 * Alert thresholds that apply to a licence. The early warnings (90 and 60
 * days) only fire once the licence is inside its renewal window, so a licence
 * renewed 45 days ahead is not chased at 90; from 30 days every threshold
 * applies whatever the window.
 */
export function licenceAlertThresholds(renewalLeadDays = 90): number[] {
  return LICENCE_ALERT_DAYS.filter((t) => t <= 30 || t <= renewalLeadDays);
}

/** The threshold a licence has reached `daysLeft` before expiry (the smallest one crossed), or null. */
export function licenceAlertThreshold(daysLeft: number, renewalLeadDays = 90): number | null {
  const crossed = licenceAlertThresholds(renewalLeadDays).filter((t) => daysLeft <= t);
  return crossed.length ? Math.min(...crossed) : null;
}

/** An alert is due when a threshold has been reached that is nearer expiry than the last one sent. */
export function isLicenceAlertDue(daysLeft: number, renewalLeadDays: number, lastAlertDays: number | null | undefined): boolean {
  const t = licenceAlertThreshold(daysLeft, renewalLeadDays);
  return t !== null && (lastAlertDays === null || lastAlertDays === undefined || t < lastAlertDays);
}

/** The next threshold still to come for this expiry date, or null when none is left. */
export function nextLicenceAlertDays(daysLeft: number, renewalLeadDays: number, lastAlertDays: number | null | undefined): number | null {
  const ahead = licenceAlertThresholds(renewalLeadDays).filter((t) => t < daysLeft && (lastAlertDays === null || lastAlertDays === undefined || t < lastAlertDays));
  return ahead.length ? Math.max(...ahead) : null;
}

// ── Words ──

/** "12 days left", "Expires today", "Expired 5 days ago" — the countdown badge text. */
export function licenceCountdownLabel(daysLeft: number): string {
  if (daysLeft === 0) return "Expires today";
  if (daysLeft === 1) return "1 day left";
  if (daysLeft > 1) return `${daysLeft} days left`;
  if (daysLeft === -1) return "Expired 1 day ago";
  return `Expired ${-daysLeft} days ago`;
}

/** Tone of the countdown badge: the state's tone, with "expires today" as urgent as expired. */
export function licenceCountdownTone(daysLeft: number, renewalLeadDays = 90): StatusTone {
  return LICENCE_STATE_TONE[licenceStateForDays(daysLeft, renewalLeadDays)];
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

/** The authorities that usually issue each kind of licence in Bangladesh; offered as suggestions. */
export const LICENCE_AUTHORITY_SUGGESTIONS: Record<LicenceCategory, readonly string[]> = {
  TRADE: ["Dhaka North City Corporation", "Dhaka South City Corporation", "Narayanganj City Corporation", "Gazipur City Corporation", "Chattogram City Corporation"],
  FACTORY: ["Department of Inspection for Factories and Establishments (DIFE)"],
  ENVIRONMENT: ["Department of Environment (DoE)"],
  FIRE_SAFETY: ["Fire Service & Civil Defence"],
  ENERGY_REGULATORY: ["Bangladesh Energy Regulatory Commission (BERC)"],
  EXPLOSIVES: ["Department of Explosives"],
  BOILER: ["Office of the Chief Inspector of Boilers"],
  IMPORT_EXPORT: ["Office of the Chief Controller of Imports & Exports (CCI&E)"],
  STANDARDS: ["Bangladesh Standards and Testing Institution (BSTI)"],
  OTHER: [],
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

export const LICENCE_FILTER_LABEL: Record<LicenceFilter, string> = {
  ...LICENCE_STATE_LABEL,
  RENEWAL_IN_PROGRESS: "Renewal in progress",
  RETIRED: "Retired",
};

export const LICENCE_STATE_TONE: Record<LicenceState, StatusTone> = {
  VALID: "success",
  DUE_SOON: "pending",
  EXPIRING: "danger",
  EXPIRED: "danger",
};

export const LICENCE_EVENT_LABEL: Record<LicenceEventType, string> = {
  CREATED: "Added to the register",
  DETAILS_CHANGED: "Details changed",
  RENEWAL_STAGE_CHANGED: "Renewal stage changed",
  RENEWED: "Renewed",
  DOCUMENT_UPLOADED: "Scanned copy uploaded",
  ESCALATED: "Expiry alert sent",
  NOTE_ADDED: "Note added",
};

export const LICENCE_LIMITS = {
  nameMax: 160,
  numberMax: 80,
  authorityMax: 160,
  noteMax: 1000,
  minLeadDays: 7,
  maxLeadDays: 365,
  /** Taka, whole units. */
  feeMax: 100_000_000,
  /** Scanned copies: PDF, JPEG, PNG or WebP. */
  documentMaxBytes: 15 * 1024 * 1024,
} as const;
