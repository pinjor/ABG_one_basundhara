import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { FLEET_VEHICLE_STATUS_TRANSITIONS, FleetVehicleStatus, TRIP_STATUS_TRANSITIONS, TripStatus } from "@bsc/shared";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { CreateFleetVehicleDto } from "./dto/create-fleet-vehicle.dto";
import { CreateTripDto } from "./dto/create-trip.dto";

@Injectable()
export class FleetService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  list(params: { type?: string; status?: string }) {
    return this.prisma.fleetVehicle.findMany({
      where: { type: params.type, status: params.status },
      orderBy: { type: "asc" },
    });
  }

  async getOne(id: string) {
    const vehicle = await this.prisma.fleetVehicle.findUnique({
      where: { id },
      include: { trips: { orderBy: { requestedAt: "desc" }, take: 10 } },
    });
    if (!vehicle) throw new NotFoundException("Fleet vehicle not found");
    return vehicle;
  }

  async create(dto: CreateFleetVehicleDto, userId: string) {
    const vehicle = await this.prisma.fleetVehicle.create({ data: dto });
    await this.audit.record({ entityType: "FleetVehicle", entityId: vehicle.id, action: "CREATE", userId, after: vehicle });
    return vehicle;
  }

  async setStatus(id: string, status: string, userId: string) {
    const before = await this.getOne(id);
    const allowed = FLEET_VEHICLE_STATUS_TRANSITIONS[before.status] ?? [];
    if (!allowed.includes(status)) {
      throw new BadRequestException(`Cannot move a ${before.status} vehicle to ${status}`);
    }
    const vehicle = await this.prisma.fleetVehicle.update({ where: { id }, data: { status } });
    await this.audit.record({
      entityType: "FleetVehicle",
      entityId: id,
      action: `STATUS_CHANGE:${status}`,
      userId,
      before,
      after: vehicle,
    });
    return vehicle;
  }

  auditTrail(id: string) {
    return this.audit.listForEntity("FleetVehicle", id);
  }

  // --- Trips ---

  listTrips(params: { vehicleId?: string; status?: string }) {
    return this.prisma.trip.findMany({
      where: { vehicleId: params.vehicleId, status: params.status },
      include: { vehicle: { select: { id: true, type: true, driverName: true } } },
      orderBy: { requestedAt: "desc" },
    });
  }

  /** Requests a trip and dispatches the first Available vehicle (Section 4.12) if none is specified. */
  async createTrip(dto: CreateTripDto, userId: string) {
    const vehicle = dto.vehicleId
      ? await this.prisma.fleetVehicle.findUnique({ where: { id: dto.vehicleId } })
      : await this.prisma.fleetVehicle.findFirst({ where: { status: FleetVehicleStatus.AVAILABLE } });

    if (!vehicle) throw new BadRequestException("No available fleet vehicle to dispatch");
    if (vehicle.status !== FleetVehicleStatus.AVAILABLE) {
      throw new BadRequestException(`${vehicle.type} is not Available (currently ${vehicle.status})`);
    }

    const trip = await this.prisma.trip.create({
      data: {
        vehicleId: vehicle.id,
        passengerRef: dto.passengerRef,
        fromLocation: dto.fromLocation,
        toLocation: dto.toLocation,
        eventPackId: dto.eventPackId,
      },
    });
    await this.prisma.fleetVehicle.update({ where: { id: vehicle.id }, data: { status: FleetVehicleStatus.ON_TRIP } });
    await this.audit.record({ entityType: "Trip", entityId: trip.id, action: "CREATE", userId, after: trip });
    return trip;
  }

  async setTripStatus(id: string, status: string, userId: string) {
    const before = await this.prisma.trip.findUnique({ where: { id } });
    if (!before) throw new NotFoundException("Trip not found");
    const allowed = TRIP_STATUS_TRANSITIONS[before.status] ?? [];
    if (!allowed.includes(status)) {
      throw new BadRequestException(`Cannot move a ${before.status} trip to ${status}`);
    }
    const trip = await this.prisma.trip.update({
      where: { id },
      data: { status, completedAt: status === TripStatus.COMPLETED ? new Date() : undefined },
    });
    if (status === TripStatus.COMPLETED) {
      await this.prisma.fleetVehicle.update({
        where: { id: before.vehicleId },
        data: { status: FleetVehicleStatus.AVAILABLE },
      });
    }
    await this.audit.record({
      entityType: "Trip",
      entityId: id,
      action: `STATUS_CHANGE:${status}`,
      userId,
      before,
      after: trip,
    });
    return trip;
  }
}
