import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query, Res, UploadedFile, UploadedFiles, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor, FilesInterceptor } from "@nestjs/platform-express";
import type { Response } from "express";
import { Capability, INCIDENT_LIMITS } from "@abg-dispatch/shared";
import { Public, RequireCapability } from "../auth/decorators";
import { CurrentActor, type Actor } from "../common/actor";
import { IdempotencyInterceptor } from "../common/idempotency.interceptor";
import { RateLimit, RateLimitGuard } from "../common/rate-limit";
import { safeEqual } from "../common/crypto";
import { unauthorized } from "../common/errors";
import { asUser } from "../admin/admin-scope";
import { AdminIncidentsQuery, IncidentDetailsDto, IncidentNoteDto, IncidentPhotoUploadDto, IncidentStatusDto, MyIncidentsQuery, ReportIncidentDto } from "./incidents.dto";
import { IncidentsService, type UploadedPhoto } from "./incidents.service";

const Id = new ParseUUIDPipe({ version: "4", errorHttpStatusCode: 404 });
const PHOTO_LIMITS = { limits: { fileSize: 10 * 1024 * 1024, files: INCIDENT_LIMITS.maxReportPhotos } };

@Controller()
@UseGuards(RateLimitGuard)
@UseInterceptors(IdempotencyInterceptor)
export class IncidentsController {
  constructor(private readonly incidents: IncidentsService) {}

  /** Multipart: the form fields plus up to three `photos`. */
  @RequireCapability(Capability.INCIDENT_REPORT)
  @RateLimit(10, 60)
  @Post("incidents")
  @UseInterceptors(FilesInterceptor("photos", INCIDENT_LIMITS.maxReportPhotos, PHOTO_LIMITS))
  report(@CurrentActor() actor: Actor, @Body() dto: ReportIncidentDto, @UploadedFiles() files: UploadedPhoto[] = []) {
    return this.incidents.report(asUser(actor), dto, files ?? []);
  }

  @RequireCapability(Capability.INCIDENT_REPORT)
  @Get("incidents/mine")
  mine(@CurrentActor() actor: Actor, @Query() q: MyIncidentsQuery) {
    return this.incidents.mine(asUser(actor), q);
  }

  /** The reporter, or staff whose offices include it. Everyone else gets 404. */
  @Get("incidents/:id")
  get(@CurrentActor() actor: Actor, @Param("id", Id) id: string) {
    return this.incidents.get(asUser(actor), id);
  }

  @RequireCapability(Capability.INCIDENT_MANAGE)
  @HttpCode(200)
  @Post("incidents/:id/status")
  status(@CurrentActor() actor: Actor, @Param("id", Id) id: string, @Body() dto: IncidentStatusDto) {
    return this.incidents.changeStatus(asUser(actor), id, dto.status, dto.note);
  }

  @RequireCapability(Capability.INCIDENT_MANAGE)
  @HttpCode(200)
  @Post("incidents/:id/notes")
  note(@CurrentActor() actor: Actor, @Param("id", Id) id: string, @Body() dto: IncidentNoteDto) {
    return this.incidents.addNote(asUser(actor), id, dto.note);
  }

  @RequireCapability(Capability.INCIDENT_MANAGE)
  @Patch("incidents/:id")
  details(@CurrentActor() actor: Actor, @Param("id", Id) id: string, @Body() dto: IncidentDetailsDto) {
    return this.incidents.updateDetails(asUser(actor), id, dto);
  }

  /** Reporter adds a photo of the problem; an admin adds a photo of the fix. */
  @HttpCode(200)
  @Post("incidents/:id/photos")
  @UseInterceptors(FileInterceptor("photo", { limits: { fileSize: 10 * 1024 * 1024, files: 1 } }))
  photo(@CurrentActor() actor: Actor, @Param("id", Id) id: string, @Body() dto: IncidentPhotoUploadDto, @UploadedFile() file?: UploadedPhoto) {
    return this.incidents.addPhoto(asUser(actor), id, file, dto.note);
  }

  @Get("incidents/:id/photos/:photoId/content")
  async photoContent(@CurrentActor() actor: Actor, @Param("id", Id) id: string, @Param("photoId", Id) photoId: string, @Res() res: Response) {
    const photo = await this.incidents.photoFor(asUser(actor), id, photoId);
    return this.send(res, photo);
  }

  /** Signed, short-lived link for image tags (issued inside every incident response). */
  @Public()
  @Get("incident-photos/:photoId/content")
  async signedPhoto(@Param("photoId", Id) photoId: string, @Query("exp") exp: string, @Query("sig") sig: string, @Res() res: Response) {
    const expiry = Number(exp);
    if (!sig || !Number.isFinite(expiry) || expiry < Date.now() / 1000) throw unauthorized("This photo link has expired. Open the report again.", "LINK_EXPIRED");
    if (!safeEqual(this.incidents.sign(photoId, expiry), sig)) throw unauthorized("This photo link is not valid.", "LINK_INVALID");
    return this.send(res, await this.incidents.photoForSignedLink(photoId));
  }

  @RequireCapability(Capability.INCIDENT_VIEW)
  @Get("admin/incidents")
  list(@CurrentActor() actor: Actor, @Query() q: AdminIncidentsQuery) {
    return this.incidents.list(asUser(actor), q);
  }

  @RequireCapability(Capability.INCIDENT_VIEW)
  @Get("admin/incidents/summary")
  summary(@CurrentActor() actor: Actor, @Query("branchId") branchId?: string) {
    return this.incidents.summary(asUser(actor), branchId || undefined);
  }

  private async send(res: Response, photo: { storageKey: string; mimeType: string; fileName: string }) {
    const data = await this.incidents.readPhoto(photo.storageKey);
    res.setHeader("Content-Type", photo.mimeType);
    res.setHeader("Content-Disposition", `inline; filename="${photo.fileName.replace(/"/g, "")}"`);
    res.setHeader("Cache-Control", "private, max-age=300");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.send(data);
  }
}
