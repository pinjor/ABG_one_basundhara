import { Inject, Injectable, Logger } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import {
  ANONYMOUS_REPORTER,
  Capability,
  INCIDENT_CATEGORY_LABEL,
  INCIDENT_LIMITS,
  INCIDENT_STATUS_LABEL,
  IncidentCategory,
  IncidentPhotoKind,
  IncidentSeverity,
  IncidentStatus,
  IncidentUpdateType,
  NotificationCategory,
  OPEN_INCIDENT_STATUSES,
  RoleCode,
  canIncidentTransition,
  dhakaDateStamp,
  formatIncidentNumber,
} from "@abg-dispatch/shared";
import { APP_CONFIG, type AppConfig } from "../common/config";
import { PrismaService, type Tx } from "../common/prisma.service";
import type { Actor, UserActor } from "../common/actor";
import { badRequest, conflict, forbidden, notFound } from "../common/errors";
import { hmacSha256 } from "../common/crypto";
import { clampLimit, decodeCursor, encodeCursor } from "../common/pagination";
import { dhakaDayRange } from "../common/time";
import { AuditService } from "../audit/audit.service";
import { NotificationService } from "../notifications/notification.service";
import { StorageService, sniffMime } from "../attachments/storage.service";
import { branchScope } from "../admin/admin-scope";
import type { AdminIncidentsQuery, IncidentDetailsDto, MyIncidentsQuery, ReportIncidentDto } from "./incidents.dto";

export const INCIDENT_NOT_FOUND = "Report not found, or you do not have access to it.";
const PHOTO_LINK_TTL_SECONDS = 600;

const INCLUDE = {
  branch: { select: { id: true, name: true, code: true } },
  location: { select: { id: true, name: true, path: true } },
  reporter: {
    select: {
      id: true,
      displayName: true,
      employee: { select: { employeeCode: true, designation: true, phone: true, department: { select: { name: true } } } },
    },
  },
  photos: { orderBy: { createdAt: "asc" as const } },
  updates: { orderBy: { createdAt: "asc" as const } },
} satisfies Prisma.IncidentInclude;

const ROW_INCLUDE = {
  branch: { select: { id: true, name: true, code: true } },
  location: { select: { path: true } },
  reporter: { select: { displayName: true, employee: { select: { employeeCode: true } } } },
  photos: { select: { id: true, kind: true }, orderBy: { createdAt: "asc" as const } },
} satisfies Prisma.IncidentInclude;

type IncidentFull = Prisma.IncidentGetPayload<{ include: typeof INCLUDE }>;
type IncidentRow = Prisma.IncidentGetPayload<{ include: typeof ROW_INCLUDE }>;

export interface UploadedPhoto {
  buffer: Buffer;
  originalname: string;
  size: number;
}

/**
 * Workplace incident reports. Anyone can report; the office's admins (head
 * office only, for misconduct) are told immediately and work it through
 * Pending → Processing → Done (or Declined), and the reporter is told at each
 * step. History is append-only.
 */
@Injectable()
export class IncidentsService {
  private readonly logger = new Logger("IncidentsService");

  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly notifications: NotificationService,
    private readonly audit: AuditService,
  ) {}

  // ── Access ──

  /**
   * Who may see a report other than its reporter: anyone with incident.view
   * whose offices include it. Branch-scoped admins never see misconduct
   * reports — those go to head office, so a report can't land on the desk of
   * the person it is about.
   */
  private visibleToStaff(actor: UserActor): Prisma.IncidentWhereInput | null {
    if (!actor.capabilities.has(Capability.INCIDENT_VIEW)) return null;
    const scope = branchScope(actor);
    if (!scope) return {};
    return { branchId: { in: scope }, category: { not: IncidentCategory.MISCONDUCT } };
  }

  private async load(actor: UserActor, id: string): Promise<{ incident: IncidentFull; isReporter: boolean; isStaff: boolean }> {
    const incident = await this.prisma.incident.findUnique({ where: { id }, include: INCLUDE });
    if (!incident) throw notFound(INCIDENT_NOT_FOUND, "INCIDENT_NOT_FOUND");
    const isReporter = incident.reporterUserId === actor.userId;
    const staffWhere = this.visibleToStaff(actor);
    const isStaff = !!staffWhere && (await this.prisma.incident.count({ where: { AND: [{ id }, staffWhere] } })) > 0;
    if (!isReporter && !isStaff) throw notFound(INCIDENT_NOT_FOUND, "INCIDENT_NOT_FOUND");
    return { incident, isReporter, isStaff };
  }

  private canManage(actor: UserActor, isStaff: boolean): boolean {
    return isStaff && actor.capabilities.has(Capability.INCIDENT_MANAGE);
  }

  // ── Reporting ──

  async report(actor: UserActor, dto: ReportIncidentDto, files: UploadedPhoto[]) {
    if (files.length > INCIDENT_LIMITS.maxReportPhotos) throw badRequest(`Attach at most ${INCIDENT_LIMITS.maxReportPhotos} photos.`, "TOO_MANY_PHOTOS");
    const branchId = dto.branchId ?? actor.branchId;
    if (!branchId) throw badRequest("Choose the office where this happened.", "BRANCH_REQUIRED");
    const branch = await this.prisma.branch.findUnique({ where: { id: branchId } });
    if (!branch || !branch.active) throw badRequest("Choose an active office.", "BRANCH_INVALID");
    if (dto.locationId) {
      const loc = await this.prisma.location.findUnique({ where: { id: dto.locationId } });
      if (!loc || loc.branchId !== branchId) throw badRequest("That place is not in the chosen office.", "LOCATION_INVALID");
    }
    // Check every photo before storing any of them.
    const checked = files.map((f) => {
      const type = sniffMime(f.buffer);
      if (!type || !type.mime.startsWith("image/")) throw badRequest("Photos must be JPEG, PNG or WebP images.", "PHOTO_TYPE");
      if (f.size > this.config.maxUploadBytes) throw badRequest("Each photo must be 10 MB or smaller.", "PHOTO_TOO_LARGE");
      return { file: f, type };
    });
    const stored: { file: UploadedPhoto; type: { mime: string; ext: string }; key: string }[] = [];
    for (const c of checked) stored.push({ ...c, key: await this.storage.put(c.file.buffer, c.type.ext) });

    const anonymous = !!dto.anonymous;
    const now = new Date();
    const incident = await this.prisma.$transaction(async (tx) => {
      const referenceNumber = await this.nextNumber(tx, branch.code, now);
      const created = await tx.incident.create({
        data: {
          referenceNumber,
          title: dto.title.trim(),
          description: dto.description?.trim() ?? "",
          category: dto.category,
          severity: dto.severity ?? IncidentSeverity.MEDIUM,
          status: IncidentStatus.PENDING,
          branchId,
          locationId: dto.locationId ?? null,
          locationDetail: dto.locationDetail?.trim() || null,
          reporterUserId: actor.userId,
          anonymous,
          statusChangedAt: now,
        },
      });
      for (const s of stored) {
        await tx.incidentPhoto.create({
          data: {
            incidentId: created.id,
            kind: IncidentPhotoKind.REPORT,
            storageKey: s.key,
            fileName: this.safeName(s.file.originalname, s.type.ext),
            mimeType: s.type.mime,
            sizeBytes: s.file.size,
            uploadedByUserId: anonymous ? null : actor.userId,
          },
        });
      }
      await tx.incidentUpdate.create({
        data: {
          incidentId: created.id,
          type: IncidentUpdateType.SUBMITTED,
          toStatus: IncidentStatus.PENDING,
          actorUserId: anonymous ? null : actor.userId,
          actorName: anonymous ? ANONYMOUS_REPORTER : actor.displayName,
          metadata: { photos: stored.length },
        },
      });
      return created;
    });

    await this.notifyHandlers(incident, branch.name, anonymous ? null : actor.displayName, actor.userId);
    return this.get(actor, incident.id);
  }

  private async nextNumber(tx: Tx, branchCode: string, now: Date): Promise<string> {
    const day = dhakaDateStamp(now);
    const rows = await tx.$queryRaw<{ lastValue: number }[]>`
      INSERT INTO "tracking_sequences" ("branchCode", "dayStamp", "lastValue")
      VALUES (${`INC:${branchCode}`}, ${day}, 1)
      ON CONFLICT ("branchCode", "dayStamp")
      DO UPDATE SET "lastValue" = "tracking_sequences"."lastValue" + 1
      RETURNING "lastValue"`;
    return formatIncidentNumber(day, branchCode, Number(rows[0].lastValue));
  }

  private safeName(original: string, ext: string): string {
    return (original || `photo.${ext}`).replace(/[^\w.\- ]+/g, "_").slice(0, 120);
  }

  /** The people who must act: the office's branch admins and head office (head office only for misconduct). */
  private async handlers(branchId: string, category: string): Promise<string[]> {
    const headOffice = await this.notifications.headOfficeUsers();
    const users = category === IncidentCategory.MISCONDUCT ? headOffice : [...(await this.notifications.opsUsers([branchId], [RoleCode.BRANCH_ADMIN])), ...headOffice];
    return users.length ? users : this.notifications.superAdminUsers();
  }

  private async notifyHandlers(incident: { id: string; referenceNumber: string; title: string; category: string; severity: string; branchId: string }, branchName: string, reporterName: string | null, reporterUserId: string) {
    const userIds = (await this.handlers(incident.branchId, incident.category)).filter((u) => u !== reporterUserId);
    const misconduct = incident.category === IncidentCategory.MISCONDUCT;
    const label = INCIDENT_CATEGORY_LABEL[incident.category as IncidentCategory] ?? incident.category;
    const urgent = incident.severity === IncidentSeverity.URGENT || incident.severity === IncidentSeverity.HIGH;
    await this.notifications.deliverIncident(
      incident,
      `incident:${incident.id}:reported`,
      "INCIDENT_REPORTED",
      userIds.map((userId) => ({
        userId,
        category: NotificationCategory.ACTION_REQUIRED,
        title: `${urgent ? "Urgent: " : ""}New ${misconduct ? "confidential report" : "incident"} at ${branchName}`,
        body: misconduct
          ? `${incident.referenceNumber} · A confidential report needs head-office review.`
          : `${incident.title} — ${label}. ${incident.referenceNumber}${reporterName ? ` · reported by ${reporterName}` : ""}`,
      })),
      misconduct,
      IncidentStatus.PENDING,
    );
  }

  private async notifyReporter(incident: { id: string; referenceNumber: string; title: string; reporterUserId: string; category: string; status: string }, key: string, title: string, note?: string | null) {
    const misconduct = incident.category === IncidentCategory.MISCONDUCT;
    await this.notifications.deliverIncident(
      incident,
      key,
      "INCIDENT_UPDATED",
      [{ userId: incident.reporterUserId, category: NotificationCategory.PARCEL_UPDATE, title, body: `${incident.referenceNumber} · ${incident.title}${note ? ` — ${note}` : ""}` }],
      misconduct,
      incident.status,
    );
  }

  // ── Reading ──

  async get(actor: UserActor, id: string) {
    const { incident, isReporter, isStaff } = await this.load(actor, id);
    return this.serialize(actor, incident, isReporter, isStaff);
  }

  async mine(actor: UserActor, q: MyIncidentsQuery) {
    const where: Prisma.IncidentWhereInput[] = [{ reporterUserId: actor.userId }];
    if (q.state === "open") where.push({ status: { in: [...OPEN_INCIDENT_STATUSES] } });
    if (q.state === "closed") where.push({ status: { notIn: [...OPEN_INCIDENT_STATUSES] } });
    return this.page(actor, where, q.cursor, q.limit, true);
  }

  async list(actor: UserActor, q: AdminIncidentsQuery) {
    const staff = this.visibleToStaff(actor);
    if (!staff) throw forbidden("Your role does not include incident reports.");
    const where: Prisma.IncidentWhereInput[] = [staff];
    if (q.status === "OPEN") where.push({ status: { in: [...OPEN_INCIDENT_STATUSES] } });
    else if (q.status && q.status !== "ALL") where.push({ status: q.status });
    if (q.branchId) where.push({ branchId: q.branchId });
    if (q.category) where.push({ category: q.category });
    if (q.severity) where.push({ severity: q.severity });
    if (q.dateFrom || q.dateTo) {
      where.push({ createdAt: { gte: q.dateFrom ? dhakaDayRange(q.dateFrom).gte : undefined, lt: q.dateTo ? dhakaDayRange(q.dateTo).lt : undefined } });
    }
    const text = q.q?.trim();
    if (text) {
      where.push({
        OR: [
          { referenceNumber: { contains: text, mode: "insensitive" } },
          { title: { contains: text, mode: "insensitive" } },
          { description: { contains: text, mode: "insensitive" } },
          { locationDetail: { contains: text, mode: "insensitive" } },
          // Searching by reporter never matches anonymous reports.
          { anonymous: false, reporter: { OR: [{ displayName: { contains: text, mode: "insensitive" } }, { employee: { employeeCode: { contains: text, mode: "insensitive" } } }] } },
        ],
      });
    }
    return this.page(actor, where, q.cursor, q.limit, false);
  }

  private async page(actor: UserActor, where: Prisma.IncidentWhereInput[], cursorRaw: string | undefined, limitRaw: string | undefined, own: boolean) {
    const limit = clampLimit(limitRaw, 25, 100);
    const cursor = decodeCursor(cursorRaw);
    if (cursor) where.push({ OR: [{ createdAt: { lt: cursor.createdAt } }, { createdAt: cursor.createdAt, id: { lt: cursor.id } }] });
    const rows = await this.prisma.incident.findMany({ where: { AND: where }, include: ROW_INCLUDE, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: limit + 1 });
    const items = rows.slice(0, limit);
    return {
      items: items.map((r) => this.serializeRow(r, own || r.reporterUserId === actor.userId)),
      nextCursor: rows.length > limit ? encodeCursor(items[items.length - 1].createdAt, items[items.length - 1].id) : null,
    };
  }

  async summary(actor: UserActor, branchId?: string) {
    const staff = this.visibleToStaff(actor);
    if (!staff) throw forbidden("Your role does not include incident reports.");
    const base: Prisma.IncidentWhereInput = { AND: [staff, branchId ? { branchId } : {}] };
    const grouped = await this.prisma.incident.groupBy({ by: ["status"], where: base, _count: { _all: true } });
    const counts = Object.fromEntries(Object.values(IncidentStatus).map((s) => [s, grouped.find((g) => g.status === s)?._count._all ?? 0]));
    const urgentOpen = await this.prisma.incident.count({ where: { AND: [base, { status: { in: [...OPEN_INCIDENT_STATUSES] } }, { severity: { in: [IncidentSeverity.URGENT, IncidentSeverity.HIGH] } }] } });
    const oldestPending = await this.prisma.incident.findFirst({ where: { AND: [base, { status: IncidentStatus.PENDING }] }, orderBy: { createdAt: "asc" }, select: { createdAt: true } });
    const since = new Date(Date.now() - 30 * 86_400_000);
    const done = await this.prisma.incident.findMany({ where: { AND: [base, { status: IncidentStatus.DONE, doneAt: { gte: since } }] }, select: { createdAt: true, doneAt: true } });
    const avgHoursToDone = done.length ? Math.round((done.reduce((s, d) => s + (d.doneAt!.getTime() - d.createdAt.getTime()), 0) / done.length / 3_600_000) * 10) / 10 : null;
    return { counts, open: counts.PENDING + counts.PROCESSING, urgentOpen, oldestPendingAt: oldestPending?.createdAt ?? null, doneLast30Days: done.length, avgHoursToDone };
  }

  // ── Handling ──

  async changeStatus(actor: UserActor, id: string, status: string, note?: string) {
    const { incident, isStaff } = await this.load(actor, id);
    if (!this.canManage(actor, isStaff)) throw forbidden("Only the office's admins can update this report.");
    const text = note?.trim() || null;
    if (status === IncidentStatus.DECLINED && (!text || text.length < 3)) throw badRequest("Tell the reporter why this report is declined.", "REASON_REQUIRED");
    const now = new Date();
    const updated = await this.prisma.$transaction(async (tx) => {
      // Lock the row so two admins can't both close it.
      const [current] = await tx.$queryRaw<{ status: string }[]>`SELECT "status" FROM "incidents" WHERE "id" = ${id} FOR UPDATE`;
      if (!canIncidentTransition(current.status, status)) {
        throw conflict("INCIDENT_STATE_CONFLICT", `This report is already ${INCIDENT_STATUS_LABEL[current.status as IncidentStatus]}; it cannot become ${INCIDENT_STATUS_LABEL[status as IncidentStatus] ?? status}.`);
      }
      const reopening = status === IncidentStatus.PROCESSING && current.status !== IncidentStatus.PENDING;
      const row = await tx.incident.update({
        where: { id },
        data: {
          status,
          statusNote: text,
          statusChangedAt: now,
          lastHandledById: actor.userId,
          processingAt: status === IncidentStatus.PROCESSING && !incident.processingAt ? now : undefined,
          doneAt: status === IncidentStatus.DONE ? now : reopening ? null : undefined,
          declinedAt: status === IncidentStatus.DECLINED ? now : reopening ? null : undefined,
        },
      });
      await tx.incidentUpdate.create({
        data: { incidentId: id, type: IncidentUpdateType.STATUS_CHANGED, fromStatus: current.status, toStatus: status, note: text, actorUserId: actor.userId, actorName: actor.displayName, metadata: { reopened: reopening } },
      });
      await this.audit.record(
        { actor, action: "incident.status_changed", objectType: "incident", objectId: id, summary: `${incident.referenceNumber}: ${INCIDENT_STATUS_LABEL[current.status as IncidentStatus]} → ${INCIDENT_STATUS_LABEL[status as IncidentStatus]}`, before: { status: current.status }, after: { status, note: text } },
        tx,
      );
      return { row, reopening };
    });
    const title =
      status === IncidentStatus.DONE
        ? "Your report has been resolved"
        : status === IncidentStatus.DECLINED
          ? "Your report was declined"
          : updated.reopening
            ? "Your report was reopened"
            : "Your report is being processed";
    await this.notifyReporter(updated.row, `incident:${id}:status:${status}:${now.getTime()}`, title, text);
    return this.get(actor, id);
  }

  async addNote(actor: UserActor, id: string, note: string) {
    const { incident, isStaff } = await this.load(actor, id);
    if (!this.canManage(actor, isStaff)) throw forbidden("Only the office's admins can update this report.");
    const text = note.trim();
    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.incident.update({ where: { id }, data: { statusNote: text, lastHandledById: actor.userId } });
      await tx.incidentUpdate.create({ data: { incidentId: id, type: IncidentUpdateType.NOTE_ADDED, note: text, actorUserId: actor.userId, actorName: actor.displayName } });
      await this.audit.record({ actor, action: "incident.note_added", objectType: "incident", objectId: id, summary: `${incident.referenceNumber}: update for the reporter` }, tx);
    });
    await this.notifyReporter(incident, `incident:${id}:note:${now.getTime()}`, "Update on your report", text);
    return this.get(actor, id);
  }

  async updateDetails(actor: UserActor, id: string, dto: IncidentDetailsDto) {
    const { incident, isStaff } = await this.load(actor, id);
    if (!this.canManage(actor, isStaff)) throw forbidden("Only the office's admins can update this report.");
    const changes: Record<string, { before: string; after: string }> = {};
    if (dto.severity && dto.severity !== incident.severity) changes.severity = { before: incident.severity, after: dto.severity };
    if (dto.category && dto.category !== incident.category) changes.category = { before: incident.category, after: dto.category };
    if (!Object.keys(changes).length) return this.get(actor, id);
    await this.prisma.$transaction(async (tx) => {
      await tx.incident.update({ where: { id }, data: { severity: dto.severity, category: dto.category } });
      await tx.incidentUpdate.create({ data: { incidentId: id, type: IncidentUpdateType.DETAILS_CHANGED, actorUserId: actor.userId, actorName: actor.displayName, metadata: changes } });
      await this.audit.record({ actor, action: "incident.details_changed", objectType: "incident", objectId: id, summary: `${incident.referenceNumber}: ${Object.keys(changes).join(", ")} changed`, before: Object.fromEntries(Object.entries(changes).map(([k, v]) => [k, v.before])), after: Object.fromEntries(Object.entries(changes).map(([k, v]) => [k, v.after])) }, tx);
    });
    // Re-categorising as misconduct moves it to head office.
    if (changes.category?.after === IncidentCategory.MISCONDUCT) {
      const branch = await this.prisma.branch.findUniqueOrThrow({ where: { id: incident.branchId } });
      await this.notifyHandlers({ ...incident, category: IncidentCategory.MISCONDUCT }, branch.name, null, incident.reporterUserId);
    }
    const scoped = this.visibleToStaff(actor);
    const stillVisible = actor.userId === incident.reporterUserId || (scoped && (await this.prisma.incident.count({ where: { AND: [{ id }, scoped] } })) > 0);
    return stillVisible ? this.get(actor, id) : { id, movedToHeadOffice: true };
  }

  /** Reporter: more photos of the problem while it's open. Admins: photos proving the fix. */
  async addPhoto(actor: UserActor, id: string, file: UploadedPhoto | undefined, note?: string) {
    if (!file) throw badRequest("Attach a photo in the `photo` field.", "PHOTO_REQUIRED");
    const { incident, isReporter, isStaff } = await this.load(actor, id);
    const manager = this.canManage(actor, isStaff);
    const kind = manager ? IncidentPhotoKind.RESOLUTION : IncidentPhotoKind.REPORT;
    if (!manager) {
      if (!isReporter) throw forbidden("You cannot add photos to this report.");
      if (!OPEN_INCIDENT_STATUSES.includes(incident.status as IncidentStatus)) throw conflict("INCIDENT_CLOSED", "This report is closed; photos can no longer be added.");
    }
    const max = kind === IncidentPhotoKind.REPORT ? INCIDENT_LIMITS.maxReportPhotos : INCIDENT_LIMITS.maxResolutionPhotos;
    if (incident.photos.filter((p) => p.kind === kind).length >= max) throw badRequest(`This report already has ${max} photos of that kind.`, "TOO_MANY_PHOTOS");
    const type = sniffMime(file.buffer);
    if (!type || !type.mime.startsWith("image/")) throw badRequest("Photos must be JPEG, PNG or WebP images.", "PHOTO_TYPE");
    if (file.size > this.config.maxUploadBytes) throw badRequest("Each photo must be 10 MB or smaller.", "PHOTO_TOO_LARGE");
    const key = await this.storage.put(file.buffer, type.ext);
    const anonymousReporter = !manager && incident.anonymous;
    await this.prisma.$transaction(async (tx) => {
      const photo = await tx.incidentPhoto.create({
        data: { incidentId: id, kind, storageKey: key, fileName: this.safeName(file.originalname, type.ext), mimeType: type.mime, sizeBytes: file.size, uploadedByUserId: anonymousReporter ? null : actor.userId },
      });
      await tx.incidentUpdate.create({
        data: {
          incidentId: id,
          type: IncidentUpdateType.PHOTO_ADDED,
          note: note?.trim() || null,
          actorUserId: anonymousReporter ? null : actor.userId,
          actorName: anonymousReporter ? ANONYMOUS_REPORTER : actor.displayName,
          metadata: { photoId: photo.id, kind },
        },
      });
      if (manager) await this.audit.record({ actor, action: "incident.photo_added", objectType: "incident", objectId: id, summary: `${incident.referenceNumber}: resolution photo added` }, tx);
    });
    return this.get(actor, id);
  }

  // ── Photos ──

  /** Short-lived signed URL usable in <img> / Image.network without an auth header. */
  private photoUrl(photoId: string): string {
    const exp = Math.floor(Date.now() / 1000) + PHOTO_LINK_TTL_SECONDS;
    return `/api/incident-photos/${photoId}/content?exp=${exp}&sig=${this.sign(photoId, exp)}`;
  }

  sign(photoId: string, exp: number): string {
    return hmacSha256(this.config.jwtSecret, `incident-photo.${photoId}.${exp}`, "base64url");
  }

  async photoForSignedLink(photoId: string) {
    const photo = await this.prisma.incidentPhoto.findUnique({ where: { id: photoId } });
    if (!photo) throw notFound("Photo not found.");
    return photo;
  }

  async photoFor(actor: UserActor, incidentId: string, photoId: string) {
    const { incident } = await this.load(actor, incidentId);
    const photo = incident.photos.find((p) => p.id === photoId);
    if (!photo) throw notFound("Photo not found.");
    return photo;
  }

  async readPhoto(storageKey: string): Promise<Buffer> {
    return this.storage.get(storageKey);
  }

  // ── Shapes ──

  private actionsFor(actor: UserActor, incident: { status: string; photos: { kind: string }[] }, isReporter: boolean, isStaff: boolean): string[] {
    const out: string[] = [];
    if (this.canManage(actor, isStaff)) {
      const s = incident.status;
      if (s === IncidentStatus.PENDING) out.push("START_PROCESSING");
      if (s === IncidentStatus.DONE || s === IncidentStatus.DECLINED) out.push("REOPEN");
      if (canIncidentTransition(s, IncidentStatus.DONE)) out.push("MARK_DONE");
      if (canIncidentTransition(s, IncidentStatus.DECLINED)) out.push("DECLINE");
      out.push("ADD_NOTE", "EDIT_DETAILS");
      if (incident.photos.filter((p) => p.kind === IncidentPhotoKind.RESOLUTION).length < INCIDENT_LIMITS.maxResolutionPhotos) out.push("ADD_RESOLUTION_PHOTO");
    } else if (isReporter && OPEN_INCIDENT_STATUSES.includes(incident.status as IncidentStatus) && incident.photos.filter((p) => p.kind === IncidentPhotoKind.REPORT).length < INCIDENT_LIMITS.maxReportPhotos) {
      out.push("ADD_PHOTO");
    }
    return out;
  }

  private serialize(actor: UserActor, i: IncidentFull, isReporter: boolean, isStaff: boolean) {
    const showReporter = isReporter || !i.anonymous;
    return {
      id: i.id,
      referenceNumber: i.referenceNumber,
      title: i.title,
      description: i.description,
      category: i.category,
      severity: i.severity,
      status: i.status,
      statusNote: i.statusNote,
      statusChangedAt: i.statusChangedAt,
      processingAt: i.processingAt,
      doneAt: i.doneAt,
      declinedAt: i.declinedAt,
      createdAt: i.createdAt,
      branch: i.branch,
      location: i.location,
      locationDetail: i.locationDetail,
      anonymous: i.anonymous,
      reporter: showReporter
        ? {
            name: i.reporter.displayName,
            employeeCode: i.reporter.employee?.employeeCode ?? null,
            designation: i.reporter.employee?.designation ?? null,
            department: i.reporter.employee?.department?.name ?? null,
            phone: isStaff || isReporter ? (i.reporter.employee?.phone ?? null) : null,
          }
        : null,
      photos: i.photos.map((p) => ({ id: p.id, kind: p.kind, mimeType: p.mimeType, createdAt: p.createdAt, url: this.photoUrl(p.id) })),
      updates: i.updates.map((u) => ({
        id: u.id,
        type: u.type,
        fromStatus: u.fromStatus,
        toStatus: u.toStatus,
        note: u.note,
        actor: u.type === IncidentUpdateType.SUBMITTED && isReporter ? "You" : u.actorName,
        metadata: u.metadata,
        createdAt: u.createdAt,
      })),
      viewer: { isReporter, isStaff, canManage: this.canManage(actor, isStaff), actions: this.actionsFor(actor, i, isReporter, isStaff) },
    };
  }

  private serializeRow(r: IncidentRow, isReporter: boolean) {
    const first = r.photos.find((p) => p.kind === IncidentPhotoKind.REPORT);
    return {
      id: r.id,
      referenceNumber: r.referenceNumber,
      title: r.title,
      category: r.category,
      severity: r.severity,
      status: r.status,
      statusNote: r.statusNote,
      statusChangedAt: r.statusChangedAt,
      createdAt: r.createdAt,
      branch: r.branch,
      place: [r.location?.path, r.locationDetail].filter(Boolean).join(" · ") || null,
      anonymous: r.anonymous,
      reporterName: isReporter || !r.anonymous ? r.reporter.displayName : null,
      reporterCode: isReporter || !r.anonymous ? (r.reporter.employee?.employeeCode ?? null) : null,
      photoCount: r.photos.length,
      thumbnailUrl: first ? this.photoUrl(first.id) : null,
    };
  }
}
