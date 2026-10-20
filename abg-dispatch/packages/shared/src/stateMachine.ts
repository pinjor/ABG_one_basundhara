import { ParcelStatus } from "./enums";

/**
 * The parcel lifecycle. The API is the only writer of `parcels.status`; it
 * rejects any change not listed here, so a client can never jump a parcel to
 * RECEIVED without going through the receipt workflow.
 *
 * ARRIVED_AT_DESTINATION and RECEIVED are deliberately different states:
 * reaching Factory Reception is not the same as the intended person taking
 * custody, and both timestamps are kept.
 */
export const STATUS_TRANSITIONS: Record<ParcelStatus, readonly ParcelStatus[]> = {
  DRAFT: [ParcelStatus.BOOKED, ParcelStatus.CANCELLED],
  BOOKED: [ParcelStatus.AWAITING_PICKUP, ParcelStatus.ON_HOLD, ParcelStatus.CANCELLED],
  AWAITING_PICKUP: [ParcelStatus.PICKED_UP, ParcelStatus.BOOKED, ParcelStatus.ON_HOLD, ParcelStatus.CANCELLED],
  PICKED_UP: [
    ParcelStatus.IN_TRANSIT,
    ParcelStatus.DELIVERY_EXCEPTION,
    ParcelStatus.ON_HOLD,
    ParcelStatus.RETURN_REQUESTED,
  ],
  IN_TRANSIT: [
    ParcelStatus.ARRIVED_AT_DESTINATION,
    ParcelStatus.DELIVERY_EXCEPTION,
    ParcelStatus.ON_HOLD,
    ParcelStatus.RETURN_REQUESTED,
  ],
  ARRIVED_AT_DESTINATION: [ParcelStatus.PENDING_RECEIPT, ParcelStatus.DELIVERY_EXCEPTION],
  PENDING_RECEIPT: [
    ParcelStatus.RECEIVED,
    ParcelStatus.DELIVERY_EXCEPTION,
    ParcelStatus.DELIVERY_FAILED,
    ParcelStatus.ON_HOLD,
    ParcelStatus.RETURN_REQUESTED,
  ],
  RECEIVED: [],
  ON_HOLD: [
    ParcelStatus.BOOKED,
    ParcelStatus.AWAITING_PICKUP,
    ParcelStatus.PICKED_UP,
    ParcelStatus.IN_TRANSIT,
    ParcelStatus.PENDING_RECEIPT,
    ParcelStatus.RETURN_REQUESTED,
    ParcelStatus.CANCELLED,
  ],
  DELIVERY_EXCEPTION: [
    ParcelStatus.PICKED_UP,
    ParcelStatus.IN_TRANSIT,
    ParcelStatus.ARRIVED_AT_DESTINATION,
    ParcelStatus.PENDING_RECEIPT,
    ParcelStatus.DELIVERY_FAILED,
    ParcelStatus.ON_HOLD,
    ParcelStatus.RETURN_REQUESTED,
    ParcelStatus.RETURN_IN_TRANSIT,
  ],
  DELIVERY_FAILED: [ParcelStatus.IN_TRANSIT, ParcelStatus.PENDING_RECEIPT, ParcelStatus.RETURN_REQUESTED],
  RETURN_REQUESTED: [ParcelStatus.RETURN_IN_TRANSIT, ParcelStatus.DELIVERY_EXCEPTION],
  RETURN_IN_TRANSIT: [ParcelStatus.RETURNED, ParcelStatus.DELIVERY_EXCEPTION],
  RETURNED: [],
  CANCELLED: [],
};

export function canTransition(from: ParcelStatus, to: ParcelStatus): boolean {
  return STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

export const TERMINAL_STATUSES: readonly ParcelStatus[] = [
  ParcelStatus.RECEIVED,
  ParcelStatus.RETURNED,
  ParcelStatus.CANCELLED,
];

export function isTerminal(status: ParcelStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

/** A parcel can be cancelled only while it is still with the sender. After pickup it must be returned. */
export const CANCELLABLE_STATUSES: readonly ParcelStatus[] = [
  ParcelStatus.DRAFT,
  ParcelStatus.BOOKED,
  ParcelStatus.AWAITING_PICKUP,
  ParcelStatus.ON_HOLD,
];

/** Statuses in which a carrier physically holds the parcel. */
export const IN_CUSTODY_STATUSES: readonly ParcelStatus[] = [
  ParcelStatus.PICKED_UP,
  ParcelStatus.IN_TRANSIT,
  ParcelStatus.ARRIVED_AT_DESTINATION,
  ParcelStatus.PENDING_RECEIPT,
  ParcelStatus.DELIVERY_EXCEPTION,
  ParcelStatus.DELIVERY_FAILED,
  ParcelStatus.RETURN_REQUESTED,
  ParcelStatus.RETURN_IN_TRANSIT,
];

/**
 * Operational views used by the admin dashboard tabs and the KPI cards. Keep
 * these in one place so a KPI count and the list it opens can never disagree.
 */
export const StatusView = {
  ALL: "ALL",
  BOOKED: "BOOKED",
  AWAITING_PICKUP: "AWAITING_PICKUP",
  IN_ROUTE: "IN_ROUTE",
  ARRIVED: "ARRIVED",
  PENDING_RECEIPT: "PENDING_RECEIPT",
  RECEIVED: "RECEIVED",
  EXCEPTIONS: "EXCEPTIONS",
  OVERDUE: "OVERDUE",
  RETURNS: "RETURNS",
  CANCELLED: "CANCELLED",
  DRAFTS: "DRAFTS",
} as const;
export type StatusView = (typeof StatusView)[keyof typeof StatusView];

export const STATUS_VIEW_STATUSES: Record<Exclude<StatusView, "ALL" | "OVERDUE">, readonly ParcelStatus[]> = {
  BOOKED: [ParcelStatus.BOOKED],
  AWAITING_PICKUP: [ParcelStatus.AWAITING_PICKUP],
  IN_ROUTE: [ParcelStatus.PICKED_UP, ParcelStatus.IN_TRANSIT],
  ARRIVED: [ParcelStatus.ARRIVED_AT_DESTINATION],
  PENDING_RECEIPT: [ParcelStatus.ARRIVED_AT_DESTINATION, ParcelStatus.PENDING_RECEIPT],
  RECEIVED: [ParcelStatus.RECEIVED],
  EXCEPTIONS: [ParcelStatus.DELIVERY_EXCEPTION, ParcelStatus.DELIVERY_FAILED, ParcelStatus.ON_HOLD],
  RETURNS: [ParcelStatus.RETURN_REQUESTED, ParcelStatus.RETURN_IN_TRANSIT, ParcelStatus.RETURNED],
  CANCELLED: [ParcelStatus.CANCELLED],
  DRAFTS: [ParcelStatus.DRAFT],
};

/** The happy path, used to draw the upcoming (hollow) steps of a timeline. */
export const HAPPY_PATH: readonly ParcelStatus[] = [
  ParcelStatus.BOOKED,
  ParcelStatus.AWAITING_PICKUP,
  ParcelStatus.PICKED_UP,
  ParcelStatus.IN_TRANSIT,
  ParcelStatus.ARRIVED_AT_DESTINATION,
  ParcelStatus.PENDING_RECEIPT,
  ParcelStatus.RECEIVED,
];

/** Index of a status on the happy path, or -1 for exception/return states. */
export function happyPathIndex(status: ParcelStatus): number {
  return HAPPY_PATH.indexOf(status);
}
