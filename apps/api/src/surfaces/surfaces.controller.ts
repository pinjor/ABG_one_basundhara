import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { Role } from "@bsc/shared";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { CurrentUser, RequestUser } from "../auth/current-user.decorator";
import { SurfacesService } from "./surfaces.service";
import { CreateSurfaceDto } from "./dto/create-surface.dto";
import { UpdateSurfaceDto } from "./dto/update-surface.dto";
import { SetClosureStatusDto } from "./dto/set-closure-status.dto";

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("surfaces")
export class SurfacesController {
  constructor(private readonly surfacesService: SurfacesService) {}

  @Get()
  list(@Query("facilityId") facilityId?: string, @Query("closureStatus") closureStatus?: string) {
    return this.surfacesService.list({ facilityId, closureStatus });
  }

  @Get(":id")
  getOne(@Param("id") id: string) {
    return this.surfacesService.getOne(id);
  }

  @Get(":id/audit-log")
  auditTrail(@Param("id") id: string) {
    return this.surfacesService.auditTrail(id);
  }

  @Roles(Role.VENUE_FACILITY_MANAGER)
  @Post()
  create(@Body() dto: CreateSurfaceDto, @CurrentUser() user: RequestUser) {
    return this.surfacesService.create(dto, user.id);
  }

  @Roles(Role.VENUE_FACILITY_MANAGER)
  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateSurfaceDto, @CurrentUser() user: RequestUser) {
    return this.surfacesService.update(id, dto, user.id);
  }

  @Roles(Role.VENUE_FACILITY_MANAGER)
  @Post(":id/closure-status")
  setClosureStatus(@Param("id") id: string, @Body() dto: SetClosureStatusDto, @CurrentUser() user: RequestUser) {
    return this.surfacesService.setClosureStatus(id, dto.closureStatus, user.id);
  }
}
