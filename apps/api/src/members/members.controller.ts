import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { Role } from "@bsc/shared";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { CurrentUser, RequestUser } from "../auth/current-user.decorator";
import { MembersService } from "./members.service";
import { CreateMemberDto } from "./dto/create-member.dto";
import { UpdateMemberDto } from "./dto/update-member.dto";
import { SetMemberStatusDto } from "./dto/set-member-status.dto";
import { RenewMemberDto } from "./dto/renew-member.dto";

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("members")
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Get()
  list(@Query("tier") tier?: string, @Query("status") status?: string, @Query("search") search?: string) {
    return this.membersService.list({ tier, status, search });
  }

  @Get(":id")
  getOne(@Param("id") id: string) {
    return this.membersService.getOne(id);
  }

  @Get(":id/audit-log")
  auditTrail(@Param("id") id: string) {
    return this.membersService.auditTrail(id);
  }

  @Roles(Role.BOOKINGS_OFFICER)
  @Post()
  create(@Body() dto: CreateMemberDto, @CurrentUser() user: RequestUser) {
    return this.membersService.create(dto, user.id);
  }

  @Roles(Role.BOOKINGS_OFFICER)
  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateMemberDto, @CurrentUser() user: RequestUser) {
    return this.membersService.update(id, dto, user.id);
  }

  @Roles(Role.BOOKINGS_OFFICER)
  @Post(":id/status")
  setStatus(@Param("id") id: string, @Body() dto: SetMemberStatusDto, @CurrentUser() user: RequestUser) {
    return this.membersService.setStatus(id, dto.status, user.id);
  }

  @Roles(Role.BOOKINGS_OFFICER, Role.GATE_SECURITY_OFFICER)
  @Post(":id/check-in")
  checkIn(@Param("id") id: string, @CurrentUser() user: RequestUser) {
    return this.membersService.checkIn(id, user.id);
  }

  @Roles(Role.BOOKINGS_OFFICER)
  @Post(":id/renew")
  renew(@Param("id") id: string, @Body() dto: RenewMemberDto, @CurrentUser() user: RequestUser) {
    return this.membersService.renew(id, user.id, dto.expiryDate);
  }
}
