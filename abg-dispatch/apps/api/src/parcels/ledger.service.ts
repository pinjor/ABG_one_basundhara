import { Injectable } from "@nestjs/common";
import type { Parcel, ParcelEvent, Prisma } from "@prisma/client";
import { ActorType, EventType, ParcelStatus, STATUS_LABEL, canTransition, maskPhone } from "@abg-dispatch/shared";
import type { Tx } from "../common/prisma.service";
import { conflict } from "../common/errors";
import type { Actor } from "../common/actor";

export interface EventActor {
  actorType: ActorType;
  actorUserId: string | null;
  actorGuestId: string | null;
  actorNameSnapshot: string;
  actorCodeSnapshot: string | null;
}

export const SYSTEM_ACTOR: EventActor = {
  actorType: ActorType.SYSTEM,
  actorUserId: null,
  actorGuestId: null,
  actorNameSnapshot: "ABG Dispatch",
  actorCodeSnapshot: null,
};

export function eventActor(actor: Actor, asAdmin = false): EventActor {
  if (actor.kind === "guest") {
    return {
      actorType: ActorType.GUEST,
      actorUserId: null,
      actorGuestId: actor.guestCarrierId,
      actorNameSnapshot: actor.displayName,
      actorCodeSnapshot: maskPhone(actor.phone),
    };
  }
  return {
    actorType: asAdmin ? ActorType.ADMIN : ActorType.EMPLOYEE,
    actorUserId: actor.userId,
    actorGuestId: null,
    actorNameSnapshot: actor.displayName,
    actorCodeSnapshot: actor.employeeCode,
  };
}

export interface EventInput {
  eventType: EventType;
  actor: EventActor;
  /** Set to change status. Validated against the shared state machine. */
  toStatus?: ParcelStatus;
  /** Extra parcel columns to update in the same statement (milestones, receipt details …). */
  patch?: Prisma.ParcelUncheckedUpdateInput;
  location?: { id: string | null; name: string | null } | null;
  latitude?: number | null;
  longitude?: number | null;
  deviceTimestamp?: Date | null;
  verificationMethod?: string | null;
  proofId?: string | null;
  notes?: string | null;
  carrierAssignmentId?: string | null;
  externalProvider?: string | null;
  externalEventId?: string | null;
  correctsEventId?: string | null;
  metadata?: Record<string, unknown>;
  idempotencyKey?: string | null;
  /** Defaults to now. Only seed scripts pass historical times. */
  at?: Date;
  /** The very first event: records `null → status` without a transition. */
  initial?: boolean;
}

export function transitionMessage(from: ParcelStatus, to: ParcelStatus): string {
  if (to === ParcelStatus.RECEIVED) return "Parcel cannot be received because it has not reached the destination.";
  if (to === ParcelStatus.CANCELLED) return "This parcel is already with the courier and cannot be cancelled. Request a return instead.";
  if (to === ParcelStatus.ARRIVED_AT_DESTINATION) return `This parcel is ${STATUS_LABEL[from]}; it can be marked arrived only while it is on the way.`;
  if (to === ParcelStatus.PICKED_UP) return `This parcel is ${STATUS_LABEL[from]}; it is not waiting for pickup.`;
  return `This parcel is ${STATUS_LABEL[from]}; it cannot move to ${STATUS_LABEL[to]}.`;
}

/**
 * Writes to the custody ledger. Every call happens inside a transaction that
 * holds a row lock on the parcel (see lock()), so event sequence numbers are
 * gap-free and two people can never both "receive" the same parcel.
 */
@Injectable()
export class LedgerService {
  async lock(tx: Tx, parcelId: string): Promise<Parcel> {
    await tx.$queryRaw`SELECT id FROM "parcels" WHERE id = ${parcelId} FOR UPDATE`;
    return tx.parcel.findUniqueOrThrow({ where: { id: parcelId } });
  }

  async record(tx: Tx, state: Parcel, input: EventInput): Promise<ParcelEvent> {
    const from = state.status as ParcelStatus;
    const to = input.toStatus;
    const changing = !!to && to !== from && !input.initial;
    if (changing && !canTransition(from, to!)) {
      throw conflict("STATE_CONFLICT", transitionMessage(from, to!), { status: from });
    }
    const at = input.at ?? new Date();
    const sequence = state.lastEventSequence + 1;
    const updated = await tx.parcel.update({
      where: { id: state.id },
      data: {
        ...(input.patch ?? {}),
        lastEventSequence: sequence,
        ...(changing ? { status: to, statusChangedAt: at } : {}),
      },
    });
    Object.assign(state, updated);
    return tx.parcelEvent.create({
      data: {
        parcelId: state.id,
        sequence,
        eventType: input.eventType,
        fromStatus: input.initial ? null : changing ? from : null,
        toStatus: input.initial ? (to ?? from) : changing ? to! : null,
        ...input.actor,
        locationId: input.location?.id ?? null,
        locationNameSnapshot: input.location?.name ?? null,
        carrierAssignmentId: input.carrierAssignmentId ?? state.currentAssignmentId ?? null,
        serverTimestamp: at,
        deviceTimestamp: input.deviceTimestamp ?? null,
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
        verificationMethod: input.verificationMethod ?? null,
        proofId: input.proofId ?? null,
        notes: input.notes?.slice(0, 2000) ?? null,
        externalProvider: input.externalProvider ?? null,
        externalEventId: input.externalEventId ?? null,
        correctsEventId: input.correctsEventId ?? null,
        metadata: (input.metadata ?? {}) as object,
        idempotencyKey: input.idempotencyKey ?? null,
        createdAt: at,
      },
    });
  }
}
