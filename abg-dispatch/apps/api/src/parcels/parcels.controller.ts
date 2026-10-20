import { Body, Controller, Get, Headers, HttpCode, Param, ParseUUIDPipe, Post, Query, UseInterceptors } from "@nestjs/common";
import { Capability } from "@abg-dispatch/shared";
import { CurrentActor, type Actor } from "../common/actor";
import { AllowGuest, RequireCapability } from "../auth/decorators";
import { IdempotencyInterceptor } from "../common/idempotency.interceptor";
import { ParcelQueryService } from "./parcel-query.service";
import { ParcelWorkflowService } from "./parcel-workflow.service";
import {
  ActionContextDto,
  AssignCarrierDto,
  CheckpointDto,
  CommentDto,
  CompleteReturnDto,
  ConfirmHandoverDto,
  CorrectionDto,
  CreateParcelDto,
  ExternalStatusDto,
  ListParcelsQuery,
  ReasonDto,
  ReceiveDto,
  RecordExceptionDto,
  RequestReceiptCodeDto,
  ResendNotificationDto,
  ResolveExceptionDto,
  ScanDto,
  UpdateSlaDto,
} from "./dto/parcel.dto";
import { normalizeExternal } from "../couriers/status-map";

const Id = new ParseUUIDPipe({ version: "4", errorHttpStatusCode: 404 });

/**
 * Parcel endpoints used by the mobile app (and the admin portal for actions).
 * Every :id route resolves object-level access in the services.
 * POSTs honour an `Idempotency-Key` header so offline retries are safe.
 */
@UseInterceptors(IdempotencyInterceptor)
@Controller("parcels")
export class ParcelsController {
  constructor(
    private readonly query: ParcelQueryService,
    private readonly workflow: ParcelWorkflowService,
  ) {}

  @AllowGuest()
  @Get()
  list(@CurrentActor() actor: Actor, @Query() q: ListParcelsQuery) {
    return this.query.listMine(actor, q);
  }

  @AllowGuest()
  @Get("summary")
  summary(@CurrentActor() actor: Actor) {
    return this.query.summary(actor);
  }

  @AllowGuest()
  @HttpCode(200)
  @Post("scan")
  scan(@CurrentActor() actor: Actor, @Body() dto: ScanDto) {
    return this.query.scan(actor, dto.payload);
  }

  @AllowGuest()
  @Get("by-tracking/:trackingNumber")
  byTracking(@CurrentActor() actor: Actor, @Param("trackingNumber") tn: string) {
    return this.query.byTracking(actor, tn);
  }

  @RequireCapability(Capability.PARCEL_CREATE)
  @Post()
  create(@CurrentActor() actor: Actor, @Body() dto: CreateParcelDto, @Headers("idempotency-key") key?: string) {
    return this.workflow.create(actor, dto, key);
  }

  @AllowGuest()
  @Get(":id")
  get(@CurrentActor() actor: Actor, @Param("id", Id) id: string) {
    return this.query.get(actor, id);
  }

  @AllowGuest()
  @Get(":id/timeline")
  timeline(@CurrentActor() actor: Actor, @Param("id", Id) id: string) {
    return this.query.timeline(actor, id);
  }

  @HttpCode(200)
  @Post(":id/book")
  book(@CurrentActor() actor: Actor, @Param("id", Id) id: string) {
    return this.workflow.bookDraft(actor, id);
  }

  @HttpCode(200)
  @Post(":id/carrier")
  assignCarrier(@CurrentActor() actor: Actor, @Param("id", Id) id: string, @Body() dto: AssignCarrierDto, @Headers("idempotency-key") key?: string) {
    return this.workflow.assignCarrier(actor, id, dto, key);
  }

  @AllowGuest()
  @HttpCode(200)
  @Post(":id/accept")
  accept(@CurrentActor() actor: Actor, @Param("id", Id) id: string) {
    return this.workflow.acceptAssignment(actor, id);
  }

  @AllowGuest()
  @HttpCode(200)
  @Post(":id/handover/request")
  requestHandover(@CurrentActor() actor: Actor, @Param("id", Id) id: string, @Body() dto: ActionContextDto) {
    return this.workflow.requestHandover(actor, id, dto);
  }

  @AllowGuest()
  @HttpCode(200)
  @Post(":id/handover/confirm")
  confirmHandover(@CurrentActor() actor: Actor, @Param("id", Id) id: string, @Body() dto: ConfirmHandoverDto, @Headers("idempotency-key") key?: string) {
    return this.workflow.confirmHandover(actor, id, dto, key);
  }

  @AllowGuest()
  @HttpCode(200)
  @Post(":id/in-transit")
  inTransit(@CurrentActor() actor: Actor, @Param("id", Id) id: string, @Body() dto: ActionContextDto, @Headers("idempotency-key") key?: string) {
    return this.workflow.startTransit(actor, id, dto, key);
  }

  @AllowGuest()
  @HttpCode(200)
  @Post(":id/checkpoint")
  checkpoint(@CurrentActor() actor: Actor, @Param("id", Id) id: string, @Body() dto: CheckpointDto, @Headers("idempotency-key") key?: string) {
    return this.workflow.checkpoint(actor, id, dto, key);
  }

  @AllowGuest()
  @HttpCode(200)
  @Post(":id/arrive")
  arrive(@CurrentActor() actor: Actor, @Param("id", Id) id: string, @Body() dto: ActionContextDto, @Headers("idempotency-key") key?: string) {
    return this.workflow.markArrived(actor, id, dto, key);
  }

  @AllowGuest()
  @HttpCode(200)
  @Post(":id/receipt-code")
  receiptCode(@CurrentActor() actor: Actor, @Param("id", Id) id: string, @Body() dto: RequestReceiptCodeDto) {
    return this.workflow.requestReceiptCode(actor, id, dto);
  }

  @AllowGuest()
  @HttpCode(200)
  @Post(":id/receive")
  receive(@CurrentActor() actor: Actor, @Param("id", Id) id: string, @Body() dto: ReceiveDto, @Headers("idempotency-key") key?: string) {
    return this.workflow.receive(actor, id, dto, key);
  }

  @AllowGuest()
  @HttpCode(200)
  @Post(":id/exceptions")
  exception(@CurrentActor() actor: Actor, @Param("id", Id) id: string, @Body() dto: RecordExceptionDto, @Headers("idempotency-key") key?: string) {
    return this.workflow.recordException(actor, id, dto, key);
  }

  @RequireCapability(Capability.EXCEPTION_RESOLVE)
  @HttpCode(200)
  @Post(":id/exceptions/:exceptionId/resolve")
  resolve(@CurrentActor() actor: Actor, @Param("id", Id) id: string, @Param("exceptionId", Id) exceptionId: string, @Body() dto: ResolveExceptionDto) {
    return this.workflow.resolveException(actor, id, exceptionId, dto);
  }

  @HttpCode(200)
  @Post(":id/cancel")
  cancel(@CurrentActor() actor: Actor, @Param("id", Id) id: string, @Body() dto: ReasonDto, @Headers("idempotency-key") key?: string) {
    return this.workflow.cancel(actor, id, dto, key);
  }

  @HttpCode(200)
  @Post(":id/return")
  requestReturn(@CurrentActor() actor: Actor, @Param("id", Id) id: string, @Body() dto: ReasonDto, @Headers("idempotency-key") key?: string) {
    return this.workflow.requestReturn(actor, id, dto, key);
  }

  @AllowGuest()
  @HttpCode(200)
  @Post(":id/return/start")
  startReturn(@CurrentActor() actor: Actor, @Param("id", Id) id: string, @Body() dto: ActionContextDto) {
    return this.workflow.startReturn(actor, id, dto);
  }

  @HttpCode(200)
  @Post(":id/return/complete")
  completeReturn(@CurrentActor() actor: Actor, @Param("id", Id) id: string, @Body() dto: CompleteReturnDto) {
    return this.workflow.completeReturn(actor, id, dto);
  }

  @AllowGuest()
  @HttpCode(200)
  @Post(":id/comments")
  comment(@CurrentActor() actor: Actor, @Param("id", Id) id: string, @Body() dto: CommentDto) {
    return this.workflow.comment(actor, id, dto.body);
  }

  @RequireCapability(Capability.PARCEL_CORRECT)
  @HttpCode(200)
  @Post(":id/corrections")
  correct(@CurrentActor() actor: Actor, @Param("id", Id) id: string, @Body() dto: CorrectionDto) {
    return this.workflow.correct(actor, id, dto);
  }

  @RequireCapability(Capability.SLA_UPDATE)
  @HttpCode(200)
  @Post(":id/sla")
  sla(@CurrentActor() actor: Actor, @Param("id", Id) id: string, @Body() dto: UpdateSlaDto) {
    return this.workflow.updateSla(actor, id, dto);
  }

  @RequireCapability(Capability.NOTIFY_RESEND)
  @HttpCode(200)
  @Post(":id/notifications/resend")
  resend(@CurrentActor() actor: Actor, @Param("id", Id) id: string, @Body() dto: ResendNotificationDto) {
    return this.workflow.resendNotification(actor, id, dto.audience);
  }

  @RequireCapability(Capability.EXTERNAL_STATUS_UPDATE)
  @HttpCode(200)
  @Post(":id/external-status")
  externalStatus(@CurrentActor() actor: Actor, @Param("id", Id) id: string, @Body() dto: ExternalStatusDto) {
    return this.workflow.applyExternalStatus(actor, id, { ...dto, normalized: dto.normalized ?? normalizeExternal("MANUAL", dto.rawStatus) ?? ("PENDING" as never) });
  }
}
