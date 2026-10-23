import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Put, Query, UseGuards, UseInterceptors } from "@nestjs/common";
import { Capability } from "@abg-dispatch/shared";
import { RequireCapability } from "../auth/decorators";
import { CurrentActor, type Actor } from "../common/actor";
import { IdempotencyInterceptor } from "../common/idempotency.interceptor";
import { RateLimit, RateLimitGuard } from "../common/rate-limit";
import { asUser } from "../admin/admin-scope";
import {
  AdminLeaveQuery,
  ApplyLeaveDto,
  BalancesQuery,
  EntitlementDto,
  LeaveApprovalsQuery,
  LeaveCalendarQuery,
  LeaveCancelDto,
  LeaveDecisionDto,
  LeaveNoteDto,
  LeaveSettingsDto,
  LeaveSummaryQuery,
  LeaveYearQuery,
  MyLeaveQuery,
} from "./leave.dto";
import { LeaveService } from "./leave.service";

const Id = new ParseUUIDPipe({ version: "4", errorHttpStatusCode: 404 });

/**
 * Leave applications. Routes check the capability; the service checks the
 * caller's relation to the application (applicant, named HOD, HR, reliever,
 * office oversight) and answers 404 to everyone else.
 */
@Controller()
@UseGuards(RateLimitGuard)
@UseInterceptors(IdempotencyInterceptor)
export class LeaveController {
  constructor(private readonly service: LeaveService) {}

  /** Apply for leave. Send an Idempotency-Key so a retried submit files it once. */
  @RequireCapability(Capability.LEAVE_APPLY)
  @RateLimit(10, 60)
  @Post("leave")
  apply(@CurrentActor() actor: Actor, @Body() dto: ApplyLeaveDto) {
    return this.service.apply(asUser(actor), dto);
  }

  @RequireCapability(Capability.LEAVE_APPLY)
  @Get("leave/mine")
  mine(@CurrentActor() actor: Actor, @Query() q: MyLeaveQuery) {
    return this.service.mine(asUser(actor), q);
  }

  @RequireCapability(Capability.LEAVE_APPLY)
  @Get("leave/balance")
  balance(@CurrentActor() actor: Actor, @Query() q: LeaveYearQuery) {
    return this.service.myBalances(asUser(actor), q.year);
  }

  /** The weekly holiday and public holidays, so the apps can count days as the API does. */
  @Get("leave/calendar-settings")
  calendarSettings() {
    return this.service.settings();
  }

  /** Applications waiting for the caller's decision (as HOD or HR). */
  @Get("leave/approvals")
  approvals(@CurrentActor() actor: Actor, @Query() q: LeaveApprovalsQuery) {
    return this.service.approvals(asUser(actor), q);
  }

  /** Who of the caller's direct reports is away between two dates. */
  @Get("leave/team")
  team(@CurrentActor() actor: Actor, @Query() q: LeaveCalendarQuery) {
    return this.service.calendar(asUser(actor), q, "team");
  }

  @Get("leave/:id")
  get(@CurrentActor() actor: Actor, @Param("id", Id) id: string) {
    return this.service.get(asUser(actor), id);
  }

  @HttpCode(200)
  @Post("leave/:id/decision")
  decision(@CurrentActor() actor: Actor, @Param("id", Id) id: string, @Body() dto: LeaveDecisionDto) {
    return this.service.decide(asUser(actor), id, dto);
  }

  @HttpCode(200)
  @Post("leave/:id/cancel")
  cancel(@CurrentActor() actor: Actor, @Param("id", Id) id: string, @Body() dto: LeaveCancelDto) {
    return this.service.cancel(asUser(actor), id, dto.note);
  }

  @HttpCode(200)
  @Post("leave/:id/notes")
  note(@CurrentActor() actor: Actor, @Param("id", Id) id: string, @Body() dto: LeaveNoteDto) {
    return this.service.addNote(asUser(actor), id, dto.note);
  }

  // ── Administration ──

  @RequireCapability(Capability.LEAVE_VIEW)
  @Get("admin/leave")
  list(@CurrentActor() actor: Actor, @Query() q: AdminLeaveQuery) {
    return this.service.list(asUser(actor), q);
  }

  @RequireCapability(Capability.LEAVE_VIEW)
  @Get("admin/leave/summary")
  summary(@CurrentActor() actor: Actor, @Query() q: LeaveSummaryQuery) {
    return this.service.summary(asUser(actor), q.branchId);
  }

  @RequireCapability(Capability.LEAVE_VIEW)
  @Get("admin/leave/calendar")
  calendar(@CurrentActor() actor: Actor, @Query() q: LeaveCalendarQuery) {
    return this.service.calendar(asUser(actor), q, "staff");
  }

  @RequireCapability(Capability.LEAVE_VIEW)
  @Get("admin/leave/balances")
  balances(@CurrentActor() actor: Actor, @Query() q: BalancesQuery) {
    return this.service.balancesOf(asUser(actor), q.userId, q.year);
  }

  @RequireCapability(Capability.LEAVE_MANAGE)
  @Put("admin/leave/entitlements")
  entitlement(@CurrentActor() actor: Actor, @Body() dto: EntitlementDto) {
    return this.service.setEntitlement(asUser(actor), dto);
  }

  @RequireCapability(Capability.LEAVE_MANAGE)
  @Put("admin/leave/settings")
  updateSettings(@CurrentActor() actor: Actor, @Body() dto: LeaveSettingsDto) {
    return this.service.updateSettings(asUser(actor), dto);
  }
}
