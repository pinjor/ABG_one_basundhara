import { Controller, Get, HttpCode, Inject, Param, Post, Query, Res } from "@nestjs/common";
import type { Response } from "express";
import { Capability } from "@abg-dispatch/shared";
import { RequireCapability } from "../auth/decorators";
import { CurrentActor, type Actor } from "../common/actor";
import { badRequest } from "../common/errors";
import { toCsv } from "../common/csv";
import { PrismaService } from "../common/prisma.service";
import { APP_CONFIG, type AppConfig } from "../common/config";
import { clampLimit, decodeCursor, encodeCursor } from "../common/pagination";
import { dhakaDayRange } from "../common/time";
import { AuditService } from "../audit/audit.service";
import { PushService } from "../notifications/push.service";
import { SmsService } from "../notifications/sms.service";
import { StorageService } from "../attachments/storage.service";
import { SlaService } from "../sla/sla.service";
import { AnalyticsService } from "./analytics.service";
import { REPORT_TYPES, ReportType, ReportsService } from "./reports.service";
import { AnalyticsQuery, AuditQuery, ReportQuery } from "./admin.dto";
import { branchScope } from "./admin-scope";

@Controller("admin")
export class AdminInsightsController {
  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    private readonly prisma: PrismaService,
    private readonly analytics: AnalyticsService,
    private readonly reports: ReportsService,
    private readonly audit: AuditService,
    private readonly push: PushService,
    private readonly sms: SmsService,
    private readonly storage: StorageService,
    private readonly sla: SlaService,
  ) {}

  @RequireCapability(Capability.ANALYTICS_VIEW)
  @Get("analytics")
  overview(@CurrentActor() actor: Actor, @Query() q: AnalyticsQuery) {
    return this.analytics.overview(branchScope(actor), q);
  }

  @RequireCapability(Capability.REPORTS_EXPORT)
  @Get("reports/:type")
  async report(@CurrentActor() actor: Actor, @Param("type") type: string, @Query() q: ReportQuery, @Res({ passthrough: true }) res: Response) {
    if (!REPORT_TYPES.includes(type as ReportType)) throw badRequest(`Unknown report. Choose one of: ${REPORT_TYPES.join(", ")}.`, "UNKNOWN_REPORT");
    const report = await this.reports.build(actor, branchScope(actor), type as ReportType, q);
    await this.audit.record({ actor, action: "report.generated", objectType: "report", objectId: type, summary: `${report.title} (${report.rows.length} rows, ${q.format ?? "json"})`, after: { filters: q } });
    if (q.format === "csv") {
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="abg-${type}.csv"`);
      return toCsv(report.columns.map((c) => c.label), report.rows.map((r) => report.columns.map((c) => r[c.key] ?? "")));
    }
    return report;
  }

  @RequireCapability(Capability.AUDIT_VIEW)
  @Get("audit-logs")
  async auditLogs(@CurrentActor() actor: Actor, @Query() q: AuditQuery) {
    const limit = clampLimit(q.limit, 50, 200);
    const cursor = decodeCursor(q.cursor);
    const range = q.dateFrom || q.dateTo ? { gte: q.dateFrom ? dhakaDayRange(q.dateFrom).gte : undefined, lt: q.dateTo ? dhakaDayRange(q.dateTo).lt : undefined } : undefined;
    const scope = branchScope(actor);
    const rows = await this.prisma.auditLog.findMany({
      where: {
        action: q.action ? { contains: q.action } : undefined,
        objectType: q.objectType,
        objectId: q.objectId,
        actorUserId: q.actorUserId,
        createdAt: range,
        // Branch admins see audit entries for parcels in their branches and their own actions.
        ...(scope
          ? {
              OR: [
                { objectType: "parcel", objectId: { in: (await this.prisma.parcel.findMany({ where: { OR: [{ originBranchId: { in: scope } }, { destinationBranchId: { in: scope } }] }, select: { id: true }, take: 5000 })).map((p) => p.id) } },
                { actorUserId: actor.kind === "user" ? actor.userId : undefined },
              ],
            }
          : {}),
        ...(cursor ? { AND: [{ OR: [{ createdAt: { lt: cursor.createdAt } }, { createdAt: cursor.createdAt, id: { lt: cursor.id } }] }] } : {}),
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
    });
    const items = rows.slice(0, limit);
    return { items, nextCursor: rows.length > limit ? encodeCursor(items[items.length - 1].createdAt, items[items.length - 1].id) : null };
  }

  @RequireCapability(Capability.DASHBOARD_VIEW)
  @Get("integrations")
  async integrations() {
    const since = new Date(Date.now() - 24 * 3_600_000);
    const [db, storage, providers, deliveries, providerEvents] = await Promise.all([
      this.prisma.$queryRaw`SELECT 1`.then(() => ({ ok: true })).catch(() => ({ ok: false })),
      this.storage.healthy(),
      this.prisma.courierProvider.findMany({ orderBy: { name: "asc" } }),
      this.prisma.notificationDelivery.groupBy({ by: ["channel", "status"], where: { createdAt: { gte: since } }, _count: { _all: true } }),
      this.prisma.externalProviderEvent.groupBy({ by: ["courierProviderId", "outcome"], where: { receivedAt: { gte: since } }, _count: { _all: true } }),
    ]);
    const count = (channel: string, status: string) => deliveries.find((d) => d.channel === channel && d.status === status)?._count._all ?? 0;
    return {
      services: [
        { key: "database", name: "PostgreSQL", status: db.ok ? "HEALTHY" : "DOWN", detail: db.ok ? "Connected" : "Unreachable" },
        { key: "storage", name: "Private storage", status: storage.ok ? "HEALTHY" : "DOWN", detail: storage.message },
        {
          key: "fcm",
          name: "Firebase Cloud Messaging",
          status: this.push.configured ? (count("PUSH", "FAILED") > count("PUSH", "SENT") ? "DEGRADED" : "HEALTHY") : "NOT_CONFIGURED",
          detail: this.push.configured ? `${count("PUSH", "SENT")} sent, ${count("PUSH", "FAILED")} failed (24 h)` : "Set FCM_SERVICE_ACCOUNT_JSON to enable push",
        },
        {
          key: "sms",
          name: "SMS gateway",
          status: this.sms.providerName === "http" ? (count("SMS", "FAILED") > count("SMS", "SENT") ? "DEGRADED" : "HEALTHY") : "DEV_MODE",
          detail: this.sms.providerName === "http" ? `${count("SMS", "SENT")} sent, ${count("SMS", "FAILED")} failed (24 h)` : "Development mode: messages are logged, not sent",
        },
        {
          key: "sla",
          name: "SLA engine",
          status: this.config.slaIntervalSeconds > 0 ? "HEALTHY" : "DISABLED",
          detail: this.sla.lastRun ? `Last run ${this.sla.lastRun.ranAt}: ${this.sla.lastRun.triggered} triggered` : this.config.slaIntervalSeconds > 0 ? "Waiting for first run" : "SLA_INTERVAL_SECONDS=0",
        },
      ],
      couriers: providers.map((p) => ({
        id: p.id,
        code: p.code,
        name: p.name,
        enabled: p.enabled,
        apiEnabled: p.apiEnabled,
        webhookEnabled: p.webhookEnabled,
        webhookSecretConfigured: !!this.config.courierWebhookSecrets[p.code],
        status: !p.enabled ? "DISABLED" : p.apiEnabled || p.webhookEnabled ? p.healthStatus : "MANUAL",
        detail: p.healthMessage,
        checkedAt: p.healthCheckedAt,
        events24h: Object.fromEntries(providerEvents.filter((e) => e.courierProviderId === p.id).map((e) => [e.outcome, e._count._all])),
      })),
    };
  }

  @RequireCapability(Capability.CONFIG_MANAGE)
  @HttpCode(200)
  @Post("sla/run")
  runSla() {
    return this.sla.evaluate();
  }
}
