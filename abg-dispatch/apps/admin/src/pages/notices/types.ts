/** Shapes returned by the notice board API (apps/api/src/notices). */

export interface NoticeCounters {
  audienceSize: number;
  readCount: number;
  acknowledgedCount: number;
  acknowledgedPct: number | null;
  readPct: number | null;
}

export interface OfficeRef {
  id: string;
  name: string;
  code: string;
}

/** A row on the board (GET /notices). */
export interface NoticeRow {
  id: string;
  referenceNumber: string;
  title: string;
  excerpt: string;
  channel: string;
  category: string;
  urgent: boolean;
  pinned: boolean;
  signedBy: string | null;
  publishedAt: string | null;
  expiresAt: string | null;
  hasAttachment: boolean;
  requiresAcknowledgement: boolean;
  read: boolean;
  acknowledged: boolean;
  awaitingAcknowledgement: boolean;
  isAuthor: boolean;
}

/** A row in the publisher's view (GET /admin/notices). */
export interface AdminNoticeRow extends NoticeRow {
  status: string;
  audience: string;
  branches: OfficeRef[];
  author: { id: string; name: string };
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  expired: boolean;
  counters: NoticeCounters;
}

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

export interface AdminNoticePage extends Page<AdminNoticeRow> {
  counts: Record<"DRAFT" | "PUBLISHED" | "ARCHIVED", number>;
  scope: "ALL" | "MINE";
}

export interface Notice {
  id: string;
  referenceNumber: string;
  title: string;
  body: string;
  excerpt: string;
  channel: string;
  channelLabel: string;
  category: string;
  categoryLabel: string;
  status: string;
  urgent: boolean;
  pinned: boolean;
  audience: string;
  branches: OfficeRef[];
  requiresAcknowledgement: boolean;
  signedBy: string | null;
  author: { id: string; name: string; designation: string | null };
  publishedAt: string | null;
  expiresAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  expired: boolean;
  hasAttachment: boolean;
  attachment: { name: string; mimeType: string; sizeBytes: number; url: string } | null;
  attachmentUrl: string | null;
  read: boolean;
  acknowledged: boolean;
  receipt: { readAt: string; acknowledgedAt: string | null } | null;
  counters: NoticeCounters | null;
  viewer: { isAuthor: boolean; canManage: boolean; inAudience: boolean; actions: string[] };
}

export interface UnreadCount {
  unread: number;
  toAcknowledge: number;
  urgentUnread: number;
}

export interface ReceiptRow {
  userId: string;
  name: string;
  employeeCode: string | null;
  designation: string | null;
  department: string | null;
  office: OfficeRef | null;
  readAt: string | null;
  acknowledgedAt: string | null;
}

export interface ReceiptPage extends Page<ReceiptRow> {
  state: "acknowledged" | "read" | "pending";
  counts: { audience: number; acknowledged: number; read: number; pending: number };
  notice: { id: string; referenceNumber: string; title: string; requiresAcknowledgement: boolean; status: string };
}

export interface DirectoryBranch {
  id: string;
  name: string;
  code: string;
  type: string;
  city: string | null;
}
