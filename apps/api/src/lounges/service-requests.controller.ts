import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { Role } from "@bsc/shared";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { CurrentUser, type RequestUser } from "../auth/current-user.decorator";
import { LoungesService } from "./lounges.service";
import { CreateServiceRequestDto } from "./dto/create-service-request.dto";
import { SetServiceRequestStatusDto } from "./dto/set-service-request-status.dto";

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("service-requests")
export class ServiceRequestsController {
  constructor(private readonly loungesService: LoungesService) {}

  @Get()
  list(@Query("loungeId") loungeId?: string, @Query("status") status?: string) {
    return this.loungesService.listServiceRequests({ loungeId, status });
  }

  @Roles(Role.HOSPITALITY_LEAD)
  @Post()
  create(@Body() dto: CreateServiceRequestDto, @CurrentUser() user: RequestUser) {
    return this.loungesService.createServiceRequest(dto, user.id);
  }

  @Roles(Role.HOSPITALITY_LEAD)
  @Post(":id/status")
  setStatus(@Param("id") id: string, @Body() dto: SetServiceRequestStatusDto, @CurrentUser() user: RequestUser) {
    return this.loungesService.setServiceRequestStatus(id, dto.status, user.id);
  }
}
