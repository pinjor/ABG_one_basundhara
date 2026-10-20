import { Body, Controller, Get, Inject, Param, Post, Query, Res, UploadedFile, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Response } from "express";
import { IsIn, IsOptional, IsString } from "class-validator";
import { AttachmentKind, Classification, EventType, PROOF_ATTACHMENT_KINDS } from "@abg-dispatch/shared";
import { APP_CONFIG, type AppConfig } from "../common/config";
import { PrismaService } from "../common/prisma.service";
import { CurrentActor, type Actor } from "../common/actor";
import { AllowGuest, Public } from "../auth/decorators";
import { badRequest, forbidden, notFound, unauthorized } from "../common/errors";
import { hmacSha256, safeEqual, sha256 } from "../common/crypto";
import { AuditService } from "../audit/audit.service";
import { ParcelAccessService } from "../parcels/parcel-access.service";
import { LedgerService, eventActor } from "../parcels/ledger.service";
import { StorageService, sniffMime } from "./storage.service";

class UploadDto {
  @IsIn(Object.values(AttachmentKind))
  kind!: string;

  @IsOptional()
  @IsString()
  note?: string;
}

const LINK_TTL_SECONDS = 300;

@Controller()
export class AttachmentsController {
  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly access: ParcelAccessService,
    private readonly ledger: LedgerService,
    private readonly audit: AuditService,
  ) {}

  @AllowGuest()
  @Post("parcels/:id/attachments")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 10 * 1024 * 1024, files: 1 } }))
  async upload(@CurrentActor() actor: Actor, @Param("id") parcelId: string, @Body() dto: UploadDto, @UploadedFile() file?: Express.Multer.File) {
    const { facts } = await this.access.assertView(actor, parcelId);
    if (!file) throw badRequest("Attach a file in the `file` field.", "FILE_REQUIRED");
    if (file.size > this.config.maxUploadBytes) throw badRequest("Files must be 10 MB or smaller.", "FILE_TOO_LARGE");
    const type = sniffMime(file.buffer);
    if (!type) throw badRequest("Only JPEG, PNG, WebP images and PDF documents can be attached.", "FILE_TYPE");
    if (!PROOF_ATTACHMENT_KINDS.includes(dto.kind as AttachmentKind) && this.access.contentAccess(actor, facts) !== "FULL") {
      throw forbidden("You can add delivery evidence to this parcel, but not content documents.");
    }
    const key = await this.storage.put(file.buffer, type.ext);
    const safeName = (file.originalname || `evidence.${type.ext}`).replace(/[^\w.\- ]+/g, "_").slice(0, 120);
    const attachment = await this.prisma.$transaction(async (tx) => {
      const created = await tx.parcelAttachment.create({
        data: {
          parcelId,
          kind: dto.kind,
          fileName: safeName,
          mimeType: type.mime,
          sizeBytes: file.size,
          sha256: sha256(file.buffer),
          storageKey: key,
          uploadedByUserId: actor.kind === "user" ? actor.userId : null,
          uploadedByGuestId: actor.kind === "guest" ? actor.guestCarrierId : null,
          uploadedByName: actor.displayName,
        },
      });
      const state = await this.ledger.lock(tx, parcelId);
      await this.ledger.record(tx, state, {
        eventType: EventType.ATTACHMENT_ADDED,
        actor: eventActor(actor),
        notes: dto.note ?? null,
        metadata: { attachmentId: created.id, kind: created.kind, fileName: created.fileName, sha256: created.sha256 },
      });
      return created;
    });
    return { id: attachment.id, kind: attachment.kind, fileName: attachment.fileName, mimeType: attachment.mimeType, sizeBytes: attachment.sizeBytes, createdAt: attachment.createdAt };
  }

  private async authorise(actor: Actor, parcelId: string, attachmentId: string) {
    const { facts } = await this.access.assertView(actor, parcelId);
    const att = await this.prisma.parcelAttachment.findUnique({ where: { id: attachmentId } });
    if (!att || att.parcelId !== parcelId) throw notFound("Attachment not found.");
    if (!PROOF_ATTACHMENT_KINDS.includes(att.kind as AttachmentKind) && this.access.contentAccess(actor, facts) !== "FULL") {
      throw forbidden("This attachment is restricted by the parcel's classification.");
    }
    if (facts.classification === Classification.CONFIDENTIAL || facts.classification === Classification.HIGHLY_CONFIDENTIAL) {
      await this.audit.record({ actor, action: "attachment.accessed", objectType: "attachment", objectId: att.id, summary: `${att.fileName} on a ${facts.classification} parcel` });
    }
    return att;
  }

  /** A short-lived signed URL, for <img>/<a> tags that cannot send an Authorization header. */
  @AllowGuest()
  @Get("parcels/:id/attachments/:attachmentId/link")
  async link(@CurrentActor() actor: Actor, @Param("id") parcelId: string, @Param("attachmentId") attachmentId: string) {
    const att = await this.authorise(actor, parcelId, attachmentId);
    const exp = Math.floor(Date.now() / 1000) + LINK_TTL_SECONDS;
    const sig = hmacSha256(this.config.jwtSecret, `${att.id}.${exp}`, "base64url");
    return { url: `/api/attachments/${att.id}/content?exp=${exp}&sig=${sig}`, expiresAt: new Date(exp * 1000) };
  }

  @AllowGuest()
  @Get("parcels/:id/attachments/:attachmentId/content")
  async content(@CurrentActor() actor: Actor, @Param("id") parcelId: string, @Param("attachmentId") attachmentId: string, @Res() res: Response) {
    const att = await this.authorise(actor, parcelId, attachmentId);
    return this.send(res, att);
  }

  @Public()
  @Get("attachments/:attachmentId/content")
  async signed(@Param("attachmentId") id: string, @Query("exp") exp: string, @Query("sig") sig: string, @Res() res: Response) {
    const expiry = Number(exp);
    if (!sig || !Number.isFinite(expiry) || expiry < Date.now() / 1000) throw unauthorized("This link has expired. Open the parcel again.", "LINK_EXPIRED");
    if (!safeEqual(hmacSha256(this.config.jwtSecret, `${id}.${expiry}`, "base64url"), sig)) throw unauthorized("This link is not valid.", "LINK_INVALID");
    const att = await this.prisma.parcelAttachment.findUnique({ where: { id } });
    if (!att) throw notFound("Attachment not found.");
    return this.send(res, att);
  }

  private async send(res: Response, att: { storageKey: string; mimeType: string; fileName: string }) {
    const data = await this.storage.get(att.storageKey);
    res.setHeader("Content-Type", att.mimeType);
    res.setHeader("Content-Disposition", `inline; filename="${att.fileName.replace(/"/g, "")}"`);
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.send(data);
  }
}
