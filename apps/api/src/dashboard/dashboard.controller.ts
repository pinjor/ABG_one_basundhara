import { Controller, Get, UseGuards } from "@nestjs/common";
import { BookingStatus, MemberStatus, ServiceRequestStatus } from "@bsc/shared";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { PrismaService } from "../prisma/prisma.service";

/**
 * Command Centre aggregate (Section 5). Every role sees this on login, scoped
 * to what it can act on by the roles guard already applied to each module's
 * own endpoints — this endpoint itself is read-only for everyone.
 */
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("dashboard")
export class DashboardController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("summary")
  async summary() {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(startOfToday);
    endOfToday.setDate(endOfToday.getDate() + 1);

    const [
      zoneCount,
      zoneAgg,
      facilityCount,
      facilitiesByStatus,
      bookingsToday,
      activeMembers,
      gateEntriesAgg,
      recentAccessByResult,
      openServiceRequests,
    ] = await Promise.all([
      this.prisma.zone.count(),
      this.prisma.zone.aggregate({ _sum: { capacity: true, liveOccupancy: true } }),
      this.prisma.facility.count(),
      this.prisma.facility.groupBy({ by: ["status"], _count: true }),
      this.prisma.booking.count({
        where: { date: { gte: startOfToday, lt: endOfToday }, status: { not: BookingStatus.CANCELLED } },
      }),
      this.prisma.member.count({ where: { status: MemberStatus.ACTIVE } }),
      this.prisma.gate.aggregate({ _sum: { entriesToday: true } }),
      this.prisma.accessLogEntry.groupBy({
        by: ["result"],
        where: { timestamp: { gte: startOfToday, lt: endOfToday } },
        _count: true,
      }),
      this.prisma.serviceRequest.count({ where: { status: { not: ServiceRequestStatus.DELIVERED } } }),
    ]);

    return {
      zones: {
        total: zoneCount,
        totalCapacity: zoneAgg._sum.capacity ?? 0,
        liveOccupancy: zoneAgg._sum.liveOccupancy ?? 0,
      },
      facilities: {
        total: facilityCount,
        byStatus: Object.fromEntries(facilitiesByStatus.map((row) => [row.status, row._count])),
      },
      bookingsToday,
      activeMembers,
      gateEntriesToday: gateEntriesAgg._sum.entriesToday ?? 0,
      accessAttemptsToday: Object.fromEntries(recentAccessByResult.map((row) => [row.result, row._count])),
      openServiceRequests,
      // Placeholder for Phase 4 (Section 9).
      fleetUtilisation: 0,
    };
  }
}
