import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import {
  CLOSED_TOUR_STATUSES,
  Capability,
  DEFAULT_ANNUAL_TRAVEL_BUDGET,
  NotificationCategory,
  OPEN_TOUR_STATUSES,
  PASSPORT_NUMBER_PATTERN,
  READ_ONLY_ROLES,
  RoleCode,
  SANCTIONED_TOUR_STATUSES,
  TOUR_AWAITING_LABEL,
  TOUR_LIMITS,
  TOUR_SETTING_ANNUAL_BUDGET,
  TOUR_STAGE_LABEL,
  TOUR_STATUS_LABEL,
  TourAction,
  TourAwaiting,
  TourDecision,
  TourStatus,
  TourType,
  TourUpdateType,
  TransportMode,
  canTourTransition,
  formatTaka,
  formatTourNumber,
  passportNeedsRenewal,
  tourAwaiting,
  tourDurationDays,
  tourPipeline,
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
import type { AdminToursQuery, CreateTourDto, MyToursQuery, TourApprovalsQuery, TourDecisionDto, TourSettingsDto } from "./tours.dto";

export const TOUR_NOT_FOUND = "Tour request not found, or you do not have access to it.";
const STATE_CONFLICT = "TOUR_STATE_CONFLICT";
const MODULE = "tours";
/** HR & Finance and the MD / Chairman work group-wide on tours. */
const ORG_WIDE: RoleCode[] = [RoleCode.HR_FINANCE, RoleCode.EXECUTIVE];
const STAGE_ORDER: Record<TourAwaiting, number> = { HOD: 0, VETTING: 1, SANCTION: 2 };
/** HR & Finance vetting is an independent check: whoever approved as head of department may not also vet. */
const HOD_APPROVAL_FROM: string[] = [TourStatus.PENDING_HOD];
const ENDINGS: string[] = [TourStatus.REJECTED, TourStatus.CANCELLED];
const LIVE_STATUSES: TourStatus[] = [...OPEN_TOUR_STATUSES, TourStatus.APPROVED, TourStatus.ACTIVE];

const PERSON = {
  select: {
    id: true,
    displayName: true,
    employee: { select: { employeeCode: true, designation: true, phone: true, department: { select: { name: true } } } },
  },
} as const;

const INCLUDE = {
  traveller: PERSON,
  approver: PERSON,
  branch: { select: { id: true, name: true, code: true } },
  updates: { orderBy: [{ createdAt: "asc" as const }, { id: "asc" as const }] },
} satisfies Prisma.TourRequestInclude;

const ROW_INCLUDE = {
  traveller: { select: { displayName: true, employee: { select: { employeeCode: true, designation: true, department: { select: { name: true } } } } } },
  approver: { select: { displayName: true } },
  branch: { select: { id: true, name: true, code: true } },
} satisfies Prisma.TourRequestInclude;

type TourFull = Prisma.TourRequestGetPayload<{ include: typeof INCLUDE }>;
type TourRow = Prisma.TourRequestGetPayload<{ include: typeof ROW_INCLUDE }>;
type TourCore = { id: string; status: string; type: string; travellerUserId: string; approverUserId: string };

interface Relation {
  isTraveller: boolean;
  isApprover: boolean;
  /** HR & Finance on a request that is, or was, at vetting. */
  isVetter: boolean;
  /** MD / Chairman on an overseas request that is, or was, at sanction. */
  isSanctioner: boolean;
  /** tour.view holder whose offices include the request. */
  isStaff: boolean;
}

type StageRight = "OK" | "OWN" | "SEPARATION" | "NONE";

const day = (d: Date | null | undefined): string | null => (d ? d.toISOString().slice(0, 10) : null);
const asDate = (s: string): Date => new Date(`${s}T00:00:00.000Z`);
const addDays = (s: string, n: number): string => day(new Date(asDate(s).getTime() + n * 86_400_000))!;
const isRealDate = (s: string): boolean => {
  const d = asDate(s);
  return !Number.isNaN(d.getTime()) && day(d) === s;
};
const dayMonth = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", day: "numeric", month: "short" });
const fullDay = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" });

/** "14–18 Nov", "28 Nov – 3 Dec", "14 Nov". */
export function travelDates(start: Date, end: Date): string {
  const a = dayMonth.formatToParts(start);
  const b = dayMonth.formatToParts(end);
  const part = (p: Intl.DateTimeFormatPart[], t: string) => p.find((x) => x.type === t)?.value ?? "";
  if (day(start) === day(end)) return dayMonth.format(start);
  if (part(a, "month") === part(b, "month") && start.getUTCFullYear() === end.getUTCFullYear()) return `${part(a, "day")}–${part(b, "day")} ${part(b, "month")}`;
  return `${dayMonth.format(start)} – ${dayMonth.format(end)}`;
}

function isReadOnly(actor: UserActor): boolean {
  return actor.roles.length > 0 && actor.roles.every((r) => READ_ONLY_ROLES.includes(r));
}

/**
 * Official tour requests. An employee applies; their head of department
 * approves, HR & Finance vet the budget, and overseas tours also need the MD's
 * or Chairman's sanction before funds are released. The traveller then starts
 * and completes the tour. Every step is history (append-only), approvals are
 * audited, and whoever has to act next is notified.
 */
@Injectable()
export class ToursService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationService,
    private readonly audit: AuditService,
  ) {}

  // ── Access ──

  /** Requests a tour.view holder may see; null when the caller has no oversight role. */
  private staffWhere(actor: UserActor): Prisma.TourRequestWhereInput | null {
    if (!actor.capabilities.has(Capability.TOUR_VIEW)) return null;
    const scope = moduleScope(actor, ORG_WIDE);
    return scope ? { branchId: { in: scope } } : {};
  }

  private relation(actor: UserActor, t: { status: string; type: string; branchId: string; travellerUserId: string; approverUserId: string; hodApprovedAt: Date | null; vettedAt: Date | null }): Relation {
    const caps = actor.capabilities;
    let isStaff = false;
    if (caps.has(Capability.TOUR_VIEW)) {
      const scope = moduleScope(actor, ORG_WIDE);
      isStaff = scope === null || scope.includes(t.branchId);
    }
    return {
      isTraveller: t.travellerUserId === actor.userId,
      isApprover: t.approverUserId === actor.userId,
      isVetter: caps.has(Capability.TOUR_VET) && (t.status === TourStatus.PENDING_VETTING || !!t.hodApprovedAt),
      isSanctioner: caps.has(Capability.TOUR_SANCTION) && t.type === TourType.FOREIGN && (t.status === TourStatus.PENDING_SANCTION || !!t.vettedAt),
      isStaff,
    };
  }

  private async load(actor: UserActor, id: string): Promise<{ tour: TourFull; rel: Relation; prior: Set<string> }> {
    const tour = await this.prisma.tourRequest.findUnique({ where: { id }, include: INCLUDE });
    if (!tour) throw notFound(TOUR_NOT_FOUND, "TOUR_NOT_FOUND");
    const rel = this.relation(actor, tour);
    if (!rel.isTraveller && !rel.isApprover && !rel.isVetter && !rel.isSanctioner && !rel.isStaff) throw notFound(TOUR_NOT_FOUND, "TOUR_NOT_FOUND");
    return { tour, rel, prior: this.hodApprovers(tour.updates) };
  }

  /** Who approved the request as head of department; they may not vet it as well. */
  private hodApprovers(updates: { type: string; fromStatus: string | null; toStatus: string | null; actorUserId: string | null }[]): Set<string> {
    return new Set(
      updates
        .filter((u) => u.type === TourUpdateType.STATUS_CHANGED && u.fromStatus && HOD_APPROVAL_FROM.includes(u.fromStatus) && !ENDINGS.includes(u.toStatus ?? "") && u.actorUserId)
        .map((u) => u.actorUserId!),
    );
  }

  /** May the caller decide the stage the request is waiting at? */
  private stageRight(actor: UserActor, t: TourCore, prior: Set<string>): StageRight {
    const stage = tourAwaiting(t.status);
    if (!stage || isReadOnly(actor)) return "NONE";
    if (t.travellerUserId === actor.userId) return "OWN";
    const entitled =
      stage === TourAwaiting.HOD
        ? t.approverUserId === actor.userId
        : stage === TourAwaiting.VETTING
          ? actor.capabilities.has(Capability.TOUR_VET)
          : actor.capabilities.has(Capability.TOUR_SANCTION);
    if (!entitled) return "NONE";
    if (stage === TourAwaiting.VETTING && prior.has(actor.userId)) return "SEPARATION";
    return "OK";
  }

  /** The approval stages this caller could ever act on for this request. */
  private stagesFor(actor: UserActor, t: TourCore): TourAwaiting[] {
    const out: TourAwaiting[] = [];
    if (t.approverUserId === actor.userId) out.push(TourAwaiting.HOD);
    if (actor.capabilities.has(Capability.TOUR_VET)) out.push(TourAwaiting.VETTING);
    if (t.type === TourType.FOREIGN && actor.capabilities.has(Capability.TOUR_SANCTION)) out.push(TourAwaiting.SANCTION);
    return out;
  }

  // ── Applying ──

  async create(actor: UserActor, dto: CreateTourDto) {
    if (!actor.employeeId || !actor.branchId) throw badRequest("Only employees with a staff record can apply for official tours.", "EMPLOYEE_REQUIRED");
    const L = TOUR_LIMITS;
    const foreign = dto.type === TourType.FOREIGN;

    // Dates (Asia/Dhaka calendar).
    if (!isRealDate(dto.startDate) || !isRealDate(dto.endDate)) throw badRequest("Enter real calendar dates for the tour.", "DATE_INVALID");
    const today = dhakaDay(new Date());
    if (dto.startDate < today) throw badRequest("The tour cannot start in the past. Choose today or a later date.", "START_IN_PAST");
    if (dto.endDate < dto.startDate) throw badRequest("The return date must be on or after the start date.", "END_BEFORE_START");
    if (dto.startDate > addDays(today, L.maxLeadDays)) throw badRequest(`Tours can be requested at most ${L.maxLeadDays} days ahead.`, "START_TOO_FAR");
    if (tourDurationDays(dto.startDate, dto.endDate) > L.maxDurationDays) throw badRequest(`One request covers at most ${L.maxDurationDays} days. Split a longer assignment into separate requests.`, "TOUR_TOO_LONG");

    // Where and how.
    const country = foreign ? dto.country?.trim() : undefined;
    if (foreign && !country) throw badRequest("Give the destination country for an overseas tour.", "COUNTRY_REQUIRED");
    if (foreign && /^bangladesh$/i.test(country!)) throw badRequest("An overseas tour must be outside Bangladesh. Choose Local for trips within the country.", "COUNTRY_INVALID");
    if (foreign && dto.transportMode === TransportMode.POOL_CAR) throw badRequest("A pool car cannot be used for an overseas tour.", "TRANSPORT_INVALID");

    // Passport (overseas only).
    let passportNumber: string | null = null;
    let passportExpiry: string | null = null;
    if (foreign) {
      if (!dto.passportNumber || !dto.passportExpiry) throw badRequest("Overseas tours need your passport number and its expiry date.", "PASSPORT_REQUIRED");
      if (!PASSPORT_NUMBER_PATTERN.test(dto.passportNumber)) throw badRequest("Enter the passport number as printed, e.g. A01234567.", "PASSPORT_NUMBER_INVALID");
      if (!isRealDate(dto.passportExpiry)) throw badRequest("Enter a real expiry date for the passport.", "DATE_INVALID");
      if (dto.passportExpiry <= dto.endDate) throw badRequest("Your passport expires before you return. Renew it before applying.", "PASSPORT_EXPIRED");
      passportNumber = dto.passportNumber;
      passportExpiry = dto.passportExpiry;
    }

    // Money.
    const advance = dto.advanceRequested ?? 0;
    if (advance > dto.estimatedBudget) throw badRequest("The advance cannot be more than the estimated budget.", "ADVANCE_TOO_HIGH");

    // People.
    const coTravellers: string[] = [];
    for (const raw of dto.coTravellers ?? []) {
      const name = raw.replace(/\s+/g, " ").trim();
      if (name.length >= 2 && !coTravellers.some((c) => c.toLowerCase() === name.toLowerCase())) coTravellers.push(name);
    }
    const approver = await this.resolveApprover(actor, dto.approverEmployeeId);

    const now = new Date();
    const tour = await this.prisma.$transaction(async (tx) => {
      const year = dhakaYear(now);
      const referenceNumber = formatTourNumber(year, await nextSequence(tx, "TR", String(year)));
      const created = await tx.tourRequest.create({
        data: {
          referenceNumber,
          type: dto.type,
          purpose: dto.purpose,
          title: dto.title.trim(),
          description: dto.description?.trim() ?? "",
          destination: dto.destination.trim(),
          country: country ?? null,
          startDate: asDate(dto.startDate),
          endDate: asDate(dto.endDate),
          transportMode: dto.transportMode,
          travellerUserId: actor.userId,
          branchId: actor.branchId!,
          departmentId: actor.departmentId,
          coTravellers,
          estimatedBudget: dto.estimatedBudget,
          advanceRequested: advance,
          passportNumber,
          passportExpiry: passportExpiry ? asDate(passportExpiry) : null,
          approverUserId: approver.userId,
          status: TourStatus.PENDING_HOD,
          statusChangedAt: now,
        },
      });
      await tx.tourUpdate.create({
        data: {
          tourId: created.id,
          type: TourUpdateType.SUBMITTED,
          toStatus: TourStatus.PENDING_HOD,
          actorUserId: actor.userId,
          actorName: actor.displayName,
          metadata: { approver: approver.name, estimatedBudget: dto.estimatedBudget, advanceRequested: advance },
          createdAt: now,
        },
      });
      return created;
    });

    await this.deliver(
      tour,
      `tour:${tour.id}:submitted`,
      "TOUR_SUBMITTED",
      [approver.userId],
      NotificationCategory.ACTION_REQUIRED,
      `${foreign ? "Overseas tour" : "Tour"} request needs your approval`,
      `${actor.displayName} · ${tour.title} — ${this.where(tour)} · ${travelDates(tour.startDate, tour.endDate)} · est. ${formatTaka(tour.estimatedBudget)}. ${tour.referenceNumber}`,
    );
    return this.get(actor, tour.id);
  }

  /** The head of department: the named employee, else the traveller's line manager. They must be able to sign in. */
  private async resolveApprover(actor: UserActor, approverEmployeeId?: string): Promise<{ userId: string; name: string }> {
    let employeeId = approverEmployeeId;
    if (!employeeId) {
      const me = await this.prisma.employee.findUnique({ where: { id: actor.employeeId! }, select: { managerId: true } });
      employeeId = me?.managerId ?? undefined;
    }
    if (!employeeId) throw badRequest("Choose who approves this tour — usually your head of department.", "APPROVER_REQUIRED");
    if (employeeId === actor.employeeId) throw badRequest("You cannot approve your own tour. Choose your head of department.", "APPROVER_SELF");
    const emp = await this.prisma.employee.findUnique({ where: { id: employeeId }, include: { user: { include: { roles: true } } } });
    if (!emp || emp.status !== "ACTIVE") throw badRequest("Choose an active employee as the approver.", "APPROVER_INVALID");
    const user = emp.user;
    if (!user || !user.active) throw badRequest(`${emp.fullName} cannot sign in to ABG ONE yet, so they cannot approve. Choose another approver or ask IT to create their account.`, "APPROVER_HAS_NO_ACCOUNT");
    if (user.id === actor.userId) throw badRequest("You cannot approve your own tour. Choose your head of department.", "APPROVER_SELF");
    if (user.roles.length && user.roles.every((r) => READ_ONLY_ROLES.includes(r.role as RoleCode))) {
      throw badRequest(`${emp.fullName} has read-only access and cannot approve requests. Choose another approver.`, "APPROVER_CANNOT_APPROVE");
    }
    return { userId: user.id, name: emp.fullName };
  }

  // ── Reading ──

  async get(actor: UserActor, id: string) {
    const { tour, rel, prior } = await this.load(actor, id);
    return this.serialize(actor, tour, rel, prior);
  }

  async mine(actor: UserActor, q: MyToursQuery) {
    const where: Prisma.TourRequestWhereInput[] = [{ travellerUserId: actor.userId }];
    if (q.state === "open") where.push({ status: { notIn: [...CLOSED_TOUR_STATUSES] } });
    if (q.state === "closed") where.push({ status: { in: [...CLOSED_TOUR_STATUSES] } });
    return this.page(where, q.cursor, q.limit, (r) => this.serializeRow(r));
  }

  /** What is waiting for the caller's decision: as named HOD, as HR & Finance, as MD / Chairman. */
  async approvals(actor: UserActor, q: TourApprovalsQuery) {
    if (isReadOnly(actor)) return { items: [], nextCursor: null };
    const notHodApprover: Prisma.TourRequestWhereInput = {
      updates: { none: { actorUserId: actor.userId, type: TourUpdateType.STATUS_CHANGED, fromStatus: { in: HOD_APPROVAL_FROM }, toStatus: { notIn: ENDINGS } } },
    };
    const stages: Prisma.TourRequestWhereInput[] = [{ status: TourStatus.PENDING_HOD, approverUserId: actor.userId }];
    if (actor.capabilities.has(Capability.TOUR_VET)) stages.push({ status: TourStatus.PENDING_VETTING, ...notHodApprover });
    if (actor.capabilities.has(Capability.TOUR_SANCTION)) stages.push({ status: TourStatus.PENDING_SANCTION, type: TourType.FOREIGN });
    const where: Prisma.TourRequestWhereInput[] = [{ OR: stages }, { travellerUserId: { not: actor.userId } }];
    return this.page(where, q.cursor, q.limit, (r) => this.serializeApproval(r), 50);
  }

  async list(actor: UserActor, q: AdminToursQuery) {
    const staff = this.staffWhere(actor);
    if (!staff) throw forbidden("Your role does not include tour requests.");
    const where: Prisma.TourRequestWhereInput[] = [staff];
    if (q.status === "OPEN") where.push({ status: { in: [...OPEN_TOUR_STATUSES] } });
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
          { title: { contains: text, mode: "insensitive" } },
          { destination: { contains: text, mode: "insensitive" } },
          { country: { contains: text, mode: "insensitive" } },
          { traveller: { OR: [{ displayName: { contains: text, mode: "insensitive" } }, { employee: { employeeCode: { contains: text, mode: "insensitive" } } }] } },
        ],
      });
    }
    return this.page(where, q.cursor, q.limit, (r) => this.serializeRow(r));
  }

  private async page<T>(where: Prisma.TourRequestWhereInput[], cursorRaw: string | undefined, limitRaw: string | undefined, map: (r: TourRow) => T, fallback = 25) {
    const limit = clampLimit(limitRaw, fallback, 100);
    const cursor = decodeCursor(cursorRaw);
    if (cursor) where.push({ OR: [{ createdAt: { lt: cursor.createdAt } }, { createdAt: cursor.createdAt, id: { lt: cursor.id } }] });
    const rows = await this.prisma.tourRequest.findMany({ where: { AND: where }, include: ROW_INCLUDE, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: limit + 1 });
    const items = rows.slice(0, limit);
    return {
      items: items.map(map),
      nextCursor: rows.length > limit ? encodeCursor(items[items.length - 1].createdAt, items[items.length - 1].id) : null,
    };
  }

  /** Counts for the portal's KPI cards and the Executive Dashboard. */
  async summary(actor: UserActor, branchId?: string) {
    const staff = this.staffWhere(actor);
    if (!staff) throw forbidden("Your role does not include tour requests.");
    const base: Prisma.TourRequestWhereInput = { AND: [staff, branchId ? { branchId } : {}] };
    const within = (extra: Prisma.TourRequestWhereInput): Prisma.TourRequestWhereInput => ({ AND: [base, extra] });

    const grouped = await this.prisma.tourRequest.groupBy({ by: ["status"], where: base, _count: { _all: true } });
    const counts = Object.fromEntries(Object.values(TourStatus).map((s) => [s, grouped.find((g) => g.status === s)?._count._all ?? 0])) as Record<TourStatus, number>;

    const abroad = await this.prisma.tourRequest.findMany({ where: within({ type: TourType.FOREIGN, status: TourStatus.ACTIVE }), select: { country: true } });
    const activeForeignCountries = [...new Set(abroad.map((a) => a.country).filter((c): c is string => !!c))].sort((a, b) => a.localeCompare(b));

    const year = dhakaYear();
    const yearRange = { gte: new Date(`${year}-01-01T00:00:00+06:00`), lt: new Date(`${year + 1}-01-01T00:00:00+06:00`) };
    const sanctioned = await this.prisma.tourRequest.aggregate({
      where: within({ status: { in: [...SANCTIONED_TOUR_STATUSES] }, OR: [{ type: TourType.LOCAL, vettedAt: yearRange }, { type: TourType.FOREIGN, sanctionedAt: yearRange }] }),
      _sum: { sanctionedBudget: true },
    });
    const ytdSanctioned = sanctioned._sum.sanctionedBudget ?? 0;
    const { annualTravelBudget: annualBudget } = await this.settings();

    const passports = await this.prisma.tourRequest.findMany({ where: within({ type: TourType.FOREIGN, status: { in: LIVE_STATUSES } }), select: { passportExpiry: true, endDate: true } });

    const today = dhakaDay(new Date());
    const [y, m] = today.split("-").map(Number);
    const monthEnd = new Date(Date.UTC(y, m, 0));
    const upcomingThisMonth = await this.prisma.tourRequest.count({
      where: within({ status: { in: [...OPEN_TOUR_STATUSES, TourStatus.APPROVED] }, startDate: { gte: asDate(today), lte: monthEnd } }),
    });

    return {
      activeForeign: abroad.length,
      activeForeignCountries,
      pendingApprovals: counts.PENDING_HOD + counts.PENDING_VETTING + counts.PENDING_SANCTION,
      pendingByStage: { PENDING_HOD: counts.PENDING_HOD, PENDING_VETTING: counts.PENDING_VETTING, PENDING_SANCTION: counts.PENDING_SANCTION },
      ytdSanctioned,
      annualBudget,
      utilisationPct: annualBudget > 0 ? Math.round((ytdSanctioned / annualBudget) * 1000) / 10 : 0,
      passportAlerts: passports.filter((p) => passportNeedsRenewal(p.passportExpiry, p.endDate)).length,
      upcomingThisMonth,
      year,
      counts,
    };
  }

  // ── Settings ──

  async settings() {
    const row = await this.prisma.appSetting.findUnique({ where: { key: TOUR_SETTING_ANNUAL_BUDGET } });
    const value = typeof row?.value === "number" ? row.value : Number(row?.value);
    return {
      annualTravelBudget: row && Number.isFinite(value) ? value : DEFAULT_ANNUAL_TRAVEL_BUDGET,
      updatedAt: row?.updatedAt ?? null,
      updatedBy: row?.updatedBy ?? null,
    };
  }

  async updateSettings(actor: UserActor, dto: TourSettingsDto) {
    if (!actor.capabilities.has(Capability.TOUR_VET) && !actor.capabilities.has(Capability.CONFIG_MANAGE)) {
      throw forbidden("Only HR & Finance or a system administrator can change the travel budget.", "MISSING_CAPABILITY");
    }
    const before = await this.settings();
    await this.prisma.$transaction(async (tx) => {
      await tx.appSetting.upsert({
        where: { key: TOUR_SETTING_ANNUAL_BUDGET },
        create: { key: TOUR_SETTING_ANNUAL_BUDGET, value: dto.annualTravelBudget, updatedBy: actor.displayName },
        update: { value: dto.annualTravelBudget, updatedBy: actor.displayName },
      });
      await this.audit.record(
        {
          actor,
          action: "tour.settings_changed",
          objectType: "app_setting",
          objectId: TOUR_SETTING_ANNUAL_BUDGET,
          summary: `Annual travel budget ${formatTaka(before.annualTravelBudget)} → ${formatTaka(dto.annualTravelBudget)}`,
          before: { annualTravelBudget: before.annualTravelBudget },
          after: { annualTravelBudget: dto.annualTravelBudget },
        },
        tx,
      );
    });
    return this.settings();
  }

  // ── Approvals ──

  async decide(actor: UserActor, id: string, dto: TourDecisionDto) {
    await this.load(actor, id);
    const approve = dto.decision === TourDecision.APPROVE;
    const note = dto.note?.trim() || null;
    if (!approve && (!note || note.length < TOUR_LIMITS.reasonMin)) throw badRequest("Tell the traveller why this request is rejected.", "REASON_REQUIRED");
    const now = new Date();

    const outcome = await this.prisma.$transaction(async (tx) => {
      // Lock the row: two approvers acting at once cannot both move it.
      const [row] = await tx.$queryRaw<{ status: string; type: string; travellerUserId: string; approverUserId: string; estimatedBudget: number; sanctionedBudget: number | null; referenceNumber: string }[]>`
        SELECT "status", "type", "travellerUserId", "approverUserId", "estimatedBudget", "sanctionedBudget", "referenceNumber"
        FROM "tour_requests" WHERE "id" = ${id} FOR UPDATE`;
      const core: TourCore = { id, ...row };
      const stage = tourAwaiting(row.status);
      if (!stage) throw conflict(STATE_CONFLICT, `This request is already ${TOUR_STATUS_LABEL[row.status as TourStatus] ?? row.status}; there is nothing left to approve.`);
      const prior = this.hodApprovers(
        await tx.tourUpdate.findMany({ where: { tourId: id, type: TourUpdateType.STATUS_CHANGED }, select: { type: true, fromStatus: true, toStatus: true, actorUserId: true } }),
      );
      const right = this.stageRight(actor, core, prior);
      if (right === "OWN") throw forbidden("You cannot approve or reject your own tour request.", "OWN_REQUEST");
      if (right === "SEPARATION") throw forbidden("You approved this request as head of department, so another HR & Finance member must vet it.", "SEPARATION_OF_DUTIES");
      if (right === "NONE") {
        const late = this.stagesFor(actor, core).some((s) => STAGE_ORDER[s] < STAGE_ORDER[stage]);
        if (late) throw conflict(STATE_CONFLICT, `This request has moved on to ${TOUR_STATUS_LABEL[row.status as TourStatus]}; it is no longer waiting for you.`);
        throw forbidden(`This request is waiting for ${stage === TourAwaiting.HOD ? "the named head of department" : TOUR_AWAITING_LABEL[stage]}.`, "NOT_YOUR_STAGE");
      }
      if (dto.sanctionedBudget !== undefined && stage === TourAwaiting.HOD) {
        throw badRequest("Only HR & Finance or the MD / Chairman set the sanctioned budget.", "BUDGET_NOT_ALLOWED");
      }

      const to: TourStatus = !approve
        ? TourStatus.REJECTED
        : stage === TourAwaiting.HOD
          ? TourStatus.PENDING_VETTING
          : stage === TourAwaiting.VETTING && row.type === TourType.FOREIGN
            ? TourStatus.PENDING_SANCTION
            : TourStatus.APPROVED;
      if (!canTourTransition(row.status, to)) throw conflict(STATE_CONFLICT, `This request cannot move from ${TOUR_STATUS_LABEL[row.status as TourStatus]} to ${TOUR_STATUS_LABEL[to]}.`);

      let budget = row.sanctionedBudget;
      if (approve && dto.sanctionedBudget !== undefined) budget = dto.sanctionedBudget;
      if (to === TourStatus.APPROVED && budget === null) budget = row.estimatedBudget;

      await tx.tourRequest.update({
        where: { id },
        data: {
          status: to,
          statusNote: note,
          statusChangedAt: now,
          sanctionedBudget: budget,
          hodApprovedAt: approve && stage === TourAwaiting.HOD ? now : undefined,
          vettedAt: approve && stage === TourAwaiting.VETTING ? now : undefined,
          sanctionedAt: approve && stage === TourAwaiting.SANCTION ? now : undefined,
          rejectedAt: approve ? undefined : now,
        },
      });
      await tx.tourUpdate.create({
        data: {
          tourId: id,
          type: TourUpdateType.STATUS_CHANGED,
          fromStatus: row.status,
          toStatus: to,
          note,
          actorUserId: actor.userId,
          actorName: actor.displayName,
          metadata: { decision: dto.decision, stage, sanctionedBudget: budget },
          createdAt: now,
        },
      });
      if (budget !== row.sanctionedBudget) {
        await tx.tourUpdate.create({
          data: {
            tourId: id,
            type: TourUpdateType.BUDGET_CHANGED,
            actorUserId: actor.userId,
            actorName: actor.displayName,
            metadata: { before: row.sanctionedBudget, after: budget, estimated: row.estimatedBudget, stage },
            createdAt: new Date(now.getTime() + 1),
          },
        });
      }
      await this.audit.record(
        {
          actor,
          action: approve ? "tour.approved" : "tour.rejected",
          objectType: "tour",
          objectId: id,
          summary: `${row.referenceNumber}: ${TOUR_AWAITING_LABEL[stage]} ${approve ? "approved" : "rejected"} → ${TOUR_STATUS_LABEL[to]}`,
          before: { status: row.status, sanctionedBudget: row.sanctionedBudget },
          after: { status: to, sanctionedBudget: budget, note },
        },
        tx,
      );
      return { from: row.status, to, stage, budget, prior };
    });

    await this.notifyDecision(id, outcome, actor, note, now);
    return this.get(actor, id);
  }

  private async notifyDecision(id: string, o: { to: TourStatus; stage: TourAwaiting; budget: number | null; prior: Set<string> }, actor: UserActor, note: string | null, now: Date) {
    const t = await this.prisma.tourRequest.findUniqueOrThrow({ where: { id }, include: ROW_INCLUDE });
    const key = `tour:${id}:${o.to}:${now.getTime()}`;
    const traveller = t.traveller.displayName;
    const subject = `${t.referenceNumber} · ${t.title}`;
    // Never ask the traveller to approve their own request; HR & Finance who approved as HOD cannot vet it.
    const others = (ids: string[], excludeHod = false) => ids.filter((u) => u !== t.travellerUserId && u !== actor.userId && !(excludeHod && o.prior.has(u)));
    const C = NotificationCategory;

    switch (o.to) {
      case TourStatus.REJECTED:
        await this.deliver(t, `${key}:traveller`, "TOUR_UPDATED", [t.travellerUserId], C.PARCEL_UPDATE, "Tour request rejected", `${subject} — ${actor.displayName}: ${note}`);
        return;
      case TourStatus.PENDING_VETTING:
        await this.deliver(t, `${key}:traveller`, "TOUR_UPDATED", [t.travellerUserId], C.PARCEL_UPDATE, "Approved by your head of department", `${subject} — next: HR & Finance vetting.`);
        await this.deliver(
          t,
          `${key}:next`,
          "TOUR_APPROVAL_REQUIRED",
          others(await this.notifications.usersWithRoles([RoleCode.HR_FINANCE]), true),
          C.ACTION_REQUIRED,
          "Tour budget needs vetting",
          `${traveller} · ${t.title} — ${this.where(t)} · ${travelDates(t.startDate, t.endDate)} · est. ${formatTaka(t.estimatedBudget)}. ${t.referenceNumber}`,
        );
        return;
      case TourStatus.PENDING_SANCTION:
        await this.deliver(t, `${key}:traveller`, "TOUR_UPDATED", [t.travellerUserId], C.PARCEL_UPDATE, "Vetted by HR & Finance", `${subject} — next: MD / Chairman sanction.`);
        await this.deliver(
          t,
          `${key}:next`,
          "TOUR_APPROVAL_REQUIRED",
          others(await this.notifications.usersWithRoles([RoleCode.EXECUTIVE])),
          C.ACTION_REQUIRED,
          "Overseas tour needs your sanction",
          `${traveller} · ${t.title} — ${this.where(t)} · ${travelDates(t.startDate, t.endDate)} · ${formatTaka(o.budget ?? t.estimatedBudget)}. ${t.referenceNumber}`,
        );
        return;
      case TourStatus.APPROVED:
        await this.deliver(t, `${key}:traveller`, "TOUR_UPDATED", [t.travellerUserId], C.PARCEL_UPDATE, "Tour approved & funds sanctioned", `${subject} — ${formatTaka(o.budget)} sanctioned. Have a safe trip.`);
        if (o.stage === TourAwaiting.SANCTION) {
          // Finance releases the advance and arranges tickets once the MD / Chairman has signed off.
          await this.deliver(
            t,
            `${key}:finance`,
            "TOUR_SANCTIONED",
            (await this.notifications.usersWithRoles([RoleCode.HR_FINANCE])).filter((u) => u !== t.travellerUserId && u !== actor.userId),
            C.PARCEL_UPDATE,
            "Overseas tour sanctioned",
            `${traveller} · ${t.referenceNumber} — ${formatTaka(o.budget)} sanctioned by ${actor.displayName}${t.advanceRequested ? `; release the advance of ${formatTaka(t.advanceRequested)}` : ""}.`,
          );
        }
        return;
      default:
        return;
    }
  }

  // ── The traveller's own steps ──

  async start(actor: UserActor, id: string, noteRaw?: string) {
    const { tour, rel } = await this.load(actor, id);
    if (!rel.isTraveller) throw forbidden("Only the traveller can start the tour.", "NOT_TRAVELLER");
    const from = this.startableFrom(tour.startDate);
    if (tour.status === TourStatus.APPROVED && dhakaDay(new Date()) < from) {
      throw conflict("TOUR_TOO_EARLY", `This tour starts on ${fullDay.format(tour.startDate)}. You can mark it started from ${fullDay.format(asDate(from))}.`);
    }
    const note = noteRaw?.trim() || null;
    const now = new Date();
    await this.transition(actor, id, TourStatus.ACTIVE, note, now, { startedAt: now }, null);
    await this.deliver(tour, `tour:${id}:started:${now.getTime()}`, "TOUR_STARTED", [tour.approverUserId], NotificationCategory.PARCEL_UPDATE, "Tour started", `${tour.traveller.displayName} has started ${tour.referenceNumber} · ${this.where(tour)}.`);
    return this.get(actor, id);
  }

  async complete(actor: UserActor, id: string, noteRaw?: string) {
    const { tour, rel } = await this.load(actor, id);
    if (!rel.isTraveller && !(rel.isStaff && !isReadOnly(actor))) throw forbidden("Only the traveller or the tour administrators can complete this tour.", "NOT_TRAVELLER");
    const note = noteRaw?.trim() || null;
    const now = new Date();
    const byStaff = !rel.isTraveller;
    await this.transition(actor, id, TourStatus.COMPLETED, note, now, { completedAt: now }, byStaff ? "tour.completed" : null);
    const C = NotificationCategory;
    if (byStaff) await this.deliver(tour, `tour:${id}:completed:${now.getTime()}:traveller`, "TOUR_UPDATED", [tour.travellerUserId], C.PARCEL_UPDATE, "Tour marked completed", `${tour.referenceNumber} · ${tour.title} — closed by ${actor.displayName}.`);
    await this.deliver(tour, `tour:${id}:completed:${now.getTime()}:hod`, "TOUR_COMPLETED", [tour.approverUserId].filter((u) => u !== actor.userId), C.PARCEL_UPDATE, "Tour completed", `${tour.traveller.displayName} is back from ${this.where(tour)} · ${tour.referenceNumber}.`);
    if (tour.advanceRequested > 0) {
      await this.deliver(
        tour,
        `tour:${id}:completed:${now.getTime()}:finance`,
        "TOUR_COMPLETED",
        (await this.notifications.usersWithRoles([RoleCode.HR_FINANCE])).filter((u) => u !== tour.travellerUserId && u !== actor.userId),
        C.ACTION_REQUIRED,
        "Settle the tour advance",
        `${tour.traveller.displayName} completed ${tour.referenceNumber}; an advance of ${formatTaka(tour.advanceRequested)} is to be settled.`,
      );
    }
    return this.get(actor, id);
  }

  async cancel(actor: UserActor, id: string, noteRaw?: string) {
    const { tour, rel } = await this.load(actor, id);
    if (!rel.isTraveller) throw forbidden("Only the traveller can cancel this request.", "NOT_TRAVELLER");
    const note = noteRaw?.trim() || null;
    if (!note || note.length < TOUR_LIMITS.reasonMin) throw badRequest("Say why you are cancelling, so your approvers know.", "REASON_REQUIRED");
    const now = new Date();
    const from = await this.transition(actor, id, TourStatus.CANCELLED, note, now, { cancelledAt: now }, null);
    await this.deliver(
      tour,
      `tour:${id}:cancelled:${now.getTime()}`,
      "TOUR_CANCELLED",
      (await this.handlersAt(tour, from)).filter((u) => u !== actor.userId),
      NotificationCategory.PARCEL_UPDATE,
      "Tour request cancelled",
      `${tour.traveller.displayName} cancelled ${tour.referenceNumber} · ${tour.title} — ${note}`,
    );
    return this.get(actor, id);
  }

  async addNote(actor: UserActor, id: string, noteRaw: string) {
    const { tour, rel } = await this.load(actor, id);
    if (isReadOnly(actor)) throw forbidden("Auditors have read-only access.", "READ_ONLY");
    const note = noteRaw.trim();
    const now = new Date();
    await this.prisma.tourUpdate.create({ data: { tourId: id, type: TourUpdateType.NOTE_ADDED, note, actorUserId: actor.userId, actorName: actor.displayName, createdAt: now } });
    const recipients = rel.isTraveller ? await this.handlersAt(tour, tour.status) : [tour.travellerUserId];
    await this.deliver(
      tour,
      `tour:${id}:note:${now.getTime()}`,
      "TOUR_NOTE",
      recipients.filter((u) => u !== actor.userId),
      NotificationCategory.PARCEL_UPDATE,
      rel.isTraveller ? `Note from ${actor.displayName}` : "Note on your tour request",
      `${tour.referenceNumber} · ${actor.displayName}: ${note}`,
    );
    return this.get(actor, id);
  }

  /** Move a request along under a row lock, with history (and audit for administrative changes). Returns the status it left. */
  private async transition(actor: UserActor, id: string, to: TourStatus, note: string | null, now: Date, stamps: Prisma.TourRequestUpdateInput, auditAction: string | null): Promise<string> {
    return this.prisma.$transaction(async (tx: Tx) => {
      const [row] = await tx.$queryRaw<{ status: string; referenceNumber: string }[]>`SELECT "status", "referenceNumber" FROM "tour_requests" WHERE "id" = ${id} FOR UPDATE`;
      if (!canTourTransition(row.status, to)) {
        const hint =
          to === TourStatus.CANCELLED && row.status === TourStatus.ACTIVE
            ? " The tour is under way — mark it completed instead."
            : to === TourStatus.ACTIVE && OPEN_TOUR_STATUSES.includes(row.status as TourStatus)
              ? " It still needs every approval first."
              : "";
        throw conflict(STATE_CONFLICT, `This request is ${TOUR_STATUS_LABEL[row.status as TourStatus] ?? row.status}; it cannot become ${TOUR_STATUS_LABEL[to]}.${hint}`);
      }
      await tx.tourRequest.update({ where: { id }, data: { ...stamps, status: to, statusChangedAt: now, ...(to === TourStatus.CANCELLED ? { statusNote: note } : {}) } });
      await tx.tourUpdate.create({ data: { tourId: id, type: TourUpdateType.STATUS_CHANGED, fromStatus: row.status, toStatus: to, note, actorUserId: actor.userId, actorName: actor.displayName, createdAt: now } });
      if (auditAction) {
        await this.audit.record({ actor, action: auditAction, objectType: "tour", objectId: id, summary: `${row.referenceNumber}: ${TOUR_STATUS_LABEL[row.status as TourStatus]} → ${TOUR_STATUS_LABEL[to]}`, before: { status: row.status }, after: { status: to, note } }, tx);
      }
      return row.status;
    });
  }

  /** Who is (or was last) responsible for a request in this status. */
  private async handlersAt(t: { approverUserId: string; travellerUserId: string }, status: string): Promise<string[]> {
    switch (status) {
      case TourStatus.PENDING_HOD:
        return [t.approverUserId];
      case TourStatus.PENDING_VETTING:
        return this.notifications.usersWithRoles([RoleCode.HR_FINANCE]);
      case TourStatus.PENDING_SANCTION:
        return this.notifications.usersWithRoles([RoleCode.EXECUTIVE]);
      default:
        // Approved or later: the HOD and finance, who released the funds.
        return [t.approverUserId, ...(await this.notifications.usersWithRoles([RoleCode.HR_FINANCE]))].filter((u) => u !== t.travellerUserId);
    }
  }

  private async deliver(t: { id: string; referenceNumber: string; status: string }, dedupeBase: string, eventType: string, userIds: string[], category: string, title: string, body: string) {
    const drafts: Draft[] = [...new Set(userIds)].map((userId) => ({ userId, category, title, body }));
    if (!drafts.length) return;
    const fresh = await this.prisma.tourRequest.findUnique({ where: { id: t.id }, select: { status: true } });
    await this.notifications.deliverModule({ module: MODULE, id: t.id, reference: t.referenceNumber, route: `/tours/${t.id}`, status: fresh?.status ?? t.status }, dedupeBase, eventType, drafts);
  }

  private where(t: { destination: string; country: string | null }): string {
    return t.country ? `${t.destination}, ${t.country}` : t.destination;
  }

  private startableFrom(startDate: Date): string {
    return addDays(day(startDate)!, -TOUR_LIMITS.startEarlyDays);
  }

  // ── Shapes ──

  private actionsFor(actor: UserActor, t: TourFull, rel: Relation, prior: Set<string>): string[] {
    if (isReadOnly(actor)) return [];
    const out: string[] = [];
    if (this.stageRight(actor, t, prior) === "OK") out.push(TourAction.APPROVE, TourAction.REJECT);
    if (rel.isTraveller && t.status === TourStatus.APPROVED && dhakaDay(new Date()) >= this.startableFrom(t.startDate)) out.push(TourAction.START);
    if (t.status === TourStatus.ACTIVE && (rel.isTraveller || rel.isStaff)) out.push(TourAction.COMPLETE);
    if (rel.isTraveller && canTourTransition(t.status, TourStatus.CANCELLED)) out.push(TourAction.CANCEL);
    out.push(TourAction.ADD_NOTE);
    return out;
  }

  /** Submitted → HOD → HR & Finance → (MD / Chairman) → Approved → On tour → Completed, with who and when. */
  private pipeline(t: TourFull) {
    const stages = tourPipeline(t.type);
    const changes = t.updates.filter((u) => u.type === TourUpdateType.STATUS_CHANGED);
    const approvalOf = (s: string) => changes.find((u) => u.fromStatus === s && !ENDINGS.includes(u.toStatus ?? ""));
    const arrivalAt = (s: string) => [...changes].reverse().find((u) => u.toStatus === s);
    const ended = t.status === TourStatus.REJECTED || t.status === TourStatus.CANCELLED;
    const ending = ended ? arrivalAt(t.status) : undefined;
    let current: number;
    if (ended) {
      const from = (ending?.fromStatus ?? TourStatus.PENDING_HOD) as TourStatus;
      // Waiting at a stage → stopped there; already approved → stopped before going on tour.
      current = OPEN_TOUR_STATUSES.includes(from) ? stages.indexOf(from) : stages.indexOf(from) + 1;
    } else {
      current = stages.indexOf(t.status as TourStatus);
    }
    const entries: { key: string; label: string; state: string; at: Date | null; by: string | null; note: string | null; waitingFor: string | null }[] = [
      { key: "SUBMITTED", label: "Submitted", state: "done", at: t.createdAt, by: t.traveller.displayName, note: null, waitingFor: null },
    ];
    stages.forEach((s, i) => {
      const entry = { key: s, label: TOUR_STAGE_LABEL[s], state: "upcoming", at: null as Date | null, by: null as string | null, note: null as string | null, waitingFor: null as string | null };
      const waiting = tourAwaiting(s);
      if (ended && i === current) {
        entry.state = t.status === TourStatus.REJECTED ? "rejected" : "cancelled";
        entry.at = ending?.createdAt ?? t.statusChangedAt;
        entry.by = ending?.actorName ?? null;
        entry.note = ending?.note ?? null;
      } else if (ended && i > current) {
        entry.state = "skipped";
      } else if (i < current || (i === current && (s === TourStatus.APPROVED || s === TourStatus.COMPLETED))) {
        entry.state = "done";
        const u = waiting ? approvalOf(s) : arrivalAt(s);
        entry.at = u?.createdAt ?? null;
        entry.by = u?.actorName ?? null;
        entry.note = u?.note ?? null;
      } else if (i === current) {
        entry.state = "current";
        if (waiting) {
          entry.at = arrivalAt(s)?.createdAt ?? t.createdAt;
          entry.waitingFor = waiting === TourAwaiting.HOD ? t.approver.displayName : TOUR_AWAITING_LABEL[waiting];
        } else {
          const u = arrivalAt(s);
          entry.at = u?.createdAt ?? null;
          entry.by = u?.actorName ?? null;
        }
      } else if (waiting === TourAwaiting.HOD) {
        entry.waitingFor = t.approver.displayName;
      }
      entries.push(entry);
    });
    return entries;
  }

  private passportAlert(t: { type: string; status: string; passportExpiry: Date | null; endDate: Date }): boolean {
    return t.type === TourType.FOREIGN && !CLOSED_TOUR_STATUSES.includes(t.status as TourStatus) && passportNeedsRenewal(t.passportExpiry, t.endDate);
  }

  private serialize(actor: UserActor, t: TourFull, rel: Relation, prior: Set<string>) {
    const fullPassport = rel.isTraveller || actor.capabilities.has(Capability.TOUR_VET) || actor.capabilities.has(Capability.TOUR_SANCTION);
    const passport = t.passportNumber ? (fullPassport ? t.passportNumber : `${"•".repeat(Math.max(0, t.passportNumber.length - 3))}${t.passportNumber.slice(-3)}`) : null;
    const right = this.stageRight(actor, t, prior);
    const person = (u: TourFull["traveller"]) => ({
      name: u.displayName,
      employeeCode: u.employee?.employeeCode ?? null,
      designation: u.employee?.designation ?? null,
      department: u.employee?.department?.name ?? null,
    });
    return {
      id: t.id,
      referenceNumber: t.referenceNumber,
      type: t.type,
      purpose: t.purpose,
      title: t.title,
      description: t.description,
      destination: t.destination,
      country: t.country,
      startDate: day(t.startDate),
      endDate: day(t.endDate),
      durationDays: tourDurationDays(t.startDate, t.endDate),
      transportMode: t.transportMode,
      coTravellers: Array.isArray(t.coTravellers) ? (t.coTravellers as unknown[]).map(String) : [],
      estimatedBudget: t.estimatedBudget,
      advanceRequested: t.advanceRequested,
      sanctionedBudget: t.sanctionedBudget,
      passportNumber: passport,
      passportExpiry: day(t.passportExpiry),
      passportAlert: this.passportAlert(t),
      status: t.status,
      awaiting: tourAwaiting(t.status),
      statusNote: t.statusNote,
      statusChangedAt: t.statusChangedAt,
      hodApprovedAt: t.hodApprovedAt,
      vettedAt: t.vettedAt,
      sanctionedAt: t.sanctionedAt,
      startedAt: t.startedAt,
      completedAt: t.completedAt,
      rejectedAt: t.rejectedAt,
      cancelledAt: t.cancelledAt,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      branch: t.branch,
      traveller: { ...person(t.traveller), phone: rel.isTraveller || rel.isApprover || rel.isStaff || rel.isVetter ? (t.traveller.employee?.phone ?? null) : null },
      approver: { name: t.approver.displayName, designation: t.approver.employee?.designation ?? null, department: t.approver.employee?.department?.name ?? null },
      pipeline: this.pipeline(t),
      updates: t.updates.map((u) => ({ id: u.id, type: u.type, fromStatus: u.fromStatus, toStatus: u.toStatus, note: u.note, actor: u.actorName, metadata: u.metadata, createdAt: u.createdAt })),
      viewer: {
        isTraveller: rel.isTraveller,
        isApprover: rel.isApprover,
        isStaff: rel.isStaff,
        canDecide: right === "OK",
        /** Why the caller cannot decide although it is their stage, if so. */
        blockedReason: right === "SEPARATION" ? "SEPARATION_OF_DUTIES" : null,
        startableFrom: t.status === TourStatus.APPROVED ? this.startableFrom(t.startDate) : null,
        actions: this.actionsFor(actor, t, rel, prior),
      },
    };
  }

  private serializeRow(r: TourRow) {
    return {
      id: r.id,
      referenceNumber: r.referenceNumber,
      title: r.title,
      type: r.type,
      purpose: r.purpose,
      destination: r.destination,
      country: r.country,
      startDate: day(r.startDate),
      endDate: day(r.endDate),
      durationDays: tourDurationDays(r.startDate, r.endDate),
      transportMode: r.transportMode,
      estimatedBudget: r.estimatedBudget,
      advanceRequested: r.advanceRequested,
      sanctionedBudget: r.sanctionedBudget,
      status: r.status,
      awaiting: tourAwaiting(r.status),
      statusNote: r.statusNote,
      statusChangedAt: r.statusChangedAt,
      createdAt: r.createdAt,
      passportAlert: this.passportAlert(r),
      coTravellerCount: Array.isArray(r.coTravellers) ? r.coTravellers.length : 0,
      traveller: {
        name: r.traveller.displayName,
        employeeCode: r.traveller.employee?.employeeCode ?? null,
        designation: r.traveller.employee?.designation ?? null,
        department: r.traveller.employee?.department?.name ?? null,
      },
      approver: { name: r.approver.displayName },
      branch: r.branch,
    };
  }

  /** The approvals-inbox row. Kept to exactly these fields: the combined mobile inbox reads it. */
  private serializeApproval(r: TourRow) {
    return {
      id: r.id,
      referenceNumber: r.referenceNumber,
      title: r.title,
      type: r.type,
      destination: this.where(r),
      startDate: day(r.startDate),
      endDate: day(r.endDate),
      estimatedBudget: r.estimatedBudget,
      status: r.status,
      awaiting: tourAwaiting(r.status)!,
      traveller: { name: r.traveller.displayName, designation: r.traveller.employee?.designation ?? null, department: r.traveller.employee?.department?.name ?? null },
      createdAt: r.createdAt,
    };
  }
}
