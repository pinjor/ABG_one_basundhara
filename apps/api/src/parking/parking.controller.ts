import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { Role } from "@bsc/shared";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { CurrentUser, type RequestUser } from "../auth/current-user.decorator";
import { ParkingService } from "./parking.service";
import { CreateParkingZoneDto } from "./dto/create-parking-zone.dto";
import { VehicleEntryDto } from "./dto/vehicle-entry.dto";
import { VehicleExitDto } from "./dto/vehicle-exit.dto";

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("parking-zones")
export class ParkingController {
  constructor(private readonly parkingService: ParkingService) {}

  @Get()
  list(@Query("type") type?: string) {
    return this.parkingService.list({ type });
  }

  @Get(":id")
  getOne(@Param("id") id: string) {
    return this.parkingService.getOne(id);
  }

  @Get(":id/audit-log")
  auditTrail(@Param("id") id: string) {
    return this.parkingService.auditTrail(id);
  }

  @Roles(Role.PARKING_MARSHAL)
  @Post()
  create(@Body() dto: CreateParkingZoneDto, @CurrentUser() user: RequestUser) {
    return this.parkingService.create(dto, user.id);
  }

  @Roles(Role.PARKING_MARSHAL)
  @Post(":id/entry")
  vehicleEntry(@Param("id") id: string, @Body() dto: VehicleEntryDto, @CurrentUser() user: RequestUser) {
    return this.parkingService.vehicleEntry(id, dto, user.id);
  }

  @Roles(Role.PARKING_MARSHAL)
  @Post(":id/exit")
  vehicleExit(@Param("id") id: string, @Body() dto: VehicleExitDto, @CurrentUser() user: RequestUser) {
    return this.parkingService.vehicleExit(id, dto, user.id);
  }
}
