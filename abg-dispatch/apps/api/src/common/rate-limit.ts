import { CanActivate, ExecutionContext, Injectable, SetMetadata } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { tooMany } from "./errors";

export const RATE_LIMIT_KEY = "rateLimit";
/** At most `max` requests per `windowSeconds` per client IP for this route. */
export const RateLimit = (max: number, windowSeconds: number) => SetMetadata(RATE_LIMIT_KEY, { max, windowSeconds });

/**
 * In-process sliding window. Good for a single API instance; behind a load
 * balancer put the same limits on the gateway (see docs/security-checklist.md).
 * Persistent counters (OTP attempts, PIN failures, login lockout) live in the
 * database and do not depend on this.
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly hits = new Map<string, number[]>();

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const rule = this.reflector.get<{ max: number; windowSeconds: number } | undefined>(RATE_LIMIT_KEY, context.getHandler());
    if (!rule || process.env.DISABLE_RATE_LIMIT === "true") return true;
    const req = context.switchToHttp().getRequest();
    const key = `${context.getClass().name}.${context.getHandler().name}:${req.ip}`;
    const now = Date.now();
    const windowStart = now - rule.windowSeconds * 1000;
    const recent = (this.hits.get(key) ?? []).filter((t) => t > windowStart);
    if (recent.length >= rule.max) throw tooMany("Too many attempts. Please wait a minute and try again.");
    recent.push(now);
    this.hits.set(key, recent);
    if (this.hits.size > 50_000) this.hits.clear();
    return true;
  }
}
