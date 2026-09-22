import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { PrismaService } from "../prisma/prisma.service";

/** Powers the Command Centre's merged live-activity feed (Section 5). */
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("audit-log")
export class AuditController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("recent")
  recent(@Query("take") take = "20") {
    return this.prisma.auditLog.findMany({
      take: Math.min(Number(take) || 20, 100),
      orderBy: { createdAt: "desc" },
      include: { user: { select: { id: true, name: true } } },
    });
  }
}
