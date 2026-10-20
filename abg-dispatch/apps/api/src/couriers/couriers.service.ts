import { Inject, Injectable, Logger } from "@nestjs/common";
import { ExternalStatus } from "@abg-dispatch/shared";
import { APP_CONFIG, type AppConfig } from "../common/config";
import { PrismaService, isUniqueViolation } from "../common/prisma.service";
import { PARCEL_NOT_FOUND, badRequest, forbidden, notFound, unauthorized } from "../common/errors";
import { Capability } from "@abg-dispatch/shared";
import type { Actor } from "../common/actor";
import { ParcelAccessService } from "../parcels/parcel-access.service";
import { ParcelWorkflowService } from "../parcels/parcel-workflow.service";
import {
  CourierProviderAdapter,
  ManualCourierAdapter,
  OtherCourierAdapter,
  PathaoAdapter,
  ProviderNotConfiguredError,
  RedxAdapter,
  SteadfastAdapter,
} from "./courier-adapter";

const LIVE = ["ASSIGNED", "ACCEPTED", "IN_CUSTODY"];
const REPLAY_WINDOW_MS = 10 * 60 * 1000;

@Injectable()
export class CouriersService {
  private readonly logger = new Logger("CouriersService");
  private readonly adapters = new Map<string, CourierProviderAdapter>(
    [new ManualCourierAdapter(), new OtherCourierAdapter(), new PathaoAdapter(), new RedxAdapter(), new SteadfastAdapter()].map((a) => [a.code, a]),
  );

  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    private readonly prisma: PrismaService,
    private readonly workflow: ParcelWorkflowService,
    private readonly access: ParcelAccessService,
  ) {}

  adapter(code: string): CourierProviderAdapter {
    return this.adapters.get(code) ?? this.adapters.get("OTHER")!;
  }

  /**
   * Provider webhook: authenticate, reject stale or replayed deliveries, then
   * apply each normalised event exactly once.
   */
  async handleWebhook(code: string, headers: Record<string, string | string[] | undefined>, rawBody: Buffer | undefined, payload: unknown) {
    const provider = await this.prisma.courierProvider.findUnique({ where: { code: code.toUpperCase() } });
    if (!provider || !provider.enabled || !provider.webhookEnabled) throw notFound("Webhook endpoint not enabled.");
    const adapter = this.adapter(provider.code);
    const secret = this.config.courierWebhookSecrets[provider.code] ?? "";
    if (!rawBody || !adapter.verifyWebhook(headers, rawBody, secret)) throw unauthorized("Invalid webhook signature.", "WEBHOOK_SIGNATURE");
    const ts = headers["x-timestamp"];
    if (typeof ts === "string" && Math.abs(Date.now() - Number(ts) * (ts.length <= 10 ? 1000 : 1)) > REPLAY_WINDOW_MS) {
      throw unauthorized("Webhook timestamp outside the allowed window.", "WEBHOOK_STALE");
    }
    const events = adapter.processWebhook(payload, rawBody);
    if (!events.length) throw badRequest("No events in payload.");
    const results = [];
    for (const ev of events) {
      let record;
      try {
        record = await this.prisma.externalProviderEvent.create({
          data: {
            courierProviderId: provider.id,
            externalEventId: ev.externalEventId,
            trackingNumber: ev.trackingNumber,
            rawStatus: ev.rawStatus,
            normalizedStatus: ev.normalized,
            payload: (payload ?? {}) as object,
            outcome: "RECEIVED",
          },
        });
      } catch (err) {
        if (isUniqueViolation(err)) {
          results.push({ externalEventId: ev.externalEventId, outcome: "DUPLICATE" });
          continue;
        }
        throw err;
      }
      const refs = [ev.trackingNumber, ev.bookingReference].filter((x): x is string => !!x);
      const assignment = refs.length
        ? await this.prisma.carrierAssignment.findFirst({
            where: { courierProviderId: provider.id, OR: [{ externalTrackingNumber: { in: refs } }, { externalBookingReference: { in: refs } }] },
            orderBy: { assignedAt: "desc" },
          })
        : null;
      let outcome = "UNMATCHED";
      let message: string | null = null;
      if (assignment && ev.normalized) {
        try {
          const applied = await this.workflow.applyExternalStatus(
            { provider: { id: provider.id, code: provider.code, name: provider.name }, externalEventId: ev.externalEventId },
            assignment.parcelId,
            { rawStatus: ev.rawStatus, normalized: ev.normalized, occurredAt: ev.occurredAt ?? undefined, note: ev.note ?? undefined, recipientName: ev.recipientName ?? undefined },
          );
          outcome = applied.outcome;
        } catch (err) {
          outcome = "REJECTED";
          message = (err as Error).message;
        }
      } else if (assignment) {
        outcome = "NO_MAPPING";
        message = `Unknown status "${ev.rawStatus}"`;
      }
      await this.prisma.externalProviderEvent.update({
        where: { id: record.id },
        data: { outcome, message, parcelId: assignment?.parcelId ?? null, assignmentId: assignment?.id ?? null },
      });
      results.push({ externalEventId: ev.externalEventId, outcome });
    }
    await this.prisma.courierProvider.update({ where: { id: provider.id }, data: { healthStatus: "HEALTHY", healthCheckedAt: new Date(), healthMessage: "Webhook received" } });
    return { received: results.length, results };
  }

  /** Pull the latest status for one external shipment (API feature flag must be on). */
  async sync(actor: Actor, parcelId: string) {
    const { facts } = await this.access.assertView(actor, parcelId).catch(() => {
      throw notFound(PARCEL_NOT_FOUND);
    });
    if (!this.access.hasOpsReach(actor, facts, Capability.EXTERNAL_STATUS_UPDATE)) throw forbidden("Only dispatch for this office can sync courier tracking.");
    const assignment = await this.prisma.carrierAssignment.findFirst({
      where: { parcelId, carrierType: "EXTERNAL_COURIER", status: { in: LIVE } },
      include: { courierProvider: true },
    });
    if (!assignment?.courierProvider || !assignment.externalTrackingNumber) throw badRequest("This parcel has no external tracking number to sync.");
    const provider = assignment.courierProvider;
    const credentials = process.env[`${provider.code}_API_TOKEN`] ?? "";
    try {
      const snap = await this.adapter(provider.code).getTracking(
        { code: provider.code, name: provider.name, apiEnabled: provider.apiEnabled, config: provider.config as Record<string, unknown> },
        assignment.externalTrackingNumber,
        credentials,
      );
      const applied = await this.workflow.applyExternalStatus(
        { provider: { id: provider.id, code: provider.code, name: provider.name } },
        parcelId,
        { rawStatus: snap.rawStatus, normalized: snap.normalized ?? ExternalStatus.PENDING, occurredAt: snap.occurredAt ?? undefined },
      );
      await this.prisma.courierProvider.update({ where: { id: provider.id }, data: { healthStatus: "HEALTHY", healthCheckedAt: new Date(), healthMessage: "Tracking sync succeeded" } });
      return { ...snap, outcome: applied.outcome };
    } catch (err) {
      if (err instanceof ProviderNotConfiguredError) throw badRequest(err.message, "PROVIDER_NOT_CONNECTED");
      await this.prisma.courierProvider.update({ where: { id: provider.id }, data: { healthStatus: "DEGRADED", healthCheckedAt: new Date(), healthMessage: (err as Error).message.slice(0, 200) } });
      this.logger.warn(`Sync failed for ${provider.code}: ${(err as Error).message}`);
      throw badRequest(`Could not reach ${provider.name}. Try again or update the status manually.`, "PROVIDER_UNAVAILABLE");
    }
  }
}
