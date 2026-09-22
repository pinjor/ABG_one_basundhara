import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { Role } from "@bsc/shared";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { CurrentUser, RequestUser } from "../auth/current-user.decorator";
import { VipGuestsService } from "./vip-guests.service";
import { CreateVipGuestDto } from "./dto/create-vip-guest.dto";
import { UpdateVipGuestDto } from "./dto/update-vip-guest.dto";
import { SetVipStatusDto } from "./dto/set-vip-status.dto";

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("vip-guests")
export class VipGuestsController {
  constructor(private readonly vipGuestsService: VipGuestsService) {}

  @Get()
  list(
    @CurrentUser() user: RequestUser,
    @Query("classification") classification?: string,
    @Query("status") status?: string,
    @Query("search") search?: string,
  ) {
    return this.vipGuestsService.list(user, { classification, status, search });
  }

  @Get(":id")
  getOne(@Param("id") id: string, @CurrentUser() user: RequestUser) {
    return this.vipGuestsService.getOne(id, user);
  }

  @Get(":id/audit-log")
  auditTrail(@Param("id") id: string) {
    return this.vipGuestsService.auditTrail(id);
  }

  @Roles(Role.PROTOCOL_OFFICER)
  @Post()
  create(@Body() dto: CreateVipGuestDto, @CurrentUser() user: RequestUser) {
    return this.vipGuestsService.create(dto, user.id);
  }

  @Roles(Role.PROTOCOL_OFFICER)
  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateVipGuestDto, @CurrentUser() user: RequestUser) {
    return this.vipGuestsService.update(id, dto, user);
  }

  @Roles(Role.PROTOCOL_OFFICER)
  @Post(":id/status")
  setStatus(@Param("id") id: string, @Body() dto: SetVipStatusDto, @CurrentUser() user: RequestUser) {
    return this.vipGuestsService.setStatus(id, dto.status, user);
  }
}
