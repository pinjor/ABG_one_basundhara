import { Inject, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import {
  Capability,
  LICENCE_CATEGORY_LABEL,
  LICENCE_LIMITS,
  LicenceCategory,
  LicenceEventType,
  LicenceFilter,
  LicenceState,
  NotificationCategory,
  READ_ONLY_ROLES,
  RENEWAL_STAGE_LABEL,
  ROLE_CAPABILITIES,
  RenewalStage,
  RoleCode,
  addCalendarDays,
  canMoveRenewal,
  daysUntil,
  dhakaToday,
  isCalendarDate,
  isLicenceAlertDue,
  isRenewalInProgress,
  isRenewalMoveBack,
  licenceAlertLevel,
  licenceStateForDays,
  nextLicenceAlertDays,
  renewalProgress,
} from "@abg-dispatch/shared";
import { APP_CONFIG, type AppConfig } from "../common/config";
import { PrismaService, isUniqueViolation } from "../common/prisma.service";
import type { UserActor } from "../common/actor";
import { badRequest, conflict, forbidden, notFound, unauthorized } from "../common/errors";
import { hmacSha256, safeEqual } from "../common/crypto";
import { clampLimit, decodeCursor, encodeCursor } from "../common/pagination";
import { AuditService } from "../audit/audit.service";
import { NotificationService } from "../notifications/notification.service";
import { StorageService, sniffMime } from "../attachments/storage.service";
import { ActorLoaderService } from "../auth/actor-loader.service";
import { moduleScope } from "../admin/admin-scope";
import type { CreateLicenceDto, LicencesQuery, RenewLicenceDto, UpdateLicenceDto } from "./licences.dto";
import { LicenceAlertsService, alertRecipients, formatDate, isoDate } from "./licence-alerts.service";

export const LICENCE_NOT_FOUND = "Licence not found, or you do not have access to it.";
const DOCUMENT_LINK_TTL_SECONDS = 600;
/** Roles that keep the register for the whole group, besides head office, auditors and super admins. */
const ORG_WIDE_ROLES: RoleCode[] = [RoleCode.COMPLIANCE_OFFICER, RoleCode.EXECUTIVE];
/** Roles whose holders can see licences and so can own one (auditors stay independent). */
const OWNER_ROLES: string[] = Object.entries(ROLE_CAPABILITIES)
  .filter(([role, caps]) => caps.includes(Capability.LICENCE_VIEW) && !READ_ONLY_ROLES.includes(role as RoleCode) && role !== RoleCode.SUPER_ADMIN)
  .map(([role]) => role);
const OWNER_ROLE_ORDER: string[] = [RoleCode.COMPLIANCE_OFFICER, RoleCode.BRANCH_ADMIN, RoleCode.HEAD_OFFICE_ADMIN, RoleCode.EXECUTIVE];

const BRANCH = { select: { id: true, name: true, code: true } } as const;

const INCLUDE = {
  branch: BRANCH,
  owner: { select: { id: true, displayName: true, email: true, active: true, employee: { select: { employeeCode: true, designation: true, phone: true } } } },
  events: { orderBy: [{ createdAt: "asc" as const }, { id: "asc" as const }] },
} satisfies Prisma.LicenceInclude;

const ROW_INCLUDE = {
  branch: BRANCH,
  owner: { select: { id: true, displayName: true } },
} satisfies Prisma.LicenceInclude;

type LicenceFull = Prisma.LicenceGetPayload<{ include: typeof INCLUDE }>;
type LicenceRow = Prisma.LicenceGetPayload<{ include: typeof ROW_INCLUDE }>;

export interface UploadedDocument {
  buffer: Buffer;
  originalname: string;
  size: number;
}

interface LockedLicence {
  expiresAt: Date;
  renewalStage: string;
  lastAlertDays: number | null;
  active: boolean;
}

const toDate = (day: string) => new Date(`${day}T00:00:00Z`);

/**
 * The regulatory licence register. Compliance officers and head office keep
 * it for the whole group; office admins, the MD / Chairman and auditors read
 * it (office admins for their own offices only). Every change is kept in the
 * licence's append-only history and, for administrative changes, the audit log.
 */
@Injectable()
export class LicencesService {
  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly notifications: NotificationService,
    private readonly audit: AuditService,
    private readonly actors: ActorLoaderService,
    private readonly alerts: LicenceAlertsService,
  ) {}

  // ── Access ──

  /** Offices whose licences the actor may see; null means every office. */
  private scope(actor: UserActor): string[] | null {
    return moduleScope(actor, ORG_WIDE_ROLES);
  }

  private scopeWhere(actor: UserActor): Prisma.LicenceWhereInput {
    const scope = this.scope(actor);
    return scope ? { branchId: { in: scope } } : {};
  }

  private canManage(actor: UserActor): boolean {
    return actor.capabilities.has(Capability.LICENCE_MANAGE);
  }

  private async load(actor: UserActor, id: string): Promise<LicenceFull> {
    const licence = await this.prisma.licence.findUnique({ where: { id }, include: INCLUDE });
    const scope = this.scope(actor);
    if (!licence || (scope && !scope.includes(licence.branchId))) throw notFound(LICENCE_NOT_FOUND, "LICENCE_NOT_FOUND");
    return licence;
  }

  private assertManager(actor: UserActor) {
    if (!this.canManage(actor)) throw forbidden("Only the compliance team and head office can change the licence register.");
  }

  /** The office must be active and one the actor looks after. */
  private async office(actor: UserActor, branchId: string) {
    const branch = await this.prisma.branch.findUnique({ where: { id: branchId } });
    const scope = this.scope(actor);
    if (!branch || !branch.active || (scope && !scope.includes(branch.id))) throw badRequest("Choose an active office whose licences you manage.", "BRANCH_INVALID");
    return branch;
  }

  /** People who can be made responsible for a licence at an office: they must be able to open it. */
  async owners(actor: UserActor, branchId?: string) {
    this.assertManager(actor);
    const users = await this.prisma.user.findMany({
      where: { active: true, roles: { some: { role: { in: OWNER_ROLES } } } },
      include: { roles: true, employee: { include: { branch: BRANCH } } },
      orderBy: { displayName: "asc" },
    });
    const eligible = users.filter((u) => this.ownerCovers(u, branchId));
    const rank = (roles: { role: string }[]) => Math.min(...roles.map((r) => (OWNER_ROLE_ORDER.includes(r.role) ? OWNER_ROLE_ORDER.indexOf(r.role) : 99)));
    return eligible
      .sort((a, b) => rank(a.roles) - rank(b.roles) || a.displayName.localeCompare(b.displayName))
      .map((u) => ({
        id: u.id,
        name: u.displayName,
        employeeCode: u.employee?.employeeCode ?? null,
        designation: u.employee?.designation ?? null,
        office: u.employee?.branch ?? null,
        roles: u.roles.map((r) => r.role),
      }));
  }

  private ownerCovers(
    user: { id: string; displayName: string; email: string | null; active: boolean; roles: { role: string; branchId: string | null }[]; employee: { id: string; employeeCode: string; branchId: string; departmentId: string | null; status?: string } | null },
    branchId?: string,
  ): boolean {
    if (!user.active || (user.employee?.status && user.employee.status !== "ACTIVE")) return false;
    const asActor = this.actors.toActor(user, "owner-check", false);
    if (!asActor.capabilities.has(Capability.LICENCE_VIEW) || asActor.roles.some((r) => READ_ONLY_ROLES.includes(r))) return false;
    if (!branchId) return true;
    const scope = moduleScope(asActor, ORG_WIDE_ROLES);
    return !scope || scope.includes(branchId);
  }

  private async checkOwner(userId: string | null | undefined, branchId: string): Promise<string | null> {
    if (!userId) return null;
    const user = await this.prisma.user.findUnique({ where: { id: userId }, include: { roles: true, employee: true } });
    if (!user || !this.ownerCovers(user, branchId)) {
      throw badRequest("The owner must be someone who can see this office's licences: a compliance officer, the office's admin or head office.", "OWNER_INVALID");
    }
    return user.id;
  }

  // ── Dates ──

  private checkDates(expiresAt: string, issuedAt: string | null | undefined, opts: { label?: string } = {}) {
    const label = opts.label ?? "Expiry date";
    if (!isCalendarDate(expiresAt)) throw badRequest(`${label} is not a real calendar date.`, "DATE_INVALID");
    if (issuedAt === null || issuedAt === undefined) return;
    if (!isCalendarDate(issuedAt)) throw badRequest("Issue date is not a real calendar date.", "DATE_INVALID");
    if (issuedAt > dhakaToday()) throw badRequest("The issue date cannot be in the future.", "ISSUED_IN_FUTURE");
    if (issuedAt >= expiresAt) throw badRequest("The issue date must be before the expiry date.", "ISSUED_AFTER_EXPIRY");
  }

  // ── Register ──

  async create(actor: UserActor, dto: CreateLicenceDto) {
    this.assertManager(actor);
    this.checkDates(dto.expiresAt, dto.issuedAt);
    const branch = await this.office(actor, dto.branchId);
    const ownerUserId = await this.checkOwner(dto.ownerUserId, branch.id);
    const notes = dto.notes?.trim() || null;
    try {
      const created = await this.prisma.$transaction(async (tx) => {
        const licence = await tx.licence.create({
          data: {
            name: dto.name,
            licenceNumber: dto.licenceNumber,
            category: dto.category,
            issuingAuthority: dto.issuingAuthority,
            branchId: branch.id,
            ownerUserId,
            issuedAt: dto.issuedAt ? toDate(dto.issuedAt) : null,
            expiresAt: toDate(dto.expiresAt),
            renewalLeadDays: dto.renewalLeadDays ?? 90,
            renewalFee: dto.renewalFee ?? null,
            notes,
          },
        });
        await tx.licenceEvent.create({
          data: {
            licenceId: licence.id,
            type: LicenceEventType.CREATED,
            actorUserId: actor.userId,
            actorName: actor.displayName,
            metadata: { expiresAt: dto.expiresAt, category: dto.category, office: branch.code },
          },
        });
        await this.audit.record(
          {
            actor,
            action: "licence.created",
            objectType: "licence",
            objectId: licence.id,
            summary: `${dto.name} (${dto.licenceNumber}) added for ${branch.name}`,
            after: this.snapshot(licence),
          },
          tx,
        );
        return licence;
      });
      return this.get(actor, created.id);
    } catch (err) {
      if (isUniqueViolation(err)) throw this.numberTaken(branch.name);
      throw err;
    }
  }

  private numberTaken(office: string) {
    return conflict("LICENCE_NUMBER_TAKEN", `${office} already has a licence with this number. Open that licence instead, or check the number.`);
  }

  async update(actor: UserActor, id: string, dto: UpdateLicenceDto) {
    this.assertManager(actor);
    const current = await this.load(actor, id);
    const branchId = dto.branchId ?? current.branchId;
    if (dto.branchId && dto.branchId !== current.branchId) await this.office(actor, dto.branchId);
    const expiresAt = dto.expiresAt ?? isoDate(current.expiresAt);
    const issuedAt = dto.issuedAt === undefined ? (current.issuedAt ? isoDate(current.issuedAt) : null) : dto.issuedAt;
    if (dto.expiresAt !== undefined || dto.issuedAt !== undefined) this.checkDates(expiresAt, issuedAt);
    const ownerUserId = dto.ownerUserId === undefined ? current.ownerUserId : dto.ownerUserId;
    if (ownerUserId && (ownerUserId !== current.ownerUserId || branchId !== current.branchId)) await this.checkOwner(ownerUserId, branchId);

    const next = {
      name: dto.name ?? current.name,
      licenceNumber: dto.licenceNumber ?? current.licenceNumber,
      category: dto.category ?? current.category,
      issuingAuthority: dto.issuingAuthority ?? current.issuingAuthority,
      branchId,
      ownerUserId: ownerUserId ?? null,
      issuedAt,
      expiresAt,
      renewalLeadDays: dto.renewalLeadDays ?? current.renewalLeadDays,
      renewalFee: dto.renewalFee === undefined ? current.renewalFee : dto.renewalFee,
      notes: dto.notes === undefined ? current.notes : dto.notes?.trim() || null,
      active: dto.active ?? current.active,
    };
    const before: Record<string, unknown> = {
      name: current.name,
      licenceNumber: current.licenceNumber,
      category: current.category,
      issuingAuthority: current.issuingAuthority,
      branchId: current.branchId,
      ownerUserId: current.ownerUserId,
      issuedAt: current.issuedAt ? isoDate(current.issuedAt) : null,
      expiresAt: isoDate(current.expiresAt),
      renewalLeadDays: current.renewalLeadDays,
      renewalFee: current.renewalFee,
      notes: current.notes,
      active: current.active,
    };
    const changes: Record<string, { before: unknown; after: unknown }> = {};
    for (const [key, value] of Object.entries(next)) if (before[key] !== value) changes[key] = { before: before[key], after: value };
    if (!Object.keys(changes).length) return this.get(actor, id);

    // History shows people and offices by name, not by id.
    const described = await this.describeChanges(changes);
    const expiryChanged = "expiresAt" in changes;
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT "id" FROM "licences" WHERE "id" = ${id} FOR UPDATE`;
        await tx.licence.update({
          where: { id },
          data: {
            name: next.name,
            licenceNumber: next.licenceNumber,
            category: next.category,
            issuingAuthority: next.issuingAuthority,
            branchId: next.branchId,
            ownerUserId: next.ownerUserId,
            issuedAt: next.issuedAt ? toDate(next.issuedAt) : null,
            expiresAt: toDate(next.expiresAt),
            renewalLeadDays: next.renewalLeadDays,
            renewalFee: next.renewalFee,
            notes: next.notes,
            active: next.active,
            // A new expiry date starts a fresh set of alerts.
            ...(expiryChanged ? { lastAlertDays: null, lastAlertAt: null } : {}),
          },
        });
        await tx.licenceEvent.create({
          data: {
            licenceId: id,
            type: LicenceEventType.DETAILS_CHANGED,
            actorUserId: actor.userId,
            actorName: actor.displayName,
            metadata: { changes: described, ...(expiryChanged ? { alertsReset: true } : {}) } as Prisma.InputJsonObject,
          },
        });
        await this.audit.record(
          {
            actor,
            action: "licence.updated",
            objectType: "licence",
            objectId: id,
            summary: `${current.name} (${current.licenceNumber}): ${Object.keys(changes).join(", ")} changed`,
            before: Object.fromEntries(Object.entries(changes).map(([k, v]) => [k, v.before])),
            after: Object.fromEntries(Object.entries(changes).map(([k, v]) => [k, v.after])),
          },
          tx,
        );
      });
    } catch (err) {
      if (isUniqueViolation(err)) throw this.numberTaken((await this.prisma.branch.findUnique({ where: { id: branchId } }))?.name ?? "That office");
      throw err;
    }
    // Moving a licence to an office the editor does not look after takes it out of their view.
    const scope = this.scope(actor);
    return !scope || scope.includes(branchId) ? this.get(actor, id) : { id, movedOutOfScope: true };
  }

  private async describeChanges(changes: Record<string, { before: unknown; after: unknown }>) {
    const out: Record<string, { before: unknown; after: unknown }> = { ...changes };
    if (changes.branchId) {
      const branches = await this.prisma.branch.findMany({ where: { id: { in: [changes.branchId.before, changes.branchId.after] as string[] } }, select: { id: true, name: true } });
      const name = (v: unknown) => branches.find((b) => b.id === v)?.name ?? null;
      delete out.branchId;
      out.office = { before: name(changes.branchId.before), after: name(changes.branchId.after) };
    }
    if (changes.ownerUserId) {
      const ids = [changes.ownerUserId.before, changes.ownerUserId.after].filter((v): v is string => typeof v === "string");
      const users = await this.prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, displayName: true } });
      const name = (v: unknown) => users.find((u) => u.id === v)?.displayName ?? null;
      delete out.ownerUserId;
      out.owner = { before: name(changes.ownerUserId.before), after: name(changes.ownerUserId.after) };
    }
    return out;
  }

  // ── Renewal ──

  private async lock(tx: Prisma.TransactionClient, id: string): Promise<LockedLicence> {
    const [row] = await tx.$queryRaw<LockedLicence[]>`
      SELECT "expiresAt", "renewalStage", "lastAlertDays", "active" FROM "licences" WHERE "id" = ${id} FOR UPDATE`;
    if (!row) throw notFound(LICENCE_NOT_FOUND, "LICENCE_NOT_FOUND");
    return row;
  }

  private retired() {
    return conflict("LICENCE_RETIRED", "This licence is retired from the register. Bring it back into use (Edit) before working on a renewal.");
  }

  /** Move the renewal along RENEWAL_STAGES: forward (stages may be skipped) or back with a reason. */
  async moveRenewal(actor: UserActor, id: string, stage: string, note?: string) {
    this.assertManager(actor);
    const licence = await this.load(actor, id);
    if (stage === RenewalStage.RENEWED) throw badRequest("To finish a renewal, use Mark renewed and enter the new expiry date.", "USE_MARK_RENEWED");
    const text = note?.trim() || null;
    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      const row = await this.lock(tx, id);
      if (!row.active) throw this.retired();
      const from = row.renewalStage;
      if (!canMoveRenewal(from, stage)) {
        throw conflict("LICENCE_STATE_CONFLICT", `The renewal is already at “${RENEWAL_STAGE_LABEL[from as RenewalStage] ?? from}”.`, { renewalStage: from });
      }
      const back = isRenewalMoveBack(from, stage);
      if (back && (!text || text.length < 3)) throw badRequest("Say why the renewal is moving back a stage.", "REASON_REQUIRED");
      await tx.licence.update({
        where: { id },
        data: {
          renewalStage: stage,
          renewalStartedAt: stage === RenewalStage.NOT_STARTED ? null : from === RenewalStage.NOT_STARTED ? now : undefined,
        },
      });
      await tx.licenceEvent.create({
        data: { licenceId: id, type: LicenceEventType.RENEWAL_STAGE_CHANGED, note: text, actorUserId: actor.userId, actorName: actor.displayName, metadata: { from, to: stage, direction: back ? "BACK" : "FORWARD" } },
      });
      await this.audit.record(
        {
          actor,
          action: "licence.renewal_stage_changed",
          objectType: "licence",
          objectId: id,
          summary: `${licence.name} (${licence.licenceNumber}): renewal ${RENEWAL_STAGE_LABEL[from as RenewalStage]} → ${RENEWAL_STAGE_LABEL[stage as RenewalStage]}`,
          before: { renewalStage: from },
          after: { renewalStage: stage, note: text },
        },
        tx,
      );
    });
    return this.get(actor, id);
  }

  /**
   * Record a completed renewal: the new expiry date, optionally the new
   * certificate's scan. The renewal tracker and the alert ladder start again.
   */
  async renew(actor: UserActor, id: string, dto: RenewLicenceDto, file?: UploadedDocument) {
    this.assertManager(actor);
    const licence = await this.load(actor, id);
    if (!licence.active) throw this.retired();
    const today = dhakaToday();
    const issuedAt = dto.issuedAt ?? today;
    this.checkDates(dto.newExpiresAt, issuedAt, { label: "New expiry date" });
    if (dto.newExpiresAt <= today) throw badRequest("The new expiry date must be in the future.", "EXPIRY_NOT_FUTURE");
    const document = file ? await this.storeDocument(file) : null;
    const note = dto.note?.trim() || null;
    const now = new Date();

    const result = await this.prisma.$transaction(async (tx) => {
      const row = await this.lock(tx, id);
      if (!row.active) throw this.retired();
      const previous = isoDate(row.expiresAt);
      if (dto.newExpiresAt <= previous) {
        throw badRequest(`The new expiry date must be after the current one (${formatDate(row.expiresAt)}).`, "EXPIRY_NOT_LATER");
      }
      await tx.licence.update({
        where: { id },
        data: {
          expiresAt: toDate(dto.newExpiresAt),
          issuedAt: toDate(issuedAt),
          renewalStage: RenewalStage.NOT_STARTED,
          renewalStartedAt: null,
          renewalFee: dto.renewalFee ?? undefined,
          lastAlertDays: null,
          lastAlertAt: null,
          ...(document ? { documentKey: document.key, documentName: document.name, documentMime: document.mime, documentSize: document.size } : {}),
        },
      });
      await tx.licenceEvent.create({
        data: {
          licenceId: id,
          type: LicenceEventType.RENEWED,
          note,
          actorUserId: actor.userId,
          actorName: actor.displayName,
          createdAt: now,
          metadata: { previousExpiresAt: previous, newExpiresAt: dto.newExpiresAt, issuedAt, previousStage: row.renewalStage, ...(dto.renewalFee !== undefined ? { renewalFee: dto.renewalFee } : {}), withDocument: !!document },
        },
      });
      if (document) {
        await tx.licenceEvent.create({
          data: {
            licenceId: id,
            type: LicenceEventType.DOCUMENT_UPLOADED,
            actorUserId: actor.userId,
            actorName: actor.displayName,
            createdAt: new Date(now.getTime() + 1),
            metadata: { fileName: document.name, mimeType: document.mime, size: document.size, replaced: !!licence.documentKey, withRenewal: true },
          },
        });
      }
      await this.audit.record(
        {
          actor,
          action: "licence.renewed",
          objectType: "licence",
          objectId: id,
          summary: `${licence.name} (${licence.licenceNumber}) renewed until ${dto.newExpiresAt}`,
          before: { expiresAt: previous, renewalStage: row.renewalStage, issuedAt: licence.issuedAt ? isoDate(licence.issuedAt) : null },
          after: { expiresAt: dto.newExpiresAt, renewalStage: RenewalStage.NOT_STARTED, issuedAt, note, document: document?.name ?? null },
        },
        tx,
      );
      return { lastAlertDays: row.lastAlertDays };
    });

    await this.announceRenewal(actor, licence, dto.newExpiresAt, result.lastAlertDays);
    return this.get(actor, id);
  }

  /** Everyone who was chased about this expiry hears that it is dealt with. */
  private async announceRenewal(actor: UserActor, licence: LicenceFull, newExpiresAt: string, lastAlertDays: number | null) {
    const level = licenceAlertLevel(lastAlertDays ?? 90);
    const recipients = (await alertRecipients(this.prisma, this.notifications, { branchId: licence.branchId, owner: licence.owner }, level)).filter((u) => u.id !== actor.userId);
    const until = formatDate(toDate(newExpiresAt));
    await this.notifications.deliverModule(
      { module: "licences", id: licence.id, reference: licence.licenceNumber, route: `/licences/${licence.id}`, status: LicenceState.VALID },
      `licence:${licence.id}:renewed:${newExpiresAt}`,
      "LICENCE_RENEWED",
      recipients.map((u) => ({
        userId: u.id,
        category: NotificationCategory.PARCEL_UPDATE,
        title: `${licence.name} renewed`,
        body: `${licence.branch.name} · ${licence.licenceNumber}. Now valid until ${until}. Recorded by ${actor.displayName}.`,
      })),
    );
  }

  // ── Scanned copy ──

  private async storeDocument(file: UploadedDocument) {
    if (file.size > LICENCE_LIMITS.documentMaxBytes || file.buffer.length > LICENCE_LIMITS.documentMaxBytes) {
      throw badRequest("The scanned copy must be 15 MB or smaller.", "DOCUMENT_TOO_LARGE");
    }
    const type = sniffMime(file.buffer);
    if (!type) throw badRequest("Upload the scanned licence as a PDF, JPEG, PNG or WebP file.", "DOCUMENT_TYPE");
    const key = await this.storage.put(file.buffer, type.ext);
    return { key, mime: type.mime, size: file.buffer.length, name: this.safeName(file.originalname, type.ext) };
  }

  private safeName(original: string, ext: string): string {
    const base = (original || "").replace(/[^\w.\- ]+/g, "_").replace(/^[.\s]+/, "").slice(0, 100) || "licence";
    return base.toLowerCase().endsWith(`.${ext}`) || (ext === "jpg" && /\.jpe?g$/i.test(base)) ? base : `${base.replace(/\.[A-Za-z0-9]{1,5}$/, "")}.${ext}`;
  }

  async uploadDocument(actor: UserActor, id: string, file: UploadedDocument | undefined, note?: string) {
    this.assertManager(actor);
    if (!file) throw badRequest("Attach the scanned licence in the `file` field.", "DOCUMENT_REQUIRED");
    const licence = await this.load(actor, id);
    const document = await this.storeDocument(file);
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "licences" WHERE "id" = ${id} FOR UPDATE`;
      await tx.licence.update({ where: { id }, data: { documentKey: document.key, documentName: document.name, documentMime: document.mime, documentSize: document.size } });
      await tx.licenceEvent.create({
        data: {
          licenceId: id,
          type: LicenceEventType.DOCUMENT_UPLOADED,
          note: note?.trim() || null,
          actorUserId: actor.userId,
          actorName: actor.displayName,
          metadata: { fileName: document.name, mimeType: document.mime, size: document.size, replaced: !!licence.documentKey },
        },
      });
      await this.audit.record(
        {
          actor,
          action: "licence.document_uploaded",
          objectType: "licence",
          objectId: id,
          summary: `${licence.name} (${licence.licenceNumber}): scanned copy ${licence.documentKey ? "replaced" : "uploaded"}`,
          before: licence.documentKey ? { document: licence.documentName } : undefined,
          after: { document: document.name, mimeType: document.mime, size: document.size },
        },
        tx,
      );
    });
    return this.get(actor, id);
  }

  /** Short-lived signed link usable in an <iframe>, <img> or an external viewer without an auth header. */
  private documentUrl(id: string, documentKey: string): string {
    const exp = Math.floor(Date.now() / 1000) + DOCUMENT_LINK_TTL_SECONDS;
    return `/api/licence-documents/${id}/content?exp=${exp}&sig=${this.sign(id, documentKey, exp)}`;
  }

  /** Bound to the stored file, so a link stops working as soon as the scan is replaced. */
  private sign(id: string, documentKey: string, exp: number): string {
    return hmacSha256(this.config.jwtSecret, `licence-document.${id}.${documentKey}.${exp}`, "base64url");
  }

  async documentForSignedLink(id: string, expRaw: string | undefined, sig: string | undefined) {
    const exp = Number(expRaw);
    if (!sig || !expRaw || !Number.isFinite(exp)) throw unauthorized("This document link is not valid.", "LINK_INVALID");
    if (exp < Date.now() / 1000) throw unauthorized("This document link has expired. Open the licence again.", "LINK_EXPIRED");
    const licence = await this.prisma.licence.findUnique({ where: { id }, select: { documentKey: true, documentMime: true, documentName: true } });
    if (!licence?.documentKey || !safeEqual(this.sign(id, licence.documentKey, exp), sig)) throw unauthorized("This document link is not valid.", "LINK_INVALID");
    return this.documentFile(licence);
  }

  async documentFor(actor: UserActor, id: string) {
    const licence = await this.load(actor, id);
    if (!licence.documentKey) throw notFound("This licence has no scanned copy yet.", "DOCUMENT_NOT_FOUND");
    return this.documentFile(licence);
  }

  private async documentFile(licence: { documentKey: string | null; documentMime: string | null; documentName: string | null }) {
    return { data: await this.storage.get(licence.documentKey!), mimeType: licence.documentMime ?? "application/octet-stream", fileName: licence.documentName ?? "licence" };
  }

  // ── Notes ──

  async addNote(actor: UserActor, id: string, note: string) {
    this.assertManager(actor);
    const licence = await this.load(actor, id);
    const text = note.trim();
    await this.prisma.$transaction(async (tx) => {
      await tx.licenceEvent.create({ data: { licenceId: id, type: LicenceEventType.NOTE_ADDED, note: text, actorUserId: actor.userId, actorName: actor.displayName } });
      await this.audit.record({ actor, action: "licence.note_added", objectType: "licence", objectId: id, summary: `${licence.name} (${licence.licenceNumber}): note added` }, tx);
    });
    return this.get(actor, id);
  }

  // ── Reading ──

  async get(actor: UserActor, id: string) {
    return this.serialize(actor, await this.load(actor, id));
  }

  /** Ids of licences (within `where`) whose state today is `state`. Registers are small; the rule lives in shared. */
  private async idsInState(where: Prisma.LicenceWhereInput[], state: LicenceState): Promise<string[]> {
    const rows = await this.prisma.licence.findMany({ where: { AND: where }, select: { id: true, expiresAt: true, renewalLeadDays: true } });
    const now = new Date();
    return rows.filter((r) => licenceStateForDays(daysUntil(r.expiresAt, now), r.renewalLeadDays) === state).map((r) => r.id);
  }

  async list(actor: UserActor, q: LicencesQuery) {
    const where: Prisma.LicenceWhereInput[] = [this.scopeWhere(actor), { active: q.state !== LicenceFilter.RETIRED }];
    if (q.branchId) where.push({ branchId: q.branchId });
    if (q.category) where.push({ category: q.category });
    const text = q.q?.trim();
    if (text) {
      where.push({
        OR: [
          { name: { contains: text, mode: "insensitive" } },
          { licenceNumber: { contains: text, mode: "insensitive" } },
          { issuingAuthority: { contains: text, mode: "insensitive" } },
        ],
      });
    }
    if (q.state === LicenceFilter.RENEWAL_IN_PROGRESS) where.push({ renewalStage: { notIn: [RenewalStage.NOT_STARTED, RenewalStage.RENEWED] } });
    else if (q.state && q.state in LicenceState) where.push({ id: { in: await this.idsInState([...where], q.state as LicenceState) } });

    const limit = clampLimit(q.limit, 25, 100);
    const cursor = decodeCursor(q.cursor);
    if (cursor) where.push({ OR: [{ expiresAt: { gt: cursor.createdAt } }, { expiresAt: cursor.createdAt, id: { gt: cursor.id } }] });
    const rows = await this.prisma.licence.findMany({ where: { AND: where }, include: ROW_INCLUDE, orderBy: [{ expiresAt: "asc" }, { id: "asc" }], take: limit + 1 });
    const items = rows.slice(0, limit);
    const last = items[items.length - 1];
    return { items: items.map((r) => this.serializeRow(r)), nextCursor: rows.length > limit ? encodeCursor(last.expiresAt, last.id) : null };
  }

  /** Offices the viewer can filter by (their own, or every active office). */
  async offices(actor: UserActor) {
    const scope = this.scope(actor);
    return this.prisma.branch.findMany({ where: { active: true, ...(scope ? { id: { in: scope } } : {}) }, select: { id: true, name: true, code: true, city: true }, orderBy: { name: "asc" } });
  }

  async summary(actor: UserActor, branchId?: string) {
    const where: Prisma.LicenceWhereInput[] = [this.scopeWhere(actor)];
    if (branchId) where.push({ branchId });
    const rows = await this.prisma.licence.findMany({
      where: { AND: [...where, { active: true }] },
      select: { id: true, name: true, category: true, expiresAt: true, renewalLeadDays: true, renewalStage: true, branch: BRANCH },
      orderBy: [{ expiresAt: "asc" }, { name: "asc" }],
    });
    const retired = await this.prisma.licence.count({ where: { AND: [...where, { active: false }] } });
    const now = new Date();
    const counts = { valid: 0, dueSoon: 0, expiring: 0, expired: 0 };
    const key: Record<LicenceState, keyof typeof counts> = { VALID: "valid", DUE_SOON: "dueSoon", EXPIRING: "expiring", EXPIRED: "expired" };
    const byCategory = Object.fromEntries(Object.values(LicenceCategory).map((c) => [c, 0])) as Record<string, number>;
    let renewalsInProgress = 0;
    let nextExpiry: { id: string; name: string; branch: { id: string; name: string; code: string }; expiresAt: string; daysLeft: number } | null = null;
    for (const r of rows) {
      const days = daysUntil(r.expiresAt, now);
      counts[key[licenceStateForDays(days, r.renewalLeadDays)]]++;
      byCategory[r.category] = (byCategory[r.category] ?? 0) + 1;
      if (isRenewalInProgress(r.renewalStage)) renewalsInProgress++;
      if (!nextExpiry && days >= 0) nextExpiry = { id: r.id, name: r.name, branch: r.branch, expiresAt: isoDate(r.expiresAt), daysLeft: days };
    }
    return { total: rows.length, ...counts, renewalsInProgress, retired, nextExpiry, byCategory };
  }

  /** Run the expiry alerts now (they also run on a schedule). */
  async runAlerts(actor: UserActor) {
    this.assertManager(actor);
    const result = await this.alerts.run();
    await this.audit.record({
      actor,
      action: "licence.alerts_run",
      objectType: "licence",
      objectId: "alerts",
      summary: result.alerted ? `Licence expiry alerts run by hand: ${result.alerted} sent` : "Licence expiry alerts run by hand: nothing new to send",
      after: { checked: result.checked, alerted: result.alerted },
    });
    return result;
  }

  // ── Shapes ──

  private snapshot(l: { name: string; licenceNumber: string; category: string; issuingAuthority: string; branchId: string; ownerUserId: string | null; issuedAt: Date | null; expiresAt: Date; renewalLeadDays: number; renewalFee: number | null }) {
    return {
      name: l.name,
      licenceNumber: l.licenceNumber,
      category: l.category,
      issuingAuthority: l.issuingAuthority,
      branchId: l.branchId,
      ownerUserId: l.ownerUserId,
      issuedAt: l.issuedAt ? isoDate(l.issuedAt) : null,
      expiresAt: isoDate(l.expiresAt),
      renewalLeadDays: l.renewalLeadDays,
      renewalFee: l.renewalFee,
    };
  }

  private actionsFor(actor: UserActor, l: { active: boolean }): string[] {
    if (!this.canManage(actor)) return [];
    const out = ["EDIT"];
    if (l.active) out.push("ADVANCE_RENEWAL", "MARK_RENEWED");
    out.push("UPLOAD_DOCUMENT", "ADD_NOTE");
    return out;
  }

  private serialize(actor: UserActor, l: LicenceFull) {
    const now = new Date();
    const daysLeft = daysUntil(l.expiresAt, now);
    const state = licenceStateForDays(daysLeft, l.renewalLeadDays);
    const lastDocument = [...l.events].reverse().find((e) => e.type === LicenceEventType.DOCUMENT_UPLOADED);
    const documentUrl = l.documentKey ? this.documentUrl(l.id, l.documentKey) : null;
    const nextDays = l.active ? nextLicenceAlertDays(daysLeft, l.renewalLeadDays, l.lastAlertDays) : null;
    const expires = isoDate(l.expiresAt);
    return {
      id: l.id,
      name: l.name,
      licenceNumber: l.licenceNumber,
      category: l.category,
      categoryLabel: LICENCE_CATEGORY_LABEL[l.category as LicenceCategory] ?? l.category,
      issuingAuthority: l.issuingAuthority,
      branch: l.branch,
      owner: l.owner
        ? {
            id: l.owner.id,
            name: l.owner.displayName,
            email: l.owner.email,
            employeeCode: l.owner.employee?.employeeCode ?? null,
            designation: l.owner.employee?.designation ?? null,
            phone: l.owner.employee?.phone ?? null,
          }
        : null,
      issuedAt: l.issuedAt ? isoDate(l.issuedAt) : null,
      expiresAt: expires,
      daysLeft,
      state,
      renewalLeadDays: l.renewalLeadDays,
      renewalWindowOpensOn: addCalendarDays(expires, -l.renewalLeadDays),
      renewalFee: l.renewalFee,
      renewalStage: l.renewalStage,
      renewalProgress: renewalProgress(l.renewalStage),
      renewalStartedAt: l.renewalStartedAt,
      notes: l.notes,
      active: l.active,
      hasDocument: !!l.documentKey,
      documentUrl,
      document: l.documentKey
        ? {
            name: l.documentName,
            mimeType: l.documentMime,
            size: l.documentSize,
            isPdf: l.documentMime === "application/pdf",
            uploadedAt: lastDocument?.createdAt ?? l.updatedAt,
            uploadedBy: lastDocument?.actorName ?? null,
            url: documentUrl,
          }
        : null,
      alerts: {
        lastDays: l.lastAlertDays,
        lastAt: l.lastAlertAt,
        due: l.active && isLicenceAlertDue(daysLeft, l.renewalLeadDays, l.lastAlertDays),
        nextDays,
        nextOn: nextDays === null ? null : addCalendarDays(expires, -nextDays),
        nextLevel: nextDays === null ? null : licenceAlertLevel(nextDays),
      },
      history: l.events.map((e) => ({ id: e.id, type: e.type, note: e.note, actor: e.actorName, metadata: e.metadata, createdAt: e.createdAt })),
      createdAt: l.createdAt,
      updatedAt: l.updatedAt,
      viewer: { canManage: this.canManage(actor), actions: this.actionsFor(actor, l) },
    };
  }

  private serializeRow(r: LicenceRow) {
    const daysLeft = daysUntil(r.expiresAt);
    return {
      id: r.id,
      name: r.name,
      licenceNumber: r.licenceNumber,
      category: r.category,
      issuingAuthority: r.issuingAuthority,
      branch: r.branch,
      owner: r.owner ? { id: r.owner.id, name: r.owner.displayName } : null,
      expiresAt: isoDate(r.expiresAt),
      daysLeft,
      state: licenceStateForDays(daysLeft, r.renewalLeadDays),
      renewalLeadDays: r.renewalLeadDays,
      renewalStage: r.renewalStage,
      renewalProgress: renewalProgress(r.renewalStage),
      hasDocument: !!r.documentKey,
      active: r.active,
    };
  }
}
