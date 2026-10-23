import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query, UseGuards, UseInterceptors } from "@nestjs/common";
import { Capability } from "@abg-dispatch/shared";
import { RequireCapability } from "../auth/decorators";
import { CurrentActor, type Actor } from "../common/actor";
import { IdempotencyInterceptor } from "../common/idempotency.interceptor";
import { RateLimit, RateLimitGuard } from "../common/rate-limit";
import { asUser } from "../admin/admin-scope";
import { AppointmentNoteDto, AppointmentReasonDto, ConfirmAppointmentDto, CreateAppointmentDto, DeskQuery, DiaryQuery, HostsQuery, MyAppointmentsQuery, ProposeAppointmentDto } from "./appointments.dto";
import { AppointmentsService } from "./appointments.service";

const Id = new ParseUUIDPipe({ version: "4", errorHttpStatusCode: 404 });

/**
 * Requests for appointment. Anyone can ask; the host side is decided by the
 * service: the person asked, and for the MD and the Chairman their executive
 * office. Everyone else gets 404.
 */
@Controller()
@UseGuards(RateLimitGuard)
@UseInterceptors(IdempotencyInterceptor)
export class AppointmentsController {
  constructor(private readonly service: AppointmentsService) {}

  /** Ask for a meeting. Send an Idempotency-Key so a retried submit files it once. */
  @RequireCapability(Capability.APPOINTMENT_REQUEST)
  @RateLimit(10, 60)
  @Post("appointments")
  create(@CurrentActor() actor: Actor, @Body() dto: CreateAppointmentDto) {
    return this.service.create(asUser(actor), dto);
  }

  /** Who one can ask: the MD and the Chairman, heads of department, and (when searching) everyone. */
  @RequireCapability(Capability.APPOINTMENT_REQUEST)
  @Get("appointments/hosts")
  hosts(@CurrentActor() actor: Actor, @Query() q: HostsQuery) {
    return this.service.hosts(asUser(actor), q);
  }

  @RequireCapability(Capability.APPOINTMENT_REQUEST)
  @Get("appointments/mine")
  mine(@CurrentActor() actor: Actor, @Query() q: MyAppointmentsQuery) {
    return this.service.mine(asUser(actor), q);
  }

  /** Requests waiting for the caller's side to answer. */
  @Get("appointments/inbox")
  inbox(@CurrentActor() actor: Actor, @Query() q: { cursor?: string; limit?: string }) {
    return this.service.inbox(asUser(actor), q);
  }

  /** Everything asked of the caller's side, filtered by status. */
  @Get("appointments/desk")
  desk(@CurrentActor() actor: Actor, @Query() q: DeskQuery) {
    return this.service.desk(asUser(actor), q);
  }

  @Get("appointments/diary")
  diary(@CurrentActor() actor: Actor, @Query() q: DiaryQuery) {
    return this.service.diary(asUser(actor), q);
  }

  @Get("appointments/summary")
  summary(@CurrentActor() actor: Actor) {
    return this.service.summary(asUser(actor));
  }

  @Get("appointments/:id")
  get(@CurrentActor() actor: Actor, @Param("id", Id) id: string) {
    return this.service.get(asUser(actor), id);
  }

  @HttpCode(200)
  @Post("appointments/:id/confirm")
  confirm(@CurrentActor() actor: Actor, @Param("id", Id) id: string, @Body() dto: ConfirmAppointmentDto) {
    return this.service.confirm(asUser(actor), id, dto);
  }

  @HttpCode(200)
  @Post("appointments/:id/propose")
  propose(@CurrentActor() actor: Actor, @Param("id", Id) id: string, @Body() dto: ProposeAppointmentDto) {
    return this.service.propose(asUser(actor), id, dto);
  }

  @HttpCode(200)
  @Post("appointments/:id/accept")
  accept(@CurrentActor() actor: Actor, @Param("id", Id) id: string) {
    return this.service.accept(asUser(actor), id);
  }

  @HttpCode(200)
  @Post("appointments/:id/decline")
  decline(@CurrentActor() actor: Actor, @Param("id", Id) id: string, @Body() dto: AppointmentReasonDto) {
    return this.service.decline(asUser(actor), id, dto.note);
  }

  @HttpCode(200)
  @Post("appointments/:id/cancel")
  cancel(@CurrentActor() actor: Actor, @Param("id", Id) id: string, @Body() dto: AppointmentReasonDto) {
    return this.service.cancel(asUser(actor), id, dto.note);
  }

  @HttpCode(200)
  @Post("appointments/:id/complete")
  complete(@CurrentActor() actor: Actor, @Param("id", Id) id: string, @Body() dto: AppointmentReasonDto) {
    return this.service.complete(asUser(actor), id, dto.note);
  }

  @HttpCode(200)
  @Post("appointments/:id/notes")
  note(@CurrentActor() actor: Actor, @Param("id", Id) id: string, @Body() dto: AppointmentNoteDto) {
    return this.service.addNote(asUser(actor), id, dto.note);
  }
}
