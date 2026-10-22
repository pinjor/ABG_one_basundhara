import { Body, Controller, Delete, Get, HttpCode, Inject, Param, ParseUUIDPipe, Patch, Post, Query, Res, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Response } from "express";
import { Capability, NOTICE_LIMITS } from "@abg-dispatch/shared";
import { AllowReadOnly, Public, RequireCapability } from "../auth/decorators";
import { CurrentActor, type Actor } from "../common/actor";
import { APP_CONFIG, type AppConfig } from "../common/config";
import { IdempotencyInterceptor } from "../common/idempotency.interceptor";
import { RateLimit, RateLimitGuard } from "../common/rate-limit";
import { asUser } from "../admin/admin-scope";
import { AdminNoticesQuery, CreateNoticeDto, NoticeReceiptsQuery, NoticesQuery, UpdateNoticeDto } from "./notices.dto";
import { NoticesService, type UploadedPdf } from "./notices.service";

const Id = new ParseUUIDPipe({ version: "4", errorHttpStatusCode: 404 });
/** One PDF per notice. Multer stops at the limit; the service gives the readable error. */
const PDF_UPLOAD = { limits: { fileSize: NOTICE_LIMITS.attachmentMaxBytes + 1, files: 1, fields: 40 } };

/** The official notice board. */
@Controller()
@UseGuards(RateLimitGuard)
@UseInterceptors(IdempotencyInterceptor)
export class NoticesController {
  constructor(
    private readonly service: NoticesService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  // ── Reading (every signed-in employee) ──

  /** The board: published, live, addressed to the caller. Pinned first, then urgent, then newest. */
  @RequireCapability(Capability.NOTICE_READ)
  @Get("notices")
  list(@CurrentActor() actor: Actor, @Query() q: NoticesQuery) {
    return this.service.list(asUser(actor), q);
  }

  @RequireCapability(Capability.NOTICE_READ)
  @Get("notices/unread-count")
  unreadCount(@CurrentActor() actor: Actor) {
    return this.service.unreadCount(asUser(actor));
  }

  /** Opening a notice marks it read. 404 unless it is addressed to the caller (authors and managers excepted). */
  @RequireCapability(Capability.NOTICE_READ)
  @Get("notices/:id")
  open(@CurrentActor() actor: Actor, @Param("id", Id) id: string) {
    return this.service.open(asUser(actor), id);
  }

  /** "I have read and understood". Idempotent; auditors may acknowledge too. */
  @RequireCapability(Capability.NOTICE_READ)
  @AllowReadOnly()
  @HttpCode(200)
  @Post("notices/:id/acknowledge")
  acknowledge(@CurrentActor() actor: Actor, @Param("id", Id) id: string) {
    return this.service.acknowledge(asUser(actor), id);
  }

  // ── Publishing ──

  /** Multipart: the notice fields plus an optional `attachment` PDF. `publish=true` sends it at once. */
  @RequireCapability(Capability.NOTICE_PUBLISH)
  @RateLimit(20, 60)
  @Post("notices")
  @UseInterceptors(FileInterceptor("attachment", PDF_UPLOAD))
  create(@CurrentActor() actor: Actor, @Body() dto: CreateNoticeDto, @UploadedFile() file?: UploadedPdf) {
    return this.service.create(asUser(actor), dto, file);
  }

  @RequireCapability(Capability.NOTICE_PUBLISH)
  @Patch("notices/:id")
  update(@CurrentActor() actor: Actor, @Param("id", Id) id: string, @Body() dto: UpdateNoticeDto) {
    return this.service.update(asUser(actor), id, dto);
  }

  @RequireCapability(Capability.NOTICE_PUBLISH)
  @HttpCode(200)
  @Post("notices/:id/publish")
  publish(@CurrentActor() actor: Actor, @Param("id", Id) id: string) {
    return this.service.publish(asUser(actor), id);
  }

  @RequireCapability(Capability.NOTICE_PUBLISH)
  @HttpCode(200)
  @Post("notices/:id/archive")
  archive(@CurrentActor() actor: Actor, @Param("id", Id) id: string) {
    return this.service.archive(asUser(actor), id);
  }

  /** Drafts only. */
  @RequireCapability(Capability.NOTICE_PUBLISH)
  @Delete("notices/:id")
  discard(@CurrentActor() actor: Actor, @Param("id", Id) id: string) {
    return this.service.discard(asUser(actor), id);
  }

  /** Drafts only: replace the attached PDF (multipart `attachment`). */
  @RequireCapability(Capability.NOTICE_PUBLISH)
  @HttpCode(200)
  @Post("notices/:id/attachment")
  @UseInterceptors(FileInterceptor("attachment", PDF_UPLOAD))
  attachment(@CurrentActor() actor: Actor, @Param("id", Id) id: string, @UploadedFile() file?: UploadedPdf) {
    return this.service.replaceAttachment(asUser(actor), id, file);
  }

  /**
   * The attached PDF through the ten-minute signed link issued with the
   * notice. Served inline so the portal can preview it in a frame and the
   * phone can hand it to its PDF viewer.
   */
  @Public()
  @Get("notice-attachments/:id/content")
  async signedAttachment(@Param("id", Id) id: string, @Query("exp") exp: string, @Query("sig") sig: string, @Res() res: Response) {
    const file = await this.service.attachmentForSignedLink(id, exp, sig);
    const ascii = file.fileName.replace(/[^\x20-\x7e]+/g, "_").replace(/["\\]/g, "");
    res.setHeader("Content-Type", file.mimeType);
    res.setHeader("Content-Length", String(file.data.length));
    res.setHeader("Content-Disposition", `inline; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(file.fileName)}`);
    res.setHeader("Cache-Control", "private, max-age=300");
    res.setHeader("X-Content-Type-Options", "nosniff");
    // The portal previews the PDF in a frame: allow framing by our own pages only.
    res.removeHeader("X-Frame-Options");
    res.setHeader("Content-Security-Policy", ["frame-ancestors 'self'", ...this.config.corsOrigins].join(" "));
    res.send(file.data);
  }

  // ── Publisher views ──

  /** The caller's own notices (all notices for notice.manage) with read and acknowledgement counters. */
  @RequireCapability(Capability.NOTICE_PUBLISH)
  @Get("admin/notices")
  adminList(@CurrentActor() actor: Actor, @Query() q: AdminNoticesQuery) {
    return this.service.adminList(asUser(actor), q);
  }

  /** Dashboard figures. Publishers get their own notices (managers all); readers what is addressed to them. */
  @RequireCapability(Capability.NOTICE_READ)
  @Get("admin/notices/summary")
  summary(@CurrentActor() actor: Actor) {
    return this.service.summary(asUser(actor));
  }

  @RequireCapability(Capability.NOTICE_PUBLISH)
  @Get("admin/notices/:id/receipts")
  receipts(@CurrentActor() actor: Actor, @Param("id", Id) id: string, @Query() q: NoticeReceiptsQuery) {
    return this.service.receipts(asUser(actor), id, q);
  }
}
