import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query, Res, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Response } from "express";
import { Capability, LICENCE_LIMITS } from "@abg-dispatch/shared";
import { Public, RequireCapability } from "../auth/decorators";
import { CurrentActor, type Actor } from "../common/actor";
import { IdempotencyInterceptor } from "../common/idempotency.interceptor";
import { RateLimit, RateLimitGuard } from "../common/rate-limit";
import { asUser } from "../admin/admin-scope";
import { CreateLicenceDto, LicenceDocumentDto, LicenceNoteDto, LicenceOwnersQuery, LicencesQuery, RenewLicenceDto, RenewalStageDto, UpdateLicenceDto } from "./licences.dto";
import { LicencesService, type UploadedDocument } from "./licences.service";

const Id = new ParseUUIDPipe({ version: "4", errorHttpStatusCode: 404 });
/** Multer stops at a little over the limit; the service gives the precise, friendly refusal. */
const DOCUMENT_UPLOAD = { limits: { fileSize: LICENCE_LIMITS.documentMaxBytes + 1024 * 1024, files: 1 } };

/** The regulatory licence register. */
@Controller()
@UseGuards(RateLimitGuard)
@UseInterceptors(IdempotencyInterceptor)
export class LicencesController {
  constructor(private readonly service: LicencesService) {}

  // Fixed paths are declared before `licences/:id`.

  @RequireCapability(Capability.LICENCE_VIEW)
  @Get("licences")
  list(@CurrentActor() actor: Actor, @Query() q: LicencesQuery) {
    return this.service.list(asUser(actor), q);
  }

  /** Offices the viewer can filter the register by. */
  @RequireCapability(Capability.LICENCE_VIEW)
  @Get("licences/offices")
  offices(@CurrentActor() actor: Actor) {
    return this.service.offices(asUser(actor));
  }

  /** People who can be responsible for a licence at an office. */
  @RequireCapability(Capability.LICENCE_MANAGE)
  @Get("licences/owners")
  owners(@CurrentActor() actor: Actor, @Query() q: LicenceOwnersQuery) {
    return this.service.owners(asUser(actor), q.branchId);
  }

  @RequireCapability(Capability.LICENCE_MANAGE)
  @Post("licences")
  create(@CurrentActor() actor: Actor, @Body() dto: CreateLicenceDto) {
    return this.service.create(asUser(actor), dto);
  }

  /** In the viewer's offices; anything else is 404. */
  @RequireCapability(Capability.LICENCE_VIEW)
  @Get("licences/:id")
  get(@CurrentActor() actor: Actor, @Param("id", Id) id: string) {
    return this.service.get(asUser(actor), id);
  }

  @RequireCapability(Capability.LICENCE_MANAGE)
  @Patch("licences/:id")
  update(@CurrentActor() actor: Actor, @Param("id", Id) id: string, @Body() dto: UpdateLicenceDto) {
    return this.service.update(asUser(actor), id, dto);
  }

  @RequireCapability(Capability.LICENCE_MANAGE)
  @HttpCode(200)
  @Post("licences/:id/renewal")
  renewal(@CurrentActor() actor: Actor, @Param("id", Id) id: string, @Body() dto: RenewalStageDto) {
    return this.service.moveRenewal(asUser(actor), id, dto.stage, dto.note);
  }

  /** JSON, or multipart with the new certificate's scan in `file`. */
  @RequireCapability(Capability.LICENCE_MANAGE)
  @HttpCode(200)
  @Post("licences/:id/renew")
  @UseInterceptors(FileInterceptor("file", DOCUMENT_UPLOAD))
  renew(@CurrentActor() actor: Actor, @Param("id", Id) id: string, @Body() dto: RenewLicenceDto, @UploadedFile() file?: UploadedDocument) {
    return this.service.renew(asUser(actor), id, dto, file);
  }

  /** Multipart: the scanned licence in `file` (PDF, JPEG, PNG or WebP, 15 MB at most). */
  @RequireCapability(Capability.LICENCE_MANAGE)
  @RateLimit(30, 60)
  @HttpCode(200)
  @Post("licences/:id/document")
  @UseInterceptors(FileInterceptor("file", DOCUMENT_UPLOAD))
  document(@CurrentActor() actor: Actor, @Param("id", Id) id: string, @Body() dto: LicenceDocumentDto, @UploadedFile() file?: UploadedDocument) {
    return this.service.uploadDocument(asUser(actor), id, file, dto.note);
  }

  /** The scan, for clients that send an auth header. */
  @RequireCapability(Capability.LICENCE_VIEW)
  @Get("licences/:id/document/content")
  async documentContent(@CurrentActor() actor: Actor, @Param("id", Id) id: string, @Res() res: Response) {
    return this.send(res, await this.service.documentFor(asUser(actor), id));
  }

  /** Signed, short-lived link to the scan (issued in every licence response as `documentUrl`). */
  @Public()
  @Get("licence-documents/:id/content")
  async signedDocument(@Param("id", Id) id: string, @Query("exp") exp: string | undefined, @Query("sig") sig: string | undefined, @Res() res: Response) {
    return this.send(res, await this.service.documentForSignedLink(id, exp, sig));
  }

  @RequireCapability(Capability.LICENCE_MANAGE)
  @HttpCode(200)
  @Post("licences/:id/notes")
  note(@CurrentActor() actor: Actor, @Param("id", Id) id: string, @Body() dto: LicenceNoteDto) {
    return this.service.addNote(asUser(actor), id, dto.note);
  }

  @RequireCapability(Capability.LICENCE_VIEW)
  @Get("admin/licences/summary")
  summary(@CurrentActor() actor: Actor, @Query() q: LicenceOwnersQuery) {
    return this.service.summary(asUser(actor), q.branchId);
  }

  /** Send any expiry alerts that are due now, instead of waiting for the next scheduled check. */
  @RequireCapability(Capability.LICENCE_MANAGE)
  @RateLimit(6, 60)
  @HttpCode(200)
  @Post("admin/licences/run-alerts")
  runAlerts(@CurrentActor() actor: Actor) {
    return this.service.runAlerts(asUser(actor));
  }

  private send(res: Response, file: { data: Buffer; mimeType: string; fileName: string }) {
    res.setHeader("Content-Type", file.mimeType);
    res.setHeader("Content-Length", String(file.data.length));
    res.setHeader("Content-Disposition", `inline; filename="${file.fileName.replace(/["\\\r\n]/g, "")}"`);
    res.setHeader("Cache-Control", "private, max-age=300");
    res.setHeader("X-Content-Type-Options", "nosniff");
    // The portal previews scans in its own frame; nobody else may frame them.
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    res.setHeader("Content-Security-Policy", "frame-ancestors 'self'");
    res.send(file.data);
  }
}
