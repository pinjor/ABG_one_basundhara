import { Injectable } from "@nestjs/common";
import { capabilitiesFor, RoleCode } from "@abg-dispatch/shared";
import { PrismaService } from "../common/prisma.service";
import type { GuestActor, UserActor } from "../common/actor";

export interface TokenPayload {
  sub: string;
  sid: string;
  typ: "user" | "guest";
  mfa?: boolean;
}

const BRANCH_SCOPED_ROLES: string[] = [RoleCode.DISPATCH_OFFICER, RoleCode.BRANCH_ADMIN];

/** Turns a verified token into the actor every service works with. Runs on every request. */
@Injectable()
export class ActorLoaderService {
  constructor(private readonly prisma: PrismaService) {}

  async loadUser(payload: TokenPayload): Promise<UserActor | null> {
    const session = await this.prisma.userSession.findUnique({ where: { id: payload.sid } });
    if (!session || session.userId !== payload.sub || session.revokedAt || session.expiresAt < new Date()) return null;
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { roles: true, employee: true },
    });
    if (!user || !user.active) return null;
    if (user.employee && (user.employee.status === "TERMINATED" || user.employee.status === "INACTIVE")) return null;
    return this.toActor(user, session.id, !!payload.mfa);
  }

  toActor(
    user: {
      id: string;
      displayName: string;
      email: string | null;
      roles: { role: string; branchId: string | null }[];
      employee: { id: string; employeeCode: string; branchId: string; departmentId: string | null } | null;
    },
    sessionId: string,
    mfa: boolean,
  ): UserActor {
    const roles = [...new Set(user.roles.map((r) => r.role as RoleCode))];
    const scoped = new Set<string>();
    for (const r of user.roles) {
      if (!BRANCH_SCOPED_ROLES.includes(r.role)) continue;
      const branch = r.branchId ?? user.employee?.branchId;
      if (branch) scoped.add(branch);
    }
    return {
      kind: "user",
      userId: user.id,
      sessionId,
      displayName: user.displayName,
      email: user.email,
      employeeId: user.employee?.id ?? null,
      employeeCode: user.employee?.employeeCode ?? null,
      branchId: user.employee?.branchId ?? null,
      departmentId: user.employee?.departmentId ?? null,
      roles,
      capabilities: capabilitiesFor(roles),
      scopedBranchIds: [...scoped],
      mfa,
    };
  }

  async loadGuest(payload: TokenPayload): Promise<GuestActor | null> {
    const session = await this.prisma.guestSession.findUnique({ where: { id: payload.sid }, include: { guestCarrier: true } });
    if (!session || session.guestCarrierId !== payload.sub || session.revokedAt || session.expiresAt < new Date()) return null;
    return {
      kind: "guest",
      guestCarrierId: session.guestCarrierId,
      sessionId: session.id,
      displayName: session.guestCarrier.fullName,
      phone: session.guestCarrier.phone,
    };
  }
}
