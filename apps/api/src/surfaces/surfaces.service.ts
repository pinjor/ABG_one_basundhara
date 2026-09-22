import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { CLOSURE_STATUS_TRANSITIONS } from "@bsc/shared";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { CreateSurfaceDto } from "./dto/create-surface.dto";
import { UpdateSurfaceDto } from "./dto/update-surface.dto";
import { CreateEquipmentDto } from "./dto/create-equipment.dto";

@Injectable()
export class SurfacesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  list(params: { facilityId?: string; closureStatus?: string }) {
    return this.prisma.surface.findMany({
      where: { facilityId: params.facilityId, closureStatus: params.closureStatus },
      include: { facility: { select: { id: true, name: true, type: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  async getOne(id: string) {
    const surface = await this.prisma.surface.findUnique({
      where: { id },
      include: { facility: { select: { id: true, name: true, type: true } } },
    });
    if (!surface) throw new NotFoundException("Surface not found");
    return surface;
  }

  async create(dto: CreateSurfaceDto, userId: string) {
    const surface = await this.prisma.surface.create({
      data: {
        ...dto,
        lastInspection: dto.lastInspection ? new Date(dto.lastInspection) : undefined,
        nextMaintenance: dto.nextMaintenance ? new Date(dto.nextMaintenance) : undefined,
      },
    });
    await this.audit.record({ entityType: "Surface", entityId: surface.id, action: "CREATE", userId, after: surface });
    return surface;
  }

  async update(id: string, dto: UpdateSurfaceDto, userId: string) {
    const before = await this.getOne(id);
    const surface = await this.prisma.surface.update({
      where: { id },
      data: {
        ...dto,
        lastInspection: dto.lastInspection ? new Date(dto.lastInspection) : undefined,
        nextMaintenance: dto.nextMaintenance ? new Date(dto.nextMaintenance) : undefined,
      },
    });
    await this.audit.record({ entityType: "Surface", entityId: id, action: "UPDATE", userId, before, after: surface });
    return surface;
  }

  async setClosureStatus(id: string, closureStatus: string, userId: string) {
    const before = await this.getOne(id);
    const allowed = CLOSURE_STATUS_TRANSITIONS[before.closureStatus] ?? [];
    if (!allowed.includes(closureStatus)) {
      throw new BadRequestException(`Cannot move a ${before.closureStatus} surface to ${closureStatus}`);
    }
    const surface = await this.prisma.surface.update({ where: { id }, data: { closureStatus } });
    await this.audit.record({
      entityType: "Surface",
      entityId: id,
      action: `CLOSURE_CHANGE:${closureStatus}`,
      userId,
      before,
      after: surface,
    });
    return surface;
  }

  auditTrail(id: string) {
    return this.audit.listForEntity("Surface", id);
  }

  // --- Equipment ---

  listEquipment(params: { category?: string; status?: string }) {
    return this.prisma.equipment.findMany({
      where: { category: params.category, status: params.status },
      orderBy: { name: "asc" },
    });
  }

  async createEquipment(dto: CreateEquipmentDto, userId: string) {
    const equipment = await this.prisma.equipment.create({ data: dto });
    await this.audit.record({ entityType: "Equipment", entityId: equipment.id, action: "CREATE", userId, after: equipment });
    return equipment;
  }

  async setEquipmentStatus(id: string, status: string, userId: string) {
    const before = await this.prisma.equipment.findUnique({ where: { id } });
    if (!before) throw new NotFoundException("Equipment not found");
    const equipment = await this.prisma.equipment.update({ where: { id }, data: { status } });
    await this.audit.record({
      entityType: "Equipment",
      entityId: id,
      action: `STATUS_CHANGE:${status}`,
      userId,
      before,
      after: equipment,
    });
    return equipment;
  }
}
