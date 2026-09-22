import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { ORDER_STATUS_TRANSITIONS, OutletStatus } from "@bsc/shared";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { CreateOutletDto } from "./dto/create-outlet.dto";
import { CreateOrderDto } from "./dto/create-order.dto";

@Injectable()
export class OutletsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  list(params: { zoneId?: string; type?: string; status?: string }) {
    return this.prisma.outlet.findMany({
      where: { zoneId: params.zoneId, type: params.type, status: params.status },
      include: { zone: { select: { id: true, name: true, type: true } } },
      orderBy: { name: "asc" },
    });
  }

  async getOne(id: string) {
    const outlet = await this.prisma.outlet.findUnique({
      where: { id },
      include: {
        zone: { select: { id: true, name: true, type: true } },
        orders: { orderBy: { placedAt: "desc" }, take: 20 },
      },
    });
    if (!outlet) throw new NotFoundException("Outlet not found");
    return outlet;
  }

  async create(dto: CreateOutletDto, userId: string) {
    const outlet = await this.prisma.outlet.create({ data: dto });
    await this.audit.record({ entityType: "Outlet", entityId: outlet.id, action: "CREATE", userId, after: outlet });
    return outlet;
  }

  async toggleOpenClosed(id: string, userId: string) {
    const before = await this.getOne(id);
    const nextStatus = before.status === OutletStatus.OPEN ? OutletStatus.CLOSED : OutletStatus.OPEN;
    const outlet = await this.prisma.outlet.update({ where: { id }, data: { status: nextStatus } });
    await this.audit.record({
      entityType: "Outlet",
      entityId: id,
      action: `STATUS_CHANGE:${nextStatus}`,
      userId,
      before,
      after: outlet,
    });
    return outlet;
  }

  auditTrail(id: string) {
    return this.audit.listForEntity("Outlet", id);
  }

  // --- Orders ---

  listOrders(params: { outletId?: string; status?: string }) {
    return this.prisma.order.findMany({
      where: { outletId: params.outletId, status: params.status },
      include: { outlet: { select: { id: true, name: true, type: true } } },
      orderBy: { placedAt: "desc" },
    });
  }

  async createOrder(dto: CreateOrderDto, userId: string) {
    const outlet = await this.prisma.outlet.findUnique({ where: { id: dto.outletId } });
    if (!outlet) throw new NotFoundException("Outlet not found");
    if (outlet.status === OutletStatus.CLOSED) {
      throw new BadRequestException("This outlet is closed and cannot take new orders");
    }
    const order = await this.prisma.order.create({
      data: { outletId: dto.outletId, items: dto.items as any, amount: dto.amount },
    });
    await this.audit.record({ entityType: "Order", entityId: order.id, action: "CREATE", userId, after: order });
    return order;
  }

  async setOrderStatus(id: string, status: string, userId: string) {
    const before = await this.prisma.order.findUnique({ where: { id } });
    if (!before) throw new NotFoundException("Order not found");
    const allowed = ORDER_STATUS_TRANSITIONS[before.status] ?? [];
    if (!allowed.includes(status)) {
      throw new BadRequestException(`Cannot move a ${before.status} order to ${status}`);
    }
    const order = await this.prisma.order.update({ where: { id }, data: { status } });
    await this.audit.record({
      entityType: "Order",
      entityId: id,
      action: `STATUS_CHANGE:${status}`,
      userId,
      before,
      after: order,
    });
    return order;
  }
}
