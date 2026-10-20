import { Body, Controller, Delete, Get, MessageEvent, Param, Post, Query, Res, Sse } from "@nestjs/common";
import type { Response } from "express";
import { Observable, filter, interval, map, merge } from "rxjs";
import { Prisma } from "@prisma/client";
import {
  CARRIER_TYPE_LABEL,
  Capability,
  CarrierType,
  EVENT_LABEL,
  EventType,
  ParcelStatus,
  REDACTED_TITLE,
  STATUS_LABEL,
  STATUS_VIEW_STATUSES,
  TERMINAL_STATUSES,
} from "@abg-dispatch/shared";
import { PrismaService } from "../common/prisma.service";
import { RequireCapability } from "../auth/decorators";
import { CurrentActor, type Actor } from "../common/actor";
import { notFound } from "../common/errors";
import { toCsv } from "../common/csv";
import { dhakaDay, dhakaDayRange } from "../common/time";
import { AuditService } from "../audit/audit.service";
import { RealtimeService } from "../realtime/realtime.service";
import { ACCESS_SELECT, ParcelAccessService } from "../parcels/parcel-access.service";
import { ParcelQueryService } from "../parcels/parcel-query.service";
import { PARCEL_INCLUDE } from "../parcels/parcel-serializer";
import { AdminParcelsQuery, SavedViewDto } from "./admin.dto";
import { asUser, branchScope, scopeSql, scopeWhere, utc } from "./admin-scope";

@Controller("admin")
export class AdminParcelsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ParcelAccessService,
    private readonly query: ParcelQueryService,
    private readonly audit: AuditService,
    private readonly realtime: RealtimeService,
  ) {}

  private where(actor: Actor, q: AdminParcelsQuery): Prisma.ParcelWhereInput[] {
    const and: Prisma.ParcelWhereInput[] = [this.access.visibleWhere(actor)];
    this.query.applyCommonFilters(actor, q, and);
    if (q.originBranchId) and.push({ originBranchId: q.originBranchId });
    if (q.destinationBranchId) and.push({ destinationBranchId: q.destinationBranchId });
    if (q.departmentId) and.push({ OR: [{ senderDepartmentId: q.departmentId }, { receiverDepartmentId: q.departmentId }, { receiverEmployee: { departmentId: q.departmentId } }] });
    if (q.senderEmployeeId) and.push({ senderEmployeeId: q.senderEmployeeId });
    if (q.receiverEmployeeId) and.push({ OR: [{ receiverEmployeeId: q.receiverEmployeeId }, { actualReceiverEmployeeId: q.receiverEmployeeId }] });
    if (q.carrierType) and.push({ deliveryMethod: q.carrierType });
    if (q.carrierEmployeeId) and.push({ assignments: { some: { employeeId: q.carrierEmployeeId } } });
    if (q.courierProviderId) and.push({ assignments: { some: { courierProviderId: q.courierProviderId } } });
    if (q.classification) and.push({ classification: q.classification });
    if (q.overdue === "true") and.push({ isOverdue: true });
    if (q.overdue === "false") and.push({ isOverdue: false });
    if (q.received === "true") and.push({ status: ParcelStatus.RECEIVED });
    if (q.received === "false") and.push({ status: { not: ParcelStatus.RECEIVED } });
    return and;
  }

  @RequireCapability(Capability.DASHBOARD_VIEW)
  @Get("parcels")
  list(@CurrentActor() actor: Actor, @Query() q: AdminParcelsQuery) {
    return this.query.page(actor, this.where(actor, q), q.cursor, q.limit);
  }

  @RequireCapability(Capability.REPORTS_EXPORT)
  @Get("parcels/export.csv")
  async export(@CurrentActor() actor: Actor, @Query() q: AdminParcelsQuery, @Res() res: Response) {
    const rows = await this.prisma.parcel.findMany({ where: { AND: this.where(actor, q) }, include: PARCEL_INCLUDE, orderBy: { createdAt: "desc" }, take: 10_000 });
    const iso = (d: Date | null) => (d ? d.toISOString() : "");
    const csv = toCsv(
      ["Tracking ID", "Title", "Status", "Priority", "Classification", "Sender", "Sender ID", "Receiver", "Origin", "Destination", "Carrier type", "Carrier", "External tracking", "Booked", "Picked up", "Arrived", "Received", "Received by", "On behalf", "Overdue"],
      rows.map((p) => {
        const content = this.access.contentAccess(actor, p);
        return [
          p.trackingNumber,
          content === "REDACTED" ? REDACTED_TITLE : p.title,
          STATUS_LABEL[p.status as ParcelStatus],
          p.priority,
          p.classification,
          p.senderEmployee.fullName,
          p.senderEmployee.employeeCode,
          p.receiverEmployee?.fullName ?? p.receiverDepartment?.name ?? p.externalReceiverName ?? p.destinationBranch?.name ?? "",
          p.originBranch.name,
          p.destinationBranch?.name ?? p.externalReceiverAddress ?? "",
          CARRIER_TYPE_LABEL[p.deliveryMethod as CarrierType] ?? p.deliveryMethod,
          p.currentAssignment?.carrierNameSnapshot ?? "",
          p.currentAssignment?.externalTrackingNumber ?? "",
          iso(p.bookedAt),
          iso(p.pickedUpAt),
          iso(p.arrivedAt),
          iso(p.receivedAt),
          p.actualReceiverName ?? "",
          p.receivedOnBehalf ? "Yes" : "",
          p.isOverdue ? "Yes" : "",
        ];
      }),
    );
    await this.audit.record({ actor, action: "report.exported", objectType: "export", objectId: "parcels", summary: `Exported ${rows.length} parcels`, after: { filters: q } });
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="abg-dispatch-parcels-${dhakaDay(new Date())}.csv"`);
    res.send(csv);
  }

  @RequireCapability(Capability.DASHBOARD_VIEW)
  @Get("dashboard")
  async dashboard(@CurrentActor() actor: Actor, @Query("branchId") branchId?: string) {
    const scope = branchScope(actor);
    const base: Prisma.ParcelWhereInput = {
      AND: [scopeWhere(scope), branchId ? { OR: [{ originBranchId: branchId }, { destinationBranchId: branchId }] } : {}],
    };
    const today = dhakaDayRange(dhakaDay(new Date()));
    const count = (where: Prisma.ParcelWhereInput) => this.prisma.parcel.count({ where: { AND: [base, where] } });
    const open = { status: { notIn: [...TERMINAL_STATUSES] } };
    const [bookedToday, booked, awaitingPickup, inRoute, arrived, pendingReceipt, receivedToday, overdue, exceptions, returnsOpen, returnedToday] = await Promise.all([
      count({ bookedAt: today }),
      count({ status: ParcelStatus.BOOKED }),
      count({ status: ParcelStatus.AWAITING_PICKUP }),
      count({ status: { in: [...STATUS_VIEW_STATUSES.IN_ROUTE] } }),
      count({ status: ParcelStatus.ARRIVED_AT_DESTINATION }),
      count({ status: { in: [...STATUS_VIEW_STATUSES.PENDING_RECEIPT] } }),
      count({ status: ParcelStatus.RECEIVED, receivedAt: today }),
      count({ ...open, isOverdue: true }),
      count({ OR: [{ status: { in: [...STATUS_VIEW_STATUSES.EXCEPTIONS] } }, { ...open, hasOpenException: true }] }),
      count({ status: { in: [ParcelStatus.RETURN_REQUESTED, ParcelStatus.RETURN_IN_TRANSIT] } }),
      count({ status: ParcelStatus.RETURNED, returnedAt: today }),
    ]);

    const pending = await this.prisma.parcel.findMany({
      where: { AND: [base, { status: ParcelStatus.PENDING_RECEIPT }] },
      select: { pendingReceiptAt: true },
    });
    const now = Date.now();
    const buckets = [
      { label: "< 30 min", max: 30 },
      { label: "30–60 min", max: 60 },
      { label: "1–2 h", max: 120 },
      { label: "2–4 h", max: 240 },
      { label: "> 4 h", max: Infinity },
    ].map((b) => ({ ...b, count: 0 }));
    for (const p of pending) {
      const mins = p.pendingReceiptAt ? (now - p.pendingReceiptAt.getTime()) / 60000 : 0;
      buckets.find((b) => mins < b.max)!.count++;
    }

    const recentEvents = await this.prisma.parcelEvent.findMany({
      where: {
        parcel: base,
        eventType: { in: [EventType.PARCEL_CREATED, EventType.PICKED_UP, EventType.ARRIVED_AT_DESTINATION, EventType.RECEIVED, EventType.EXCEPTION_RECORDED, EventType.SLA_ESCALATED, EventType.CARRIER_REASSIGNED, EventType.RETURN_REQUESTED, EventType.DELIVERY_FAILED] },
      },
      include: { parcel: { select: { ...ACCESS_SELECT, trackingNumber: true, title: true, priority: true } } },
      orderBy: { serverTimestamp: "desc" },
      take: 14,
    });
    const attention = await this.prisma.parcel.findMany({
      where: { AND: [base, open, { OR: [{ isOverdue: true }, { hasOpenException: true }, { status: { in: [...STATUS_VIEW_STATUSES.EXCEPTIONS] } }] }] },
      include: PARCEL_INCLUDE,
      orderBy: [{ isOverdue: "desc" }, { statusChangedAt: "asc" }],
      take: 8,
    });
    const hourly = await this.prisma.$queryRaw<{ hour: number; booked: bigint; received: bigint }[]>`
      SELECT h.hour,
        (SELECT count(*) FROM "parcels" p WHERE p."bookedAt" >= ${utc(today.gte)} AND p."bookedAt" < ${utc(today.lt)}
           AND EXTRACT(HOUR FROM p."bookedAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Dhaka') = h.hour
           ${scopeSql(scope, branchId)}) AS booked,
        (SELECT count(*) FROM "parcels" p WHERE p."receivedAt" >= ${utc(today.gte)} AND p."receivedAt" < ${utc(today.lt)}
           AND EXTRACT(HOUR FROM p."receivedAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Dhaka') = h.hour
           ${scopeSql(scope, branchId)}) AS received
      FROM generate_series(7, 21) AS h(hour) ORDER BY h.hour`;

    return {
      kpis: { bookedToday, booked, awaitingPickup, inRoute, arrived, pendingReceipt, receivedToday, overdue, exceptions, returnsOpen, returnedToday },
      pendingAging: buckets.map(({ label, count }) => ({ label, count })),
      hourly: hourly.map((h) => ({ hour: Number(h.hour), booked: Number(h.booked), received: Number(h.received) })),
      recent: recentEvents.map((e) => ({
        id: e.id,
        parcelId: e.parcel.id,
        trackingNumber: e.parcel.trackingNumber,
        title: this.access.contentAccess(actor, e.parcel) === "REDACTED" ? REDACTED_TITLE : e.parcel.title,
        priority: e.parcel.priority,
        eventType: e.eventType,
        label: EVENT_LABEL[e.eventType as EventType] ?? e.eventType,
        actor: e.actorNameSnapshot,
        location: e.locationNameSnapshot,
        at: e.serverTimestamp,
      })),
      attention: attention.map((p) => ({
        id: p.id,
        trackingNumber: p.trackingNumber,
        title: this.access.contentAccess(actor, p) === "REDACTED" ? REDACTED_TITLE : p.title,
        status: p.status,
        priority: p.priority,
        isOverdue: p.isOverdue,
        hasOpenException: p.hasOpenException,
        origin: p.originBranch.name,
        destination: p.destinationBranch?.name ?? "External",
        since: p.statusChangedAt,
        carrier: p.currentAssignment?.carrierNameSnapshot ?? null,
      })),
      generatedAt: new Date(),
    };
  }

  @RequireCapability(Capability.DASHBOARD_VIEW)
  @Get("saved-views")
  savedViews(@CurrentActor() actor: Actor) {
    return this.prisma.savedView.findMany({ where: { userId: asUser(actor).userId }, orderBy: { createdAt: "asc" } });
  }

  @RequireCapability(Capability.DASHBOARD_VIEW)
  @Post("saved-views")
  createView(@CurrentActor() actor: Actor, @Body() dto: SavedViewDto) {
    const filters = Object.fromEntries(Object.entries(dto.filters).filter(([, v]) => typeof v === "string" && v.length <= 200));
    return this.prisma.savedView.create({ data: { userId: asUser(actor).userId, name: dto.name.trim(), filters } });
  }

  @RequireCapability(Capability.DASHBOARD_VIEW)
  @Delete("saved-views/:id")
  async deleteView(@CurrentActor() actor: Actor, @Param("id") id: string) {
    const view = await this.prisma.savedView.findUnique({ where: { id } });
    if (!view || view.userId !== asUser(actor).userId) throw notFound("Saved view not found.");
    await this.prisma.savedView.delete({ where: { id } });
    return { ok: true };
  }

  /** Live feed for the control room. Only changes inside the viewer's branches are sent. */
  @RequireCapability(Capability.DASHBOARD_VIEW)
  @Sse("stream")
  stream(@CurrentActor() actor: Actor): Observable<MessageEvent> {
    const scope = branchScope(actor);
    const changes = this.realtime.changes.pipe(
      filter((c) => !scope || scope.includes(c.originBranchId) || (!!c.destinationBranchId && scope.includes(c.destinationBranchId))),
      map((c) => ({ type: "parcel", data: { parcelId: c.parcelId, trackingNumber: c.trackingNumber, status: c.status, eventTypes: c.eventTypes, at: c.at } }) as MessageEvent),
    );
    const heartbeat = interval(25_000).pipe(map(() => ({ type: "ping", data: { at: new Date().toISOString() } }) as MessageEvent));
    return merge(changes, heartbeat);
  }
}
