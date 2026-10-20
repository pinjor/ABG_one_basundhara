import { ExternalStatus } from "@abg-dispatch/shared";
import { hmacSha256, safeEqual, sha256 } from "../common/crypto";
import { normalizeExternal } from "./status-map";

export interface NormalizedProviderEvent {
  externalEventId: string;
  trackingNumber: string | null;
  bookingReference: string | null;
  rawStatus: string;
  normalized: ExternalStatus | null;
  occurredAt: string | null;
  recipientName: string | null;
  note: string | null;
}

export interface TrackingSnapshot {
  rawStatus: string;
  normalized: ExternalStatus | null;
  occurredAt: string | null;
}

export interface ProviderRecord {
  code: string;
  name: string;
  apiEnabled: boolean;
  config: Record<string, unknown>;
}

export class ProviderNotConfiguredError extends Error {}

/**
 * The contract every courier integration implements. Parcel code only ever
 * talks to this interface, so adding a provider never touches the custody
 * workflow — it only needs a status table and payload parsing.
 */
export interface CourierProviderAdapter {
  readonly code: string;
  normalizeStatus(raw: string): ExternalStatus | null;
  verifyWebhook(headers: Record<string, string | string[] | undefined>, rawBody: Buffer, secret: string): boolean;
  processWebhook(payload: unknown, rawBody: Buffer): NormalizedProviderEvent[];
  getTracking(provider: ProviderRecord, trackingNumber: string, credentials: string): Promise<TrackingSnapshot>;
  cancelShipment(provider: ProviderRecord, trackingNumber: string, credentials: string): Promise<void>;
}

function header(headers: Record<string, string | string[] | undefined>, name: string): string | undefined {
  const v = headers[name.toLowerCase()];
  return Array.isArray(v) ? v[0] : v;
}

function pick(obj: Record<string, unknown>, keys: string[]): string | null {
  for (const k of keys) {
    const v = k.split(".").reduce<unknown>((o, part) => (o && typeof o === "object" ? (o as Record<string, unknown>)[part] : undefined), obj);
    if (v !== undefined && v !== null && String(v).trim() !== "") return String(v);
  }
  return null;
}

/**
 * Shared behaviour. Webhooks are accepted when they carry either an HMAC-SHA256
 * of the raw body (`x-abg-signature` / provider header, hex or base64) or a
 * bearer token equal to the configured secret (the Steadfast style).
 */
export abstract class BaseCourierAdapter implements CourierProviderAdapter {
  abstract readonly code: string;
  protected signatureHeaders = ["x-abg-signature", "x-signature", "x-hub-signature-256"];
  protected trackingKeys = ["consignment_id", "tracking_number", "tracking_id", "tracking_code", "data.consignment_id", "data.tracking_number"];
  protected referenceKeys = ["merchant_order_id", "invoice", "reference", "data.merchant_order_id", "data.invoice"];
  protected statusKeys = ["order_status", "delivery_status", "status", "event", "data.order_status", "data.status"];
  protected timeKeys = ["updated_at", "timestamp", "event_time", "data.updated_at"];
  protected eventIdKeys = ["event_id", "webhook_id", "id", "data.event_id"];
  protected recipientKeys = ["recipient_name", "receiver_name", "data.recipient_name"];

  normalizeStatus(raw: string): ExternalStatus | null {
    return normalizeExternal(this.code, raw);
  }

  verifyWebhook(headers: Record<string, string | string[] | undefined>, rawBody: Buffer, secret: string): boolean {
    if (!secret) return false;
    const auth = header(headers, "authorization");
    if (auth?.startsWith("Bearer ") && safeEqual(auth.slice(7), secret)) return true;
    for (const name of this.signatureHeaders) {
      const sig = header(headers, name)?.replace(/^sha256=/, "");
      if (!sig) continue;
      if (safeEqual(sig, hmacSha256(secret, rawBody, "hex")) || safeEqual(sig, hmacSha256(secret, rawBody, "base64"))) return true;
    }
    return false;
  }

  processWebhook(payload: unknown, rawBody: Buffer): NormalizedProviderEvent[] {
    const items = Array.isArray(payload) ? payload : [payload];
    return items
      .filter((x): x is Record<string, unknown> => !!x && typeof x === "object")
      .map((item, i) => {
        const rawStatus = pick(item, this.statusKeys) ?? "unknown";
        return {
          externalEventId: pick(item, this.eventIdKeys) ?? `${sha256(rawBody)}:${i}`,
          trackingNumber: pick(item, this.trackingKeys),
          bookingReference: pick(item, this.referenceKeys),
          rawStatus,
          normalized: this.normalizeStatus(rawStatus),
          occurredAt: pick(item, this.timeKeys),
          recipientName: pick(item, this.recipientKeys),
          note: pick(item, ["reason", "note", "message", "data.reason"]),
        };
      });
  }

  /**
   * Polls the provider's tracking endpoint, configured per provider as
   * `config.trackingEndpoint` (e.g. "https://…/track/{tracking}") with
   * `config.statusField`. Only runs when the API feature flag is on.
   */
  async getTracking(provider: ProviderRecord, trackingNumber: string, credentials: string): Promise<TrackingSnapshot> {
    const endpoint = provider.config.trackingEndpoint;
    if (!provider.apiEnabled || typeof endpoint !== "string" || !credentials) {
      throw new ProviderNotConfiguredError(`${provider.name} API is not connected; update the status manually.`);
    }
    const res = await fetch(endpoint.replace("{tracking}", encodeURIComponent(trackingNumber)), {
      headers: { authorization: `Bearer ${credentials}`, accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`${provider.name} responded ${res.status}`);
    const body = (await res.json()) as Record<string, unknown>;
    const field = typeof provider.config.statusField === "string" ? [provider.config.statusField] : this.statusKeys;
    const rawStatus = pick(body, field) ?? "unknown";
    return { rawStatus, normalized: this.normalizeStatus(rawStatus), occurredAt: pick(body, this.timeKeys) };
  }

  async cancelShipment(provider: ProviderRecord): Promise<void> {
    throw new ProviderNotConfiguredError(`Cancel the booking in the ${provider.name} merchant panel; API cancellation is not enabled.`);
  }
}

export class ManualCourierAdapter extends BaseCourierAdapter {
  readonly code = "MANUAL";
}

export class OtherCourierAdapter extends BaseCourierAdapter {
  readonly code = "OTHER";
}

export class PathaoAdapter extends BaseCourierAdapter {
  readonly code = "PATHAO";
  protected signatureHeaders = ["x-pathao-signature", "x-abg-signature", "x-signature"];
}

export class RedxAdapter extends BaseCourierAdapter {
  readonly code = "REDX";
  protected trackingKeys = ["tracking_number", "tracking_id", "parcel_tracking_id", "data.tracking_number"];
}

export class SteadfastAdapter extends BaseCourierAdapter {
  readonly code = "STEADFAST";
  protected trackingKeys = ["consignment_id", "tracking_code", "data.consignment_id"];
  protected statusKeys = ["status", "delivery_status", "data.status"];
}
