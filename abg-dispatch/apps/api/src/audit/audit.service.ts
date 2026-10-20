import { Global, Injectable, Module } from "@nestjs/common";
import { ActorType } from "@abg-dispatch/shared";
import { PrismaService, Tx } from "../common/prisma.service";
import type { Actor } from "../common/actor";

export interface AuditEntry {
  actor: Actor | null;
  action: string;
  objectType: string;
  objectId: string;
  summary: string;
  before?: unknown;
  after?: unknown;
}

/** Keys that must never reach the audit trail even inside a before/after snapshot. */
const SECRET_KEYS = /pass(word)?|secret|otp|pin|token|hash|code$/i;

function scrub(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(scrub);
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = SECRET_KEYS.test(k) && k !== "employeeCode" && k !== "trackingNumber" ? "[redacted]" : scrub(v);
    }
    return out;
  }
  return value;
}

/**
 * Administrative and security audit trail (separate from the parcel ledger,
 * which records physical custody). Append-only at the database level.
 */
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(entry: AuditEntry, tx?: Tx) {
    const db = tx ?? this.prisma;
    const actor = entry.actor;
    return db.auditLog.create({
      data: {
        actorType: actor ? (actor.kind === "guest" ? ActorType.GUEST : ActorType.EMPLOYEE) : ActorType.SYSTEM,
        actorUserId: actor?.kind === "user" ? actor.userId : null,
        actorGuestId: actor?.kind === "guest" ? actor.guestCarrierId : null,
        actorName: actor?.displayName ?? "System",
        action: entry.action,
        objectType: entry.objectType,
        objectId: entry.objectId,
        summary: entry.summary,
        before: entry.before === undefined ? undefined : (scrub(entry.before) as object),
        after: entry.after === undefined ? undefined : (scrub(entry.after) as object),
        ip: actor?.ip ?? null,
        userAgent: actor?.userAgent?.slice(0, 300) ?? null,
        sessionId: actor?.sessionId ?? null,
      },
    });
  }

  /** Security events from unauthenticated requests (failed logins, OTP abuse). */
  async security(action: string, summary: string, meta: { ip?: string; userAgent?: string; userId?: string; objectId?: string }) {
    return this.prisma.auditLog.create({
      data: {
        actorType: ActorType.SYSTEM,
        actorUserId: meta.userId ?? null,
        actorName: "Security",
        action,
        objectType: "auth",
        objectId: meta.objectId ?? meta.userId ?? "anonymous",
        summary,
        ip: meta.ip ?? null,
        userAgent: meta.userAgent?.slice(0, 300) ?? null,
      },
    });
  }
}

@Global()
@Module({ providers: [AuditService], exports: [AuditService] })
export class AuditModule {}
