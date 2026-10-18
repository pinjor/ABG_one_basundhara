import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { Role } from "@bsc/shared";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { CurrentUser, type RequestUser } from "../auth/current-user.decorator";
import { GatesService } from "./gates.service";
import { CreateGateDto } from "./dto/create-gate.dto";
import { ScanGateDto } from "./dto/scan-gate.dto";

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("gates")
export class GatesController {
  constructor(private readonly gatesService: GatesService) {}

  @Get()
  list(@Query("zoneId") zoneId?: string, @Query("type") type?: string, @Query("status") status?: string) {
    return this.gatesService.list({ zoneId, type, status });
  }

  @Get("access-log/recent")
  recentAccessLog(@Query("take") take = "30") {
    return this.gatesService.recentAccessLog(Math.min(Number(take) || 30, 100));
  }

  @Get(":id")
  getOne(@Param("id") id: string) {
    return this.gatesService.getOne(id);
  }

  @Get(":id/audit-log")
  auditTrail(@Param("id") id: string) {
    return this.gatesService.auditTrail(id);
  }

  @Roles(Role.GATE_SECURITY_OFFICER)
  @Post()
  create(@Body() dto: CreateGateDto, @CurrentUser() user: RequestUser) {
    return this.gatesService.create(dto, user.id);
  }

  @Roles(Role.GATE_SECURITY_OFFICER)
  @Post(":id/toggle")
  toggle(@Param("id") id: string, @CurrentUser() user: RequestUser) {
    return this.gatesService.toggleStatus(id, user.id);
  }

  @Roles(Role.GATE_SECURITY_OFFICER)
  @Post(":id/scan")
  scan(@Param("id") id: string, @Body() dto: ScanGateDto, @CurrentUser() user: RequestUser) {
    return this.gatesService.scan(id, dto, user.id);
  }
}
