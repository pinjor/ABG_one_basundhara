import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { Role } from "@bsc/shared";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { CurrentUser, type RequestUser } from "../auth/current-user.decorator";
import { FleetService } from "./fleet.service";
import { CreateFleetVehicleDto } from "./dto/create-fleet-vehicle.dto";
import { SetFleetVehicleStatusDto } from "./dto/set-fleet-vehicle-status.dto";

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("fleet")
export class FleetController {
  constructor(private readonly fleetService: FleetService) {}

  @Get()
  list(@Query("type") type?: string, @Query("status") status?: string) {
    return this.fleetService.list({ type, status });
  }

  @Get(":id")
  getOne(@Param("id") id: string) {
    return this.fleetService.getOne(id);
  }

  @Get(":id/audit-log")
  auditTrail(@Param("id") id: string) {
    return this.fleetService.auditTrail(id);
  }

  @Roles(Role.FLEET_DISPATCHER)
  @Post()
  create(@Body() dto: CreateFleetVehicleDto, @CurrentUser() user: RequestUser) {
    return this.fleetService.create(dto, user.id);
  }

  @Roles(Role.FLEET_DISPATCHER)
  @Post(":id/status")
  setStatus(@Param("id") id: string, @Body() dto: SetFleetVehicleStatusDto, @CurrentUser() user: RequestUser) {
    return this.fleetService.setStatus(id, dto.status, user.id);
  }
}
