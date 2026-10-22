import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import {
  BLOCKING_PASS_WARNINGS,
  Capability,
  CLOSED_VISIT_STATUSES,
  GatePassKind,
  NotificationCategory,
  PassWarning,
  VISITOR_LIMITS,
  VISIT_PURPOSE_LABEL,
  VISIT_PURPOSE_ORDER,
  VISIT_STATUS_LABEL,
  VisitAction,
  VisitPurpose,
  VisitStatus,
  canVisitTransition,
  dhakaDateStamp,
  formatVisitorPassNumber,
  gatePassPayload,
  maskPhone,
  normalizeVisitorPassNumber,
} from "@abg-dispatch/shared";
import { APP_CONFIG, type AppConfig } from "../common/config";
import { PrismaService, type Tx } from "../common/prisma.service";
import type { UserActor } from "../common/actor";
import { badRequest, conflict, forbidden, notFound } from "../common/errors";
import { randomToken } from "../common/crypto";
import { clampLimit, decodeCursor, encodeCursor } from "../common/pagination";
import { nextSequence } from "../common/sequence";
import { dhakaDay, dhakaDayRange } from "../common/time";
import { AuditService } from "../audit/audit.service";
import { NotificationService } from "../notifications/notification.service";
import { SmsService } from "../notifications/sms.service";
import { moduleScope, utc } from "../admin/admin-scope";
import type { AdminVisitsQuery, CancelVisitDto, InviteVisitorDto, MyVisitsQuery, WalkInDto } from "./visitors.dto";

export const VISIT_NOT_FOUND = "Visit not found, or you do not have access to it.";
export const PASS_NOT_FOUND = "This gate pass is not valid. Check the pass number with the visitor or their host.";
const TOKEN_SHAPE = /^[A-Za-z0-9_-]{16,128}$/;
const MINUTE = 60_000;

const INCLUDE = {
  branch: { select: { id: true, name: true, code: true, address: true, city: true } },
  location: { select: { id: true, name: true, path: true } },
  host: {
    select: {
      id: true,
      displayName: true,
      employee: { select: { employeeCode: true, designation: true, phone: true, department: { select: { name: true } } } },
    },
  },
} satisfies Prisma.VisitInclude;

const ROW_INCLUDE = {
  branch: { select: { id: true, name: true, code: true } },
  location: { select: { path: true } },
} satisfies Prisma.VisitInclude;

type VisitFull = Prisma.VisitGetPayload<{ include: typeof INCLUDE }>;
type VisitRow = Prisma.VisitGetPayload<{ include: typeof ROW_INCLUDE }>;

/** How the viewer is related to a visit: its host, office staff who may see it, and whether they may act at the gate. */
interface Relation {
  isHost: boolean;
  isStaff: boolean;
  canManage: boolean;
}

type SortKey = "expectedAt" | "checkedInAt" | "checkedOutAt";
const LIST_ORDER: Record<string, { key: SortKey; dir: "asc" | "desc" }> = {
  // Next to arrive first; longest on site first; most recent departures first.
  [VisitStatus.EXPECTED]: { key: "expectedAt", dir: "asc" },
  [VisitStatus.CHECKED_IN]: { key: "checkedInAt", dir: "asc" },
  [VisitStatus.CHECKED_OUT]: { key: "checkedOutAt", dir: "desc" },
};
const DEFAULT_ORDER = { key: "expectedAt" as SortKey, dir: "desc" as const };

const dayFmt = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Dhaka", day: "numeric", month: "short" });
const timeFmt = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Dhaka", hour: "numeric", minute: "2-digit", hour12: true });
/** "21 Oct, 2:30 PM" in Asia/Dhaka. */
const dayAndTime = (d: Date) => `${dayFmt.format(d)}, ${timeFmt.format(d)}`;
const timeOnly = (d: Date) => timeFmt.format(d);

function minutesLabel(mins: number): string {
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  return mins % 60 ? `${h} h ${mins % 60} min` : `${h} h`;
}

/**
 * Factory and office visitors. A host pre-registers a visitor and the visitor
 * gets a one-day gate pass (number by SMS, QR in the app); the gate checks
 * them in and out, or registers a walk-in on the spot, and the host is told
 * at each step. Passes not used by the end of their Dhaka day expire.
 *
 * Access: the host sees their own visits; security, front-desk dispatch
 * officers and admins with visitor.view see their offices' visits
 * (`moduleScope`, null = every office) and, with visitor.manage, check people
 * in and out. Anything else is a 404, so visit ids cannot be probed.
 */
@Injectable()
export class VisitorsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger("VisitorsService");
  private timer: NodeJS.Timeout | null = null;
  private sweeping = false;

  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationService,
    private readonly sms: SmsService,
    private readonly audit: AuditService,
  ) {}

  // ── End-of-day expiry ──

  /** A light sweep on the SLA engine's clock (SLA_INTERVAL_SECONDS; 0 disables it, as tests do). Reads also expire lazily. */
  onModuleInit() {
    if (this.config.slaIntervalSeconds > 0) {
      this.timer = setInterval(() => void this.sweep(), this.config.slaIntervalSeconds * 1000);
      this.timer.unref?.();
    }
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  private async sweep() {
    if (this.sweeping) return;
    this.sweeping = true;
    try {
      const n = await this.expireStale();
      if (n) this.logger.log(`Expired ${n} unused visitor pass${n === 1 ? "" : "es"}`);
    } catch (err) {
      this.logger.error(`Visitor pass sweep failed: ${(err as Error).message}`);
    } finally {
      this.sweeping = false;
    }
  }

  /**
   * Passes still EXPECTED after the end of their Dhaka day become EXPIRED,
   * stamped with the moment they lapsed (the next Dhaka midnight). Cheap:
   * one indexed UPDATE, so every read can call it.
   */
  async expireStale(now = new Date()): Promise<number> {
    const todayStart = dhakaDayRange(dhakaDay(now)).gte;
    return this.prisma.$executeRaw`
      UPDATE "visits"
         SET "status" = ${VisitStatus.EXPIRED},
             "expiredAt" = date_trunc('day', "expectedAt" + interval '6 hours') + interval '18 hours',
             "updatedAt" = now() AT TIME ZONE 'UTC'
       WHERE "status" = ${VisitStatus.EXPECTED}
         AND "expectedAt" < ${utc(todayStart)}`;
  }

  // ── Access ──

  /** Offices whose visits this person sees as staff; undefined = none (not staff), null = every office. */
  private staffScope(actor: UserActor): string[] | null | undefined {
    if (!actor.capabilities.has(Capability.VISITOR_VIEW)) return undefined;
    return moduleScope(actor);
  }

  private staffWhere(actor: UserActor): Prisma.VisitWhereInput | null {
    const scope = this.staffScope(actor);
    if (scope === undefined) return null;
    return scope === null ? {} : { branchId: { in: scope } };
  }

  private relation(actor: UserActor, v: { hostUserId: string | null; branchId: string }): Relation {
    const isHost = !!v.hostUserId && v.hostUserId === actor.userId;
    const scope = this.staffScope(actor);
    const isStaff = scope !== undefined && (scope === null || scope.includes(v.branchId));
    return { isHost, isStaff, canManage: isStaff && actor.capabilities.has(Capability.VISITOR_MANAGE) };
  }

  private async load(actor: UserActor, id: string): Promise<{ visit: VisitFull; rel: Relation }> {
    await this.expireStale();
    const visit = await this.prisma.visit.findUnique({ where: { id }, include: INCLUDE });
    if (!visit) throw notFound(VISIT_NOT_FOUND, "VISIT_NOT_FOUND");
    const rel = this.relation(actor, visit);
    if (!rel.isHost && !rel.isStaff) throw notFound(VISIT_NOT_FOUND, "VISIT_NOT_FOUND");
    return { visit, rel };
  }

  // ── Registering ──

  /** A host pre-registers a visitor; the visitor is texted their pass number. */
  async invite(actor: UserActor, dto: InviteVisitorDto) {
    const branchId = dto.branchId ?? actor.branchId;
    if (!branchId) throw badRequest("Choose the office the visitor is coming to.", "BRANCH_REQUIRED");
    const branch = await this.activeBranch(branchId);
    await this.checkLocation(dto.locationId, branchId);
    const now = new Date();
    this.checkWindow(dto.expectedAt, dto.expectedUntil, now);

    const visit = await this.prisma.$transaction(async (tx) => {
      const passNumber = await this.nextPassNumber(tx, branch.code, dto.expectedAt);
      return tx.visit.create({
        data: {
          ...this.visitorFields(dto),
          passNumber,
          passToken: randomToken(24),
          branchId,
          locationId: dto.locationId ?? null,
          hostUserId: actor.userId,
          hostName: actor.displayName,
          expectedAt: dto.expectedAt,
          expectedUntil: dto.expectedUntil ?? null,
          status: VisitStatus.EXPECTED,
          createdById: actor.userId,
        },
      });
    });

    await this.text(
      visit.visitorPhone,
      `ABG: Your visit to ${branch.name}${branch.address ? `, ${branch.address}` : ""} is confirmed for ${dayAndTime(visit.expectedAt)}. Gate pass ${visit.passNumber}. Host: ${visit.hostName}. Please show this number at the gate.`,
    );
    return this.get(actor, visit.id);
  }

  /** Someone arrived without a pass: the gate registers them and checks them in at once. */
  async walkIn(actor: UserActor, dto: WalkInDto) {
    const scope = moduleScope(actor);
    const branchId = dto.branchId ?? actor.branchId ?? (scope && scope.length === 1 ? scope[0] : null);
    if (!branchId) throw badRequest("Choose the office where the visitor is.", "BRANCH_REQUIRED");
    if (scope && !scope.includes(branchId)) throw forbidden("You can register walk-ins only at the offices you cover.", "OUT_OF_SCOPE");
    const branch = await this.activeBranch(branchId);
    await this.checkLocation(dto.locationId, branchId);
    const now = new Date();
    if (dto.expectedUntil) this.checkWindow(now, dto.expectedUntil, now);

    let hostUserId: string | null = null;
    let hostName: string;
    if (dto.hostEmployeeId) {
      const host = await this.prisma.employee.findUnique({ where: { id: dto.hostEmployeeId }, select: { fullName: true, status: true, user: { select: { id: true, active: true } } } });
      if (!host || host.status !== "ACTIVE") throw badRequest("Choose an active employee as the host.", "HOST_INVALID");
      hostUserId = host.user?.active ? host.user.id : null;
      hostName = host.fullName;
    } else if (dto.hostName) {
      hostName = dto.hostName;
    } else {
      throw badRequest("Say who the visitor has come to see.", "HOST_REQUIRED");
    }

    const point = await this.gatePoint(actor, branchId, branch.name);
    const visit = await this.prisma.$transaction(async (tx) => {
      const passNumber = await this.nextPassNumber(tx, branch.code, now);
      const created = await tx.visit.create({
        data: {
          ...this.visitorFields(dto),
          passNumber,
          passToken: randomToken(24),
          branchId,
          locationId: dto.locationId ?? null,
          hostUserId,
          hostName,
          expectedAt: now,
          expectedUntil: dto.expectedUntil ?? null,
          status: VisitStatus.CHECKED_IN,
          walkIn: true,
          badgeNumber: dto.badgeNumber ?? null,
          checkedInAt: now,
          checkedInById: actor.userId,
          checkedInByName: actor.displayName,
          checkInPoint: point,
          createdById: actor.userId,
        },
      });
      await this.audit.record(
        { actor, action: "visit.walk_in", objectType: "visit", objectId: created.id, summary: `${passNumber}: walk-in ${created.visitorName} checked in at ${point} to see ${hostName}`, after: { status: created.status, branchId, purpose: created.purpose, badgeNumber: created.badgeNumber } },
        tx,
      );
      return created;
    });

    await this.notifyHost(
      visit,
      actor,
      "at-gate",
      "VISITOR_AT_GATE",
      NotificationCategory.ACTION_REQUIRED,
      `Your visitor ${visit.visitorName} is at the gate`,
      `${this.who(visit)} has arrived at ${point} and was checked in by ${actor.displayName}. ${VISIT_PURPOSE_LABEL[visit.purpose as VisitPurpose] ?? visit.purpose} · ${visit.passNumber}`,
    );
    await this.text(visit.visitorPhone, `ABG: Welcome to ${branch.name}. Your gate pass is ${visit.passNumber} (host: ${hostName}). Please check out at the gate when you leave.`);
    return this.get(actor, visit.id);
  }

  private visitorFields(dto: InviteVisitorDto | WalkInDto) {
    return {
      visitorName: dto.visitorName,
      visitorPhone: dto.visitorPhone,
      company: dto.company ?? null,
      idLast4: dto.idLast4 ? dto.idLast4.toUpperCase() : null,
      purpose: dto.purpose,
      purposeDetail: dto.purposeDetail ?? null,
      partySize: dto.partySize ?? 1,
      vehicleNumber: dto.vehicleNumber ?? null,
      carrying: dto.carrying ?? null,
      notes: dto.notes ?? null,
    };
  }

  private async activeBranch(branchId: string) {
    const branch = await this.prisma.branch.findUnique({ where: { id: branchId }, select: { id: true, name: true, code: true, address: true, active: true } });
    if (!branch || !branch.active) throw badRequest("Choose an active office.", "BRANCH_INVALID");
    return branch;
  }

  private async checkLocation(locationId: string | undefined, branchId: string) {
    if (!locationId) return;
    const loc = await this.prisma.location.findUnique({ where: { id: locationId }, select: { branchId: true, active: true } });
    if (!loc || !loc.active || loc.branchId !== branchId) throw badRequest("That area is not in the chosen office.", "LOCATION_INVALID");
  }

  /** A pass covers one Dhaka day: from a time not in the past, ending (if given) later the same day. */
  private checkWindow(expectedAt: Date, expectedUntil: Date | undefined, now: Date) {
    if (expectedAt.getTime() < now.getTime() - VISITOR_LIMITS.pastGraceMinutes * MINUTE) {
      throw badRequest("That time has already passed. Choose a time from now on.", "TIME_IN_PAST");
    }
    if (expectedAt.getTime() > now.getTime() + VISITOR_LIMITS.maxDaysAhead * 86_400_000) {
      throw badRequest(`Visitors can be registered up to ${VISITOR_LIMITS.maxDaysAhead} days ahead.`, "TIME_TOO_FAR");
    }
    if (expectedUntil) {
      if (expectedUntil.getTime() <= expectedAt.getTime()) throw badRequest("The visit must end after it starts.", "WINDOW_INVALID");
      if (dhakaDay(expectedUntil) !== dhakaDay(expectedAt)) throw badRequest("A gate pass is valid for one day: the visit must end on the day it starts.", "WINDOW_INVALID");
    }
  }

  /** VP-<visit day>-<office>-NNN; the counter restarts per office per Dhaka day. */
  private async nextPassNumber(tx: Tx, branchCode: string, visitDay: Date): Promise<string> {
    const day = dhakaDateStamp(visitDay);
    return formatVisitorPassNumber(day, branchCode, await nextSequence(tx, `VP:${branchCode}`, day));
  }

  /** Where a check-in happens: the officer's own gate or desk at that office, else the office's gate or reception. */
  private async gatePoint(actor: UserActor, branchId: string, branchName: string): Promise<string> {
    if (actor.employeeId) {
      const me = await this.prisma.employee.findUnique({ where: { id: actor.employeeId }, select: { defaultLocation: { select: { path: true, type: true, branchId: true } } } });
      const loc = me?.defaultLocation;
      if (loc && loc.branchId === branchId && ["GATE", "RECEPTION", "DESK"].includes(loc.type)) return loc.path;
    }
    const gate = await this.prisma.location.findFirst({ where: { branchId, active: true, type: { in: ["GATE", "RECEPTION"] } }, orderBy: [{ type: "asc" }, { path: "asc" }], select: { path: true } });
    return gate?.path ?? branchName;
  }

  // ── Reading ──

  async get(actor: UserActor, id: string) {
    const { visit, rel } = await this.load(actor, id);
    return this.serialize(visit, rel);
  }

  /** The caller's own visitors, as host. */
  async mine(actor: UserActor, q: MyVisitsQuery) {
    await this.expireStale();
    const past = q.scope === "past";
    const where: Prisma.VisitWhereInput[] = [
      { hostUserId: actor.userId },
      past ? { status: { in: [...CLOSED_VISIT_STATUSES] } } : { status: { in: [VisitStatus.EXPECTED, VisitStatus.CHECKED_IN] } },
    ];
    return this.page(actor, where, { key: "expectedAt", dir: past ? "desc" : "asc" }, q.cursor, q.limit);
  }

  /** The gate's and the office's view: one Dhaka day (today by default), any status. */
  async list(actor: UserActor, q: AdminVisitsQuery) {
    const staff = this.staffWhere(actor);
    if (!staff) throw forbidden("Your role does not include visitor management.");
    await this.expireStale();
    const where: Prisma.VisitWhereInput[] = [staff];
    if (q.branchId) where.push({ branchId: q.branchId });
    const status = q.status && q.status !== "ALL" ? q.status : null;
    if (status) where.push({ status });
    if (q.purpose) where.push({ purpose: q.purpose });

    const today = dhakaDay(new Date());
    const day = q.date ?? today;
    const range = dhakaDayRange(day);
    const onDay: Prisma.VisitWhereInput[] = [{ expectedAt: range }, { checkedInAt: range }, { checkedOutAt: range }];
    // Whoever is on site now belongs to today's board, whenever they arrived.
    if (day === today) onDay.push({ status: VisitStatus.CHECKED_IN });
    where.push({ OR: onDay });

    const text = q.q?.trim();
    if (text) {
      const digits = text.replace(/\D/g, "");
      const or: Prisma.VisitWhereInput[] = [
        { visitorName: { contains: text, mode: "insensitive" } },
        { company: { contains: text, mode: "insensitive" } },
        { passNumber: { contains: text, mode: "insensitive" } },
        { hostName: { contains: text, mode: "insensitive" } },
        { vehicleNumber: { contains: text, mode: "insensitive" } },
        { badgeNumber: { contains: text, mode: "insensitive" } },
      ];
      if (digits.length >= 4) or.push({ visitorPhone: { contains: digits } });
      where.push({ OR: or });
    }
    return this.page(actor, where, (status && LIST_ORDER[status]) || DEFAULT_ORDER, q.cursor, q.limit);
  }

  private async page(actor: UserActor, where: Prisma.VisitWhereInput[], order: { key: SortKey; dir: "asc" | "desc" }, cursorRaw: string | undefined, limitRaw: string | undefined) {
    const limit = clampLimit(limitRaw, 50, 100);
    const cursor = decodeCursor(cursorRaw);
    const cmp = order.dir === "asc" ? "gt" : "lt";
    if (cursor) where.push({ OR: [{ [order.key]: { [cmp]: cursor.createdAt } }, { [order.key]: cursor.createdAt, id: { [cmp]: cursor.id } }] });
    const rows = await this.prisma.visit.findMany({
      where: { AND: where },
      include: ROW_INCLUDE,
      orderBy: [{ [order.key]: order.dir }, { id: order.dir }],
      take: limit + 1,
    });
    const items = rows.slice(0, limit);
    const last = items[items.length - 1];
    const lastKey = last ? (last[order.key] as Date | null) : null;
    return {
      items: items.map((r) => this.serializeRow(r, this.relation(actor, r))),
      nextCursor: rows.length > limit && last && lastKey ? encodeCursor(lastKey, last.id) : null,
    };
  }

  /**
   * Counts for the gate board and the executive dashboard. A "visit" is a
   * visitor who came in (checked in, walk-ins included); expectedToday are
   * those still to arrive today.
   */
  async summary(actor: UserActor, branchId?: string) {
    const staff = this.staffWhere(actor);
    if (!staff) throw forbidden("Your role does not include visitor management.");
    await this.expireStale();
    const now = new Date();
    const base: Prisma.VisitWhereInput = { AND: [staff, branchId ? { branchId } : {}] };
    const today = dhakaDay(now);
    const range = dhakaDayRange(today);
    const weekStart = new Date(range.gte.getTime() - 6 * 86_400_000);

    const [onSite, expectedToday, checkedOutToday, walkInsToday, arrivals] = await Promise.all([
      this.prisma.visit.findMany({
        where: { AND: [base, { status: VisitStatus.CHECKED_IN }] },
        select: { id: true, visitorName: true, checkedInAt: true, partySize: true, expectedUntil: true },
        orderBy: [{ checkedInAt: "asc" }, { id: "asc" }],
      }),
      this.prisma.visit.count({ where: { AND: [base, { status: VisitStatus.EXPECTED, expectedAt: range }] } }),
      this.prisma.visit.count({ where: { AND: [base, { status: VisitStatus.CHECKED_OUT, checkedOutAt: range }] } }),
      this.prisma.visit.count({ where: { AND: [base, { walkIn: true, checkedInAt: range }] } }),
      this.prisma.visit.findMany({ where: { AND: [base, { checkedInAt: { gte: weekStart, lt: range.lt } }] }, select: { checkedInAt: true, purpose: true } }),
    ]);

    const byDay = new Map<string, number>();
    const byPurposeToday = Object.fromEntries(VISIT_PURPOSE_ORDER.map((p) => [p, 0])) as Record<string, number>;
    for (const a of arrivals) {
      const d = dhakaDay(a.checkedInAt!);
      byDay.set(d, (byDay.get(d) ?? 0) + 1);
      if (d === today) byPurposeToday[a.purpose] = (byPurposeToday[a.purpose] ?? 0) + 1;
    }
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const day = dhakaDay(new Date(weekStart.getTime() + i * 86_400_000 + 12 * 3_600_000));
      return { day, visits: byDay.get(day) ?? 0 };
    });
    const longest = onSite[0];
    return {
      onSiteNow: onSite.length,
      peopleOnSite: onSite.reduce((s, v) => s + v.partySize, 0),
      overstaying: onSite.filter((v) => v.expectedUntil && v.expectedUntil < now).length,
      expectedToday,
      checkedOutToday,
      walkInsToday,
      visitsToday: byDay.get(today) ?? 0,
      byPurposeToday,
      last7Days,
      longestOnSite: longest ? { id: longest.id, visitorName: longest.visitorName, since: longest.checkedInAt } : null,
      asOf: now,
    };
  }

  // ── At the gate ──

  async checkIn(actor: UserActor, id: string, badgeNumber?: string) {
    const { visit, rel } = await this.load(actor, id);
    if (!rel.canManage) throw forbidden("Only security and the front desk of this office can check visitors in.");
    await this.performCheckIn(actor, visit, badgeNumber);
    return this.get(actor, id);
  }

  async checkOut(actor: UserActor, id: string) {
    const { visit, rel } = await this.load(actor, id);
    if (!rel.canManage) throw forbidden("Only security and the front desk of this office can check visitors out.");
    await this.performCheckOut(actor, visit);
    return this.get(actor, id);
  }

  private async performCheckIn(actor: UserActor, visit: VisitFull, badgeNumber?: string) {
    const now = new Date();
    const today = dhakaDay(now);
    const point = await this.gatePoint(actor, visit.branchId, visit.branch.name);
    await this.prisma.$transaction(async (tx) => {
      // Lock the row so two guards can't both check the same visitor in.
      const [current] = await tx.$queryRaw<{ status: string }[]>`SELECT "status" FROM "visits" WHERE "id" = ${visit.id} FOR UPDATE`;
      if (current.status === VisitStatus.EXPECTED) {
        const day = dhakaDay(visit.expectedAt);
        if (day > today) throw conflict("VISIT_WRONG_DAY", `This pass is for ${dayFmt.format(visit.expectedAt)}, not today. Register the visitor as a walk-in if the host agrees.`);
        if (day < today) throw conflict("VISIT_STATE_CONFLICT", "This pass has expired: it was for an earlier day.");
      }
      if (!canVisitTransition(current.status, VisitStatus.CHECKED_IN)) {
        throw conflict("VISIT_STATE_CONFLICT", current.status === VisitStatus.CHECKED_IN ? "This visitor is already checked in." : `This visit is ${VISIT_STATUS_LABEL[current.status as VisitStatus] ?? current.status}; the visitor cannot be checked in on this pass.`);
      }
      await tx.visit.update({
        where: { id: visit.id },
        data: { status: VisitStatus.CHECKED_IN, checkedInAt: now, checkedInById: actor.userId, checkedInByName: actor.displayName, checkInPoint: point, badgeNumber: badgeNumber ?? visit.badgeNumber },
      });
      await this.audit.record(
        { actor, action: "visit.checked_in", objectType: "visit", objectId: visit.id, summary: `${visit.passNumber}: ${visit.visitorName} checked in at ${point}`, before: { status: current.status }, after: { status: VisitStatus.CHECKED_IN, badgeNumber: badgeNumber ?? visit.badgeNumber } },
        tx,
      );
    });
    await this.notifyHost(
      { ...visit, status: VisitStatus.CHECKED_IN },
      actor,
      "checked-in",
      "VISITOR_ARRIVED",
      NotificationCategory.ACTION_REQUIRED,
      `${visit.visitorName} has arrived`,
      `${this.who(visit)} has arrived at ${point}${badgeNumber ? ` · badge ${badgeNumber}` : ""}. ${visit.passNumber}`,
    );
  }

  private async performCheckOut(actor: UserActor, visit: VisitFull) {
    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      const [current] = await tx.$queryRaw<{ status: string }[]>`SELECT "status" FROM "visits" WHERE "id" = ${visit.id} FOR UPDATE`;
      if (!canVisitTransition(current.status, VisitStatus.CHECKED_OUT)) {
        throw conflict(
          "VISIT_STATE_CONFLICT",
          current.status === VisitStatus.CHECKED_OUT
            ? "This visitor has already checked out."
            : current.status === VisitStatus.EXPECTED
              ? "This visitor has not been checked in yet."
              : `This visit is ${VISIT_STATUS_LABEL[current.status as VisitStatus] ?? current.status}; there is nothing to check out.`,
        );
      }
      await tx.visit.update({ where: { id: visit.id }, data: { status: VisitStatus.CHECKED_OUT, checkedOutAt: now, checkedOutById: actor.userId, checkedOutByName: actor.displayName } });
      await this.audit.record(
        { actor, action: "visit.checked_out", objectType: "visit", objectId: visit.id, summary: `${visit.passNumber}: ${visit.visitorName} checked out`, before: { status: current.status }, after: { status: VisitStatus.CHECKED_OUT } },
        tx,
      );
    });
    const stayed = visit.checkedInAt ? minutesLabel(Math.max(1, Math.round((now.getTime() - visit.checkedInAt.getTime()) / MINUTE))) : null;
    await this.notifyHost(
      { ...visit, status: VisitStatus.CHECKED_OUT },
      actor,
      "checked-out",
      "VISITOR_LEFT",
      NotificationCategory.PARCEL_UPDATE,
      `${visit.visitorName} has left`,
      `Checked out at ${timeOnly(now)}${stayed ? ` after ${stayed} on site` : ""}. ${visit.passNumber}`,
    );
  }

  /** The host, or the office's gate staff, while the visitor has not arrived. */
  async cancel(actor: UserActor, id: string, dto: CancelVisitDto) {
    const { visit, rel } = await this.load(actor, id);
    if (!rel.isHost && !rel.canManage) throw forbidden("Only the host or the office's gate staff can cancel this visit.");
    const reason = dto.reason ?? null;
    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      const [current] = await tx.$queryRaw<{ status: string }[]>`SELECT "status" FROM "visits" WHERE "id" = ${id} FOR UPDATE`;
      if (!canVisitTransition(current.status, VisitStatus.CANCELLED)) {
        throw conflict("VISIT_STATE_CONFLICT", `This visit is ${VISIT_STATUS_LABEL[current.status as VisitStatus] ?? current.status}; it can no longer be cancelled.`);
      }
      await tx.visit.update({ where: { id }, data: { status: VisitStatus.CANCELLED, cancelledAt: now, cancelledById: actor.userId, cancelledByName: actor.displayName, cancelReason: reason } });
      if (!rel.isHost) {
        await this.audit.record({ actor, action: "visit.cancelled", objectType: "visit", objectId: id, summary: `${visit.passNumber}: pass for ${visit.visitorName} cancelled`, before: { status: current.status }, after: { status: VisitStatus.CANCELLED, reason } }, tx);
      }
    });
    await this.notifyHost(
      { ...visit, status: VisitStatus.CANCELLED },
      actor,
      "cancelled",
      "VISIT_CANCELLED",
      NotificationCategory.PARCEL_UPDATE,
      `Visit by ${visit.visitorName} cancelled`,
      `${actor.displayName} cancelled the gate pass for ${dayAndTime(visit.expectedAt)}${reason ? ` — ${reason}` : ""}. ${visit.passNumber}`,
    );
    await this.text(visit.visitorPhone, `ABG: Your visit to ${visit.branch.name} on ${dayAndTime(visit.expectedAt)} (pass ${visit.passNumber}) has been cancelled. Please contact ${visit.hostName} to rearrange.`);
    return this.get(actor, id);
  }

  // ── Gate passes ──

  /** A scanned QR: works at any gate (a pass for another office says so). */
  async passByToken(actor: UserActor, token: string) {
    return this.passView(actor, await this.findByToken(token));
  }

  /** A typed pass number: numbers are readable and sequential, so only the verifier's own offices are searched. */
  async passByNumber(actor: UserActor, raw: string) {
    const passNumber = normalizeVisitorPassNumber(raw);
    if (!passNumber) throw notFound("That is not a visitor pass number. It looks like VP-261021-FCA-012.", "PASS_NOT_FOUND");
    await this.expireStale();
    const visit = await this.prisma.visit.findUnique({ where: { passNumber }, include: INCLUDE });
    const scope = moduleScope(actor);
    if (!visit || (scope && !scope.includes(visit.branchId))) throw notFound(`No pass ${passNumber} at the offices you cover.`, "PASS_NOT_FOUND");
    return this.passView(actor, visit);
  }

  async passCheckIn(actor: UserActor, token: string, badgeNumber?: string) {
    const visit = await this.findByToken(token);
    this.assertGate(actor, visit);
    await this.performCheckIn(actor, visit, badgeNumber);
    return this.passView(actor, await this.findByToken(token));
  }

  async passCheckOut(actor: UserActor, token: string) {
    const visit = await this.findByToken(token);
    this.assertGate(actor, visit);
    await this.performCheckOut(actor, visit);
    return this.passView(actor, await this.findByToken(token));
  }

  private async findByToken(token: string): Promise<VisitFull> {
    if (!TOKEN_SHAPE.test(token)) throw notFound(PASS_NOT_FOUND, "PASS_NOT_FOUND");
    await this.expireStale();
    const visit = await this.prisma.visit.findUnique({ where: { passToken: token }, include: INCLUDE });
    if (!visit) throw notFound(PASS_NOT_FOUND, "PASS_NOT_FOUND");
    return visit;
  }

  /** The guard holds the pass, so it is no secret that it exists; acting on it needs this office. */
  private assertGate(actor: UserActor, visit: VisitFull) {
    const scope = moduleScope(actor);
    if (scope && !scope.includes(visit.branchId)) {
      throw forbidden(`This pass is for ${visit.branch.name}. Only that office's gate can check this visitor in or out.`, "WRONG_OFFICE");
    }
  }

  private passView(actor: UserActor, v: VisitFull) {
    const now = new Date();
    const scope = moduleScope(actor);
    const local = !scope || scope.includes(v.branchId);
    const canManage = local && actor.capabilities.has(Capability.VISITOR_MANAGE);
    const warnings: { code: PassWarning; message: string; blocking: boolean }[] = [];
    const warn = (code: PassWarning, message: string) => warnings.push({ code, message, blocking: BLOCKING_PASS_WARNINGS.includes(code) });

    if (!local) warn(PassWarning.WRONG_OFFICE, `This pass is for ${v.branch.name}. Send the visitor to that office's gate.`);
    switch (v.status) {
      case VisitStatus.CANCELLED:
        warn(PassWarning.CANCELLED, `This pass was cancelled${v.cancelledByName ? ` by ${v.cancelledByName}` : ""}${v.cancelledAt ? ` on ${dayAndTime(v.cancelledAt)}` : ""}${v.cancelReason ? ` — ${v.cancelReason}` : ""}. Do not admit the visitor on it.`);
        break;
      case VisitStatus.EXPIRED:
        warn(PassWarning.EXPIRED, `This pass was for ${dayFmt.format(v.expectedAt)} and was never used. It has expired.`);
        break;
      case VisitStatus.CHECKED_OUT:
        warn(PassWarning.ALREADY_OUT, `This visitor checked out at ${v.checkedOutAt ? dayAndTime(v.checkedOutAt) : "an earlier time"}. A pass cannot be used twice.`);
        break;
      case VisitStatus.EXPECTED: {
        if (dhakaDay(v.expectedAt) > dhakaDay(now)) warn(PassWarning.WRONG_DAY, `This pass is for ${dayAndTime(v.expectedAt)}, not today.`);
        else if (v.expectedAt.getTime() - now.getTime() > VISITOR_LIMITS.earlyMinutes * MINUTE) {
          warn(PassWarning.EARLY, `Expected at ${timeOnly(v.expectedAt)} — ${minutesLabel(Math.round((v.expectedAt.getTime() - now.getTime()) / MINUTE))} early. Check with the host.`);
        }
        break;
      }
      case VisitStatus.CHECKED_IN:
        if (v.expectedUntil && v.expectedUntil < now) warn(PassWarning.OVERSTAY, `Expected to leave by ${timeOnly(v.expectedUntil)}.`);
        break;
    }
    const blocked = warnings.some((w) => w.blocking);
    const allowed: string[] = [];
    if (canManage && !blocked) {
      if (v.status === VisitStatus.EXPECTED) allowed.push(VisitAction.CHECK_IN);
      if (v.status === VisitStatus.CHECKED_IN) allowed.push(VisitAction.CHECK_OUT);
    }
    const rel = this.relation(actor, v);
    return {
      // Only for the pass's own office: enough to open the visit or re-open the pass.
      token: local ? v.passToken : null,
      visitId: rel.isHost || rel.isStaff ? v.id : null,
      passNumber: v.passNumber,
      status: v.status,
      walkIn: v.walkIn,
      valid: !blocked,
      allowed,
      warnings,
      visitor: {
        name: v.visitorName,
        company: v.company,
        phone: canManage ? v.visitorPhone : maskPhone(v.visitorPhone),
        idLast4: local ? v.idLast4 : null,
        partySize: v.partySize,
        vehicleNumber: local ? v.vehicleNumber : null,
        carrying: local ? v.carrying : null,
      },
      purpose: v.purpose,
      purposeDetail: local ? v.purposeDetail : null,
      host: { name: v.hostName, designation: v.host?.employee?.designation ?? null, department: v.host?.employee?.department?.name ?? null },
      branch: { id: v.branch.id, name: v.branch.name, code: v.branch.code },
      location: v.location?.path ?? null,
      expectedAt: v.expectedAt,
      expectedUntil: v.expectedUntil,
      checkedInAt: v.checkedInAt,
      checkedOutAt: v.checkedOutAt,
      checkInPoint: v.checkInPoint,
      badgeNumber: v.badgeNumber,
    };
  }

  // ── Notifications ──

  private who(v: { visitorName: string; company: string | null; partySize: number }): string {
    return `${v.visitorName}${v.company ? ` (${v.company})` : ""}${v.partySize > 1 ? ` with ${v.partySize - 1} other${v.partySize > 2 ? "s" : ""}` : ""}`;
  }

  /** Tells the host — never the person who just acted. A failed notification never undoes the action. */
  private async notifyHost(
    v: { id: string; passNumber: string; status: string; hostUserId: string | null },
    actor: UserActor,
    key: string,
    eventType: string,
    category: string,
    title: string,
    body: string,
  ) {
    if (!v.hostUserId || v.hostUserId === actor.userId) return;
    await this.notifications.deliverModule(
      { module: "visitors", id: v.id, reference: v.passNumber, route: `/visitors/${v.id}`, status: v.status },
      `visit:${v.id}:${key}`,
      eventType,
      [{ userId: v.hostUserId, category, title, body }],
    );
  }

  private async text(phone: string, message: string) {
    try {
      await this.sms.send(phone, message);
    } catch (err) {
      this.logger.warn(`Visitor SMS failed: ${(err as Error).message}`);
    }
  }

  // ── Shapes ──

  private actionsFor(v: { status: string; expectedAt: Date }, rel: Relation): string[] {
    const out: string[] = [];
    if (rel.canManage) {
      if (v.status === VisitStatus.EXPECTED && dhakaDay(v.expectedAt) === dhakaDay(new Date())) out.push(VisitAction.CHECK_IN);
      if (v.status === VisitStatus.CHECKED_IN) out.push(VisitAction.CHECK_OUT);
    }
    if ((rel.isHost || rel.canManage) && v.status === VisitStatus.EXPECTED) out.push(VisitAction.CANCEL);
    return out;
  }

  private onSiteMinutes(v: { checkedInAt: Date | null; checkedOutAt: Date | null }, now: Date): number | null {
    if (!v.checkedInAt) return null;
    return Math.max(0, Math.round(((v.checkedOutAt ?? now).getTime() - v.checkedInAt.getTime()) / MINUTE));
  }

  private serialize(v: VisitFull, rel: Relation) {
    const now = new Date();
    const fullPhone = rel.isHost || rel.canManage;
    const showPass = rel.isHost || rel.canManage;
    return {
      id: v.id,
      passNumber: v.passNumber,
      status: v.status,
      walkIn: v.walkIn,
      visitorName: v.visitorName,
      visitorPhone: fullPhone ? v.visitorPhone : maskPhone(v.visitorPhone),
      company: v.company,
      idLast4: v.idLast4,
      purpose: v.purpose,
      purposeDetail: v.purposeDetail,
      partySize: v.partySize,
      vehicleNumber: v.vehicleNumber,
      carrying: v.carrying,
      notes: v.notes,
      branch: v.branch,
      location: v.location,
      host: {
        userId: v.hostUserId,
        name: v.hostName,
        employeeCode: v.host?.employee?.employeeCode ?? null,
        designation: v.host?.employee?.designation ?? null,
        department: v.host?.employee?.department?.name ?? null,
        phone: rel.isStaff ? (v.host?.employee?.phone ?? null) : null,
      },
      expectedAt: v.expectedAt,
      expectedUntil: v.expectedUntil,
      badgeNumber: v.badgeNumber,
      checkedInAt: v.checkedInAt,
      checkedInBy: v.checkedInByName,
      checkInPoint: v.checkInPoint,
      checkedOutAt: v.checkedOutAt,
      checkedOutBy: v.checkedOutByName,
      cancelledAt: v.cancelledAt,
      cancelledBy: v.cancelledByName,
      cancelReason: v.cancelReason,
      expiredAt: v.expiredAt,
      createdAt: v.createdAt,
      onSiteMinutes: this.onSiteMinutes(v, now),
      overstay: v.status === VisitStatus.CHECKED_IN && !!v.expectedUntil && v.expectedUntil < now,
      pass: showPass ? { token: v.passToken, payload: gatePassPayload(this.config.publicQrBaseUrl, GatePassKind.VISITOR, v.passToken) } : null,
      viewer: { ...rel, actions: this.actionsFor(v, rel) },
    };
  }

  private serializeRow(r: VisitRow, rel: Relation) {
    const now = new Date();
    return {
      id: r.id,
      passNumber: r.passNumber,
      status: r.status,
      walkIn: r.walkIn,
      visitorName: r.visitorName,
      visitorPhone: rel.isHost || rel.canManage ? r.visitorPhone : maskPhone(r.visitorPhone),
      company: r.company,
      purpose: r.purpose,
      purposeDetail: r.purposeDetail,
      partySize: r.partySize,
      vehicleNumber: r.vehicleNumber,
      carrying: r.carrying,
      badgeNumber: r.badgeNumber,
      branch: r.branch,
      location: r.location?.path ?? null,
      hostName: r.hostName,
      isHost: rel.isHost,
      expectedAt: r.expectedAt,
      expectedUntil: r.expectedUntil,
      checkedInAt: r.checkedInAt,
      checkedOutAt: r.checkedOutAt,
      cancelledAt: r.cancelledAt,
      onSiteMinutes: this.onSiteMinutes(r, now),
      overstay: r.status === VisitStatus.CHECKED_IN && !!r.expectedUntil && r.expectedUntil < now,
      actions: this.actionsFor(r, rel),
    };
  }
}
