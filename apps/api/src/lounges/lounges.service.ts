import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { LoungeStatus, SERVICE_REQUEST_STATUS_TRANSITIONS } from "@bsc/shared";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { CreateLoungeDto } from "./dto/create-lounge.dto";
import { CreateServiceRequestDto } from "./dto/create-service-request.dto";

@Injectable()
export class LoungesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  list(params: { zoneId?: string; status?: string }) {
    return this.prisma.lounge.findMany({
      where: { zoneId: params.zoneId, status: params.status },
      include: { zone: { select: { id: true, name: true, type: true } } },
      orderBy: { name: "asc" },
    });
  }

  async getOne(id: string) {
    const lounge = await this.prisma.lounge.findUnique({
      where: { id },
      include: {
        zone: { select: { id: true, name: true, type: true } },
        serviceRequests: { orderBy: { requestedAt: "desc" }, take: 20 },
      },
    });
    if (!lounge) throw new NotFoundException("Lounge not found");
    return lounge;
  }

  async create(dto: CreateLoungeDto, userId: string) {
    const lounge = await this.prisma.lounge.create({ data: dto });
    await this.audit.record({ entityType: "Lounge", entityId: lounge.id, action: "CREATE", userId, after: lounge });
    return lounge;
  }

  /** Party arrives/leaves a lounge (Section 4.9 capacity control) — occupancy is clamped and status follows it. */
  async adjustOccupancy(id: string, delta: 1 | -1, userId: string) {
    const before = await this.getOne(id);
    const nextOccupancy = Math.max(0, Math.min(before.capacity, before.currentOccupancy + delta));
    const status = nextOccupancy >= before.capacity && before.capacity > 0 ? LoungeStatus.AT_CAPACITY : LoungeStatus.OPEN;
    const lounge = await this.prisma.lounge.update({
      where: { id },
      data: { currentOccupancy: nextOccupancy, status: before.status === LoungeStatus.CLOSED ? before.status : status },
    });
    await this.audit.record({
      entityType: "Lounge",
      entityId: id,
      action: delta > 0 ? "OCCUPANCY_INCREMENT" : "OCCUPANCY_DECREMENT",
      userId,
      before,
      after: lounge,
    });
    return lounge;
  }

  async toggleOpenClosed(id: string, userId: string) {
    const before = await this.getOne(id);
    const nextStatus = before.status === LoungeStatus.CLOSED ? LoungeStatus.OPEN : LoungeStatus.CLOSED;
    const lounge = await this.prisma.lounge.update({ where: { id }, data: { status: nextStatus } });
    await this.audit.record({
      entityType: "Lounge",
      entityId: id,
      action: `STATUS_CHANGE:${nextStatus}`,
      userId,
      before,
      after: lounge,
    });
    return lounge;
  }

  auditTrail(id: string) {
    return this.audit.listForEntity("Lounge", id);
  }

  // --- Service requests ---

  listServiceRequests(params: { loungeId?: string; status?: string }) {
    return this.prisma.serviceRequest.findMany({
      where: { loungeId: params.loungeId, status: params.status },
      include: { lounge: { select: { id: true, name: true } } },
      orderBy: { requestedAt: "desc" },
    });
  }

  async createServiceRequest(dto: CreateServiceRequestDto, userId: string) {
    const request = await this.prisma.serviceRequest.create({ data: dto });
    await this.audit.record({
      entityType: "ServiceRequest",
      entityId: request.id,
      action: "CREATE",
      userId,
      after: request,
    });
    return request;
  }

  async setServiceRequestStatus(id: string, status: string, userId: string) {
    const before = await this.prisma.serviceRequest.findUnique({ where: { id } });
    if (!before) throw new NotFoundException("Service request not found");
    const allowed = SERVICE_REQUEST_STATUS_TRANSITIONS[before.status] ?? [];
    if (!allowed.includes(status)) {
      throw new BadRequestException(`Cannot move a ${before.status} service request to ${status}`);
    }
    const request = await this.prisma.serviceRequest.update({ where: { id }, data: { status } });
    await this.audit.record({
      entityType: "ServiceRequest",
      entityId: id,
      action: `STATUS_CHANGE:${status}`,
      userId,
      before,
      after: request,
    });
    return request;
  }
}
