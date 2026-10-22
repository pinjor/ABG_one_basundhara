import { RoleCode } from "./enums";
import type { StatusTone } from "./labels";

/**
 * Official notice board: the executive broadcast channel. The Chairman, the
 * Managing Director, HR and administration publish notices; urgent ones are
 * highlighted, PDFs can be attached, and readers acknowledge them so the
 * sender sees who has read what.
 */
export const NoticeChannel = {
  CHAIRMAN: "CHAIRMAN",
  MANAGING_DIRECTOR: "MANAGING_DIRECTOR",
  HR: "HR",
  ADMINISTRATION: "ADMINISTRATION",
  COMPLIANCE: "COMPLIANCE",
  IT: "IT",
} as const;
export type NoticeChannel = (typeof NoticeChannel)[keyof typeof NoticeChannel];

export const NoticeCategory = {
  GENERAL: "GENERAL",
  CIRCULAR: "CIRCULAR",
  POLICY: "POLICY",
  HR: "HR",
  SAFETY: "SAFETY",
  EVENT: "EVENT",
  HOLIDAY: "HOLIDAY",
} as const;
export type NoticeCategory = (typeof NoticeCategory)[keyof typeof NoticeCategory];

export const NoticeStatus = {
  DRAFT: "DRAFT",
  PUBLISHED: "PUBLISHED",
  ARCHIVED: "ARCHIVED",
} as const;
export type NoticeStatus = (typeof NoticeStatus)[keyof typeof NoticeStatus];

export const NoticeAudience = {
  /** Everyone in the group. */
  ALL: "ALL",
  /** Only people in the listed offices. */
  BRANCHES: "BRANCHES",
} as const;
export type NoticeAudience = (typeof NoticeAudience)[keyof typeof NoticeAudience];

export const NOTICE_CHANNEL_LABEL: Record<NoticeChannel, string> = {
  CHAIRMAN: "Chairman",
  MANAGING_DIRECTOR: "Managing Director",
  HR: "Human Resources",
  ADMINISTRATION: "Administration",
  COMPLIANCE: "Compliance",
  IT: "IT",
};

export const NOTICE_CATEGORY_LABEL: Record<NoticeCategory, string> = {
  GENERAL: "General",
  CIRCULAR: "Circular",
  POLICY: "Policy",
  HR: "HR",
  SAFETY: "Safety",
  EVENT: "Event",
  HOLIDAY: "Holiday",
};

export const NOTICE_STATUS_LABEL: Record<NoticeStatus, string> = {
  DRAFT: "Draft",
  PUBLISHED: "Published",
  ARCHIVED: "Archived",
};

export const NOTICE_STATUS_TONE: Record<NoticeStatus, StatusTone> = {
  DRAFT: "pending",
  PUBLISHED: "success",
  ARCHIVED: "neutral",
};

export const NOTICE_LIMITS = {
  titleMin: 3,
  titleMax: 160,
  bodyMax: 20_000,
  /** PDF attachments. */
  attachmentMaxBytes: 15 * 1024 * 1024,
} as const;

/** ABG-NB-YYYY-NNN, e.g. ABG-NB-2026-014. */
export function formatNoticeNumber(year: number, sequence: number): string {
  return `ABG-NB-${year}-${String(sequence).padStart(3, "0")}`;
}

export function isNoticeNumber(value: string): boolean {
  return /^ABG-NB-\d{4}-\d{3,}$/.test(value);
}

/**
 * Who may speak on each channel. Super admins may use every channel. The
 * Chairman's and the Managing Director's channels belong to the executive
 * role alone, so nobody else can sign in their name.
 */
export const NOTICE_CHANNEL_ROLES: Record<NoticeChannel, readonly RoleCode[]> = {
  CHAIRMAN: [RoleCode.EXECUTIVE],
  MANAGING_DIRECTOR: [RoleCode.EXECUTIVE],
  HR: [RoleCode.HR_FINANCE, RoleCode.HEAD_OFFICE_ADMIN],
  ADMINISTRATION: [RoleCode.HEAD_OFFICE_ADMIN, RoleCode.BRANCH_ADMIN],
  COMPLIANCE: [RoleCode.COMPLIANCE_OFFICER, RoleCode.HEAD_OFFICE_ADMIN],
  IT: [RoleCode.HEAD_OFFICE_ADMIN],
};

/**
 * Roles that reach only their own offices: a branch admin publishes to the
 * offices they run (audience BRANCHES), never to the whole group.
 */
export const NOTICE_OFFICE_ONLY_ROLES: readonly RoleCode[] = [RoleCode.BRANCH_ADMIN];

/** Channels a person with these roles may publish on, in display order. */
export function noticeChannelsFor(roles: readonly string[]): NoticeChannel[] {
  if (roles.includes(RoleCode.SUPER_ADMIN)) return Object.values(NoticeChannel);
  return Object.values(NoticeChannel).filter((c) => NOTICE_CHANNEL_ROLES[c].some((r) => roles.includes(r)));
}

/**
 * True when the only roles that let this person use `channel` are
 * office-scoped, so the notice may go to their own offices only.
 */
export function noticeChannelIsOfficeOnly(roles: readonly string[], channel: NoticeChannel): boolean {
  if (roles.includes(RoleCode.SUPER_ADMIN)) return false;
  const granting = NOTICE_CHANNEL_ROLES[channel].filter((r) => roles.includes(r));
  return granting.length > 0 && granting.every((r) => NOTICE_OFFICE_ONLY_ROLES.includes(r));
}

/** Suggested signatory line for each channel (the author may write their own). */
export const NOTICE_CHANNEL_SIGNATORY: Record<NoticeChannel, string> = {
  CHAIRMAN: "Chairman",
  MANAGING_DIRECTOR: "Managing Director",
  HR: "Head of Human Resources",
  ADMINISTRATION: "Head of Administration",
  COMPLIANCE: "Compliance & Licensing",
  IT: "IT Systems Administration",
};

export const NOTICE_AUDIENCE_LABEL: Record<NoticeAudience, string> = {
  ALL: "Everyone in the group",
  BRANCHES: "Chosen offices",
};

/** What a person may do with one notice now; the API sends these in `viewer.actions`. */
export const NoticeAction = {
  ACKNOWLEDGE: "ACKNOWLEDGE",
  EDIT: "EDIT",
  PUBLISH: "PUBLISH",
  ARCHIVE: "ARCHIVE",
  DISCARD: "DISCARD",
  REPLACE_ATTACHMENT: "REPLACE_ATTACHMENT",
  VIEW_RECEIPTS: "VIEW_RECEIPTS",
} as const;
export type NoticeAction = (typeof NoticeAction)[keyof typeof NoticeAction];

/**
 * Receipt report tabs. "pending" is everyone in the audience who has not yet
 * done what the notice asks: acknowledge it, or (when no acknowledgement is
 * required) open it. "read" is who opened it without acknowledging.
 */
export const NoticeReceiptState = {
  ACKNOWLEDGED: "acknowledged",
  READ: "read",
  PENDING: "pending",
} as const;
export type NoticeReceiptState = (typeof NoticeReceiptState)[keyof typeof NoticeReceiptState];

/** Fields that can still change once a notice is published; everything else is fixed. */
export const NOTICE_EDITABLE_AFTER_PUBLISH = ["pinned", "urgent", "expiresAt"] as const;

export const NOTICE_TEXT_LIMITS = {
  /** Body length shown in lists, banners and push notifications. */
  excerptMax: 180,
  bodyMin: 10,
  signedByMax: 120,
  /** Offices a single notice can be addressed to. */
  maxBranches: 50,
} as const;

/**
 * The opening of a notice for lists and banners: whitespace collapsed, cut at
 * a word boundary, never longer than `max` characters (ellipsis included).
 */
export function noticeExcerpt(body: string, max: number = NOTICE_TEXT_LIMITS.excerptMax): string {
  const flat = body.replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,.;:–—-]+$/, "")}…`;
}

/** Paragraphs as the author typed them: a blank line separates paragraphs. */
export function noticeParagraphs(body: string): string[] {
  return body
    .replace(/\r\n?/g, "\n")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/** Whole-number percentage, or null when there is nobody to count. */
export function noticePercent(part: number, whole: number): number | null {
  if (whole <= 0) return null;
  return Math.min(100, Math.round((part / whole) * 100));
}
