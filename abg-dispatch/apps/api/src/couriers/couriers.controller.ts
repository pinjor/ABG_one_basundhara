import { Body, Controller, HttpCode, Param, ParseUUIDPipe, Post, Req } from "@nestjs/common";
import type { Request } from "express";
import { Capability } from "@abg-dispatch/shared";
import { Public, RequireCapability } from "../auth/decorators";
import { CouriersService } from "./couriers.service";
import { CurrentActor, type Actor } from "../common/actor";

@Controller()
export class CouriersController {
  constructor(private readonly couriers: CouriersService) {}

  /** POST /api/webhooks/couriers/PATHAO — authenticated by signature, not by session. */
  @Public()
  @HttpCode(200)
  @Post("webhooks/couriers/:code")
  webhook(@Param("code") code: string, @Req() req: Request & { rawBody?: Buffer }, @Body() body: unknown) {
    return this.couriers.handleWebhook(code, req.headers, req.rawBody, body);
  }

  @RequireCapability(Capability.EXTERNAL_STATUS_UPDATE)
  @HttpCode(200)
  @Post("parcels/:id/external-sync")
  sync(@CurrentActor() actor: Actor, @Param("id", new ParseUUIDPipe({ errorHttpStatusCode: 404 })) id: string) {
    return this.couriers.sync(actor, id);
  }
}
