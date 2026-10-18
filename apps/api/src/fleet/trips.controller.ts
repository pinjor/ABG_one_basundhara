import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { Role } from "@bsc/shared";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { CurrentUser, type RequestUser } from "../auth/current-user.decorator";
import { FleetService } from "./fleet.service";
import { CreateTripDto } from "./dto/create-trip.dto";
import { SetTripStatusDto } from "./dto/set-trip-status.dto";

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("trips")
export class TripsController {
  constructor(private readonly fleetService: FleetService) {}

  @Get()
  list(@Query("vehicleId") vehicleId?: string, @Query("status") status?: string) {
    return this.fleetService.listTrips({ vehicleId, status });
  }

  @Roles(Role.FLEET_DISPATCHER)
  @Post()
  create(@Body() dto: CreateTripDto, @CurrentUser() user: RequestUser) {
    return this.fleetService.createTrip(dto, user.id);
  }

  @Roles(Role.FLEET_DISPATCHER)
  @Post(":id/status")
  setStatus(@Param("id") id: string, @Body() dto: SetTripStatusDto, @CurrentUser() user: RequestUser) {
    return this.fleetService.setTripStatus(id, dto.status, user.id);
  }
}
