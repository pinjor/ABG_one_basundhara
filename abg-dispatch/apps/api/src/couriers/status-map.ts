import { ExternalStatus } from "@abg-dispatch/shared";

/**
 * Raw provider vocabularies → ABG's normalised ExternalStatus. Keys are
 * lower-cased with any run of space / dot / dash / underscore collapsed to "_",
 * and a leading "order_" (Pathao event names such as "order.picked") removed.
 *
 * These tables follow each provider's published merchant vocabulary at the time
 * of writing. Verify them against the current merchant documentation when the
 * API integration is switched on; unknown values are kept raw and change nothing.
 */
const GENERIC: Record<string, ExternalStatus> = {
  pending: ExternalStatus.PENDING,
  accepted: ExternalStatus.PENDING,
  booked: ExternalStatus.PENDING,
  created: ExternalStatus.PENDING,
  pickup_requested: ExternalStatus.PENDING,
  picked: ExternalStatus.PICKED_UP,
  picked_up: ExternalStatus.PICKED_UP,
  collected: ExternalStatus.PICKED_UP,
  in_transit: ExternalStatus.IN_TRANSIT,
  shipped: ExternalStatus.IN_TRANSIT,
  at_hub: ExternalStatus.IN_TRANSIT,
  out_for_delivery: ExternalStatus.OUT_FOR_DELIVERY,
  delivered: ExternalStatus.DELIVERED,
  failed: ExternalStatus.FAILED,
  delivery_failed: ExternalStatus.FAILED,
  undelivered: ExternalStatus.FAILED,
  hold: ExternalStatus.ON_HOLD,
  on_hold: ExternalStatus.ON_HOLD,
  returning: ExternalStatus.RETURNING,
  return_in_transit: ExternalStatus.RETURNING,
  returned: ExternalStatus.RETURNED,
  cancelled: ExternalStatus.CANCELLED,
  canceled: ExternalStatus.CANCELLED,
};

const PATHAO: Record<string, ExternalStatus> = {
  pickup_requested: ExternalStatus.PENDING,
  assigned_for_pickup: ExternalStatus.PENDING,
  picked: ExternalStatus.PICKED_UP,
  pickup_failed: ExternalStatus.ON_HOLD,
  pickup_cancelled: ExternalStatus.CANCELLED,
  at_the_sorting_hub: ExternalStatus.IN_TRANSIT,
  in_transit: ExternalStatus.IN_TRANSIT,
  received_at_last_mile_hub: ExternalStatus.IN_TRANSIT,
  assigned_for_delivery: ExternalStatus.OUT_FOR_DELIVERY,
  delivered: ExternalStatus.DELIVERED,
  partial_delivery: ExternalStatus.DELIVERED,
  delivery_failed: ExternalStatus.FAILED,
  on_hold: ExternalStatus.ON_HOLD,
  return: ExternalStatus.RETURNING,
  returned: ExternalStatus.RETURNED,
  paid_return: ExternalStatus.RETURNED,
};

const REDX: Record<string, ExternalStatus> = {
  pickup_pending: ExternalStatus.PENDING,
  pickup_processing: ExternalStatus.PENDING,
  ready_for_delivery: ExternalStatus.IN_TRANSIT,
  delivery_in_progress: ExternalStatus.OUT_FOR_DELIVERY,
  delivered: ExternalStatus.DELIVERED,
  agent_hold: ExternalStatus.ON_HOLD,
  agent_area_change: ExternalStatus.IN_TRANSIT,
  agent_returning: ExternalStatus.RETURNING,
  returned: ExternalStatus.RETURNED,
  cancelled: ExternalStatus.CANCELLED,
};

const STEADFAST: Record<string, ExternalStatus> = {
  in_review: ExternalStatus.PENDING,
  pending: ExternalStatus.PENDING,
  delivered_approval_pending: ExternalStatus.DELIVERED,
  partial_delivered_approval_pending: ExternalStatus.DELIVERED,
  delivered: ExternalStatus.DELIVERED,
  partial_delivered: ExternalStatus.DELIVERED,
  hold: ExternalStatus.ON_HOLD,
  cancelled_approval_pending: ExternalStatus.CANCELLED,
  cancelled: ExternalStatus.CANCELLED,
};

const TABLES: Record<string, Record<string, ExternalStatus>> = { PATHAO, REDX, STEADFAST };

export function statusKey(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[\s.\-_]+/g, "_")
    .replace(/^order_/, "");
}

export function normalizeExternal(providerCode: string, raw: string): ExternalStatus | null {
  const key = statusKey(raw);
  return TABLES[providerCode]?.[key] ?? GENERIC[key] ?? null;
}
