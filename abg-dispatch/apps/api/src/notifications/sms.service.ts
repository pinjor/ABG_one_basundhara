import { Inject, Injectable, Logger } from "@nestjs/common";
import { APP_CONFIG, type AppConfig } from "../common/config";
import { maskPhone } from "@abg-dispatch/shared";
import { PrismaService } from "../common/prisma.service";

export interface SmsResult {
  status: "SENT" | "SKIPPED" | "FAILED";
  provider: string;
  providerMessageId?: string;
  error?: string;
}

/** Normalises Bangladeshi numbers to the local 11-digit form: +8801712345678 → 01712345678. */
export function normalizePhone(raw: string): string {
  let digits = raw.replace(/[^\d]/g, "");
  if (digits.startsWith("880")) digits = digits.slice(2);
  if (digits.length === 10 && digits.startsWith("1")) digits = `0${digits}`;
  return digits;
}

/**
 * SMS gateway abstraction. `dev` records that a message would have been sent
 * (without its text, which may contain a one-time code). `http` posts JSON to a
 * Bangladesh gateway (SSL Wireless, BulkSMSBD, Infobip …) configured by
 * SMS_HTTP_URL / SMS_API_KEY / SMS_SENDER_ID.
 */
@Injectable()
export class SmsService {
  private readonly logger = new Logger("SmsService");

  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    private readonly prisma: PrismaService,
  ) {}

  get providerName(): string {
    return this.config.smsProvider === "http" && this.config.smsHttpUrl ? "http" : "dev";
  }

  async send(phone: string, text: string, notificationId?: string): Promise<SmsResult> {
    const to = normalizePhone(phone);
    let result: SmsResult;
    if (this.providerName === "dev") {
      result = { status: "SKIPPED", provider: "dev" };
    } else {
      try {
        const res = await fetch(this.config.smsHttpUrl, {
          method: "POST",
          headers: { "content-type": "application/json", authorization: `Bearer ${this.config.smsApiKey}` },
          body: JSON.stringify({ to: `88${to}`, from: this.config.smsSenderId, text }),
          signal: AbortSignal.timeout(8000),
        });
        result = res.ok
          ? { status: "SENT", provider: "http", providerMessageId: res.headers.get("x-message-id") ?? undefined }
          : { status: "FAILED", provider: "http", error: `Gateway responded ${res.status}` };
      } catch (err) {
        result = { status: "FAILED", provider: "http", error: (err as Error).message };
      }
    }
    if (result.status === "FAILED") this.logger.warn(`SMS to ${maskPhone(to)} failed: ${result.error}`);
    await this.prisma.notificationDelivery.create({
      data: {
        notificationId: notificationId ?? null,
        channel: "SMS",
        target: maskPhone(to) ?? "",
        provider: result.provider,
        status: result.status,
        providerMessageId: result.providerMessageId ?? null,
        error: result.error ?? null,
      },
    });
    return result;
  }
}
