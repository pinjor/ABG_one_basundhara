import { Inject, Injectable } from "@nestjs/common";
import { randomUUID } from "crypto";
import type { OtpChallenge } from "@prisma/client";
import { APP_CONFIG, type AppConfig } from "../common/config";
import { PrismaService, Tx } from "../common/prisma.service";
import { hmacSha256, randomDigits, safeEqual } from "../common/crypto";
import { badRequest, tooMany } from "../common/errors";

/**
 * One-time codes for guest sign-in and parcel receipt. Only a keyed hash is
 * stored; codes expire, allow a limited number of attempts, and are rate
 * limited per phone and parcel.
 */
@Injectable()
export class OtpService {
  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    private readonly prisma: PrismaService,
  ) {}

  private hash(id: string, code: string): string {
    return hmacSha256(this.config.otpPepper, `${id}:${code}`);
  }

  async issue(params: {
    purpose: string;
    phone: string;
    parcelId?: string;
    guestCarrierId?: string;
    employeeId?: string;
    metadata?: Record<string, unknown>;
    ip?: string;
    /** Max codes for this phone+purpose(+parcel) per 10 minutes. */
    maxPerWindow?: number;
  }, tx?: Tx): Promise<{ challenge: OtpChallenge; code: string }> {
    const db = tx ?? this.prisma;
    const since = new Date(Date.now() - 10 * 60 * 1000);
    const recent = await db.otpChallenge.count({
      where: { phone: params.phone, purpose: params.purpose, parcelId: params.parcelId ?? undefined, createdAt: { gte: since } },
    });
    if (recent >= (params.maxPerWindow ?? 3)) {
      throw tooMany("Too many codes were requested for this number. Please wait 10 minutes and try again.", "OTP_RATE_LIMITED");
    }
    // A new code supersedes any earlier unused one for the same purpose.
    await db.otpChallenge.updateMany({
      where: { phone: params.phone, purpose: params.purpose, parcelId: params.parcelId ?? undefined, consumedAt: null },
      data: { consumedAt: new Date() },
    });
    const id = randomUUID();
    const code = randomDigits(6);
    const challenge = await db.otpChallenge.create({
      data: {
        id,
        purpose: params.purpose,
        phone: params.phone,
        codeHash: this.hash(id, code),
        parcelId: params.parcelId ?? null,
        guestCarrierId: params.guestCarrierId ?? null,
        employeeId: params.employeeId ?? null,
        metadata: (params.metadata ?? {}) as object,
        expiresAt: new Date(Date.now() + this.config.otpTtlSeconds * 1000),
        maxAttempts: this.config.otpMaxAttempts,
        requestIp: params.ip ?? null,
      },
    });
    return { challenge, code };
  }

  /** Verifies against the latest live challenge. Throws a specific, user-readable error on failure. */
  async verify(where: { purpose: string; phone?: string; parcelId?: string }, code: string, tx?: Tx): Promise<OtpChallenge> {
    const db = tx ?? this.prisma;
    const challenge = await db.otpChallenge.findFirst({
      where: { purpose: where.purpose, phone: where.phone, parcelId: where.parcelId, consumedAt: null },
      orderBy: { createdAt: "desc" },
    });
    if (!challenge) throw badRequest("No active code was found. Request a new code and try again.", "OTP_NOT_FOUND");
    if (challenge.expiresAt.getTime() < Date.now()) throw badRequest("This code has expired. Request a new code.", "OTP_EXPIRED");
    if (challenge.attempts >= challenge.maxAttempts) {
      throw tooMany("Too many wrong codes. Request a new code.", "OTP_LOCKED");
    }
    const ok = /^\d{6}$/.test(code) && safeEqual(this.hash(challenge.id, code), challenge.codeHash);
    if (!ok) {
      // Outside any surrounding transaction: a failed attempt must count even if the caller rolls back.
      const updated = await this.prisma.otpChallenge.update({ where: { id: challenge.id }, data: { attempts: { increment: 1 } } });
      const left = updated.maxAttempts - updated.attempts;
      throw badRequest(
        left > 0 ? `That code is not correct. ${left} attempt${left === 1 ? "" : "s"} left.` : "Too many wrong codes. Request a new code.",
        left > 0 ? "OTP_INVALID" : "OTP_LOCKED",
      );
    }
    return db.otpChallenge.update({ where: { id: challenge.id }, data: { consumedAt: new Date(), attempts: { increment: 1 } } });
  }
}
