import { Inject, Injectable, Logger } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import {
  CAR_REQUISITION_PIPELINE,
  CAR_REQUISITION_STATUS_LABEL,
  Capability,
  CarRequisitionAction,
  CarRequisitionStatus,
  CarRequisitionUpdateType,
  DRIVER_STATUS_LABEL,
  DriverStatus,
  GateScanDirection,
  GatePassKind,
  NotificationCategory,
  OPEN_CAR_REQUISITION_STATUSES,
  RoleCode,
  TRIP_TYPE_LABEL,
  VEHICLE_STATUS_LABEL,
  VEHICLE_TYPE_LABEL,
  VehicleStatus,
  carTripWindow,
  carWindowsOverlap,
  dhakaDateStamp,
  fleetDateState,
  formatCarRequisitionNumber,
  gatePassPayload,
  gatePassValidity,
  tripNeedsReturn,
  type TripType,
  type VehicleType,
} from "@abg-dispatch/shared";
import { APP_CONFIG, type AppConfig } from "../common/config";
import { PrismaService, isUniqueViolation, type Tx } from "../common/prisma.service";
import type { UserActor } from "../common/actor";
import { badRequest, conflict, forbidden, notFound } from "../common/errors";
import { randomToken } from "../common/crypto";
import { clampLimit, decodeCursor, encodeCursor } from "../common/pagination";
import { nextSequence } from "../common/sequence";
import { dhakaDay, dhakaDayRange, dhakaTime } from "../common/time";
import { AuditService } from "../audit/audit.service";
import { NotificationService, type Draft } from "../notifications/notification.service";
import { normalizePhone } from "../notifications/sms.service";
import { moduleScope } from "../admin/admin-scope";
import type {
  AdminCarRequisitionsQuery,
  AssignCarDto,
  CreateCarRequisitionDto,
  CreateDriverDto,
  CreateVehicleDto,
  FleetRegisterQuery,
  MyCarRequisitionsQuery,
  MyTripsQuery,
  UpdateDriverDto,
  UpdateVehicleDto,
} from "./fleet.dto";

export const CAR_NOT_FOUND = "Pool car request not found, or you do not have access to it.";
const PASS_INVALID = "This gate pass is not valid. Do not let the vehicle through — call the fleet desk.";
const PASS_TOKEN = /^[A-Za-z0-9_-]{16,128}$/;
const S = CarRequisitionStatus;
const A = CarRequisitionAction;
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
/** A request made "for right now" takes a minute to fill in; allow that much in the past. */
const PICKUP_GRACE_MS = 10 * MINUTE;
const MAX_ADVANCE_MS = 120 * DAY;
const MAX_TRIP_MS = 7 * DAY;
/** The fleet manager works across every office; everyone else with fleet.view sees their own offices. */
const ORG_WIDE = [RoleCode.FLEET_MANAGER] as const;
const BOOKED = [S.ASSIGNED, S.IN_PROGRESS];

const PERSON = {
  select: {
    id: true,
    displayName: true,
    employee: { select: { employeeCode: true, designation: true, phone: true, department: { select: { name: true } } } },
  },
} satisfies Prisma.UserDefaultArgs;

const INCLUDE = {
  branch: { select: { id: true, name: true, code: true } },
  requester: PERSON,
  approver: PERSON,
  vehicle: { include: { branch: { select: { id: true, name: true, code: true } } } },
  driver: true,
  updates: { orderBy: { createdAt: "asc" as const } },
} satisfies Prisma.CarRequisitionInclude;

const ROW_INCLUDE = {
  branch: { select: { id: true, name: true, code: true } },
  requester: PERSON,
  approver: { select: { id: true, displayName: true } },
  vehicle: { select: { id: true, registrationNumber: true, make: true, model: true, type: true, seats: true } },
  driver: { select: { id: true, fullName: true, phone: true, userId: true } },
} satisfies Prisma.CarRequisitionInclude;

type CarFull = Prisma.CarRequisitionGetPayload<{ include: typeof INCLUDE }>;
type CarRow = Prisma.CarRequisitionGetPayload<{ include: typeof ROW_INCLUDE }>;
type VehicleWithBranch = Prisma.VehicleGetPayload<{ include: { branch: { select: { id: true; name: true; code: true } } } }>;
type DriverWithBranch = Prisma.DriverGetPayload<{ include: { branch: { select: { id: true; name: true; code: true } } } }>;

interface Relation {
  isRequester: boolean;
  isApprover: boolean;
  isDriver: boolean;
  /** fleet.view, and the request (or its vehicle) is in one of the viewer's offices. */
  isStaff: boolean;
  /** Staff who may assign cars and run trips (the fleet manager). */
  canManage: boolean;
}

interface Booking {
  id: string;
  referenceNumber: string;
  status: string;
  pickupAt: Date;
  returnAt: Date | null;
  tripType: string;
}

interface Target {
  id: string;
  window: { start: Date; end: Date };
  passengerCount: number;
  preference: string;
}

const vehicleName = (v: { make: string; model: string }) => `${v.make} ${v.model}`;
const vehicleLabel = (v: { make: string; model: string; registrationNumber: string }) => `${vehicleName(v)} · ${v.registrationNumber}`;
const statusLabel = (s: string) => CAR_REQUISITION_STATUS_LABEL[s as CarRequisitionStatus] ?? s;
const isoDay = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : null);
const parseDay = (d: string | null | undefined) => (d ? new Date(`${d}T00:00:00.000Z`) : d === null ? null : undefined);

/**
 * Pool car requisitions: an employee asks for a car, their head of department
 * approves, the fleet manager assigns a vehicle and a driver, and the car
 * leaves and comes back through the gate on a QR pass that security scans.
 *
 *   Pending HOD → Pending fleet manager → Assigned → In progress → Completed
 *
 * The HOD step belongs to whoever is named as the request's approver. Every
 * change is a row-locked transition with an append-only history row.
 */
@Injectable()
export class FleetService {
  private readonly logger = new Logger("FleetService");

  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationService,
    private readonly audit: AuditService,
  ) {}

  // ── Access ──

  private scope(actor: UserActor): string[] | null {
    return moduleScope(actor, ORG_WIDE);
  }

  private inScope(actor: UserActor, ...branchIds: (string | null | undefined)[]): boolean {
    const scope = this.scope(actor);
    return scope === null || branchIds.some((b) => !!b && scope.includes(b));
  }

  private staffWhere(actor: UserActor): Prisma.CarRequisitionWhereInput | null {
    if (!actor.capabilities.has(Capability.FLEET_VIEW)) return null;
    const scope = this.scope(actor);
    if (!scope) return {};
    return { OR: [{ branchId: { in: scope } }, { vehicle: { branchId: { in: scope } } }] };
  }

  private relation(actor: UserActor, r: { requesterUserId: string; approverUserId: string; branchId: string; vehicle: { branchId: string } | null; driver: { userId: string | null } | null }): Relation {
    const isStaff = actor.capabilities.has(Capability.FLEET_VIEW) && this.inScope(actor, r.branchId, r.vehicle?.branchId);
    return {
      isRequester: r.requesterUserId === actor.userId,
      isApprover: r.approverUserId === actor.userId,
      isDriver: !!r.driver?.userId && r.driver.userId === actor.userId,
      isStaff,
      canManage: isStaff && actor.capabilities.has(Capability.FLEET_MANAGE),
    };
  }

  private async load(actor: UserActor, id: string): Promise<{ r: CarFull; rel: Relation }> {
    const r = await this.prisma.carRequisition.findUnique({ where: { id }, include: INCLUDE });
    if (!r) throw notFound(CAR_NOT_FOUND, "CAR_REQUISITION_NOT_FOUND");
    const rel = this.relation(actor, r);
    if (!rel.isRequester && !rel.isApprover && !rel.isDriver && !rel.isStaff) throw notFound(CAR_NOT_FOUND, "CAR_REQUISITION_NOT_FOUND");
    return { r, rel };
  }

  private stateConflict(status: string, attempted: string) {
    return conflict("CAR_REQUISITION_STATE_CONFLICT", `This request is now ${statusLabel(status)}, so it cannot be ${attempted}.`, { status });
  }

  /** Lock the requisition row for the rest of the transaction and confirm it is still where we expect. */
  private async lock(tx: Tx, id: string, expected: readonly string[], attempted: string) {
    const [row] = await tx.$queryRaw<{ status: string }[]>`SELECT "status" FROM "car_requisitions" WHERE "id" = ${id} FOR UPDATE`;
    if (!row) throw notFound(CAR_NOT_FOUND, "CAR_REQUISITION_NOT_FOUND");
    if (!expected.includes(row.status)) throw this.stateConflict(row.status, attempted);
    return tx.carRequisition.findUniqueOrThrow({ where: { id }, include: { vehicle: true, driver: true } });
  }

  // ── Requesting ──

  async create(actor: UserActor, dto: CreateCarRequisitionDto) {
    const me = await this.prisma.user.findUniqueOrThrow({
      where: { id: actor.userId },
      include: { employee: { include: { branch: true, manager: { include: { user: true } } } } },
    });
    const employee = me.employee;
    if (!employee) throw badRequest("Your account is not linked to an employee record, so a car cannot be booked for you. Ask HR to link it.", "EMPLOYEE_REQUIRED");

    const now = new Date();
    const pickupAt = new Date(dto.pickupAt);
    const returnAt = dto.returnAt ? new Date(dto.returnAt) : null;
    if (pickupAt.getTime() < now.getTime() - PICKUP_GRACE_MS) throw badRequest("The pickup time has already passed. Choose a time from now on.", "PICKUP_IN_PAST");
    if (pickupAt.getTime() > now.getTime() + MAX_ADVANCE_MS) throw badRequest("Pool cars can be booked up to 120 days ahead.", "PICKUP_TOO_FAR");
    if (tripNeedsReturn(dto.tripType) && !returnAt) {
      throw badRequest(`Say when the car should bring you back — a ${TRIP_TYPE_LABEL[dto.tripType as TripType].toLowerCase()} needs a return time.`, "RETURN_REQUIRED");
    }
    if (returnAt && returnAt.getTime() <= pickupAt.getTime()) throw badRequest("The return time must be after the pickup time.", "RETURN_BEFORE_PICKUP");
    if (returnAt && returnAt.getTime() - pickupAt.getTime() > MAX_TRIP_MS) throw badRequest("A pool car can be booked for at most 7 days at a time.", "TRIP_TOO_LONG");

    const passengers = (dto.passengers ?? []).map((p) => ({ name: p.name.trim(), phone: p.phone ? normalizePhone(p.phone) : null }));
    if (passengers.length > dto.passengerCount) throw badRequest(`You listed ${passengers.length} passengers but said ${dto.passengerCount} are travelling.`, "PASSENGERS_EXCEED_COUNT");

    // The approver: the person chosen, or the requester's own head of department.
    let approver: { id: string; displayName: string; active: boolean };
    if (dto.approverEmployeeId) {
      const chosen = await this.prisma.employee.findUnique({ where: { id: dto.approverEmployeeId }, include: { user: true } });
      if (!chosen || chosen.status !== "ACTIVE") throw badRequest("Choose the approver from the directory.", "APPROVER_INVALID");
      if (!chosen.user || !chosen.user.active) throw badRequest(`${chosen.fullName} cannot sign in to ABG ONE, so they cannot approve this. Choose someone with an account.`, "APPROVER_HAS_NO_ACCOUNT");
      approver = chosen.user;
    } else {
      const manager = employee.manager;
      if (!manager) throw badRequest("Choose who approves this request — usually your head of department.", "APPROVER_REQUIRED");
      if (!manager.user || !manager.user.active) {
        throw badRequest(`Your head of department, ${manager.fullName}, cannot sign in to ABG ONE yet. Choose another approver.`, "APPROVER_HAS_NO_ACCOUNT");
      }
      approver = manager.user;
    }
    if (approver.id === actor.userId) throw badRequest("You cannot approve your own request. Choose your head of department.", "APPROVER_SELF");

    const created = await this.prisma.$transaction(async (tx) => {
      const day = dhakaDateStamp(now);
      const referenceNumber = formatCarRequisitionNumber(day, employee.branch.code, await nextSequence(tx, `PC:${employee.branch.code}`, day));
      const row = await tx.carRequisition.create({
        data: {
          referenceNumber,
          requesterUserId: actor.userId,
          branchId: employee.branchId,
          departmentId: employee.departmentId,
          tripType: dto.tripType,
          purpose: dto.purpose.trim(),
          pickupLocation: dto.pickupLocation.trim(),
          dropLocation: dto.dropLocation.trim(),
          pickupAt,
          returnAt,
          passengers,
          passengerCount: dto.passengerCount,
          urgent: !!dto.urgent,
          vehiclePreference: dto.vehiclePreference ?? "ANY",
          approverUserId: approver.id,
          status: S.PENDING_HOD,
          statusChangedAt: now,
        },
      });
      await tx.carRequisitionUpdate.create({
        data: {
          requisitionId: row.id,
          type: CarRequisitionUpdateType.SUBMITTED,
          toStatus: S.PENDING_HOD,
          actorUserId: actor.userId,
          actorName: actor.displayName,
          metadata: { approver: approver.displayName, urgent: !!dto.urgent },
        },
      });
      return row;
    });

    await this.notify(created, `fleet:${created.id}:submitted`, "CAR_REQUESTED", [
      {
        userId: approver.id,
        category: NotificationCategory.ACTION_REQUIRED,
        title: `${created.urgent ? "Urgent: " : ""}Pool car request to approve`,
        body: `${actor.displayName} · ${created.purpose} — ${created.pickupLocation} → ${created.dropLocation}, ${dhakaTime(created.pickupAt)}. ${created.referenceNumber}`,
      },
    ]);
    return this.get(actor, created.id);
  }

  // ── Reading ──

  async get(actor: UserActor, id: string) {
    const { r, rel } = await this.load(actor, id);
    return this.serialize(actor, r, rel);
  }

  async mine(actor: UserActor, q: MyCarRequisitionsQuery) {
    const where: Prisma.CarRequisitionWhereInput[] = [{ requesterUserId: actor.userId }];
    if (q.state === "open") where.push({ status: { in: [...OPEN_CAR_REQUISITION_STATUSES] } });
    if (q.state === "closed") where.push({ status: { notIn: [...OPEN_CAR_REQUISITION_STATUSES] } });
    return this.page(actor, where, q.cursor, q.limit);
  }

  /** The driver's own trips: what is coming up and on the road now, or what is done. */
  async trips(actor: UserActor, q: MyTripsQuery) {
    const driver = await this.prisma.driver.findUnique({ where: { userId: actor.userId }, select: { id: true } });
    if (!driver) return { items: [], nextCursor: null };
    if (q.state === "done") return this.page(actor, [{ driverId: driver.id }, { status: S.COMPLETED }], q.cursor, q.limit);
    const rows = await this.prisma.carRequisition.findMany({
      where: { driverId: driver.id, status: { in: BOOKED } },
      include: ROW_INCLUDE,
      orderBy: [{ pickupAt: "asc" }, { id: "asc" }],
      take: 100,
    });
    return { items: rows.map((r) => this.serializeRow(actor, r)), nextCursor: null };
  }

  /** Requests waiting for this person's HOD decision — one half of the mobile Approvals inbox. */
  async approvals(actor: UserActor) {
    const rows = await this.prisma.carRequisition.findMany({
      where: { approverUserId: actor.userId, status: S.PENDING_HOD },
      include: { requester: PERSON },
      orderBy: [{ urgent: "desc" }, { pickupAt: "asc" }, { id: "asc" }],
      take: 100,
    });
    return {
      items: rows.map((r) => ({
        id: r.id,
        referenceNumber: r.referenceNumber,
        title: r.purpose,
        tripType: r.tripType,
        pickupAt: r.pickupAt,
        returnAt: r.returnAt,
        pickupLocation: r.pickupLocation,
        dropLocation: r.dropLocation,
        passengerCount: r.passengerCount,
        urgent: r.urgent,
        status: r.status,
        awaiting: "HOD" as const,
        requester: {
          name: r.requester.displayName,
          designation: r.requester.employee?.designation ?? null,
          department: r.requester.employee?.department?.name ?? null,
        },
        createdAt: r.createdAt,
      })),
      nextCursor: null,
    };
  }

  async list(actor: UserActor, q: AdminCarRequisitionsQuery) {
    const staff = this.staffWhere(actor);
    if (!staff) throw forbidden("Your role does not include pool car requisitions.");
    const where: Prisma.CarRequisitionWhereInput[] = [];
    if (q.status === "AWAITING_ME") {
      const mine: Prisma.CarRequisitionWhereInput[] = [{ approverUserId: actor.userId, status: S.PENDING_HOD }];
      if (actor.capabilities.has(Capability.FLEET_MANAGE)) mine.push({ AND: [staff, { status: S.PENDING_FLEET }] });
      where.push({ OR: mine });
    } else {
      where.push(staff);
      if (q.status === "OPEN") where.push({ status: { in: [...OPEN_CAR_REQUISITION_STATUSES] } });
      else if (q.status === "CLOSED") where.push({ status: { in: [S.REJECTED, S.CANCELLED] } });
      else if (q.status && q.status !== "ALL") where.push({ status: q.status });
    }
    if (q.branchId) where.push({ branchId: q.branchId });
    if (q.urgent) where.push({ urgent: q.urgent === "true" });
    if (q.dateFrom || q.dateTo) {
      where.push({ pickupAt: { gte: q.dateFrom ? dhakaDayRange(q.dateFrom).gte : undefined, lt: q.dateTo ? dhakaDayRange(q.dateTo).lt : undefined } });
    }
    const text = q.q?.trim();
    if (text) {
      where.push({
        OR: [
          { referenceNumber: { contains: text, mode: "insensitive" } },
          { purpose: { contains: text, mode: "insensitive" } },
          { pickupLocation: { contains: text, mode: "insensitive" } },
          { dropLocation: { contains: text, mode: "insensitive" } },
          { requester: { OR: [{ displayName: { contains: text, mode: "insensitive" } }, { employee: { employeeCode: { contains: text, mode: "insensitive" } } }] } },
          { vehicle: { registrationNumber: { contains: text, mode: "insensitive" } } },
          { driver: { fullName: { contains: text, mode: "insensitive" } } },
        ],
      });
    }
    return this.page(actor, where, q.cursor, q.limit);
  }

  private async page(actor: UserActor, where: Prisma.CarRequisitionWhereInput[], cursorRaw: string | undefined, limitRaw: string | undefined) {
    const limit = clampLimit(limitRaw, 25, 100);
    const cursor = decodeCursor(cursorRaw);
    if (cursor) where.push({ OR: [{ createdAt: { lt: cursor.createdAt } }, { createdAt: cursor.createdAt, id: { lt: cursor.id } }] });
    const rows = await this.prisma.carRequisition.findMany({ where: { AND: where }, include: ROW_INCLUDE, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: limit + 1 });
    const items = rows.slice(0, limit);
    return {
      items: items.map((r) => this.serializeRow(actor, r)),
      nextCursor: rows.length > limit ? encodeCursor(items[items.length - 1].createdAt, items[items.length - 1].id) : null,
    };
  }

  async summary(actor: UserActor, branchId?: string) {
    const staff = this.staffWhere(actor);
    if (!staff) throw forbidden("Your role does not include pool car requisitions.");
    const now = new Date();
    const base: Prisma.CarRequisitionWhereInput = { AND: [staff, branchId ? { branchId } : {}] };
    const grouped = await this.prisma.carRequisition.groupBy({ by: ["status"], where: base, _count: { _all: true } });
    const counts = Object.fromEntries(Object.values(S).map((s) => [s, grouped.find((g) => g.status === s)?._count._all ?? 0])) as Record<CarRequisitionStatus, number>;
    const today = dhakaDayRange(dhakaDay(now));
    const tripsToday = await this.prisma.carRequisition.count({ where: { AND: [base, { pickupAt: { gte: today.gte, lt: today.lt } }, { status: { in: [S.ASSIGNED, S.IN_PROGRESS, S.COMPLETED] } }] } });
    const completedLast30Days = await this.prisma.carRequisition.count({ where: { AND: [base, { status: S.COMPLETED, completedAt: { gte: new Date(now.getTime() - 30 * DAY) } }] } });
    const awaiting: Prisma.CarRequisitionWhereInput[] = [{ approverUserId: actor.userId, status: S.PENDING_HOD }];
    if (actor.capabilities.has(Capability.FLEET_MANAGE)) awaiting.push({ AND: [staff, { status: S.PENDING_FLEET }] });
    const awaitingMe = await this.prisma.carRequisition.count({ where: { OR: awaiting } });

    const scope = this.scope(actor);
    const registerWhere = { AND: [scope ? { branchId: { in: scope } } : {}, branchId ? { branchId } : {}] };
    const vehicles = await this.prisma.vehicle.findMany({ where: registerWhere, select: { status: true, nextServiceAt: true, fitnessExpiry: true, insuranceExpiry: true } });
    const inService = vehicles.filter((v) => v.status !== VehicleStatus.INACTIVE);
    const available = inService.filter((v) => v.status === VehicleStatus.AVAILABLE).length;
    const drivers = await this.prisma.driver.findMany({ where: { ...registerWhere, active: true }, select: { status: true } });
    return {
      activeRequisitions: OPEN_CAR_REQUISITION_STATUSES.reduce((sum, s) => sum + counts[s], 0),
      pendingHod: counts.PENDING_HOD,
      pendingFleet: counts.PENDING_FLEET,
      assigned: counts.ASSIGNED,
      inProgress: counts.IN_PROGRESS,
      awaitingMe,
      tripsToday,
      completedLast30Days,
      counts,
      vehicles: {
        total: inService.length,
        available,
        onTrip: inService.filter((v) => v.status === VehicleStatus.ON_TRIP).length,
        maintenance: inService.filter((v) => v.status === VehicleStatus.MAINTENANCE).length,
        inactive: vehicles.length - inService.length,
        documentsDue: inService.filter((v) => [v.nextServiceAt, v.fitnessExpiry, v.insuranceExpiry].some((d) => fleetDateState(d, now))).length,
      },
      poolAvailabilityPct: inService.length ? Math.round((available * 100) / inService.length) : 0,
      drivers: {
        total: drivers.length,
        available: drivers.filter((d) => d.status === DriverStatus.AVAILABLE).length,
        onTrip: drivers.filter((d) => d.status === DriverStatus.ON_TRIP).length,
        offDuty: drivers.filter((d) => d.status === DriverStatus.OFF_DUTY).length,
      },
    };
  }

  // ── HOD decision (and the fleet manager turning a request down) ──

  async decide(actor: UserActor, id: string, decision: "APPROVE" | "REJECT", note?: string) {
    const { r, rel } = await this.load(actor, id);
    const text = note?.trim() || null;
    if (r.status === S.PENDING_HOD) {
      if (!rel.isApprover) throw forbidden(`Only ${r.approver.displayName}, the approver named on this request, can approve or reject it.`, "NOT_APPROVER");
    } else if (r.status === S.PENDING_FLEET) {
      if (decision === "APPROVE") throw conflict("CAR_REQUISITION_STATE_CONFLICT", "This request is already approved; the fleet manager assigns a car and driver next.", { status: r.status });
      if (!rel.canManage) throw forbidden("Only the fleet manager can turn down a request at this stage.", "NOT_FLEET_MANAGER");
    } else {
      throw this.stateConflict(r.status, decision === "APPROVE" ? "approved" : "rejected");
    }
    if (decision === "REJECT" && (!text || text.length < 3)) throw badRequest("Tell the requester why this request is rejected.", "REASON_REQUIRED");

    const stage = r.status;
    const to = decision === "APPROVE" ? S.PENDING_FLEET : S.REJECTED;
    const now = new Date();
    const updated = await this.prisma.$transaction(async (tx) => {
      await this.lock(tx, id, [stage], decision === "APPROVE" ? "approved" : "rejected");
      const row = await tx.carRequisition.update({
        where: { id },
        data: { status: to, statusNote: text, statusChangedAt: now, hodApprovedAt: to === S.PENDING_FLEET ? now : undefined, rejectedAt: to === S.REJECTED ? now : undefined },
      });
      await tx.carRequisitionUpdate.create({
        data: { requisitionId: id, type: CarRequisitionUpdateType.STATUS_CHANGED, fromStatus: stage, toStatus: to, note: text, actorUserId: actor.userId, actorName: actor.displayName, metadata: { step: stage === S.PENDING_HOD ? "HOD" : "FLEET" } },
      });
      await this.audit.record(
        { actor, action: decision === "APPROVE" ? "fleet.requisition_approved" : "fleet.requisition_rejected", objectType: "car_requisition", objectId: id, summary: `${r.referenceNumber}: ${statusLabel(stage)} → ${statusLabel(to)}`, before: { status: stage }, after: { status: to, note: text } },
        tx,
      );
      return row;
    });

    if (to === S.PENDING_FLEET) {
      const managers = await this.fleetManagers();
      await this.notify(updated, `fleet:${id}:approved`, "CAR_APPROVED", [
        { userId: r.requesterUserId, category: NotificationCategory.PARCEL_UPDATE, title: "Your car request is approved", body: `${r.referenceNumber} · ${r.approver.displayName} approved it. The fleet manager will assign a car and driver.` },
        ...managers.map((userId) => ({
          userId,
          category: NotificationCategory.ACTION_REQUIRED,
          title: `${r.urgent ? "Urgent: " : ""}Assign a pool car`,
          body: `${r.referenceNumber} · ${r.requester.displayName} — ${r.pickupLocation} → ${r.dropLocation}, ${dhakaTime(r.pickupAt)} · ${r.passengerCount} ${r.passengerCount === 1 ? "person" : "people"}`,
        })),
      ]);
    } else {
      await this.notify(updated, `fleet:${id}:rejected`, "CAR_REJECTED", [
        { userId: r.requesterUserId, category: NotificationCategory.PARCEL_UPDATE, title: "Your car request was not approved", body: `${r.referenceNumber} · ${actor.displayName}: ${text}` },
      ]);
    }
    return this.get(actor, id);
  }

  // ── Assigning a vehicle and driver ──

  async assign(actor: UserActor, id: string, dto: AssignCarDto) {
    const { r, rel } = await this.load(actor, id);
    if (!rel.canManage) throw forbidden("Only the fleet manager can assign cars and drivers.", "NOT_FLEET_MANAGER");
    if (r.status !== S.PENDING_FLEET && r.status !== S.ASSIGNED) throw this.stateConflict(r.status, "assigned a car");
    const now = new Date();
    const window = carTripWindow(r.pickupAt, r.returnAt, r.tripType);
    if (window.end.getTime() < now.getTime()) throw conflict("TRIP_TIME_PASSED", "This trip's time has already passed. Ask the requester to send a new request.");

    const result = await this.prisma.$transaction(async (tx) => {
      const current = await this.lock(tx, id, [S.PENDING_FLEET, S.ASSIGNED], "assigned a car");
      const reassign = current.status === S.ASSIGNED;
      // Lock the vehicle and then the driver: two bookings of the same car queue up here instead of both succeeding.
      await tx.$queryRaw`SELECT "id" FROM "vehicles" WHERE "id" = ${dto.vehicleId} FOR UPDATE`;
      await tx.$queryRaw`SELECT "id" FROM "drivers" WHERE "id" = ${dto.driverId} FOR UPDATE`;
      const vehicle = await tx.vehicle.findUnique({ where: { id: dto.vehicleId } });
      const driver = await tx.driver.findUnique({ where: { id: dto.driverId } });
      if (!vehicle) throw badRequest("Choose a vehicle from the fleet register.", "VEHICLE_INVALID");
      if (!driver) throw badRequest("Choose a driver from the fleet register.", "DRIVER_INVALID");
      if (reassign && current.vehicleId === vehicle.id && current.driverId === driver.id) throw conflict("ASSIGNMENT_UNCHANGED", "This car and driver are already assigned to the trip.");
      if (!vehicle.active || vehicle.status === VehicleStatus.MAINTENANCE || vehicle.status === VehicleStatus.INACTIVE) {
        throw conflict("VEHICLE_UNAVAILABLE", `${vehicleLabel(vehicle)} is ${VEHICLE_STATUS_LABEL[vehicle.status as VehicleStatus].toLowerCase()} and cannot be assigned.`);
      }
      if (vehicle.seats < r.passengerCount) {
        throw conflict("VEHICLE_TOO_SMALL", `${vehicleLabel(vehicle)} seats ${vehicle.seats} passengers; this trip needs ${r.passengerCount}. Choose a larger vehicle.`, { seats: vehicle.seats, passengerCount: r.passengerCount });
      }
      if (!driver.active || driver.status === DriverStatus.OFF_DUTY) throw conflict("DRIVER_UNAVAILABLE", `${driver.fullName} is ${driver.active ? "off duty" : "no longer in the driver pool"}. Choose another driver.`);
      const vehicleClash = await this.clash(tx, id, { vehicleId: vehicle.id }, window, now);
      if (vehicleClash) {
        throw conflict("VEHICLE_BOOKED", `${vehicleLabel(vehicle)} is already booked for ${vehicleClash.referenceNumber} (${dhakaTime(vehicleClash.start)} – ${dhakaTime(vehicleClash.end)}). Choose another vehicle.`, { conflict: vehicleClash });
      }
      const driverClash = await this.clash(tx, id, { driverId: driver.id }, window, now);
      if (driverClash) {
        throw conflict("DRIVER_BOOKED", `${driver.fullName} is already driving ${driverClash.referenceNumber} (${dhakaTime(driverClash.start)} – ${dhakaTime(driverClash.end)}). Choose another driver.`, { conflict: driverClash });
      }

      // Every assignment issues a fresh pass, so a copy held by a previous driver stops working.
      const row = await tx.carRequisition.update({
        where: { id },
        data: {
          status: S.ASSIGNED,
          vehicleId: vehicle.id,
          driverId: driver.id,
          gatePassToken: randomToken(24),
          assignedAt: reassign ? undefined : now,
          statusChangedAt: reassign ? undefined : now,
          statusNote: dto.note?.trim() || (reassign ? current.statusNote : null),
        },
      });
      const previous = reassign && current.vehicle && current.driver ? { vehicle: vehicleLabel(current.vehicle), driver: current.driver.fullName } : null;
      await tx.carRequisitionUpdate.create({
        data: {
          requisitionId: id,
          type: reassign ? CarRequisitionUpdateType.REASSIGNED : CarRequisitionUpdateType.ASSIGNED,
          fromStatus: current.status,
          toStatus: S.ASSIGNED,
          note: dto.note?.trim() || null,
          actorUserId: actor.userId,
          actorName: actor.displayName,
          metadata: { vehicle: vehicleLabel(vehicle), vehicleId: vehicle.id, driver: driver.fullName, driverId: driver.id, ...(previous ? { previous } : {}) },
        },
      });
      await this.audit.record(
        {
          actor,
          action: reassign ? "fleet.requisition_reassigned" : "fleet.requisition_assigned",
          objectType: "car_requisition",
          objectId: id,
          summary: `${r.referenceNumber}: ${vehicleLabel(vehicle)} with ${driver.fullName}`,
          before: previous ?? { status: current.status },
          after: { vehicle: vehicleLabel(vehicle), driver: driver.fullName },
        },
        tx,
      );
      return { row, vehicle, driver, reassign, previousDriverUserId: reassign && current.driver?.id !== driver.id ? current.driver?.userId ?? null : null };
    });

    const { row, vehicle, driver, reassign, previousDriverUserId } = result;
    const at = now.getTime();
    const drafts: Draft[] = [
      {
        userId: r.requesterUserId,
        category: NotificationCategory.PARCEL_UPDATE,
        title: reassign ? `Your car has changed: ${vehicleName(vehicle)}` : `Car assigned: ${vehicleName(vehicle)}`,
        body: `${vehicle.registrationNumber} · Driver ${driver.fullName} (${driver.phone}) · pickup ${dhakaTime(r.pickupAt)} at ${r.pickupLocation}. Your gate pass is ready in the app.`,
      },
    ];
    if (driver.userId) {
      drafts.push({
        userId: driver.userId,
        category: NotificationCategory.ACTION_REQUIRED,
        title: `${r.urgent ? "Urgent: " : ""}New trip: ${dhakaTime(r.pickupAt)}`,
        body: `${vehicleLabel(vehicle)} · ${r.pickupLocation} → ${r.dropLocation} · ${r.requester.displayName}${r.requester.employee?.phone ? ` (${r.requester.employee.phone})` : ""}. ${r.referenceNumber}`,
      });
    }
    if (previousDriverUserId && previousDriverUserId !== driver.userId) {
      drafts.push({ userId: previousDriverUserId, category: NotificationCategory.PARCEL_UPDATE, title: "Trip reassigned", body: `${r.referenceNumber} (${dhakaTime(r.pickupAt)}) has been given to another driver. You no longer need to drive it.` });
    }
    await this.notify(row, `fleet:${id}:assigned:${at}`, reassign ? "CAR_REASSIGNED" : "CAR_ASSIGNED", drafts);
    return this.get(actor, id);
  }

  /** Another live booking of this vehicle or driver whose time overlaps `window`. A trip still on the road holds its car until it is back. */
  private async clash(tx: Tx, excludeId: string, by: { vehicleId: string } | { driverId: string }, window: { start: Date; end: Date }, now: Date) {
    const rows = await tx.carRequisition.findMany({
      where: { id: { not: excludeId }, ...by, status: { in: BOOKED } },
      select: { id: true, referenceNumber: true, status: true, pickupAt: true, returnAt: true, tripType: true },
    });
    for (const row of rows) {
      const w = this.holdWindow(row, now);
      if (carWindowsOverlap(window, w)) return { id: row.id, referenceNumber: row.referenceNumber, status: row.status, start: w.start, end: w.end };
    }
    return null;
  }

  private holdWindow(b: Booking, now: Date) {
    const w = carTripWindow(b.pickupAt, b.returnAt, b.tripType);
    if (b.status === S.IN_PROGRESS && w.end.getTime() < now.getTime()) return { start: w.start, end: now };
    return w;
  }

  // ── Running the trip ──

  async start(actor: UserActor, id: string, odometerKm?: number) {
    const { r, rel } = await this.load(actor, id);
    if (!rel.isDriver && !rel.canManage) throw forbidden("Only the assigned driver or the fleet manager can start this trip.", "NOT_DRIVER");
    if (r.status !== S.ASSIGNED) throw this.stateConflict(r.status, "started");
    await this.begin(actor, r, { odometerKm, gate: false });
    return this.get(actor, id);
  }

  async complete(actor: UserActor, id: string, odometerKm?: number) {
    const { r, rel } = await this.load(actor, id);
    if (!rel.isDriver && !rel.canManage) throw forbidden("Only the assigned driver or the fleet manager can complete this trip.", "NOT_DRIVER");
    if (r.status !== S.IN_PROGRESS) throw this.stateConflict(r.status, "completed");
    await this.finish(actor, r, { odometerKm, gate: false });
    return this.get(actor, id);
  }

  /** Assigned → In progress: the car leaves. The vehicle and driver go On trip. */
  private async begin(actor: UserActor, r: CarFull, opts: { odometerKm?: number; gate: boolean }) {
    const now = new Date();
    const updated = await this.prisma.$transaction(async (tx) => {
      const current = await this.lock(tx, r.id, [S.ASSIGNED], "started");
      if (!current.vehicleId || !current.driverId) throw this.stateConflict(current.status, "started");
      await tx.$queryRaw`SELECT "id" FROM "vehicles" WHERE "id" = ${current.vehicleId} FOR UPDATE`;
      await tx.$queryRaw`SELECT "id" FROM "drivers" WHERE "id" = ${current.driverId} FOR UPDATE`;
      const vehicle = await tx.vehicle.findUniqueOrThrow({ where: { id: current.vehicleId } });
      const driver = await tx.driver.findUniqueOrThrow({ where: { id: current.driverId } });
      if (vehicle.status === VehicleStatus.MAINTENANCE || vehicle.status === VehicleStatus.INACTIVE || !vehicle.active) {
        throw conflict("VEHICLE_UNAVAILABLE", `${vehicleLabel(vehicle)} is ${VEHICLE_STATUS_LABEL[vehicle.status as VehicleStatus].toLowerCase()}. Ask the fleet manager to reassign the trip.`);
      }
      const vehicleOut = await tx.carRequisition.findFirst({ where: { vehicleId: vehicle.id, status: S.IN_PROGRESS, id: { not: r.id } }, select: { referenceNumber: true } });
      if (vehicleOut) throw conflict("VEHICLE_ON_TRIP", `${vehicleLabel(vehicle)} is still out on ${vehicleOut.referenceNumber}. Complete that trip first, or ask the fleet manager to reassign.`);
      const driverOut = await tx.carRequisition.findFirst({ where: { driverId: driver.id, status: S.IN_PROGRESS, id: { not: r.id } }, select: { referenceNumber: true } });
      if (driverOut) throw conflict("DRIVER_ON_TRIP", `${driver.fullName} is still driving ${driverOut.referenceNumber}. Complete that trip first, or ask the fleet manager to reassign.`);
      if (opts.odometerKm !== undefined && opts.odometerKm < vehicle.odometerKm) {
        throw badRequest(`The odometer reading is below the last recorded ${vehicle.odometerKm.toLocaleString("en-US")} km. Check the reading.`, "ODOMETER_BEHIND");
      }
      const startKm = opts.odometerKm ?? vehicle.odometerKm;
      const row = await tx.carRequisition.update({ where: { id: r.id }, data: { status: S.IN_PROGRESS, startedAt: now, statusChangedAt: now, startOdometerKm: startKm } });
      await tx.vehicle.update({ where: { id: vehicle.id }, data: { status: VehicleStatus.ON_TRIP, statusNote: null, statusChangedAt: now, odometerKm: Math.max(vehicle.odometerKm, startKm) } });
      await tx.driver.update({ where: { id: driver.id }, data: { status: DriverStatus.ON_TRIP } });
      await tx.carRequisitionUpdate.create({
        data: {
          requisitionId: r.id,
          type: opts.gate ? CarRequisitionUpdateType.GATE_SCANNED : CarRequisitionUpdateType.STATUS_CHANGED,
          fromStatus: S.ASSIGNED,
          toStatus: S.IN_PROGRESS,
          actorUserId: actor.userId,
          actorName: actor.displayName,
          metadata: { ...(opts.gate ? { direction: GateScanDirection.EXIT } : {}), odometerKm: startKm, vehicle: vehicleLabel(vehicle), driver: driver.fullName },
        },
      });
      await this.audit.record({ actor, action: opts.gate ? "fleet.gate_exit" : "fleet.trip_started", objectType: "car_requisition", objectId: r.id, summary: `${r.referenceNumber}: ${vehicleLabel(vehicle)} left${opts.gate ? " the gate" : ""}`, after: { odometerKm: startKm } }, tx);
      return { row, vehicle, driver };
    });
    await this.notify(updated.row, `fleet:${r.id}:started`, "CAR_TRIP_STARTED", [
      {
        userId: r.requesterUserId,
        category: NotificationCategory.PARCEL_UPDATE,
        title: opts.gate ? "Your car has left the gate" : "Your trip has started",
        body: `${vehicleLabel(updated.vehicle)} with ${updated.driver.fullName} (${updated.driver.phone}) · ${dhakaTime(now)}. ${r.referenceNumber}`,
      },
    ]);
  }

  /** In progress → Completed: the car is back. The vehicle and driver are free again; the odometer moves on. */
  private async finish(actor: UserActor, r: CarFull, opts: { odometerKm?: number; gate: boolean }) {
    const now = new Date();
    const updated = await this.prisma.$transaction(async (tx) => {
      const current = await this.lock(tx, r.id, [S.IN_PROGRESS], "completed");
      await tx.$queryRaw`SELECT "id" FROM "vehicles" WHERE "id" = ${current.vehicleId} FOR UPDATE`;
      await tx.$queryRaw`SELECT "id" FROM "drivers" WHERE "id" = ${current.driverId} FOR UPDATE`;
      const vehicle = await tx.vehicle.findUniqueOrThrow({ where: { id: current.vehicleId! } });
      const driver = await tx.driver.findUniqueOrThrow({ where: { id: current.driverId! } });
      const startKm = current.startOdometerKm ?? 0;
      if (opts.odometerKm !== undefined && opts.odometerKm < startKm) {
        throw badRequest(`The odometer reading is below the ${startKm.toLocaleString("en-US")} km recorded when the trip started. Check the reading.`, "ODOMETER_BEHIND");
      }
      const endKm = opts.odometerKm ?? null;
      const row = await tx.carRequisition.update({ where: { id: r.id }, data: { status: S.COMPLETED, completedAt: now, statusChangedAt: now, endOdometerKm: endKm } });
      const stillOut = (others: number) => others > 0;
      const vehicleOthers = await tx.carRequisition.count({ where: { vehicleId: vehicle.id, status: S.IN_PROGRESS, id: { not: r.id } } });
      await tx.vehicle.update({
        where: { id: vehicle.id },
        data: {
          ...(vehicle.status === VehicleStatus.ON_TRIP && !stillOut(vehicleOthers) ? { status: VehicleStatus.AVAILABLE, statusChangedAt: now } : {}),
          odometerKm: Math.max(vehicle.odometerKm, endKm ?? 0),
        },
      });
      const driverOthers = await tx.carRequisition.count({ where: { driverId: driver.id, status: S.IN_PROGRESS, id: { not: r.id } } });
      if (driver.status === DriverStatus.ON_TRIP && !stillOut(driverOthers)) await tx.driver.update({ where: { id: driver.id }, data: { status: DriverStatus.AVAILABLE } });
      await tx.carRequisitionUpdate.create({
        data: {
          requisitionId: r.id,
          type: opts.gate ? CarRequisitionUpdateType.GATE_SCANNED : CarRequisitionUpdateType.STATUS_CHANGED,
          fromStatus: S.IN_PROGRESS,
          toStatus: S.COMPLETED,
          actorUserId: actor.userId,
          actorName: actor.displayName,
          metadata: { ...(opts.gate ? { direction: GateScanDirection.RETURN } : {}), odometerKm: endKm, distanceKm: endKm !== null ? endKm - startKm : null },
        },
      });
      await this.audit.record({ actor, action: opts.gate ? "fleet.gate_return" : "fleet.trip_completed", objectType: "car_requisition", objectId: r.id, summary: `${r.referenceNumber}: ${vehicleLabel(vehicle)} back${opts.gate ? " through the gate" : ""}`, after: { odometerKm: endKm } }, tx);
      return { row, vehicle, distance: endKm !== null ? endKm - startKm : null };
    });
    await this.notify(updated.row, `fleet:${r.id}:completed`, "CAR_TRIP_COMPLETED", [
      {
        userId: r.requesterUserId,
        category: NotificationCategory.PARCEL_UPDATE,
        title: "Trip completed",
        body: `${vehicleLabel(updated.vehicle)} is back${updated.distance !== null ? ` · ${updated.distance} km` : ""} · ${dhakaTime(now)}. ${r.referenceNumber}`,
      },
    ]);
  }

  async cancel(actor: UserActor, id: string, note?: string) {
    const { r, rel } = await this.load(actor, id);
    if (!rel.isRequester) throw forbidden("Only the person who requested the car can cancel it.", "NOT_REQUESTER");
    if (r.status === S.IN_PROGRESS) throw conflict("CAR_REQUISITION_STATE_CONFLICT", "The trip has already started, so it cannot be cancelled. The driver completes it when the car is back.", { status: r.status });
    if (![S.PENDING_HOD, S.PENDING_FLEET, S.ASSIGNED].includes(r.status as never)) throw this.stateConflict(r.status, "cancelled");
    const text = note?.trim() || null;
    const now = new Date();
    const from = r.status;
    const row = await this.prisma.$transaction(async (tx) => {
      await this.lock(tx, id, [S.PENDING_HOD, S.PENDING_FLEET, S.ASSIGNED], "cancelled");
      // The booking no longer holds its car or driver: overlap checks only look at Assigned and In progress trips.
      const updated = await tx.carRequisition.update({ where: { id }, data: { status: S.CANCELLED, cancelledAt: now, statusChangedAt: now, statusNote: text } });
      await tx.carRequisitionUpdate.create({
        data: { requisitionId: id, type: CarRequisitionUpdateType.STATUS_CHANGED, fromStatus: from, toStatus: S.CANCELLED, note: text, actorUserId: actor.userId, actorName: actor.displayName },
      });
      return updated;
    });
    const drafts: Draft[] = [];
    const body = `${r.referenceNumber} · ${r.requester.displayName} cancelled the trip on ${dhakaTime(r.pickupAt)}${text ? ` — ${text}` : ""}.`;
    if (from === S.PENDING_HOD) drafts.push({ userId: r.approverUserId, category: NotificationCategory.PARCEL_UPDATE, title: "Car request withdrawn", body });
    if (from === S.PENDING_FLEET || from === S.ASSIGNED) {
      for (const userId of await this.fleetManagers()) drafts.push({ userId, category: NotificationCategory.PARCEL_UPDATE, title: "Pool car trip cancelled", body });
    }
    if (from === S.ASSIGNED && r.driver?.userId) drafts.push({ userId: r.driver.userId, category: NotificationCategory.PARCEL_UPDATE, title: "Trip cancelled", body });
    await this.notify(row, `fleet:${id}:cancelled`, "CAR_CANCELLED", drafts);
    return this.get(actor, id);
  }

  // ── Gate passes ──

  private async byToken(token: string): Promise<CarFull> {
    if (!PASS_TOKEN.test(token)) throw notFound(PASS_INVALID, "GATE_PASS_INVALID");
    const r = await this.prisma.carRequisition.findUnique({ where: { gatePassToken: token }, include: INCLUDE });
    if (!r) throw notFound(PASS_INVALID, "GATE_PASS_INVALID");
    return r;
  }

  async pass(actor: UserActor, token: string) {
    return this.serializePass(actor, await this.byToken(token));
  }

  /** Security records the car leaving (starts the trip) or coming back (completes it). */
  async scan(actor: UserActor, token: string, direction: string, odometerKm?: number) {
    const r = await this.byToken(token);
    const view = this.passState(r, new Date());
    if (!this.inScope(actor, r.branchId, r.vehicle?.branchId)) {
      throw forbidden(`This pass is for ${r.vehicle?.branch.name ?? r.branch.name}. Record the exit or return at that office's gate.`, "GATE_OUT_OF_SCOPE");
    }
    if (direction === GateScanDirection.EXIT) {
      if (r.status === S.IN_PROGRESS) throw conflict("GATE_ALREADY_SCANNED", `The exit was already recorded at ${dhakaTime(r.startedAt!)}. Record the return when the car comes back.`);
      if (r.status !== S.ASSIGNED) throw conflict("GATE_PASS_NOT_USABLE", view.message);
      if (view.state === "NOT_YET_VALID") throw conflict("GATE_PASS_NOT_YET_VALID", view.message);
      if (view.state === "EXPIRED") throw conflict("GATE_PASS_EXPIRED", view.message);
      await this.begin(actor, r, { odometerKm, gate: true });
    } else {
      if (r.status === S.COMPLETED) throw conflict("GATE_ALREADY_SCANNED", `The return was already recorded at ${dhakaTime(r.completedAt!)}.`);
      if (r.status === S.ASSIGNED) throw conflict("GATE_PASS_NOT_USABLE", "The car has not left yet. Record the exit first.");
      if (r.status !== S.IN_PROGRESS) throw conflict("GATE_PASS_NOT_USABLE", view.message);
      await this.finish(actor, r, { odometerKm, gate: true });
    }
    return this.pass(actor, token);
  }

  private passState(r: CarFull, now: Date): { state: string; message: string; validFrom: Date; validUntil: Date } {
    const { validFrom, validUntil } = gatePassValidity(r.pickupAt, r.returnAt);
    const v = { validFrom, validUntil };
    switch (r.status) {
      case S.IN_PROGRESS:
        return { ...v, state: "OUT", message: `Out on the trip since ${dhakaTime(r.startedAt!, now)}. Record the return when the car is back.` };
      case S.COMPLETED:
        return { ...v, state: "USED", message: `This trip is complete — the car came back at ${dhakaTime(r.completedAt!, now)}. The pass cannot be used again.` };
      case S.CANCELLED:
        return { ...v, state: "CANCELLED", message: "This trip was cancelled. Do not let the vehicle out on this pass." };
      case S.ASSIGNED:
        if (now.getTime() < validFrom.getTime()) return { ...v, state: "NOT_YET_VALID", message: `This pass is for ${dhakaTime(r.pickupAt, now)}. It opens at ${dhakaTime(validFrom, now)}.` };
        if (now.getTime() > validUntil.getTime()) return { ...v, state: "EXPIRED", message: `This pass expired at ${dhakaTime(validUntil, now)}. Do not let the vehicle out; call the fleet desk.` };
        return { ...v, state: "VALID", message: "Valid. Check the vehicle number and driver, then record the exit." };
      default:
        return { ...v, state: "CANCELLED", message: "This pass is not active. Do not let the vehicle out; call the fleet desk." };
    }
  }

  private serializePass(actor: UserActor, r: CarFull) {
    const now = new Date();
    const view = this.passState(r, now);
    const scanHere = this.inScope(actor, r.branchId, r.vehicle?.branchId);
    const allowed = !scanHere ? [] : view.state === "VALID" ? [GateScanDirection.EXIT] : view.state === "OUT" ? [GateScanDirection.RETURN] : [];
    return {
      state: view.state,
      valid: view.state === "VALID" || view.state === "OUT",
      message: view.message,
      allowed,
      scanHere,
      scanNote: scanHere ? null : `Exit and return are recorded at ${r.vehicle?.branch.name ?? r.branch.name}.`,
      validFrom: view.validFrom,
      validUntil: view.validUntil,
      requisition: {
        id: r.id,
        referenceNumber: r.referenceNumber,
        status: r.status,
        tripType: r.tripType,
        purpose: r.purpose,
        pickupLocation: r.pickupLocation,
        dropLocation: r.dropLocation,
        pickupAt: r.pickupAt,
        returnAt: r.returnAt,
        urgent: r.urgent,
        passengerCount: r.passengerCount,
        startedAt: r.startedAt,
        completedAt: r.completedAt,
        branch: r.branch,
        requester: { name: r.requester.displayName, designation: r.requester.employee?.designation ?? null, department: r.requester.employee?.department?.name ?? null, phone: r.requester.employee?.phone ?? null },
        approver: { name: r.approver.displayName },
      },
      vehicle: r.vehicle ? this.vehicleBrief(r.vehicle) : null,
      driver: r.driver ? { id: r.driver.id, fullName: r.driver.fullName, phone: r.driver.phone, licenseNumber: r.driver.licenseNumber } : null,
      passengers: this.passengers(r.passengers),
      scans: r.updates
        .filter((u) => u.type === CarRequisitionUpdateType.GATE_SCANNED)
        .map((u) => ({ direction: (u.metadata as { direction?: string }).direction ?? null, at: u.createdAt, by: u.actorName })),
    };
  }

  // ── Fleet register ──

  async vehicles(actor: UserActor, q: FleetRegisterQuery) {
    const scope = this.scope(actor);
    const target = q.requisitionId ? await this.target(actor, q.requisitionId) : null;
    const text = q.q?.trim();
    const rows = await this.prisma.vehicle.findMany({
      where: {
        AND: [
          scope ? { branchId: { in: scope } } : {},
          q.branchId ? { branchId: q.branchId } : {},
          q.includeInactive === "true" ? {} : { status: { not: VehicleStatus.INACTIVE } },
          text ? { OR: [{ registrationNumber: { contains: text, mode: "insensitive" } }, { make: { contains: text, mode: "insensitive" } }, { model: { contains: text, mode: "insensitive" } }] } : {},
        ],
      },
      include: { branch: { select: { id: true, name: true, code: true } } },
      orderBy: [{ branch: { name: "asc" } }, { registrationNumber: "asc" }],
    });
    const bookings = await this.prisma.carRequisition.findMany({
      where: { vehicleId: { in: rows.map((v) => v.id) }, status: { in: BOOKED } },
      select: { id: true, referenceNumber: true, status: true, pickupAt: true, returnAt: true, tripType: true, vehicleId: true, driver: { select: { fullName: true } } },
      orderBy: { pickupAt: "asc" },
    });
    const now = new Date();
    return rows.map((v) => this.serializeVehicle(v, bookings.filter((b) => b.vehicleId === v.id), target, now));
  }

  async drivers(actor: UserActor, q: FleetRegisterQuery) {
    const scope = this.scope(actor);
    const target = q.requisitionId ? await this.target(actor, q.requisitionId) : null;
    const text = q.q?.trim();
    const rows = await this.prisma.driver.findMany({
      where: {
        AND: [
          scope ? { branchId: { in: scope } } : {},
          q.branchId ? { branchId: q.branchId } : {},
          q.includeInactive === "true" ? {} : { active: true },
          text ? { OR: [{ fullName: { contains: text, mode: "insensitive" } }, { phone: { contains: text } }, { licenseNumber: { contains: text, mode: "insensitive" } }] } : {},
        ],
      },
      include: { branch: { select: { id: true, name: true, code: true } } },
      orderBy: [{ branch: { name: "asc" } }, { fullName: "asc" }],
    });
    const bookings = await this.prisma.carRequisition.findMany({
      where: { driverId: { in: rows.map((d) => d.id) }, status: { in: BOOKED } },
      select: { id: true, referenceNumber: true, status: true, pickupAt: true, returnAt: true, tripType: true, driverId: true, vehicle: { select: { make: true, model: true, registrationNumber: true } } },
      orderBy: { pickupAt: "asc" },
    });
    const now = new Date();
    return rows.map((d) => this.serializeDriver(d, bookings.filter((b) => b.driverId === d.id), target, now));
  }

  /** The requisition the assign dialog is choosing for (its window and head count). */
  private async target(actor: UserActor, id: string): Promise<Target> {
    const { r } = await this.load(actor, id);
    return { id: r.id, window: carTripWindow(r.pickupAt, r.returnAt, r.tripType), passengerCount: r.passengerCount, preference: r.vehiclePreference };
  }

  async createVehicle(actor: UserActor, dto: CreateVehicleDto) {
    await this.checkBranch(actor, dto.branchId);
    const registrationNumber = dto.registrationNumber.replace(/\s+/g, " ").trim();
    await this.uniqueRegistration(registrationNumber);
    try {
      const v = await this.prisma.vehicle.create({
        data: {
          registrationNumber,
          make: dto.make,
          model: dto.model,
          type: dto.type,
          seats: dto.seats,
          colour: dto.colour || null,
          fuelType: dto.fuelType || null,
          branchId: dto.branchId,
          odometerKm: dto.odometerKm ?? 0,
          nextServiceAt: parseDay(dto.nextServiceAt) ?? null,
          fitnessExpiry: parseDay(dto.fitnessExpiry) ?? null,
          insuranceExpiry: parseDay(dto.insuranceExpiry) ?? null,
          notes: dto.notes?.trim() || null,
        },
      });
      await this.audit.record({ actor, action: "fleet.vehicle_added", objectType: "vehicle", objectId: v.id, summary: `Vehicle added: ${vehicleLabel(v)}`, after: { type: v.type, seats: v.seats, branchId: v.branchId } });
      return this.vehicleById(actor, v.id);
    } catch (err) {
      if (isUniqueViolation(err)) throw conflict("VEHICLE_DUPLICATE", `${registrationNumber} is already in the fleet register.`);
      throw err;
    }
  }

  async updateVehicle(actor: UserActor, id: string, dto: UpdateVehicleDto) {
    const v = await this.prisma.vehicle.findUnique({ where: { id } });
    if (!v || !this.inScope(actor, v.branchId)) throw notFound("Vehicle not found.", "VEHICLE_NOT_FOUND");
    if (dto.branchId && dto.branchId !== v.branchId) await this.checkBranch(actor, dto.branchId);
    const data: Prisma.VehicleUpdateInput = {};
    if (dto.registrationNumber !== undefined) {
      const reg = dto.registrationNumber.replace(/\s+/g, " ").trim();
      if (reg !== v.registrationNumber) {
        await this.uniqueRegistration(reg, id);
        data.registrationNumber = reg;
      }
    }
    if (dto.make !== undefined) data.make = dto.make;
    if (dto.model !== undefined) data.model = dto.model;
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.seats !== undefined) data.seats = dto.seats;
    if (dto.colour !== undefined) data.colour = dto.colour?.trim() || null;
    if (dto.fuelType !== undefined) data.fuelType = dto.fuelType?.trim() || null;
    if (dto.branchId !== undefined) data.branch = { connect: { id: dto.branchId } };
    if (dto.notes !== undefined) data.notes = dto.notes?.trim() || null;
    if (dto.nextServiceAt !== undefined) data.nextServiceAt = parseDay(dto.nextServiceAt);
    if (dto.fitnessExpiry !== undefined) data.fitnessExpiry = parseDay(dto.fitnessExpiry);
    if (dto.insuranceExpiry !== undefined) data.insuranceExpiry = parseDay(dto.insuranceExpiry);
    if (dto.odometerKm !== undefined) {
      if (dto.odometerKm < v.odometerKm) throw badRequest(`The odometer cannot go back from ${v.odometerKm.toLocaleString("en-US")} km.`, "ODOMETER_BEHIND");
      data.odometerKm = dto.odometerKm;
    }
    const statusChanging = dto.status !== undefined && dto.status !== v.status;
    if (statusChanging || (dto.statusNote !== undefined && dto.status !== undefined)) {
      if (v.status === VehicleStatus.ON_TRIP) throw conflict("VEHICLE_ON_TRIP", `${vehicleLabel(v)} is out on a trip. Change its status after the trip is completed.`);
      const next = dto.status!;
      const note = dto.statusNote?.trim() || null;
      if (next !== VehicleStatus.AVAILABLE && (!note || note.length < 3)) {
        throw badRequest(next === VehicleStatus.MAINTENANCE ? "Say what the maintenance is for, e.g. AC compressor replacement." : "Say why the vehicle is out of service.", "STATUS_NOTE_REQUIRED");
      }
      if (next !== VehicleStatus.AVAILABLE) {
        const booked = await this.prisma.carRequisition.findMany({ where: { vehicleId: id, status: S.ASSIGNED }, select: { referenceNumber: true }, orderBy: { pickupAt: "asc" } });
        if (booked.length) {
          throw conflict("VEHICLE_HAS_BOOKINGS", `${vehicleLabel(v)} is booked for ${booked.map((b) => b.referenceNumber).join(", ")}. Reassign ${booked.length === 1 ? "that trip" : "those trips"} first.`, { bookings: booked.map((b) => b.referenceNumber) });
        }
      }
      data.status = next;
      data.statusNote = next === VehicleStatus.AVAILABLE ? null : note;
      data.active = next !== VehicleStatus.INACTIVE;
      if (statusChanging) data.statusChangedAt = new Date();
    }
    try {
      const updated = await this.prisma.vehicle.update({ where: { id }, data });
      const changed = Object.keys(data).filter((k) => k !== "statusChangedAt" && k !== "active");
      if (changed.length) {
        await this.audit.record({
          actor,
          action: statusChanging ? "fleet.vehicle_status_changed" : "fleet.vehicle_updated",
          objectType: "vehicle",
          objectId: id,
          summary: statusChanging ? `${vehicleLabel(updated)}: ${VEHICLE_STATUS_LABEL[v.status as VehicleStatus]} → ${VEHICLE_STATUS_LABEL[updated.status as VehicleStatus]}` : `${vehicleLabel(updated)}: ${changed.join(", ")} updated`,
          before: Object.fromEntries(changed.map((k) => [k, (v as Record<string, unknown>)[k === "branch" ? "branchId" : k]])),
          after: Object.fromEntries(changed.map((k) => [k, (updated as Record<string, unknown>)[k === "branch" ? "branchId" : k]])),
        });
      }
      return this.vehicleById(actor, id);
    } catch (err) {
      if (isUniqueViolation(err)) throw conflict("VEHICLE_DUPLICATE", "Another vehicle already has that registration number.");
      throw err;
    }
  }

  async createDriver(actor: UserActor, dto: CreateDriverDto) {
    await this.checkBranch(actor, dto.branchId);
    const link = dto.employeeId ? await this.driverLink(dto.employeeId) : { employeeId: null, userId: null };
    try {
      const d = await this.prisma.driver.create({
        data: {
          fullName: dto.fullName,
          phone: normalizePhone(dto.phone),
          licenseNumber: dto.licenseNumber.toUpperCase(),
          licenseExpiry: parseDay(dto.licenseExpiry) ?? null,
          branchId: dto.branchId,
          employeeId: link.employeeId,
          userId: link.userId,
        },
      });
      await this.audit.record({ actor, action: "fleet.driver_added", objectType: "driver", objectId: d.id, summary: `Driver added: ${d.fullName}`, after: { branchId: d.branchId, linkedAccount: !!d.userId } });
      return this.driverById(actor, d.id);
    } catch (err) {
      if (isUniqueViolation(err)) throw conflict("DRIVER_ACCOUNT_LINKED", "That person's account is already linked to another driver.");
      throw err;
    }
  }

  async updateDriver(actor: UserActor, id: string, dto: UpdateDriverDto) {
    const d = await this.prisma.driver.findUnique({ where: { id } });
    if (!d || !this.inScope(actor, d.branchId)) throw notFound("Driver not found.", "DRIVER_NOT_FOUND");
    if (dto.branchId && dto.branchId !== d.branchId) await this.checkBranch(actor, dto.branchId);
    const data: Prisma.DriverUpdateInput = {};
    if (dto.fullName !== undefined) data.fullName = dto.fullName;
    if (dto.phone !== undefined) data.phone = normalizePhone(dto.phone);
    if (dto.licenseNumber !== undefined) data.licenseNumber = dto.licenseNumber.toUpperCase();
    if (dto.licenseExpiry !== undefined) data.licenseExpiry = parseDay(dto.licenseExpiry);
    if (dto.branchId !== undefined) data.branch = { connect: { id: dto.branchId } };
    if (dto.employeeId !== undefined) {
      const link = dto.employeeId ? await this.driverLink(dto.employeeId, id) : { employeeId: null, userId: null };
      data.employeeId = link.employeeId;
      data.user = link.userId ? { connect: { id: link.userId } } : { disconnect: true };
    }
    const goingOff = (dto.status === DriverStatus.OFF_DUTY && d.status !== DriverStatus.OFF_DUTY) || (dto.active === false && d.active);
    if (goingOff) {
      if (d.status === DriverStatus.ON_TRIP) throw conflict("DRIVER_ON_TRIP", `${d.fullName} is out on a trip. Change their status after the trip is completed.`);
      const booked = await this.prisma.carRequisition.findMany({ where: { driverId: id, status: S.ASSIGNED }, select: { referenceNumber: true }, orderBy: { pickupAt: "asc" } });
      if (booked.length) {
        throw conflict("DRIVER_HAS_BOOKINGS", `${d.fullName} is booked to drive ${booked.map((b) => b.referenceNumber).join(", ")}. Reassign ${booked.length === 1 ? "that trip" : "those trips"} first.`, { bookings: booked.map((b) => b.referenceNumber) });
      }
    }
    if (dto.status !== undefined && dto.status !== d.status) {
      if (d.status === DriverStatus.ON_TRIP) throw conflict("DRIVER_ON_TRIP", `${d.fullName} is out on a trip. Change their status after the trip is completed.`);
      data.status = dto.status;
    }
    if (dto.active !== undefined) data.active = dto.active;
    try {
      const updated = await this.prisma.driver.update({ where: { id }, data });
      const changed = Object.keys(data);
      if (changed.length) {
        await this.audit.record({
          actor,
          action: "fleet.driver_updated",
          objectType: "driver",
          objectId: id,
          summary: `${updated.fullName}: ${changed.map((k) => (k === "user" ? "account link" : k)).join(", ")} updated`,
          before: { status: d.status, active: d.active, branchId: d.branchId },
          after: { status: updated.status, active: updated.active, branchId: updated.branchId },
        });
      }
      return this.driverById(actor, id);
    } catch (err) {
      if (isUniqueViolation(err)) throw conflict("DRIVER_ACCOUNT_LINKED", "That person's account is already linked to another driver.");
      throw err;
    }
  }

  private async vehicleById(actor: UserActor, id: string) {
    const v = await this.prisma.vehicle.findUniqueOrThrow({ where: { id }, include: { branch: { select: { id: true, name: true, code: true } } } });
    const bookings = await this.prisma.carRequisition.findMany({
      where: { vehicleId: id, status: { in: BOOKED } },
      select: { id: true, referenceNumber: true, status: true, pickupAt: true, returnAt: true, tripType: true, vehicleId: true, driver: { select: { fullName: true } } },
      orderBy: { pickupAt: "asc" },
    });
    return this.serializeVehicle(v, bookings, null, new Date());
  }

  private async driverById(actor: UserActor, id: string) {
    const d = await this.prisma.driver.findUniqueOrThrow({ where: { id }, include: { branch: { select: { id: true, name: true, code: true } } } });
    const bookings = await this.prisma.carRequisition.findMany({
      where: { driverId: id, status: { in: BOOKED } },
      select: { id: true, referenceNumber: true, status: true, pickupAt: true, returnAt: true, tripType: true, driverId: true, vehicle: { select: { make: true, model: true, registrationNumber: true } } },
      orderBy: { pickupAt: "asc" },
    });
    return this.serializeDriver(d, bookings, null, new Date());
  }

  private async checkBranch(actor: UserActor, branchId: string) {
    const branch = await this.prisma.branch.findUnique({ where: { id: branchId } });
    if (!branch || !branch.active) throw badRequest("Choose an active office.", "BRANCH_INVALID");
    if (!this.inScope(actor, branchId)) throw forbidden("You can only manage vehicles and drivers for your own offices.");
  }

  private async uniqueRegistration(registrationNumber: string, exceptId?: string) {
    const clash = await this.prisma.vehicle.findFirst({ where: { registrationNumber: { equals: registrationNumber, mode: "insensitive" }, ...(exceptId ? { id: { not: exceptId } } : {}) } });
    if (clash) throw conflict("VEHICLE_DUPLICATE", `${clash.registrationNumber} is already in the fleet register.`);
  }

  /** A driver linked to a directory entry; if that person can sign in, their trips appear in their app. */
  private async driverLink(employeeId: string, exceptDriverId?: string) {
    const emp = await this.prisma.employee.findUnique({ where: { id: employeeId }, include: { user: { select: { id: true, active: true } } } });
    if (!emp) throw badRequest("Choose the driver from the directory.", "EMPLOYEE_INVALID");
    const userId = emp.user?.active ? emp.user.id : null;
    if (userId) {
      const other = await this.prisma.driver.findFirst({ where: { userId, ...(exceptDriverId ? { id: { not: exceptDriverId } } : {}) } });
      if (other) throw conflict("DRIVER_ACCOUNT_LINKED", `${emp.fullName}'s account is already linked to the driver record "${other.fullName}".`);
    }
    return { employeeId: emp.id, userId };
  }

  // ── Notifications ──

  private async fleetManagers(): Promise<string[]> {
    const managers = await this.notifications.usersWithRoles([RoleCode.FLEET_MANAGER]);
    return managers.length ? managers : this.notifications.headOfficeUsers();
  }

  /** A notification failure never undoes the action. */
  private async notify(r: { id: string; referenceNumber: string; status: string }, key: string, eventType: string, drafts: Draft[]) {
    try {
      await this.notifications.deliverModule({ module: "fleet", id: r.id, reference: r.referenceNumber, route: `/pool-car/${r.id}`, status: r.status }, key, eventType, drafts);
    } catch (err) {
      this.logger.error(`Pool car notification ${key} failed: ${(err as Error).message}`);
    }
  }

  // ── Shapes ──

  private passengers(raw: Prisma.JsonValue): { name: string; phone: string | null }[] {
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((p): p is Prisma.JsonObject => !!p && typeof p === "object" && !Array.isArray(p))
      .map((p) => ({ name: String(p.name ?? ""), phone: typeof p.phone === "string" && p.phone ? p.phone : null }))
      .filter((p) => p.name);
  }

  private vehicleBrief(v: { id: string; registrationNumber: string; make: string; model: string; type: string; seats: number; colour: string | null; status: string }) {
    return { id: v.id, registrationNumber: v.registrationNumber, make: v.make, model: v.model, name: vehicleName(v), type: v.type, typeLabel: VEHICLE_TYPE_LABEL[v.type as VehicleType] ?? v.type, seats: v.seats, colour: v.colour, status: v.status };
  }

  private actionsFor(r: { status: string }, rel: Relation): string[] {
    const out: string[] = [];
    switch (r.status) {
      case S.PENDING_HOD:
        if (rel.isApprover) out.push(A.APPROVE, A.REJECT);
        break;
      case S.PENDING_FLEET:
        if (rel.canManage) out.push(A.ASSIGN, A.REJECT);
        break;
      case S.ASSIGNED:
        if (rel.canManage) out.push(A.REASSIGN);
        if (rel.isDriver || rel.canManage) out.push(A.START);
        break;
      case S.IN_PROGRESS:
        if (rel.isDriver || rel.canManage) out.push(A.COMPLETE);
        break;
    }
    if (rel.isRequester && [S.PENDING_HOD, S.PENDING_FLEET, S.ASSIGNED].includes(r.status as never)) out.push(A.CANCEL);
    return out;
  }

  /** Pending HOD → Pending fleet manager → Assigned → In progress → Completed, with when each step was reached. */
  private pipeline(r: { status: string; createdAt: Date; hodApprovedAt: Date | null; assignedAt: Date | null; startedAt: Date | null; completedAt: Date | null; rejectedAt: Date | null; cancelledAt: Date | null; statusNote: string | null }) {
    const at: Record<string, Date | null> = { PENDING_HOD: r.createdAt, PENDING_FLEET: r.hodApprovedAt, ASSIGNED: r.assignedAt, IN_PROGRESS: r.startedAt, COMPLETED: r.completedAt };
    const halted = r.status === S.REJECTED || r.status === S.CANCELLED;
    const reached = halted ? (r.startedAt ? 3 : r.assignedAt ? 2 : r.hodApprovedAt ? 1 : 0) : CAR_REQUISITION_PIPELINE.indexOf(r.status as CarRequisitionStatus);
    const steps = CAR_REQUISITION_PIPELINE.map((status, i) => ({
      status,
      label: statusLabel(status),
      at: i <= reached ? at[status] : null,
      state: r.status === S.COMPLETED || i < reached ? "DONE" : i === reached ? (halted ? "HALTED" : "CURRENT") : "UPCOMING",
    }));
    return {
      steps,
      outcome: halted ? { status: r.status, label: statusLabel(r.status), at: r.status === S.REJECTED ? r.rejectedAt : r.cancelledAt, note: r.statusNote } : null,
    };
  }

  private serialize(actor: UserActor, r: CarFull, rel: Relation) {
    const passVisible = !!r.gatePassToken && (r.status === S.ASSIGNED || r.status === S.IN_PROGRESS) && (rel.isRequester || rel.isDriver || rel.canManage);
    const validity = gatePassValidity(r.pickupAt, r.returnAt);
    const window = carTripWindow(r.pickupAt, r.returnAt, r.tripType);
    return {
      id: r.id,
      referenceNumber: r.referenceNumber,
      status: r.status,
      statusNote: r.statusNote,
      statusChangedAt: r.statusChangedAt,
      tripType: r.tripType,
      purpose: r.purpose,
      pickupLocation: r.pickupLocation,
      dropLocation: r.dropLocation,
      pickupAt: r.pickupAt,
      returnAt: r.returnAt,
      expectedEndAt: window.end,
      passengers: this.passengers(r.passengers),
      passengerCount: r.passengerCount,
      urgent: r.urgent,
      vehiclePreference: r.vehiclePreference,
      branch: r.branch,
      requester: {
        userId: r.requester.id,
        name: r.requester.displayName,
        employeeCode: r.requester.employee?.employeeCode ?? null,
        designation: r.requester.employee?.designation ?? null,
        department: r.requester.employee?.department?.name ?? null,
        phone: r.requester.employee?.phone ?? null,
      },
      approver: { userId: r.approver.id, name: r.approver.displayName, designation: r.approver.employee?.designation ?? null },
      vehicle: r.vehicle ? this.vehicleBrief(r.vehicle) : null,
      driver: r.driver ? { id: r.driver.id, fullName: r.driver.fullName, phone: r.driver.phone, hasAccount: !!r.driver.userId } : null,
      odometer: {
        startKm: r.startOdometerKm,
        endKm: r.endOdometerKm,
        distanceKm: r.startOdometerKm !== null && r.endOdometerKm !== null ? r.endOdometerKm - r.startOdometerKm : null,
        vehicleKm: r.vehicle?.odometerKm ?? null,
      },
      createdAt: r.createdAt,
      hodApprovedAt: r.hodApprovedAt,
      assignedAt: r.assignedAt,
      startedAt: r.startedAt,
      completedAt: r.completedAt,
      rejectedAt: r.rejectedAt,
      cancelledAt: r.cancelledAt,
      pipeline: this.pipeline(r),
      gatePass: passVisible
        ? { payload: gatePassPayload(this.config.publicQrBaseUrl, GatePassKind.VEHICLE, r.gatePassToken!), token: r.gatePassToken, validFrom: validity.validFrom, validUntil: validity.validUntil }
        : null,
      updates: r.updates.map((u) => ({
        id: u.id,
        type: u.type,
        fromStatus: u.fromStatus,
        toStatus: u.toStatus,
        note: u.note,
        actor: u.actorName,
        byMe: u.actorUserId === actor.userId,
        metadata: u.metadata,
        createdAt: u.createdAt,
      })),
      viewer: { ...rel, actions: this.actionsFor(r, rel) },
    };
  }

  private serializeRow(actor: UserActor, r: CarRow) {
    return {
      id: r.id,
      referenceNumber: r.referenceNumber,
      status: r.status,
      statusNote: r.statusNote,
      statusChangedAt: r.statusChangedAt,
      tripType: r.tripType,
      purpose: r.purpose,
      pickupLocation: r.pickupLocation,
      dropLocation: r.dropLocation,
      pickupAt: r.pickupAt,
      returnAt: r.returnAt,
      passengerCount: r.passengerCount,
      urgent: r.urgent,
      vehiclePreference: r.vehiclePreference,
      branch: r.branch,
      requester: {
        name: r.requester.displayName,
        employeeCode: r.requester.employee?.employeeCode ?? null,
        designation: r.requester.employee?.designation ?? null,
        department: r.requester.employee?.department?.name ?? null,
      },
      approverName: r.approver.displayName,
      vehicle: r.vehicle ? { id: r.vehicle.id, registrationNumber: r.vehicle.registrationNumber, name: vehicleName(r.vehicle), type: r.vehicle.type, seats: r.vehicle.seats } : null,
      driver: r.driver ? { id: r.driver.id, fullName: r.driver.fullName, phone: r.driver.phone } : null,
      awaiting: r.status === S.PENDING_HOD ? "HOD" : r.status === S.PENDING_FLEET ? "FLEET" : null,
      mine: r.requesterUserId === actor.userId,
      awaitingMe: (r.status === S.PENDING_HOD && r.approverUserId === actor.userId) || (r.status === S.PENDING_FLEET && actor.capabilities.has(Capability.FLEET_MANAGE) && this.inScope(actor, r.branchId)),
      createdAt: r.createdAt,
    };
  }

  private bookingBrief(b: Booking, now: Date) {
    const w = this.holdWindow(b, now);
    return { id: b.id, referenceNumber: b.referenceNumber, status: b.status, pickupAt: b.pickupAt, until: w.end };
  }

  private serializeVehicle(v: VehicleWithBranch, bookings: (Booking & { driver: { fullName: string } | null })[], target: Target | null, now: Date) {
    const others = bookings.filter((b) => b.id !== target?.id);
    const current = bookings.find((b) => b.status === S.IN_PROGRESS) ?? null;
    const next = bookings.find((b) => b.status === S.ASSIGNED && b.id !== target?.id) ?? null;
    const alerts = (
      [
        ["SERVICE", v.nextServiceAt],
        ["FITNESS", v.fitnessExpiry],
        ["INSURANCE", v.insuranceExpiry],
      ] as const
    )
      .map(([kind, date]) => ({ kind, date: isoDay(date), state: fleetDateState(date, now) }))
      .filter((a) => a.state);
    let availability: { available: boolean; code: string | null; reason: string | null; conflict: unknown; matchesPreference: boolean | null };
    if (v.status === VehicleStatus.MAINTENANCE || v.status === VehicleStatus.INACTIVE || !v.active) {
      availability = { available: false, code: v.status, reason: `${VEHICLE_STATUS_LABEL[v.status as VehicleStatus]}${v.statusNote ? ` — ${v.statusNote}` : ""}`, conflict: null, matchesPreference: null };
    } else if (target) {
      const clash = others.find((b) => carWindowsOverlap(target.window, this.holdWindow(b, now)));
      const matchesPreference = target.preference === "ANY" || target.preference === v.type;
      if (v.seats < target.passengerCount) availability = { available: false, code: "SEATS", reason: `Seats ${v.seats}; the trip needs ${target.passengerCount}`, conflict: null, matchesPreference };
      else if (clash) availability = { available: false, code: "BOOKED", reason: `Booked for ${clash.referenceNumber} (${dhakaTime(clash.pickupAt, now)})`, conflict: this.bookingBrief(clash, now), matchesPreference };
      else availability = { available: true, code: null, reason: null, conflict: null, matchesPreference };
    } else {
      availability = current
        ? { available: false, code: "ON_TRIP", reason: `On ${current.referenceNumber}`, conflict: this.bookingBrief(current, now), matchesPreference: null }
        : { available: true, code: null, reason: null, conflict: null, matchesPreference: null };
    }
    return {
      ...this.vehicleBrief(v),
      colour: v.colour,
      fuelType: v.fuelType,
      branch: v.branch,
      statusLabel: VEHICLE_STATUS_LABEL[v.status as VehicleStatus] ?? v.status,
      statusNote: v.statusNote,
      statusChangedAt: v.statusChangedAt,
      odometerKm: v.odometerKm,
      nextServiceAt: isoDay(v.nextServiceAt),
      fitnessExpiry: isoDay(v.fitnessExpiry),
      insuranceExpiry: isoDay(v.insuranceExpiry),
      notes: v.notes,
      active: v.active,
      alerts,
      currentTrip: current ? { ...this.bookingBrief(current, now), driverName: current.driver?.fullName ?? null } : null,
      nextTrip: next ? { ...this.bookingBrief(next, now), driverName: next.driver?.fullName ?? null } : null,
      upcomingTrips: bookings.filter((b) => b.status === S.ASSIGNED).length,
      availability,
    };
  }

  private serializeDriver(d: DriverWithBranch, bookings: (Booking & { vehicle: { make: string; model: string; registrationNumber: string } | null })[], target: Target | null, now: Date) {
    const others = bookings.filter((b) => b.id !== target?.id);
    const current = bookings.find((b) => b.status === S.IN_PROGRESS) ?? null;
    const next = bookings.find((b) => b.status === S.ASSIGNED && b.id !== target?.id) ?? null;
    const licenseState = fleetDateState(d.licenseExpiry, now);
    let availability: { available: boolean; code: string | null; reason: string | null; conflict: unknown };
    if (!d.active || d.status === DriverStatus.OFF_DUTY) {
      availability = { available: false, code: d.active ? "OFF_DUTY" : "INACTIVE", reason: d.active ? "Off duty" : "No longer in the driver pool", conflict: null };
    } else if (target) {
      const clash = others.find((b) => carWindowsOverlap(target.window, this.holdWindow(b, now)));
      availability = clash
        ? { available: false, code: "BOOKED", reason: `Driving ${clash.referenceNumber} (${dhakaTime(clash.pickupAt, now)})`, conflict: this.bookingBrief(clash, now) }
        : { available: true, code: null, reason: null, conflict: null };
    } else {
      availability = current ? { available: false, code: "ON_TRIP", reason: `On ${current.referenceNumber}`, conflict: this.bookingBrief(current, now) } : { available: true, code: null, reason: null, conflict: null };
    }
    return {
      id: d.id,
      fullName: d.fullName,
      phone: d.phone,
      licenseNumber: d.licenseNumber,
      licenseExpiry: isoDay(d.licenseExpiry),
      licenseAlert: licenseState ? { state: licenseState, date: isoDay(d.licenseExpiry) } : null,
      branch: d.branch,
      status: d.status,
      statusLabel: DRIVER_STATUS_LABEL[d.status as DriverStatus] ?? d.status,
      active: d.active,
      employeeId: d.employeeId,
      hasAccount: !!d.userId,
      currentTrip: current ? { ...this.bookingBrief(current, now), vehicle: current.vehicle ? vehicleLabel(current.vehicle) : null } : null,
      nextTrip: next ? { ...this.bookingBrief(next, now), vehicle: next.vehicle ? vehicleLabel(next.vehicle) : null } : null,
      upcomingTrips: bookings.filter((b) => b.status === S.ASSIGNED).length,
      availability,
    };
  }
}
