import { Inject, Injectable, Logger } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import {
  Capability,
  NOTICE_CATEGORY_LABEL,
  NOTICE_CHANNEL_LABEL,
  NOTICE_CHANNEL_SIGNATORY,
  NOTICE_EDITABLE_AFTER_PUBLISH,
  NOTICE_LIMITS,
  NOTICE_STATUS_LABEL,
  NoticeAction,
  NoticeAudience,
  NoticeCategory,
  NoticeChannel,
  NoticeReceiptState,
  NoticeStatus,
  NotificationCategory,
  ROLE_CAPABILITIES,
  RoleCode,
  formatNoticeNumber,
  noticeChannelIsOfficeOnly,
  noticeChannelsFor,
  noticeExcerpt,
  noticePercent,
} from "@abg-dispatch/shared";
import { APP_CONFIG, type AppConfig } from "../common/config";
import { PrismaService, isUniqueViolation, type Tx } from "../common/prisma.service";
import type { UserActor } from "../common/actor";
import { badRequest, conflict, forbidden, notFound, unauthorized } from "../common/errors";
import { hmacSha256, safeEqual } from "../common/crypto";
import { clampLimit, decodeCursor, encodeCursor } from "../common/pagination";
import { dhakaYear, nextSequence } from "../common/sequence";
import { AuditService } from "../audit/audit.service";
import { NotificationService } from "../notifications/notification.service";
import { StorageService, sniffMime } from "../attachments/storage.service";
import { utc } from "../admin/admin-scope";
import type { AdminNoticesQuery, CreateNoticeDto, NoticeReceiptsQuery, NoticesQuery, UpdateNoticeDto } from "./notices.dto";

export const NOTICE_NOT_FOUND = "Notice not found, or it is not addressed to you.";
const LINK_TTL_SECONDS = 600;
const MODULE = "notices";

/** Every role that may read the board; together they make up a notice's possible audience. */
const READER_ROLES: string[] = Object.values(RoleCode).filter((r) => ROLE_CAPABILITIES[r].includes(Capability.NOTICE_READ));
const INACTIVE_EMPLOYEE_STATUSES = ["TERMINATED", "INACTIVE"];

const INCLUDE = {
  author: { select: { id: true, displayName: true, employee: { select: { designation: true, branch: { select: { name: true } } } } } },
} satisfies Prisma.NoticeInclude;

type NoticeFull = Prisma.NoticeGetPayload<{ include: typeof INCLUDE }>;
type NoticeRecord = Prisma.NoticeGetPayload<object>;

export interface UploadedPdf {
  buffer: Buffer;
  originalname: string;
  size: number;
}

export interface NoticeCounters {
  /** People the notice is addressed to (the author is not counted). */
  audienceSize: number;
  readCount: number;
  acknowledgedCount: number;
  /** Null when the notice does not ask for acknowledgement, or nobody is in the audience. */
  acknowledgedPct: number | null;
  readPct: number | null;
}

interface Access {
  isAuthor: boolean;
  isManager: boolean;
  inAudience: boolean;
  /** Published and addressed to this person. */
  asReader: boolean;
  /** May edit, publish, archive or discard. */
  canChange: boolean;
}

/** Keyset position in the board order: pinned, then urgent, then newest. */
interface BoardCursor {
  p: boolean;
  u: boolean;
  t: string;
  id: string;
}

/**
 * The official notice board. The Chairman, the Managing Director, HR,
 * administration, compliance and IT publish notices on their own channels;
 * everyone they are addressed to is told, reads them and — when asked —
 * acknowledges them, so the sender can see who has read what.
 */
@Injectable()
export class NoticesService {
  private readonly logger = new Logger("NoticesService");

  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly notifications: NotificationService,
    private readonly audit: AuditService,
  ) {}

  // ── Access ──

  private branchIdsOf(n: { branchIds: Prisma.JsonValue }): string[] {
    return Array.isArray(n.branchIds) ? n.branchIds.filter((b): b is string => typeof b === "string") : [];
  }

  private access(actor: UserActor, n: NoticeRecord): Access {
    const isAuthor = n.authorUserId === actor.userId;
    const isManager = actor.capabilities.has(Capability.NOTICE_MANAGE);
    const inAudience = n.audience === NoticeAudience.ALL || (!!actor.branchId && this.branchIdsOf(n).includes(actor.branchId));
    const asReader = n.status === NoticeStatus.PUBLISHED && inAudience && actor.capabilities.has(Capability.NOTICE_READ);
    const canChange = (isAuthor && actor.capabilities.has(Capability.NOTICE_PUBLISH)) || isManager;
    return { isAuthor, isManager, inAudience, asReader, canChange };
  }

  /** Readers see published notices addressed to them; authors and managers see their notices in any state. */
  private async load(actor: UserActor, id: string): Promise<{ notice: NoticeFull; access: Access }> {
    const notice = await this.prisma.notice.findUnique({ where: { id }, include: INCLUDE });
    if (!notice) throw notFound(NOTICE_NOT_FOUND, "NOTICE_NOT_FOUND");
    const access = this.access(actor, notice);
    if (!access.asReader && !access.isAuthor && !access.isManager) throw notFound(NOTICE_NOT_FOUND, "NOTICE_NOT_FOUND");
    return { notice, access };
  }

  /** Row lock for a change, then the same visibility rules. */
  private async lockForChange(tx: Tx, actor: UserActor, id: string): Promise<NoticeRecord> {
    const locked = await tx.$queryRaw<{ id: string }[]>`SELECT "id" FROM "notices" WHERE "id" = ${id} FOR UPDATE`;
    if (!locked.length) throw notFound(NOTICE_NOT_FOUND, "NOTICE_NOT_FOUND");
    const notice = await tx.notice.findUniqueOrThrow({ where: { id } });
    const access = this.access(actor, notice);
    if (!access.asReader && !access.isAuthor && !access.isManager) throw notFound(NOTICE_NOT_FOUND, "NOTICE_NOT_FOUND");
    if (!access.canChange) throw forbidden("Only the person who wrote this notice, or head office, can change it.", "NOTICE_NOT_YOURS");
    return notice;
  }

  /** Published, live and addressed to this person. */
  private boardWhere(actor: UserActor, now: Date): Prisma.NoticeWhereInput {
    const audience: Prisma.NoticeWhereInput[] = [{ audience: NoticeAudience.ALL }];
    if (actor.branchId) audience.push({ audience: NoticeAudience.BRANCHES, branchIds: { array_contains: [actor.branchId] } });
    return {
      status: NoticeStatus.PUBLISHED,
      publishedAt: { lte: now },
      AND: [{ OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] }, { OR: audience }],
    };
  }

  private isExpired(n: { expiresAt: Date | null }, now = new Date()): boolean {
    return !!n.expiresAt && n.expiresAt <= now;
  }

  /**
   * The channel and audience rules. Each channel belongs to certain roles
   * (only the executive role speaks for the Chairman and the MD); a branch
   * admin may address only the offices they run.
   */
  private assertMayAddress(actor: UserActor, channel: string, audience: string, branchIds: string[]) {
    const label = NOTICE_CHANNEL_LABEL[channel as NoticeChannel] ?? channel;
    if (!noticeChannelsFor(actor.roles).includes(channel as NoticeChannel)) {
      throw forbidden(`Your role cannot publish on the ${label} channel.`, "NOTICE_CHANNEL_FORBIDDEN");
    }
    if (audience === NoticeAudience.BRANCHES && !branchIds.length) throw badRequest("Choose at least one office for this notice.", "NOTICE_BRANCHES_REQUIRED");
    if (noticeChannelIsOfficeOnly(actor.roles, channel as NoticeChannel)) {
      if (audience !== NoticeAudience.BRANCHES) throw forbidden("Office admins can publish only to their own offices. Choose your office as the audience.", "NOTICE_AUDIENCE_FORBIDDEN");
      if (branchIds.some((b) => !actor.scopedBranchIds.includes(b))) throw forbidden("You can publish only to the offices you manage.", "NOTICE_AUDIENCE_FORBIDDEN");
    }
  }

  private async assertBranches(branchIds: string[]) {
    if (!branchIds.length) return;
    const found = await this.prisma.branch.count({ where: { id: { in: branchIds }, active: true } });
    if (found !== branchIds.length) throw badRequest("One of the chosen offices does not exist or is closed.", "NOTICE_BRANCH_INVALID");
  }

  private parseExpiry(raw: string, publishedAt?: Date | null): Date {
    const at = new Date(raw);
    if (Number.isNaN(at.getTime())) throw badRequest("Give the expiry as a date and time.", "NOTICE_EXPIRY_INVALID");
    if (at.getTime() <= Date.now() + 60_000) throw badRequest("The expiry must be in the future.", "NOTICE_EXPIRY_PAST");
    if (publishedAt && at <= publishedAt) throw badRequest("The expiry must be after the notice was published.", "NOTICE_EXPIRY_PAST");
    return at;
  }

  // ── Attachments ──

  private checkPdf(file: UploadedPdf): void {
    const type = sniffMime(file.buffer);
    if (!type || type.mime !== "application/pdf") throw badRequest("Attach the notice as a PDF file.", "NOTICE_ATTACHMENT_TYPE");
    if (file.size > NOTICE_LIMITS.attachmentMaxBytes || file.buffer.length > NOTICE_LIMITS.attachmentMaxBytes) {
      throw badRequest("The PDF must be 15 MB or smaller.", "NOTICE_ATTACHMENT_TOO_LARGE");
    }
  }

  private async storePdf(file: UploadedPdf) {
    this.checkPdf(file);
    const key = await this.storage.put(file.buffer, "pdf");
    const base = (file.originalname || "notice").replace(/\.pdf$/i, "").replace(/[^\w.\- ]+/g, "_").trim().slice(0, 110) || "notice";
    return { attachmentKey: key, attachmentName: `${base}.pdf`, attachmentMime: "application/pdf", attachmentSize: file.buffer.length };
  }

  /** Short-lived link for an <iframe>, a download or the phone's PDF viewer. Bound to the stored file, so replacing it retires old links. */
  private attachmentUrl(n: { id: string; attachmentKey: string | null }): string | null {
    if (!n.attachmentKey) return null;
    const exp = Math.floor(Date.now() / 1000) + LINK_TTL_SECONDS;
    return `/api/notice-attachments/${n.id}/content?exp=${exp}&sig=${this.sign(n.id, n.attachmentKey, exp)}`;
  }

  private sign(id: string, storageKey: string, exp: number): string {
    return hmacSha256(this.config.jwtSecret, `notice-attachment.${id}.${storageKey}.${exp}`, "base64url");
  }

  async attachmentForSignedLink(id: string, expRaw: string | undefined, sig: string | undefined) {
    const exp = Number(expRaw);
    if (!sig || !expRaw || !Number.isFinite(exp)) throw unauthorized("This link is not valid.", "LINK_INVALID");
    if (exp < Date.now() / 1000) throw unauthorized("This link has expired. Open the notice again.", "LINK_EXPIRED");
    const n = await this.prisma.notice.findUnique({ where: { id }, select: { id: true, attachmentKey: true, attachmentName: true, attachmentMime: true } });
    if (!n?.attachmentKey || !safeEqual(this.sign(n.id, n.attachmentKey, exp), sig)) throw unauthorized("This link is not valid.", "LINK_INVALID");
    return { data: await this.storage.get(n.attachmentKey), fileName: n.attachmentName ?? "notice.pdf", mimeType: n.attachmentMime ?? "application/pdf" };
  }

  // ── Publishing ──

  async create(actor: UserActor, dto: CreateNoticeDto, file?: UploadedPdf) {
    const channel = dto.channel;
    const audience = dto.audience ?? NoticeAudience.ALL;
    const branchIds = audience === NoticeAudience.BRANCHES ? [...new Set(dto.branchIds ?? [])] : [];
    this.assertMayAddress(actor, channel, audience, branchIds);
    await this.assertBranches(branchIds);
    const expiresAt = dto.expiresAt ? this.parseExpiry(dto.expiresAt) : null;
    if (file) this.checkPdf(file);
    const signedBy = dto.signedBy?.trim() || (await this.defaultSignatory(actor, channel));
    const stored = file ? await this.storePdf(file) : null;

    const now = new Date();
    const publish = !!dto.publish;
    const created = await this.prisma.$transaction(async (tx) => {
      const year = dhakaYear(now);
      const referenceNumber = formatNoticeNumber(year, await nextSequence(tx, "NB", String(year)));
      const row = await tx.notice.create({
        data: {
          referenceNumber,
          title: dto.title.trim(),
          body: dto.body,
          channel,
          category: dto.category ?? NoticeCategory.GENERAL,
          urgent: !!dto.urgent,
          pinned: !!dto.pinned,
          audience,
          branchIds,
          requiresAcknowledgement: dto.requiresAcknowledgement ?? true,
          status: publish ? NoticeStatus.PUBLISHED : NoticeStatus.DRAFT,
          authorUserId: actor.userId,
          signedBy,
          ...(stored ?? {}),
          publishedAt: publish ? now : null,
          expiresAt,
        },
      });
      if (publish) await this.recordPublished(tx, actor, row);
      return row;
    });
    if (publish) await this.notifyAudience(created);
    return this.detail(actor, created.id);
  }

  private async defaultSignatory(actor: UserActor, channel: string): Promise<string> {
    const employee = actor.employeeId ? await this.prisma.employee.findUnique({ where: { id: actor.employeeId }, select: { designation: true } }) : null;
    return `${actor.displayName}, ${employee?.designation || NOTICE_CHANNEL_SIGNATORY[channel as NoticeChannel] || NOTICE_CHANNEL_LABEL[channel as NoticeChannel]}`;
  }

  async update(actor: UserActor, id: string, dto: UpdateNoticeDto) {
    await this.prisma.$transaction(async (tx) => {
      const n = await this.lockForChange(tx, actor, id);
      if (n.status === NoticeStatus.ARCHIVED) throw conflict("NOTICE_STATE_CONFLICT", "This notice is archived and can no longer be changed.");

      if (n.status === NoticeStatus.PUBLISHED) {
        const locked = this.lockedChanges(n, dto);
        if (locked.length) {
          throw conflict("NOTICE_STATE_CONFLICT", "This notice is already published: only pinning, the urgent flag and the expiry date can change. Archive it and post a new notice to change the rest.", { fields: locked });
        }
        const data: Prisma.NoticeUpdateInput = {};
        const before: Record<string, unknown> = {};
        const after: Record<string, unknown> = {};
        if (dto.pinned !== undefined && dto.pinned !== n.pinned) ((data.pinned = dto.pinned), (before.pinned = n.pinned), (after.pinned = dto.pinned));
        if (dto.urgent !== undefined && dto.urgent !== n.urgent) ((data.urgent = dto.urgent), (before.urgent = n.urgent), (after.urgent = dto.urgent));
        if (dto.expiresAt !== undefined) {
          const next = dto.expiresAt === null ? null : this.parseExpiry(dto.expiresAt, n.publishedAt);
          if ((next?.getTime() ?? null) !== (n.expiresAt?.getTime() ?? null)) ((data.expiresAt = next), (before.expiresAt = n.expiresAt), (after.expiresAt = next));
        }
        if (!Object.keys(data).length) return false;
        await tx.notice.update({ where: { id }, data });
        await this.audit.record(
          { actor, action: "notice.updated", objectType: "notice", objectId: id, summary: `${n.referenceNumber}: ${Object.keys(after).join(", ")} changed after publishing`, before, after },
          tx,
        );
        return true;
      }

      // Drafts: everything may change, within the same channel and audience rules.
      const channel = dto.channel ?? n.channel;
      const audience = dto.audience ?? n.audience;
      const branchIds = audience === NoticeAudience.BRANCHES ? [...new Set(dto.branchIds ?? this.branchIdsOf(n))] : [];
      this.assertMayAddress(actor, channel, audience, branchIds);
      await this.assertBranches(branchIds);
      const data: Prisma.NoticeUpdateInput = {
        title: dto.title,
        body: dto.body,
        channel,
        category: dto.category,
        urgent: dto.urgent,
        pinned: dto.pinned,
        audience,
        branchIds,
        requiresAcknowledgement: dto.requiresAcknowledgement,
        signedBy: dto.signedBy === undefined ? undefined : dto.signedBy.trim() || (await this.defaultSignatory(actor, channel)),
        expiresAt: dto.expiresAt === undefined ? undefined : dto.expiresAt === null ? null : this.parseExpiry(dto.expiresAt),
      };
      if (dto.removeAttachment) Object.assign(data, { attachmentKey: null, attachmentName: null, attachmentMime: null, attachmentSize: null });
      await tx.notice.update({ where: { id }, data });
      return true;
    });
    return this.detail(actor, id);
  }

  /** Fields the request would change that a published notice no longer allows. */
  private lockedChanges(n: NoticeRecord, dto: UpdateNoticeDto): string[] {
    const allowed = new Set<string>(NOTICE_EDITABLE_AFTER_PUBLISH);
    const out: string[] = [];
    const differs: Record<string, boolean> = {
      title: dto.title !== undefined && dto.title !== n.title,
      body: dto.body !== undefined && dto.body !== n.body,
      channel: dto.channel !== undefined && dto.channel !== n.channel,
      category: dto.category !== undefined && dto.category !== n.category,
      audience: dto.audience !== undefined && dto.audience !== n.audience,
      branchIds: dto.branchIds !== undefined && [...new Set(dto.branchIds)].sort().join() !== [...this.branchIdsOf(n)].sort().join(),
      requiresAcknowledgement: dto.requiresAcknowledgement !== undefined && dto.requiresAcknowledgement !== n.requiresAcknowledgement,
      signedBy: dto.signedBy !== undefined && dto.signedBy.trim() !== (n.signedBy ?? ""),
      removeAttachment: !!dto.removeAttachment && !!n.attachmentKey,
    };
    for (const [field, change] of Object.entries(differs)) if (change && !allowed.has(field)) out.push(field);
    return out;
  }

  async publish(actor: UserActor, id: string) {
    const published = await this.prisma.$transaction(async (tx) => {
      const n = await this.lockForChange(tx, actor, id);
      if (n.status !== NoticeStatus.DRAFT) {
        throw conflict("NOTICE_STATE_CONFLICT", `This notice is already ${NOTICE_STATUS_LABEL[n.status as NoticeStatus]?.toLowerCase() ?? n.status}.`);
      }
      this.assertMayAddress(actor, n.channel, n.audience, this.branchIdsOf(n));
      if (n.expiresAt && n.expiresAt.getTime() <= Date.now() + 60_000) throw badRequest("The expiry date has passed. Change it before publishing.", "NOTICE_EXPIRY_PAST");
      const row = await tx.notice.update({ where: { id }, data: { status: NoticeStatus.PUBLISHED, publishedAt: new Date() } });
      await this.recordPublished(tx, actor, row);
      return row;
    });
    await this.notifyAudience(published);
    return this.detail(actor, id);
  }

  private async recordPublished(tx: Tx, actor: UserActor, n: NoticeRecord) {
    const audience = n.audience === NoticeAudience.ALL ? "everyone" : `${this.branchIdsOf(n).length} office(s)`;
    await this.audit.record(
      {
        actor,
        action: "notice.published",
        objectType: "notice",
        objectId: n.id,
        summary: `${n.referenceNumber} published on the ${NOTICE_CHANNEL_LABEL[n.channel as NoticeChannel] ?? n.channel} channel to ${audience}${n.urgent ? " (urgent)" : ""}`,
        after: { title: n.title, channel: n.channel, category: n.category, audience: n.audience, branchIds: n.branchIds, urgent: n.urgent, requiresAcknowledgement: n.requiresAcknowledgement },
      },
      tx,
    );
  }

  async archive(actor: UserActor, id: string) {
    await this.prisma.$transaction(async (tx) => {
      const n = await this.lockForChange(tx, actor, id);
      if (n.status !== NoticeStatus.PUBLISHED) {
        throw conflict("NOTICE_STATE_CONFLICT", n.status === NoticeStatus.DRAFT ? "A draft cannot be archived. Discard it instead." : "This notice is already archived.");
      }
      await tx.notice.update({ where: { id }, data: { status: NoticeStatus.ARCHIVED, archivedAt: new Date(), pinned: false } });
      await this.audit.record(
        { actor, action: "notice.archived", objectType: "notice", objectId: id, summary: `${n.referenceNumber} archived and taken off the board`, before: { status: n.status, pinned: n.pinned }, after: { status: NoticeStatus.ARCHIVED } },
        tx,
      );
    });
    return this.detail(actor, id);
  }

  /** Drafts only: never sent, so nothing to keep. */
  async discard(actor: UserActor, id: string) {
    await this.prisma.$transaction(async (tx) => {
      const n = await this.lockForChange(tx, actor, id);
      if (n.status !== NoticeStatus.DRAFT) throw conflict("NOTICE_STATE_CONFLICT", "Only drafts can be discarded. Archive a published notice instead.");
      await tx.notice.delete({ where: { id } });
      await this.audit.record({ actor, action: "notice.discarded", objectType: "notice", objectId: id, summary: `${n.referenceNumber} draft discarded`, before: { title: n.title, channel: n.channel } }, tx);
    });
    return { id, discarded: true };
  }

  async replaceAttachment(actor: UserActor, id: string, file?: UploadedPdf) {
    if (!file) throw badRequest("Attach a PDF in the `attachment` field.", "NOTICE_ATTACHMENT_REQUIRED");
    this.checkPdf(file);
    // Check the notice before writing the file to storage.
    await this.prisma.$transaction(async (tx) => {
      const n = await this.lockForChange(tx, actor, id);
      if (n.status !== NoticeStatus.DRAFT) throw conflict("NOTICE_STATE_CONFLICT", "The PDF of a published notice cannot be changed. Archive it and post a new notice.");
    });
    const stored = await this.storePdf(file);
    await this.prisma.$transaction(async (tx) => {
      const n = await this.lockForChange(tx, actor, id);
      if (n.status !== NoticeStatus.DRAFT) throw conflict("NOTICE_STATE_CONFLICT", "The PDF of a published notice cannot be changed. Archive it and post a new notice.");
      await tx.notice.update({ where: { id }, data: stored });
    });
    return this.detail(actor, id);
  }

  // ── Notifying ──

  /** Active people a notice reaches: everyone, or everyone whose office is listed. Never the author. */
  private readersSql(): Prisma.Sql {
    return Prisma.sql`
      SELECT u."id", e."branchId"
      FROM "users" u
      LEFT JOIN "employees" e ON e."id" = u."employeeId"
      WHERE u."active" = true
        AND (e."id" IS NULL OR e."status" NOT IN (${Prisma.join(INACTIVE_EMPLOYEE_STATUSES)}))
        AND EXISTS (SELECT 1 FROM "user_roles" ur WHERE ur."userId" = u."id" AND ur."role" IN (${Prisma.join(READER_ROLES)}))`;
  }

  private async audienceUserIds(n: NoticeRecord): Promise<string[]> {
    const branchIds = this.branchIdsOf(n);
    if (n.audience === NoticeAudience.BRANCHES && !branchIds.length) return [];
    const filter = n.audience === NoticeAudience.ALL ? Prisma.empty : Prisma.sql`AND r."branchId" IN (${Prisma.join(branchIds)})`;
    const rows = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT r."id" FROM (${this.readersSql()}) r WHERE r."id" <> ${n.authorUserId} ${filter}`;
    return rows.map((r) => r.id);
  }

  private async notifyAudience(n: NoticeRecord) {
    try {
      const userIds = await this.audienceUserIds(n);
      const channel = NOTICE_CHANNEL_LABEL[n.channel as NoticeChannel] ?? n.channel;
      const title = n.urgent ? `Urgent notice: ${n.title}` : `New notice: ${n.title}`;
      const body = `${channel} · ${noticeExcerpt(n.body, 120)}${n.requiresAcknowledgement ? " Please read and acknowledge." : ""}`;
      await this.notifications.deliverModule(
        { module: MODULE, id: n.id, reference: n.referenceNumber, route: `/notices/${n.id}`, status: NoticeStatus.PUBLISHED },
        `notice:${n.id}:published`,
        "NOTICE_PUBLISHED",
        userIds.map((userId) => ({
          userId,
          category: n.requiresAcknowledgement ? NotificationCategory.ACTION_REQUIRED : NotificationCategory.PARCEL_UPDATE,
          title: title.length > 180 ? `${title.slice(0, 179)}…` : title,
          body,
        })),
      );
    } catch (err) {
      // Publishing stands even if telling people failed; they still see it on the board.
      this.logger.error(`Notice ${n.referenceNumber} notification failed: ${(err as Error).message}`);
    }
  }

  // ── Reading ──

  async list(actor: UserActor, q: NoticesQuery) {
    const now = new Date();
    const where: Prisma.NoticeWhereInput[] = [this.boardWhere(actor, now)];
    if (q.channel) where.push({ channel: q.channel });
    if (q.category) where.push({ category: q.category });
    if (q.unread === "true") where.push({ authorUserId: { not: actor.userId }, receipts: { none: { userId: actor.userId } } });
    const text = q.q?.trim();
    if (text) where.push(this.textWhere(text));
    const cursor = this.decodeBoardCursor(q.cursor);
    if (cursor) where.push(this.boardCursorWhere(cursor));
    const limit = clampLimit(q.limit, 20, 50);
    const rows = await this.prisma.notice.findMany({
      where: { AND: where },
      include: { receipts: { where: { userId: actor.userId }, select: { readAt: true, acknowledgedAt: true } } },
      orderBy: [{ pinned: "desc" }, { urgent: "desc" }, { publishedAt: "desc" }, { id: "desc" }],
      take: limit + 1,
    });
    const items = rows.slice(0, limit);
    const last = items[items.length - 1];
    return {
      items: items.map((n) => this.serializeRow(actor, n, n.receipts[0] ?? null, now)),
      nextCursor: rows.length > limit && last ? this.encodeBoardCursor(last) : null,
    };
  }

  async unreadCount(actor: UserActor) {
    const now = new Date();
    const board = this.boardWhere(actor, now);
    const notMine: Prisma.NoticeWhereInput = { authorUserId: { not: actor.userId } };
    const unreadWhere: Prisma.NoticeWhereInput = { AND: [board, notMine, { receipts: { none: { userId: actor.userId } } }] };
    const [unread, urgentUnread, toAcknowledge] = await Promise.all([
      this.prisma.notice.count({ where: unreadWhere }),
      this.prisma.notice.count({ where: { AND: [unreadWhere, { urgent: true }] } }),
      this.prisma.notice.count({ where: { AND: [board, notMine, { requiresAcknowledgement: true }, { receipts: { none: { userId: actor.userId, acknowledgedAt: { not: null } } } }] } }),
    ]);
    return { unread, toAcknowledge, urgentUnread };
  }

  /** Opening a notice marks it read for the people it is addressed to. */
  async open(actor: UserActor, id: string) {
    const { notice, access } = await this.load(actor, id);
    if (access.asReader && !access.isAuthor) {
      await this.upsertReceipt(notice.id, actor.userId, {});
      await this.clearNotifications(actor.userId, notice.id);
    }
    return this.serialize(actor, notice, access);
  }

  /** Idempotent: acknowledging twice keeps the first time. */
  async acknowledge(actor: UserActor, id: string) {
    const { notice, access } = await this.load(actor, id);
    if (!access.asReader) {
      throw conflict("NOTICE_STATE_CONFLICT", notice.status === NoticeStatus.PUBLISHED ? "This notice is not addressed to you." : "Only published notices can be acknowledged.");
    }
    if (access.isAuthor) throw conflict("NOTICE_ACK_NOT_NEEDED", "You published this notice, so there is nothing to acknowledge.");
    if (!notice.requiresAcknowledgement) throw conflict("NOTICE_ACK_NOT_REQUIRED", "This notice does not ask for an acknowledgement.");
    const existing = await this.prisma.noticeReceipt.findUnique({ where: { noticeId_userId: { noticeId: id, userId: actor.userId } } });
    if (!existing?.acknowledgedAt) {
      if (this.isExpired(notice)) throw conflict("NOTICE_EXPIRED", "This notice has expired and can no longer be acknowledged.");
      const now = new Date();
      await this.upsertReceipt(id, actor.userId, { acknowledgedAt: now });
      await this.prisma.noticeReceipt.updateMany({ where: { noticeId: id, userId: actor.userId, acknowledgedAt: null }, data: { acknowledgedAt: now } });
    }
    await this.clearNotifications(actor.userId, id);
    return this.serialize(actor, notice, access);
  }

  private async upsertReceipt(noticeId: string, userId: string, extra: { acknowledgedAt?: Date }) {
    const write = () =>
      this.prisma.noticeReceipt.upsert({
        where: { noticeId_userId: { noticeId, userId } },
        create: { noticeId, userId, readAt: new Date(), ...extra },
        update: {},
      });
    try {
      await write();
    } catch (err) {
      // Two taps at once: the other request created the receipt first.
      if (!isUniqueViolation(err)) throw err;
      await write();
    }
  }

  /** The notification that announced the notice has done its job once the notice is open. */
  private async clearNotifications(userId: string, noticeId: string) {
    await this.prisma.notification
      .updateMany({ where: { userId, readAt: null, data: { path: ["objectId"], equals: noticeId } }, data: { readAt: new Date() } })
      .catch((err) => this.logger.warn(`Could not clear notice notifications: ${(err as Error).message}`));
  }

  /** The notice as its author or a manager sees it after a change (never marks it read). */
  private async detail(actor: UserActor, id: string) {
    const { notice, access } = await this.load(actor, id);
    return this.serialize(actor, notice, access);
  }

  private textWhere(text: string): Prisma.NoticeWhereInput {
    return {
      OR: [
        { referenceNumber: { contains: text, mode: "insensitive" } },
        { title: { contains: text, mode: "insensitive" } },
        { body: { contains: text, mode: "insensitive" } },
        { signedBy: { contains: text, mode: "insensitive" } },
      ],
    };
  }

  private encodeBoardCursor(n: { pinned: boolean; urgent: boolean; publishedAt: Date | null; id: string }): string {
    const c: BoardCursor = { p: n.pinned, u: n.urgent, t: (n.publishedAt ?? new Date(0)).toISOString(), id: n.id };
    return Buffer.from(JSON.stringify(c)).toString("base64url");
  }

  private decodeBoardCursor(raw?: string): BoardCursor | null {
    if (!raw) return null;
    try {
      const c = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as BoardCursor;
      if (typeof c.p !== "boolean" || typeof c.u !== "boolean" || typeof c.id !== "string" || Number.isNaN(new Date(c.t).getTime())) return null;
      return c;
    } catch {
      return null;
    }
  }

  /** Rows after the cursor in (pinned DESC, urgent DESC, publishedAt DESC, id DESC) order. */
  private boardCursorWhere(c: BoardCursor): Prisma.NoticeWhereInput {
    const t = new Date(c.t);
    const or: Prisma.NoticeWhereInput[] = [];
    if (c.p) or.push({ pinned: false });
    if (c.u) or.push({ pinned: c.p, urgent: false });
    or.push({ pinned: c.p, urgent: c.u, publishedAt: { lt: t } });
    or.push({ pinned: c.p, urgent: c.u, publishedAt: t, id: { lt: c.id } });
    return { OR: or };
  }

  // ── Publisher views ──

  private publisherScope(actor: UserActor): Prisma.NoticeWhereInput {
    return actor.capabilities.has(Capability.NOTICE_MANAGE) ? {} : { authorUserId: actor.userId };
  }

  async adminList(actor: UserActor, q: AdminNoticesQuery) {
    const scope = this.publisherScope(actor);
    const status = q.status ?? NoticeStatus.PUBLISHED;
    const filters: Prisma.NoticeWhereInput[] = [scope];
    if (q.channel) filters.push({ channel: q.channel });
    if (q.category) filters.push({ category: q.category });
    const text = q.q?.trim();
    if (text) filters.push(this.textWhere(text));
    const where = [...filters];
    if (status !== "ALL") where.push({ status });

    // Published and archived notices sort by when they went out; drafts by last edit.
    const sortField = status === NoticeStatus.PUBLISHED || status === NoticeStatus.ARCHIVED ? "publishedAt" : status === NoticeStatus.DRAFT ? "updatedAt" : "createdAt";
    const cursor = decodeCursor(q.cursor);
    if (cursor) where.push({ OR: [{ [sortField]: { lt: cursor.createdAt } }, { [sortField]: cursor.createdAt, id: { lt: cursor.id } }] });
    const limit = clampLimit(q.limit, 20, 50);
    const rows = await this.prisma.notice.findMany({
      where: { AND: where },
      include: INCLUDE,
      orderBy: [{ [sortField]: "desc" }, { id: "desc" }],
      take: limit + 1,
    });
    const items = rows.slice(0, limit);
    const [counters, branches, grouped] = await Promise.all([
      this.counters(items),
      this.branchMap(),
      this.prisma.notice.groupBy({ by: ["status"], where: { AND: filters }, _count: { _all: true } }),
    ]);
    const now = new Date();
    const last = items[items.length - 1];
    return {
      items: items.map((n) => ({
        ...this.serializeRow(actor, n, null, now),
        status: n.status,
        audience: n.audience,
        branches: this.branchIdsOf(n).map((b) => branches.get(b) ?? { id: b, name: "Closed office", code: "—" }),
        author: { id: n.author.id, name: n.author.displayName },
        createdAt: n.createdAt,
        updatedAt: n.updatedAt,
        archivedAt: n.archivedAt,
        expired: this.isExpired(n, now),
        counters: counters.get(n.id) ?? this.emptyCounters(),
      })),
      nextCursor: rows.length > limit && last ? encodeCursor((last[sortField] as Date | null) ?? last.createdAt, last.id) : null,
      counts: Object.fromEntries(Object.values(NoticeStatus).map((s) => [s, grouped.find((g) => g.status === s)?._count._all ?? 0])) as Record<NoticeStatus, number>,
      scope: actor.capabilities.has(Capability.NOTICE_MANAGE) ? "ALL" : "MINE",
    };
  }

  /** Dashboard figures: what is on the board now and how well it is being acknowledged. */
  async summary(actor: UserActor) {
    const now = new Date();
    const canPublish = actor.capabilities.has(Capability.NOTICE_PUBLISH);
    // Publishers see the notices they are responsible for; everyone else sees what is addressed to them.
    const scope: Prisma.NoticeWhereInput = canPublish ? this.publisherScope(actor) : this.boardWhere(actor, now);
    const live: Prisma.NoticeWhereInput = { status: NoticeStatus.PUBLISHED, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] };
    const [published, urgentActive, drafts, active] = await Promise.all([
      this.prisma.notice.count({ where: { AND: [scope, live] } }),
      this.prisma.notice.count({ where: { AND: [scope, live, { urgent: true }] } }),
      canPublish ? this.prisma.notice.count({ where: { AND: [scope, { status: NoticeStatus.DRAFT }] } }) : Promise.resolve(0),
      this.prisma.notice.findMany({ where: { AND: [scope, live] }, orderBy: [{ publishedAt: "desc" }, { id: "desc" }], take: 200 }),
    ]);
    const counters = await this.counters(active);
    const pcts = active.filter((n) => n.requiresAcknowledgement).map((n) => counters.get(n.id)?.acknowledgedPct).filter((p): p is number => p !== null && p !== undefined);
    return {
      published,
      urgentActive,
      drafts,
      avgAcknowledgedPct: pcts.length ? Math.round(pcts.reduce((s, p) => s + p, 0) / pcts.length) : null,
      latest: active.slice(0, 5).map((n) => ({
        id: n.id,
        referenceNumber: n.referenceNumber,
        title: n.title,
        channel: n.channel,
        category: n.category,
        urgent: n.urgent,
        pinned: n.pinned,
        publishedAt: n.publishedAt,
        requiresAcknowledgement: n.requiresAcknowledgement,
        acknowledgedPct: counters.get(n.id)?.acknowledgedPct ?? null,
        readPct: counters.get(n.id)?.readPct ?? null,
      })),
    };
  }

  /** Who has acknowledged, who has only opened it, and who still has to. */
  async receipts(actor: UserActor, id: string, q: NoticeReceiptsQuery) {
    const { notice, access } = await this.load(actor, id);
    if (!access.isAuthor && !access.isManager) throw notFound(NOTICE_NOT_FOUND, "NOTICE_NOT_FOUND");
    const state = q.state ?? NoticeReceiptState.PENDING;
    const ack = notice.requiresAcknowledgement;
    const branchIds = this.branchIdsOf(notice);
    const limit = clampLimit(q.limit, 25, 100);

    const audienceSql =
      notice.audience === NoticeAudience.ALL ? Prisma.empty : branchIds.length ? Prisma.sql`AND e."branchId" IN (${Prisma.join(branchIds)})` : Prisma.sql`AND FALSE`;
    const stateSql =
      state === NoticeReceiptState.ACKNOWLEDGED
        ? Prisma.sql`AND nr."acknowledgedAt" IS NOT NULL`
        : state === NoticeReceiptState.READ
          ? ack
            ? Prisma.sql`AND nr."id" IS NOT NULL AND nr."acknowledgedAt" IS NULL`
            : Prisma.sql`AND nr."id" IS NOT NULL`
          : ack
            ? Prisma.sql`AND nr."acknowledgedAt" IS NULL`
            : Prisma.sql`AND nr."id" IS NULL`;
    const text = q.q?.trim();
    const like = text ? `%${text.replace(/[\\%_]/g, (m) => `\\${m}`)}%` : null;
    const searchSql = like
      ? Prisma.sql`AND (u."displayName" ILIKE ${like} OR e."employeeCode" ILIKE ${like} OR e."designation" ILIKE ${like} OR b."name" ILIKE ${like} OR d."name" ILIKE ${like})`
      : Prisma.empty;

    // Acknowledged and read lists show the latest first; pending is alphabetical.
    const timeColumn = state === NoticeReceiptState.ACKNOWLEDGED ? Prisma.sql`nr."acknowledgedAt"` : Prisma.sql`nr."readAt"`;
    const byName = state === NoticeReceiptState.PENDING;
    const cursor = this.decodeReceiptCursor(q.cursor);
    let cursorSql = Prisma.empty;
    if (cursor && byName) cursorSql = Prisma.sql`AND (u."displayName", u."id") > (${cursor.k}, ${cursor.id})`;
    else if (cursor && !Number.isNaN(new Date(cursor.k).getTime())) cursorSql = Prisma.sql`AND (${timeColumn}, u."id") < (${utc(new Date(cursor.k))}, ${cursor.id})`;
    const orderSql = byName ? Prisma.sql`ORDER BY u."displayName" ASC, u."id" ASC` : Prisma.sql`ORDER BY ${timeColumn} DESC, u."id" DESC`;

    const rows = await this.prisma.$queryRaw<
      {
        userId: string;
        name: string;
        employeeCode: string | null;
        designation: string | null;
        department: string | null;
        branchId: string | null;
        branchName: string | null;
        branchCode: string | null;
        readAt: Date | null;
        acknowledgedAt: Date | null;
      }[]
    >`
      SELECT u."id" AS "userId", u."displayName" AS "name", e."employeeCode", e."designation", d."name" AS "department",
             b."id" AS "branchId", b."name" AS "branchName", b."code" AS "branchCode", nr."readAt", nr."acknowledgedAt"
      FROM (${this.readersSql()}) r
      JOIN "users" u ON u."id" = r."id"
      LEFT JOIN "employees" e ON e."id" = u."employeeId"
      LEFT JOIN "departments" d ON d."id" = e."departmentId"
      LEFT JOIN "branches" b ON b."id" = e."branchId"
      LEFT JOIN "notice_receipts" nr ON nr."noticeId" = ${notice.id} AND nr."userId" = u."id"
      WHERE u."id" <> ${notice.authorUserId} ${audienceSql} ${stateSql} ${searchSql} ${cursorSql}
      ${orderSql}
      LIMIT ${limit + 1}`;

    const items = rows.slice(0, limit);
    const last = items[items.length - 1];
    const c = (await this.counters([notice])).get(notice.id) ?? this.emptyCounters();
    const nextKey = last ? (byName ? last.name : (state === NoticeReceiptState.ACKNOWLEDGED ? last.acknowledgedAt : last.readAt)?.toISOString()) : null;
    return {
      notice: { id: notice.id, referenceNumber: notice.referenceNumber, title: notice.title, requiresAcknowledgement: ack, status: notice.status },
      state,
      counts: {
        audience: c.audienceSize,
        acknowledged: c.acknowledgedCount,
        read: ack ? c.readCount - c.acknowledgedCount : c.readCount,
        pending: ack ? c.audienceSize - c.acknowledgedCount : c.audienceSize - c.readCount,
      },
      items: items.map((r) => ({
        userId: r.userId,
        name: r.name,
        employeeCode: r.employeeCode,
        designation: r.designation,
        department: r.department,
        office: r.branchId ? { id: r.branchId, name: r.branchName, code: r.branchCode } : null,
        readAt: r.readAt,
        acknowledgedAt: r.acknowledgedAt,
      })),
      nextCursor: rows.length > limit && last && nextKey ? Buffer.from(JSON.stringify({ k: nextKey, id: last.userId })).toString("base64url") : null,
    };
  }

  private decodeReceiptCursor(raw?: string): { k: string; id: string } | null {
    if (!raw) return null;
    try {
      const c = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as { k: unknown; id: unknown };
      return typeof c.k === "string" && typeof c.id === "string" ? { k: c.k, id: c.id } : null;
    } catch {
      return null;
    }
  }

  /** Audience, read and acknowledged counts for many notices in one query. */
  private async counters(notices: NoticeRecord[]): Promise<Map<string, NoticeCounters>> {
    const out = new Map<string, NoticeCounters>();
    if (!notices.length) return out;
    const rows = await this.prisma.$queryRaw<{ id: string; audience: number; read: number; acknowledged: number }[]>`
      SELECT n."id",
             count(r."id")::int AS "audience",
             count(nr."id")::int AS "read",
             count(nr."acknowledgedAt")::int AS "acknowledged"
      FROM "notices" n
      JOIN (${this.readersSql()}) r
        ON r."id" <> n."authorUserId"
       AND (n."audience" = 'ALL' OR (r."branchId" IS NOT NULL AND n."branchIds" @> jsonb_build_array(r."branchId")))
      LEFT JOIN "notice_receipts" nr ON nr."noticeId" = n."id" AND nr."userId" = r."id"
      WHERE n."id" IN (${Prisma.join(notices.map((n) => n.id))})
      GROUP BY n."id"`;
    for (const n of notices) {
      const row = rows.find((r) => r.id === n.id);
      const audienceSize = row?.audience ?? 0;
      const readCount = row?.read ?? 0;
      const acknowledgedCount = row?.acknowledged ?? 0;
      out.set(n.id, {
        audienceSize,
        readCount,
        acknowledgedCount,
        acknowledgedPct: n.requiresAcknowledgement ? noticePercent(acknowledgedCount, audienceSize) : null,
        readPct: noticePercent(readCount, audienceSize),
      });
    }
    return out;
  }

  private emptyCounters(): NoticeCounters {
    return { audienceSize: 0, readCount: 0, acknowledgedCount: 0, acknowledgedPct: null, readPct: null };
  }

  private async branchMap(): Promise<Map<string, { id: string; name: string; code: string }>> {
    const rows = await this.prisma.branch.findMany({ select: { id: true, name: true, code: true } });
    return new Map(rows.map((b) => [b.id, b]));
  }

  // ── Shapes ──

  private actionsFor(n: NoticeRecord, access: Access, receipt: { acknowledgedAt: Date | null } | null, now: Date): string[] {
    const out: string[] = [];
    const expired = this.isExpired(n, now);
    if (access.asReader && !access.isAuthor && n.requiresAcknowledgement && !receipt?.acknowledgedAt && !expired) out.push(NoticeAction.ACKNOWLEDGE);
    if (access.canChange) {
      if (n.status === NoticeStatus.DRAFT) out.push(NoticeAction.EDIT, NoticeAction.PUBLISH, NoticeAction.REPLACE_ATTACHMENT, NoticeAction.DISCARD);
      if (n.status === NoticeStatus.PUBLISHED) out.push(NoticeAction.EDIT, NoticeAction.ARCHIVE);
    }
    if ((access.isAuthor || access.isManager) && n.status !== NoticeStatus.DRAFT) out.push(NoticeAction.VIEW_RECEIPTS);
    return out;
  }

  private async serialize(actor: UserActor, n: NoticeFull, access: Access) {
    const now = new Date();
    const [receipt, branches, counters] = await Promise.all([
      this.prisma.noticeReceipt.findUnique({ where: { noticeId_userId: { noticeId: n.id, userId: actor.userId } }, select: { readAt: true, acknowledgedAt: true } }),
      n.audience === NoticeAudience.BRANCHES ? this.branchMap() : Promise.resolve(new Map<string, { id: string; name: string; code: string }>()),
      access.isAuthor || access.isManager ? this.counters([n]) : Promise.resolve(null),
    ]);
    const expired = this.isExpired(n, now);
    const attachmentUrl = this.attachmentUrl(n);
    return {
      id: n.id,
      referenceNumber: n.referenceNumber,
      title: n.title,
      body: n.body,
      excerpt: noticeExcerpt(n.body),
      channel: n.channel,
      channelLabel: NOTICE_CHANNEL_LABEL[n.channel as NoticeChannel] ?? n.channel,
      category: n.category,
      categoryLabel: NOTICE_CATEGORY_LABEL[n.category as NoticeCategory] ?? n.category,
      status: n.status,
      urgent: n.urgent,
      pinned: n.pinned,
      audience: n.audience,
      branches: this.branchIdsOf(n).map((b) => branches.get(b) ?? { id: b, name: "Closed office", code: "—" }),
      requiresAcknowledgement: n.requiresAcknowledgement,
      signedBy: n.signedBy,
      author: { id: n.author.id, name: n.author.displayName, designation: n.author.employee?.designation ?? null },
      publishedAt: n.publishedAt,
      expiresAt: n.expiresAt,
      archivedAt: n.archivedAt,
      createdAt: n.createdAt,
      updatedAt: n.updatedAt,
      expired,
      hasAttachment: !!n.attachmentKey,
      attachment: n.attachmentKey ? { name: n.attachmentName ?? "notice.pdf", mimeType: n.attachmentMime ?? "application/pdf", sizeBytes: n.attachmentSize ?? 0, url: attachmentUrl } : null,
      attachmentUrl,
      read: access.isAuthor || !!receipt,
      acknowledged: !!receipt?.acknowledgedAt,
      receipt: receipt ? { readAt: receipt.readAt, acknowledgedAt: receipt.acknowledgedAt } : null,
      counters: counters ? (counters.get(n.id) ?? this.emptyCounters()) : null,
      viewer: {
        isAuthor: access.isAuthor,
        canManage: access.isManager,
        inAudience: access.inAudience,
        actions: this.actionsFor(n, access, receipt, now),
      },
    };
  }

  private serializeRow(actor: UserActor, n: NoticeRecord, receipt: { readAt: Date; acknowledgedAt: Date | null } | null, now: Date) {
    const isAuthor = n.authorUserId === actor.userId;
    const acknowledged = !!receipt?.acknowledgedAt;
    const expired = this.isExpired(n, now);
    return {
      id: n.id,
      referenceNumber: n.referenceNumber,
      title: n.title,
      excerpt: noticeExcerpt(n.body),
      channel: n.channel,
      category: n.category,
      urgent: n.urgent,
      pinned: n.pinned,
      signedBy: n.signedBy,
      publishedAt: n.publishedAt,
      expiresAt: n.expiresAt,
      hasAttachment: !!n.attachmentKey,
      requiresAcknowledgement: n.requiresAcknowledgement,
      read: isAuthor || !!receipt,
      acknowledged,
      /** The reader still owes an acknowledgement. */
      awaitingAcknowledgement: n.status === NoticeStatus.PUBLISHED && n.requiresAcknowledgement && !acknowledged && !isAuthor && !expired,
      isAuthor,
    };
  }
}
