import { RoleCode } from "./enums";
import type { StatusTone } from "./labels";

/**
 * Incident & Facility Issue Management ("see something, say something"):
 * any employee reports a problem in one of four groups — Safety & Industrial,
 * Admin & Facility, Security, IT/Technical — with a severity tag and photos.
 * The office's admins (head office only, for a confidential report) take it
 * through Reported → Acknowledged → Under Investigation → Closed, and the
 * reporter follows every stage.
 */
export const IncidentStatus = {
  REPORTED: "REPORTED",
  ACKNOWLEDGED: "ACKNOWLEDGED",
  UNDER_INVESTIGATION: "UNDER_INVESTIGATION",
  CLOSED: "CLOSED",
} as const;
export type IncidentStatus = (typeof IncidentStatus)[keyof typeof IncidentStatus];

/** The four stages in the order the tracker shows them. */
export const INCIDENT_STAGES: readonly IncidentStatus[] = [IncidentStatus.REPORTED, IncidentStatus.ACKNOWLEDGED, IncidentStatus.UNDER_INVESTIGATION, IncidentStatus.CLOSED];

/** The four categories the client's specification names. */
export const IncidentGroup = {
  SAFETY_INDUSTRIAL: "SAFETY_INDUSTRIAL",
  ADMIN_FACILITY: "ADMIN_FACILITY",
  SECURITY: "SECURITY",
  IT_TECHNICAL: "IT_TECHNICAL",
} as const;
export type IncidentGroup = (typeof IncidentGroup)[keyof typeof IncidentGroup];

export const INCIDENT_GROUPS: readonly IncidentGroup[] = [IncidentGroup.SAFETY_INDUSTRIAL, IncidentGroup.ADMIN_FACILITY, IncidentGroup.SECURITY, IncidentGroup.IT_TECHNICAL];

/** Sub-categories; each belongs to exactly one group (INCIDENT_CATEGORY_GROUP). */
export const IncidentCategory = {
  // Safety & Industrial
  FIRE_HAZARD: "FIRE_HAZARD",
  GAS_LEAK: "GAS_LEAK",
  CHEMICAL_SPILL: "CHEMICAL_SPILL",
  INJURY_NEAR_MISS: "INJURY_NEAR_MISS",
  ELECTRICAL_HAZARD: "ELECTRICAL_HAZARD",
  MACHINERY_FAULT: "MACHINERY_FAULT",
  PPE_VIOLATION: "PPE_VIOLATION",
  SAFETY_HAZARD: "SAFETY_HAZARD",
  // Admin & Facility
  BUILDING_DAMAGE: "BUILDING_DAMAGE",
  CLEANLINESS: "CLEANLINESS",
  CAFETERIA_HYGIENE: "CAFETERIA_HYGIENE",
  WASHROOM: "WASHROOM",
  WATER_SUPPLY: "WATER_SUPPLY",
  AC_VENTILATION: "AC_VENTILATION",
  FURNITURE_FIXTURES: "FURNITURE_FIXTURES",
  PEST_CONTROL: "PEST_CONTROL",
  OTHER: "OTHER",
  // Security
  UNAUTHORISED_ACCESS: "UNAUTHORISED_ACCESS",
  THEFT_LOSS: "THEFT_LOSS",
  CCTV_FAULT: "CCTV_FAULT",
  GATE_LOCK: "GATE_LOCK",
  MISCONDUCT: "MISCONDUCT",
  // IT / Technical
  NETWORK_DOWN: "NETWORK_DOWN",
  COMPUTER_PRINTER: "COMPUTER_PRINTER",
  SOFTWARE_ACCESS: "SOFTWARE_ACCESS",
  TELEPHONE: "TELEPHONE",
  POWER_UPS: "POWER_UPS",
} as const;
export type IncidentCategory = (typeof IncidentCategory)[keyof typeof IncidentCategory];

/** Sub-categories of each group, in the order the apps list them. */
export const INCIDENT_GROUP_CATEGORIES: Record<IncidentGroup, readonly IncidentCategory[]> = {
  SAFETY_INDUSTRIAL: [
    IncidentCategory.FIRE_HAZARD,
    IncidentCategory.GAS_LEAK,
    IncidentCategory.CHEMICAL_SPILL,
    IncidentCategory.INJURY_NEAR_MISS,
    IncidentCategory.ELECTRICAL_HAZARD,
    IncidentCategory.MACHINERY_FAULT,
    IncidentCategory.PPE_VIOLATION,
    IncidentCategory.SAFETY_HAZARD,
  ],
  ADMIN_FACILITY: [
    IncidentCategory.BUILDING_DAMAGE,
    IncidentCategory.CLEANLINESS,
    IncidentCategory.CAFETERIA_HYGIENE,
    IncidentCategory.WASHROOM,
    IncidentCategory.WATER_SUPPLY,
    IncidentCategory.AC_VENTILATION,
    IncidentCategory.FURNITURE_FIXTURES,
    IncidentCategory.PEST_CONTROL,
    IncidentCategory.OTHER,
  ],
  SECURITY: [IncidentCategory.UNAUTHORISED_ACCESS, IncidentCategory.THEFT_LOSS, IncidentCategory.CCTV_FAULT, IncidentCategory.GATE_LOCK, IncidentCategory.MISCONDUCT],
  IT_TECHNICAL: [IncidentCategory.NETWORK_DOWN, IncidentCategory.COMPUTER_PRINTER, IncidentCategory.SOFTWARE_ACCESS, IncidentCategory.TELEPHONE, IncidentCategory.POWER_UPS],
};

/** The group a sub-category belongs to. Stored on the incident too, for filtering. */
export const INCIDENT_CATEGORY_GROUP = Object.fromEntries(
  INCIDENT_GROUPS.flatMap((g) => INCIDENT_GROUP_CATEGORIES[g].map((c) => [c, g] as const)),
) as Record<IncidentCategory, IncidentGroup>;

export function incidentGroupOf(category: string): IncidentGroup | null {
  return INCIDENT_CATEGORY_GROUP[category as IncidentCategory] ?? null;
}

/** Most severe first: the order of the pickers and the tags. */
export const IncidentSeverity = {
  CRITICAL: "CRITICAL",
  HIGH: "HIGH",
  MEDIUM: "MEDIUM",
  LOW: "LOW",
} as const;
export type IncidentSeverity = (typeof IncidentSeverity)[keyof typeof IncidentSeverity];

export const INCIDENT_SEVERITIES: readonly IncidentSeverity[] = [IncidentSeverity.CRITICAL, IncidentSeverity.HIGH, IncidentSeverity.MEDIUM, IncidentSeverity.LOW];

/** Critical and High are the "urgent" ones: titled so in alerts and counted in urgentOpen. */
export const URGENT_INCIDENT_SEVERITIES: readonly IncidentSeverity[] = [IncidentSeverity.CRITICAL, IncidentSeverity.HIGH];

/** How a report was closed. Every resolution but RESOLVED needs a note for the reporter. */
export const IncidentResolution = {
  RESOLVED: "RESOLVED",
  NO_ACTION_NEEDED: "NO_ACTION_NEEDED",
  DUPLICATE: "DUPLICATE",
  REFERRED: "REFERRED",
} as const;
export type IncidentResolution = (typeof IncidentResolution)[keyof typeof IncidentResolution];

export const INCIDENT_RESOLUTIONS: readonly IncidentResolution[] = [IncidentResolution.RESOLVED, IncidentResolution.NO_ACTION_NEEDED, IncidentResolution.DUPLICATE, IncidentResolution.REFERRED];

export function incidentResolutionNeedsNote(resolution: string): boolean {
  return resolution !== IncidentResolution.RESOLVED;
}

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

/**
 * Forward only, stages may be skipped, and a closed report can be reopened
 * into Under Investigation. Nothing ever returns to Reported.
 */
export const INCIDENT_TRANSITIONS: Record<IncidentStatus, readonly IncidentStatus[]> = {
  REPORTED: [IncidentStatus.ACKNOWLEDGED, IncidentStatus.UNDER_INVESTIGATION, IncidentStatus.CLOSED],
  ACKNOWLEDGED: [IncidentStatus.UNDER_INVESTIGATION, IncidentStatus.CLOSED],
  UNDER_INVESTIGATION: [IncidentStatus.CLOSED],
  CLOSED: [IncidentStatus.UNDER_INVESTIGATION],
};

export function canIncidentTransition(from: string, to: string): boolean {
  return INCIDENT_TRANSITIONS[from as IncidentStatus]?.includes(to as IncidentStatus) ?? false;
}

export const OPEN_INCIDENT_STATUSES: readonly IncidentStatus[] = [IncidentStatus.REPORTED, IncidentStatus.ACKNOWLEDGED, IncidentStatus.UNDER_INVESTIGATION];

export function isIncidentOpen(status: string): boolean {
  return OPEN_INCIDENT_STATUSES.includes(status as IncidentStatus);
}

/** Sub-categories that are always confidential (handled by head office only). */
export const CONFIDENTIAL_INCIDENT_CATEGORIES: readonly IncidentCategory[] = [IncidentCategory.MISCONDUCT];

export function incidentForcesConfidential(category: string): boolean {
  return CONFIDENTIAL_INCIDENT_CATEGORIES.includes(category as IncidentCategory);
}

/**
 * Who may see a confidential report: head office — head office admins, super
 * admins and the MD / Chairman. Never the office's own admins, never auditors.
 */
export const INCIDENT_CONFIDENTIAL_ROLES: readonly RoleCode[] = [RoleCode.SUPER_ADMIN, RoleCode.HEAD_OFFICE_ADMIN, RoleCode.EXECUTIVE];

export const INCIDENT_LIMITS = {
  maxReportPhotos: 3,
  maxResolutionPhotos: 3,
  titleMin: 3,
  titleMax: 120,
  descriptionMax: 2000,
  locationDetailMax: 160,
  noteMax: 1000,
  /** A note that explains a resolution or a reopening. */
  reasonMin: 3,
  /** How many recent reports the summary returns. */
  summaryRecent: 6,
} as const;

export const INCIDENT_STATUS_LABEL: Record<IncidentStatus, string> = {
  REPORTED: "Reported",
  ACKNOWLEDGED: "Acknowledged",
  UNDER_INVESTIGATION: "Under Investigation",
  CLOSED: "Closed",
};

/** What each stage means, for tooltips and the tracker. */
export const INCIDENT_STATUS_HINT: Record<IncidentStatus, string> = {
  REPORTED: "Sent to the admin team; nobody has picked it up yet",
  ACKNOWLEDGED: "The admin team has seen it and will act",
  UNDER_INVESTIGATION: "Someone is looking into it or fixing it now",
  CLOSED: "Handled — see the resolution",
};

export const INCIDENT_STATUS_TONE: Record<IncidentStatus, StatusTone> = {
  REPORTED: "pending",
  ACKNOWLEDGED: "active",
  UNDER_INVESTIGATION: "active",
  CLOSED: "success",
};

export const INCIDENT_GROUP_LABEL: Record<IncidentGroup, string> = {
  SAFETY_INDUSTRIAL: "Safety & Industrial",
  ADMIN_FACILITY: "Admin & Facility",
  SECURITY: "Security",
  IT_TECHNICAL: "IT / Technical",
};

export const INCIDENT_GROUP_HINT: Record<IncidentGroup, string> = {
  SAFETY_INDUSTRIAL: "Fire, gas, chemicals, injuries, electrical, machinery and PPE",
  ADMIN_FACILITY: "Building, cleaning, cafeteria, washrooms, water, AC and furniture",
  SECURITY: "Access, theft, CCTV, gates and locks, misconduct",
  IT_TECHNICAL: "Network, computers and printers, software, phones, power and UPS",
};

export const INCIDENT_CATEGORY_LABEL: Record<IncidentCategory, string> = {
  FIRE_HAZARD: "Fire hazard",
  GAS_LEAK: "Gas leak",
  CHEMICAL_SPILL: "Chemical spill",
  INJURY_NEAR_MISS: "Injury or near miss",
  ELECTRICAL_HAZARD: "Electrical hazard",
  MACHINERY_FAULT: "Machinery fault",
  PPE_VIOLATION: "PPE violation",
  SAFETY_HAZARD: "Other safety hazard",
  BUILDING_DAMAGE: "Building damage",
  CLEANLINESS: "Cleanliness",
  CAFETERIA_HYGIENE: "Cafeteria hygiene",
  WASHROOM: "Washroom",
  WATER_SUPPLY: "Water supply",
  AC_VENTILATION: "AC & ventilation",
  FURNITURE_FIXTURES: "Furniture & fixtures",
  PEST_CONTROL: "Pest control",
  OTHER: "Other facility issue",
  UNAUTHORISED_ACCESS: "Unauthorised access",
  THEFT_LOSS: "Theft or loss",
  CCTV_FAULT: "CCTV fault",
  GATE_LOCK: "Gate or lock",
  MISCONDUCT: "Misconduct",
  NETWORK_DOWN: "Network down",
  COMPUTER_PRINTER: "Computer or printer",
  SOFTWARE_ACCESS: "Software or access",
  TELEPHONE: "Telephone / PABX",
  POWER_UPS: "Power or UPS",
};

/** One-line prompt shown under each sub-category so people pick the right one. */
export const INCIDENT_CATEGORY_HINT: Record<IncidentCategory, string> = {
  FIRE_HAZARD: "Smoke, sparks, blocked fire exits, missing or expired extinguishers",
  GAS_LEAK: "Smell of gas, hissing pipes or cylinders, faulty gas lines",
  CHEMICAL_SPILL: "Spilled or leaking chemicals, dyes, oil or fuel",
  INJURY_NEAR_MISS: "Someone was hurt at work, or very nearly was",
  ELECTRICAL_HAZARD: "Exposed wiring, sparking sockets, overloaded or open switchboards",
  MACHINERY_FAULT: "Unsafe or broken machines, missing guards, unusual noise or smoke",
  PPE_VIOLATION: "Helmets, gloves, masks or harnesses not worn or not available",
  SAFETY_HAZARD: "Wet floors, trip hazards, blocked walkways, unsafe heights",
  BUILDING_DAMAGE: "Cracked or fallen walls and ceilings, leaks, broken doors or windows",
  CLEANLINESS: "Dirty floors, corridors and stairs, overflowing bins",
  CAFETERIA_HYGIENE: "Unclean kitchen or serving area, food safety",
  WASHROOM: "Unclean washroom, no soap or tissue, blocked drains",
  WATER_SUPPLY: "No water, low pressure, dirty or unsafe drinking water",
  AC_VENTILATION: "AC not cooling or leaking, fans not working, stuffy rooms",
  FURNITURE_FIXTURES: "Broken chairs, desks or cabinets, lights or fittings",
  PEST_CONTROL: "Rats, cockroaches, mosquitoes or termites",
  OTHER: "Anything else the admin team should look at",
  UNAUTHORISED_ACCESS: "Unknown person inside, tailgating, misuse of ID cards",
  THEFT_LOSS: "Missing equipment, stock, documents or belongings",
  CCTV_FAULT: "Camera offline, blind spot, recorder not working",
  GATE_LOCK: "Unattended gate, broken lock, faulty barrier or access door",
  MISCONDUCT: "Harassment, bribery, fraud or other wrongdoing — always confidential",
  NETWORK_DOWN: "No internet, Wi-Fi or LAN outage, very slow connection",
  COMPUTER_PRINTER: "PC, laptop, printer or scanner not working",
  SOFTWARE_ACCESS: "ERP, email or app errors, password or permission problems",
  TELEPHONE: "Desk phone, PABX or intercom not working",
  POWER_UPS: "Power cut, UPS or generator failure, voltage problems",
};

export const INCIDENT_SEVERITY_LABEL: Record<IncidentSeverity, string> = {
  CRITICAL: "Critical",
  HIGH: "High",
  MEDIUM: "Medium",
  LOW: "Low",
};

export const INCIDENT_SEVERITY_HINT: Record<IncidentSeverity, string> = {
  CRITICAL: "Danger to people or work has stopped — act now",
  HIGH: "Serious; needs action today",
  MEDIUM: "Needs fixing soon",
  LOW: "Minor; fix when convenient",
};

/** Critical red, High amber, Medium blue, Low grey — always shown with an icon and the label. */
export const INCIDENT_SEVERITY_TONE: Record<IncidentSeverity, StatusTone> = {
  CRITICAL: "danger",
  HIGH: "pending",
  MEDIUM: "active",
  LOW: "neutral",
};

export const INCIDENT_RESOLUTION_LABEL: Record<IncidentResolution, string> = {
  RESOLVED: "Resolved",
  NO_ACTION_NEEDED: "No action needed",
  DUPLICATE: "Duplicate",
  REFERRED: "Referred",
};

export const INCIDENT_RESOLUTION_HINT: Record<IncidentResolution, string> = {
  RESOLVED: "The problem has been fixed",
  NO_ACTION_NEEDED: "Checked; nothing needs to be done — tell the reporter why",
  DUPLICATE: "Already reported — say which report handles it",
  REFERRED: "Passed to another authority or department — say who",
};

export const INCIDENT_RESOLUTION_TONE: Record<IncidentResolution, StatusTone> = {
  RESOLVED: "success",
  NO_ACTION_NEEDED: "neutral",
  DUPLICATE: "neutral",
  REFERRED: "active",
};

/** INC-YYMMDD-OFFICE-NNN, e.g. INC-261020-FCA-007. */
export function formatIncidentNumber(dayStamp: string, branchCode: string, sequence: number): string {
  return `INC-${dayStamp}-${branchCode}-${String(sequence).padStart(3, "0")}`;
}

export function isIncidentNumber(value: string): boolean {
  return /^INC-\d{6}-[A-Z0-9]{2,6}-\d{3,}$/.test(value.trim().toUpperCase());
}

/** What handlers see instead of the reporter's name on an anonymous report. */
export const ANONYMOUS_REPORTER = "Anonymous employee";
/** What handlers see instead of the reporter's name on a confidential report. */
export const CONFIDENTIAL_REPORTER = "Confidential reporter";
