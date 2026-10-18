import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { Role } from "@bsc/shared";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { CurrentUser, type RequestUser } from "../auth/current-user.decorator";
import { OutletsService } from "./outlets.service";
import { CreateOutletDto } from "./dto/create-outlet.dto";

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("outlets")
export class OutletsController {
  constructor(private readonly outletsService: OutletsService) {}

  @Get()
  list(@Query("zoneId") zoneId?: string, @Query("type") type?: string, @Query("status") status?: string) {
    return this.outletsService.list({ zoneId, type, status });
  }

  @Get(":id")
  getOne(@Param("id") id: string) {
    return this.outletsService.getOne(id);
  }

  @Get(":id/audit-log")
  auditTrail(@Param("id") id: string) {
    return this.outletsService.auditTrail(id);
  }

  @Roles(Role.HOSPITALITY_LEAD)
  @Post()
  create(@Body() dto: CreateOutletDto, @CurrentUser() user: RequestUser) {
    return this.outletsService.create(dto, user.id);
  }

  @Roles(Role.HOSPITALITY_LEAD)
  @Post(":id/toggle")
  toggle(@Param("id") id: string, @CurrentUser() user: RequestUser) {
    return this.outletsService.toggleOpenClosed(id, user.id);
  }
}
