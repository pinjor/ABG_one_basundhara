import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { Role } from "@bsc/shared";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { CurrentUser, RequestUser } from "../auth/current-user.decorator";
import { ZonesService } from "./zones.service";
import { CreateZoneDto } from "./dto/create-zone.dto";
import { UpdateZoneDto } from "./dto/update-zone.dto";
import { SetZoneStatusDto } from "./dto/set-zone-status.dto";

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("zones")
export class ZonesController {
  constructor(private readonly zonesService: ZonesService) {}

  @Get()
  list(@Query("type") type?: string, @Query("status") status?: string, @Query("search") search?: string) {
    return this.zonesService.list({ type, status, search });
  }

  @Get(":id")
  getOne(@Param("id") id: string) {
    return this.zonesService.getOne(id);
  }

  @Get(":id/audit-log")
  auditTrail(@Param("id") id: string) {
    return this.zonesService.auditTrail(id);
  }

  @Roles(Role.VENUE_FACILITY_MANAGER)
  @Post()
  create(@Body() dto: CreateZoneDto, @CurrentUser() user: RequestUser) {
    return this.zonesService.create(dto, user.id);
  }

  @Roles(Role.VENUE_FACILITY_MANAGER)
  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateZoneDto, @CurrentUser() user: RequestUser) {
    return this.zonesService.update(id, dto, user.id);
  }

  @Roles(Role.VENUE_FACILITY_MANAGER)
  @Post(":id/status")
  setStatus(@Param("id") id: string, @Body() dto: SetZoneStatusDto, @CurrentUser() user: RequestUser) {
    return this.zonesService.setStatus(id, dto.status, user.id);
  }
}
