import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { VISITOR_STATUS_TRANSITIONS, VisitorStatus } from "@bsc/shared";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { CreateVisitorDto } from "./dto/create-visitor.dto";

@Injectable()
export class VisitorsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  list(params: { category?: string; status?: string; search?: string }) {
    return this.prisma.visitor.findMany({
      where: {
        category: params.category,
        status: params.status,
        name: params.search ? { contains: params.search, mode: "insensitive" } : undefined,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async getOne(id: string) {
    const visitor = await this.prisma.visitor.findUnique({ where: { id } });
    if (!visitor) throw new NotFoundException("Visitor not found");
    return visitor;
  }

  async create(dto: CreateVisitorDto, userId: string) {
    const visitor = await this.prisma.visitor.create({ data: dto });
    await this.audit.record({ entityType: "Visitor", entityId: visitor.id, action: "CREATE", userId, after: visitor });
    return visitor;
  }

  private async transition(id: string, status: string, userId: string, extraData: Record<string, unknown> = {}) {
    const before = await this.getOne(id);
    const allowed = VISITOR_STATUS_TRANSITIONS[before.status] ?? [];
    if (!allowed.includes(status)) {
      throw new BadRequestException(`Cannot move a ${before.status} visitor to ${status}`);
    }
    const visitor = await this.prisma.visitor.update({ where: { id }, data: { status, ...extraData } });
    await this.audit.record({
      entityType: "Visitor",
      entityId: id,
      action: `STATUS_CHANGE:${status}`,
      userId,
      before,
      after: visitor,
    });
    return visitor;
  }

  checkIn(id: string, userId: string) {
    return this.transition(id, VisitorStatus.CHECKED_IN, userId, { checkInTime: new Date() });
  }

  async checkOut(id: string, userId: string) {
    const visitor = await this.transition(id, VisitorStatus.CHECKED_OUT, userId, { checkOutTime: new Date() });
    await this.prisma.credential.updateMany({
      where: { visitorId: id },
      data: { status: "Expired" },
    });
    return visitor;
  }

  auditTrail(id: string) {
    return this.audit.listForEntity("Visitor", id);
  }
}
