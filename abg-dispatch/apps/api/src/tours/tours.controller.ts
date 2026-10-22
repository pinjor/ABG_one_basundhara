import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Put, Query, UseGuards, UseInterceptors } from "@nestjs/common";
import { Capability } from "@abg-dispatch/shared";
import { RequireCapability } from "../auth/decorators";
import { CurrentActor, type Actor } from "../common/actor";
import { IdempotencyInterceptor } from "../common/idempotency.interceptor";
import { RateLimit, RateLimitGuard } from "../common/rate-limit";
import { asUser } from "../admin/admin-scope";
import { AdminToursQuery, CreateTourDto, MyToursQuery, TourApprovalsQuery, TourDecisionDto, TourNoteDto, TourSettingsDto, TourStepDto, TourSummaryQuery } from "./tours.dto";
import { ToursService } from "./tours.service";

const Id = new ParseUUIDPipe({ version: "4", errorHttpStatusCode: 404 });

/**
 * Official tour requests. Routes check the capability; the service checks the
 * caller's relation to the request (traveller, named HOD, HR & Finance, MD /
 * Chairman, office oversight) and answers 404 to everyone else.
 */
@Controller()
@UseGuards(RateLimitGuard)
@UseInterceptors(IdempotencyInterceptor)
export class ToursController {
  constructor(private readonly service: ToursService) {}

  /** Apply for a tour. Send an Idempotency-Key so a retried submit files it once. */
  @RequireCapability(Capability.TOUR_REQUEST)
  @RateLimit(10, 60)
  @Post("tours")
  create(@CurrentActor() actor: Actor, @Body() dto: CreateTourDto) {
    return this.service.create(asUser(actor), dto);
  }

  @RequireCapability(Capability.TOUR_REQUEST)
  @Get("tours/mine")
  mine(@CurrentActor() actor: Actor, @Query() q: MyToursQuery) {
    return this.service.mine(asUser(actor), q);
  }

  /** Requests waiting for the caller's decision (as HOD, HR & Finance or MD / Chairman). */
  @Get("tours/approvals")
  approvals(@CurrentActor() actor: Actor, @Query() q: TourApprovalsQuery) {
    return this.service.approvals(asUser(actor), q);
  }

  @Get("tours/:id")
  get(@CurrentActor() actor: Actor, @Param("id", Id) id: string) {
    return this.service.get(asUser(actor), id);
  }

  /** Approve or reject the stage the request is waiting at. */
  @HttpCode(200)
  @Post("tours/:id/decision")
  decision(@CurrentActor() actor: Actor, @Param("id", Id) id: string, @Body() dto: TourDecisionDto) {
    return this.service.decide(asUser(actor), id, dto);
  }

  @HttpCode(200)
  @Post("tours/:id/start")
  start(@CurrentActor() actor: Actor, @Param("id", Id) id: string, @Body() dto: TourStepDto) {
    return this.service.start(asUser(actor), id, dto.note);
  }

  @HttpCode(200)
  @Post("tours/:id/complete")
  complete(@CurrentActor() actor: Actor, @Param("id", Id) id: string, @Body() dto: TourStepDto) {
    return this.service.complete(asUser(actor), id, dto.note);
  }

  @HttpCode(200)
  @Post("tours/:id/cancel")
  cancel(@CurrentActor() actor: Actor, @Param("id", Id) id: string, @Body() dto: TourStepDto) {
    return this.service.cancel(asUser(actor), id, dto.note);
  }

  @HttpCode(200)
  @Post("tours/:id/notes")
  note(@CurrentActor() actor: Actor, @Param("id", Id) id: string, @Body() dto: TourNoteDto) {
    return this.service.addNote(asUser(actor), id, dto.note);
  }

  // ── Administration ──

  @RequireCapability(Capability.TOUR_VIEW)
  @Get("admin/tours")
  list(@CurrentActor() actor: Actor, @Query() q: AdminToursQuery) {
    return this.service.list(asUser(actor), q);
  }

  @RequireCapability(Capability.TOUR_VIEW)
  @Get("admin/tours/summary")
  summary(@CurrentActor() actor: Actor, @Query() q: TourSummaryQuery) {
    return this.service.summary(asUser(actor), q.branchId);
  }

  @RequireCapability(Capability.TOUR_VIEW)
  @Get("admin/tours/settings")
  settings() {
    return this.service.settings();
  }

  /** HR & Finance (tour.vet) or system administrators (config.manage). */
  @Put("admin/tours/settings")
  updateSettings(@CurrentActor() actor: Actor, @Body() dto: TourSettingsDto) {
    return this.service.updateSettings(asUser(actor), dto);
  }
}
