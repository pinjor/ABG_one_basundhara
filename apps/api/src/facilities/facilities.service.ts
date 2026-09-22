import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { FACILITY_STATUS_TRANSITIONS } from "@bsc/shared";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { CreateFacilityDto } from "./dto/create-facility.dto";
import { UpdateFacilityDto } from "./dto/update-facility.dto";

@Injectable()
export class FacilitiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  list(params: { zoneId?: string; type?: string; status?: string; search?: string }) {
    return this.prisma.facility.findMany({
      where: {
        zoneId: params.zoneId,
        type: params.type,
        status: params.status,
        name: params.search ? { contains: params.search, mode: "insensitive" } : undefined,
      },
      include: { zone: { select: { id: true, name: true, type: true } } },
      orderBy: { name: "asc" },
    });
  }

  async getOne(id: string) {
    const facility = await this.prisma.facility.findUnique({
      where: { id },
      include: { zone: { select: { id: true, name: true, type: true } }, surfaces: true, bookings: { take: 10, orderBy: { date: "desc" } } },
    });
    if (!facility) throw new NotFoundException("Facility not found");
    return facility;
  }

  async create(dto: CreateFacilityDto, userId: string) {
    const facility = await this.prisma.facility.create({
      data: { ...dto, lastInspectionDate: dto.lastInspectionDate ? new Date(dto.lastInspectionDate) : undefined },
    });
    await this.audit.record({ entityType: "Facility", entityId: facility.id, action: "CREATE", userId, after: facility });
    return facility;
  }

  async update(id: string, dto: UpdateFacilityDto, userId: string) {
    const before = await this.getOne(id);
    const facility = await this.prisma.facility.update({
      where: { id },
      data: { ...dto, lastInspectionDate: dto.lastInspectionDate ? new Date(dto.lastInspectionDate) : undefined },
    });
    await this.audit.record({ entityType: "Facility", entityId: id, action: "UPDATE", userId, before, after: facility });
    return facility;
  }

  async setStatus(id: string, status: string, userId: string) {
    const before = await this.getOne(id);
    const allowed = FACILITY_STATUS_TRANSITIONS[before.status] ?? [];
    if (!allowed.includes(status)) {
      throw new BadRequestException(`Cannot move a ${before.status} facility to ${status}`);
    }
    const facility = await this.prisma.facility.update({ where: { id }, data: { status } });
    await this.audit.record({
      entityType: "Facility",
      entityId: id,
      action: `STATUS_CHANGE:${status}`,
      userId,
      before,
      after: facility,
    });
    return facility;
  }

  auditTrail(id: string) {
    return this.audit.listForEntity("Facility", id);
  }
}
