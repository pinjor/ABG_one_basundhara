import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import {
  Capability,
  DEFAULT_WEEKEND_DAYS,
  HELD_LEAVE_STATUSES,
  LEAVE_AWAITING_LABEL,
  LEAVE_LIMITS,
  LEAVE_PIPELINE,
  LEAVE_SETTING_HOLIDAYS,
  LEAVE_SETTING_WEEKEND,
  LEAVE_STAGE_LABEL,
  LEAVE_STATUS_LABEL,
  LEAVE_TYPE_LABEL,
  LEAVE_TYPE_ORDER,
  LEAVE_TYPE_RULES,
  LeaveAction,
  LeaveAwaiting,
  LeaveDecision,
  LeaveStatus,
  LeaveType,
  LeaveUpdateType,
  NotificationCategory,
  OPEN_LEAVE_STATUSES,
  READ_ONLY_ROLES,
  RoleCode,
  canLeaveTransition,
  countLeaveDays,
  formatLeaveDays,
  formatLeaveNumber,
  leaveAwaiting,
  type PublicHoliday,
} from "@abg-dispatch/shared";
import { PrismaService, type Tx } from "../common/prisma.service";
import type { UserActor } from "../common/actor";
import { badRequest, conflict, forbidden, notFound } from "../common/errors";
import { clampLimit, decodeCursor, encodeCursor } from "../common/pagination";
import { nextSequence } from "../common/sequence";
import { dhakaDay } from "../common/time";
import { AuditService } from "../audit/audit.service";
import { NotificationService, type Draft } from "../notifications/notification.service";
import { moduleScope } from "../admin/admin-scope";
import type { AdminLeaveQuery, ApplyLeaveDto, EntitlementDto, LeaveApprovalsQuery, LeaveCalendarQuery, LeaveDecisionDto, LeaveSettingsDto, MyLeaveQuery } from "./leave.dto";

export const LEAVE_NOT_FOUND = "Leave application not found, or you do not have access to it.";
const STATE_CONFLICT = "LEAVE_STATE_CONFLICT";
const MODULE = "leave";
/** HR and the MD / Chairman see leave across the group. */
const ORG_WIDE: RoleCode[] = [RoleCode.HR_FINANCE, RoleCode.EXECUTIVE];
const STAGE_ORDER: Record<LeaveAwaiting, number> = { HOD: 0, HR: 1 };
const ENDINGS: string[] = [LeaveStatus.REJECTED, LeaveStatus.CANCELLED];
/** The longest span the calendars return at once. */
const MAX_CALENDAR_DAYS = 62;

const PERSON = {
  select: {
    id: true,
    displayName: true,
    employee: { select: { id: true, employeeCode: true, designation: true, phone: true, managerId: true, department: { select: { name: true } } } },
  },
} as const;

const INCLUDE = {
  applicant: PERSON,
  approver: PERSON,
  reliever: { select: { id: true, fullName: true, designation: true, phone: true } },
  branch: { select: { id: true, name: true, code: true } },
  updates: { orderBy: [{ createdAt: "asc" as const }, { id: "asc" as const }] },
} satisfies Prisma.LeaveRequestInclude;

const ROW_INCLUDE = {
  applicant: { select: { displayName: true, employee: { select: { employeeCode: true, designation: true, department: { select: { name: true } } } } } },
  approver: { select: { displayName: true } },
  reliever: { select: { fullName: true } },
  branch: { select: { id: true, name: true, code: true } },
} satisfies Prisma.LeaveRequestInclude;

type LeaveFull = Prisma.LeaveRequestGetPayload<{ include: typeof INCLUDE }>;
type LeaveRow = Prisma.LeaveRequestGetPayload<{ include: typeof ROW_INCLUDE }>;
type LeaveCore = { status: string; applicantUserId: string; approverUserId: string };

interface Relation {
  isApplicant: boolean;
  isApprover: boolean;
  /** HR (leave.manage): the second approval, group-wide. */
  isHr: boolean;
  /** The colleague covering the work: may read it. */
  isReliever: boolean;
  /** leave.view holder whose offices include the application. */
  isStaff: boolean;
}

type StageRight = "OK" | "OWN" | "SEPARATION" | "NONE";

export interface LeaveBalance {
  type: string;
  /** Days a year; null for leave without pay (no balance). */
  entitled: number | null;
  used: number;
  pending: number;
  available: number | null;
  /** HR set this person's entitlement for the year. */
  adjusted: boolean;
  note: string | null;
}

const day = (d: Date | null | undefined): string | null => (d ? d.toISOString().slice(0, 10) : null);
const asDate = (s: string): Date => new Date(`${s}T00:00:00.000Z`);
const addDays = (s: string, n: number): string => day(new Date(asDate(s).getTime() + n * 86_400_000))!;
const isRealDate = (s: string): boolean => {
  const d = asDate(s);
  return !Number.isNaN(d.getTime()) && day(d) === s;
};
const daysBetween = (a: string, b: string): number => Math.round((asDate(b).getTime() - asDate(a).getTime()) / 86_400_000);
const dayMonth = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", day: "numeric", month: "short" });

/** "14–16 Nov", "30 Nov – 2 Dec", "14 Nov". */
export function leaveSpan(start: Date, end: Date): string {
  if (day(start) === day(end)) return dayMonth.format(start);
  const a = dayMonth.formatToParts(start);
  const b = dayMonth.formatToParts(end);
  const part = (p: Intl.DateTimeFormatPart[], t: string) => p.find((x) => x.type === t)?.value ?? "";
  if (part(a, "month") === part(b, "month")) return `${part(a, "day")}–${part(b, "day")} ${part(b, "month")}`;
  return `${dayMonth.format(start)} – ${dayMonth.format(end)}`;
}

function isReadOnly(actor: UserActor): boolean {
  return actor.roles.length > 0 && actor.roles.every((r) => READ_ONLY_ROLES.includes(r));
}

function violates(e: unknown, constraint: string): boolean {
  return e instanceof Error && e.message.includes(constraint);
}

/**
 * Leave applications. An employee applies; their head of department approves,
 * then HR, and the days come off the year's balance (pending days are held so
 * a balance can never be spent twice). Every step is history (append-only),
 * HR's changes are audited, and whoever has to act next is notified.
 */
@Injectable()
export class LeaveService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationService,
    private readonly audit: AuditService,
  ) {}

  // ── Access ──

  private staffWhere(actor: UserActor): Prisma.LeaveRequestWhereInput | null {
    if (actor.capabilities.has(Capability.LEAVE_MANAGE)) return {};
    if (!actor.capabilities.has(Capability.LEAVE_VIEW)) return null;
    const scope = moduleScope(actor, ORG_WIDE);
    return scope ? { branchId: { in: scope } } : {};
  }

  private relation(actor: UserActor, l: { branchId: string; applicantUserId: string; approverUserId: string; relieverEmployeeId: string | null }): Relation {
    let isStaff = false;
    if (actor.capabilities.has(Capability.LEAVE_VIEW) || actor.capabilities.has(Capability.LEAVE_MANAGE)) {
      const scope = actor.capabilities.has(Capability.LEAVE_MANAGE) ? null : moduleScope(actor, ORG_WIDE);
      isStaff = scope === null || scope.includes(l.branchId);
    }
    return {
      isApplicant: l.applicantUserId === actor.userId,
      isApprover: l.approverUserId === actor.userId,
      isHr: actor.capabilities.has(Capability.LEAVE_MANAGE),
      isReliever: !!actor.employeeId && l.relieverEmployeeId === actor.employeeId,
      isStaff,
    };
  }

  private async load(actor: UserActor, id: string): Promise<{ leave: LeaveFull; rel: Relation; prior: Set<string> }> {
    const leave = await this.prisma.leaveRequest.findUnique({ where: { id }, include: INCLUDE });
    if (!leave) throw notFound(LEAVE_NOT_FOUND, "LEAVE_NOT_FOUND");
    const rel = this.relation(actor, leave);
    if (!rel.isApplicant && !rel.isApprover && !rel.isHr && !rel.isReliever && !rel.isStaff) throw notFound(LEAVE_NOT_FOUND, "LEAVE_NOT_FOUND");
    return { leave, rel, prior: this.hodApprovers(leave.updates) };
  }

  /** Who approved as head of department; HR approval must come from someone else. */
  private hodApprovers(updates: { type: string; fromStatus: string | null; toStatus: string | null; actorUserId: string | null }[]): Set<string> {
    return new Set(
      updates
        .filter((u) => u.type === LeaveUpdateType.STATUS_CHANGED && u.fromStatus === LeaveStatus.PENDING_HOD && !ENDINGS.includes(u.toStatus ?? "") && u.actorUserId)
        .map((u) => u.actorUserId!),
    );
  }

  private stageRight(actor: UserActor, l: LeaveCore, prior: Set<string>): StageRight {
    const stage = leaveAwaiting(l.status);
    if (!stage || isReadOnly(actor)) return "NONE";
    if (l.applicantUserId === actor.userId) return "OWN";
    const entitled = stage === LeaveAwaiting.HOD ? l.approverUserId === actor.userId : actor.capabilities.has(Capability.LEAVE_MANAGE);
    if (!entitled) return "NONE";
    if (stage === LeaveAwaiting.HR && prior.has(actor.userId)) return "SEPARATION";
    return "OK";
  }

  private stagesFor(actor: UserActor, l: LeaveCore): LeaveAwaiting[] {
    const out: LeaveAwaiting[] = [];
    if (l.approverUserId === actor.userId) out.push(LeaveAwaiting.HOD);
    if (actor.capabilities.has(Capability.LEAVE_MANAGE)) out.push(LeaveAwaiting.HR);
    return out;
  }

  // ── Settings: the weekly holiday and public holidays ──

  async settings(): Promise<{ weekendDays: number[]; holidays: PublicHoliday[]; updatedAt: Date | null; updatedBy: string | null }> {
    const rows = await this.prisma.appSetting.findMany({ where: { key: { in: [LEAVE_SETTING_WEEKEND, LEAVE_SETTING_HOLIDAYS] } } });
    const weekendRow = rows.find((r) => r.key === LEAVE_SETTING_WEEKEND);
    const holidayRow = rows.find((r) => r.key === LEAVE_SETTING_HOLIDAYS);
    const weekendDays = Array.isArray(weekendRow?.value) ? (weekendRow!.value as unknown[]).map(Number).filter((n) => Number.isInteger(n) && n >= 0 && n <= 6) : [...DEFAULT_WEEKEND_DAYS];
    const holidays = Array.isArray(holidayRow?.value)
      ? (holidayRow!.value as unknown[])
          .map((h) => h as { date?: unknown; name?: unknown })
          .filter((h) => typeof h.date === "string" && typeof h.name === "string")
          .map((h) => ({ date: h.date as string, name: h.name as string }))
          .sort((a, b) => a.date.localeCompare(b.date))
      : [];
    const latest = [weekendRow, holidayRow].filter(Boolean).sort((a, b) => b!.updatedAt.getTime() - a!.updatedAt.getTime())[0];
    return { weekendDays, holidays, updatedAt: latest?.updatedAt ?? null, updatedBy: latest?.updatedBy ?? null };
  }

  async updateSettings(actor: UserActor, dto: LeaveSettingsDto) {
    if (!actor.capabilities.has(Capability.LEAVE_MANAGE)) throw forbidden("Only HR can change the leave calendar.", "MISSING_CAPABILITY");
    const weekendDays = [...new Set(dto.weekendDays)].sort();
    const seen = new Set<string>();
    const holidays: PublicHoliday[] = [];
    for (const h of dto.holidays) {
      if (!isRealDate(h.date)) throw badRequest(`${h.date} is not a real date.`, "DATE_INVALID");
      if (seen.has(h.date)) continue;
      seen.add(h.date);
      holidays.push({ date: h.date, name: h.name.trim() });
    }
    holidays.sort((a, b) => a.date.localeCompare(b.date));
    const before = await this.settings();
    await this.prisma.$transaction(async (tx) => {
      for (const [key, value] of [
        [LEAVE_SETTING_WEEKEND, weekendDays],
        [LEAVE_SETTING_HOLIDAYS, holidays],
      ] as const) {
        await tx.appSetting.upsert({
          where: { key },
          create: { key, value: value as unknown as Prisma.InputJsonValue, updatedBy: actor.displayName },
          update: { value: value as unknown as Prisma.InputJsonValue, updatedBy: actor.displayName },
        });
      }
      await this.audit.record(
        {
          actor,
          action: "leave.settings_changed",
          objectType: "app_setting",
          objectId: LEAVE_SETTING_HOLIDAYS,
          summary: `Leave calendar: weekly holiday ${weekendDays.join(",")} · ${holidays.length} public holidays`,
          before: { weekendDays: before.weekendDays, holidays: before.holidays.length },
          after: { weekendDays, holidays: holidays.length },
        },
        tx,
      );
    });
    return this.settings();
  }

  // ── Balances ──

  async balancesFor(userId: string, year: number, db: Tx | PrismaService = this.prisma): Promise<LeaveBalance[]> {
    const [entitlements, held] = await Promise.all([
      db.leaveEntitlement.findMany({ where: { userId, year } }),
      db.leaveRequest.groupBy({ by: ["type", "status"], where: { applicantUserId: userId, year, status: { in: [...HELD_LEAVE_STATUSES] } }, _sum: { days: true } }),
    ]);
    return LEAVE_TYPE_ORDER.map((type) => {
      const rule = LEAVE_TYPE_RULES[type];
      const own = entitlements.find((e) => e.type === type);
      const entitled = rule.annualDays === null ? null : (own?.days ?? rule.annualDays);
      const sum = (statuses: readonly string[]) => held.filter((h) => h.type === type && statuses.includes(h.status)).reduce((n, h) => n + (h._sum.days ?? 0), 0);
      const used = sum([LeaveStatus.APPROVED]);
      const pending = sum(OPEN_LEAVE_STATUSES);
      return {
        type,
        entitled,
        used,
        pending,
        available: entitled === null ? null : Math.max(0, entitled - used - pending),
        adjusted: !!own,
        note: own?.note ?? null,
      };
    });
  }

  async myBalances(actor: UserActor, yearRaw?: string) {
    const year = yearRaw ? Number(yearRaw) : Number(dhakaDay(new Date()).slice(0, 4));
    return { year, balances: await this.balancesFor(actor.userId, year) };
  }

  /** HR and office staff look up one person's balances. */
  async balancesOf(actor: UserActor, userId: string, yearRaw?: string) {
    const staff = this.staffWhere(actor);
    if (!staff) throw forbidden("Your role does not include leave.");
    const user = await this.prisma.user.findUnique({ where: { id: userId }, include: { employee: { select: { branchId: true, employeeCode: true, designation: true, department: { select: { name: true } } } } } });
    if (!user?.employee) throw notFound("Employee not found.", "EMPLOYEE_NOT_FOUND");
    if (!actor.capabilities.has(Capability.LEAVE_MANAGE)) {
      const scope = moduleScope(actor, ORG_WIDE);
      if (scope && !scope.includes(user.employee.branchId)) throw notFound("Employee not found.", "EMPLOYEE_NOT_FOUND");
    }
    const year = yearRaw ? Number(yearRaw) : Number(dhakaDay(new Date()).slice(0, 4));
    return {
      year,
      person: { userId: user.id, name: user.displayName, employeeCode: user.employee.employeeCode, designation: user.employee.designation, department: user.employee.department?.name ?? null },
      balances: await this.balancesFor(user.id, year),
    };
  }

  async setEntitlement(actor: UserActor, dto: EntitlementDto) {
    if (!actor.capabilities.has(Capability.LEAVE_MANAGE)) throw forbidden("Only HR can change leave entitlements.", "MISSING_CAPABILITY");
    if (dto.days * 2 !== Math.floor(dto.days * 2)) throw badRequest("Entitlements are in whole or half days.", "DAYS_INVALID");
    const user = await this.prisma.user.findUnique({ where: { id: dto.userId }, select: { id: true, displayName: true, employeeId: true } });
    if (!user?.employeeId) throw notFound("Employee not found.", "EMPLOYEE_NOT_FOUND");
    const before = (await this.balancesFor(user.id, dto.year)).find((b) => b.type === dto.type)!;
    await this.prisma.$transaction(async (tx) => {
      await tx.leaveEntitlement.upsert({
        where: { userId_year_type: { userId: user.id, year: dto.year, type: dto.type } },
        create: { userId: user.id, year: dto.year, type: dto.type, days: dto.days, note: dto.note, updatedBy: actor.displayName },
        update: { days: dto.days, note: dto.note, updatedBy: actor.displayName },
      });
      await this.audit.record(
        {
          actor,
          action: "leave.entitlement_changed",
          objectType: "user",
          objectId: user.id,
          summary: `${user.displayName}: ${LEAVE_TYPE_LABEL[dto.type as LeaveType]} ${dto.year} ${before.entitled ?? "—"} → ${dto.days} days (${dto.note})`,
          before: { entitled: before.entitled },
          after: { entitled: dto.days, note: dto.note },
        },
        tx,
      );
    });
    return this.balancesOf(actor, user.id, String(dto.year));
  }

  // ── Applying ──

  async apply(actor: UserActor, dto: ApplyLeaveDto) {
    if (!actor.employeeId || !actor.branchId) throw badRequest("Only employees with a staff record can apply for leave.", "EMPLOYEE_REQUIRED");
    const type = dto.type as LeaveType;
    const rule = LEAVE_TYPE_RULES[type];
    const label = LEAVE_TYPE_LABEL[type];

    if (!isRealDate(dto.startDate) || !isRealDate(dto.endDate)) throw badRequest("Enter real calendar dates for the leave.", "DATE_INVALID");
    if (dto.endDate < dto.startDate) throw badRequest("The last day of leave must be on or after the first.", "END_BEFORE_START");
    const today = dhakaDay(new Date());
    const earliest = rule.backdateDays > 0 ? addDays(today, -rule.backdateDays) : addDays(today, rule.noticeDays);
    if (dto.startDate < earliest) {
      throw badRequest(
        rule.backdateDays > 0
          ? `${label} can start at most ${rule.backdateDays} days back. For anything older, speak to HR.`
          : rule.noticeDays > 0
            ? `Apply for ${label.toLowerCase()} at least ${rule.noticeDays} days before it starts — the earliest start now is ${earliest}.`
            : "Leave cannot start in the past.",
        rule.backdateDays > 0 ? "START_TOO_EARLY" : "NOTICE_TOO_SHORT",
      );
    }
    if (dto.startDate > addDays(today, LEAVE_LIMITS.maxLeadDays)) throw badRequest(`Leave can be applied for at most ${LEAVE_LIMITS.maxLeadDays} days ahead.`, "START_TOO_FAR");
    if (dto.halfDay && !rule.halfDayAllowed) throw badRequest(`${label} is taken in whole days.`, "HALF_DAY_NOT_ALLOWED");
    if (dto.halfDay && dto.startDate !== dto.endDate) throw badRequest("A half day is a one-day application: make the first and last day the same.", "HALF_DAY_RANGE");

    const calendar = await this.settings();
    const days = countLeaveDays(dto.startDate, dto.endDate, { type, halfDay: dto.halfDay, weekendDays: calendar.weekendDays, holidays: calendar.holidays.map((h) => h.date) });
    if (days <= 0) throw badRequest("Those dates are all weekly or public holidays — there is nothing to take leave for.", "NO_WORKING_DAYS");
    if (rule.maxPerRequest !== null && days > rule.maxPerRequest) {
      throw badRequest(`${label} is at most ${formatLeaveDays(rule.maxPerRequest)} in one application; this one is ${formatLeaveDays(days)}.`, "TOO_MANY_DAYS");
    }

    let relieverId: string | null = null;
    if (dto.relieverEmployeeId) {
      if (dto.relieverEmployeeId === actor.employeeId) throw badRequest("Choose a colleague to cover your work, not yourself.", "RELIEVER_SELF");
      const reliever = await this.prisma.employee.findUnique({ where: { id: dto.relieverEmployeeId }, select: { id: true, status: true } });
      if (!reliever || reliever.status !== "ACTIVE") throw badRequest("Choose an active colleague to cover your work.", "RELIEVER_INVALID");
      relieverId = reliever.id;
    }
    const approver = await this.resolveApprover(actor, dto.approverEmployeeId);
    // Days come from the year the leave starts in, even when it runs into the next (maternity leave often does).
    const year = Number(dto.startDate.slice(0, 4));
    const now = new Date();

    let leave;
    try {
      leave = await this.prisma.$transaction(async (tx) => {
        // One application at a time per person, so a balance is never spent twice.
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`leave:${actor.userId}`}))`;
        const clash = await tx.leaveRequest.findFirst({
          where: { applicantUserId: actor.userId, status: { in: [...HELD_LEAVE_STATUSES] }, startDate: { lte: asDate(dto.endDate) }, endDate: { gte: asDate(dto.startDate) } },
          select: { referenceNumber: true, startDate: true, endDate: true, status: true },
        });
        if (clash) {
          throw conflict("LEAVE_OVERLAP", `You already have leave on those days: ${clash.referenceNumber}, ${leaveSpan(clash.startDate, clash.endDate)} (${LEAVE_STATUS_LABEL[clash.status as LeaveStatus].toLowerCase()}).`);
        }
        if (rule.annualDays !== null) {
          const balance = (await this.balancesFor(actor.userId, year, tx)).find((b) => b.type === type)!;
          if (days > (balance.available ?? 0)) {
            throw badRequest(
              `You have ${formatLeaveDays(balance.available ?? 0)} of ${label.toLowerCase()} left for ${year}${balance.pending ? ` (${formatLeaveDays(balance.pending)} waiting for approval)` : ""}; this application needs ${formatLeaveDays(days)}.`,
              "INSUFFICIENT_BALANCE",
              { available: balance.available, requested: days },
            );
          }
        }
        const referenceNumber = formatLeaveNumber(year, await nextSequence(tx, "LV", String(year)));
        const created = await tx.leaveRequest.create({
          data: {
            referenceNumber,
            type,
            startDate: asDate(dto.startDate),
            endDate: asDate(dto.endDate),
            halfDay: dto.halfDay ?? null,
            days,
            year,
            reason: dto.reason.trim(),
            addressDuringLeave: dto.addressDuringLeave ?? null,
            contactPhone: dto.contactPhone ?? null,
            applicantUserId: actor.userId,
            branchId: actor.branchId!,
            departmentId: actor.departmentId,
            approverUserId: approver.userId,
            relieverEmployeeId: relieverId,
            status: LeaveStatus.PENDING_HOD,
            statusChangedAt: now,
          },
        });
        await tx.leaveUpdate.create({
          data: { leaveId: created.id, type: LeaveUpdateType.SUBMITTED, toStatus: LeaveStatus.PENDING_HOD, actorUserId: actor.userId, actorName: actor.displayName, metadata: { approver: approver.name, days }, createdAt: now },
        });
        return created;
      });
    } catch (e) {
      if (violates(e, "leave_no_overlap")) throw conflict("LEAVE_OVERLAP", "You already have leave on those days.");
      throw e;
    }

    await this.deliver(
      leave,
      `leave:${leave.id}:submitted`,
      "LEAVE_SUBMITTED",
      [approver.userId],
      NotificationCategory.ACTION_REQUIRED,
      "Leave application needs your approval",
      `${actor.displayName} · ${label}, ${leaveSpan(leave.startDate, leave.endDate)} (${formatLeaveDays(days)}) — ${leave.reason}. ${leave.referenceNumber}`,
    );
    return this.get(actor, leave.id);
  }

  /** The head of department: the named employee, else the applicant's line manager. They must be able to sign in. */
  private async resolveApprover(actor: UserActor, approverEmployeeId?: string): Promise<{ userId: string; name: string }> {
    let employeeId = approverEmployeeId;
    if (!employeeId) {
      const me = await this.prisma.employee.findUnique({ where: { id: actor.employeeId! }, select: { managerId: true } });
      employeeId = me?.managerId ?? undefined;
    }
    if (!employeeId) throw badRequest("Choose who approves this leave — usually your head of department.", "APPROVER_REQUIRED");
    if (employeeId === actor.employeeId) throw badRequest("You cannot approve your own leave. Choose your head of department.", "APPROVER_SELF");
    const emp = await this.prisma.employee.findUnique({ where: { id: employeeId }, include: { user: { include: { roles: true } } } });
    if (!emp || emp.status !== "ACTIVE") throw badRequest("Choose an active employee as the approver.", "APPROVER_INVALID");
    const user = emp.user;
    if (!user || !user.active) throw badRequest(`${emp.fullName} cannot sign in to ABG ONE yet, so they cannot approve. Choose another approver or ask IT to create their account.`, "APPROVER_HAS_NO_ACCOUNT");
    if (user.id === actor.userId) throw badRequest("You cannot approve your own leave. Choose your head of department.", "APPROVER_SELF");
    if (user.roles.length && user.roles.every((r) => READ_ONLY_ROLES.includes(r.role as RoleCode))) {
      throw badRequest(`${emp.fullName} has read-only access and cannot approve leave. Choose another approver.`, "APPROVER_CANNOT_APPROVE");
    }
    return { userId: user.id, name: emp.fullName };
  }

  // ── Reading ──

  async get(actor: UserActor, id: string) {
    const { leave, rel, prior } = await this.load(actor, id);
    const showBalance = rel.isApplicant || rel.isApprover || rel.isHr || rel.isStaff;
    const balance = showBalance ? (await this.balancesFor(leave.applicantUserId, leave.year)).find((b) => b.type === leave.type) ?? null : null;
    return this.serialize(actor, leave, rel, prior, balance);
  }

  async mine(actor: UserActor, q: MyLeaveQuery) {
    const where: Prisma.LeaveRequestWhereInput[] = [{ applicantUserId: actor.userId }];
    if (q.state === "open") where.push({ status: { in: [...OPEN_LEAVE_STATUSES] } });
    if (q.state === "closed") where.push({ status: { notIn: [...OPEN_LEAVE_STATUSES] } });
    if (q.year) where.push({ year: Number(q.year) });
    return this.page(where, q.cursor, q.limit, (r) => this.serializeRow(r));
  }

  /** Waiting for the caller: as named head of department, or as HR. */
  async approvals(actor: UserActor, q: LeaveApprovalsQuery) {
    if (isReadOnly(actor)) return { items: [], nextCursor: null };
    const stages: Prisma.LeaveRequestWhereInput[] = [{ status: LeaveStatus.PENDING_HOD, approverUserId: actor.userId }];
    if (actor.capabilities.has(Capability.LEAVE_MANAGE)) {
      stages.push({
        status: LeaveStatus.PENDING_HR,
        updates: { none: { actorUserId: actor.userId, type: LeaveUpdateType.STATUS_CHANGED, fromStatus: LeaveStatus.PENDING_HOD, toStatus: { notIn: ENDINGS } } },
      });
    }
    const where: Prisma.LeaveRequestWhereInput[] = [{ OR: stages }, { applicantUserId: { not: actor.userId } }];
    return this.page(where, q.cursor, q.limit, (r) => this.serializeApproval(r), 50);
  }

  async list(actor: UserActor, q: AdminLeaveQuery) {
    const staff = this.staffWhere(actor);
    if (!staff) throw forbidden("Your role does not include leave.");
    const where: Prisma.LeaveRequestWhereInput[] = [staff];
    if (q.status === "OPEN") where.push({ status: { in: [...OPEN_LEAVE_STATUSES] } });
    else if (q.status && q.status !== "ALL") where.push({ status: { in: q.status.split(",") } });
    if (q.type) where.push({ type: q.type });
    if (q.branchId) where.push({ branchId: q.branchId });
    if (q.dateFrom) where.push({ endDate: { gte: asDate(q.dateFrom) } });
    if (q.dateTo) where.push({ startDate: { lte: asDate(q.dateTo) } });
    const text = q.q?.trim();
    if (text) {
      where.push({
        OR: [
          { referenceNumber: { contains: text, mode: "insensitive" } },
          { reason: { contains: text, mode: "insensitive" } },
          { applicant: { OR: [{ displayName: { contains: text, mode: "insensitive" } }, { employee: { employeeCode: { contains: text, mode: "insensitive" } } }] } },
        ],
      });
    }
    return this.page(where, q.cursor, q.limit, (r) => this.serializeRow(r));
  }

  private async page<T>(where: Prisma.LeaveRequestWhereInput[], cursorRaw: string | undefined, limitRaw: string | undefined, map: (r: LeaveRow) => T, fallback = 25) {
    const limit = clampLimit(limitRaw, fallback, 100);
    const cursor = decodeCursor(cursorRaw);
    if (cursor) where.push({ OR: [{ createdAt: { lt: cursor.createdAt } }, { createdAt: cursor.createdAt, id: { lt: cursor.id } }] });
    const rows = await this.prisma.leaveRequest.findMany({ where: { AND: where }, include: ROW_INCLUDE, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: limit + 1 });
    const items = rows.slice(0, limit);
    return {
      items: items.map(map),
      nextCursor: rows.length > limit ? encodeCursor(items[items.length - 1].createdAt, items[items.length - 1].id) : null,
    };
  }

  /** Counts for the portal's KPI cards and the Executive Dashboard. */
  async summary(actor: UserActor, branchId?: string) {
    const staff = this.staffWhere(actor);
    if (!staff) throw forbidden("Your role does not include leave.");
    const base: Prisma.LeaveRequestWhereInput = { AND: [staff, branchId ? { branchId } : {}] };
    const within = (extra: Prisma.LeaveRequestWhereInput): Prisma.LeaveRequestWhereInput => ({ AND: [base, extra] });
    const today = dhakaDay(new Date());
    const year = Number(today.slice(0, 4));
    const inSevenDays = addDays(today, 7);

    const [grouped, onLeave, upcoming, byType] = await Promise.all([
      this.prisma.leaveRequest.groupBy({ by: ["status"], where: base, _count: { _all: true } }),
      this.prisma.leaveRequest.findMany({
        where: within({ status: LeaveStatus.APPROVED, startDate: { lte: asDate(today) }, endDate: { gte: asDate(today) } }),
        include: { applicant: { select: { displayName: true, employee: { select: { designation: true } } } } },
        orderBy: { endDate: "asc" },
      }),
      this.prisma.leaveRequest.count({ where: within({ status: LeaveStatus.APPROVED, startDate: { gt: asDate(today), lte: asDate(inSevenDays) } }) }),
      this.prisma.leaveRequest.groupBy({ by: ["type"], where: within({ status: LeaveStatus.APPROVED, year }), _sum: { days: true } }),
    ]);
    const counts = Object.fromEntries(Object.values(LeaveStatus).map((s) => [s, grouped.find((g) => g.status === s)?._count._all ?? 0])) as Record<LeaveStatus, number>;
    return {
      onLeaveToday: onLeave.length,
      onLeave: onLeave.slice(0, 8).map((l) => ({ id: l.id, name: l.applicant.displayName, designation: l.applicant.employee?.designation ?? null, type: l.type, until: day(l.endDate) })),
      pendingApprovals: counts.PENDING_HOD + counts.PENDING_HR,
      pendingByStage: { PENDING_HOD: counts.PENDING_HOD, PENDING_HR: counts.PENDING_HR },
      startingThisWeek: upcoming,
      approvedDaysByType: Object.fromEntries(LEAVE_TYPE_ORDER.map((t) => [t, byType.find((b) => b.type === t)?._sum.days ?? 0])),
      year,
      counts,
    };
  }

  /** Who is away between two dates: the caller's direct reports (managers), or everyone in scope (leave staff). */
  async calendar(actor: UserActor, q: LeaveCalendarQuery, mode: "team" | "staff") {
    if (!isRealDate(q.from) || !isRealDate(q.to) || q.to < q.from) throw badRequest("Choose a real date range.", "DATE_INVALID");
    if (daysBetween(q.from, q.to) + 1 > MAX_CALENDAR_DAYS) throw badRequest(`Show at most ${MAX_CALENDAR_DAYS} days at a time.`, "RANGE_TOO_LONG");
    const where: Prisma.LeaveRequestWhereInput[] = [{ status: { in: [...HELD_LEAVE_STATUSES] } }, { startDate: { lte: asDate(q.to) } }, { endDate: { gte: asDate(q.from) } }];
    if (mode === "team") {
      if (!actor.employeeId) return this.calendarShape(q, [], await this.settings());
      where.push({ applicant: { employee: { managerId: actor.employeeId } } });
    } else {
      const staff = this.staffWhere(actor);
      if (!staff) throw forbidden("Your role does not include leave.");
      where.push(staff);
      if (q.branchId) where.push({ branchId: q.branchId });
      if (q.departmentId) where.push({ departmentId: q.departmentId });
    }
    const rows = await this.prisma.leaveRequest.findMany({
      where: { AND: where },
      include: { applicant: { select: { id: true, displayName: true, employee: { select: { designation: true, department: { select: { name: true } } } } } }, branch: { select: { code: true } } },
      orderBy: [{ startDate: "asc" }],
    });
    return this.calendarShape(q, rows, await this.settings());
  }

  private calendarShape(
    q: LeaveCalendarQuery,
    rows: { id: string; referenceNumber: string; type: string; status: string; startDate: Date; endDate: Date; halfDay: string | null; days: number; applicant: { id: string; displayName: string; employee: { designation: string | null; department: { name: string } | null } | null }; branch: { code: string } }[],
    settings: { weekendDays: number[]; holidays: PublicHoliday[] },
  ) {
    const people = new Map<string, { userId: string; name: string; designation: string | null; department: string | null; office: string; leaves: unknown[] }>();
    for (const r of rows) {
      const p = people.get(r.applicant.id) ?? {
        userId: r.applicant.id,
        name: r.applicant.displayName,
        designation: r.applicant.employee?.designation ?? null,
        department: r.applicant.employee?.department?.name ?? null,
        office: r.branch.code,
        leaves: [],
      };
      p.leaves.push({ id: r.id, referenceNumber: r.referenceNumber, type: r.type, status: r.status, startDate: day(r.startDate), endDate: day(r.endDate), halfDay: r.halfDay, days: r.days });
      people.set(r.applicant.id, p);
    }
    return {
      from: q.from,
      to: q.to,
      weekendDays: settings.weekendDays,
      holidays: settings.holidays.filter((h) => h.date >= q.from && h.date <= q.to),
      people: [...people.values()].sort((a, b) => a.name.localeCompare(b.name)),
    };
  }

  // ── Decisions ──

  async decide(actor: UserActor, id: string, dto: LeaveDecisionDto) {
    await this.load(actor, id);
    const approve = dto.decision === LeaveDecision.APPROVE;
    const note = dto.note?.trim() || null;
    if (!approve && (!note || note.length < LEAVE_LIMITS.reasonMin)) throw badRequest("Tell the applicant why the leave is not approved.", "REASON_REQUIRED");
    const now = new Date();

    const outcome = await this.prisma.$transaction(async (tx) => {
      const [row] = await tx.$queryRaw<{ status: string; applicantUserId: string; approverUserId: string; referenceNumber: string }[]>`
        SELECT "status", "applicantUserId", "approverUserId", "referenceNumber" FROM "leave_requests" WHERE "id" = ${id} FOR UPDATE`;
      const stage = leaveAwaiting(row.status);
      if (!stage) throw conflict(STATE_CONFLICT, `This application is already ${LEAVE_STATUS_LABEL[row.status as LeaveStatus].toLowerCase()}; there is nothing left to decide.`);
      const prior = this.hodApprovers(await tx.leaveUpdate.findMany({ where: { leaveId: id, type: LeaveUpdateType.STATUS_CHANGED }, select: { type: true, fromStatus: true, toStatus: true, actorUserId: true } }));
      const right = this.stageRight(actor, row, prior);
      if (right === "OWN") throw forbidden("You cannot approve or reject your own leave.", "OWN_REQUEST");
      if (right === "SEPARATION") throw forbidden("You approved this leave as head of department, so another HR member must give the HR approval.", "SEPARATION_OF_DUTIES");
      if (right === "NONE") {
        const late = this.stagesFor(actor, row).some((s) => STAGE_ORDER[s] < STAGE_ORDER[stage]);
        if (late) throw conflict(STATE_CONFLICT, `This application has moved on to ${LEAVE_STATUS_LABEL[row.status as LeaveStatus]}; it is no longer waiting for you.`);
        throw forbidden(`This application is waiting for ${stage === LeaveAwaiting.HOD ? "the named head of department" : LEAVE_AWAITING_LABEL[stage]}.`, "NOT_YOUR_STAGE");
      }
      const to: LeaveStatus = !approve ? LeaveStatus.REJECTED : stage === LeaveAwaiting.HOD ? LeaveStatus.PENDING_HR : LeaveStatus.APPROVED;
      if (!canLeaveTransition(row.status, to)) throw conflict(STATE_CONFLICT, `This application cannot move from ${LEAVE_STATUS_LABEL[row.status as LeaveStatus]} to ${LEAVE_STATUS_LABEL[to]}.`);
      await tx.leaveRequest.update({
        where: { id },
        data: {
          status: to,
          statusNote: note,
          statusChangedAt: now,
          hodApprovedAt: approve && stage === LeaveAwaiting.HOD ? now : undefined,
          approvedAt: to === LeaveStatus.APPROVED ? now : undefined,
          rejectedAt: approve ? undefined : now,
        },
      });
      await tx.leaveUpdate.create({
        data: { leaveId: id, type: LeaveUpdateType.STATUS_CHANGED, fromStatus: row.status, toStatus: to, note, actorUserId: actor.userId, actorName: actor.displayName, metadata: { decision: dto.decision, stage }, createdAt: now },
      });
      if (stage === LeaveAwaiting.HR) {
        await this.audit.record(
          {
            actor,
            action: approve ? "leave.approved" : "leave.rejected",
            objectType: "leave",
            objectId: id,
            summary: `${row.referenceNumber}: HR ${approve ? "approved" : "rejected"}`,
            before: { status: row.status },
            after: { status: to, note },
          },
          tx,
        );
      }
      return { to, stage, prior };
    });

    await this.notifyDecision(id, outcome, actor, note, now);
    return this.get(actor, id);
  }

  private async notifyDecision(id: string, o: { to: LeaveStatus; stage: LeaveAwaiting; prior: Set<string> }, actor: UserActor, note: string | null, now: Date) {
    const l = await this.prisma.leaveRequest.findUniqueOrThrow({ where: { id }, include: { ...ROW_INCLUDE, reliever: { select: { fullName: true, user: { select: { id: true } } } } } });
    const key = `leave:${id}:${o.to}:${now.getTime()}`;
    const what = `${LEAVE_TYPE_LABEL[l.type as LeaveType]}, ${leaveSpan(l.startDate, l.endDate)} (${formatLeaveDays(l.days)})`;
    const C = NotificationCategory;
    switch (o.to) {
      case LeaveStatus.REJECTED:
        await this.deliver(l, `${key}:applicant`, "LEAVE_UPDATED", [l.applicantUserId], C.PARCEL_UPDATE, "Leave not approved", `${what} — ${actor.displayName}: ${note}. ${l.referenceNumber}`);
        return;
      case LeaveStatus.PENDING_HR: {
        await this.deliver(l, `${key}:applicant`, "LEAVE_UPDATED", [l.applicantUserId], C.PARCEL_UPDATE, "Approved by your head of department", `${what} — next: HR approval. ${l.referenceNumber}`);
        const hr = (await this.notifications.usersWithRoles([RoleCode.HR_FINANCE])).filter((u) => u !== l.applicantUserId && u !== actor.userId && !o.prior.has(u));
        await this.deliver(l, `${key}:hr`, "LEAVE_APPROVAL_REQUIRED", hr, C.ACTION_REQUIRED, "Leave needs HR approval", `${l.applicant.displayName} · ${what}. ${l.referenceNumber}`);
        return;
      }
      case LeaveStatus.APPROVED:
        await this.deliver(l, `${key}:applicant`, "LEAVE_UPDATED", [l.applicantUserId], C.PARCEL_UPDATE, "Leave approved", `${what} is approved. ${l.referenceNumber}`);
        await this.deliver(l, `${key}:hod`, "LEAVE_APPROVED", [l.approverUserId].filter((u) => u !== actor.userId), C.PARCEL_UPDATE, "Leave approved by HR", `${l.applicant.displayName} · ${what}. ${l.referenceNumber}`);
        if (l.reliever?.user?.id && l.reliever.user.id !== l.applicantUserId) {
          await this.deliver(l, `${key}:reliever`, "LEAVE_RELIEVER", [l.reliever.user.id], C.PARCEL_UPDATE, "You are covering for a colleague", `${l.applicant.displayName} is on ${what.charAt(0).toLowerCase()}${what.slice(1)}; you are named to cover their work. ${l.referenceNumber}`);
        }
        return;
      default:
        return;
    }
  }

  // ── The applicant's (and HR's) steps ──

  async cancel(actor: UserActor, id: string, noteRaw?: string) {
    const { leave, rel } = await this.load(actor, id);
    const note = noteRaw?.trim() || null;
    if (!note || note.length < LEAVE_LIMITS.reasonMin) throw badRequest("Say why the leave is cancelled, so your approvers know.", "REASON_REQUIRED");
    const byHr = !rel.isApplicant;
    if (byHr) {
      if (!rel.isHr || isReadOnly(actor)) throw forbidden("Only the applicant or HR can cancel this leave.", "NOT_APPLICANT");
      if (leave.status !== LeaveStatus.APPROVED) throw conflict(STATE_CONFLICT, "HR cancels approved leave only. A pending application is rejected instead.");
    } else if (leave.status === LeaveStatus.APPROVED && dhakaDay(new Date()) >= day(leave.startDate)!) {
      throw conflict("LEAVE_STARTED", "This leave has already started, so it can no longer be cancelled from the app. Ask HR to change it.");
    }
    const now = new Date();
    const from = await this.prisma.$transaction(async (tx: Tx) => {
      const [row] = await tx.$queryRaw<{ status: string; referenceNumber: string }[]>`SELECT "status", "referenceNumber" FROM "leave_requests" WHERE "id" = ${id} FOR UPDATE`;
      if (!canLeaveTransition(row.status, LeaveStatus.CANCELLED)) {
        throw conflict(STATE_CONFLICT, `This application is ${LEAVE_STATUS_LABEL[row.status as LeaveStatus].toLowerCase()}; it cannot be cancelled.`);
      }
      await tx.leaveRequest.update({ where: { id }, data: { status: LeaveStatus.CANCELLED, statusNote: note, statusChangedAt: now, cancelledAt: now } });
      await tx.leaveUpdate.create({ data: { leaveId: id, type: LeaveUpdateType.STATUS_CHANGED, fromStatus: row.status, toStatus: LeaveStatus.CANCELLED, note, actorUserId: actor.userId, actorName: actor.displayName, createdAt: now } });
      if (byHr) {
        await this.audit.record({ actor, action: "leave.cancelled", objectType: "leave", objectId: id, summary: `${row.referenceNumber}: approved leave cancelled by HR`, before: { status: row.status }, after: { status: LeaveStatus.CANCELLED, note } }, tx);
      }
      return row.status;
    });
    const recipients = byHr ? [leave.applicantUserId, leave.approverUserId] : await this.handlersAt(leave, from);
    await this.deliver(
      leave,
      `leave:${id}:cancelled:${now.getTime()}`,
      "LEAVE_CANCELLED",
      recipients.filter((u) => u !== actor.userId),
      NotificationCategory.PARCEL_UPDATE,
      byHr ? "Leave cancelled by HR" : "Leave cancelled",
      `${leave.applicant.displayName} · ${LEAVE_TYPE_LABEL[leave.type as LeaveType]}, ${leaveSpan(leave.startDate, leave.endDate)} — ${note}. ${leave.referenceNumber}`,
    );
    return this.get(actor, id);
  }

  async addNote(actor: UserActor, id: string, noteRaw: string) {
    const { leave, rel } = await this.load(actor, id);
    if (isReadOnly(actor)) throw forbidden("Auditors have read-only access.", "READ_ONLY");
    if (rel.isReliever && !rel.isApplicant && !rel.isApprover && !rel.isHr && !rel.isStaff) throw forbidden("You can read this application but not add notes to it.", "READ_ONLY");
    const note = noteRaw.trim();
    const now = new Date();
    await this.prisma.leaveUpdate.create({ data: { leaveId: id, type: LeaveUpdateType.NOTE_ADDED, note, actorUserId: actor.userId, actorName: actor.displayName, createdAt: now } });
    const recipients = rel.isApplicant ? await this.handlersAt(leave, leave.status) : [leave.applicantUserId];
    await this.deliver(
      leave,
      `leave:${id}:note:${now.getTime()}`,
      "LEAVE_NOTE",
      recipients.filter((u) => u !== actor.userId),
      NotificationCategory.PARCEL_UPDATE,
      rel.isApplicant ? `Note from ${actor.displayName}` : "Note on your leave application",
      `${leave.referenceNumber} · ${actor.displayName}: ${note}`,
    );
    return this.get(actor, id);
  }

  /** Who is (or was last) responsible for an application in this status. */
  private async handlersAt(l: { approverUserId: string; applicantUserId: string }, status: string): Promise<string[]> {
    if (status === LeaveStatus.PENDING_HOD) return [l.approverUserId];
    const hr = await this.notifications.usersWithRoles([RoleCode.HR_FINANCE]);
    if (status === LeaveStatus.PENDING_HR) return hr.filter((u) => u !== l.applicantUserId);
    return [l.approverUserId, ...hr].filter((u) => u !== l.applicantUserId);
  }

  private async deliver(l: { id: string; referenceNumber: string; status: string }, dedupeBase: string, eventType: string, userIds: string[], category: string, title: string, body: string) {
    const drafts: Draft[] = [...new Set(userIds)].map((userId) => ({ userId, category, title, body }));
    if (!drafts.length) return;
    const fresh = await this.prisma.leaveRequest.findUnique({ where: { id: l.id }, select: { status: true } });
    await this.notifications.deliverModule({ module: MODULE, id: l.id, reference: l.referenceNumber, route: `/leave/${l.id}`, status: fresh?.status ?? l.status }, dedupeBase, eventType, drafts);
  }

  // ── Shapes ──

  private actionsFor(actor: UserActor, l: LeaveFull, rel: Relation, prior: Set<string>): string[] {
    if (isReadOnly(actor)) return [];
    const out: string[] = [];
    if (this.stageRight(actor, l, prior) === "OK") out.push(LeaveAction.APPROVE, LeaveAction.REJECT);
    const started = dhakaDay(new Date()) >= day(l.startDate)!;
    if (rel.isApplicant && canLeaveTransition(l.status, LeaveStatus.CANCELLED) && !(l.status === LeaveStatus.APPROVED && started)) out.push(LeaveAction.CANCEL);
    else if (!rel.isApplicant && rel.isHr && l.status === LeaveStatus.APPROVED) out.push(LeaveAction.CANCEL);
    if (rel.isApplicant || rel.isApprover || rel.isHr || rel.isStaff) out.push(LeaveAction.ADD_NOTE);
    return out;
  }

  /** Submitted → HOD → HR → Approved, with who and when. */
  private pipeline(l: LeaveFull) {
    const changes = l.updates.filter((u) => u.type === LeaveUpdateType.STATUS_CHANGED);
    const approvalOf = (s: string) => changes.find((u) => u.fromStatus === s && !ENDINGS.includes(u.toStatus ?? ""));
    const ended = l.status === LeaveStatus.REJECTED || l.status === LeaveStatus.CANCELLED;
    const ending = ended ? [...changes].reverse().find((u) => u.toStatus === l.status) : undefined;
    const stages = [...LEAVE_PIPELINE];
    let current: number;
    if (ended) {
      const from = (ending?.fromStatus ?? LeaveStatus.PENDING_HOD) as LeaveStatus;
      current = from === LeaveStatus.APPROVED ? stages.length : stages.indexOf(from);
    } else {
      current = stages.indexOf(l.status as LeaveStatus);
    }
    const entries: { key: string; label: string; state: string; at: Date | null; by: string | null; note: string | null; waitingFor: string | null }[] = [
      { key: "SUBMITTED", label: "Applied", state: "done", at: l.createdAt, by: l.applicant.displayName, note: null, waitingFor: null },
    ];
    stages.forEach((s, i) => {
      const entry = { key: s, label: LEAVE_STAGE_LABEL[s], state: "upcoming", at: null as Date | null, by: null as string | null, note: null as string | null, waitingFor: null as string | null };
      const waiting = leaveAwaiting(s);
      if (ended && i === current) {
        entry.state = l.status === LeaveStatus.REJECTED ? "rejected" : "cancelled";
        entry.at = ending?.createdAt ?? l.statusChangedAt;
        entry.by = ending?.actorName ?? null;
        entry.note = ending?.note ?? null;
      } else if (ended && i > current) {
        entry.state = "skipped";
      } else if (i < current || (i === current && s === LeaveStatus.APPROVED)) {
        entry.state = "done";
        const u = waiting ? approvalOf(s) : [...changes].reverse().find((c) => c.toStatus === s);
        entry.at = u?.createdAt ?? null;
        entry.by = u?.actorName ?? null;
        entry.note = u?.note ?? null;
      } else if (i === current) {
        entry.state = "current";
        entry.at = [...changes].reverse().find((c) => c.toStatus === s)?.createdAt ?? l.createdAt;
        entry.waitingFor = waiting === LeaveAwaiting.HOD ? l.approver.displayName : waiting ? LEAVE_AWAITING_LABEL[waiting] : null;
      } else if (waiting === LeaveAwaiting.HOD) {
        entry.waitingFor = l.approver.displayName;
      }
      entries.push(entry);
    });
    if (ended && current === stages.length) {
      // Approved, then cancelled.
      entries.push({ key: LeaveStatus.CANCELLED, label: LEAVE_STAGE_LABEL.CANCELLED, state: "cancelled", at: ending?.createdAt ?? l.statusChangedAt, by: ending?.actorName ?? null, note: ending?.note ?? null, waitingFor: null });
    }
    return entries;
  }

  private onLeaveNow(l: { status: string; startDate: Date; endDate: Date }): boolean {
    const today = dhakaDay(new Date());
    return l.status === LeaveStatus.APPROVED && day(l.startDate)! <= today && day(l.endDate)! >= today;
  }

  private serialize(actor: UserActor, l: LeaveFull, rel: Relation, prior: Set<string>, balance: LeaveBalance | null) {
    const right = this.stageRight(actor, l, prior);
    const person = (u: LeaveFull["applicant"]) => ({
      name: u.displayName,
      employeeCode: u.employee?.employeeCode ?? null,
      designation: u.employee?.designation ?? null,
      department: u.employee?.department?.name ?? null,
    });
    const privateDetails = rel.isApplicant || rel.isApprover || rel.isHr || rel.isStaff;
    return {
      id: l.id,
      referenceNumber: l.referenceNumber,
      type: l.type,
      startDate: day(l.startDate),
      endDate: day(l.endDate),
      halfDay: l.halfDay,
      days: l.days,
      year: l.year,
      reason: privateDetails ? l.reason : null,
      addressDuringLeave: privateDetails ? l.addressDuringLeave : null,
      contactPhone: privateDetails ? (l.contactPhone ?? l.applicant.employee?.phone ?? null) : null,
      status: l.status,
      awaiting: leaveAwaiting(l.status),
      onLeaveNow: this.onLeaveNow(l),
      statusNote: l.statusNote,
      statusChangedAt: l.statusChangedAt,
      hodApprovedAt: l.hodApprovedAt,
      approvedAt: l.approvedAt,
      rejectedAt: l.rejectedAt,
      cancelledAt: l.cancelledAt,
      createdAt: l.createdAt,
      branch: l.branch,
      applicant: person(l.applicant),
      approver: { name: l.approver.displayName, designation: l.approver.employee?.designation ?? null },
      reliever: l.reliever ? { name: l.reliever.fullName, designation: l.reliever.designation } : null,
      balance,
      pipeline: this.pipeline(l),
      updates: privateDetails ? l.updates.map((u) => ({ id: u.id, type: u.type, fromStatus: u.fromStatus, toStatus: u.toStatus, note: u.note, actor: u.actorName, createdAt: u.createdAt })) : [],
      viewer: {
        isApplicant: rel.isApplicant,
        isApprover: rel.isApprover,
        isHr: rel.isHr,
        isReliever: rel.isReliever,
        canDecide: right === "OK",
        blockedReason: right === "SEPARATION" ? "SEPARATION_OF_DUTIES" : null,
        actions: this.actionsFor(actor, l, rel, prior),
      },
    };
  }

  private serializeRow(r: LeaveRow) {
    return {
      id: r.id,
      referenceNumber: r.referenceNumber,
      type: r.type,
      startDate: day(r.startDate),
      endDate: day(r.endDate),
      halfDay: r.halfDay,
      days: r.days,
      year: r.year,
      reason: r.reason,
      status: r.status,
      awaiting: leaveAwaiting(r.status),
      onLeaveNow: this.onLeaveNow(r),
      statusNote: r.statusNote,
      statusChangedAt: r.statusChangedAt,
      createdAt: r.createdAt,
      applicant: {
        name: r.applicant.displayName,
        employeeCode: r.applicant.employee?.employeeCode ?? null,
        designation: r.applicant.employee?.designation ?? null,
        department: r.applicant.employee?.department?.name ?? null,
      },
      approver: { name: r.approver.displayName },
      reliever: r.reliever ? { name: r.reliever.fullName } : null,
      branch: r.branch,
    };
  }

  /** The approvals-inbox row; the combined mobile inbox reads it. */
  private serializeApproval(r: LeaveRow) {
    return {
      id: r.id,
      referenceNumber: r.referenceNumber,
      type: r.type,
      startDate: day(r.startDate),
      endDate: day(r.endDate),
      halfDay: r.halfDay,
      days: r.days,
      reason: r.reason,
      status: r.status,
      awaiting: leaveAwaiting(r.status)!,
      applicant: { name: r.applicant.displayName, designation: r.applicant.employee?.designation ?? null, department: r.applicant.employee?.department?.name ?? null },
      createdAt: r.createdAt,
    };
  }
}
