import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { EventsService } from "./events.service";

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("events")
export class EventsController {
  constructor(private readonly events: EventsService) {}

  @Get()
  list() {
    return this.events.list();
  }

  @Get(":id")
  getBoard(@Param("id") id: string) {
    return this.events.getBoard(id);
  }
}
