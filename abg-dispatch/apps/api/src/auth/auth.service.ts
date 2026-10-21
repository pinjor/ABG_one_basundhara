import { Inject, Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { OtpPurpose, PRIVILEGED_ROLES, RoleCode, ADMIN_PORTAL_ROLES } from "@abg-dispatch/shared";
import { APP_CONFIG, type AppConfig } from "../common/config";
import { PrismaService } from "../common/prisma.service";
import { AuditService } from "../audit/audit.service";
import { badRequest, notFound, unauthorized } from "../common/errors";
import { decrypt, encrypt, randomToken, sha256 } from "../common/crypto";
import type { GuestActor, UserActor } from "../common/actor";
import { ActorLoaderService } from "./actor-loader.service";
import { OtpService } from "./otp.service";
import { generateTotpSecret, otpauthUri, verifyTotp } from "./totp";
import { SmsService, normalizePhone } from "../notifications/sms.service";
import type { LoginDto } from "./auth.dto";

interface ClientInfo {
  ip?: string;
  userAgent?: string;
}

const ACTIVE_ASSIGNMENT = ["ASSIGNED", "ACCEPTED", "IN_CUSTODY"];

@Injectable()
export class AuthService {
  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly loader: ActorLoaderService,
    private readonly audit: AuditService,
    private readonly otp: OtpService,
    private readonly sms: SmsService,
  ) {}

  async login(dto: LoginDto, client: ClientInfo) {
    const identifier = dto.identifier.trim();
    const user = identifier.includes("@")
      ? await this.prisma.user.findUnique({ where: { email: identifier.toLowerCase() }, include: { roles: true, employee: true } })
      : await this.prisma.user.findFirst({
          where: { employee: { employeeCode: identifier.toUpperCase() } },
          include: { roles: true, employee: true },
        });

    const invalid = () => unauthorized("The email / employee ID or password is incorrect.", "INVALID_CREDENTIALS");
    if (!user) {
      await bcrypt.compare(dto.password, "$2a$10$0000000000000000000000000000000000000000000000000000.");
      await this.audit.security("auth.login_failed", `Unknown account "${identifier.slice(0, 60)}"`, client);
      throw invalid();
    }
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw unauthorized("This account is temporarily locked after repeated failed sign-ins. Try again in 15 minutes.", "ACCOUNT_LOCKED");
    }
    const inactive = !user.active || (user.employee && ["TERMINATED", "INACTIVE"].includes(user.employee.status));
    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid || inactive) {
      if (!valid) {
        const failures = user.failedLoginCount + 1;
        const lock = failures >= this.config.loginMaxFailures;
        await this.prisma.user.update({
          where: { id: user.id },
          data: {
            failedLoginCount: lock ? 0 : failures,
            lockedUntil: lock ? new Date(Date.now() + this.config.loginLockMinutes * 60_000) : undefined,
          },
        });
        await this.audit.security(lock ? "auth.account_locked" : "auth.login_failed", "Wrong password", { ...client, userId: user.id });
      } else {
        await this.audit.security("auth.login_blocked", "Inactive account attempted sign-in", { ...client, userId: user.id });
      }
      throw invalid();
    }

    if (user.mfaEnabledAt) {
      if (!dto.totp) throw unauthorized("Enter the 6-digit code from your authenticator app.", "MFA_REQUIRED", { mfaRequired: true });
      if (!verifyTotp(decrypt(this.config.encryptionKey, user.mfaSecret!), dto.totp)) {
        await this.audit.security("auth.mfa_failed", "Wrong authenticator code", { ...client, userId: user.id });
        throw unauthorized("That authenticator code is not correct.", "MFA_INVALID", { mfaRequired: true });
      }
    }

    await this.prisma.user.update({ where: { id: user.id }, data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() } });
    const tokens = await this.startSession(user.id, !!user.mfaEnabledAt, { ...client, deviceName: dto.deviceName, platform: dto.platform });
    const actor = this.loader.toActor(user, tokens.sessionId, !!user.mfaEnabledAt);
    actor.ip = client.ip;
    actor.userAgent = client.userAgent;
    const privileged = actor.roles.some((r) => PRIVILEGED_ROLES.includes(r));
    if (privileged) await this.audit.record({ actor, action: "auth.privileged_login", objectType: "user", objectId: user.id, summary: "Privileged sign-in" });
    return {
      ...tokens,
      mfaEnrollmentRequired: this.config.requireAdminMfa && privileged && !user.mfaEnabledAt,
      user: await this.profile(actor),
    };
  }

  private async startSession(userId: string, mfa: boolean, info: ClientInfo & { deviceName?: string; platform?: string }) {
    const refreshToken = randomToken(32);
    const session = await this.prisma.userSession.create({
      data: {
        userId,
        refreshTokenHash: sha256(refreshToken),
        deviceName: info.deviceName ?? null,
        platform: info.platform ?? null,
        ip: info.ip ?? null,
        userAgent: info.userAgent?.slice(0, 300) ?? null,
        expiresAt: new Date(Date.now() + this.config.refreshTokenTtlDays * 86_400_000),
      },
    });
    const accessToken = await this.jwt.signAsync(
      { sub: userId, sid: session.id, typ: "user", mfa },
      { secret: this.config.jwtSecret, expiresIn: this.config.accessTokenTtlSeconds },
    );
    return { accessToken, refreshToken, expiresIn: this.config.accessTokenTtlSeconds, sessionId: session.id };
  }

  /** Rotating refresh: every use issues a new refresh token and invalidates the old one. */
  async refresh(refreshToken: string) {
    const session = await this.prisma.userSession.findUnique({
      where: { refreshTokenHash: sha256(refreshToken) },
      include: { user: { include: { employee: true } } },
    });
    if (!session || session.revokedAt || session.expiresAt < new Date() || !session.user.active) {
      throw unauthorized("Your session has ended. Sign in again.", "SESSION_REVOKED");
    }
    if (session.user.employee && ["TERMINATED", "INACTIVE"].includes(session.user.employee.status)) {
      throw unauthorized("Your session has ended. Sign in again.", "SESSION_REVOKED");
    }
    const next = randomToken(32);
    await this.prisma.userSession.update({
      where: { id: session.id },
      data: { refreshTokenHash: sha256(next), lastUsedAt: new Date() },
    });
    const accessToken = await this.jwt.signAsync(
      { sub: session.userId, sid: session.id, typ: "user", mfa: !!session.user.mfaEnabledAt },
      { secret: this.config.jwtSecret, expiresIn: this.config.accessTokenTtlSeconds },
    );
    return { accessToken, refreshToken: next, expiresIn: this.config.accessTokenTtlSeconds };
  }

  async logout(actor: UserActor | GuestActor) {
    if (actor.kind === "guest") {
      await this.prisma.guestSession.update({ where: { id: actor.sessionId }, data: { revokedAt: new Date() } });
    } else {
      await this.prisma.userSession.update({ where: { id: actor.sessionId }, data: { revokedAt: new Date(), revokedReason: "logout" } });
      await this.prisma.deviceToken.deleteMany({ where: { userId: actor.userId } });
    }
    return { ok: true };
  }

  async profile(actor: UserActor) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: actor.userId },
      include: {
        employee: {
          include: {
            department: true,
            branch: true,
            defaultLocation: true,
            manager: { select: { id: true, fullName: true, designation: true, employeeCode: true, user: { select: { id: true, active: true } } } },
          },
        },
        roles: { include: { branch: { select: { id: true, name: true, code: true } } } },
      },
    });
    const e = user.employee;
    const m = e?.manager;
    return {
      id: user.id,
      displayName: user.displayName,
      email: user.email,
      locale: user.locale,
      mfaEnabled: !!user.mfaEnabledAt,
      roles: actor.roles,
      roleScopes: user.roles.map((r) => ({ role: r.role, branch: r.branch })),
      capabilities: [...actor.capabilities],
      scopedBranchIds: actor.scopedBranchIds,
      canUseAdminPortal: actor.roles.some((r) => ADMIN_PORTAL_ROLES.includes(r as RoleCode)),
      employee: e
        ? {
            id: e.id,
            employeeCode: e.employeeCode,
            fullName: e.fullName,
            designation: e.designation,
            phone: e.phone,
            email: e.email,
            photoUrl: e.photoUrl,
            department: e.department ? { id: e.department.id, name: e.department.name } : null,
            branch: { id: e.branch.id, name: e.branch.name, code: e.branch.code },
            defaultLocation: e.defaultLocation ? { id: e.defaultLocation.id, name: e.defaultLocation.name, path: e.defaultLocation.path } : null,
            // Head of department / line manager: the default approver for tours and pool cars.
            manager: m
              ? { employeeId: m.id, userId: m.user?.active ? m.user.id : null, fullName: m.fullName, designation: m.designation, employeeCode: m.employeeCode }
              : null,
          }
        : null,
    };
  }

  async updateProfile(actor: UserActor, locale?: string) {
    if (locale) await this.prisma.user.update({ where: { id: actor.userId }, data: { locale } });
    return this.profile(actor);
  }

  async changePassword(actor: UserActor, current: string, next: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: actor.userId } });
    if (!(await bcrypt.compare(current, user.passwordHash))) throw badRequest("Your current password is not correct.", "INVALID_PASSWORD");
    await this.prisma.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(next, 10) } });
    // Every other device must sign in again.
    await this.prisma.userSession.updateMany({
      where: { userId: user.id, id: { not: actor.sessionId }, revokedAt: null },
      data: { revokedAt: new Date(), revokedReason: "password_changed" },
    });
    await this.audit.record({ actor, action: "auth.password_changed", objectType: "user", objectId: user.id, summary: "Password changed; other sessions revoked" });
    return { ok: true };
  }

  async listSessions(actor: UserActor) {
    const sessions = await this.prisma.userSession.findMany({
      where: { userId: actor.userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { lastUsedAt: "desc" },
    });
    return sessions.map((s) => ({
      id: s.id,
      deviceName: s.deviceName,
      platform: s.platform,
      ip: s.ip,
      createdAt: s.createdAt,
      lastUsedAt: s.lastUsedAt,
      current: s.id === actor.sessionId,
    }));
  }

  async revokeSession(actor: UserActor, sessionId: string) {
    const session = await this.prisma.userSession.findUnique({ where: { id: sessionId } });
    if (!session || session.userId !== actor.userId) throw notFound("Session not found.");
    await this.prisma.userSession.update({ where: { id: sessionId }, data: { revokedAt: new Date(), revokedReason: "revoked_by_user" } });
    await this.audit.record({ actor, action: "auth.session_revoked", objectType: "session", objectId: sessionId, summary: "Session revoked by user" });
    return { ok: true };
  }

  // ── MFA ──

  async mfaSetup(actor: UserActor) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: actor.userId } });
    if (user.mfaEnabledAt) throw badRequest("Two-factor authentication is already on.", "MFA_ALREADY_ENABLED");
    const secret = generateTotpSecret();
    await this.prisma.user.update({ where: { id: user.id }, data: { mfaSecret: encrypt(this.config.encryptionKey, secret) } });
    return { secret, otpauthUri: otpauthUri(secret, user.email ?? user.displayName) };
  }

  async mfaEnable(actor: UserActor, code: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: actor.userId } });
    if (!user.mfaSecret) throw badRequest("Start two-factor setup first.", "MFA_NOT_STARTED");
    if (!verifyTotp(decrypt(this.config.encryptionKey, user.mfaSecret), code)) {
      throw badRequest("That code is not correct. Check the time on your phone and try again.", "MFA_INVALID");
    }
    await this.prisma.user.update({ where: { id: user.id }, data: { mfaEnabledAt: new Date() } });
    await this.audit.record({ actor, action: "auth.mfa_enabled", objectType: "user", objectId: user.id, summary: "Two-factor authentication enabled" });
    // Re-issue tokens so the current session carries the MFA claim.
    await this.prisma.userSession.update({ where: { id: actor.sessionId }, data: { revokedAt: new Date(), revokedReason: "mfa_enabled" } });
    return this.startSession(user.id, true, { ip: actor.ip, userAgent: actor.userAgent });
  }

  // ── Guest carriers ──

  async guestRequestOtp(rawPhone: string, client: ClientInfo) {
    const phone = normalizePhone(rawPhone);
    const guest = await this.prisma.guestCarrier.findFirst({
      where: { phone, assignments: { some: { status: { in: ACTIVE_ASSIGNMENT } } } },
      orderBy: { createdAt: "desc" },
    });
    // Same answer whether or not the number exists, so the endpoint can't be used to probe numbers.
    const response: { sent: true; message: string; devOtp?: string } = {
      sent: true,
      message: "If this number has an active ABG ONE parcel assignment, a 6-digit code has been sent by SMS.",
    };
    if (!guest) {
      await this.audit.security("auth.guest_otp_unknown", "Guest code requested for a number with no assignment", client);
      return response;
    }
    const { challenge, code } = await this.otp.issue({ purpose: OtpPurpose.GUEST_LOGIN, phone, guestCarrierId: guest.id, ip: client.ip });
    await this.sms.send(phone, `ABG ONE sign-in code: ${code}. It expires in 5 minutes. Do not share it.`);
    if (this.config.exposeDevOtp) response.devOtp = code;
    void challenge;
    return response;
  }

  async guestVerifyOtp(rawPhone: string, code: string, client: ClientInfo) {
    const phone = normalizePhone(rawPhone);
    const challenge = await this.otp.verify({ purpose: OtpPurpose.GUEST_LOGIN, phone }, code);
    const guest = await this.prisma.guestCarrier.update({
      where: { id: challenge.guestCarrierId! },
      data: { phoneVerifiedAt: new Date() },
    });
    const session = await this.prisma.guestSession.create({
      data: {
        guestCarrierId: guest.id,
        expiresAt: new Date(Date.now() + this.config.guestSessionTtlHours * 3_600_000),
        ip: client.ip ?? null,
      },
    });
    const accessToken = await this.jwt.signAsync(
      { sub: guest.id, sid: session.id, typ: "guest" },
      { secret: this.config.jwtSecret, expiresIn: this.config.guestSessionTtlHours * 3600 },
    );
    await this.audit.record({
      actor: { kind: "guest", guestCarrierId: guest.id, sessionId: session.id, displayName: guest.fullName, phone, ...client },
      action: "auth.guest_login",
      objectType: "guest_carrier",
      objectId: guest.id,
      summary: "Guest carrier signed in with phone code",
    });
    return {
      accessToken,
      expiresAt: session.expiresAt,
      guest: { id: guest.id, fullName: guest.fullName, phone: guest.phone, company: guest.company, vehicleNumber: guest.vehicleNumber },
    };
  }

  // ── Devices ──

  async registerDevice(actor: UserActor, token: string, platform: string, appVersion?: string) {
    await this.prisma.deviceToken.upsert({
      where: { token },
      create: { userId: actor.userId, token, platform, appVersion: appVersion ?? null },
      update: { userId: actor.userId, platform, appVersion: appVersion ?? null, lastSeenAt: new Date() },
    });
    return { ok: true };
  }

  async unregisterDevice(actor: UserActor, token: string) {
    await this.prisma.deviceToken.deleteMany({ where: { token, userId: actor.userId } });
    return { ok: true };
  }
}
