import { Inject, Injectable } from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import type { CarrierAssignment, Parcel, ParcelEvent, Prisma } from "@prisma/client";
import {
  ActorType,
  AssignmentStatus,
  Capability,
  CarrierType,
  Classification,
  EventType,
  ExternalStatus,
  IN_CUSTODY_STATUSES,
  OtpPurpose,
  ParcelStatus,
  ProofType,
  ReceiverType,
  STATUS_LABEL,
  VerificationMethod,
  canTransition,
  extractQrToken,
  isTerminal,
  maskPhone,
} from "@abg-dispatch/shared";
import { APP_CONFIG, type AppConfig } from "../common/config";
import { PrismaService, Tx, isUniqueViolation } from "../common/prisma.service";
import { badRequest, conflict, forbidden, notFound, PARCEL_NOT_FOUND, tooMany } from "../common/errors";
import { randomDigits, randomToken } from "../common/crypto";
import { dhakaTime } from "../common/time";
import { actorKey, type Actor, type UserActor } from "../common/actor";
import { AuditService } from "../audit/audit.service";
import { OtpService } from "../auth/otp.service";
import { NotificationService } from "../notifications/notification.service";
import { SmsService, normalizePhone } from "../notifications/sms.service";
import { RealtimeService } from "../realtime/realtime.service";
import { ACCESS_SELECT, AccessFacts, ParcelAccessService } from "./parcel-access.service";
import { EventActor, EventInput, LedgerService, SYSTEM_ACTOR, eventActor } from "./ledger.service";
import { TrackingNumberService } from "./tracking-number.service";
import { ParcelQueryService } from "./parcel-query.service";
import type {
  ActionContextDto,
  AssignCarrierDto,
  CarrierInput,
  CheckpointDto,
  CompleteReturnDto,
  ConfirmHandoverDto,
  CorrectionDto,
  CreateParcelDto,
  ExternalStatusDto,
  ReasonDto,
  ReceiveDto,
  RecordExceptionDto,
  RequestReceiptCodeDto,
  ResolveExceptionDto,
  UpdateSlaDto,
} from "./dto/parcel.dto";

const LIVE = [AssignmentStatus.ASSIGNED, AssignmentStatus.ACCEPTED, AssignmentStatus.IN_CUSTODY] as string[];

type LockedParcel = Parcel & { assignments: CarrierAssignment[] };

interface RunContext {
  record: (input: EventInput) => Promise<ParcelEvent>;
  events: ParcelEvent[];
}

interface ExternalActor {
  provider: { id: string; code: string; name: string };
  externalEventId?: string;
}

/**
 * Every state-changing operation on a parcel. Each one:
 *   1. checks the caller can see the parcel (404 otherwise),
 *   2. opens a transaction and row-locks the parcel,
 *   3. re-checks state and permission against the locked row,
 *   4. writes the parcel, the ledger events and any proof in that transaction,
 *   5. after commit, fans out notifications and the live feed.
 * Clients never send a status; they ask for an action and the server decides.
 */
@Injectable()
export class ParcelWorkflowService {
  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    private readonly prisma: PrismaService,
    private readonly access: ParcelAccessService,
    private readonly ledger: LedgerService,
    private readonly tracking: TrackingNumberService,
    private readonly query: ParcelQueryService,
    private readonly notifications: NotificationService,
    private readonly realtime: RealtimeService,
    private readonly audit: AuditService,
    private readonly otp: OtpService,
    private readonly sms: SmsService,
  ) {}

  // ─── plumbing ──────────────────────────────────────────────────────────────

  private async run<T>(
    actor: Actor | null,
    parcelId: string,
    fn: (tx: Tx, state: LockedParcel, ctx: RunContext) => Promise<T>,
  ): Promise<{ result: T; events: ParcelEvent[] }> {
    const events: ParcelEvent[] = [];
    let result: T;
    try {
      result = await this.prisma.$transaction(
        async (tx) => {
          const locked = await this.ledger.lock(tx, parcelId);
          const state = Object.assign(locked, {
            assignments: await tx.carrierAssignment.findMany({ where: { parcelId } }),
          }) as LockedParcel;
          const ctx: RunContext = {
            events,
            record: async (input) => {
              const event = await this.ledger.record(tx, state, input);
              events.push(event);
              return event;
            },
          };
          return fn(tx, state, ctx);
        },
        { timeout: 20_000, maxWait: 10_000 },
      );
    } catch (err) {
      // The same idempotency key reached the ledger twice: the first attempt won, report its outcome.
      if (isUniqueViolation(err, "idempotencyKey")) {
        events.length = 0;
        return { result: undefined as T, events };
      }
      throw err;
    }
    await this.afterCommit(parcelId, events);
    void actor;
    return { result, events };
  }

  private async afterCommit(parcelId: string, events: ParcelEvent[]) {
    if (!events.length) return;
    await this.notifications.onEvents(parcelId, events);
    const p = await this.prisma.parcel.findUnique({
      where: { id: parcelId },
      select: { trackingNumber: true, status: true, originBranchId: true, destinationBranchId: true },
    });
    if (p) {
      this.realtime.publish({
        parcelId,
        trackingNumber: p.trackingNumber,
        status: p.status,
        eventTypes: events.map((e) => e.eventType),
        originBranchId: p.originBranchId,
        destinationBranchId: p.destinationBranchId,
        at: new Date().toISOString(),
      });
    }
  }

  private async respond(actor: Actor, parcelId: string, extra: Record<string, unknown> = {}) {
    return { parcel: await this.query.getOrSummary(actor, parcelId), ...extra };
  }

  private idem(actor: Actor, key: string | undefined, suffix: string): string | null {
    return key ? `${actorKey(actor)}:${key}:${suffix}` : null;
  }

  private ctxFields(dto: ActionContextDto | undefined) {
    return {
      latitude: dto?.latitude ?? null,
      longitude: dto?.longitude ?? null,
      deviceTimestamp: dto?.deviceTimestamp ? new Date(dto.deviceTimestamp) : null,
      notes: dto?.notes ?? null,
    };
  }

  private async locationSnapshot(tx: Tx, locationId: string | null | undefined, branchId?: string | null) {
    if (!locationId) return null;
    const loc = await tx.location.findUnique({ where: { id: locationId } });
    if (!loc || !loc.active) throw badRequest("That location does not exist or is no longer in use.", "INVALID_LOCATION");
    if (branchId && loc.branchId !== branchId) throw badRequest("That location belongs to a different office.", "INVALID_LOCATION");
    return { id: loc.id, name: loc.path };
  }

  private requireEmployee(actor: Actor): UserActor & { employeeId: string } {
    if (actor.kind !== "user" || !actor.employeeId) throw forbidden("Only ABG employees can do this.", "EMPLOYEE_ONLY");
    return actor as UserActor & { employeeId: string };
  }

  private async facts(actor: Actor, parcelId: string): Promise<AccessFacts> {
    return (await this.access.assertView(actor, parcelId)).facts;
  }

  private factsOf(state: LockedParcel): AccessFacts {
    return {
      id: state.id,
      status: state.status,
      classification: state.classification,
      createdById: state.createdById,
      senderEmployeeId: state.senderEmployeeId,
      receiverType: state.receiverType,
      receiverEmployeeId: state.receiverEmployeeId,
      receiverDepartmentId: state.receiverDepartmentId,
      actualReceiverEmployeeId: state.actualReceiverEmployeeId,
      originBranchId: state.originBranchId,
      destinationBranchId: state.destinationBranchId,
      currentAssignmentId: state.currentAssignmentId,
      assignments: state.assignments.map((a) => ({ id: a.id, employeeId: a.employeeId, guestCarrierId: a.guestCarrierId, status: a.status })),
    };
  }

  private current(state: LockedParcel): CarrierAssignment | null {
    const a = state.assignments.find((x) => x.id === state.currentAssignmentId);
    return a && LIVE.includes(a.status) ? a : null;
  }

  private async describeReceipt(state: Parcel): Promise<string> {
    return `This parcel was already received by ${state.actualReceiverName ?? "the receiver"} at ${dhakaTime(state.receivedAt ?? new Date())}.`;
  }

  // ─── booking ───────────────────────────────────────────────────────────────

  async create(actor: Actor, dto: CreateParcelDto, idemKey?: string) {
    const me = this.requireEmployee(actor);
    if (!me.capabilities.has(Capability.PARCEL_CREATE)) throw forbidden("Your role cannot book parcels.", "MISSING_CAPABILITY");
    if (dto.carrier && dto.carrier.type !== dto.deliveryMethod) {
      throw badRequest("The carrier type must match the delivery method.", "CARRIER_MISMATCH");
    }

    const category = await this.prisma.parcelCategory.findUnique({ where: { id: dto.categoryId } });
    if (!category || !category.active) throw badRequest("Choose an active parcel category.", "INVALID_CATEGORY");

    const sender = await this.prisma.employee.findUnique({
      where: { id: dto.senderEmployeeId ?? me.employeeId },
      include: { branch: true, department: true },
    });
    if (!sender || sender.status !== "ACTIVE") throw badRequest("The sender must be an active employee.", "INVALID_SENDER");

    let originLocationId = dto.originLocationId ?? sender.defaultLocationId ?? sender.department?.locationId ?? null;
    if (dto.originLocationId) {
      const loc = await this.prisma.location.findUnique({ where: { id: dto.originLocationId } });
      if (!loc || loc.branchId !== sender.branchId) throw badRequest("The origin must be a location in the sender's office.", "INVALID_LOCATION");
      originLocationId = loc.id;
    }

    // Resolve receiver and destination.
    let receiverEmployeeId: string | null = null;
    let receiverDepartmentId: string | null = null;
    let destinationBranchId: string | null = dto.destinationBranchId ?? null;
    let destinationLocationId: string | null = dto.destinationLocationId ?? null;
    let external: CreateParcelDto["externalReceiver"] | null = null;
    switch (dto.receiverType) {
      case ReceiverType.EMPLOYEE: {
        const r = await this.prisma.employee.findUnique({ where: { id: dto.receiverEmployeeId! }, include: { department: true } });
        if (!r || r.status !== "ACTIVE") throw badRequest("The receiver must be an active employee.", "INVALID_RECEIVER");
        if (r.id === sender.id) throw badRequest("The sender and receiver cannot be the same person.", "INVALID_RECEIVER");
        receiverEmployeeId = r.id;
        destinationBranchId ??= r.branchId;
        destinationLocationId ??= r.defaultLocationId ?? r.department?.locationId ?? null;
        break;
      }
      case ReceiverType.DEPARTMENT: {
        const d = await this.prisma.department.findUnique({ where: { id: dto.receiverDepartmentId! } });
        if (!d || !d.active) throw badRequest("Choose an active receiving department.", "INVALID_RECEIVER");
        receiverDepartmentId = d.id;
        destinationBranchId = d.branchId;
        destinationLocationId ??= d.locationId;
        break;
      }
      case ReceiverType.BRANCH: {
        const b = await this.prisma.branch.findUnique({ where: { id: dto.destinationBranchId! } });
        if (!b || !b.active) throw badRequest("Choose an active destination office.", "INVALID_DESTINATION");
        break;
      }
      case ReceiverType.EXTERNAL:
        external = dto.externalReceiver!;
        destinationBranchId = null;
        destinationLocationId = null;
        break;
    }
    if (destinationLocationId) {
      const loc = await this.prisma.location.findUnique({ where: { id: destinationLocationId } });
      if (!loc || loc.branchId !== destinationBranchId) throw badRequest("The destination location must be inside the destination office.", "INVALID_LOCATION");
    }

    const pin = randomDigits(6);
    const pinHash = await bcrypt.hash(pin, 8);
    const draft = !!dto.saveAsDraft;
    const now = new Date();
    const events: ParcelEvent[] = [];
    const who = eventActor(me);

    const parcel = await this.prisma.$transaction(async (tx) => {
      const trackingNumber = await this.tracking.next(tx, sender.branch.code, now);
      const created = await tx.parcel.create({
        data: {
          trackingNumber,
          qrToken: randomToken(18),
          title: dto.title.trim(),
          description: dto.description.trim(),
          categoryId: category.id,
          classification: dto.classification,
          priority: dto.priority,
          status: draft ? ParcelStatus.DRAFT : ParcelStatus.BOOKED,
          deliveryMethod: dto.deliveryMethod,
          createdById: me.userId,
          senderEmployeeId: sender.id,
          senderDepartmentId: sender.departmentId,
          originBranchId: sender.branchId,
          originLocationId,
          receiverType: dto.receiverType,
          receiverEmployeeId,
          receiverDepartmentId,
          externalReceiverName: external?.name ?? null,
          externalReceiverPhone: external ? normalizePhone(external.phone) : null,
          externalReceiverOrganization: external?.organization ?? null,
          externalReceiverAddress: external?.address ?? null,
          destinationBranchId,
          destinationLocationId,
          expectedDeliveryAt: dto.expectedDeliveryAt ? new Date(dto.expectedDeliveryAt) : null,
          handoverPinHash: pinHash,
          bookedAt: draft ? null : now,
          statusChangedAt: now,
        },
      });
      const state = Object.assign(created, { assignments: [] as CarrierAssignment[] }) as LockedParcel;
      events.push(
        await this.ledger.record(tx, state, {
          eventType: EventType.PARCEL_CREATED,
          actor: who,
          initial: true,
          location: originLocationId ? await this.locationSnapshot(tx, originLocationId) : { id: null, name: sender.branch.name },
          metadata: { sentOnBehalf: sender.id !== me.employeeId, senderName: sender.fullName, draft },
          idempotencyKey: this.idem(me, idemKey, "create"),
          at: now,
        }),
      );
      if (dto.carrier) {
        const assignment = await this.createAssignment(tx, me, state, dto.carrier);
        events.push(
          await this.ledger.record(tx, state, {
            eventType: EventType.CARRIER_ASSIGNED,
            actor: who,
            toStatus: draft ? undefined : ParcelStatus.AWAITING_PICKUP,
            patch: { currentAssignmentId: assignment.id, carrierAssignedAt: draft ? null : now },
            carrierAssignmentId: assignment.id,
            metadata: { carrierType: assignment.carrierType, carrierName: assignment.carrierNameSnapshot },
          }),
        );
      }
      await this.audit.record(
        { actor: me, action: "parcel.created", objectType: "parcel", objectId: created.id, summary: `Booked ${trackingNumber}`, after: { trackingNumber, title: created.title, classification: created.classification } },
        tx,
      );
      return created;
    });
    await this.afterCommit(parcel.id, events);
    const showPin = dto.deliveryMethod !== CarrierType.EXTERNAL_COURIER;
    return this.respond(me, parcel.id, showPin ? { handoverPin: pin } : {});
  }

  async bookDraft(actor: Actor, parcelId: string) {
    await this.facts(actor, parcelId);
    await this.run(actor, parcelId, async (tx, state, ctx) => {
      if (!this.access.isSenderSide(actor, this.factsOf(state))) throw forbidden("Only the sender can book this draft.");
      if (state.status !== ParcelStatus.DRAFT) throw conflict("STATE_CONFLICT", "This parcel is already booked.");
      const now = new Date();
      await ctx.record({ eventType: EventType.PARCEL_BOOKED, actor: eventActor(actor), toStatus: ParcelStatus.BOOKED, patch: { bookedAt: now } });
      if (this.current(state)) {
        await ctx.record({ eventType: EventType.CARRIER_ASSIGNED, actor: eventActor(actor), toStatus: ParcelStatus.AWAITING_PICKUP, patch: { carrierAssignedAt: now } });
      }
    });
    return this.respond(actor, parcelId);
  }

  private async createAssignment(tx: Tx, actor: UserActor, state: LockedParcel, input: CarrierInput, initialStatus: string = AssignmentStatus.ASSIGNED) {
    const base = { parcelId: state.id, carrierType: input.type, status: initialStatus, assignedByUserId: actor.userId };
    let assignment: CarrierAssignment;
    if (input.type === CarrierType.INTERNAL_EMPLOYEE) {
      const e = await tx.employee.findUnique({ where: { id: input.employeeId! } });
      if (!e || e.status !== "ACTIVE") throw badRequest("The courier must be an active employee.", "INVALID_CARRIER");
      assignment = await tx.carrierAssignment.create({
        data: { ...base, employeeId: e.id, carrierNameSnapshot: e.fullName, carrierPhoneSnapshot: e.phone, carrierCodeSnapshot: e.employeeCode },
      });
    } else if (input.type === CarrierType.GUEST_PERSON) {
      const g = input.guest!;
      const phone = normalizePhone(g.phone);
      if (!/^01\d{9}$/.test(phone)) throw badRequest("Enter the guest's 11-digit Bangladeshi mobile number.", "INVALID_PHONE");
      const existing = await tx.guestCarrier.findFirst({ where: { phone }, orderBy: { createdAt: "desc" } });
      const details = {
        fullName: g.fullName.trim(),
        company: g.company ?? null,
        idType: g.idType ?? null,
        idReference: g.idReference ?? null,
        vehicleNumber: g.vehicleNumber ?? null,
        notes: g.notes ?? null,
      };
      const guest = existing
        ? await tx.guestCarrier.update({ where: { id: existing.id }, data: details })
        : await tx.guestCarrier.create({ data: { ...details, phone, createdByUserId: actor.userId } });
      assignment = await tx.carrierAssignment.create({
        data: { ...base, guestCarrierId: guest.id, carrierNameSnapshot: guest.fullName, carrierPhoneSnapshot: phone, carrierCodeSnapshot: g.vehicleNumber ?? null },
      });
    } else {
      const x = input.external!;
      const provider = await tx.courierProvider.findUnique({ where: { id: x.providerId } });
      if (!provider || !provider.enabled) throw badRequest("Choose an enabled courier company.", "INVALID_PROVIDER");
      const trackingUrl =
        x.trackingUrl ?? (provider.trackingUrlTemplate && x.trackingNumber ? provider.trackingUrlTemplate.replace("{tracking}", encodeURIComponent(x.trackingNumber)) : null);
      assignment = await tx.carrierAssignment.create({
        data: {
          ...base,
          courierProviderId: provider.id,
          externalTrackingNumber: x.trackingNumber ?? null,
          externalBookingReference: x.bookingReference ?? null,
          riderName: x.riderName ?? null,
          riderPhone: x.riderPhone ? normalizePhone(x.riderPhone) : null,
          pickupReference: x.pickupReference ?? null,
          trackingUrl,
          externalExpectedDeliveryAt: x.expectedDeliveryAt ? new Date(x.expectedDeliveryAt) : null,
          notes: x.notes ?? null,
          carrierNameSnapshot: x.riderName ? `${provider.name} · ${x.riderName}` : provider.name,
          carrierPhoneSnapshot: x.riderPhone ? normalizePhone(x.riderPhone) : null,
          carrierCodeSnapshot: x.trackingNumber ?? null,
        },
      });
    }
    state.assignments.push(assignment);
    state.currentAssignmentId = assignment.id;
    return assignment;
  }

  async assignCarrier(actor: Actor, parcelId: string, dto: AssignCarrierDto, idemKey?: string) {
    await this.facts(actor, parcelId);
    const me = this.requireEmployee(actor);
    await this.run(actor, parcelId, async (tx, state, ctx) => {
      const f = this.factsOf(state);
      const status = state.status as ParcelStatus;
      const ops = this.access.hasOpsReach(me, f, Capability.CARRIER_ASSIGN);
      const senderMayAssign = this.access.isSenderSide(me, f) && [ParcelStatus.DRAFT, ParcelStatus.BOOKED, ParcelStatus.AWAITING_PICKUP].includes(status as never);
      if (!ops && !senderMayAssign) throw forbidden("Only the sender (before pickup) or dispatch can change the courier.");
      if (isTerminal(status)) throw conflict("STATE_CONFLICT", `This parcel is ${STATUS_LABEL[status]}; its courier can no longer change.`);
      const inCustody = IN_CUSTODY_STATUSES.includes(status);
      if (inCustody && !dto.reason) throw badRequest("Give a reason for changing the courier while the parcel is in transit.", "REASON_REQUIRED");

      const previous = this.current(state);
      let previousCarrierUserId: string | null = null;
      if (previous) {
        if (previous.employeeId) {
          const u = await tx.user.findUnique({ where: { employeeId: previous.employeeId }, select: { id: true } });
          previousCarrierUserId = u?.id ?? null;
        }
        await tx.carrierAssignment.update({
          where: { id: previous.id },
          data: { status: AssignmentStatus.REASSIGNED, endedAt: new Date(), endReason: dto.reason ?? "Reassigned" },
        });
        previous.status = AssignmentStatus.REASSIGNED;
      }
      const next = await this.createAssignment(tx, me, state, dto, inCustody ? AssignmentStatus.IN_CUSTODY : AssignmentStatus.ASSIGNED);
      if (inCustody) await tx.carrierAssignment.update({ where: { id: next.id }, data: { custodyStartedAt: new Date(), acceptedAt: new Date() } });
      await ctx.record({
        eventType: previous ? EventType.CARRIER_REASSIGNED : EventType.CARRIER_ASSIGNED,
        actor: eventActor(me, ops && !senderMayAssign),
        toStatus: status === ParcelStatus.BOOKED ? ParcelStatus.AWAITING_PICKUP : undefined,
        patch: { currentAssignmentId: next.id, deliveryMethod: dto.type, carrierAssignedAt: status === ParcelStatus.DRAFT ? undefined : new Date() },
        carrierAssignmentId: next.id,
        notes: dto.reason ?? null,
        idempotencyKey: this.idem(me, idemKey, "assign"),
        metadata: {
          carrierType: next.carrierType,
          carrierName: next.carrierNameSnapshot,
          previousCarrier: previous?.carrierNameSnapshot ?? null,
          previousCarrierUserId,
          custodyTransferred: inCustody,
        },
      });
      await this.audit.record(
        {
          actor: me,
          action: previous ? "parcel.carrier_reassigned" : "parcel.carrier_assigned",
          objectType: "parcel",
          objectId: state.id,
          summary: `${state.trackingNumber}: ${previous ? `${previous.carrierNameSnapshot} → ` : ""}${next.carrierNameSnapshot}`,
          before: previous ? { carrier: previous.carrierNameSnapshot } : undefined,
          after: { carrier: next.carrierNameSnapshot, reason: dto.reason },
        },
        tx,
      );
    });
    return this.respond(actor, parcelId);
  }

  // ─── pickup ────────────────────────────────────────────────────────────────

  async acceptAssignment(actor: Actor, parcelId: string) {
    await this.facts(actor, parcelId);
    await this.run(actor, parcelId, async (tx, state, ctx) => {
      if (!this.access.isCurrentCarrier(actor, this.factsOf(state))) throw forbidden("You are not assigned to this parcel.", "NOT_ASSIGNED");
      const a = this.current(state)!;
      if (a.status !== AssignmentStatus.ASSIGNED) return;
      await tx.carrierAssignment.update({ where: { id: a.id }, data: { status: AssignmentStatus.ACCEPTED, acceptedAt: new Date() } });
      await ctx.record({ eventType: EventType.CARRIER_ACCEPTED, actor: eventActor(actor) });
    });
    return this.respond(actor, parcelId);
  }

  /** The courier has scanned the label at the sender's desk and asks the sender to confirm. */
  async requestHandover(actor: Actor, parcelId: string, dto: ActionContextDto) {
    await this.facts(actor, parcelId);
    await this.run(actor, parcelId, async (tx, state, ctx) => {
      if (!this.access.isCurrentCarrier(actor, this.factsOf(state))) throw forbidden("You are not assigned to this parcel.", "NOT_ASSIGNED");
      if (state.status !== ParcelStatus.AWAITING_PICKUP) throw conflict("STATE_CONFLICT", `This parcel is ${STATUS_LABEL[state.status as ParcelStatus]}; it is not waiting for pickup.`);
      const a = this.current(state)!;
      if (a.handoverRequestedAt && Date.now() - a.handoverRequestedAt.getTime() < 15 * 60_000) return;
      await tx.carrierAssignment.update({ where: { id: a.id }, data: { handoverRequestedAt: new Date(), acceptedAt: a.acceptedAt ?? new Date() } });
      a.handoverRequestedAt = new Date();
      await ctx.record({
        eventType: EventType.HANDOVER_REQUESTED,
        actor: eventActor(actor),
        location: await this.locationSnapshot(tx, dto.locationId ?? state.originLocationId),
        ...this.ctxFields(dto),
      });
    });
    return this.respond(actor, parcelId);
  }

  async confirmHandover(actor: Actor, parcelId: string, dto: ConfirmHandoverDto, idemKey?: string) {
    const facts = await this.facts(actor, parcelId);
    // PIN failures must be counted even though the transaction below is never reached.
    if (dto.method === "SENDER_PIN") {
      if (!this.access.isCurrentCarrier(actor, facts)) throw forbidden("You are not assigned to this parcel.", "NOT_ASSIGNED");
      const p = await this.prisma.parcel.findUniqueOrThrow({ where: { id: parcelId }, select: { handoverPinHash: true, handoverPinFailures: true, status: true } });
      if (p.status === ParcelStatus.AWAITING_PICKUP) {
        if (p.handoverPinFailures >= this.config.handoverPinMaxFailures) {
          throw tooMany("Too many wrong PINs. Ask the sender to confirm the handover in their app, or ask dispatch.", "PIN_LOCKED");
        }
        if (!p.handoverPinHash || !(await bcrypt.compare(dto.pin!, p.handoverPinHash))) {
          const updated = await this.prisma.parcel.update({ where: { id: parcelId }, data: { handoverPinFailures: { increment: 1 } } });
          const left = this.config.handoverPinMaxFailures - updated.handoverPinFailures;
          throw badRequest(left > 0 ? `That PIN is not correct. ${left} attempt${left === 1 ? "" : "s"} left.` : "Too many wrong PINs. Ask the sender to confirm in their app.", left > 0 ? "PIN_INVALID" : "PIN_LOCKED");
        }
      }
    }

    await this.run(actor, parcelId, async (tx, state, ctx) => {
      const f = this.factsOf(state);
      if (state.status === ParcelStatus.PICKED_UP || IN_CUSTODY_STATUSES.includes(state.status as ParcelStatus)) {
        throw conflict("ALREADY_PICKED_UP", `This parcel was already picked up${state.pickedUpAt ? ` at ${dhakaTime(state.pickedUpAt)}` : ""}.`);
      }
      if (state.status !== ParcelStatus.AWAITING_PICKUP) {
        throw conflict("STATE_CONFLICT", `This parcel is ${STATUS_LABEL[state.status as ParcelStatus]}; it is not waiting for pickup.`);
      }
      const a = this.current(state);
      if (!a) throw conflict("NO_CARRIER", "Assign a courier before confirming the handover.");

      let verification: string;
      let proofType: string;
      let asAdmin = false;
      if (dto.method === "SENDER_APP") {
        if (!this.access.isSenderSide(actor, f)) throw forbidden("Only the sender can approve this handover in the app.");
        const sensitive = state.classification === Classification.CONFIDENTIAL || state.classification === Classification.HIGHLY_CONFIDENTIAL;
        if (sensitive && a.carrierType !== CarrierType.EXTERNAL_COURIER && !a.handoverRequestedAt) {
          throw conflict("HANDOVER_SCAN_REQUIRED", "For confidential parcels the courier must scan the QR label before you confirm the handover.");
        }
        verification = VerificationMethod.SENDER_APP;
        proofType = ProofType.SENDER_APP;
      } else if (dto.method === "SENDER_PIN") {
        if (!this.access.isCurrentCarrier(actor, f)) throw forbidden("You are not assigned to this parcel.", "NOT_ASSIGNED");
        verification = VerificationMethod.SENDER_PIN;
        proofType = ProofType.SENDER_PIN;
      } else {
        if (!this.access.hasOpsReachAt(actor, f.originBranchId, Capability.HANDOVER_OFFICER)) throw forbidden("Only a dispatch officer at the sending office can confirm the handover.");
        verification = VerificationMethod.DISPATCH_OFFICER;
        proofType = ProofType.OFFICER_CONFIRMATION;
        asAdmin = true;
      }
      const now = new Date();
      const proof = await tx.parcelProof.create({
        data: {
          parcelId: state.id,
          type: proofType,
          createdByUserId: actor.kind === "user" ? actor.userId : null,
          createdByGuestId: actor.kind === "guest" ? actor.guestCarrierId : null,
          metadata: { carrierName: a.carrierNameSnapshot, carrierType: a.carrierType, scannedByCarrier: !!a.handoverRequestedAt },
        },
      });
      const location = await this.locationSnapshot(tx, dto.locationId ?? state.originLocationId);
      await ctx.record({
        eventType: EventType.HANDOVER_CONFIRMED,
        actor: eventActor(actor, asAdmin),
        verificationMethod: verification,
        proofId: proof.id,
        location,
        patch: { handedOverAt: now },
        metadata: { from: "SENDER", to: a.carrierNameSnapshot, carrierType: a.carrierType },
        idempotencyKey: this.idem(actor, idemKey, "handover"),
        ...this.ctxFields(dto),
      });
      await ctx.record({
        eventType: EventType.PICKED_UP,
        actor: eventActor(actor, asAdmin),
        toStatus: ParcelStatus.PICKED_UP,
        location,
        verificationMethod: verification,
        patch: { pickedUpAt: now, handoverPinFailures: 0 },
        metadata: { carrierName: a.carrierNameSnapshot },
      });
      await tx.carrierAssignment.update({
        where: { id: a.id },
        data: { status: AssignmentStatus.IN_CUSTODY, custodyStartedAt: now, acceptedAt: a.acceptedAt ?? now },
      });
    });
    return this.respond(actor, parcelId);
  }

  // ─── transit ───────────────────────────────────────────────────────────────

  private canMove(actor: Actor, state: LockedParcel): boolean {
    const f = this.factsOf(state);
    if (this.access.isCurrentCarrier(actor, f)) return true;
    const a = this.current(state);
    return a?.carrierType === CarrierType.EXTERNAL_COURIER && this.access.hasOpsReach(actor, f, Capability.EXTERNAL_STATUS_UPDATE);
  }

  async startTransit(actor: Actor, parcelId: string, dto: ActionContextDto, idemKey?: string) {
    await this.facts(actor, parcelId);
    await this.run(actor, parcelId, async (tx, state, ctx) => {
      if (!this.canMove(actor, state)) throw forbidden("You are not assigned to this parcel.", "NOT_ASSIGNED");
      if (state.status === ParcelStatus.IN_TRANSIT) return;
      await ctx.record({
        eventType: EventType.IN_TRANSIT,
        actor: eventActor(actor),
        toStatus: ParcelStatus.IN_TRANSIT,
        patch: { inTransitAt: new Date() },
        location: await this.locationSnapshot(tx, dto.locationId),
        idempotencyKey: this.idem(actor, idemKey, "transit"),
        ...this.ctxFields(dto),
      });
    });
    return this.respond(actor, parcelId);
  }

  async checkpoint(actor: Actor, parcelId: string, dto: CheckpointDto, idemKey?: string) {
    await this.facts(actor, parcelId);
    await this.run(actor, parcelId, async (tx, state, ctx) => {
      if (!this.canMove(actor, state)) throw forbidden("You are not assigned to this parcel.", "NOT_ASSIGNED");
      if (![ParcelStatus.PICKED_UP, ParcelStatus.IN_TRANSIT, ParcelStatus.RETURN_IN_TRANSIT].includes(state.status as never)) {
        throw conflict("STATE_CONFLICT", "Checkpoints can only be added while the parcel is moving.");
      }
      const location = await this.locationSnapshot(tx, dto.locationId);
      if (!location && !dto.label) throw badRequest("Choose a location or describe the checkpoint.", "CHECKPOINT_EMPTY");
      await ctx.record({
        eventType: EventType.CHECKPOINT,
        actor: eventActor(actor),
        location: location ?? { id: null, name: dto.label! },
        idempotencyKey: this.idem(actor, idemKey, "checkpoint"),
        ...this.ctxFields(dto),
      });
    });
    return this.respond(actor, parcelId);
  }

  async markArrived(actor: Actor, parcelId: string, dto: ActionContextDto, idemKey?: string) {
    await this.facts(actor, parcelId);
    await this.run(actor, parcelId, async (tx, state, ctx) => {
      const f = this.factsOf(state);
      const desk = this.access.hasOpsReachAt(actor, f.destinationBranchId, Capability.RECEIVE_AT_DESK);
      if (!this.canMove(actor, state) && !desk) throw forbidden("You are not assigned to this parcel.", "NOT_ASSIGNED");
      if (state.status === ParcelStatus.ARRIVED_AT_DESTINATION || state.status === ParcelStatus.PENDING_RECEIPT) {
        throw conflict("ALREADY_ARRIVED", `This parcel already arrived${state.arrivedAt ? ` at ${dhakaTime(state.arrivedAt)}` : ""} and is waiting for receipt.`);
      }
      if (state.status === ParcelStatus.RECEIVED) throw conflict("ALREADY_RECEIVED", await this.describeReceipt(state));
      const who = eventActor(actor, desk && !this.canMove(actor, state));
      const now = new Date();
      if (state.status === ParcelStatus.PICKED_UP) {
        await ctx.record({ eventType: EventType.IN_TRANSIT, actor: who, toStatus: ParcelStatus.IN_TRANSIT, patch: { inTransitAt: now }, notes: "Departure recorded on arrival" });
      }
      const location = (await this.locationSnapshot(tx, dto.locationId ?? state.destinationLocationId)) ??
        (state.destinationBranchId ? { id: null, name: (await tx.branch.findUnique({ where: { id: state.destinationBranchId } }))?.name ?? null } : { id: null, name: state.externalReceiverAddress });
      await ctx.record({
        eventType: EventType.ARRIVED_AT_DESTINATION,
        actor: who,
        toStatus: ParcelStatus.ARRIVED_AT_DESTINATION,
        patch: { arrivedAt: now },
        location,
        idempotencyKey: this.idem(actor, idemKey, "arrive"),
        ...this.ctxFields(dto),
      });
      // Arrival is not receipt: the parcel now waits for the receiver.
      await ctx.record({
        eventType: EventType.PENDING_RECEIPT,
        actor: SYSTEM_ACTOR,
        toStatus: ParcelStatus.PENDING_RECEIPT,
        patch: { pendingReceiptAt: now },
        location,
      });
    });
    return this.respond(actor, parcelId);
  }

  // ─── receipt ───────────────────────────────────────────────────────────────

  async requestReceiptCode(actor: Actor, parcelId: string, dto: RequestReceiptCodeDto) {
    await this.facts(actor, parcelId);
    let devOtp: string | undefined;
    let sentTo: string | null = null;
    await this.run(actor, parcelId, async (tx, state, ctx) => {
      const f = this.factsOf(state);
      if (!this.access.isCurrentCarrier(actor, f) && !this.access.hasOpsReachAt(actor, f.destinationBranchId, Capability.RECEIVE_AT_DESK)) {
        throw forbidden("Only the courier or the destination desk can send a receipt code.", "NOT_ASSIGNED");
      }
      if (state.status === ParcelStatus.RECEIVED) throw conflict("ALREADY_RECEIVED", await this.describeReceipt(state));
      if (state.status !== ParcelStatus.PENDING_RECEIPT) throw conflict("NOT_AT_DESTINATION", "Mark the parcel as arrived before sending a receipt code.");

      let phone: string | null = null;
      let recipientName: string;
      let recipientCode: string | null = null;
      let recipientEmployeeId: string | null = null;
      let onBehalf = false;
      if (dto.recipientEmployeeId) {
        const e = await tx.employee.findUnique({ where: { id: dto.recipientEmployeeId }, include: { user: { select: { id: true } } } });
        if (!e || e.status !== "ACTIVE") throw badRequest("The recipient must be an active employee.", "INVALID_RECIPIENT");
        const eligible = e.id === state.receiverEmployeeId || (state.receiverType === ReceiverType.DEPARTMENT && e.departmentId === state.receiverDepartmentId);
        onBehalf = !eligible;
        phone = e.phone;
        recipientName = e.fullName;
        recipientCode = e.employeeCode;
        recipientEmployeeId = e.id;
      } else if (dto.recipientName && dto.recipientPhone) {
        onBehalf = !(state.receiverType === ReceiverType.EXTERNAL && normalizePhone(dto.recipientPhone) === state.externalReceiverPhone);
        phone = normalizePhone(dto.recipientPhone);
        recipientName = dto.recipientName.trim();
      } else if (state.receiverType === ReceiverType.EMPLOYEE && state.receiverEmployeeId) {
        const e = await tx.employee.findUniqueOrThrow({ where: { id: state.receiverEmployeeId } });
        phone = e.phone;
        recipientName = e.fullName;
        recipientCode = e.employeeCode;
        recipientEmployeeId = e.id;
      } else if (state.receiverType === ReceiverType.EXTERNAL) {
        phone = state.externalReceiverPhone;
        recipientName = state.externalReceiverName ?? "Receiver";
      } else {
        throw badRequest("Choose who is receiving: this parcel is addressed to a department or office.", "RECIPIENT_REQUIRED");
      }
      if (onBehalf) {
        if (state.classification === Classification.HIGHLY_CONFIDENTIAL) {
          throw forbidden("Highly confidential parcels can only be received by the intended receiver.", "ON_BEHALF_NOT_ALLOWED");
        }
        if (!dto.onBehalf?.reason) throw badRequest("Give a reason for receiving on the receiver's behalf.", "REASON_REQUIRED");
      }
      if (!phone) throw badRequest(`No mobile number is on file for ${recipientName!}. Ask them to confirm in the app instead.`, "NO_PHONE");

      const recipientUser = recipientEmployeeId ? await tx.user.findUnique({ where: { employeeId: recipientEmployeeId }, select: { id: true } }) : null;
      const { code } = await this.otp.issue(
        {
          purpose: OtpPurpose.RECEIPT,
          phone,
          parcelId: state.id,
          employeeId: recipientEmployeeId ?? undefined,
          ip: actor.ip,
          metadata: {
            recipientName: recipientName!,
            recipientCode,
            recipientPhone: phone,
            recipientEmployeeId,
            onBehalf,
            reason: dto.onBehalf?.reason ?? null,
            relationship: dto.onBehalf?.relationship ?? null,
          },
        },
        tx,
      );
      sentTo = maskPhone(phone);
      await ctx.record({
        eventType: EventType.RECEIPT_OTP_SENT,
        actor: eventActor(actor),
        metadata: { sentTo, recipientName: recipientName!, onBehalf, recipientUserId: recipientUser?.id ?? null },
      });
      await this.sms.send(phone, `ABG Dispatch receipt code for ${state.trackingNumber}: ${code}. Share it with the courier only when the parcel is in your hands.`);
      if (this.config.exposeDevOtp) devOtp = code;
    });
    return this.respond(actor, parcelId, { sentTo, ...(devOtp ? { devOtp } : {}) });
  }

  async receive(actor: Actor, parcelId: string, dto: ReceiveDto, idemKey?: string) {
    const facts = await this.prisma.parcel.findUnique({ where: { id: parcelId }, select: { ...ACCESS_SELECT, qrToken: true } });
    if (!facts) throw notFound(PARCEL_NOT_FOUND);
    const holdsLabel = dto.method === "QR_CONFIRMATION" && extractQrToken(dto.qrPayload ?? "") === facts.qrToken;
    if (!this.access.relation(actor, facts) && !(holdsLabel && this.access.colleagueMayReceive(actor, facts))) throw notFound(PARCEL_NOT_FOUND);
    const replay = await this.replayed(actor, idemKey, "receive");
    if (replay) return this.respond(actor, parcelId);
    await this.run(actor, parcelId, async (tx, state, ctx) => {
      const f = this.factsOf(state);
      if (state.status === ParcelStatus.RECEIVED) throw conflict("ALREADY_RECEIVED", await this.describeReceipt(state));
      if (state.status !== ParcelStatus.PENDING_RECEIPT) {
        throw conflict("NOT_AT_DESTINATION", "Parcel cannot be received because it has not reached the destination.");
      }

      let actual: { employeeId: string | null; name: string; code: string | null; phone: string | null };
      let onBehalf = false;
      let reason: string | null = null;
      let relationship: string | null = null;
      let verification: string;
      let proofType: string;
      const proofMeta: Record<string, unknown> = {};

      if (dto.method === "OTP") {
        if (!this.access.isCurrentCarrier(actor, f) && !this.access.hasOpsReachAt(actor, f.destinationBranchId, Capability.RECEIVE_AT_DESK)) {
          throw forbidden("Only the courier or the destination desk can enter a receipt code.", "NOT_ASSIGNED");
        }
        const challenge = await this.otp.verify({ purpose: OtpPurpose.RECEIPT, parcelId: state.id }, dto.code!, tx);
        const m = challenge.metadata as Record<string, unknown>;
        actual = {
          employeeId: (m.recipientEmployeeId as string) ?? null,
          name: String(m.recipientName ?? "Receiver"),
          code: (m.recipientCode as string) ?? null,
          phone: (m.recipientPhone as string) ?? challenge.phone,
        };
        onBehalf = !!m.onBehalf;
        reason = (m.reason as string) ?? null;
        relationship = (m.relationship as string) ?? null;
        verification = VerificationMethod.OTP;
        proofType = ProofType.OTP;
        proofMeta.sentTo = maskPhone(challenge.phone);
        if (state.classification === Classification.HIGHLY_CONFIDENTIAL && !dto.signatureAttachmentId) {
          throw badRequest("Highly confidential parcels received with a code also need the receiver's signature.", "SIGNATURE_REQUIRED");
        }
      } else {
        const me = this.requireEmployee(actor);
        const intended = this.access.isIntendedReceiver(me, f);
        if (!intended) {
          if (state.classification === Classification.HIGHLY_CONFIDENTIAL) {
            throw forbidden("Highly confidential parcels can only be received by the intended receiver.", "ON_BEHALF_NOT_ALLOWED");
          }
          const atDestination = me.branchId === state.destinationBranchId || this.access.hasOpsReachAt(me, f.destinationBranchId, Capability.RECEIVE_AT_DESK);
          if (!atDestination) throw forbidden("You are not the receiver of this parcel.", "NOT_RECEIVER");
          if (!dto.onBehalf?.reason) throw badRequest("Give a reason for receiving on the receiver's behalf.", "REASON_REQUIRED");
          onBehalf = true;
          reason = dto.onBehalf.reason;
          relationship = dto.onBehalf.relationship ?? null;
        }
        if (dto.method === "QR_CONFIRMATION") {
          if (extractQrToken(dto.qrPayload ?? "") !== state.qrToken) throw badRequest("This QR code belongs to a different parcel.", "QR_MISMATCH");
          verification = VerificationMethod.QR_CONFIRMATION;
          proofType = ProofType.QR_CONFIRMATION;
        } else {
          verification = VerificationMethod.APP_CONFIRMATION;
          proofType = ProofType.APP_CONFIRMATION;
        }
        const e = await tx.employee.findUniqueOrThrow({ where: { id: me.employeeId } });
        actual = { employeeId: e.id, name: e.fullName, code: e.employeeCode, phone: e.phone };
      }

      const now = new Date();
      const createdBy = { createdByUserId: actor.kind === "user" ? actor.userId : null, createdByGuestId: actor.kind === "guest" ? actor.guestCarrierId : null };
      const attachmentProof = async (id: string | undefined, kinds: string[], type: string) => {
        if (!id) return null;
        const att = await tx.parcelAttachment.findUnique({ where: { id } });
        if (!att || att.parcelId !== state.id || !kinds.includes(att.kind)) throw badRequest("That evidence file does not belong to this parcel.", "INVALID_ATTACHMENT");
        return tx.parcelProof.create({ data: { parcelId: state.id, type, attachmentId: att.id, ...createdBy, metadata: { fileName: att.fileName } } });
      };
      const signature = await attachmentProof(dto.signatureAttachmentId, ["SIGNATURE"], ProofType.SIGNATURE);
      const photo = await attachmentProof(dto.photoAttachmentId, ["PROOF_OF_DELIVERY", "COVER_PHOTO"], ProofType.PHOTO);
      const proof = await tx.parcelProof.create({
        data: {
          parcelId: state.id,
          type: proofType,
          ...createdBy,
          metadata: { ...proofMeta, receiver: actual.name, onBehalf, signatureProofId: signature?.id ?? null, photoProofId: photo?.id ?? null },
        },
      });
      await ctx.record({
        eventType: EventType.RECEIVED,
        actor: eventActor(actor),
        toStatus: ParcelStatus.RECEIVED,
        verificationMethod: verification,
        proofId: proof.id,
        location: await this.locationSnapshot(tx, dto.locationId ?? state.destinationLocationId),
        patch: {
          receivedAt: now,
          actualReceiverEmployeeId: actual.employeeId,
          actualReceiverName: actual.name,
          actualReceiverCode: actual.code,
          actualReceiverPhone: actual.phone,
          receivedOnBehalf: onBehalf,
          onBehalfReason: reason,
          onBehalfRelationship: relationship,
          receiptVerification: verification,
          isOverdue: false,
        },
        idempotencyKey: this.idem(actor, idemKey, "receive"),
        metadata: { receivedBy: actual.name, employeeCode: actual.code, onBehalf, reason, relationship, signature: !!signature, photo: !!photo },
        ...this.ctxFields(dto),
      });
      const a = this.current(state);
      if (a) await tx.carrierAssignment.update({ where: { id: a.id }, data: { status: AssignmentStatus.COMPLETED, endedAt: now } });
    });
    return this.respond(actor, parcelId);
  }

  /** True when this exact request already produced its ledger entry (an offline retry). */
  private async replayed(actor: Actor, key: string | undefined, suffix: string): Promise<boolean> {
    const k = this.idem(actor, key, suffix);
    if (!k) return false;
    return !!(await this.prisma.parcelEvent.findUnique({ where: { idempotencyKey: k }, select: { id: true } }));
  }

  // ─── exceptions ────────────────────────────────────────────────────────────

  async recordException(actor: Actor, parcelId: string, dto: RecordExceptionDto, idemKey?: string) {
    const { relation } = await this.access.assertView(actor, parcelId);
    void relation;
    await this.run(actor, parcelId, async (tx, state, ctx) => {
      const f = this.factsOf(state);
      const status = state.status as ParcelStatus;
      if (isTerminal(status)) throw conflict("STATE_CONFLICT", `This parcel is ${STATUS_LABEL[status]}; exceptions can no longer be recorded.`);
      const carrier = this.access.isCurrentCarrier(actor, f);
      const ops = this.access.hasOpsReach(actor, f, Capability.EXCEPTION_RECORD);
      const party = actor.kind === "user" && this.access.isParty(actor, f);
      if (!carrier && !ops && !party) throw forbidden("You cannot record exceptions on this parcel.");

      let target: ParcelStatus | undefined = dto.setStatus;
      if (target === ParcelStatus.ON_HOLD && !this.access.hasOpsReach(actor, f, Capability.PARCEL_HOLD)) {
        throw forbidden("Only branch or head-office admins can put a parcel on hold.");
      }
      if (target === ParcelStatus.DELIVERY_FAILED && !carrier && !ops) throw forbidden("Only the courier or dispatch can mark a delivery as failed.");
      if (!target && (carrier || ops) && canTransition(status, ParcelStatus.DELIVERY_EXCEPTION)) target = ParcelStatus.DELIVERY_EXCEPTION;
      if (target && !canTransition(status, target)) {
        throw conflict("STATE_CONFLICT", `A parcel that is ${STATUS_LABEL[status]} cannot be set to ${STATUS_LABEL[target]}.`);
      }
      const who = actor.kind === "guest" ? actor.displayName : actor.displayName;
      const exception = await tx.parcelException.create({
        data: {
          parcelId: state.id,
          code: dto.code,
          details: dto.details,
          statusBefore: status,
          raisedByUserId: actor.kind === "user" ? actor.userId : null,
          raisedByGuestId: actor.kind === "guest" ? actor.guestCarrierId : null,
          raisedByName: who,
        },
      });
      const resume = [ParcelStatus.ON_HOLD, ParcelStatus.DELIVERY_EXCEPTION, ParcelStatus.DELIVERY_FAILED].includes(status as never) ? state.resumeStatus : status;
      await ctx.record({
        eventType: target === ParcelStatus.ON_HOLD ? EventType.PUT_ON_HOLD : target === ParcelStatus.DELIVERY_FAILED ? EventType.DELIVERY_FAILED : EventType.EXCEPTION_RECORDED,
        actor: eventActor(actor, ops && !carrier && !party),
        toStatus: target,
        patch: { hasOpenException: true, resumeStatus: target ? resume : undefined },
        location: await this.locationSnapshot(tx, dto.locationId),
        idempotencyKey: this.idem(actor, idemKey, "exception"),
        metadata: { exceptionId: exception.id, code: dto.code, details: dto.details },
        ...this.ctxFields({ ...dto, notes: dto.details }),
      });
    });
    return this.respond(actor, parcelId);
  }

  async resolveException(actor: Actor, parcelId: string, exceptionId: string, dto: ResolveExceptionDto) {
    await this.facts(actor, parcelId);
    await this.run(actor, parcelId, async (tx, state, ctx) => {
      if (!this.access.hasOpsReach(actor, this.factsOf(state), Capability.EXCEPTION_RESOLVE)) {
        throw forbidden("Only dispatch or admins can resolve exceptions.");
      }
      const ex = await tx.parcelException.findUnique({ where: { id: exceptionId } });
      if (!ex || ex.parcelId !== state.id) throw notFound("Exception not found.");
      if (ex.resolvedAt) throw conflict("ALREADY_RESOLVED", "This exception is already resolved.");
      await tx.parcelException.update({
        where: { id: ex.id },
        data: { resolvedAt: new Date(), resolvedByUserId: (actor as UserActor).userId, resolvedByName: actor.displayName, resolution: dto.resolution },
      });
      const stillOpen = await tx.parcelException.count({ where: { parcelId: state.id, resolvedAt: null } });
      const status = state.status as ParcelStatus;
      const held = [ParcelStatus.ON_HOLD, ParcelStatus.DELIVERY_EXCEPTION, ParcelStatus.DELIVERY_FAILED].includes(status as never);
      let toStatus: ParcelStatus | undefined;
      if (held && stillOpen === 0) {
        toStatus = (dto.resumeStatus ?? state.resumeStatus ?? undefined) as ParcelStatus | undefined;
        if (!toStatus) throw badRequest("Choose the status this parcel should resume from.", "RESUME_STATUS_REQUIRED");
        if (!canTransition(status, toStatus)) {
          throw conflict("STATE_CONFLICT", `A parcel that is ${STATUS_LABEL[status]} cannot resume as ${STATUS_LABEL[toStatus]}.`);
        }
      }
      await ctx.record({
        eventType: status === ParcelStatus.ON_HOLD && toStatus ? EventType.RELEASED_FROM_HOLD : EventType.EXCEPTION_RESOLVED,
        actor: eventActor(actor, true),
        toStatus,
        patch: { hasOpenException: stillOpen > 0, resumeStatus: toStatus ? null : undefined },
        notes: dto.resolution,
        metadata: { exceptionId: ex.id, code: ex.code },
      });
      await this.audit.record({ actor, action: "parcel.exception_resolved", objectType: "parcel", objectId: state.id, summary: `${state.trackingNumber}: ${dto.resolution}` }, tx);
    });
    return this.respond(actor, parcelId);
  }

  // ─── cancellation & returns ────────────────────────────────────────────────

  async cancel(actor: Actor, parcelId: string, dto: ReasonDto, idemKey?: string) {
    await this.facts(actor, parcelId);
    await this.run(actor, parcelId, async (tx, state, ctx) => {
      const f = this.factsOf(state);
      const ops = this.access.hasOpsReach(actor, f, Capability.PARCEL_CANCEL_ANY);
      const sender = this.access.isSenderSide(actor, f) && state.status !== ParcelStatus.ON_HOLD;
      if (!ops && !sender) throw forbidden("Only the sender or an admin can cancel this parcel.");
      if (state.status === ParcelStatus.CANCELLED) return;
      await ctx.record({
        eventType: EventType.CANCELLED,
        actor: eventActor(actor, ops && !sender),
        toStatus: ParcelStatus.CANCELLED,
        patch: { cancelledAt: new Date(), isOverdue: false },
        notes: dto.reason,
        idempotencyKey: this.idem(actor, idemKey, "cancel"),
      });
      const a = this.current(state);
      if (a) await tx.carrierAssignment.update({ where: { id: a.id }, data: { status: AssignmentStatus.CANCELLED, endedAt: new Date(), endReason: "Parcel cancelled" } });
      await this.audit.record({ actor, action: "parcel.cancelled", objectType: "parcel", objectId: state.id, summary: `${state.trackingNumber}: ${dto.reason}` }, tx);
    });
    return this.respond(actor, parcelId);
  }

  async requestReturn(actor: Actor, parcelId: string, dto: ReasonDto, idemKey?: string) {
    await this.facts(actor, parcelId);
    await this.run(actor, parcelId, async (tx, state, ctx) => {
      const f = this.factsOf(state);
      const ops = this.access.hasOpsReach(actor, f, Capability.PARCEL_RETURN_ANY);
      if (!ops && !this.access.isSenderSide(actor, f)) throw forbidden("Only the sender or an admin can request a return.");
      await ctx.record({
        eventType: EventType.RETURN_REQUESTED,
        actor: eventActor(actor, ops),
        toStatus: ParcelStatus.RETURN_REQUESTED,
        patch: { returnRequestedAt: new Date() },
        notes: dto.reason,
        idempotencyKey: this.idem(actor, idemKey, "return"),
      });
      await this.audit.record({ actor, action: "parcel.return_requested", objectType: "parcel", objectId: state.id, summary: `${state.trackingNumber}: ${dto.reason}` }, tx);
    });
    return this.respond(actor, parcelId);
  }

  async startReturn(actor: Actor, parcelId: string, dto: ActionContextDto) {
    await this.facts(actor, parcelId);
    await this.run(actor, parcelId, async (tx, state, ctx) => {
      if (!this.current(state)) throw conflict("NO_CARRIER", "Assign a carrier for the return first.");
      if (!this.canMove(actor, state) && !this.access.hasOpsReach(actor, this.factsOf(state), Capability.PARCEL_RETURN_ANY)) {
        throw forbidden("You are not assigned to this parcel.", "NOT_ASSIGNED");
      }
      await ctx.record({
        eventType: EventType.RETURN_IN_TRANSIT,
        actor: eventActor(actor),
        toStatus: ParcelStatus.RETURN_IN_TRANSIT,
        location: await this.locationSnapshot(tx, dto.locationId),
        ...this.ctxFields(dto),
      });
    });
    return this.respond(actor, parcelId);
  }

  async completeReturn(actor: Actor, parcelId: string, dto: CompleteReturnDto) {
    await this.facts(actor, parcelId);
    await this.run(actor, parcelId, async (tx, state, ctx) => {
      const f = this.factsOf(state);
      let verification: string;
      if (dto.method === "SENDER_APP") {
        if (!this.access.isSenderSide(actor, f)) throw forbidden("Only the sender can confirm the parcel is back.");
        verification = VerificationMethod.SENDER_APP;
      } else {
        if (!this.access.hasOpsReachAt(actor, f.originBranchId, Capability.HANDOVER_OFFICER)) throw forbidden("Only a dispatch officer at the sending office can confirm the return.");
        verification = VerificationMethod.DISPATCH_OFFICER;
      }
      const proof = await tx.parcelProof.create({
        data: { parcelId: state.id, type: dto.method === "SENDER_APP" ? ProofType.SENDER_APP : ProofType.OFFICER_CONFIRMATION, createdByUserId: (actor as UserActor).userId, metadata: { returned: true } },
      });
      const now = new Date();
      await ctx.record({
        eventType: EventType.RETURNED,
        actor: eventActor(actor),
        toStatus: ParcelStatus.RETURNED,
        verificationMethod: verification,
        proofId: proof.id,
        location: await this.locationSnapshot(tx, dto.locationId ?? state.originLocationId),
        patch: { returnedAt: now, isOverdue: false },
        ...this.ctxFields(dto),
      });
      const a = this.current(state);
      if (a) await tx.carrierAssignment.update({ where: { id: a.id }, data: { status: AssignmentStatus.COMPLETED, endedAt: now, endReason: "Returned to sender" } });
    });
    return this.respond(actor, parcelId);
  }

  // ─── notes, corrections, SLA ───────────────────────────────────────────────

  async comment(actor: Actor, parcelId: string, body: string) {
    await this.facts(actor, parcelId);
    await this.run(actor, parcelId, async (tx, state, ctx) => {
      await tx.parcelComment.create({
        data: {
          parcelId: state.id,
          authorUserId: actor.kind === "user" ? actor.userId : null,
          authorGuestId: actor.kind === "guest" ? actor.guestCarrierId : null,
          authorNameSnapshot: actor.displayName,
          body,
        },
      });
      await ctx.record({ eventType: EventType.NOTE_ADDED, actor: eventActor(actor), notes: body });
    });
    return this.respond(actor, parcelId);
  }

  /**
   * Controlled correction. The original ledger entry stays exactly as it was;
   * a CORRECTION_ADDED entry records what changed, why, and who changed it.
   */
  async correct(actor: Actor, parcelId: string, dto: CorrectionDto) {
    await this.facts(actor, parcelId);
    await this.run(actor, parcelId, async (tx, state, ctx) => {
      if (!this.access.hasOpsReach(actor, this.factsOf(state), Capability.PARCEL_CORRECT)) throw forbidden("Only admins can correct parcel records.");
      if (!dto.eventId && !dto.field) throw badRequest("Choose a field to correct or a timeline entry to annotate.", "CORRECTION_EMPTY");
      if (dto.eventId) {
        const original = await tx.parcelEvent.findUnique({ where: { id: dto.eventId } });
        if (!original || original.parcelId !== state.id) throw notFound("That timeline entry is not part of this parcel.");
      }
      let before: unknown = null;
      let after: unknown = null;
      if (dto.field) {
        const value = dto.value ?? "";
        const parcelPatch: Prisma.ParcelUncheckedUpdateInput = {};
        const a = this.current(state) ?? state.assignments.find((x) => x.id === state.currentAssignmentId) ?? null;
        switch (dto.field) {
          case "title":
          case "description":
            if (value.trim().length < 3) throw badRequest("The corrected text is too short.");
            before = state[dto.field];
            parcelPatch[dto.field] = after = value.trim();
            break;
          case "priority":
            if (!["NORMAL", "PRIORITY", "URGENT", "CRITICAL"].includes(value)) throw badRequest("Unknown priority.");
            before = state.priority;
            parcelPatch.priority = after = value;
            break;
          case "categoryId": {
            const c = await tx.parcelCategory.findUnique({ where: { id: value } });
            if (!c) throw badRequest("Unknown category.");
            before = state.categoryId;
            parcelPatch.categoryId = after = value;
            break;
          }
          case "expectedDeliveryAt":
            before = state.expectedDeliveryAt;
            parcelPatch.expectedDeliveryAt = (after = value ? new Date(value) : null) as Date | null;
            break;
          case "originLocationId":
          case "destinationLocationId": {
            const branch = dto.field === "originLocationId" ? state.originBranchId : state.destinationBranchId;
            const loc = await this.locationSnapshot(tx, value, branch);
            before = state[dto.field];
            parcelPatch[dto.field] = after = loc!.id;
            break;
          }
          default: {
            if (!a) throw badRequest("This parcel has no courier assignment to correct.");
            const field = dto.field as "externalTrackingNumber" | "externalBookingReference" | "riderName" | "riderPhone";
            before = a[field];
            after = field === "riderPhone" ? normalizePhone(value) : value;
            await tx.carrierAssignment.update({ where: { id: a.id }, data: { [field]: after } });
          }
        }
        if (Object.keys(parcelPatch).length) {
          await tx.parcel.update({ where: { id: state.id }, data: parcelPatch });
          Object.assign(state, parcelPatch);
        }
      }
      await ctx.record({
        eventType: EventType.CORRECTION_ADDED,
        actor: eventActor(actor, true),
        correctsEventId: dto.eventId ?? null,
        notes: dto.reason,
        metadata: { field: dto.field ?? null, before, after },
      });
      await this.audit.record(
        { actor, action: "parcel.corrected", objectType: "parcel", objectId: state.id, summary: `${state.trackingNumber}: ${dto.reason}`, before: { [dto.field ?? "event"]: before }, after: { [dto.field ?? "event"]: after } },
        tx,
      );
    });
    return this.respond(actor, parcelId);
  }

  async updateSla(actor: Actor, parcelId: string, dto: UpdateSlaDto) {
    await this.facts(actor, parcelId);
    await this.run(actor, parcelId, async (tx, state, ctx) => {
      if (!this.access.hasOpsReach(actor, this.factsOf(state), Capability.SLA_UPDATE)) throw forbidden("Only admins can change the expected delivery time.");
      if (isTerminal(state.status as ParcelStatus)) throw conflict("STATE_CONFLICT", "This parcel is complete; its delivery deadline can no longer change.");
      const next = dto.expectedDeliveryAt ? new Date(dto.expectedDeliveryAt) : null;
      const escalated = await tx.escalation.count({ where: { parcelId: state.id, slaPolicy: { marksOverdue: true } } });
      const overdue = escalated > 0 || (!!next && next < new Date());
      await ctx.record({
        eventType: EventType.EXPECTED_DELIVERY_CHANGED,
        actor: eventActor(actor, true),
        patch: { expectedDeliveryAt: next, isOverdue: overdue, overdueSince: overdue ? state.overdueSince ?? new Date() : state.overdueSince },
        notes: dto.reason ?? null,
        metadata: { before: state.expectedDeliveryAt, after: next },
      });
      await this.audit.record({ actor, action: "parcel.sla_updated", objectType: "parcel", objectId: state.id, summary: `${state.trackingNumber}: expected delivery changed`, before: { expectedDeliveryAt: state.expectedDeliveryAt }, after: { expectedDeliveryAt: next } }, tx);
    });
    return this.respond(actor, parcelId);
  }

  async resendNotification(actor: Actor, parcelId: string, audience: "SENDER" | "RECEIVER" | "CARRIER") {
    await this.facts(actor, parcelId);
    let eventId = "";
    await this.run(actor, parcelId, async (_tx, state, ctx) => {
      if (!this.access.hasOpsReach(actor, this.factsOf(state), Capability.NOTIFY_RESEND)) throw forbidden("Only dispatch can resend notifications.");
      const e = await ctx.record({ eventType: EventType.NOTIFICATION_RESENT, actor: eventActor(actor, true), metadata: { audience } });
      eventId = e.id;
    });
    const count = await this.notifications.resend(parcelId, audience, eventId);
    return this.respond(actor, parcelId, { notified: count });
  }

  // ─── external couriers ─────────────────────────────────────────────────────

  /**
   * Applies a normalised courier-provider status. Used both by dispatch officers
   * (manual update when no API is connected) and by provider webhooks. Provider
   * "delivered" means the courier reached the address; an internal receiver must
   * still confirm, so it lands on PENDING_RECEIPT, not RECEIVED.
   */
  async applyExternalStatus(actor: Actor | ExternalActor, parcelId: string, dto: ExternalStatusDto & { normalized: ExternalStatus }) {
    const isProvider = "provider" in actor;
    if (!isProvider) await this.facts(actor, parcelId);
    let outcome = "APPLIED";
    await this.run(isProvider ? null : actor, parcelId, async (tx, state, ctx) => {
      const a = this.current(state) ?? state.assignments.find((x) => x.id === state.currentAssignmentId) ?? null;
      if (!isProvider) {
        if (a?.carrierType !== CarrierType.EXTERNAL_COURIER) throw conflict("NOT_EXTERNAL", "This parcel is not with an external courier.");
        if (!this.access.hasOpsReach(actor, this.factsOf(state), Capability.EXTERNAL_STATUS_UPDATE)) throw forbidden("Only dispatch can record courier status.");
      }
      const who: EventActor = isProvider
        ? { actorType: ActorType.EXTERNAL_PROVIDER, actorUserId: null, actorGuestId: null, actorNameSnapshot: actor.provider.name, actorCodeSnapshot: actor.provider.code }
        : eventActor(actor, true);
      const occurredAt = dto.occurredAt ? new Date(dto.occurredAt) : null;
      if (a) await tx.carrierAssignment.update({ where: { id: a.id }, data: { externalRawStatus: dto.rawStatus, externalStatusAt: occurredAt ?? new Date() } });
      await ctx.record({
        eventType: EventType.EXTERNAL_STATUS_UPDATE,
        actor: who,
        notes: dto.note ?? null,
        externalProvider: isProvider ? actor.provider.code : null,
        externalEventId: isProvider ? actor.externalEventId ?? null : null,
        deviceTimestamp: occurredAt,
        metadata: { rawStatus: dto.rawStatus, normalized: dto.normalized },
      });
      const status = state.status as ParcelStatus;
      const step = async (eventType: EventType, to: ParcelStatus, patch: Prisma.ParcelUncheckedUpdateInput = {}, extra: Partial<EventInput> = {}) => {
        if (!canTransition(state.status as ParcelStatus, to)) return false;
        await ctx.record({ eventType, actor: who, toStatus: to, patch, verificationMethod: VerificationMethod.EXTERNAL_PROVIDER, externalProvider: isProvider ? actor.provider.code : null, ...extra });
        return true;
      };
      const now = new Date();
      const forward: ParcelStatus[] = [ParcelStatus.AWAITING_PICKUP, ParcelStatus.PICKED_UP, ParcelStatus.IN_TRANSIT, ParcelStatus.ARRIVED_AT_DESTINATION, ParcelStatus.PENDING_RECEIPT, ParcelStatus.RECEIVED];
      const rank = forward.indexOf(status);
      const toPickedUp = async () => {
        if (state.status === ParcelStatus.AWAITING_PICKUP) {
          await ctx.record({ eventType: EventType.HANDOVER_CONFIRMED, actor: who, verificationMethod: VerificationMethod.EXTERNAL_PROVIDER, patch: { handedOverAt: now }, metadata: { to: a?.carrierNameSnapshot } });
          await step(EventType.PICKED_UP, ParcelStatus.PICKED_UP, { pickedUpAt: now });
          if (a) await tx.carrierAssignment.update({ where: { id: a.id }, data: { status: AssignmentStatus.IN_CUSTODY, custodyStartedAt: now } });
        }
      };
      const toInTransit = async () => {
        await toPickedUp();
        if (state.status === ParcelStatus.PICKED_UP) await step(EventType.IN_TRANSIT, ParcelStatus.IN_TRANSIT, { inTransitAt: now });
      };
      switch (dto.normalized) {
        case ExternalStatus.PICKED_UP:
          if (rank >= 1) outcome = "IGNORED_STALE";
          else await toPickedUp();
          break;
        case ExternalStatus.IN_TRANSIT:
        case ExternalStatus.OUT_FOR_DELIVERY:
          if (rank >= 2 && status !== ParcelStatus.IN_TRANSIT) outcome = "IGNORED_STALE";
          else await toInTransit();
          break;
        case ExternalStatus.DELIVERED: {
          if (rank >= 3) {
            outcome = "IGNORED_STALE";
            break;
          }
          await toInTransit();
          if (state.status !== ParcelStatus.IN_TRANSIT) {
            outcome = "NOT_APPLICABLE";
            break;
          }
          await step(EventType.ARRIVED_AT_DESTINATION, ParcelStatus.ARRIVED_AT_DESTINATION, { arrivedAt: now });
          await ctx.record({ eventType: EventType.PENDING_RECEIPT, actor: SYSTEM_ACTOR, toStatus: ParcelStatus.PENDING_RECEIPT, patch: { pendingReceiptAt: now } });
          if (state.receiverType === ReceiverType.EXTERNAL) {
            // Outside ABG the courier's proof of delivery is the receipt.
            const name = dto.recipientName ?? state.externalReceiverName ?? "Receiver";
            const proof = await tx.parcelProof.create({ data: { parcelId: state.id, type: ProofType.EXTERNAL_PROVIDER, metadata: { rawStatus: dto.rawStatus, recipient: name } } });
            await step(EventType.RECEIVED, ParcelStatus.RECEIVED, {
              receivedAt: now,
              actualReceiverName: name,
              actualReceiverPhone: state.externalReceiverPhone,
              receiptVerification: VerificationMethod.EXTERNAL_PROVIDER,
              isOverdue: false,
            }, { proofId: proof.id, metadata: { receivedBy: name } });
            if (a) await tx.carrierAssignment.update({ where: { id: a.id }, data: { status: AssignmentStatus.COMPLETED, endedAt: now } });
          }
          break;
        }
        case ExternalStatus.FAILED:
          if (!(await step(EventType.DELIVERY_FAILED, ParcelStatus.DELIVERY_FAILED, { hasOpenException: true, resumeStatus: status }))) outcome = "NOT_APPLICABLE";
          else await tx.parcelException.create({ data: { parcelId: state.id, code: "OTHER", details: `Courier reported: ${dto.rawStatus}`, statusBefore: status, raisedByName: who.actorNameSnapshot } });
          break;
        case ExternalStatus.RETURNING:
          if (state.status !== ParcelStatus.RETURN_REQUESTED) await step(EventType.RETURN_REQUESTED, ParcelStatus.RETURN_REQUESTED, { returnRequestedAt: now });
          if (!(await step(EventType.RETURN_IN_TRANSIT, ParcelStatus.RETURN_IN_TRANSIT))) outcome = "NOT_APPLICABLE";
          break;
        case ExternalStatus.RETURNED:
          if (!(await step(EventType.RETURNED, ParcelStatus.RETURNED, { returnedAt: now }))) outcome = "NOT_APPLICABLE";
          break;
        case ExternalStatus.ON_HOLD:
        case ExternalStatus.CANCELLED:
          await tx.parcelException.create({ data: { parcelId: state.id, code: "OTHER", details: `Courier reported: ${dto.rawStatus}`, statusBefore: status, raisedByName: who.actorNameSnapshot } });
          await ctx.record({ eventType: EventType.EXCEPTION_RECORDED, actor: who, patch: { hasOpenException: true }, metadata: { code: "OTHER", details: `Courier reported: ${dto.rawStatus}` } });
          break;
        default:
          outcome = "NO_STATUS_CHANGE";
      }
    });
    return { outcome, parcel: isProvider ? null : await this.query.getOrSummary(actor as Actor, parcelId) };
  }
}
