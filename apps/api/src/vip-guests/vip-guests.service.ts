import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Role, VIP_STATUS_TRANSITIONS } from "@bsc/shared";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { CreateVipGuestDto } from "./dto/create-vip-guest.dto";
import { UpdateVipGuestDto } from "./dto/update-vip-guest.dto";
import type { RequestUser } from "../auth/current-user.decorator";

/** Roles allowed to see a privacy-flagged VIP guest (Section 4.8 "privacy control"). */
const PRIVACY_CLEARED_ROLES = new Set([Role.SUPER_ADMIN, Role.PROTOCOL_OFFICER]);

@Injectable()
export class VipGuestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(user: RequestUser, params: { classification?: string; status?: string; search?: string }) {
    const guests = await this.prisma.vIPGuest.findMany({
      where: {
        classification: params.classification,
        status: params.status,
        name: params.search ? { contains: params.search, mode: "insensitive" } : undefined,
      },
      orderBy: { arrivalDatetime: "asc" },
    });
    if (PRIVACY_CLEARED_ROLES.has(user.role as Role)) return guests;
    return guests.filter((g) => !g.privacyFlag);
  }

  async getOne(id: string, user: RequestUser) {
    const guest = await this.prisma.vIPGuest.findUnique({ where: { id } });
    if (!guest) throw new NotFoundException("VIP guest not found");
    if (guest.privacyFlag && !PRIVACY_CLEARED_ROLES.has(user.role as Role)) {
      throw new ForbiddenException("This guest's record is privacy-flagged");
    }
    return guest;
  }

  async create(dto: CreateVipGuestDto, userId: string) {
    const guest = await this.prisma.vIPGuest.create({
      data: { ...dto, arrivalDatetime: new Date(dto.arrivalDatetime) },
    });
    await this.audit.record({ entityType: "VIPGuest", entityId: guest.id, action: "CREATE", userId, after: guest });
    return guest;
  }

  async update(id: string, dto: UpdateVipGuestDto, user: RequestUser) {
    const before = await this.getOne(id, user);
    const guest = await this.prisma.vIPGuest.update({
      where: { id },
      data: { ...dto, arrivalDatetime: dto.arrivalDatetime ? new Date(dto.arrivalDatetime) : undefined },
    });
    await this.audit.record({ entityType: "VIPGuest", entityId: id, action: "UPDATE", userId: user.id, before, after: guest });
    return guest;
  }

  async setStatus(id: string, status: string, user: RequestUser) {
    const before = await this.getOne(id, user);
    const allowed = VIP_STATUS_TRANSITIONS[before.status] ?? [];
    if (!allowed.includes(status)) {
      throw new BadRequestException(`Cannot move a ${before.status} VIP guest to ${status}`);
    }
    const guest = await this.prisma.vIPGuest.update({ where: { id }, data: { status } });
    await this.audit.record({
      entityType: "VIPGuest",
      entityId: id,
      action: `STATUS_CHANGE:${status}`,
      userId: user.id,
      before,
      after: guest,
    });
    return guest;
  }

  auditTrail(id: string) {
    return this.audit.listForEntity("VIPGuest", id);
  }
}
