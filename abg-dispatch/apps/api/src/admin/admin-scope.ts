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
