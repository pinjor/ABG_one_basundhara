import { CanActivate, ExecutionContext, Inject, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import { Capability, PRIVILEGED_ROLES, READ_ONLY_ROLES, ROLE_CAPABILITIES } from "@abg-dispatch/shared";
import { APP_CONFIG, type AppConfig } from "../common/config";
import { forbidden, unauthorized } from "../common/errors";
import { ActorLoaderService, TokenPayload } from "./actor-loader.service";
import { ALLOW_GUEST_KEY, ALLOW_READ_ONLY_KEY, CAPABILITIES_KEY, PUBLIC_KEY } from "./decorators";
import type { Actor } from "../common/actor";

/** Capabilities an ordinary employee has; anything beyond these is "administrative" for MFA purposes. */
const BASELINE = new Set<Capability>([...ROLE_CAPABILITIES.EMPLOYEE, ...ROLE_CAPABILITIES.COURIER_RUNNER]);

/**
 * The one global guard. Authentication is the default; every route is closed
 * unless marked @Public. Order of checks:
 *   token → session still live → guest restriction → read-only roles →
 *   capabilities → admin MFA.
 * Object-level checks (is this parcel yours?) happen in ParcelAccessService.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly loader: ActorLoaderService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY, targets)) return true;

    const req = context.switchToHttp().getRequest();
    const header: string = req.headers.authorization ?? "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : "";
    if (!token) throw unauthorized("Sign in to continue.", "UNAUTHENTICATED");

    let payload: TokenPayload;
    try {
      payload = await this.jwt.verifyAsync<TokenPayload>(token, { secret: this.config.jwtSecret });
    } catch {
      throw unauthorized("Your session has expired. Sign in again.", "TOKEN_EXPIRED");
    }
    const actor: Actor | null = payload.typ === "guest" ? await this.loader.loadGuest(payload) : await this.loader.loadUser(payload);
    if (!actor) throw unauthorized("Your session has ended. Sign in again.", "SESSION_REVOKED");
    actor.ip = req.ip;
    actor.userAgent = req.headers["user-agent"];
    req.user = actor;

    if (actor.kind === "guest") {
      if (!this.reflector.getAllAndOverride<boolean>(ALLOW_GUEST_KEY, targets)) {
        throw forbidden("Guest carriers can only open the parcels assigned to them.", "GUEST_RESTRICTED");
      }
      return true;
    }

    const readOnly = actor.roles.length > 0 && actor.roles.every((r) => READ_ONLY_ROLES.includes(r));
    if (readOnly && req.method !== "GET" && !this.reflector.getAllAndOverride<boolean>(ALLOW_READ_ONLY_KEY, targets)) {
      throw forbidden("Auditors have read-only access.", "READ_ONLY");
    }

    const required = this.reflector.getAllAndOverride<Capability[]>(CAPABILITIES_KEY, targets) ?? [];
    for (const cap of required) {
      if (!actor.capabilities.has(cap)) throw forbidden("Your role does not allow this action.", "MISSING_CAPABILITY");
    }

    const privileged = actor.roles.some((r) => PRIVILEGED_ROLES.includes(r));
    if (this.config.requireAdminMfa && privileged && !actor.mfa && required.some((c) => !BASELINE.has(c))) {
      throw forbidden("Set up two-factor authentication to use administrator features.", "MFA_ENROLLMENT_REQUIRED");
    }
    return true;
  }
}
