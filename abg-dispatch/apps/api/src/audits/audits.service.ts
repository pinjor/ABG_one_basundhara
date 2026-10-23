import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import {
  AUDIT_LIMITS,
  AUDIT_RATING_LABEL,
  AUDIT_STATUS_LABEL,
  AUDIT_TYPE_LABEL,
  AuditAction,
  AuditStatus,
  AuditUpdateType,
  Capability,
  FINDING_DUE_DAYS,
  FINDING_SEVERITY_LABEL,
  FINDING_SEVERITY_ORDER,
  FINDING_STATUS_LABEL,
  FindingAction,
  FindingSeverity,
  FindingStatus,
  NotificationCategory,
  OPEN_AUDIT_STATUSES,
  OPEN_FINDING_STATUSES,
  READ_ONLY_ROLES,
  RoleCode,
  canAuditTransition,
  canFindingTransition,
  capabilitiesFor,
  findingOverdue,
  formatAuditNumber,
  formatFindingNumber,
  type AuditRating,
  type AuditType,
} from "@abg-dispatch/shared";
import { PrismaService, type Tx } from "../common/prisma.service";
import type { UserActor } from "../common/actor";
import { badRequest, conflict, forbidden, notFound } from "../common/errors";
import { clampLimit, decodeCursor, encodeCursor } from "../common/pagination";
import { dhakaYear, nextSequence } from "../common/sequence";
import { dhakaDay } from "../common/time";
import { AuditService } from "../audit/audit.service";
import { NotificationService, type Draft } from "../notifications/notification.service";
import { moduleScope } from "../admin/admin-scope";
import type { AdminAuditsQuery, CompleteFieldworkDto, CreateAuditDto, CreateFindingDto, MyActionsQuery, ReassignFindingDto } from "./audits.dto";

export const AUDIT_NOT_FOUND = "Audit not found, or you do not have access to it.";
export const FINDING_NOT_FOUND = "Finding not found, or you do not have access to it.";
const STATE_CONFLICT = "AUDIT_STATE_CONFLICT";
const MODULE = "audits";
/** Compliance runs audits across the group; the MD / Chairman read them group-wide. */
const VIEW_ORG_WIDE: RoleCode[] = [RoleCode.COMPLIANCE_OFFICER, RoleCode.EXECUTIVE];
const MANAGE_ORG_WIDE: RoleCode[] = [RoleCode.COMPLIANCE_OFFICER];

const PERSON = { select: { id: true, displayName: true, employee: { select: { designation: true, department: { select: { name: true } } } } } } as const;

const INCLUDE = {
  branch: { select: { id: true, name: true, code: true } },
  lead: PERSON,
  findings: { include: { owner: PERSON }, orderBy: { sequence: "asc" as const } },
  updates: { orderBy: [{ createdAt: "asc" as const }, { id: "asc" as const }] },
} satisfies Prisma.AuditInclude;

const ROW_INCLUDE = {
  branch: { select: { id: true, name: true, code: true } },
  lead: { select: { displayName: true } },
  findings: { select: { severity: true, status: true, dueDate: true } },
} satisfies Prisma.AuditInclude;

type AuditFull = Prisma.AuditGetPayload<{ include: typeof INCLUDE }>;
type AuditRow = Prisma.AuditGetPayload<{ include: typeof ROW_INCLUDE }>;
type FindingFull = AuditFull["findings"][number];

interface Relation {
  isLead: boolean;
  /** audits.view holder whose offices include the audit. */
  isStaff: boolean;
  /** audits.manage holder whose offices include the audit. */
  isManager: boolean;
  /** Owns at least one finding (and sees only those). */
  ownsFindings: boolean;
}

const day = (d: Date | null | undefined): string | null => (d ? d.toISOString().slice(0, 10) : null);
const asDate = (s: string): Date => new Date(`${s}T00:00:00.000Z`);
const addDays = (s: string, n: number): string => day(new Date(asDate(s).getTime() + n * 86_400_000))!;
const isRealDate = (s: string): boolean => {
  const d = asDate(s);
  return !Number.isNaN(d.getTime()) && day(d) === s;
};
const fullDay = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" });
const shortDay = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", day: "numeric", month: "short" });

function isReadOnly(actor: UserActor): boolean {
  return actor.roles.length > 0 && actor.roles.every((r) => READ_ONLY_ROLES.includes(r));
}

/** Counts across an audit's findings. */
export function findingCounts(findings: { severity: string; status: string; dueDate: Date | null }[], today: string) {
  const open = findings.filter((f) => OPEN_FINDING_STATUSES.includes(f.status as FindingStatus));
  return {
    total: findings.length,
    open: findings.filter((f) => f.status === FindingStatus.OPEN).length,
    submitted: findings.filter((f) => f.status === FindingStatus.SUBMITTED).length,
    verified: findings.filter((f) => f.status === FindingStatus.VERIFIED).length,
    noted: findings.filter((f) => f.status === FindingStatus.NOTED).length,
    overdue: findings.filter((f) => findingOverdue(f.status, day(f.dueDate), today)).length,
    criticalOpen: open.filter((f) => f.severity === FindingSeverity.CRITICAL).length,
    bySeverity: Object.fromEntries(FINDING_SEVERITY_ORDER.map((s) => [s, findings.filter((f) => f.severity === s).length])),
  };
}

/**
 * Audits. Compliance plans an audit of an office, records the findings, gives
 * each a corrective-action owner and due date, verifies the fixes and closes
 * the audit once nothing is open (the database refuses to close it earlier).
 * Owners see and answer their own findings; office staff read the audits of
 * their offices. Every step is history; planning and closing are audited.
 */
@Injectable()
export class AuditsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationService,
    private readonly auditLog: AuditService,
  ) {}

  // ── Access ──

  private viewScope(actor: UserActor): string[] | null | false {
    if (!actor.capabilities.has(Capability.AUDITS_VIEW)) return false;
    return moduleScope(actor, VIEW_ORG_WIDE);
  }

  private manageScope(actor: UserActor): string[] | null | false {
    if (!actor.capabilities.has(Capability.AUDITS_MANAGE) || isReadOnly(actor)) return false;
    return moduleScope(actor, MANAGE_ORG_WIDE);
  }

  private covers(scope: string[] | null | false, branchId: string): boolean {
    return scope === null || (scope !== false && scope.includes(branchId));
  }

  private relation(actor: UserActor, a: { branchId: string; leadUserId: string; findings: { ownerUserId: string | null }[] }): Relation {
    return {
      isLead: a.leadUserId === actor.userId,
      isStaff: this.covers(this.viewScope(actor), a.branchId),
      isManager: this.covers(this.manageScope(actor), a.branchId),
      ownsFindings: a.findings.some((f) => f.ownerUserId === actor.userId),
    };
  }

  private async load(actor: UserActor, id: string): Promise<{ audit: AuditFull; rel: Relation }> {
    const audit = await this.prisma.audit.findUnique({ where: { id }, include: INCLUDE });
    if (!audit) throw notFound(AUDIT_NOT_FOUND, "AUDIT_NOT_FOUND");
    const rel = this.relation(actor, audit);
    if (!rel.isLead && !rel.isStaff && !rel.isManager && !rel.ownsFindings) throw notFound(AUDIT_NOT_FOUND, "AUDIT_NOT_FOUND");
    return { audit, rel };
  }

  private canManage(actor: UserActor, rel: Relation): boolean {
    return !isReadOnly(actor) && (rel.isManager || (rel.isLead && actor.capabilities.has(Capability.AUDITS_MANAGE)));
  }

  private requireManage(actor: UserActor, rel: Relation) {
    if (!this.canManage(actor, rel)) throw forbidden("Only the audit lead or compliance can change this audit.", "NOT_AUDIT_MANAGER");
  }

  // ── Planning ──

  async create(actor: UserActor, dto: CreateAuditDto) {
    const scope = this.manageScope(actor);
    if (scope === false) throw forbidden("Your role does not include planning audits.", "MISSING_CAPABILITY");
    const branch = await this.prisma.branch.findUnique({ where: { id: dto.branchId }, select: { id: true, name: true, code: true, active: true } });
    if (!branch || !branch.active || !this.covers(scope, branch.id)) throw badRequest("Choose one of your offices.", "BRANCH_INVALID");
    const L = AUDIT_LIMITS;
    if (!isRealDate(dto.plannedStart) || !isRealDate(dto.plannedEnd)) throw badRequest("Enter real calendar dates for the audit.", "DATE_INVALID");
    if (dto.plannedEnd < dto.plannedStart) throw badRequest("The audit must end on or after the day it starts.", "END_BEFORE_START");
    const today = dhakaDay(new Date());
    if (dto.plannedStart > addDays(today, L.maxLeadDays)) throw badRequest(`Audits can be planned at most ${L.maxLeadDays} days ahead.`, "START_TOO_FAR");
    if (Math.round((asDate(dto.plannedEnd).getTime() - asDate(dto.plannedStart).getTime()) / 86_400_000) + 1 > L.maxDurationDays) {
      throw badRequest(`Fieldwork spans at most ${L.maxDurationDays} days; split a longer programme into separate audits.`, "AUDIT_TOO_LONG");
    }
    const lead = await this.resolveLead(actor, dto.leadUserId);
    const team: string[] = [];
    for (const raw of dto.team ?? []) {
      const name = raw.replace(/\s+/g, " ").trim();
      if (name.length >= 2 && !team.some((t) => t.toLowerCase() === name.toLowerCase())) team.push(name);
    }
    const now = new Date();
    const audit = await this.prisma.$transaction(async (tx) => {
      const year = dhakaYear(now);
      const referenceNumber = formatAuditNumber(year, await nextSequence(tx, "AU", String(year)));
      const created = await tx.audit.create({
        data: {
          referenceNumber,
          title: dto.title.trim(),
          type: dto.type,
          scope: dto.scope?.trim() ?? "",
          branchId: branch.id,
          externalBody: dto.externalBody ?? null,
          team,
          leadUserId: lead.id,
          plannedStart: asDate(dto.plannedStart),
          plannedEnd: asDate(dto.plannedEnd),
          status: AuditStatus.PLANNED,
          statusChangedAt: now,
          createdByName: actor.displayName,
        },
      });
      await tx.auditUpdate.create({ data: { auditId: created.id, type: AuditUpdateType.CREATED, toStatus: AuditStatus.PLANNED, actorUserId: actor.userId, actorName: actor.displayName, metadata: { lead: lead.name }, createdAt: now } });
      await this.auditLog.record({ actor, action: "audit.planned", objectType: "audit", objectId: created.id, summary: `${referenceNumber}: ${AUDIT_TYPE_LABEL[dto.type as AuditType]} at ${branch.code} planned`, after: { title: created.title, plannedStart: dto.plannedStart } }, tx);
      return created;
    });
    const office = await this.notifications.usersWithRoles([RoleCode.BRANCH_ADMIN], [branch.id]);
    await this.deliver(
      audit,
      `audit:${audit.id}:planned`,
      "AUDIT_PLANNED",
      [lead.id, ...office].filter((u) => u !== actor.userId),
      NotificationCategory.PARCEL_UPDATE,
      `Audit planned at ${branch.name}`,
      `${AUDIT_TYPE_LABEL[audit.type as AuditType]} · ${audit.title} — ${this.dates(audit)}${audit.externalBody ? ` · ${audit.externalBody}` : ""}. ${audit.referenceNumber}`,
    );
    return this.get(actor, audit.id);
  }

  /** The lead defaults to the caller; anyone named must be able to manage audits. */
  private async resolveLead(actor: UserActor, leadUserId?: string): Promise<{ id: string; name: string }> {
    if (!leadUserId || leadUserId === actor.userId) return { id: actor.userId, name: actor.displayName };
    const user = await this.prisma.user.findUnique({ where: { id: leadUserId }, select: { id: true, displayName: true, active: true, roles: { select: { role: true } } } });
    if (!user || !user.active || !capabilitiesFor(user.roles.map((r) => r.role)).has(Capability.AUDITS_MANAGE)) {
      throw badRequest("The audit lead must be someone who manages audits (compliance or head office).", "LEAD_INVALID");
    }
    return { id: user.id, name: user.displayName };
  }

  private async resolveOwner(ownerUserId: string): Promise<{ id: string; name: string }> {
    const user = await this.prisma.user.findUnique({ where: { id: ownerUserId }, select: { id: true, displayName: true, active: true, employee: { select: { status: true } }, roles: { select: { role: true } } } });
    if (!user || !user.active || user.employee?.status !== "ACTIVE") throw badRequest("Choose an active colleague who can sign in to ABG ONE to own the corrective action.", "OWNER_INVALID");
    if (user.roles.length && user.roles.every((r) => READ_ONLY_ROLES.includes(r.role as RoleCode))) throw badRequest(`${user.displayName} has read-only access and cannot own a corrective action.`, "OWNER_INVALID");
    return { id: user.id, name: user.displayName };
  }

  // ── Reading ──

  async get(actor: UserActor, id: string) {
    const { audit, rel } = await this.load(actor, id);
    return this.serialize(actor, audit, rel);
  }

  async list(actor: UserActor, q: AdminAuditsQuery) {
    const scope = this.viewScope(actor);
    if (scope === false) throw forbidden("Your role does not include audits.");
    const where: Prisma.AuditWhereInput[] = [scope ? { branchId: { in: scope } } : {}];
    if (q.status === "OPEN") where.push({ status: { in: [...OPEN_AUDIT_STATUSES] } });
    else if (q.status && q.status !== "ALL") where.push({ status: { in: q.status.split(",") } });
    if (q.type) where.push({ type: q.type });
    if (q.branchId) where.push({ branchId: q.branchId });
    const text = q.q?.trim();
    if (text) {
      where.push({
        OR: [
          { referenceNumber: { contains: text, mode: "insensitive" } },
          { title: { contains: text, mode: "insensitive" } },
          { externalBody: { contains: text, mode: "insensitive" } },
        ],
      });
    }
    const limit = clampLimit(q.limit, 25, 100);
    const cursor = decodeCursor(q.cursor);
    if (cursor) where.push({ OR: [{ createdAt: { lt: cursor.createdAt } }, { createdAt: cursor.createdAt, id: { lt: cursor.id } }] });
    const rows = await this.prisma.audit.findMany({ where: { AND: where }, include: ROW_INCLUDE, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: limit + 1 });
    const items = rows.slice(0, limit);
    return { items: items.map((r) => this.serializeRow(r)), nextCursor: rows.length > limit ? encodeCursor(items[items.length - 1].createdAt, items[items.length - 1].id) : null };
  }

  /** The corrective actions the caller owns, overdue first. */
  async myActions(actor: UserActor, q: MyActionsQuery) {
    const statuses = q.state === "closed" ? [FindingStatus.VERIFIED] : q.state === "all" ? [FindingStatus.OPEN, FindingStatus.SUBMITTED, FindingStatus.VERIFIED] : [...OPEN_FINDING_STATUSES];
    const rows = await this.prisma.auditFinding.findMany({
      where: { ownerUserId: actor.userId, status: { in: statuses }, audit: { status: { not: AuditStatus.CANCELLED } } },
      include: { owner: PERSON, audit: { select: { id: true, referenceNumber: true, title: true, type: true, status: true, branch: { select: { id: true, name: true, code: true } }, lead: { select: { displayName: true } } } } },
      orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
    });
    const today = dhakaDay(new Date());
    const items = rows.map((f) => ({
      ...this.serializeFinding(actor, f, { isLead: false, isStaff: false, isManager: false, ownsFindings: true }, f.audit.status, today),
      audit: { id: f.audit.id, referenceNumber: f.audit.referenceNumber, title: f.audit.title, type: f.audit.type, status: f.audit.status, branch: f.audit.branch, lead: f.audit.lead.displayName },
    }));
    items.sort((a, b) => Number(b.overdue) - Number(a.overdue));
    return { items, counts: { open: rows.filter((f) => f.status === FindingStatus.OPEN).length, submitted: rows.filter((f) => f.status === FindingStatus.SUBMITTED).length, overdue: items.filter((i) => i.overdue).length } };
  }

  /** Counts for the portal's KPI cards and the Executive Dashboard. */
  async summary(actor: UserActor, branchId?: string) {
    const scope = this.viewScope(actor);
    if (scope === false) throw forbidden("Your role does not include audits.");
    const base: Prisma.AuditWhereInput = { AND: [scope ? { branchId: { in: scope } } : {}, branchId ? { branchId } : {}] };
    const today = dhakaDay(new Date());
    const year = Number(today.slice(0, 4));
    const [grouped, live, upcoming, closedThisYear] = await Promise.all([
      this.prisma.audit.groupBy({ by: ["status"], where: base, _count: { _all: true } }),
      this.prisma.auditFinding.findMany({ where: { status: { in: [...OPEN_FINDING_STATUSES] }, audit: { AND: [base, { status: { not: AuditStatus.CANCELLED } }] } }, select: { severity: true, status: true, dueDate: true, audit: { select: { branch: { select: { code: true } } } } } }),
      this.prisma.audit.findMany({ where: { AND: [base, { status: AuditStatus.PLANNED, plannedStart: { gte: asDate(today), lte: asDate(addDays(today, 30)) } }] }, include: ROW_INCLUDE, orderBy: { plannedStart: "asc" }, take: 5 }),
      this.prisma.audit.groupBy({ by: ["rating"], where: { AND: [base, { status: { in: [AuditStatus.CLOSED, AuditStatus.FOLLOW_UP] }, fieldworkCompletedAt: { gte: new Date(`${year}-01-01T00:00:00+06:00`) } }] }, _count: { _all: true } }),
    ]);
    const counts = Object.fromEntries(Object.values(AuditStatus).map((s) => [s, grouped.find((g) => g.status === s)?._count._all ?? 0])) as Record<AuditStatus, number>;
    const byOffice: Record<string, number> = {};
    for (const f of live) byOffice[f.audit.branch.code] = (byOffice[f.audit.branch.code] ?? 0) + 1;
    return {
      openAudits: counts.PLANNED + counts.IN_PROGRESS + counts.FOLLOW_UP,
      inProgress: counts.IN_PROGRESS,
      openActions: live.length,
      overdueActions: live.filter((f) => findingOverdue(f.status, day(f.dueDate), today)).length,
      criticalOpen: live.filter((f) => f.severity === FindingSeverity.CRITICAL || f.severity === FindingSeverity.MAJOR).length,
      awaitingVerification: live.filter((f) => f.status === FindingStatus.SUBMITTED).length,
      openActionsByOffice: byOffice,
      upcoming: upcoming.map((r) => this.serializeRow(r)),
      ratingsThisYear: Object.fromEntries(closedThisYear.filter((r) => r.rating).map((r) => [r.rating!, r._count._all])),
      year,
      counts,
    };
  }

  // ── The audit's steps ──

  private async move(actor: UserActor, id: string, to: AuditStatus, data: (row: { status: string; referenceNumber: string }, now: Date) => Prisma.AuditUpdateInput, note: string | null, auditAction?: string) {
    const now = new Date();
    return this.prisma.$transaction(async (tx: Tx) => {
      const [row] = await tx.$queryRaw<{ status: string; referenceNumber: string }[]>`SELECT "status", "referenceNumber" FROM "audits" WHERE "id" = ${id} FOR UPDATE`;
      if (!canAuditTransition(row.status, to)) {
        throw conflict(STATE_CONFLICT, `This audit is ${AUDIT_STATUS_LABEL[row.status as AuditStatus].toLowerCase()}; it cannot become ${AUDIT_STATUS_LABEL[to].toLowerCase()}.`);
      }
      await tx.audit.update({ where: { id }, data: { ...data(row, now), status: to, statusChangedAt: now } });
      await tx.auditUpdate.create({ data: { auditId: id, type: AuditUpdateType.STATUS_CHANGED, fromStatus: row.status, toStatus: to, note, actorUserId: actor.userId, actorName: actor.displayName, createdAt: now } });
      if (auditAction) {
        await this.auditLog.record({ actor, action: auditAction, objectType: "audit", objectId: id, summary: `${row.referenceNumber}: ${AUDIT_STATUS_LABEL[row.status as AuditStatus]} → ${AUDIT_STATUS_LABEL[to]}`, before: { status: row.status }, after: { status: to, note } }, tx);
      }
      return { from: row.status, now };
    });
  }

  async start(actor: UserActor, id: string) {
    const { rel } = await this.load(actor, id);
    this.requireManage(actor, rel);
    await this.move(actor, id, AuditStatus.IN_PROGRESS, (_r, now) => ({ startedAt: now }), null);
    return this.get(actor, id);
  }

  async completeFieldwork(actor: UserActor, id: string, dto: CompleteFieldworkDto) {
    const { audit, rel } = await this.load(actor, id);
    this.requireManage(actor, rel);
    const open = audit.findings.filter((f) => OPEN_FINDING_STATUSES.includes(f.status as FindingStatus)).length;
    const to = open ? AuditStatus.FOLLOW_UP : AuditStatus.CLOSED;
    const conclusion = dto.conclusion.trim();
    await this.move(
      actor,
      id,
      to,
      (_r, now) => ({ rating: dto.rating, score: dto.score ?? null, conclusion, fieldworkCompletedAt: now, closedAt: to === AuditStatus.CLOSED ? now : undefined }),
      conclusion,
      to === AuditStatus.CLOSED ? "audit.closed" : "audit.fieldwork_completed",
    );
    const office = await this.notifications.usersWithRoles([RoleCode.BRANCH_ADMIN], [audit.branchId]);
    await this.deliver(
      audit,
      `audit:${id}:fieldwork`,
      "AUDIT_REPORTED",
      [audit.leadUserId, ...office].filter((u) => u !== actor.userId),
      NotificationCategory.PARCEL_UPDATE,
      `Audit result: ${AUDIT_RATING_LABEL[dto.rating as AuditRating]}`,
      `${audit.title} at ${audit.branch.name} — ${audit.findings.length} finding${audit.findings.length === 1 ? "" : "s"}${open ? `, ${open} corrective action${open === 1 ? "" : "s"} open` : ", nothing left open"}. ${audit.referenceNumber}`,
    );
    return this.get(actor, id);
  }

  async close(actor: UserActor, id: string, noteRaw?: string) {
    const { audit, rel } = await this.load(actor, id);
    this.requireManage(actor, rel);
    const open = audit.findings.filter((f) => OPEN_FINDING_STATUSES.includes(f.status as FindingStatus));
    if (open.length) throw conflict("AUDIT_ACTIONS_OPEN", `${open.length} corrective action${open.length === 1 ? " is" : "s are"} still open (${open.map((f) => f.number).join(", ")}). Verify them before closing the audit.`);
    await this.move(actor, id, AuditStatus.CLOSED, (_r, now) => ({ closedAt: now }), noteRaw?.trim() || null, "audit.closed");
    const office = await this.notifications.usersWithRoles([RoleCode.BRANCH_ADMIN], [audit.branchId]);
    await this.deliver(audit, `audit:${id}:closed`, "AUDIT_CLOSED", [audit.leadUserId, ...office].filter((u) => u !== actor.userId), NotificationCategory.PARCEL_UPDATE, "Audit closed", `${audit.title} at ${audit.branch.name} — every corrective action is verified. ${audit.referenceNumber}`);
    return this.get(actor, id);
  }

  async cancel(actor: UserActor, id: string, noteRaw?: string) {
    const { audit, rel } = await this.load(actor, id);
    this.requireManage(actor, rel);
    const note = noteRaw?.trim() || null;
    if (!note || note.length < AUDIT_LIMITS.reasonMin) throw badRequest("Say why the audit is cancelled.", "REASON_REQUIRED");
    if (audit.findings.length) throw conflict("AUDIT_HAS_FINDINGS", "This audit has findings on record; complete the fieldwork instead of cancelling it.");
    await this.move(actor, id, AuditStatus.CANCELLED, (_r, now) => ({ cancelledAt: now, statusNote: note }), note, "audit.cancelled");
    const office = await this.notifications.usersWithRoles([RoleCode.BRANCH_ADMIN], [audit.branchId]);
    await this.deliver(audit, `audit:${id}:cancelled`, "AUDIT_CANCELLED", [audit.leadUserId, ...office].filter((u) => u !== actor.userId), NotificationCategory.PARCEL_UPDATE, "Audit cancelled", `${audit.title} at ${audit.branch.name} — ${note}. ${audit.referenceNumber}`);
    return this.get(actor, id);
  }

  async addNote(actor: UserActor, id: string, noteRaw: string) {
    const { audit, rel } = await this.load(actor, id);
    if (isReadOnly(actor)) throw forbidden("Auditors have read-only access.", "READ_ONLY");
    if (!this.canManage(actor, rel) && !rel.ownsFindings) throw forbidden("You can read this audit but not add notes to it.", "READ_ONLY");
    const note = noteRaw.trim();
    const now = new Date();
    await this.prisma.auditUpdate.create({ data: { auditId: id, type: AuditUpdateType.NOTE_ADDED, note, actorUserId: actor.userId, actorName: actor.displayName, createdAt: now } });
    await this.deliver(audit, `audit:${id}:note:${now.getTime()}`, "AUDIT_NOTE", [audit.leadUserId].filter((u) => u !== actor.userId), NotificationCategory.PARCEL_UPDATE, `Note from ${actor.displayName}`, `${audit.referenceNumber} · ${note}`);
    return this.get(actor, id);
  }

  // ── Findings and corrective actions ──

  async addFinding(actor: UserActor, id: string, dto: CreateFindingDto) {
    const { audit, rel } = await this.load(actor, id);
    this.requireManage(actor, rel);
    if (audit.status !== AuditStatus.IN_PROGRESS && audit.status !== AuditStatus.FOLLOW_UP) {
      throw conflict(STATE_CONFLICT, audit.status === AuditStatus.PLANNED ? "Start the audit before recording findings." : `This audit is ${AUDIT_STATUS_LABEL[audit.status as AuditStatus].toLowerCase()}; findings can no longer be added.`);
    }
    const observation = dto.severity === FindingSeverity.OBSERVATION;
    let owner: { id: string; name: string } | null = null;
    let due: string | null = null;
    if (!observation) {
      if (!dto.ownerUserId) throw badRequest("Name who fixes it — every finding except an observation needs an owner.", "OWNER_REQUIRED");
      owner = await this.resolveOwner(dto.ownerUserId);
      due = this.checkDue(dto.dueDate ?? addDays(dhakaDay(new Date()), FINDING_DUE_DAYS[dto.severity as keyof typeof FINDING_DUE_DAYS]));
    }
    const now = new Date();
    const finding = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "audits" WHERE "id" = ${id} FOR UPDATE`;
      const last = await tx.auditFinding.aggregate({ where: { auditId: id }, _max: { sequence: true } });
      const sequence = (last._max.sequence ?? 0) + 1;
      const created = await tx.auditFinding.create({
        data: {
          auditId: id,
          sequence,
          number: formatFindingNumber(sequence),
          title: dto.title.trim(),
          detail: dto.detail?.trim() ?? "",
          clause: dto.clause ?? null,
          area: dto.area ?? null,
          severity: dto.severity,
          status: observation ? FindingStatus.NOTED : FindingStatus.OPEN,
          recommendation: dto.recommendation ?? null,
          ownerUserId: owner?.id ?? null,
          dueDate: due ? asDate(due) : null,
        },
      });
      await tx.auditUpdate.create({
        data: { auditId: id, findingId: created.id, type: AuditUpdateType.FINDING_ADDED, toStatus: created.status, note: created.title, actorUserId: actor.userId, actorName: actor.displayName, metadata: { number: created.number, severity: created.severity, owner: owner?.name ?? null, dueDate: due }, createdAt: now },
      });
      return created;
    });
    if (owner) {
      await this.deliver(
        audit,
        `audit:${id}:finding:${finding.id}:assigned`,
        "AUDIT_ACTION_ASSIGNED",
        [owner.id].filter((u) => u !== actor.userId),
        NotificationCategory.ACTION_REQUIRED,
        `${FINDING_SEVERITY_LABEL[finding.severity as FindingSeverity]} finding to fix by ${shortDay.format(finding.dueDate!)}`,
        `${finding.number} · ${finding.title} — ${audit.title}, ${audit.branch.name}. ${audit.referenceNumber}`,
      );
    }
    return this.get(actor, id);
  }

  private checkDue(due: string): string {
    const today = dhakaDay(new Date());
    if (!isRealDate(due)) throw badRequest("Enter a real due date.", "DATE_INVALID");
    if (due < today) throw badRequest("The due date cannot be in the past.", "DUE_IN_PAST");
    if (due > addDays(today, AUDIT_LIMITS.maxDueDays)) throw badRequest(`Corrective actions are due within ${AUDIT_LIMITS.maxDueDays} days.`, "DUE_TOO_FAR");
    return due;
  }

  private async loadFinding(actor: UserActor, findingId: string) {
    const f = await this.prisma.auditFinding.findUnique({ where: { id: findingId }, select: { auditId: true } });
    if (!f) throw notFound(FINDING_NOT_FOUND, "FINDING_NOT_FOUND");
    const { audit, rel } = await this.load(actor, f.auditId).catch(() => {
      throw notFound(FINDING_NOT_FOUND, "FINDING_NOT_FOUND");
    });
    const finding = audit.findings.find((x) => x.id === findingId)!;
    if (!rel.isLead && !rel.isStaff && !rel.isManager && finding.ownerUserId !== actor.userId) throw notFound(FINDING_NOT_FOUND, "FINDING_NOT_FOUND");
    return { audit, rel, finding };
  }

  /** Move a finding under a row lock, with history. */
  private async moveFinding(actor: UserActor, audit: AuditFull, finding: FindingFull, to: FindingStatus, type: string, data: Prisma.AuditFindingUpdateInput, note: string | null) {
    const now = new Date();
    await this.prisma.$transaction(async (tx: Tx) => {
      const [row] = await tx.$queryRaw<{ status: string }[]>`SELECT "status" FROM "audit_findings" WHERE "id" = ${finding.id} FOR UPDATE`;
      if (!canFindingTransition(row.status, to)) {
        throw conflict("FINDING_STATE_CONFLICT", `${finding.number} is ${FINDING_STATUS_LABEL[row.status as FindingStatus].toLowerCase()}; it cannot become ${FINDING_STATUS_LABEL[to].toLowerCase()}.`);
      }
      await tx.auditFinding.update({ where: { id: finding.id }, data: { ...data, status: to } });
      await tx.auditUpdate.create({ data: { auditId: audit.id, findingId: finding.id, type, fromStatus: row.status, toStatus: to, note, actorUserId: actor.userId, actorName: actor.displayName, metadata: { number: finding.number }, createdAt: now } });
    });
    return now;
  }

  private assertLive(audit: AuditFull) {
    if (audit.status !== AuditStatus.IN_PROGRESS && audit.status !== AuditStatus.FOLLOW_UP) {
      throw conflict(STATE_CONFLICT, `This audit is ${AUDIT_STATUS_LABEL[audit.status as AuditStatus].toLowerCase()}.`);
    }
  }

  async submitFinding(actor: UserActor, findingId: string, responseRaw: string) {
    const { audit, finding } = await this.loadFinding(actor, findingId);
    if (finding.ownerUserId !== actor.userId || isReadOnly(actor)) throw forbidden(`Only ${finding.owner?.displayName ?? "the owner"} can submit the fix for ${finding.number}.`, "NOT_OWNER");
    this.assertLive(audit);
    const response = responseRaw.trim();
    const now = await this.moveFinding(actor, audit, finding, FindingStatus.SUBMITTED, AuditUpdateType.FINDING_SUBMITTED, { response, submittedAt: new Date() }, response);
    await this.deliver(audit, `audit:${audit.id}:finding:${finding.id}:submitted:${now.getTime()}`, "AUDIT_ACTION_SUBMITTED", [audit.leadUserId].filter((u) => u !== actor.userId), NotificationCategory.ACTION_REQUIRED, "Fix submitted for verification", `${finding.number} · ${finding.title} — ${actor.displayName}: ${response}. ${audit.referenceNumber}`);
    return this.get(actor, audit.id);
  }

  async verifyFinding(actor: UserActor, findingId: string, noteRaw?: string) {
    const { audit, rel, finding } = await this.loadFinding(actor, findingId);
    this.requireManage(actor, rel);
    this.assertLive(audit);
    const note = noteRaw?.trim() || null;
    const now = await this.moveFinding(actor, audit, finding, FindingStatus.VERIFIED, AuditUpdateType.FINDING_VERIFIED, { verifiedAt: new Date(), verifiedByName: actor.displayName }, note);
    if (finding.ownerUserId) {
      await this.deliver(audit, `audit:${audit.id}:finding:${finding.id}:verified`, "AUDIT_ACTION_VERIFIED", [finding.ownerUserId].filter((u) => u !== actor.userId), NotificationCategory.PARCEL_UPDATE, "Corrective action verified", `${finding.number} · ${finding.title} is closed${note ? ` — ${note}` : ""}. ${audit.referenceNumber}`);
    }
    const left = await this.prisma.auditFinding.count({ where: { auditId: audit.id, status: { in: [...OPEN_FINDING_STATUSES] } } });
    if (!left && audit.status === AuditStatus.FOLLOW_UP) {
      await this.deliver(audit, `audit:${audit.id}:ready:${now.getTime()}`, "AUDIT_READY_TO_CLOSE", [audit.leadUserId].filter((u) => u !== actor.userId), NotificationCategory.ACTION_REQUIRED, "Every action verified — close the audit", `${audit.title} at ${audit.branch.name}. ${audit.referenceNumber}`);
    }
    return this.get(actor, audit.id);
  }

  async reopenFinding(actor: UserActor, findingId: string, noteRaw?: string) {
    const { audit, rel, finding } = await this.loadFinding(actor, findingId);
    this.requireManage(actor, rel);
    this.assertLive(audit);
    const note = noteRaw?.trim() || null;
    if (!note || note.length < AUDIT_LIMITS.reasonMin) throw badRequest("Tell the owner what is still missing.", "REASON_REQUIRED");
    const now = await this.moveFinding(actor, audit, finding, FindingStatus.OPEN, AuditUpdateType.FINDING_REOPENED, { submittedAt: null }, note);
    if (finding.ownerUserId) {
      await this.deliver(audit, `audit:${audit.id}:finding:${finding.id}:reopened:${now.getTime()}`, "AUDIT_ACTION_REOPENED", [finding.ownerUserId], NotificationCategory.ACTION_REQUIRED, "Corrective action sent back", `${finding.number} · ${finding.title} — ${actor.displayName}: ${note}. ${audit.referenceNumber}`);
    }
    return this.get(actor, audit.id);
  }

  async reassignFinding(actor: UserActor, findingId: string, dto: ReassignFindingDto) {
    const { audit, rel, finding } = await this.loadFinding(actor, findingId);
    this.requireManage(actor, rel);
    this.assertLive(audit);
    if (!OPEN_FINDING_STATUSES.includes(finding.status as FindingStatus)) throw conflict("FINDING_STATE_CONFLICT", `${finding.number} is ${FINDING_STATUS_LABEL[finding.status as FindingStatus].toLowerCase()}; there is nothing to reassign.`);
    const owner = await this.resolveOwner(dto.ownerUserId);
    const due = dto.dueDate ? this.checkDue(dto.dueDate) : day(finding.dueDate);
    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.auditFinding.update({ where: { id: finding.id }, data: { ownerUserId: owner.id, dueDate: due ? asDate(due) : null, overdueNotifiedAt: null } });
      await tx.auditUpdate.create({
        data: { auditId: audit.id, findingId: finding.id, type: AuditUpdateType.FINDING_REASSIGNED, note: `${finding.owner?.displayName ?? "—"} → ${owner.name}`, actorUserId: actor.userId, actorName: actor.displayName, metadata: { number: finding.number, owner: owner.name, dueDate: due }, createdAt: now },
      });
    });
    await this.deliver(audit, `audit:${audit.id}:finding:${finding.id}:assigned:${now.getTime()}`, "AUDIT_ACTION_ASSIGNED", [owner.id].filter((u) => u !== actor.userId), NotificationCategory.ACTION_REQUIRED, `Corrective action to fix by ${due ? shortDay.format(asDate(due)) : "—"}`, `${finding.number} · ${finding.title} — ${audit.title}, ${audit.branch.name}. ${audit.referenceNumber}`);
    return this.get(actor, audit.id);
  }

  // ── Overdue alerts (run on the background schedule) ──

  /** Each corrective action past its due date tells its owner and the lead once. */
  async alertOverdue(now = new Date()): Promise<number> {
    const today = dhakaDay(now);
    const due = await this.prisma.auditFinding.findMany({
      where: { status: FindingStatus.OPEN, dueDate: { lt: asDate(today) }, overdueNotifiedAt: null, audit: { status: { in: [AuditStatus.IN_PROGRESS, AuditStatus.FOLLOW_UP] } } },
      include: { audit: { select: { id: true, referenceNumber: true, status: true, title: true, leadUserId: true, branch: { select: { name: true } } } }, owner: { select: { id: true, displayName: true } } },
    });
    let sent = 0;
    for (const f of due) {
      const claimed = await this.prisma.auditFinding.updateMany({ where: { id: f.id, overdueNotifiedAt: null }, data: { overdueNotifiedAt: now } });
      if (!claimed.count) continue;
      sent += 1;
      await this.deliver(
        f.audit,
        `audit:${f.audit.id}:finding:${f.id}:overdue`,
        "AUDIT_ACTION_OVERDUE",
        [f.ownerUserId, f.audit.leadUserId].filter((u): u is string => !!u),
        NotificationCategory.ACTION_REQUIRED,
        "Corrective action overdue",
        `${f.number} · ${f.title} was due ${shortDay.format(f.dueDate!)} — ${f.owner?.displayName ?? "no owner"}, ${f.audit.branch.name}. ${f.audit.referenceNumber}`,
      );
    }
    return sent;
  }

  private async deliver(a: { id: string; referenceNumber: string; status: string }, dedupeBase: string, eventType: string, userIds: string[], category: string, title: string, body: string) {
    const drafts: Draft[] = [...new Set(userIds)].map((userId) => ({ userId, category, title, body }));
    if (!drafts.length) return;
    const fresh = await this.prisma.audit.findUnique({ where: { id: a.id }, select: { status: true } });
    await this.notifications.deliverModule({ module: MODULE, id: a.id, reference: a.referenceNumber, route: `/audits/${a.id}`, status: fresh?.status ?? a.status }, dedupeBase, eventType, drafts);
  }

  private dates(a: { plannedStart: Date; plannedEnd: Date }): string {
    return day(a.plannedStart) === day(a.plannedEnd) ? fullDay.format(a.plannedStart) : `${shortDay.format(a.plannedStart)} – ${fullDay.format(a.plannedEnd)}`;
  }

  // ── Shapes ──

  private actionsFor(actor: UserActor, a: AuditFull, rel: Relation): string[] {
    if (!this.canManage(actor, rel)) return rel.ownsFindings && !isReadOnly(actor) ? [AuditAction.ADD_NOTE] : [];
    const out: string[] = [];
    const s = a.status as AuditStatus;
    if (s === AuditStatus.PLANNED) out.push(AuditAction.START);
    if (s === AuditStatus.IN_PROGRESS || s === AuditStatus.FOLLOW_UP) out.push(AuditAction.ADD_FINDING);
    if (s === AuditStatus.IN_PROGRESS) out.push(AuditAction.COMPLETE_FIELDWORK);
    if (s === AuditStatus.FOLLOW_UP && !a.findings.some((f) => OPEN_FINDING_STATUSES.includes(f.status as FindingStatus))) out.push(AuditAction.CLOSE);
    if ((s === AuditStatus.PLANNED || s === AuditStatus.IN_PROGRESS) && !a.findings.length) out.push(AuditAction.CANCEL);
    out.push(AuditAction.ADD_NOTE);
    return out;
  }

  private findingActions(actor: UserActor, f: { status: string; ownerUserId: string | null }, rel: Relation, auditStatus: string): string[] {
    if (isReadOnly(actor) || (auditStatus !== AuditStatus.IN_PROGRESS && auditStatus !== AuditStatus.FOLLOW_UP)) return [];
    const out: string[] = [];
    if (f.ownerUserId === actor.userId && f.status === FindingStatus.OPEN) out.push(FindingAction.SUBMIT);
    if (this.canManage(actor, rel)) {
      if (f.status === FindingStatus.OPEN || f.status === FindingStatus.SUBMITTED) out.push(FindingAction.VERIFY, FindingAction.REASSIGN);
      if (f.status === FindingStatus.SUBMITTED) out.push(FindingAction.REOPEN);
    }
    return out;
  }

  private serializeFinding(actor: UserActor, f: FindingFull, rel: Relation, auditStatus: string, today: string) {
    return {
      id: f.id,
      number: f.number,
      title: f.title,
      detail: f.detail,
      clause: f.clause,
      area: f.area,
      severity: f.severity,
      status: f.status,
      recommendation: f.recommendation,
      owner: f.owner ? { userId: f.owner.id, name: f.owner.displayName, designation: f.owner.employee?.designation ?? null, department: f.owner.employee?.department?.name ?? null } : null,
      dueDate: day(f.dueDate),
      overdue: findingOverdue(f.status, day(f.dueDate), today),
      response: f.response,
      submittedAt: f.submittedAt,
      verifiedAt: f.verifiedAt,
      verifiedByName: f.verifiedByName,
      createdAt: f.createdAt,
      actions: this.findingActions(actor, f, rel, auditStatus),
    };
  }

  private serialize(actor: UserActor, a: AuditFull, rel: Relation) {
    const today = dhakaDay(new Date());
    const fullView = rel.isLead || rel.isStaff || rel.isManager;
    const findings = fullView ? a.findings : a.findings.filter((f) => f.ownerUserId === actor.userId);
    return {
      id: a.id,
      referenceNumber: a.referenceNumber,
      title: a.title,
      type: a.type,
      scope: a.scope,
      branch: a.branch,
      externalBody: a.externalBody,
      team: Array.isArray(a.team) ? (a.team as unknown[]).map(String) : [],
      lead: { userId: a.lead.id, name: a.lead.displayName, designation: a.lead.employee?.designation ?? null },
      plannedStart: day(a.plannedStart),
      plannedEnd: day(a.plannedEnd),
      status: a.status,
      rating: a.rating,
      score: a.score,
      conclusion: a.conclusion,
      statusNote: a.statusNote,
      statusChangedAt: a.statusChangedAt,
      startedAt: a.startedAt,
      fieldworkCompletedAt: a.fieldworkCompletedAt,
      closedAt: a.closedAt,
      cancelledAt: a.cancelledAt,
      createdByName: a.createdByName,
      createdAt: a.createdAt,
      counts: findingCounts(a.findings, today),
      findings: findings.map((f) => this.serializeFinding(actor, f, rel, a.status, today)),
      updates: fullView ? a.updates.map((u) => ({ id: u.id, type: u.type, findingId: u.findingId, fromStatus: u.fromStatus, toStatus: u.toStatus, note: u.note, actor: u.actorName, metadata: u.metadata, createdAt: u.createdAt })) : [],
      viewer: {
        isLead: rel.isLead,
        isStaff: rel.isStaff,
        canManage: this.canManage(actor, rel),
        ownsFindings: rel.ownsFindings,
        /** Owners outside the audit team see their own findings only. */
        partial: !fullView,
        actions: this.actionsFor(actor, a, rel),
      },
    };
  }

  private serializeRow(r: AuditRow) {
    return {
      id: r.id,
      referenceNumber: r.referenceNumber,
      title: r.title,
      type: r.type,
      branch: r.branch,
      externalBody: r.externalBody,
      lead: { name: r.lead.displayName },
      plannedStart: day(r.plannedStart),
      plannedEnd: day(r.plannedEnd),
      status: r.status,
      rating: r.rating,
      score: r.score,
      statusChangedAt: r.statusChangedAt,
      createdAt: r.createdAt,
      counts: findingCounts(r.findings, dhakaDay(new Date())),
    };
  }
}
