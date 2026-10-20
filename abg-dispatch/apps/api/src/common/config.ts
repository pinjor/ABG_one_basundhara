import { createHash } from "crypto";

/**
 * Typed environment. Read once at startup; production refuses to boot with the
 * development defaults that make local work convenient.
 */
function bool(name: string, fallback: boolean): boolean {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  return ["1", "true", "yes", "on"].includes(raw.toLowerCase());
}

function int(name: string, fallback: number): number {
  const raw = process.env[name];
  const value = raw ? Number(raw) : NaN;
  return Number.isFinite(value) ? value : fallback;
}

const DEV_JWT_SECRET = "abg-dispatch-dev-secret-change-me";

export function loadConfig() {
  const production = process.env.NODE_ENV === "production";
  const jwtSecret = process.env.JWT_SECRET || DEV_JWT_SECRET;
  const encryptionKey = process.env.APP_ENCRYPTION_KEY
    ? Buffer.from(process.env.APP_ENCRYPTION_KEY, "base64")
    : createHash("sha256").update(`enc:${jwtSecret}`).digest();
  const config = {
    production,
    port: int("PORT", 18491),
    jwtSecret,
    accessTokenTtlSeconds: int("ACCESS_TOKEN_TTL_SECONDS", 15 * 60),
    refreshTokenTtlDays: int("REFRESH_TOKEN_TTL_DAYS", 30),
    guestSessionTtlHours: int("GUEST_SESSION_TTL_HOURS", 12),
    encryptionKey,
    otpPepper: process.env.OTP_PEPPER || `otp:${jwtSecret}`,
    otpTtlSeconds: int("OTP_TTL_SECONDS", 5 * 60),
    otpMaxAttempts: int("OTP_MAX_ATTEMPTS", 5),
    handoverPinMaxFailures: int("HANDOVER_PIN_MAX_FAILURES", 5),
    loginMaxFailures: int("LOGIN_MAX_FAILURES", 5),
    loginLockMinutes: int("LOGIN_LOCK_MINUTES", 15),
    /** Development only: echo OTP codes in API responses because no SMS gateway is wired up. */
    exposeDevOtp: bool("EXPOSE_DEV_OTP", !production),
    requireAdminMfa: bool("REQUIRE_ADMIN_MFA", production),
    corsOrigins: (process.env.CORS_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean),
    publicQrBaseUrl: process.env.PUBLIC_QR_BASE_URL || "https://dispatch.abg.com.bd",
    storageDir: process.env.STORAGE_DIR || "./storage",
    maxUploadBytes: int("MAX_UPLOAD_BYTES", 10 * 1024 * 1024),
    slaIntervalSeconds: int("SLA_INTERVAL_SECONDS", 60),
    fcmProjectId: process.env.FCM_PROJECT_ID || "",
    fcmServiceAccountJson: process.env.FCM_SERVICE_ACCOUNT_JSON || "",
    smsProvider: process.env.SMS_PROVIDER || "dev",
    smsHttpUrl: process.env.SMS_HTTP_URL || "",
    smsApiKey: process.env.SMS_API_KEY || "",
    smsSenderId: process.env.SMS_SENDER_ID || "ABG",
    courierWebhookSecrets: {
      PATHAO: process.env.PATHAO_WEBHOOK_SECRET || "",
      REDX: process.env.REDX_WEBHOOK_SECRET || "",
      STEADFAST: process.env.STEADFAST_WEBHOOK_SECRET || "",
      OTHER: process.env.GENERIC_COURIER_WEBHOOK_SECRET || "",
    } as Record<string, string>,
  };

  if (production) {
    const problems: string[] = [];
    if (jwtSecret === DEV_JWT_SECRET || jwtSecret.length < 32) problems.push("JWT_SECRET must be set to a random value of 32+ characters");
    if (!process.env.APP_ENCRYPTION_KEY || encryptionKey.length !== 32) problems.push("APP_ENCRYPTION_KEY must be 32 bytes, base64 encoded");
    if (!process.env.OTP_PEPPER) problems.push("OTP_PEPPER must be set");
    if (config.exposeDevOtp) problems.push("EXPOSE_DEV_OTP must be false in production");
    if (config.corsOrigins.length === 0) problems.push("CORS_ORIGINS must list the admin portal origin");
    if (problems.length) throw new Error(`Refusing to start in production:\n - ${problems.join("\n - ")}`);
  }
  return config;
}

export type AppConfig = ReturnType<typeof loadConfig>;
export const APP_CONFIG = Symbol("APP_CONFIG");
