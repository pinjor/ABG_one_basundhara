import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { Role } from "@bsc/shared";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { CurrentUser, type RequestUser } from "../auth/current-user.decorator";
import { VisitorsService } from "./visitors.service";
import { CreateVisitorDto } from "./dto/create-visitor.dto";

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("visitors")
export class VisitorsController {
  constructor(private readonly visitorsService: VisitorsService) {}

  @Get()
  list(@Query("category") category?: string, @Query("status") status?: string, @Query("search") search?: string) {
    return this.visitorsService.list({ category, status, search });
  }

  @Get(":id")
  getOne(@Param("id") id: string) {
    return this.visitorsService.getOne(id);
  }

  @Get(":id/audit-log")
  auditTrail(@Param("id") id: string) {
    return this.visitorsService.auditTrail(id);
  }

  @Roles(Role.GATE_SECURITY_OFFICER)
  @Post()
  create(@Body() dto: CreateVisitorDto, @CurrentUser() user: RequestUser) {
    return this.visitorsService.create(dto, user.id);
  }

  @Roles(Role.GATE_SECURITY_OFFICER)
  @Post(":id/check-in")
  checkIn(@Param("id") id: string, @CurrentUser() user: RequestUser) {
    return this.visitorsService.checkIn(id, user.id);
  }

  @Roles(Role.GATE_SECURITY_OFFICER)
  @Post(":id/check-out")
  checkOut(@Param("id") id: string, @CurrentUser() user: RequestUser) {
    return this.visitorsService.checkOut(id, user.id);
  }
}
