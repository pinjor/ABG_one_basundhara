import { Prisma } from "@prisma/client";
import { RoleCode } from "@abg-dispatch/shared";
import type { Actor, UserActor } from "../common/actor";
import { forbidden } from "../common/errors";

/** Branches an admin user operates over; null means organisation-wide. */
export function branchScope(actor: Actor): string[] | null {
  const user = asUser(actor);
  if (user.roles.some((r) => r === RoleCode.SUPER_ADMIN || r === RoleCode.HEAD_OFFICE_ADMIN || r === RoleCode.AUDITOR)) return null;
  return user.scopedBranchIds;
}

/**
 * Offices whose records a module's staff may see; null means every office.
 * Super admins, head office admins and auditors always see everything; a
 * module adds the roles that work group-wide for it (e.g. HR & Finance for
 * tours, the fleet manager for pool cars). Everyone else is limited to the
 * offices their branch-scoped roles cover (branch admin, dispatch, security).
 */
export function moduleScope(actor: Actor, orgWideRoles: readonly RoleCode[] = []): string[] | null {
  const user = asUser(actor);
  const wide: RoleCode[] = [RoleCode.SUPER_ADMIN, RoleCode.HEAD_OFFICE_ADMIN, RoleCode.AUDITOR, ...orgWideRoles];
  if (user.roles.some((r) => wide.includes(r))) return null;
  return user.scopedBranchIds;
}

export function asUser(actor: Actor): UserActor {
  if (actor.kind !== "user") throw forbidden("Administrator access only.", "GUEST_RESTRICTED");
  return actor;
}

/** SQL fragment restricting parcels (aliased `p`) to the actor's branches. */
export function scopeSql(scope: string[] | null, branchId?: string): Prisma.Sql {
  const parts: Prisma.Sql[] = [];
  if (scope) {
    if (!scope.length) return Prisma.sql`AND FALSE`;
    parts.push(Prisma.sql`AND (p."originBranchId" IN (${Prisma.join(scope)}) OR p."destinationBranchId" IN (${Prisma.join(scope)}))`);
  }
  if (branchId) parts.push(Prisma.sql`AND (p."originBranchId" = ${branchId} OR p."destinationBranchId" = ${branchId})`);
  return parts.length ? Prisma.join(parts, " ") : Prisma.empty;
}

export function scopeWhere(scope: string[] | null): Prisma.ParcelWhereInput {
  if (!scope) return {};
  return { OR: [{ originBranchId: { in: scope } }, { destinationBranchId: { in: scope } }] };
}

/**
 * Columns are UTC `timestamp` (no zone); Prisma binds JS Dates as `timestamptz`.
 * Converting the parameter explicitly keeps comparisons correct whatever the
 * database session's TimeZone setting is.
 */
export function utc(date: Date): Prisma.Sql {
  return Prisma.sql`(${date}::timestamptz AT TIME ZONE 'UTC')`;
}
