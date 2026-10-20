import { Inject, Injectable, Logger } from "@nestjs/common";
import { createSign } from "crypto";
import { APP_CONFIG, type AppConfig } from "../common/config";
import { PrismaService } from "../common/prisma.service";

interface ServiceAccount {
  client_email: string;
  private_key: string;
  project_id?: string;
}

export interface PushMessage {
  title: string;
  body: string;
  data: Record<string, string>;
}

/**
 * Firebase Cloud Messaging HTTP v1. Android and iOS (via APNs) both go through
 * FCM. Disabled until FCM_SERVICE_ACCOUNT_JSON is set; deliveries are logged as
 * SKIPPED meanwhile so the notification centre still works in-app.
 */
@Injectable()
export class PushService {
  private readonly logger = new Logger("PushService");
  private account: ServiceAccount | null = null;
  private accessToken: { value: string; expiresAt: number } | null = null;

  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    private readonly prisma: PrismaService,
  ) {
    if (config.fcmServiceAccountJson) {
      try {
        this.account = JSON.parse(config.fcmServiceAccountJson) as ServiceAccount;
      } catch {
        this.logger.error("FCM_SERVICE_ACCOUNT_JSON is not valid JSON; push disabled");
      }
    }
  }

  get configured(): boolean {
    return !!this.account && !!(this.config.fcmProjectId || this.account.project_id);
  }

  async sendToUser(userId: string, message: PushMessage, notificationId: string): Promise<void> {
    const devices = await this.prisma.deviceToken.findMany({ where: { userId } });
    for (const device of devices) {
      const target = `…${device.token.slice(-8)}`;
      if (!this.configured) {
        await this.log(notificationId, target, "SKIPPED", undefined, "FCM not configured");
        continue;
      }
      try {
        const res = await fetch(
          `https://fcm.googleapis.com/v1/projects/${this.config.fcmProjectId || this.account!.project_id}/messages:send`,
          {
            method: "POST",
            headers: { authorization: `Bearer ${await this.token()}`, "content-type": "application/json" },
            body: JSON.stringify({
              message: {
                token: device.token,
                notification: { title: message.title, body: message.body },
                data: message.data,
                android: { priority: "high", notification: { channel_id: "abg_dispatch" } },
                apns: { payload: { aps: { sound: "default" } } },
              },
            }),
            signal: AbortSignal.timeout(8000),
          },
        );
        if (res.status === 404 || res.status === 400) {
          // Token unregistered or invalid — stop sending to it.
          await this.prisma.deviceToken.delete({ where: { id: device.id } }).catch(() => undefined);
        }
        const body = (await res.json().catch(() => ({}))) as { name?: string; error?: { message?: string } };
        await this.log(notificationId, target, res.ok ? "SENT" : "FAILED", body.name, body.error?.message);
      } catch (err) {
        await this.log(notificationId, target, "FAILED", undefined, (err as Error).message);
      }
    }
  }

  private async log(notificationId: string, target: string, status: string, providerMessageId?: string, error?: string) {
    await this.prisma.notificationDelivery.create({
      data: { notificationId, channel: "PUSH", target, provider: "fcm", status, providerMessageId: providerMessageId ?? null, error: error ?? null },
    });
  }

  /** OAuth2 service-account flow: a signed JWT exchanged for a 1 h access token. */
  private async token(): Promise<string> {
    if (this.accessToken && this.accessToken.expiresAt > Date.now() + 60_000) return this.accessToken.value;
    const now = Math.floor(Date.now() / 1000);
    const enc = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
    const unsigned = `${enc({ alg: "RS256", typ: "JWT" })}.${enc({
      iss: this.account!.client_email,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    })}`;
    const signature = createSign("RSA-SHA256").update(unsigned).sign(this.account!.private_key, "base64url");
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${unsigned}.${signature}` }),
      signal: AbortSignal.timeout(8000),
    });
    const json = (await res.json()) as { access_token: string; expires_in: number };
    this.accessToken = { value: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 };
    return json.access_token;
  }
}
