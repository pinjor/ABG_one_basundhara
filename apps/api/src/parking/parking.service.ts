import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { CreateParkingZoneDto } from "./dto/create-parking-zone.dto";
import { VehicleEntryDto } from "./dto/vehicle-entry.dto";
import { VehicleExitDto } from "./dto/vehicle-exit.dto";

@Injectable()
export class ParkingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  list(params: { type?: string }) {
    return this.prisma.parkingZone.findMany({
      where: { type: params.type },
      include: { zone: { select: { id: true, name: true, type: true } } },
      orderBy: { name: "asc" },
    });
  }

  async getOne(id: string) {
    const zone = await this.prisma.parkingZone.findUnique({
      where: { id },
      include: {
        zone: { select: { id: true, name: true, type: true } },
        vehicleLogs: { where: { exitTime: null }, orderBy: { entryTime: "desc" }, take: 50 },
      },
    });
    if (!zone) throw new NotFoundException("Parking zone not found");
    return zone;
  }

  async create(dto: CreateParkingZoneDto, userId: string) {
    const zone = await this.prisma.parkingZone.create({ data: dto });
    await this.audit.record({ entityType: "ParkingZone", entityId: zone.id, action: "CREATE", userId, after: zone });
    return zone;
  }

  /** Vehicle entry (Section 4.11) — rejects entry once the zone is at capacity. */
  async vehicleEntry(id: string, dto: VehicleEntryDto, userId: string) {
    const zone = await this.getOne(id);
    if (zone.occupied >= zone.capacity) {
      throw new BadRequestException(`${zone.name} is at full capacity`);
    }
    const entry = await this.prisma.vehicleLogEntry.create({
      data: { parkingZoneId: id, plateNumber: dto.plateNumber, vehicleRef: dto.vehicleRef, type: dto.type },
    });
    const updatedZone = await this.prisma.parkingZone.update({ where: { id }, data: { occupied: { increment: 1 } } });
    await this.audit.record({
      entityType: "VehicleLogEntry",
      entityId: entry.id,
      action: "ENTRY",
      userId,
      after: { entry, zoneOccupied: updatedZone.occupied },
    });
    return entry;
  }

  /** Vehicle exit — closes the matching open log entry for that plate in this zone. */
  async vehicleExit(id: string, dto: VehicleExitDto, userId: string) {
    const openEntry = await this.prisma.vehicleLogEntry.findFirst({
      where: { parkingZoneId: id, plateNumber: dto.plateNumber, exitTime: null },
      orderBy: { entryTime: "desc" },
    });
    if (!openEntry) {
      throw new NotFoundException(`No open entry found for plate ${dto.plateNumber} in this zone`);
    }
    const entry = await this.prisma.vehicleLogEntry.update({ where: { id: openEntry.id }, data: { exitTime: new Date() } });
    const updatedZone = await this.prisma.parkingZone.update({
      where: { id },
      data: { occupied: { decrement: 1 } },
    });
    await this.audit.record({
      entityType: "VehicleLogEntry",
      entityId: entry.id,
      action: "EXIT",
      userId,
      after: { entry, zoneOccupied: updatedZone.occupied },
    });
    return entry;
  }

  auditTrail(id: string) {
    return this.audit.listForEntity("ParkingZone", id);
  }
}
