import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { APP_CONFIG, type AppConfig } from "../common/config";
import { AuditsService } from "./audits.service";

/**
 * Overdue corrective actions, on the background-checks schedule
 * (SLA_INTERVAL_SECONDS; 0 turns it off, as in tests). Each overdue action
 * tells its owner and the audit lead once.
 */
@Injectable()
export class AuditAlertsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger("AuditAlertsService");
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    private readonly audits: AuditsService,
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
      await this.audits.alertOverdue();
    } catch (err) {
      this.logger.error(`Audit overdue run failed: ${(err as Error).message}`);
    } finally {
      this.running = false;
    }
  }
}
