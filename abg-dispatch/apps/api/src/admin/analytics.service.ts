import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../common/prisma.service";
import { dhakaDay, dhakaDayRange } from "../common/time";
import { scopeSql, utc } from "./admin-scope";

const n = (v: unknown) => (v === null || v === undefined ? null : Number(v));
const round = (v: number | null) => (v === null || Number.isNaN(v) ? null : Math.round(v * 10) / 10);

export function defaultRange(from?: string, to?: string) {
  const today = dhakaDay(new Date());
  const start = from ?? dhakaDay(new Date(Date.now() - 29 * 86_400_000));
  const end = to ?? today;
  return { from: start, to: end, gte: dhakaDayRange(start).gte, lt: dhakaDayRange(end).lt };
}

/**
 * Management analytics. Durations are measured stage by stage from the
 * milestone columns; arrival and receipt are separate so "sitting at the
 * destination unacknowledged" is visible on its own.
 */
@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(scope: string[] | null, params: { from?: string; to?: string; branchId?: string }) {
    const range = defaultRange(params.from, params.to);
    const s = scopeSql(scope, params.branchId);
    const inRange = Prisma.sql`p."bookedAt" >= ${utc(range.gte)} AND p."bookedAt" < ${utc(range.lt)} AND p."status" <> 'DRAFT' ${s}`;

    const [totals] = await this.prisma.$queryRaw<Record<string, unknown>[]>`
      SELECT
        count(*) AS total,
        count(*) FILTER (WHERE p."status" = 'RECEIVED') AS received,
        count(*) FILTER (WHERE p."status" = 'RECEIVED' AND p."overdueSince" IS NULL) AS on_time,
        count(*) FILTER (WHERE p."overdueSince" IS NOT NULL) AS ever_overdue,
        count(*) FILTER (WHERE EXISTS (SELECT 1 FROM "parcel_exceptions" x WHERE x."parcelId" = p.id)) AS with_exception,
        count(*) FILTER (WHERE p."returnRequestedAt" IS NOT NULL) AS returns,
        avg(EXTRACT(EPOCH FROM (p."pickedUpAt" - p."bookedAt")) / 60) AS booking_to_pickup,
        avg(EXTRACT(EPOCH FROM (p."arrivedAt" - p."pickedUpAt")) / 60) AS pickup_to_arrival,
        avg(EXTRACT(EPOCH FROM (p."receivedAt" - p."arrivedAt")) / 60) AS arrival_to_receipt,
        avg(EXTRACT(EPOCH FROM (p."receivedAt" - p."bookedAt")) / 60) AS end_to_end,
        percentile_cont(0.9) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (p."receivedAt" - p."arrivedAt")) / 60) AS arrival_to_receipt_p90
      FROM "parcels" p WHERE ${inRange}`;

    const byDay = await this.prisma.$queryRaw<{ day: string; booked: bigint; received: bigint }[]>`
      SELECT d.day::text AS day,
        (SELECT count(*) FROM "parcels" p WHERE (p."bookedAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Dhaka')::date = d.day AND p."status" <> 'DRAFT' ${s}) AS booked,
        (SELECT count(*) FROM "parcels" p WHERE (p."receivedAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Dhaka')::date = d.day ${s}) AS received
      FROM generate_series(${range.from}::date, ${range.to}::date, interval '1 day') AS d(day)
      ORDER BY d.day`;

    const group = (expr: Prisma.Sql, join: Prisma.Sql) => this.prisma.$queryRaw<{ label: string; count: bigint; avg_minutes: number | null }[]>`
      SELECT ${expr} AS label, count(*) AS count, avg(EXTRACT(EPOCH FROM (p."receivedAt" - p."bookedAt")) / 60) AS avg_minutes
      FROM "parcels" p ${join}
      WHERE ${inRange}
      GROUP BY 1 ORDER BY count(*) DESC LIMIT 12`;

    const [byBranch, byDepartment, byCategory, byRoute] = await Promise.all([
      group(Prisma.sql`b.name`, Prisma.sql`JOIN "branches" b ON b.id = p."originBranchId"`),
      group(Prisma.sql`coalesce(d.name, 'Unassigned')`, Prisma.sql`LEFT JOIN "departments" d ON d.id = p."senderDepartmentId"`),
      group(Prisma.sql`c.name`, Prisma.sql`JOIN "parcel_categories" c ON c.id = p."categoryId"`),
      group(Prisma.sql`ob.code || ' → ' || coalesce(db.code, 'EXT')`, Prisma.sql`JOIN "branches" ob ON ob.id = p."originBranchId" LEFT JOIN "branches" db ON db.id = p."destinationBranchId"`),
    ]);

    const delayedRoutes = await this.prisma.$queryRaw<{ route: string; parcels: bigint; avg_minutes: number; avg_wait: number | null }[]>`
      SELECT ob.name || ' → ' || coalesce(db.name, 'External') AS route, count(*) AS parcels,
        avg(EXTRACT(EPOCH FROM (p."receivedAt" - p."bookedAt")) / 60) AS avg_minutes,
        avg(EXTRACT(EPOCH FROM (p."receivedAt" - p."arrivedAt")) / 60) AS avg_wait
      FROM "parcels" p
      JOIN "branches" ob ON ob.id = p."originBranchId"
      LEFT JOIN "branches" db ON db.id = p."destinationBranchId"
      WHERE ${inRange} AND p."receivedAt" IS NOT NULL
      GROUP BY 1 HAVING count(*) >= 2
      ORDER BY avg_minutes DESC LIMIT 5`;

    const carriers = await this.prisma.$queryRaw<{ name: string; type: string; assignments: bigint; completed: bigint; avg_custody: number | null }[]>`
      SELECT a."carrierNameSnapshot" AS name, a."carrierType" AS type, count(*) AS assignments,
        count(*) FILTER (WHERE a.status = 'COMPLETED') AS completed,
        avg(EXTRACT(EPOCH FROM (a."endedAt" - a."custodyStartedAt")) / 60) FILTER (WHERE a.status = 'COMPLETED') AS avg_custody
      FROM "carrier_assignments" a JOIN "parcels" p ON p.id = a."parcelId"
      WHERE ${inRange}
      GROUP BY 1, 2 ORDER BY count(*) DESC LIMIT 12`;

    const providers = await this.prisma.$queryRaw<{ name: string; parcels: bigint }[]>`
      SELECT cp.name, count(DISTINCT a."parcelId") AS parcels
      FROM "carrier_assignments" a JOIN "courier_providers" cp ON cp.id = a."courierProviderId" JOIN "parcels" p ON p.id = a."parcelId"
      WHERE ${inRange}
      GROUP BY 1 ORDER BY 2 DESC`;

    const methods = await this.prisma.$queryRaw<{ method: string; parcels: bigint }[]>`
      SELECT p."deliveryMethod" AS method, count(*) AS parcels FROM "parcels" p WHERE ${inRange} GROUP BY 1`;

    const total = Number(totals.total ?? 0);
    const received = Number(totals.received ?? 0);
    const pct = (v: unknown, of: number) => (of ? Math.round((Number(v) / of) * 1000) / 10 : null);
    const mapGroup = (rows: { label: string; count: bigint; avg_minutes: number | null }[]) =>
      rows.map((r) => ({ label: r.label, count: Number(r.count), avgMinutes: round(n(r.avg_minutes)) }));

    return {
      range: { from: range.from, to: range.to },
      totals: {
        parcels: total,
        received,
        onTimeRate: pct(totals.on_time, received),
        overdueRate: pct(totals.ever_overdue, total),
        exceptionRate: pct(totals.with_exception, total),
        returnRate: pct(totals.returns, total),
      },
      durations: {
        bookingToPickup: round(n(totals.booking_to_pickup)),
        pickupToArrival: round(n(totals.pickup_to_arrival)),
        arrivalToReceipt: round(n(totals.arrival_to_receipt)),
        arrivalToReceiptP90: round(n(totals.arrival_to_receipt_p90)),
        endToEnd: round(n(totals.end_to_end)),
      },
      byDay: byDay.map((d) => ({ day: d.day.slice(0, 10), booked: Number(d.booked), received: Number(d.received) })),
      byBranch: mapGroup(byBranch),
      byDepartment: mapGroup(byDepartment),
      byCategory: mapGroup(byCategory),
      byRoute: mapGroup(byRoute),
      delayedRoutes: delayedRoutes.map((r) => ({ route: r.route, parcels: Number(r.parcels), avgMinutes: round(n(r.avg_minutes)), avgWaitMinutes: round(n(r.avg_wait)) })),
      carriers: carriers.map((c) => ({ name: c.name, type: c.type, assignments: Number(c.assignments), completed: Number(c.completed), avgCustodyMinutes: round(n(c.avg_custody)) })),
      providers: providers.map((p) => ({ name: p.name, parcels: Number(p.parcels) })),
      deliveryMethods: methods.map((m) => ({ method: m.method, parcels: Number(m.parcels) })),
    };
  }
}
