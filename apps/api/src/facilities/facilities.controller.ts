import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { Role } from "@bsc/shared";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { CurrentUser, RequestUser } from "../auth/current-user.decorator";
import { FacilitiesService } from "./facilities.service";
import { CreateFacilityDto } from "./dto/create-facility.dto";
import { UpdateFacilityDto } from "./dto/update-facility.dto";
import { SetFacilityStatusDto } from "./dto/set-facility-status.dto";

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("facilities")
export class FacilitiesController {
  constructor(private readonly facilitiesService: FacilitiesService) {}

  @Get()
  list(
    @Query("zoneId") zoneId?: string,
    @Query("type") type?: string,
    @Query("status") status?: string,
    @Query("search") search?: string,
  ) {
    return this.facilitiesService.list({ zoneId, type, status, search });
  }

  @Get(":id")
  getOne(@Param("id") id: string) {
    return this.facilitiesService.getOne(id);
  }

  @Get(":id/audit-log")
  auditTrail(@Param("id") id: string) {
    return this.facilitiesService.auditTrail(id);
  }

  @Roles(Role.VENUE_FACILITY_MANAGER)
  @Post()
  create(@Body() dto: CreateFacilityDto, @CurrentUser() user: RequestUser) {
    return this.facilitiesService.create(dto, user.id);
  }

  @Roles(Role.VENUE_FACILITY_MANAGER)
  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateFacilityDto, @CurrentUser() user: RequestUser) {
    return this.facilitiesService.update(id, dto, user.id);
  }

  @Roles(Role.VENUE_FACILITY_MANAGER)
  @Post(":id/status")
  setStatus(@Param("id") id: string, @Body() dto: SetFacilityStatusDto, @CurrentUser() user: RequestUser) {
    return this.facilitiesService.setStatus(id, dto.status, user.id);
  }
}
