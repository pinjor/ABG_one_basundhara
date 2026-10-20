import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Observable, from, lastValueFrom } from "rxjs";
import { PrismaService, isUniqueViolation } from "./prisma.service";
import { sha256 } from "./crypto";
import { conflict } from "./errors";
import { actorKey, type Actor } from "./actor";

/**
 * Replays the stored response when a client repeats a POST with the same
 * `Idempotency-Key` (offline sync retries, double taps, flaky networks). The
 * ledger's own unique idempotency key is the second line of defence.
 */
@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();
    const key: string | undefined = req.headers["idempotency-key"];
    const actor: Actor | undefined = req.user;
    if (req.method !== "POST" || !key || !actor) return next.handle();
    if (!/^[A-Za-z0-9_-]{8,100}$/.test(key)) return next.handle();

    return from(
      (async () => {
        const who = actorKey(actor);
        const requestHash = sha256(`${req.method} ${req.path} ${JSON.stringify(req.body ?? {})}`);
        const existing = await this.prisma.idempotencyRecord.findUnique({ where: { actorKey_key: { actorKey: who, key } } });
        if (existing) {
          if (existing.requestHash !== requestHash) {
            throw conflict("IDEMPOTENCY_MISMATCH", "This request key was already used for a different action.");
          }
          if (existing.status === "DONE") {
            res.status(existing.responseStatus ?? 200);
            res.setHeader("Idempotent-Replay", "true");
            return existing.responseBody;
          }
          throw conflict("IDEMPOTENCY_IN_PROGRESS", "This action is already being processed.");
        }
        try {
          await this.prisma.idempotencyRecord.create({
            data: { actorKey: who, key, method: req.method, path: req.path, requestHash, status: "IN_PROGRESS" },
          });
        } catch (err) {
          if (isUniqueViolation(err)) throw conflict("IDEMPOTENCY_IN_PROGRESS", "This action is already being processed.");
          throw err;
        }
        try {
          const body = await lastValueFrom(next.handle(), { defaultValue: null });
          await this.prisma.idempotencyRecord.update({
            where: { actorKey_key: { actorKey: who, key } },
            data: { status: "DONE", responseStatus: res.statusCode ?? 200, responseBody: (body ?? null) as object, completedAt: new Date() },
          });
          return body;
        } catch (err) {
          // Failed actions can be retried with the same key once the cause is fixed.
          await this.prisma.idempotencyRecord.delete({ where: { actorKey_key: { actorKey: who, key } } }).catch(() => undefined);
          throw err;
        }
      })(),
    );
  }
}
