import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { Role } from "@bsc/shared";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { CurrentUser, type RequestUser } from "../auth/current-user.decorator";
import { SurfacesService } from "./surfaces.service";
import { CreateEquipmentDto } from "./dto/create-equipment.dto";
import { SetEquipmentStatusDto } from "./dto/set-equipment-status.dto";

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("equipment")
export class EquipmentController {
  constructor(private readonly surfacesService: SurfacesService) {}

  @Get()
  list(@Query("category") category?: string, @Query("status") status?: string) {
    return this.surfacesService.listEquipment({ category, status });
  }

  @Roles(Role.VENUE_FACILITY_MANAGER)
  @Post()
  create(@Body() dto: CreateEquipmentDto, @CurrentUser() user: RequestUser) {
    return this.surfacesService.createEquipment(dto, user.id);
  }

  @Roles(Role.VENUE_FACILITY_MANAGER)
  @Post(":id/status")
  setStatus(@Param("id") id: string, @Body() dto: SetEquipmentStatusDto, @CurrentUser() user: RequestUser) {
    return this.surfacesService.setEquipmentStatus(id, dto.status, user.id);
  }
}
