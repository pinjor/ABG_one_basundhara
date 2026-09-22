import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { BOOKING_STATUS_TRANSITIONS, BookingStatus } from "@bsc/shared";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { CreateBookingDto } from "./dto/create-booking.dto";

/** Whole-day UTC range for a "YYYY-MM-DD" string — dates are compared by day, never by exact instant. */
function dayRange(dateStr: string): { gte: Date; lt: Date } {
  const gte = new Date(dateStr);
  const lt = new Date(gte);
  lt.setUTCDate(lt.getUTCDate() + 1);
  return { gte, lt };
}

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  list(params: { facilityId?: string; status?: string; date?: string; search?: string }) {
    return this.prisma.booking.findMany({
      where: {
        facilityId: params.facilityId,
        status: params.status,
        date: params.date ? dayRange(params.date) : undefined,
        customerName: params.search ? { contains: params.search, mode: "insensitive" } : undefined,
      },
      include: { facility: { select: { id: true, name: true, type: true } } },
      orderBy: { date: "desc" },
    });
  }

  async getOne(id: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: { facility: { select: { id: true, name: true, type: true } } },
    });
    if (!booking) throw new NotFoundException("Booking not found");
    return booking;
  }

  /** Conflict detection (Section 4.4): reject overlapping slots on the same facility/day. */
  private async assertNoConflict(facilityId: string, date: string, start: string, end: string, excludeId?: string) {
    const overlapping = await this.prisma.booking.findFirst({
      where: {
        id: excludeId ? { not: excludeId } : undefined,
        facilityId,
        date: dayRange(date),
        status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
        timeSlotStart: { lt: end },
        timeSlotEnd: { gt: start },
      },
    });
    if (overlapping) {
      throw new ConflictException("This facility already has a pending or confirmed booking in that time slot");
    }
  }

  async create(dto: CreateBookingDto, userId: string) {
    await this.assertNoConflict(dto.facilityId, dto.date, dto.timeSlotStart, dto.timeSlotEnd);
    const booking = await this.prisma.booking.create({
      data: {
        facilityId: dto.facilityId,
        customerName: dto.customerName,
        memberId: dto.memberId,
        type: dto.type,
        date: new Date(dto.date),
        timeSlotStart: dto.timeSlotStart,
        timeSlotEnd: dto.timeSlotEnd,
        amount: dto.amount,
        createdById: userId,
      },
    });
    await this.audit.record({ entityType: "Booking", entityId: booking.id, action: "CREATE", userId, after: booking });
    return booking;
  }

  async setStatus(id: string, status: string, userId: string) {
    const before = await this.getOne(id);
    const allowed = BOOKING_STATUS_TRANSITIONS[before.status] ?? [];
    if (!allowed.includes(status)) {
      throw new BadRequestException(`Cannot move a ${before.status} booking to ${status}`);
    }
    const booking = await this.prisma.booking.update({ where: { id }, data: { status } });
    await this.audit.record({
      entityType: "Booking",
      entityId: id,
      action: `STATUS_CHANGE:${status}`,
      userId,
      before,
      after: booking,
    });
    return booking;
  }

  async setPaymentStatus(id: string, paymentStatus: string, userId: string) {
    const before = await this.getOne(id);
    const booking = await this.prisma.booking.update({ where: { id }, data: { paymentStatus } });
    await this.audit.record({
      entityType: "Booking",
      entityId: id,
      action: `PAYMENT_STATUS_CHANGE:${paymentStatus}`,
      userId,
      before,
      after: booking,
    });
    return booking;
  }

  auditTrail(id: string) {
    return this.audit.listForEntity("Booking", id);
  }
}
