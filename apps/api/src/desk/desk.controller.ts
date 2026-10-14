import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { CurrentUser, RequestUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { CreateDeskRecordDto, DeskActionDto, SetDeskStatusDto } from "./desk.dto";
import { DeskService } from "./desk.service";

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("desk")
export class DeskController {
  constructor(private readonly desk: DeskService) {}

  @Get(":module")
  list(@Param("module") module: string, @Query("feature") feature: string | undefined, @CurrentUser() user: RequestUser) {
    return this.desk.list(module, feature, user);
  }

  @Post(":module")
  create(@Param("module") module: string, @Body() dto: CreateDeskRecordDto, @CurrentUser() user: RequestUser) {
    return this.desk.create(module, dto, user);
  }

  @Post(":module/:id/action")
  act(
    @Param("module") module: string,
    @Param("id") id: string,
    @Body() dto: DeskActionDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.desk.act(module, id, dto.action, user);
  }

  @Post(":module/:id/status")
  setStatus(
    @Param("module") module: string,
    @Param("id") id: string,
    @Body() dto: SetDeskStatusDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.desk.setStatus(module, id, dto.status, user);
  }
}
