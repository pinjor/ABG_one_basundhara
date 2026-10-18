import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { Role } from "@bsc/shared";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { CurrentUser, type RequestUser } from "../auth/current-user.decorator";
import { LoungesService } from "./lounges.service";
import { CreateLoungeDto } from "./dto/create-lounge.dto";

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("lounges")
export class LoungesController {
  constructor(private readonly loungesService: LoungesService) {}

  @Get()
  list(@Query("zoneId") zoneId?: string, @Query("status") status?: string) {
    return this.loungesService.list({ zoneId, status });
  }

  @Get(":id")
  getOne(@Param("id") id: string) {
    return this.loungesService.getOne(id);
  }

  @Get(":id/audit-log")
  auditTrail(@Param("id") id: string) {
    return this.loungesService.auditTrail(id);
  }

  @Roles(Role.HOSPITALITY_LEAD)
  @Post()
  create(@Body() dto: CreateLoungeDto, @CurrentUser() user: RequestUser) {
    return this.loungesService.create(dto, user.id);
  }

  @Roles(Role.HOSPITALITY_LEAD)
  @Post(":id/check-in")
  checkIn(@Param("id") id: string, @CurrentUser() user: RequestUser) {
    return this.loungesService.adjustOccupancy(id, 1, user.id);
  }

  @Roles(Role.HOSPITALITY_LEAD)
  @Post(":id/check-out")
  checkOut(@Param("id") id: string, @CurrentUser() user: RequestUser) {
    return this.loungesService.adjustOccupancy(id, -1, user.id);
  }

  @Roles(Role.HOSPITALITY_LEAD)
  @Post(":id/toggle")
  toggle(@Param("id") id: string, @CurrentUser() user: RequestUser) {
    return this.loungesService.toggleOpenClosed(id, user.id);
  }
}
