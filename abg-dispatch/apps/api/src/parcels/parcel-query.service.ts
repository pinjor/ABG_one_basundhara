import { Inject, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import {
  EVENT_LABEL,
  EventType,
  PROOF_ATTACHMENT_KINDS,
  ParcelStatus,
  STATUS_VIEW_STATUSES,
  StatusView,
  TERMINAL_STATUSES,
  VERIFICATION_LABEL,
  ViewerRelation,
  extractQrToken,
  isTrackingNumber,
} from "@abg-dispatch/shared";
import { APP_CONFIG, type AppConfig } from "../common/config";
import { PrismaService } from "../common/prisma.service";
import { clampLimit, decodeCursor, encodeCursor } from "../common/pagination";
import { dhakaDayRange } from "../common/time";
import { badRequest, notFound, PARCEL_NOT_FOUND } from "../common/errors";
import type { Actor } from "../common/actor";
import { ParcelAccessService } from "./parcel-access.service";
import { PARCEL_INCLUDE, ParcelWithRelations, serializeParcel, serializeParcelRow } from "./parcel-serializer";
import type { ListParcelsQuery } from "./dto/parcel.dto";

const LIVE = ["ASSIGNED", "ACCEPTED", "IN_CUSTODY"];
const CONTENT_FIELDS = new Set(["title", "description"]);

@Injectable()
export class ParcelQueryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ParcelAccessService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  private async load(id: string): Promise<ParcelWithRelations | null> {
    return this.prisma.parcel.findUnique({ where: { id }, include: PARCEL_INCLUDE });
  }

  async get(actor: Actor, id: string) {
    const parcel = await this.load(id);
    if (!parcel || !this.access.relation(actor, parcel)) throw notFound(PARCEL_NOT_FOUND);
    return serializeParcel(actor, parcel, this.access, this.config.publicQrBaseUrl);
  }

  /** After an action a guest may lose access (assignment completed) — return a minimal receipt instead of a 404. */
  async getOrSummary(actor: Actor, id: string) {
    const parcel = await this.load(id);
    if (!parcel) throw notFound(PARCEL_NOT_FOUND);
    if (this.access.relation(actor, parcel)) return serializeParcel(actor, parcel, this.access, this.config.publicQrBaseUrl);
    return { id: parcel.id, trackingNumber: parcel.trackingNumber, status: parcel.status, receivedAt: parcel.receivedAt, viewer: { relation: null, actions: [] } };
  }

  async byTracking(actor: Actor, trackingNumber: string) {
    const parcel = await this.prisma.parcel.findUnique({ where: { trackingNumber: trackingNumber.trim().toUpperCase() }, include: PARCEL_INCLUDE });
    if (!parcel || !this.access.relation(actor, parcel)) throw notFound(PARCEL_NOT_FOUND);
    return serializeParcel(actor, parcel, this.access, this.config.publicQrBaseUrl);
  }

  /** Resolve a scanned QR label or a typed tracking number. */
  async scan(actor: Actor, payload: string) {
    const token = extractQrToken(payload);
    let parcel: ParcelWithRelations | null = null;
    if (token) parcel = await this.prisma.parcel.findUnique({ where: { qrToken: token }, include: PARCEL_INCLUDE });
    else if (isTrackingNumber(payload)) {
      parcel = await this.prisma.parcel.findUnique({ where: { trackingNumber: payload.trim().toUpperCase() }, include: PARCEL_INCLUDE });
    } else throw badRequest("This is not an ABG Dispatch QR code or tracking number.", "UNRECOGNISED_CODE");
    if (!parcel) throw notFound(PARCEL_NOT_FOUND);
    const relation = this.access.relation(actor, parcel);
    // Holding the physical label lets a destination colleague receive on the receiver's behalf.
    const colleague = !relation && !!token && this.access.colleagueMayReceive(actor, parcel);
    if (!relation && !colleague) throw notFound(PARCEL_NOT_FOUND);
    const dto = serializeParcel(actor, parcel, this.access, this.config.publicQrBaseUrl, colleague ? ViewerRelation.DESTINATION_COLLEAGUE : undefined);
    const actions = dto.viewer.actions;
    const suggested =
      ["REQUEST_HANDOVER", "CONFIRM_HANDOVER_SENDER", "START_TRANSIT", "MARK_ARRIVED", "RECEIVE", "RECEIVE_ON_BEHALF", "CONFIRM_RETURN"].find((a) =>
        actions.includes(a as never),
      ) ?? null;
    return { parcel: dto, suggestedAction: suggested, scannedLabel: !!token };
  }

  /** Mobile inbox views. */
  async listMine(actor: Actor, q: ListParcelsQuery) {
    const visible = this.access.visibleWhere(actor);
    const and: Prisma.ParcelWhereInput[] = [visible];
    const box = q.box ?? "ALL";
    if (actor.kind === "user" && actor.employeeId) {
      const me = actor.employeeId;
      if (box === "INCOMING") {
        and.push({
          OR: [
            { receiverEmployeeId: me },
            ...(actor.departmentId ? [{ receiverType: "DEPARTMENT", receiverDepartmentId: actor.departmentId }] : []),
          ],
          status: { notIn: [ParcelStatus.DRAFT] },
        });
      } else if (box === "OUTGOING") {
        and.push({ OR: [{ senderEmployeeId: me }, { createdById: actor.userId }] });
      } else if (box === "ASSIGNED") {
        and.push({ currentAssignment: { employeeId: me, status: { in: LIVE } } });
      }
    }
    if (actor.kind === "guest" || box === "ASSIGNED") and.push({ status: { notIn: [...TERMINAL_STATUSES] } });
    if (box === "COMPLETED") and.push({ status: { in: [...TERMINAL_STATUSES] } });
    if (box === "ACTIVE") and.push({ status: { notIn: [...TERMINAL_STATUSES, ParcelStatus.DRAFT] } });
    this.applyCommonFilters(actor, q, and);
    return this.page(actor, and, q.cursor, q.limit);
  }

  applyCommonFilters(actor: Actor, q: ListParcelsQuery & { dateField?: string }, and: Prisma.ParcelWhereInput[]) {
    if (q.view && q.view !== StatusView.ALL) {
      if (q.view === StatusView.OVERDUE) and.push({ isOverdue: true, status: { notIn: [...TERMINAL_STATUSES] } });
      else if (q.view === StatusView.EXCEPTIONS) {
        and.push({ OR: [{ status: { in: [...STATUS_VIEW_STATUSES.EXCEPTIONS] } }, { hasOpenException: true, status: { notIn: [...TERMINAL_STATUSES] } }] });
      } else and.push({ status: { in: [...STATUS_VIEW_STATUSES[q.view]] } });
    }
    if (q.status) and.push({ status: { in: q.status.split(",") } });
    if (q.priority) and.push({ priority: q.priority });
    if (q.categoryId) and.push({ categoryId: q.categoryId });
    if (q.branchId) and.push({ OR: [{ originBranchId: q.branchId }, { destinationBranchId: q.branchId }] });
    const dateField = q.dateField === "receivedAt" ? "receivedAt" : "createdAt";
    if (q.dateFrom || q.dateTo) {
      const range: Prisma.DateTimeFilter = {};
      if (q.dateFrom) range.gte = dhakaDayRange(q.dateFrom).gte;
      if (q.dateTo) range.lt = dhakaDayRange(q.dateTo).lt;
      and.push({ [dateField]: range });
    }
    if (q.q && q.q.trim()) and.push(this.access.searchWhere(actor, q.q.trim()));
  }

  async page(actor: Actor, and: Prisma.ParcelWhereInput[], cursorRaw?: string, limitRaw?: string) {
    const limit = clampLimit(limitRaw, 25, 100);
    const cursor = decodeCursor(cursorRaw);
    if (cursor) and.push({ OR: [{ createdAt: { lt: cursor.createdAt } }, { createdAt: cursor.createdAt, id: { lt: cursor.id } }] });
    const rows = await this.prisma.parcel.findMany({
      where: { AND: and },
      include: PARCEL_INCLUDE,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
    });
    const more = rows.length > limit;
    const items = rows.slice(0, limit);
    return {
      items: items.map((p) => serializeParcelRow(actor, p, this.access)),
      nextCursor: more ? encodeCursor(items[items.length - 1].createdAt, items[items.length - 1].id) : null,
    };
  }

  /** Counts for the mobile home cards. */
  async summary(actor: Actor) {
    const visible = this.access.visibleWhere(actor);
    const count = (where: Prisma.ParcelWhereInput) => this.prisma.parcel.count({ where: { AND: [visible, where] } });
    if (actor.kind === "guest") {
      return { inTransit: 0, waitingForMe: 0, pendingPickup: 0, assignedToMe: await count({ status: { notIn: [...TERMINAL_STATUSES] } }), outgoingActive: 0 };
    }
    const me = actor.employeeId ?? "__none__";
    const incoming: Prisma.ParcelWhereInput = {
      OR: [{ receiverEmployeeId: me }, ...(actor.departmentId ? [{ receiverType: "DEPARTMENT", receiverDepartmentId: actor.departmentId }] : [])],
    };
    const outgoing: Prisma.ParcelWhereInput = { OR: [{ senderEmployeeId: me }, { createdById: actor.userId }] };
    const [inTransit, waitingForMe, pendingPickup, assignedToMe, outgoingActive] = await Promise.all([
      count({ AND: [{ OR: [incoming, outgoing] }, { status: { in: [ParcelStatus.PICKED_UP, ParcelStatus.IN_TRANSIT] } }] }),
      count({ AND: [incoming, { status: ParcelStatus.PENDING_RECEIPT }] }),
      count({ AND: [outgoing, { status: { in: [ParcelStatus.BOOKED, ParcelStatus.AWAITING_PICKUP] } }] }),
      count({ currentAssignment: { employeeId: me, status: { in: LIVE } }, status: { notIn: [...TERMINAL_STATUSES] } }),
      count({ AND: [outgoing, { status: { notIn: [...TERMINAL_STATUSES, ParcelStatus.DRAFT] } }] }),
    ]);
    return { inTransit, waitingForMe, pendingPickup, assignedToMe, outgoingActive };
  }

  /** The custody ledger, oldest first, with proofs and redaction applied. */
  async timeline(actor: Actor, parcelId: string) {
    const { facts, relation } = await this.access.assertView(actor, parcelId);
    const content = this.access.contentAccess(actor, facts);
    const [events, proofs, attachments, comments, exceptions] = await Promise.all([
      this.prisma.parcelEvent.findMany({ where: { parcelId }, orderBy: { sequence: "asc" } }),
      this.prisma.parcelProof.findMany({ where: { parcelId } }),
      this.prisma.parcelAttachment.findMany({ where: { parcelId }, orderBy: { createdAt: "asc" } }),
      this.prisma.parcelComment.findMany({ where: { parcelId }, orderBy: { createdAt: "asc" } }),
      this.prisma.parcelException.findMany({ where: { parcelId }, orderBy: { raisedAt: "asc" } }),
    ]);
    const proofById = new Map(proofs.map((p) => [p.id, p]));
    const auditor = relation === ViewerRelation.AUDITOR;
    const corrections = new Map<string, string[]>();
    for (const e of events) if (e.correctsEventId) corrections.set(e.correctsEventId, [...(corrections.get(e.correctsEventId) ?? []), e.id]);
    return {
      events: events.map((e) => {
        const meta = { ...((e.metadata ?? {}) as Record<string, unknown>) };
        if (content !== "FULL" && CONTENT_FIELDS.has(String(meta.field))) {
          meta.before = "[hidden]";
          meta.after = "[hidden]";
        }
        const proof = e.proofId ? proofById.get(e.proofId) : null;
        return {
          id: e.id,
          sequence: e.sequence,
          eventType: e.eventType,
          label: EVENT_LABEL[e.eventType as EventType] ?? e.eventType,
          fromStatus: e.fromStatus,
          toStatus: e.toStatus,
          actor: { type: e.actorType, name: e.actorNameSnapshot, code: auditor ? null : e.actorCodeSnapshot },
          location: e.locationNameSnapshot,
          at: e.serverTimestamp,
          deviceAt: e.deviceTimestamp,
          coordinates: e.latitude !== null && e.longitude !== null && !auditor ? { latitude: e.latitude, longitude: e.longitude } : null,
          verification: e.verificationMethod ? { method: e.verificationMethod, label: VERIFICATION_LABEL[e.verificationMethod as keyof typeof VERIFICATION_LABEL] ?? e.verificationMethod } : null,
          proof: proof ? { id: proof.id, type: proof.type, attachmentId: proof.attachmentId } : null,
          notes: e.notes,
          externalProvider: e.externalProvider,
          correctsEventId: e.correctsEventId,
          correctedBy: corrections.get(e.id) ?? [],
          metadata: meta,
        };
      }),
      attachments: attachments
        .filter((a) => content === "FULL" || PROOF_ATTACHMENT_KINDS.includes(a.kind as never))
        .map((a) => ({ id: a.id, kind: a.kind, fileName: a.fileName, mimeType: a.mimeType, sizeBytes: a.sizeBytes, uploadedBy: a.uploadedByName, createdAt: a.createdAt })),
      comments: comments.map((c) => ({ id: c.id, author: c.authorNameSnapshot, body: c.body, createdAt: c.createdAt })),
      exceptions: exceptions.map((x) => ({
        id: x.id,
        code: x.code,
        details: x.details,
        raisedBy: x.raisedByName,
        raisedAt: x.raisedAt,
        resolvedBy: x.resolvedByName,
        resolvedAt: x.resolvedAt,
        resolution: x.resolution,
        open: !x.resolvedAt,
      })),
    };
  }
}
