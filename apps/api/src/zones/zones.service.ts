import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { CreateZoneDto } from "./dto/create-zone.dto";
import { UpdateZoneDto } from "./dto/update-zone.dto";

@Injectable()
export class ZonesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  list(params: { type?: string; status?: string; search?: string }) {
    return this.prisma.zone.findMany({
      where: {
        type: params.type,
        status: params.status,
        name: params.search ? { contains: params.search, mode: "insensitive" } : undefined,
      },
      orderBy: { name: "asc" },
    });
  }

  async getOne(id: string) {
    const zone = await this.prisma.zone.findUnique({
      where: { id },
      include: { facilities: true, childZones: true },
    });
    if (!zone) throw new NotFoundException("Zone not found");
    return zone;
  }

  async create(dto: CreateZoneDto, userId: string) {
    const zone = await this.prisma.zone.create({ data: dto });
    await this.audit.record({ entityType: "Zone", entityId: zone.id, action: "CREATE", userId, after: zone });
    return zone;
  }

  async update(id: string, dto: UpdateZoneDto, userId: string) {
    const before = await this.getOne(id);
    const zone = await this.prisma.zone.update({ where: { id }, data: dto });
    await this.audit.record({ entityType: "Zone", entityId: id, action: "UPDATE", userId, before, after: zone });
    return zone;
  }

  async setStatus(id: string, status: string, userId: string) {
    const before = await this.getOne(id);
    const zone = await this.prisma.zone.update({ where: { id }, data: { status } });
    await this.audit.record({
      entityType: "Zone",
      entityId: id,
      action: `STATUS_CHANGE:${status}`,
      userId,
      before,
      after: zone,
    });
    return zone;
  }

  auditTrail(id: string) {
    return this.audit.listForEntity("Zone", id);
  }
}
