import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { MEMBER_STATUS_TRANSITIONS, MemberStatus } from "@bsc/shared";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { CreateMemberDto } from "./dto/create-member.dto";
import { UpdateMemberDto } from "./dto/update-member.dto";

@Injectable()
export class MembersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  list(params: { tier?: string; status?: string; search?: string }) {
    return this.prisma.member.findMany({
      where: {
        tier: params.tier,
        status: params.status,
        name: params.search ? { contains: params.search, mode: "insensitive" } : undefined,
      },
      orderBy: { name: "asc" },
    });
  }

  async getOne(id: string) {
    const member = await this.prisma.member.findUnique({ where: { id } });
    if (!member) throw new NotFoundException("Member not found");
    return member;
  }

  async create(dto: CreateMemberDto, userId: string) {
    const member = await this.prisma.member.create({
      data: { ...dto, expiryDate: new Date(dto.expiryDate) },
    });
    await this.prisma.credential.create({
      data: { holderRef: member.name, type: "Member", memberId: member.id, validTo: new Date(dto.expiryDate) },
    });
    await this.audit.record({ entityType: "Member", entityId: member.id, action: "CREATE", userId, after: member });
    return member;
  }

  async update(id: string, dto: UpdateMemberDto, userId: string) {
    const before = await this.getOne(id);
    const member = await this.prisma.member.update({
      where: { id },
      data: { ...dto, expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined },
    });
    await this.audit.record({ entityType: "Member", entityId: id, action: "UPDATE", userId, before, after: member });
    return member;
  }

  async setStatus(id: string, status: string, userId: string) {
    const before = await this.getOne(id);
    const allowed = MEMBER_STATUS_TRANSITIONS[before.status] ?? [];
    if (!allowed.includes(status)) {
      throw new BadRequestException(`Cannot move a ${before.status} member to ${status}`);
    }
    const member = await this.prisma.member.update({ where: { id }, data: { status } });
    const credentialStatus = status === MemberStatus.ACTIVE ? "Active" : "Suspended";
    await this.prisma.credential.updateMany({
      where: { memberId: id },
      data: { status: credentialStatus },
    });
    await this.audit.record({
      entityType: "Member",
      entityId: id,
      action: `STATUS_CHANGE:${status}`,
      userId,
      before,
      after: member,
    });
    return member;
  }

  /** Member check-in (Section 4.5) — only Active members may check in. */
  async checkIn(id: string, userId: string) {
    const before = await this.getOne(id);
    if (before.status !== MemberStatus.ACTIVE) {
      throw new BadRequestException(`Cannot check in a ${before.status} member`);
    }
    const member = await this.prisma.member.update({
      where: { id },
      data: { checkInCount: { increment: 1 }, lastCheckIn: new Date() },
    });
    await this.audit.record({ entityType: "Member", entityId: id, action: "CHECK_IN", userId, before, after: member });
    return member;
  }

  /** Renews membership by extending expiry a year (or to a given date) and reactivating if expired. */
  async renew(id: string, userId: string, newExpiryDate?: string) {
    const before = await this.getOne(id);
    const nextExpiry = newExpiryDate
      ? new Date(newExpiryDate)
      : new Date(new Date(before.expiryDate).setFullYear(new Date(before.expiryDate).getFullYear() + 1));
    const member = await this.prisma.member.update({
      where: { id },
      data: { expiryDate: nextExpiry, status: MemberStatus.ACTIVE },
    });
    await this.prisma.credential.updateMany({ where: { memberId: id }, data: { status: "Active" } });
    await this.audit.record({ entityType: "Member", entityId: id, action: "RENEW", userId, before, after: member });
    return member;
  }

  auditTrail(id: string) {
    return this.audit.listForEntity("Member", id);
  }
}
