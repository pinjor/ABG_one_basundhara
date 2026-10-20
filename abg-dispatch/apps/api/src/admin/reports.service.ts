import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import {
  CARRIER_TYPE_LABEL,
  CarrierType,
  EVENT_LABEL,
  EXCEPTION_LABEL,
  EventType,
  ExceptionCode,
  ParcelStatus,
  REDACTED_TITLE,
  STATUS_LABEL,
  TERMINAL_STATUSES,
  VERIFICATION_LABEL,
} from "@abg-dispatch/shared";
import { PrismaService } from "../common/prisma.service";
import { badRequest, notFound, PARCEL_NOT_FOUND } from "../common/errors";
import { dhakaDay, dhakaDayRange, minutesBetween } from "../common/time";
import type { Actor } from "../common/actor";
import { ParcelAccessService } from "../parcels/parcel-access.service";
import { PARCEL_INCLUDE, ParcelWithRelations } from "../parcels/parcel-serializer";
import { scopeSql, scopeWhere, utc } from "./admin-scope";
import { defaultRange } from "./analytics.service";

export interface ReportColumn {
  key: string;
  label: string;
}

export interface Report {
  type: string;
  title: string;
  subtitle: string;
  columns: ReportColumn[];
  rows: Record<string, string | number | null>[];
  generatedAt: string;
}

export const REPORT_TYPES = [
  "daily-register",
  "incoming",
  "outgoing",
  "pending-receipt",
  "overdue",
  "completed",
  "exceptions",
  "monthly-branch",
  "courier-activity",
  "chain-of-custody",
] as const;
export type ReportType = (typeof REPORT_TYPES)[number];

const REGISTER: ReportColumn[] = [
  { key: "trackingNumber", label: "Tracking ID" },
  { key: "title", label: "Title" },
  { key: "sender", label: "Sender" },
  { key: "receiver", label: "Receiver" },
  { key: "origin", label: "Origin" },
  { key: "destination", label: "Destination" },
  { key: "carrier", label: "Courier" },
  { key: "bookedAt", label: "Booked" },
  { key: "pickedUpAt", label: "Picked up" },
  { key: "arrivedAt", label: "Arrived" },
  { key: "receivedAt", label: "Received" },
  { key: "receivedBy", label: "Received by" },
  { key: "status", label: "Status" },
];

const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ParcelAccessService,
  ) {}

  private registerRow(actor: Actor, p: ParcelWithRelations) {
    const title = this.access.contentAccess(actor, p) === "REDACTED" ? REDACTED_TITLE : p.title;
    const carrier = p.currentAssignment
      ? `${p.currentAssignment.carrierNameSnapshot} (${CARRIER_TYPE_LABEL[p.currentAssignment.carrierType as CarrierType] ?? p.currentAssignment.carrierType})`
      : null;
    return {
      trackingNumber: p.trackingNumber,
      title,
      sender: `${p.senderEmployee.fullName} · ${p.senderEmployee.employeeCode}`,
      receiver: p.receiverEmployee ? `${p.receiverEmployee.fullName} · ${p.receiverEmployee.employeeCode}` : (p.receiverDepartment?.name ?? p.externalReceiverName ?? p.destinationBranch?.name ?? null),
      origin: p.originLocation?.path ?? p.originBranch.name,
      destination: p.destinationLocation?.path ?? p.destinationBranch?.name ?? p.externalReceiverAddress ?? null,
      carrier,
      bookedAt: iso(p.bookedAt),
      pickedUpAt: iso(p.pickedUpAt),
      arrivedAt: iso(p.arrivedAt),
      receivedAt: iso(p.receivedAt),
      receivedBy: p.actualReceiverName ? `${p.actualReceiverName}${p.receivedOnBehalf ? " (on behalf)" : ""}` : null,
      status: STATUS_LABEL[p.status as ParcelStatus] ?? p.status,
    };
  }

  private async register(actor: Actor, where: Prisma.ParcelWhereInput, orderBy: Prisma.ParcelOrderByWithRelationInput = { bookedAt: "asc" }) {
    const rows = await this.prisma.parcel.findMany({ where: { AND: [this.access.visibleWhere(actor), where] }, include: PARCEL_INCLUDE, orderBy, take: 5000 });
    return rows.map((p) => this.registerRow(actor, p));
  }

  async build(actor: Actor, scope: string[] | null, type: ReportType, q: { date?: string; month?: string; from?: string; to?: string; branchId?: string; parcelId?: string }): Promise<Report> {
    const generatedAt = new Date().toISOString();
    const branchFilter: Prisma.ParcelWhereInput = q.branchId ? { OR: [{ originBranchId: q.branchId }, { destinationBranchId: q.branchId }] } : {};
    const base: Prisma.ParcelWhereInput = { AND: [scopeWhere(scope), branchFilter] };
    const range = defaultRange(q.from, q.to);
    const rangeLabel = `${range.from} to ${range.to}`;
    const branchName = q.branchId ? (await this.prisma.branch.findUnique({ where: { id: q.branchId } }))?.name ?? "" : "All permitted offices";

    switch (type) {
      case "daily-register": {
        const day = q.date ?? dhakaDay(new Date());
        return { type, title: "Daily Dispatch Register", subtitle: `${day} · ${branchName}`, columns: REGISTER, rows: await this.register(actor, { AND: [base, { bookedAt: dhakaDayRange(day) }] }), generatedAt };
      }
      case "incoming":
      case "outgoing": {
        if (!q.branchId) throw badRequest("Choose an office for the incoming / outgoing register.", "BRANCH_REQUIRED");
        const field = type === "incoming" ? "destinationBranchId" : "originBranchId";
        return {
          type,
          title: type === "incoming" ? "Incoming Register" : "Outgoing Register",
          subtitle: `${branchName} · ${rangeLabel}`,
          columns: REGISTER,
          rows: await this.register(actor, { AND: [scopeWhere(scope), { [field]: q.branchId }, { bookedAt: { gte: range.gte, lt: range.lt } }] }),
          generatedAt,
        };
      }
      case "pending-receipt": {
        const rows = await this.prisma.parcel.findMany({
          where: { AND: [this.access.visibleWhere(actor), base, { status: { in: [ParcelStatus.ARRIVED_AT_DESTINATION, ParcelStatus.PENDING_RECEIPT] } }] },
          include: PARCEL_INCLUDE,
          orderBy: { pendingReceiptAt: "asc" },
        });
        return {
          type,
          title: "Pending Receipt Report",
          subtitle: `Parcels at their destination, not yet received · ${branchName}`,
          columns: [...REGISTER.filter((c) => !["receivedAt", "receivedBy", "status"].includes(c.key)), { key: "waitingMinutes", label: "Waiting (min)" }],
          rows: rows.map((p) => ({ ...this.registerRow(actor, p), waitingMinutes: minutesBetween(p.pendingReceiptAt ?? p.arrivedAt, new Date()) })),
          generatedAt,
        };
      }
      case "overdue":
        return {
          type,
          title: "Overdue Report",
          subtitle: `Open parcels past their SLA · ${branchName}`,
          columns: [...REGISTER, { key: "overdueSince", label: "Overdue since" }],
          rows: (await this.prisma.parcel.findMany({
            where: { AND: [this.access.visibleWhere(actor), base, { isOverdue: true, status: { notIn: [...TERMINAL_STATUSES] } }] },
            include: PARCEL_INCLUDE,
            orderBy: { overdueSince: "asc" },
          })).map((p) => ({ ...this.registerRow(actor, p), overdueSince: iso(p.overdueSince) })),
          generatedAt,
        };
      case "completed":
        return {
          type,
          title: "Completed Parcel Report",
          subtitle: `Received ${rangeLabel} · ${branchName}`,
          columns: [...REGISTER, { key: "verification", label: "Proof" }, { key: "endToEndMinutes", label: "End-to-end (min)" }],
          rows: (await this.prisma.parcel.findMany({
            where: { AND: [this.access.visibleWhere(actor), base, { status: ParcelStatus.RECEIVED, receivedAt: { gte: range.gte, lt: range.lt } }] },
            include: PARCEL_INCLUDE,
            orderBy: { receivedAt: "asc" },
          })).map((p) => ({
            ...this.registerRow(actor, p),
            verification: p.receiptVerification ? VERIFICATION_LABEL[p.receiptVerification as keyof typeof VERIFICATION_LABEL] ?? p.receiptVerification : null,
            endToEndMinutes: minutesBetween(p.bookedAt, p.receivedAt),
          })),
          generatedAt,
        };
      case "exceptions": {
        const rows = await this.prisma.parcelException.findMany({
          where: { raisedAt: { gte: range.gte, lt: range.lt }, parcel: { AND: [this.access.visibleWhere(actor), base] } },
          include: { parcel: { select: { trackingNumber: true, status: true, originBranch: { select: { name: true } }, destinationBranch: { select: { name: true } } } } },
          orderBy: { raisedAt: "asc" },
        });
        return {
          type,
          title: "Exception Report",
          subtitle: `${rangeLabel} · ${branchName}`,
          columns: [
            { key: "trackingNumber", label: "Tracking ID" },
            { key: "exception", label: "Exception" },
            { key: "details", label: "Details" },
            { key: "route", label: "Route" },
            { key: "raisedBy", label: "Raised by" },
            { key: "raisedAt", label: "Raised" },
            { key: "resolvedBy", label: "Resolved by" },
            { key: "resolvedAt", label: "Resolved" },
            { key: "resolution", label: "Resolution" },
            { key: "status", label: "Parcel status" },
          ],
          rows: rows.map((x) => ({
            trackingNumber: x.parcel.trackingNumber,
            exception: EXCEPTION_LABEL[x.code as ExceptionCode] ?? x.code,
            details: x.details,
            route: `${x.parcel.originBranch.name} → ${x.parcel.destinationBranch?.name ?? "External"}`,
            raisedBy: x.raisedByName,
            raisedAt: iso(x.raisedAt),
            resolvedBy: x.resolvedByName,
            resolvedAt: iso(x.resolvedAt),
            resolution: x.resolution,
            status: STATUS_LABEL[x.parcel.status as ParcelStatus],
          })),
          generatedAt,
        };
      }
      case "monthly-branch": {
        const month = q.month ?? dhakaDay(new Date()).slice(0, 7);
        const start = new Date(`${month}-01T00:00:00+06:00`);
        const end = new Date(start);
        end.setUTCMonth(end.getUTCMonth() + 1);
        const s = scopeSql(scope, q.branchId);
        const rows = await this.prisma.$queryRaw<Record<string, unknown>[]>`
          SELECT b.name AS branch,
            count(*) FILTER (WHERE p."originBranchId" = b.id) AS outgoing,
            count(*) FILTER (WHERE p."destinationBranchId" = b.id) AS incoming,
            count(*) FILTER (WHERE p."destinationBranchId" = b.id AND p.status = 'RECEIVED') AS received,
            count(*) FILTER (WHERE p."overdueSince" IS NOT NULL) AS overdue,
            avg(EXTRACT(EPOCH FROM (p."receivedAt" - p."arrivedAt")) / 60) FILTER (WHERE p."destinationBranchId" = b.id) AS avg_wait,
            avg(EXTRACT(EPOCH FROM (p."receivedAt" - p."bookedAt")) / 60) FILTER (WHERE p."originBranchId" = b.id) AS avg_e2e
          FROM "branches" b
          JOIN "parcels" p ON (p."originBranchId" = b.id OR p."destinationBranchId" = b.id)
          WHERE p."bookedAt" >= ${utc(start)} AND p."bookedAt" < ${utc(end)} AND p.status <> 'DRAFT' ${s}
          GROUP BY b.name ORDER BY b.name`;
        const r = (v: unknown) => (v === null ? null : Math.round(Number(v)));
        return {
          type,
          title: "Monthly Branch Report",
          subtitle: month,
          columns: [
            { key: "branch", label: "Office" },
            { key: "outgoing", label: "Sent" },
            { key: "incoming", label: "Incoming" },
            { key: "received", label: "Received" },
            { key: "overdue", label: "Breached SLA" },
            { key: "avgWait", label: "Avg wait at destination (min)" },
            { key: "avgEndToEnd", label: "Avg end-to-end (min)" },
          ],
          rows: rows.map((x) => ({ branch: String(x.branch), outgoing: Number(x.outgoing), incoming: Number(x.incoming), received: Number(x.received), overdue: Number(x.overdue), avgWait: r(x.avg_wait), avgEndToEnd: r(x.avg_e2e) })),
          generatedAt,
        };
      }
      case "courier-activity": {
        const s = scopeSql(scope, q.branchId);
        const rows = await this.prisma.$queryRaw<Record<string, unknown>[]>`
          SELECT a."carrierNameSnapshot" AS carrier, a."carrierType" AS type, coalesce(a."carrierCodeSnapshot", '') AS code,
            count(*) AS assignments,
            count(*) FILTER (WHERE a.status = 'COMPLETED') AS completed,
            count(*) FILTER (WHERE a.status = 'REASSIGNED') AS reassigned,
            avg(EXTRACT(EPOCH FROM (a."custodyStartedAt" - a."assignedAt")) / 60) AS avg_to_pickup,
            avg(EXTRACT(EPOCH FROM (a."endedAt" - a."custodyStartedAt")) / 60) FILTER (WHERE a.status = 'COMPLETED') AS avg_custody
          FROM "carrier_assignments" a JOIN "parcels" p ON p.id = a."parcelId"
          WHERE a."assignedAt" >= ${utc(range.gte)} AND a."assignedAt" < ${utc(range.lt)} ${s}
          GROUP BY 1, 2, 3 ORDER BY count(*) DESC`;
        const r = (v: unknown) => (v === null ? null : Math.round(Number(v)));
        return {
          type,
          title: "Courier Activity Report",
          subtitle: `${rangeLabel} · ${branchName}`,
          columns: [
            { key: "carrier", label: "Carrier" },
            { key: "type", label: "Type" },
            { key: "code", label: "ID / reference" },
            { key: "assignments", label: "Assignments" },
            { key: "completed", label: "Completed" },
            { key: "reassigned", label: "Reassigned" },
            { key: "avgToPickup", label: "Avg assign → pickup (min)" },
            { key: "avgCustody", label: "Avg in custody (min)" },
          ],
          rows: rows.map((x) => ({
            carrier: String(x.carrier),
            type: CARRIER_TYPE_LABEL[x.type as CarrierType] ?? String(x.type),
            code: String(x.code),
            assignments: Number(x.assignments),
            completed: Number(x.completed),
            reassigned: Number(x.reassigned),
            avgToPickup: r(x.avg_to_pickup),
            avgCustody: r(x.avg_custody),
          })),
          generatedAt,
        };
      }
      case "chain-of-custody": {
        if (!q.parcelId) throw badRequest("Choose a parcel.", "PARCEL_REQUIRED");
        const parcel = await this.prisma.parcel.findUnique({ where: { id: q.parcelId }, include: PARCEL_INCLUDE });
        if (!parcel || !this.access.relation(actor, parcel)) throw notFound(PARCEL_NOT_FOUND);
        const events = await this.prisma.parcelEvent.findMany({ where: { parcelId: parcel.id }, orderBy: { sequence: "asc" } });
        const head = this.registerRow(actor, parcel);
        return {
          type,
          title: "Chain-of-Custody Report",
          subtitle: `${parcel.trackingNumber} · ${head.title}`,
          columns: [
            { key: "sequence", label: "#" },
            { key: "at", label: "Server time (UTC)" },
            { key: "event", label: "Event" },
            { key: "status", label: "Status" },
            { key: "actor", label: "By" },
            { key: "location", label: "Location" },
            { key: "verification", label: "Verification" },
            { key: "notes", label: "Notes" },
          ],
          rows: events.map((e) => ({
            sequence: e.sequence,
            at: iso(e.serverTimestamp),
            event: EVENT_LABEL[e.eventType as EventType] ?? e.eventType,
            status: e.toStatus ? STATUS_LABEL[e.toStatus as ParcelStatus] : null,
            actor: `${e.actorNameSnapshot}${e.actorCodeSnapshot ? ` · ${e.actorCodeSnapshot}` : ""}`,
            location: e.locationNameSnapshot,
            verification: e.verificationMethod ? VERIFICATION_LABEL[e.verificationMethod as keyof typeof VERIFICATION_LABEL] ?? e.verificationMethod : null,
            notes: e.notes,
          })),
          generatedAt,
        };
      }
    }
  }
}
