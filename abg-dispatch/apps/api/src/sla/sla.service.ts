import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import type { Prisma, SlaPolicy } from "@prisma/client";
import { EventType, NotificationCategory, ParcelStatus, SlaAudience, SlaStage, TERMINAL_STATUSES } from "@abg-dispatch/shared";
import { APP_CONFIG, type AppConfig } from "../common/config";
import { PrismaService } from "../common/prisma.service";
import { NotificationService } from "../notifications/notification.service";
import { SmsService } from "../notifications/sms.service";
import { LedgerService, SYSTEM_ACTOR } from "../parcels/ledger.service";
import { RealtimeService } from "../realtime/realtime.service";

/** Which statuses a stage covers, and which milestone starts its clock. */
const STAGES: Record<string, { statuses: string[]; clock: "bookedAt" | "pickedUpAt" | "pendingReceiptAt" }> = {
  [SlaStage.PICKUP]: { statuses: [ParcelStatus.BOOKED, ParcelStatus.AWAITING_PICKUP], clock: "bookedAt" },
  [SlaStage.DELIVERY]: { statuses: [ParcelStatus.PICKED_UP, ParcelStatus.IN_TRANSIT], clock: "pickedUpAt" },
  [SlaStage.RECEIPT]: { statuses: [ParcelStatus.ARRIVED_AT_DESTINATION, ParcelStatus.PENDING_RECEIPT], clock: "pendingReceiptAt" },
  [SlaStage.END_TO_END]: {
    statuses: Object.values(ParcelStatus).filter((s) => !TERMINAL_STATUSES.includes(s) && s !== ParcelStatus.DRAFT),
    clock: "bookedAt",
  },
};

const STAGE_COPY: Record<string, { reminder: string; escalation: string }> = {
  PICKUP: { reminder: "Pickup reminder", escalation: "Pickup overdue" },
  DELIVERY: { reminder: "Delivery reminder", escalation: "Delivery overdue" },
  RECEIPT: { reminder: "Waiting for your receipt", escalation: "Receipt overdue" },
  END_TO_END: { reminder: "Delivery taking longer than usual", escalation: "Dispatch SLA breached" },
};

export interface SlaRunResult {
  evaluatedPolicies: number;
  triggered: number;
  expectedDeliveryBreaches: number;
  ranAt: string;
}

/**
 * Configurable reminders and escalations. Every minute (SLA_INTERVAL_SECONDS)
 * each active policy finds parcels that have sat in its stage for longer than
 * its threshold and have not yet triggered it. A trigger is recorded once per
 * parcel per policy (unique index), appended to the ledger, and notified.
 */
@Injectable()
export class SlaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger("SlaService");
  private timer: NodeJS.Timeout | null = null;
  private running = false;
  lastRun: SlaRunResult | null = null;

  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
    private readonly notifications: NotificationService,
    private readonly sms: SmsService,
    private readonly realtime: RealtimeService,
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
      await this.evaluate();
    } catch (err) {
      this.logger.error(`SLA evaluation failed: ${(err as Error).message}`);
    } finally {
      this.running = false;
    }
  }

  private policyWhere(policy: SlaPolicy, now: Date): Prisma.ParcelWhereInput {
    const stage = STAGES[policy.stage];
    return {
      status: { in: stage.statuses },
      [stage.clock]: { lte: new Date(now.getTime() - policy.thresholdMinutes * 60_000) },
      priority: policy.priority ?? undefined,
      classification: policy.classification ?? undefined,
      categoryId: policy.categoryId ?? undefined,
      originBranchId: policy.originBranchId ?? undefined,
      destinationBranchId: policy.destinationBranchId ?? undefined,
      deliveryMethod: policy.deliveryMethod ?? undefined,
      escalations: { none: { slaPolicyId: policy.id } },
    };
  }

  async evaluate(now = new Date()): Promise<SlaRunResult> {
    const policies = await this.prisma.slaPolicy.findMany({ where: { active: true }, orderBy: { thresholdMinutes: "asc" } });
    let triggered = 0;
    for (const policy of policies) {
      const due = await this.prisma.parcel.findMany({ where: this.policyWhere(policy, now), select: { id: true }, take: 500 });
      for (const { id } of due) if (await this.trigger(policy, id, now)) triggered++;
    }
    const expectedDeliveryBreaches = await this.expectedDeliveryBreaches(now);
    this.lastRun = { evaluatedPolicies: policies.length, triggered, expectedDeliveryBreaches, ranAt: now.toISOString() };
    return this.lastRun;
  }

  private async trigger(policy: SlaPolicy, parcelId: string, now: Date): Promise<boolean> {
    const event = await this.prisma.$transaction(async (tx) => {
      const state = await this.ledger.lock(tx, parcelId);
      const stage = STAGES[policy.stage];
      if (!stage.statuses.includes(state.status)) return null;
      const exists = await tx.escalation.findUnique({ where: { parcelId_slaPolicyId: { parcelId, slaPolicyId: policy.id } } });
      if (exists) return null;
      await tx.escalation.create({ data: { parcelId, slaPolicyId: policy.id, stage: policy.stage, audience: policy.audience, triggeredAt: now } });
      const clock = state[stage.clock];
      const waited = clock ? Math.round((now.getTime() - clock.getTime()) / 60_000) : policy.thresholdMinutes;
      return this.ledger.record(tx, state, {
        eventType: policy.marksOverdue ? EventType.SLA_ESCALATED : EventType.SLA_REMINDER,
        actor: SYSTEM_ACTOR,
        patch: policy.marksOverdue ? { isOverdue: true, overdueSince: state.overdueSince ?? now } : {},
        notes: `${policy.name}: ${waited} min in ${policy.stage.toLowerCase().replace("_", "-")} stage (limit ${policy.thresholdMinutes} min)`,
        metadata: { policyId: policy.id, stage: policy.stage, audience: policy.audience, waitedMinutes: waited, thresholdMinutes: policy.thresholdMinutes },
        at: now,
      });
    });
    if (!event) return false;
    await this.notify(policy, parcelId, event.id, now);
    return true;
  }

  private async notify(policy: SlaPolicy, parcelId: string, eventId: string, now: Date) {
    const p = await this.prisma.parcel.findUniqueOrThrow({
      where: { id: parcelId },
      select: {
        trackingNumber: true,
        originBranchId: true,
        destinationBranchId: true,
        createdById: true,
        receiverType: true,
        receiverDepartmentId: true,
        status: true,
        senderEmployee: { select: { user: { select: { id: true } } } },
        receiverEmployee: { select: { user: { select: { id: true } } } },
        currentAssignment: { select: { employee: { select: { user: { select: { id: true } } } }, guestCarrier: { select: { phone: true } } } },
      },
    });
    const copy = STAGE_COPY[policy.stage];
    const branches = policy.stage === SlaStage.PICKUP ? [p.originBranchId] : policy.stage === SlaStage.END_TO_END ? [p.originBranchId, p.destinationBranchId] : [p.destinationBranchId];
    const drafts: { userId: string; category: string; title: string; body: string }[] = [];
    const add = (ids: (string | null | undefined)[], title: string, body: string, category: string = NotificationCategory.ACTION_REQUIRED) => {
      for (const userId of ids) if (userId) drafts.push({ userId, category, title, body });
    };
    for (const audience of policy.audience) {
      switch (audience) {
        case SlaAudience.CARRIER:
          add([p.currentAssignment?.employee?.user?.id], copy.reminder, `${p.trackingNumber} is waiting for you. Please complete the ${policy.stage === "PICKUP" ? "pickup" : "delivery"}.`);
          if (p.currentAssignment?.guestCarrier) {
            await this.sms.send(p.currentAssignment.guestCarrier.phone, `ABG Dispatch reminder: ${p.trackingNumber} is waiting for you.`);
          }
          break;
        case SlaAudience.SENDER:
          add([p.senderEmployee.user?.id, p.createdById], copy.reminder, `${p.trackingNumber} has not moved for ${policy.thresholdMinutes} minutes.`, NotificationCategory.PARCEL_UPDATE);
          break;
        case SlaAudience.RECEIVER: {
          const ids = [p.receiverEmployee?.user?.id];
          if (p.receiverType === "DEPARTMENT" && p.receiverDepartmentId) {
            const members = await this.prisma.user.findMany({ where: { active: true, employee: { departmentId: p.receiverDepartmentId } }, select: { id: true } });
            ids.push(...members.map((m) => m.id));
          }
          add(ids, copy.reminder, `${p.trackingNumber} has been waiting at the destination. Tap to confirm receipt.`);
          break;
        }
        case SlaAudience.BRANCH_ADMIN:
          add(await this.notifications.opsUsers(branches, ["BRANCH_ADMIN"]), copy.escalation, `${p.trackingNumber}: ${policy.name}. Needs attention.`);
          break;
        case SlaAudience.DISPATCH_OFFICER:
          add(await this.notifications.opsUsers(branches, ["DISPATCH_OFFICER"]), copy.escalation, `${p.trackingNumber}: ${policy.name}.`);
          break;
        case SlaAudience.HEAD_OFFICE_ADMIN:
          add(await this.notifications.headOfficeUsers(), copy.escalation, `${p.trackingNumber}: ${policy.name}. Escalated to head office.`);
          break;
      }
    }
    await this.notifications.deliverRaw(parcelId, `sla:${policy.id}:${eventId}`, policy.marksOverdue ? EventType.SLA_ESCALATED : EventType.SLA_REMINDER, drafts);
    this.realtime.publish({
      parcelId,
      trackingNumber: p.trackingNumber,
      status: p.status,
      eventTypes: [policy.marksOverdue ? EventType.SLA_ESCALATED : EventType.SLA_REMINDER],
      originBranchId: p.originBranchId,
      destinationBranchId: p.destinationBranchId,
      at: now.toISOString(),
    });
  }

  /** A parcel past its expected delivery time is overdue regardless of policy. */
  private async expectedDeliveryBreaches(now: Date): Promise<number> {
    const late = await this.prisma.parcel.findMany({
      where: { expectedDeliveryAt: { lt: now }, isOverdue: false, status: { notIn: [...TERMINAL_STATUSES, ParcelStatus.DRAFT] } },
      select: { id: true },
      take: 500,
    });
    for (const { id } of late) {
      const event = await this.prisma.$transaction(async (tx) => {
        const state = await this.ledger.lock(tx, id);
        if (state.isOverdue || TERMINAL_STATUSES.includes(state.status as ParcelStatus)) return null;
        return this.ledger.record(tx, state, {
          eventType: EventType.SLA_ESCALATED,
          actor: SYSTEM_ACTOR,
          patch: { isOverdue: true, overdueSince: state.overdueSince ?? now },
          notes: "Expected delivery time has passed",
          metadata: { reason: "EXPECTED_DELIVERY_PASSED" },
          at: now,
        });
      });
      if (!event) continue;
      const p = await this.prisma.parcel.findUniqueOrThrow({ where: { id }, select: { trackingNumber: true, originBranchId: true, destinationBranchId: true, createdById: true } });
      const ops = await this.notifications.opsUsers([p.originBranchId, p.destinationBranchId]);
      await this.notifications.deliverRaw(
        id,
        `sla:expected:${event.id}`,
        EventType.SLA_ESCALATED,
        [...ops, p.createdById].map((userId) => ({ userId, category: NotificationCategory.ACTION_REQUIRED, title: "Parcel overdue", body: `${p.trackingNumber} is past its expected delivery time.` })),
      );
    }
    return late.length;
  }
}
