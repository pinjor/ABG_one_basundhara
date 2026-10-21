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
