import { Inject, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import {
  ANONYMOUS_REPORTER,
  CONFIDENTIAL_REPORTER,
  Capability,
  INCIDENT_CATEGORY_GROUP,
  INCIDENT_CATEGORY_LABEL,
  INCIDENT_CONFIDENTIAL_ROLES,
  INCIDENT_GROUPS,
  INCIDENT_GROUP_LABEL,
  INCIDENT_LIMITS,
  INCIDENT_RESOLUTION_LABEL,
  INCIDENT_STAGES,
  INCIDENT_STATUS_LABEL,
  IncidentCategory,
  IncidentGroup,
  IncidentPhotoKind,
  IncidentResolution,
  IncidentSeverity,
  IncidentStatus,
  IncidentUpdateType,
  NotificationCategory,
  OPEN_INCIDENT_STATUSES,
  RoleCode,
  URGENT_INCIDENT_SEVERITIES,
  canIncidentTransition,
  dhakaDateStamp,
  formatIncidentNumber,
  incidentForcesConfidential,
  incidentResolutionNeedsNote,
  isIncidentOpen,
} from "@abg-dispatch/shared";
import { APP_CONFIG, type AppConfig } from "../common/config";
import { PrismaService, type Tx } from "../common/prisma.service";
import type { UserActor } from "../common/actor";
import { badRequest, conflict, forbidden, notFound } from "../common/errors";
import { hmacSha256 } from "../common/crypto";
import { clampLimit, decodeCursor, encodeCursor } from "../common/pagination";
import { dhakaDayRange } from "../common/time";
import { AuditService } from "../audit/audit.service";
import { NotificationService } from "../notifications/notification.service";
import { StorageService, sniffMime } from "../attachments/storage.service";
import { moduleScope } from "../admin/admin-scope";
import type { AdminIncidentsQuery, IncidentDetailsDto, IncidentStatusDto, MyIncidentsQuery, ReportIncidentDto } from "./incidents.dto";

export const INCIDENT_NOT_FOUND = "Report not found, or you do not have access to it.";
const PHOTO_LINK_TTL_SECONDS = 600;
/** Roles that see every office's reports (on top of super admin, head office admin and auditor). */
const ORG_WIDE_ROLES: readonly RoleCode[] = [RoleCode.EXECUTIVE];

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
type Notifiable = { id: string; referenceNumber: string; title: string; category: string; severity: string; branchId: string; confidential: boolean; status: string };

export interface UploadedPhoto {
  buffer: Buffer;
  originalname: string;
  size: number;
}

/** Stage of the tracker, as both apps draw it. */
export type StageState = "done" | "current" | "upcoming" | "skipped";

/** The reporter's name is hidden from handlers on anonymous and on confidential reports. */
const identityHidden = (i: { anonymous: boolean; confidential: boolean }) => i.anonymous || i.confidential;
const hiddenReporterName = (i: { anonymous: boolean }) => (i.anonymous ? ANONYMOUS_REPORTER : CONFIDENTIAL_REPORTER);
const label = <T extends string>(map: Record<T, string>, value: string) => map[value as T] ?? value;

/**
 * Incident & Facility Issue Management. Anyone can report, in one of four
 * groups; the office's admins and head office are told at once (head office
 * only for a confidential report) and take it through Reported → Acknowledged
 * → Under Investigation → Closed (with a resolution), telling the reporter at
 * every step. History is append-only.
 */
@Injectable()
export class IncidentsService {
  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly notifications: NotificationService,
    private readonly audit: AuditService,
  ) {}

  // ── Access ──

  private seesConfidential(actor: UserActor): boolean {
    return actor.roles.some((r) => INCIDENT_CONFIDENTIAL_ROLES.includes(r));
  }

  /**
   * Which reports someone other than the reporter may see: anyone with
   * incident.view, for the offices in their scope (every office for super
   * admins, head office admins, auditors and the MD / Chairman). Confidential
   * reports only ever reach head office — never the office's own admins, so a
   * report can't land on the desk of the person it is about.
   */
  private visibleToStaff(actor: UserActor): Prisma.IncidentWhereInput | null {
    if (!actor.capabilities.has(Capability.INCIDENT_VIEW)) return null;
    const scope = moduleScope(actor, ORG_WIDE_ROLES);
    const parts: Prisma.IncidentWhereInput[] = [];
    if (scope) parts.push({ branchId: { in: scope } });
    if (!this.seesConfidential(actor)) parts.push({ confidential: false });
    return parts.length ? { AND: parts } : {};
  }

  private async isVisibleToStaff(actor: UserActor, id: string): Promise<boolean> {
    const staffWhere = this.visibleToStaff(actor);
    return !!staffWhere && (await this.prisma.incident.count({ where: { AND: [{ id }, staffWhere] } })) > 0;
  }

  private async load(actor: UserActor, id: string): Promise<{ incident: IncidentFull; isReporter: boolean; isStaff: boolean }> {
    const incident = await this.prisma.incident.findUnique({ where: { id }, include: INCLUDE });
    if (!incident) throw notFound(INCIDENT_NOT_FOUND, "INCIDENT_NOT_FOUND");
    const isReporter = incident.reporterUserId === actor.userId;
    const isStaff = await this.isVisibleToStaff(actor, id);
    if (!isReporter && !isStaff) throw notFound(INCIDENT_NOT_FOUND, "INCIDENT_NOT_FOUND");
    return { incident, isReporter, isStaff };
  }

  private canManage(actor: UserActor, isStaff: boolean): boolean {
    return isStaff && actor.capabilities.has(Capability.INCIDENT_MANAGE);
  }

  private requireManager(actor: UserActor, isStaff: boolean) {
    if (!this.canManage(actor, isStaff)) throw forbidden("Only the office's admins can update this report.");
  }

  // ── Reporting ──

  async report(actor: UserActor, dto: ReportIncidentDto, files: UploadedPhoto[]) {
    if (files.length > INCIDENT_LIMITS.maxReportPhotos) throw badRequest(`Attach at most ${INCIDENT_LIMITS.maxReportPhotos} photos.`, "TOO_MANY_PHOTOS");
    const category = dto.category as IncidentCategory;
    const group = INCIDENT_CATEGORY_GROUP[category];
    if (dto.group && dto.group !== group) {
      throw badRequest(`${INCIDENT_CATEGORY_LABEL[category]} is not part of ${label(INCIDENT_GROUP_LABEL, dto.group)}. Choose a sub-category from that group.`, "CATEGORY_GROUP_MISMATCH");
    }
    const branchId = dto.branchId ?? actor.branchId;
    if (!branchId) throw badRequest("Choose the office where this happened.", "BRANCH_REQUIRED");
    const branch = await this.prisma.branch.findUnique({ where: { id: branchId } });
    if (!branch || !branch.active) throw badRequest("Choose an active office.", "BRANCH_INVALID");
    if (dto.locationId) {
      const loc = await this.prisma.location.findUnique({ where: { id: dto.locationId } });
      if (!loc || loc.branchId !== branchId) throw badRequest("That place is not in the chosen office.", "LOCATION_INVALID");
    }
    // Check every photo before storing any of them.
    const checked = files.map((f) => ({ file: f, type: this.checkPhoto(f) }));
    const stored: { file: UploadedPhoto; type: { mime: string; ext: string }; key: string }[] = [];
    for (const c of checked) stored.push({ ...c, key: await this.storage.put(c.file.buffer, c.type.ext) });

    const anonymous = !!dto.anonymous;
    // Misconduct is always confidential, whatever the form said.
    const confidential = !!dto.confidential || incidentForcesConfidential(category);
    const hidden = anonymous || confidential;
    const now = new Date();
    const incident = await this.prisma.$transaction(async (tx) => {
      const referenceNumber = await this.nextNumber(tx, branch.code, now);
      const created = await tx.incident.create({
        data: {
          referenceNumber,
          title: dto.title.trim(),
          description: dto.description?.trim() ?? "",
          group,
          category,
          severity: dto.severity ?? IncidentSeverity.MEDIUM,
          status: IncidentStatus.REPORTED,
          branchId,
          locationId: dto.locationId ?? null,
          locationDetail: dto.locationDetail?.trim() || null,
          reporterUserId: actor.userId,
          anonymous,
          confidential,
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
            uploadedByUserId: hidden ? null : actor.userId,
          },
        });
      }
      await tx.incidentUpdate.create({
        data: {
          incidentId: created.id,
          type: IncidentUpdateType.SUBMITTED,
          toStatus: IncidentStatus.REPORTED,
          actorUserId: hidden ? null : actor.userId,
          actorName: hidden ? hiddenReporterName({ anonymous }) : actor.displayName,
          metadata: { photos: stored.length, confidential, anonymous },
        },
      });
      return created;
    });

    const recipients = (await this.handlers(incident.branchId, confidential)).filter((u) => u !== actor.userId);
    await this.alertHandlers(incident, branch.name, recipients, hidden ? null : actor.displayName, `incident:${incident.id}:reported`);
    return this.get(actor, incident.id);
  }

  private checkPhoto(file: UploadedPhoto): { mime: string; ext: string } {
    const type = sniffMime(file.buffer);
    if (!type || !type.mime.startsWith("image/")) throw badRequest("Photos must be JPEG, PNG or WebP images.", "PHOTO_TYPE");
    if (file.size > this.config.maxUploadBytes) throw badRequest("Each photo must be 10 MB or smaller.", "PHOTO_TOO_LARGE");
    return type;
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

  // ── Notifications ──

  /** The people who must act: the office's branch admins and head office admins — head office only when confidential. */
  private async handlers(branchId: string, confidential: boolean): Promise<string[]> {
    const headOffice = await this.notifications.headOfficeUsers();
    const users = confidential ? headOffice : [...(await this.notifications.opsUsers([branchId], [RoleCode.BRANCH_ADMIN])), ...headOffice];
    return users.length ? users : this.notifications.superAdminUsers();
  }

  /**
   * "Critical: Gas leak reported at Factory A". A confidential report says
   * nothing about its subject — in the inbox or on the lock screen.
   */
  private async alertHandlers(incident: Notifiable, branchName: string, userIds: string[], reporterName: string | null, dedupeBase: string) {
    const prefix = incident.severity === IncidentSeverity.CRITICAL ? "Critical: " : incident.severity === IncidentSeverity.HIGH ? "Urgent: " : "";
    const category = label(INCIDENT_CATEGORY_LABEL, incident.category);
    const group = label(INCIDENT_GROUP_LABEL, INCIDENT_CATEGORY_GROUP[incident.category as IncidentCategory] ?? "");
    await this.notifications.deliverIncident(
      incident,
      dedupeBase,
      "INCIDENT_REPORTED",
      userIds.map((userId) => ({
        userId,
        category: NotificationCategory.ACTION_REQUIRED,
        title: incident.confidential ? `${prefix}New confidential report at ${branchName}` : `${prefix}${category} reported at ${branchName}`,
        body: incident.confidential
          ? `${incident.referenceNumber} · A confidential report needs head-office review.`
          : `${incident.title} — ${group}. ${incident.referenceNumber}${reporterName ? ` · reported by ${reporterName}` : ""}`,
      })),
      incident.confidential,
      incident.status,
    );
  }

  private async notifyReporter(incident: { id: string; referenceNumber: string; title: string; reporterUserId: string; confidential: boolean; status: string }, key: string, title: string, note?: string | null) {
    await this.notifications.deliverIncident(
      incident,
      key,
      "INCIDENT_UPDATED",
      [{ userId: incident.reporterUserId, category: NotificationCategory.PARCEL_UPDATE, title, body: `${incident.referenceNumber} · ${incident.title}${note ? ` — ${note}` : ""}` }],
      incident.confidential,
      incident.status,
    );
  }

  private reporterTitle(from: string, to: string, resolution: string | null): string {
    if (to === IncidentStatus.ACKNOWLEDGED) return "Your report has been acknowledged";
    if (to === IncidentStatus.UNDER_INVESTIGATION) return from === IncidentStatus.CLOSED ? "Your report was reopened" : "Your report is under investigation";
    switch (resolution) {
      case IncidentResolution.RESOLVED:
        return "Your report has been resolved";
      case IncidentResolution.DUPLICATE:
        return "Your report was closed as a duplicate";
      case IncidentResolution.REFERRED:
        return "Your report was referred onwards";
      default:
        return "Your report was closed — no action needed";
    }
  }

  // ── Reading ──

  async get(actor: UserActor, id: string) {
    const { incident, isReporter, isStaff } = await this.load(actor, id);
    return this.serialize(actor, incident, isReporter, isStaff);
  }

  async mine(actor: UserActor, q: MyIncidentsQuery) {
    const where: Prisma.IncidentWhereInput[] = [{ reporterUserId: actor.userId }];
    if (q.state === "open") where.push({ status: { in: [...OPEN_INCIDENT_STATUSES] } });
    if (q.state === "closed") where.push({ status: IncidentStatus.CLOSED });
    if (q.status) where.push({ status: q.status });
    return this.page(actor, where, q.cursor, q.limit, true);
  }

  async list(actor: UserActor, q: AdminIncidentsQuery) {
    const staff = this.visibleToStaff(actor);
    if (!staff) throw forbidden("Your role does not include incident reports.");
    const where: Prisma.IncidentWhereInput[] = [staff];
    if (q.status === "OPEN") where.push({ status: { in: [...OPEN_INCIDENT_STATUSES] } });
    else if (q.status && q.status !== "ALL") where.push({ status: q.status });
    if (q.group) where.push({ group: q.group });
    if (q.branchId) where.push({ branchId: q.branchId });
    if (q.category) where.push({ category: q.category });
    if (q.severity) where.push({ severity: q.severity });
    if (q.resolution) where.push({ resolution: q.resolution });
    if (q.confidential) where.push({ confidential: q.confidential === "true" });
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
          // Searching by reporter never matches a report whose reporter is hidden.
          {
            anonymous: false,
            confidential: false,
            reporter: { OR: [{ displayName: { contains: text, mode: "insensitive" } }, { employee: { employeeCode: { contains: text, mode: "insensitive" } } }] },
          },
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

  /**
   * Small counts for the portal and the Executive Dashboard, over the
   * reports the viewer may see (optionally one office, one group).
   */
  async summary(actor: UserActor, branchId?: string, group?: string) {
    const staff = this.visibleToStaff(actor);
    if (!staff) throw forbidden("Your role does not include incident reports.");
    const base: Prisma.IncidentWhereInput = { AND: [staff, branchId ? { branchId } : {}, group ? { group } : {}] };
    const open: Prisma.IncidentWhereInput = { AND: [base, { status: { in: [...OPEN_INCIDENT_STATUSES] } }] };
    const since = new Date(Date.now() - 30 * 86_400_000);
    const [byStatus, openBySeverity, oldestReported, closed, recent] = await Promise.all([
      this.prisma.incident.groupBy({ by: ["status"], where: base, _count: { _all: true } }),
      this.prisma.incident.groupBy({ by: ["group", "severity"], where: open, _count: { _all: true } }),
      this.prisma.incident.findFirst({ where: { AND: [base, { status: IncidentStatus.REPORTED }] }, orderBy: { createdAt: "asc" }, select: { createdAt: true } }),
      this.prisma.incident.findMany({ where: { AND: [base, { status: IncidentStatus.CLOSED, closedAt: { gte: since } }] }, select: { createdAt: true, closedAt: true } }),
      this.prisma.incident.findMany({
        where: base,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: INCIDENT_LIMITS.summaryRecent,
        select: { id: true, referenceNumber: true, title: true, group: true, category: true, severity: true, status: true, confidential: true, createdAt: true, branch: { select: { name: true, code: true } } },
      }),
    ]);
    const counts = Object.fromEntries(INCIDENT_STAGES.map((s) => [s, byStatus.find((g) => g.status === s)?._count._all ?? 0])) as Record<IncidentStatus, number>;
    const sum = (pick: (g: (typeof openBySeverity)[number]) => boolean) => openBySeverity.filter(pick).reduce((n, g) => n + g._count._all, 0);
    const byGroupOpen = Object.fromEntries(INCIDENT_GROUPS.map((g) => [g, sum((r) => r.group === g)])) as Record<IncidentGroup, number>;
    const hours = closed.map((c) => (c.closedAt!.getTime() - c.createdAt.getTime()) / 3_600_000);
    return {
      counts,
      open: OPEN_INCIDENT_STATUSES.reduce((n, s) => n + counts[s], 0),
      criticalOpen: sum((r) => r.severity === IncidentSeverity.CRITICAL),
      urgentOpen: sum((r) => URGENT_INCIDENT_SEVERITIES.includes(r.severity as IncidentSeverity)),
      byGroupOpen,
      oldestReportedAt: oldestReported?.createdAt ?? null,
      closedLast30Days: closed.length,
      avgHoursToClose: hours.length ? Math.round((hours.reduce((a, b) => a + b, 0) / hours.length) * 10) / 10 : null,
      recent: recent.map((r) => ({
        id: r.id,
        referenceNumber: r.referenceNumber,
        title: r.title,
        group: r.group,
        category: r.category,
        severity: r.severity,
        status: r.status,
        confidential: r.confidential,
        branch: r.branch,
        createdAt: r.createdAt,
      })),
    };
  }

  // ── Handling ──

  async changeStatus(actor: UserActor, id: string, dto: Pick<IncidentStatusDto, "status" | "resolution" | "note">) {
    const { incident, isStaff } = await this.load(actor, id);
    this.requireManager(actor, isStaff);
    const status = dto.status as IncidentStatus;
    const text = dto.note?.trim() || null;
    let resolution: IncidentResolution | null = null;
    if (status === IncidentStatus.CLOSED) {
      if (!dto.resolution) throw badRequest("Choose how this report was closed: resolved, no action needed, duplicate or referred.", "RESOLUTION_REQUIRED");
      resolution = dto.resolution as IncidentResolution;
      if (incidentResolutionNeedsNote(resolution) && (!text || text.length < INCIDENT_LIMITS.reasonMin)) {
        throw badRequest(`Tell the reporter why this report is closed as "${INCIDENT_RESOLUTION_LABEL[resolution]}".`, "REASON_REQUIRED");
      }
    } else if (dto.resolution) {
      throw badRequest("A resolution is given only when closing a report.", "RESOLUTION_NOT_ALLOWED");
    }
    const now = new Date();
    const updated = await this.prisma.$transaction(async (tx) => {
      // Lock the row so two admins can't both move it.
      const [current] = await tx.$queryRaw<{ status: string; acknowledgedAt: Date | null; investigationStartedAt: Date | null }[]>`
        SELECT "status", "acknowledgedAt", "investigationStartedAt" FROM "incidents" WHERE "id" = ${id} FOR UPDATE`;
      if (!canIncidentTransition(current.status, status)) {
        throw conflict(
          "INCIDENT_STATE_CONFLICT",
          `This report is already ${label(INCIDENT_STATUS_LABEL, current.status)}; it cannot move to ${label(INCIDENT_STATUS_LABEL, status)}.`,
          { status: current.status },
        );
      }
      const reopening = current.status === IncidentStatus.CLOSED;
      const row = await tx.incident.update({
        where: { id },
        data: {
          status,
          resolution,
          statusNote: text,
          statusChangedAt: now,
          lastHandledById: actor.userId,
          // Acknowledged = the first time a handler acted on it, whichever stage they moved it to.
          acknowledgedAt: current.acknowledgedAt ? undefined : now,
          investigationStartedAt: status === IncidentStatus.UNDER_INVESTIGATION && !current.investigationStartedAt ? now : undefined,
          closedAt: status === IncidentStatus.CLOSED ? now : reopening ? null : undefined,
        },
      });
      await tx.incidentUpdate.create({
        data: {
          incidentId: id,
          type: IncidentUpdateType.STATUS_CHANGED,
          fromStatus: current.status,
          toStatus: status,
          note: text,
          actorUserId: actor.userId,
          actorName: actor.displayName,
          metadata: { reopened: reopening, ...(resolution ? { resolution } : {}) },
        },
      });
      const outcome = resolution ? ` (${INCIDENT_RESOLUTION_LABEL[resolution]})` : "";
      await this.audit.record(
        {
          actor,
          action: reopening ? "incident.reopened" : "incident.status_changed",
          objectType: "incident",
          objectId: id,
          summary: `${incident.referenceNumber}: ${label(INCIDENT_STATUS_LABEL, current.status)} → ${INCIDENT_STATUS_LABEL[status]}${outcome}`,
          before: { status: current.status, resolution: incident.resolution },
          after: { status, resolution, note: text },
        },
        tx,
      );
      return { row, from: current.status };
    });
    await this.notifyReporter(updated.row, `incident:${id}:status:${status}:${now.getTime()}`, this.reporterTitle(updated.from, status, resolution), text);
    return this.get(actor, id);
  }

  async addNote(actor: UserActor, id: string, note: string) {
    const { incident, isStaff } = await this.load(actor, id);
    this.requireManager(actor, isStaff);
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

  /**
   * Correct the group, sub-category, severity or confidentiality. Marking a
   * report confidential hands it to head office (it leaves the office admins'
   * view); taking it back out keeps the reporter's identity hidden — they
   * reported it in confidence — and shares it with the office's admins.
   */
  async updateDetails(actor: UserActor, id: string, dto: IncidentDetailsDto) {
    const { incident, isStaff } = await this.load(actor, id);
    this.requireManager(actor, isStaff);
    if (dto.group && !dto.category && INCIDENT_CATEGORY_GROUP[incident.category as IncidentCategory] !== dto.group) {
      throw badRequest(`Choose a sub-category in ${label(INCIDENT_GROUP_LABEL, dto.group)}.`, "CATEGORY_REQUIRED");
    }
    const category = (dto.category ?? incident.category) as IncidentCategory;
    const group = INCIDENT_CATEGORY_GROUP[category];
    if (dto.group && dto.group !== group) {
      throw badRequest(`${INCIDENT_CATEGORY_LABEL[category]} is not part of ${label(INCIDENT_GROUP_LABEL, dto.group)}.`, "CATEGORY_GROUP_MISMATCH");
    }
    let confidential = dto.confidential ?? incident.confidential;
    if (incidentForcesConfidential(category)) {
      if (dto.confidential === false) throw badRequest("Misconduct reports are always confidential.", "CONFIDENTIAL_REQUIRED");
      confidential = true;
    }
    const anonymous = incident.anonymous || (incident.confidential && !confidential);
    const severity = dto.severity ?? incident.severity;

    const next = { group, category, severity, confidential, anonymous };
    const changes: Record<string, { before: string | boolean; after: string | boolean }> = {};
    for (const k of Object.keys(next) as (keyof typeof next)[]) if (next[k] !== incident[k]) changes[k] = { before: incident[k], after: next[k] };
    if (!Object.keys(changes).length) return this.get(actor, id);

    await this.prisma.$transaction(async (tx) => {
      await tx.incident.update({ where: { id }, data: { ...next, lastHandledById: actor.userId } });
      await tx.incidentUpdate.create({ data: { incidentId: id, type: IncidentUpdateType.DETAILS_CHANGED, actorUserId: actor.userId, actorName: actor.displayName, metadata: changes } });
      await this.audit.record(
        {
          actor,
          action: "incident.details_changed",
          objectType: "incident",
          objectId: id,
          summary: `${incident.referenceNumber}: ${Object.keys(changes).join(", ")} changed`,
          before: Object.fromEntries(Object.entries(changes).map(([k, v]) => [k, v.before])),
          after: Object.fromEntries(Object.entries(changes).map(([k, v]) => [k, v.after])),
        },
        tx,
      );
    });

    // Whoever newly has to act on it is told.
    const now = Date.now();
    if (changes.confidential) {
      const branch = await this.prisma.branch.findUniqueOrThrow({ where: { id: incident.branchId } });
      const moved = { ...incident, ...next };
      const recipients = confidential ? await this.handlers(incident.branchId, true) : await this.notifications.opsUsers([incident.branchId], [RoleCode.BRANCH_ADMIN]);
      const others = recipients.filter((u) => u !== actor.userId && u !== incident.reporterUserId);
      await this.alertHandlers(moved, branch.name, others, null, `incident:${id}:${confidential ? "confidential" : "shared"}:${now}`);
    }
    return (await this.isVisibleToStaff(actor, id)) || actor.userId === incident.reporterUserId ? this.get(actor, id) : { id, movedToHeadOffice: true };
  }

  /** Reporter: more photos of the problem while it's open. Admins: photos proving the fix. */
  async addPhoto(actor: UserActor, id: string, file: UploadedPhoto | undefined, note?: string) {
    if (!file) throw badRequest("Attach a photo in the `photo` field.", "PHOTO_REQUIRED");
    const { incident, isReporter, isStaff } = await this.load(actor, id);
    const manager = this.canManage(actor, isStaff);
    const kind = manager ? IncidentPhotoKind.RESOLUTION : IncidentPhotoKind.REPORT;
    if (!manager) {
      if (!isReporter) throw forbidden("You cannot add photos to this report.");
      if (!isIncidentOpen(incident.status)) throw conflict("INCIDENT_CLOSED", "This report is closed; photos can no longer be added.");
    }
    const max = kind === IncidentPhotoKind.REPORT ? INCIDENT_LIMITS.maxReportPhotos : INCIDENT_LIMITS.maxResolutionPhotos;
    if (incident.photos.filter((p) => p.kind === kind).length >= max) throw badRequest(`This report already has ${max} photos of that kind.`, "TOO_MANY_PHOTOS");
    const type = this.checkPhoto(file);
    const key = await this.storage.put(file.buffer, type.ext);
    const hiddenReporter = !manager && identityHidden(incident);
    await this.prisma.$transaction(async (tx) => {
      const photo = await tx.incidentPhoto.create({
        data: { incidentId: id, kind, storageKey: key, fileName: this.safeName(file.originalname, type.ext), mimeType: type.mime, sizeBytes: file.size, uploadedByUserId: hiddenReporter ? null : actor.userId },
      });
      await tx.incidentUpdate.create({
        data: {
          incidentId: id,
          type: IncidentUpdateType.PHOTO_ADDED,
          note: note?.trim() || null,
          actorUserId: hiddenReporter ? null : actor.userId,
          actorName: hiddenReporter ? hiddenReporterName(incident) : actor.displayName,
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
    const s = incident.status;
    if (this.canManage(actor, isStaff)) {
      if (s === IncidentStatus.REPORTED) out.push("ACKNOWLEDGE");
      if (s !== IncidentStatus.CLOSED && canIncidentTransition(s, IncidentStatus.UNDER_INVESTIGATION)) out.push("START_INVESTIGATION");
      if (canIncidentTransition(s, IncidentStatus.CLOSED)) out.push("CLOSE");
      if (s === IncidentStatus.CLOSED) out.push("REOPEN");
      out.push("ADD_NOTE", "EDIT_DETAILS");
      if (incident.photos.filter((p) => p.kind === IncidentPhotoKind.RESOLUTION).length < INCIDENT_LIMITS.maxResolutionPhotos) out.push("ADD_RESOLUTION_PHOTO");
    } else if (isReporter && isIncidentOpen(s) && incident.photos.filter((p) => p.kind === IncidentPhotoKind.REPORT).length < INCIDENT_LIMITS.maxReportPhotos) {
      out.push("ADD_PHOTO");
    }
    return out;
  }

  /**
   * History entries only the reporter writes: the submission and photos of the
   * problem. Their user id is not stored when the reporter was hidden at the
   * time, so this goes by the kind of entry, not by who is recorded.
   */
  private byReporter(u: IncidentFull["updates"][number]): boolean {
    return u.type === IncidentUpdateType.SUBMITTED || (u.type === IncidentUpdateType.PHOTO_ADDED && (u.metadata as { kind?: string } | null)?.kind === IncidentPhotoKind.REPORT);
  }

  /**
   * The four-stage tracker with who moved it and when. A stage that was
   * passed over (e.g. closed straight from Acknowledged) is "skipped".
   */
  private stages(i: IncidentFull, reporterLabel: string) {
    const changes = i.updates.filter((u) => u.type === IncidentUpdateType.STATUS_CHANGED);
    const firstAction = changes.find((u) => u.fromStatus === IncidentStatus.REPORTED);
    const firstInvestigation = changes.find((u) => u.toStatus === IncidentStatus.UNDER_INVESTIGATION);
    const lastClose = [...changes].reverse().find((u) => u.toStatus === IncidentStatus.CLOSED);
    const currentIndex = INCIDENT_STAGES.indexOf(i.status as IncidentStatus);
    const state = (stage: IncidentStatus, at: Date | null): StageState => {
      const k = INCIDENT_STAGES.indexOf(stage);
      if (k === currentIndex) return stage === IncidentStatus.CLOSED ? "done" : "current";
      if (k < currentIndex) return at ? "done" : "skipped";
      return "upcoming";
    };
    const closedAt = i.status === IncidentStatus.CLOSED ? i.closedAt : null;
    return [
      { status: IncidentStatus.REPORTED, state: state(IncidentStatus.REPORTED, i.createdAt), at: i.createdAt, by: reporterLabel },
      { status: IncidentStatus.ACKNOWLEDGED, state: state(IncidentStatus.ACKNOWLEDGED, i.acknowledgedAt), at: i.acknowledgedAt, by: i.acknowledgedAt ? (firstAction?.actorName ?? null) : null },
      {
        status: IncidentStatus.UNDER_INVESTIGATION,
        state: state(IncidentStatus.UNDER_INVESTIGATION, i.investigationStartedAt),
        at: i.investigationStartedAt,
        by: i.investigationStartedAt ? (firstInvestigation?.actorName ?? null) : null,
      },
      { status: IncidentStatus.CLOSED, state: state(IncidentStatus.CLOSED, closedAt), at: closedAt, by: closedAt ? (lastClose?.actorName ?? null) : null, resolution: i.resolution },
    ];
  }

  private serialize(actor: UserActor, i: IncidentFull, isReporter: boolean, isStaff: boolean) {
    const hidden = identityHidden(i);
    const showReporter = isReporter || !hidden;
    const reporterLabel = isReporter ? "You" : showReporter ? i.reporter.displayName : hiddenReporterName(i);
    return {
      id: i.id,
      referenceNumber: i.referenceNumber,
      title: i.title,
      description: i.description,
      group: i.group,
      category: i.category,
      severity: i.severity,
      status: i.status,
      resolution: i.resolution,
      confidential: i.confidential,
      anonymous: i.anonymous,
      statusNote: i.statusNote,
      statusChangedAt: i.statusChangedAt,
      acknowledgedAt: i.acknowledgedAt,
      investigationStartedAt: i.investigationStartedAt,
      closedAt: i.closedAt,
      createdAt: i.createdAt,
      branch: i.branch,
      location: i.location,
      locationDetail: i.locationDetail,
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
        // Also hides a name recorded before the report was marked confidential.
        actor: this.byReporter(u) ? reporterLabel : u.actorName,
        metadata: u.metadata,
        createdAt: u.createdAt,
      })),
      stages: this.stages(i, reporterLabel),
      viewer: { isReporter, isStaff, canManage: this.canManage(actor, isStaff), actions: this.actionsFor(actor, i, isReporter, isStaff) },
    };
  }

  private serializeRow(r: IncidentRow, isReporter: boolean) {
    const first = r.photos.find((p) => p.kind === IncidentPhotoKind.REPORT);
    const showReporter = isReporter || !identityHidden(r);
    return {
      id: r.id,
      referenceNumber: r.referenceNumber,
      title: r.title,
      group: r.group,
      category: r.category,
      severity: r.severity,
      status: r.status,
      resolution: r.resolution,
      confidential: r.confidential,
      anonymous: r.anonymous,
      statusNote: r.statusNote,
      statusChangedAt: r.statusChangedAt,
      createdAt: r.createdAt,
      branch: r.branch,
      place: [r.location?.path, r.locationDetail].filter(Boolean).join(" · ") || null,
      reporterName: showReporter ? r.reporter.displayName : null,
      reporterCode: showReporter ? (r.reporter.employee?.employeeCode ?? null) : null,
      photoCount: r.photos.length,
      thumbnailUrl: first ? this.photoUrl(first.id) : null,
    };
  }
}
