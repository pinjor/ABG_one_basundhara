import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query, UseGuards, UseInterceptors } from "@nestjs/common";
import { Capability } from "@abg-dispatch/shared";
import { RequireCapability } from "../auth/decorators";
import { CurrentActor, type Actor } from "../common/actor";
import { IdempotencyInterceptor } from "../common/idempotency.interceptor";
import { RateLimitGuard } from "../common/rate-limit";
import { asUser } from "../admin/admin-scope";
import { AdminAuditsQuery, AuditNoteDto, AuditReasonDto, AuditSummaryQuery, CompleteFieldworkDto, CreateAuditDto, CreateFindingDto, MyActionsQuery, ReassignFindingDto, SubmitFindingDto } from "./audits.dto";
import { AuditsService } from "./audits.service";

const Id = new ParseUUIDPipe({ version: "4", errorHttpStatusCode: 404 });

/**
 * Audits and their corrective actions. Planning and listing need the audits
 * capabilities; reading one audit is decided by the service (lead, office
 * staff, compliance, or owner of a finding) and answers 404 to everyone else.
 */
@Controller()
@UseGuards(RateLimitGuard)
@UseInterceptors(IdempotencyInterceptor)
export class AuditsController {
  constructor(private readonly service: AuditsService) {}

  @RequireCapability(Capability.AUDITS_MANAGE)
  @Post("admin/audits")
  create(@CurrentActor() actor: Actor, @Body() dto: CreateAuditDto) {
    return this.service.create(asUser(actor), dto);
  }

  @RequireCapability(Capability.AUDITS_VIEW)
  @Get("admin/audits")
  list(@CurrentActor() actor: Actor, @Query() q: AdminAuditsQuery) {
    return this.service.list(asUser(actor), q);
  }

  @RequireCapability(Capability.AUDITS_VIEW)
  @Get("admin/audits/summary")
  summary(@CurrentActor() actor: Actor, @Query() q: AuditSummaryQuery) {
    return this.service.summary(asUser(actor), q.branchId);
  }

  /** The corrective actions the caller owns. */
  @Get("audits/actions/mine")
  myActions(@CurrentActor() actor: Actor, @Query() q: MyActionsQuery) {
    return this.service.myActions(asUser(actor), q);
  }

  @Get("audits/:id")
  get(@CurrentActor() actor: Actor, @Param("id", Id) id: string) {
    return this.service.get(asUser(actor), id);
  }

  @HttpCode(200)
  @Post("audits/:id/start")
  start(@CurrentActor() actor: Actor, @Param("id", Id) id: string) {
    return this.service.start(asUser(actor), id);
  }

  @HttpCode(200)
  @Post("audits/:id/findings")
  addFinding(@CurrentActor() actor: Actor, @Param("id", Id) id: string, @Body() dto: CreateFindingDto) {
    return this.service.addFinding(asUser(actor), id, dto);
  }

  @HttpCode(200)
  @Post("audits/:id/complete-fieldwork")
  completeFieldwork(@CurrentActor() actor: Actor, @Param("id", Id) id: string, @Body() dto: CompleteFieldworkDto) {
    return this.service.completeFieldwork(asUser(actor), id, dto);
  }

  @HttpCode(200)
  @Post("audits/:id/close")
  close(@CurrentActor() actor: Actor, @Param("id", Id) id: string, @Body() dto: AuditReasonDto) {
    return this.service.close(asUser(actor), id, dto.note);
  }

  @HttpCode(200)
  @Post("audits/:id/cancel")
  cancel(@CurrentActor() actor: Actor, @Param("id", Id) id: string, @Body() dto: AuditReasonDto) {
    return this.service.cancel(asUser(actor), id, dto.note);
  }

  @HttpCode(200)
  @Post("audits/:id/notes")
  note(@CurrentActor() actor: Actor, @Param("id", Id) id: string, @Body() dto: AuditNoteDto) {
    return this.service.addNote(asUser(actor), id, dto.note);
  }

  // ── Corrective actions ──

  @HttpCode(200)
  @Post("audits/findings/:findingId/submit")
  submit(@CurrentActor() actor: Actor, @Param("findingId", Id) findingId: string, @Body() dto: SubmitFindingDto) {
    return this.service.submitFinding(asUser(actor), findingId, dto.response);
  }

  @HttpCode(200)
  @Post("audits/findings/:findingId/verify")
  verify(@CurrentActor() actor: Actor, @Param("findingId", Id) findingId: string, @Body() dto: AuditReasonDto) {
    return this.service.verifyFinding(asUser(actor), findingId, dto.note);
  }

  @HttpCode(200)
  @Post("audits/findings/:findingId/reopen")
  reopen(@CurrentActor() actor: Actor, @Param("findingId", Id) findingId: string, @Body() dto: AuditReasonDto) {
    return this.service.reopenFinding(asUser(actor), findingId, dto.note);
  }

  @HttpCode(200)
  @Post("audits/findings/:findingId/reassign")
  reassign(@CurrentActor() actor: Actor, @Param("findingId", Id) findingId: string, @Body() dto: ReassignFindingDto) {
    return this.service.reassignFinding(asUser(actor), findingId, dto);
  }
}
