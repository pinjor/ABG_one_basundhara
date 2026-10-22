import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import {
  LICENCE_ALERT_DAYS,
  LicenceAlertLevel,
  LicenceEventType,
  NotificationCategory,
  RENEWAL_STAGE_LABEL,
  RoleCode,
  addCalendarDays,
  daysUntil,
  dhakaToday,
  isLicenceAlertDue,
  licenceAlertLevel,
  licenceAlertThreshold,
  licenceStateForDays,
  type RenewalStage,
} from "@abg-dispatch/shared";
import { APP_CONFIG, type AppConfig } from "../common/config";
import { PrismaService } from "../common/prisma.service";
import { NotificationService } from "../notifications/notification.service";

/** How the engine signs the history entries it writes. */
export const ALERT_ACTOR_NAME = "ABG ONE alerts";

const dateFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

/** "5 Nov 2026" for a calendar date (stored as UTC midnight). */
export function formatDate(date: Date): string {
  return dateFmt.format(date);
}

/** YYYY-MM-DD for a calendar date (stored as UTC midnight). */
export function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Who hears about a licence at an alert level: the owner and the compliance
 * officers; from 30 days the office's branch admins; from 7 days (and once
 * expired) head office admins and the MD / Chairman. With nobody to tell, the
 * super admins are told so an alert never goes nowhere.
 */
export async function alertRecipients(
  prisma: PrismaService,
  notifications: NotificationService,
  licence: { branchId: string; owner: { id: string; active: boolean } | null },
  level: LicenceAlertLevel,
): Promise<{ id: string; name: string }[]> {
  const ids: string[] = [];
  if (licence.owner?.active) ids.push(licence.owner.id);
  ids.push(...(await notifications.usersWithRoles([RoleCode.COMPLIANCE_OFFICER])));
  if (level !== LicenceAlertLevel.OWNER) ids.push(...(await notifications.usersWithRoles([RoleCode.BRANCH_ADMIN], [licence.branchId])));
  if (level === LicenceAlertLevel.LEADERSHIP) {
    ids.push(...(await notifications.usersWithRoles([RoleCode.HEAD_OFFICE_ADMIN])));
    ids.push(...(await notifications.usersWithRoles([RoleCode.EXECUTIVE])));
  }
  const unique = [...new Set(ids.length ? ids : await notifications.superAdminUsers())];
  const users = await prisma.user.findMany({ where: { id: { in: unique }, active: true }, select: { id: true, displayName: true } });
  // Keep the order above: owner first, leadership last.
  return unique.map((id) => users.find((u) => u.id === id)).filter((u): u is { id: string; displayName: string } => !!u).map((u) => ({ id: u.id, name: u.displayName }));
}

export interface LicenceAlertRun {
  ranAt: string;
  /** Licences close enough to expiry to look at. */
  checked: number;
  alerted: number;
  alerts: { id: string; name: string; licenceNumber: string; branch: string; thresholdDays: number; daysLeft: number; level: LicenceAlertLevel; notified: number }[];
}

interface Locked {
  expiresAt: Date;
  renewalLeadDays: number;
  lastAlertDays: number | null;
  active: boolean;
}

/**
 * Automated escalation for the licence register. On the background-checks
 * schedule (SLA_INTERVAL_SECONDS; 0 turns it off, as in tests) and on demand,
 * every active licence that has reached an alert threshold (90, 60, 30, 15, 7
 * days, and expiry) not yet sent for its current expiry date gets exactly one
 * alert. `lastAlertDays` records the threshold under a row lock and each
 * notification is deduplicated per expiry date, threshold and person, so
 * overlapping runs never alert twice.
 */
@Injectable()
export class LicenceAlertsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger("LicenceAlertsService");
  private timer: NodeJS.Timeout | null = null;
  private running = false;
  lastRun: LicenceAlertRun | null = null;

  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationService,
  ) {}

  onModuleInit() {
    if (this.config.slaIntervalSeconds > 0) {
      this.timer = setInterval(() => void this.tick(), this.config.slaIntervalSeconds * 1000);
      this.timer.unref?.();
    }
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  private async tick() {
    if (this.running) return;
    this.running = true;
    try {
      await this.run();
    } catch (err) {
      this.logger.error(`Licence alert run failed: ${(err as Error).message}`);
    } finally {
      this.running = false;
    }
  }

  async run(now = new Date()): Promise<LicenceAlertRun> {
    const horizon = new Date(`${addCalendarDays(dhakaToday(now), Math.max(...LICENCE_ALERT_DAYS))}T00:00:00Z`);
    // Licences that have had their final (expiry) alert are done until renewed.
    const candidates = await this.prisma.licence.findMany({
      where: { active: true, expiresAt: { lte: horizon }, OR: [{ lastAlertDays: null }, { lastAlertDays: { gt: 0 } }] },
      select: { id: true, expiresAt: true, renewalLeadDays: true, lastAlertDays: true },
      orderBy: [{ expiresAt: "asc" }, { id: "asc" }],
    });
    const alerts: LicenceAlertRun["alerts"] = [];
    for (const c of candidates) {
      if (!isLicenceAlertDue(daysUntil(c.expiresAt, now), c.renewalLeadDays, c.lastAlertDays)) continue;
      try {
        const sent = await this.alert(c.id, now);
        if (sent) alerts.push(sent);
      } catch (err) {
        this.logger.error(`Licence alert for ${c.id} failed: ${(err as Error).message}`);
      }
    }
    this.lastRun = { ranAt: now.toISOString(), checked: candidates.length, alerted: alerts.length, alerts };
    return this.lastRun;
  }

  private async alert(id: string, now: Date) {
    const licence = await this.prisma.licence.findUniqueOrThrow({
      where: { id },
      include: { branch: { select: { name: true } }, owner: { select: { id: true, active: true } } },
    });
    const sent = await this.prisma.$transaction(async (tx) => {
      const [row] = await tx.$queryRaw<Locked[]>`
        SELECT "expiresAt", "renewalLeadDays", "lastAlertDays", "active" FROM "licences" WHERE "id" = ${id} FOR UPDATE`;
      if (!row?.active) return null;
      const daysLeft = daysUntil(row.expiresAt, now);
      // Re-checked under the lock: another run, a renewal or an edit may have got here first.
      if (!isLicenceAlertDue(daysLeft, row.renewalLeadDays, row.lastAlertDays)) return null;
      const thresholdDays = licenceAlertThreshold(daysLeft, row.renewalLeadDays)!;
      const level = licenceAlertLevel(thresholdDays);
      const recipients = await alertRecipients(this.prisma, this.notifications, { branchId: licence.branchId, owner: licence.owner }, level);
      const expiresAt = isoDate(row.expiresAt);
      await tx.licence.update({ where: { id }, data: { lastAlertDays: thresholdDays, lastAlertAt: now } });
      await tx.licenceEvent.create({
        data: {
          licenceId: id,
          type: LicenceEventType.ESCALATED,
          actorUserId: null,
          actorName: ALERT_ACTOR_NAME,
          createdAt: now,
          metadata: { thresholdDays, daysLeft, level, expiresAt, notified: recipients.map((r) => r.name) },
        },
      });
      return { thresholdDays, daysLeft, level, expiresAt: row.expiresAt, renewalLeadDays: row.renewalLeadDays, recipients };
    });
    if (!sent) return null;

    const { daysLeft, thresholdDays, level, recipients } = sent;
    const title = daysLeft < 0 ? `${licence.name} has expired` : daysLeft === 0 ? `${licence.name} expires today` : `${licence.name} expires in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`;
    const when = daysLeft < 0 ? `Expired on ${formatDate(sent.expiresAt)}` : `Expires on ${formatDate(sent.expiresAt)}`;
    const stage = (RENEWAL_STAGE_LABEL[licence.renewalStage as RenewalStage] ?? licence.renewalStage).toLowerCase();
    const body = `${licence.branch.name} · ${licence.licenceNumber} (${licence.issuingAuthority}). ${when}; renewal: ${stage}.${level === LicenceAlertLevel.LEADERSHIP ? " Escalated to head office and the MD." : ""}`;
    // A notification failure never undoes the recorded alert (deliverModule logs and carries on).
    await this.notifications.deliverModule(
      { module: "licences", id, reference: licence.licenceNumber, route: `/licences/${id}`, status: licenceStateForDays(daysLeft, sent.renewalLeadDays) },
      `licence:${id}:alert:${sent.expiresAt.toISOString().slice(0, 10)}:${thresholdDays}`,
      "LICENCE_EXPIRY_ALERT",
      recipients.map((r) => ({ userId: r.id, category: NotificationCategory.ACTION_REQUIRED, title, body })),
    );
    return { id, name: licence.name, licenceNumber: licence.licenceNumber, branch: licence.branch.name, thresholdDays, daysLeft, level, notified: recipients.length };
  }
}
