import { Injectable, NotFoundException } from "@nestjs/common";
import { AccessResult, GateStatus, MemberStatus, VisitorStatus } from "@bsc/shared";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { CreateGateDto } from "./dto/create-gate.dto";
import { ScanGateDto } from "./dto/scan-gate.dto";

@Injectable()
export class GatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  list(params: { zoneId?: string; type?: string; status?: string }) {
    return this.prisma.gate.findMany({
      where: { zoneId: params.zoneId, type: params.type, status: params.status },
      include: { zone: { select: { id: true, name: true, type: true } } },
      orderBy: { name: "asc" },
    });
  }

  async getOne(id: string) {
    const gate = await this.prisma.gate.findUnique({
      where: { id },
      include: {
        zone: { select: { id: true, name: true, type: true } },
        accessLogs: { take: 20, orderBy: { timestamp: "desc" } },
      },
    });
    if (!gate) throw new NotFoundException("Gate not found");
    return gate;
  }

  async create(dto: CreateGateDto, userId: string) {
    const gate = await this.prisma.gate.create({ data: dto });
    await this.audit.record({ entityType: "Gate", entityId: gate.id, action: "CREATE", userId, after: gate });
    return gate;
  }

  async toggleStatus(id: string, userId: string) {
    const before = await this.getOne(id);
    const nextStatus = before.status === GateStatus.ONLINE ? GateStatus.OFFLINE : GateStatus.ONLINE;
    const gate = await this.prisma.gate.update({ where: { id }, data: { status: nextStatus } });
    await this.audit.record({
      entityType: "Gate",
      entityId: id,
      action: `STATUS_CHANGE:${nextStatus}`,
      userId,
      before,
      after: gate,
    });
    return gate;
  }

  /**
   * Simulates a gate reader event (Section 4.6). A gate that's Offline denies
   * every credential — this is what "offline-tolerant validation" degrades to
   * before Phase 5 wires up the real cached-credential sync.
   */
  async scan(id: string, dto: ScanGateDto, userId: string) {
    const gate = await this.getOne(id);
    let result = AccessResult.APPROVED;
    let reason: string | undefined;

    if (gate.status !== GateStatus.ONLINE) {
      result = AccessResult.DENIED;
      reason = "Gate offline";
    } else {
      const entitlement = await this.resolveEntitlement(dto.personRef, dto.credentialRef);
      if (!entitlement.allowed) {
        result = AccessResult.DENIED;
        reason = entitlement.reason;
      }
    }

    const entry = await this.prisma.accessLogEntry.create({
      data: {
        gateId: id,
        personRef: dto.personRef,
        credentialRef: dto.credentialRef,
        method: dto.method,
        result,
        reason,
      },
    });

    if (result === AccessResult.APPROVED) {
      await this.prisma.gate.update({ where: { id }, data: { entriesToday: { increment: 1 } } });
    }

    await this.audit.record({
      entityType: "AccessLogEntry",
      entityId: entry.id,
      action: `SCAN:${result}`,
      userId,
      after: entry,
    });

    return entry;
  }

  private async resolveEntitlement(personRef: string, credentialRef?: string) {
    if (credentialRef) {
      const credential = await this.prisma.credential.findFirst({
        where: { OR: [{ code: credentialRef }, { holderRef: credentialRef }] },
      });
      if (credential && credential.status !== "Active") {
        return { allowed: false, reason: `Credential ${credential.status}` };
      }
    }

    const member = await this.prisma.member.findFirst({
      where: { OR: [{ name: { equals: personRef, mode: "insensitive" } }, { email: { equals: personRef, mode: "insensitive" } }] },
    });
    if (member && member.status !== MemberStatus.ACTIVE) {
      return { allowed: false, reason: `Membership ${member.status}` };
    }

    const visitor = await this.prisma.visitor.findFirst({
      where: { OR: [{ name: { equals: personRef, mode: "insensitive" } }, { qrPassCode: personRef }] },
    });
    if (visitor && (visitor.status === VisitorStatus.CHECKED_OUT || visitor.status === "Cancelled")) {
      return { allowed: false, reason: `Visit ${visitor.status}` };
    }

    const namedCredential = await this.prisma.credential.findFirst({
      where: { holderRef: { equals: personRef, mode: "insensitive" } },
      orderBy: { createdAt: "desc" },
    });
    if (namedCredential && namedCredential.status !== "Active") {
      return { allowed: false, reason: `Credential ${namedCredential.status}` };
    }

    return { allowed: true };
  }

  recentAccessLog(take = 30) {
    return this.prisma.accessLogEntry.findMany({
      take,
      include: { gate: { select: { id: true, name: true, type: true } } },
      orderBy: { timestamp: "desc" },
    });
  }

  auditTrail(id: string) {
    return this.audit.listForEntity("Gate", id);
  }
}
