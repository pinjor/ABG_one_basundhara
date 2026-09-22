import { Controller, Get, UseGuards } from "@nestjs/common";
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
    const [zoneCount, zoneAgg, facilityCount, facilitiesByStatus] = await Promise.all([
      this.prisma.zone.count(),
      this.prisma.zone.aggregate({ _sum: { capacity: true, liveOccupancy: true } }),
      this.prisma.facility.count(),
      this.prisma.facility.groupBy({ by: ["status"], _count: true }),
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
      // Placeholders for modules landing in later phases (Section 9) — kept
      // here so the Command Centre layout and web client don't need a
      // reshape when bookings/gates/fleet/etc. come online.
      bookingsToday: 0,
      activeMembers: 0,
      gateEntriesToday: 0,
      openServiceRequests: 0,
      fleetUtilisation: 0,
    };
  }
}
