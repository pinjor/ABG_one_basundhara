import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query, UseGuards, UseInterceptors } from "@nestjs/common";
import { Capability } from "@abg-dispatch/shared";
import { RequireCapability } from "../auth/decorators";
import { CurrentActor, type Actor } from "../common/actor";
import { IdempotencyInterceptor } from "../common/idempotency.interceptor";
import { RateLimit, RateLimitGuard } from "../common/rate-limit";
import { asUser } from "../admin/admin-scope";
import { AdminVisitsQuery, CancelVisitDto, CheckInDto, InviteVisitorDto, MyVisitsQuery, VisitSummaryQuery, WalkInDto } from "./visitors.dto";
import { VisitorsService } from "./visitors.service";

const Id = new ParseUUIDPipe({ version: "4", errorHttpStatusCode: 404 });

/** Visitor pre-registration, gate passes and check-in/out. */
@Controller()
@UseGuards(RateLimitGuard)
@UseInterceptors(IdempotencyInterceptor)
export class VisitorsController {
  constructor(private readonly service: VisitorsService) {}

  /** A host pre-registers a visitor; the visitor is texted their gate pass number. */
  @RequireCapability(Capability.VISITOR_INVITE)
  @RateLimit(20, 60)
  @Post("visitors")
  invite(@CurrentActor() actor: Actor, @Body() dto: InviteVisitorDto) {
    return this.service.invite(asUser(actor), dto);
  }

  /** The gate registers a visitor who arrived without a pass, checked in at once. */
  @RequireCapability(Capability.VISITOR_MANAGE)
  @RateLimit(30, 60)
  @Post("visitors/walk-in")
  walkIn(@CurrentActor() actor: Actor, @Body() dto: WalkInDto) {
    return this.service.walkIn(asUser(actor), dto);
  }

  @RequireCapability(Capability.VISITOR_INVITE)
  @Get("visitors/mine")
  mine(@CurrentActor() actor: Actor, @Query() q: MyVisitsQuery) {
    return this.service.mine(asUser(actor), q);
  }

  // ── Gate passes (declared before :id routes) ──

  /** A pass number typed at the gate — only the verifier's own offices are searched. */
  @RequireCapability(Capability.GATE_VERIFY)
  @RateLimit(60, 60)
  @Get("visitors/passes/by-number/:passNumber")
  passByNumber(@CurrentActor() actor: Actor, @Param("passNumber") passNumber: string) {
    return this.service.passByNumber(asUser(actor), passNumber);
  }

  /** A scanned QR gate pass (`/g/v/<token>`). */
  @RequireCapability(Capability.GATE_VERIFY)
  @RateLimit(60, 60)
  @Get("visitors/passes/:token")
  pass(@CurrentActor() actor: Actor, @Param("token") token: string) {
    return this.service.passByToken(asUser(actor), token);
  }

  @RequireCapability(Capability.VISITOR_MANAGE)
  @HttpCode(200)
  @Post("visitors/passes/:token/check-in")
  passCheckIn(@CurrentActor() actor: Actor, @Param("token") token: string, @Body() dto: CheckInDto) {
    return this.service.passCheckIn(asUser(actor), token, dto.badgeNumber);
  }

  @RequireCapability(Capability.VISITOR_MANAGE)
  @HttpCode(200)
  @Post("visitors/passes/:token/check-out")
  passCheckOut(@CurrentActor() actor: Actor, @Param("token") token: string) {
    return this.service.passCheckOut(asUser(actor), token);
  }

  // ── One visit ──

  /** The host, or visitor staff whose offices include it. Everyone else gets 404. */
  @Get("visitors/:id")
  get(@CurrentActor() actor: Actor, @Param("id", Id) id: string) {
    return this.service.get(asUser(actor), id);
  }

  @RequireCapability(Capability.VISITOR_MANAGE)
  @HttpCode(200)
  @Post("visitors/:id/check-in")
  checkIn(@CurrentActor() actor: Actor, @Param("id", Id) id: string, @Body() dto: CheckInDto) {
    return this.service.checkIn(asUser(actor), id, dto.badgeNumber);
  }

  @RequireCapability(Capability.VISITOR_MANAGE)
  @HttpCode(200)
  @Post("visitors/:id/check-out")
  checkOut(@CurrentActor() actor: Actor, @Param("id", Id) id: string) {
    return this.service.checkOut(asUser(actor), id);
  }

  /** The host, or the office's gate staff, while the visitor has not arrived. */
  @HttpCode(200)
  @Post("visitors/:id/cancel")
  cancel(@CurrentActor() actor: Actor, @Param("id", Id) id: string, @Body() dto: CancelVisitDto) {
    return this.service.cancel(asUser(actor), id, dto);
  }

  // ── Office view ──

  @RequireCapability(Capability.VISITOR_VIEW)
  @Get("admin/visitors")
  list(@CurrentActor() actor: Actor, @Query() q: AdminVisitsQuery) {
    return this.service.list(asUser(actor), q);
  }

  @RequireCapability(Capability.VISITOR_VIEW)
  @Get("admin/visitors/summary")
  summary(@CurrentActor() actor: Actor, @Query() q: VisitSummaryQuery) {
    return this.service.summary(asUser(actor), q.branchId || undefined);
  }
}
