import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { Capability, RoleCode } from "@abg-dispatch/shared";

export interface UserActor {
  kind: "user";
  userId: string;
  sessionId: string;
  displayName: string;
  email: string | null;
  employeeId: string | null;
  employeeCode: string | null;
  branchId: string | null;
  departmentId: string | null;
  roles: RoleCode[];
  capabilities: Set<Capability>;
  /** Branches this user operates for as dispatch officer / branch admin. */
  scopedBranchIds: string[];
  mfa: boolean;
  ip?: string;
  userAgent?: string;
}

/** A guest carrier: may only act on the parcels currently assigned to them. */
export interface GuestActor {
  kind: "guest";
  guestCarrierId: string;
  sessionId: string;
  displayName: string;
  phone: string;
  ip?: string;
  userAgent?: string;
}

export type Actor = UserActor | GuestActor;

export function actorKey(actor: Actor): string {
  return actor.kind === "user" ? `user:${actor.userId}` : `guest:${actor.guestCarrierId}`;
}

export function isUser(actor: Actor): actor is UserActor {
  return actor.kind === "user";
}

export const CurrentActor = createParamDecorator((_data: unknown, ctx: ExecutionContext): Actor => {
  return ctx.switchToHttp().getRequest().user;
});
