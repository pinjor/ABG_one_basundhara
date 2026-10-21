import { Injectable, Logger } from "@nestjs/common";
import type { ParcelEvent, Prisma } from "@prisma/client";
import {
  Classification,
  EXCEPTION_LABEL,
  EventType,
  NotificationCategory,
  ReceiverType,
  RoleCode,
  isSensitive,
  notificationSubject,
} from "@abg-dispatch/shared";
import { PrismaService } from "../common/prisma.service";
import { dhakaTime } from "../common/time";
import { PushService } from "./push.service";
import { SmsService } from "./sms.service";

export interface Draft {
  userId: string;
  category: string;
  title: string;
  body: string;
}

const NOTIFY_PARCEL = {
  id: true,
  trackingNumber: true,
  title: true,
  classification: true,
  status: true,
  receiverType: true,
  receiverDepartmentId: true,
  originBranchId: true,
  destinationBranchId: true,
  createdById: true,
  actualReceiverName: true,
  receivedOnBehalf: true,
  receivedAt: true,
  externalReceiverName: true,
  externalReceiverPhone: true,
  senderEmployee: { select: { id: true, fullName: true, user: { select: { id: true } } } },
  receiverEmployee: { select: { id: true, fullName: true, user: { select: { id: true } } } },
  receiverDepartment: { select: { name: true } },
  originBranch: { select: { name: true } },
  destinationBranch: { select: { name: true } },
  currentAssignment: {
    select: {
      id: true,
      carrierType: true,
      carrierNameSnapshot: true,
      employee: { select: { user: { select: { id: true } } } },
      guestCarrier: { select: { phone: true } },
    },
  },
} satisfies Prisma.ParcelSelect;

/**
 * Event-driven notifications. Each ledger event maps to a set of recipients
 * and copy. Rows are written in-app first (deduplicated per event+person), then
 * pushed via FCM in the background. Guests and external people get SMS.
 */
@Injectable()
export class NotificationService {
  private readonly logger = new Logger("NotificationService");

  constructor(
    private readonly prisma: PrismaService,
    private readonly push: PushService,
    private readonly sms: SmsService,
  ) {}

  async onEvents(parcelId: string, events: ParcelEvent[]): Promise<void> {
    if (!events.length) return;
    const parcel = await this.prisma.parcel.findUnique({ where: { id: parcelId }, select: NOTIFY_PARCEL });
    if (!parcel) return;
    for (const event of events) {
      try {
        const drafts = await this.compose(parcel, event);
        await this.deliver(parcel, event.id, event.eventType, drafts);
        await this.smsFor(parcel, event);
      } catch (err) {
        // A notification failure must never undo a custody change that already committed.
        this.logger.error(`Notification for event ${event.id} failed: ${(err as Error).message}`);
      }
    }
  }

  /** Resend the current-status message to one audience, with a fresh dedupe key. */
  async resend(parcelId: string, audience: "SENDER" | "RECEIVER" | "CARRIER", eventId: string) {
    const parcel = await this.prisma.parcel.findUniqueOrThrow({ where: { id: parcelId }, select: NOTIFY_PARCEL });
    const subject = notificationSubject(this.copyInput(parcel));
    const users =
      audience === "SENDER"
        ? this.senderUsers(parcel)
        : audience === "RECEIVER"
          ? await this.receiverUsers(parcel)
          : this.carrierUsers(parcel);
    const drafts = users.map((userId) => ({
      userId,
      category: NotificationCategory.ACTION_REQUIRED,
      title: "Reminder from dispatch",
      body: `Please check ${subject} (${parcel.trackingNumber}). Tap to view.`,
    }));
    await this.deliver(parcel, eventId, EventType.NOTIFICATION_RESENT, drafts);
    return drafts.length;
  }

  /** Used by the SLA engine, which decides its own recipients. */
  async deliverRaw(parcelId: string, dedupeBase: string, eventType: string, drafts: Draft[]) {
    const parcel = await this.prisma.parcel.findUniqueOrThrow({ where: { id: parcelId }, select: NOTIFY_PARCEL });
    await this.deliver(parcel, dedupeBase, eventType, drafts);
  }

  /**
   * Notifications that are not about a parcel (incident reports). Same rules:
   * in-app row first, deduplicated per person, then push. Sensitive ones keep
   * their subject off the lock screen.
   */
  async deliverIncident(incident: { id: string; referenceNumber: string }, dedupeBase: string, eventType: string, drafts: Draft[], sensitive = false, status?: string) {
    const unique = new Map<string, Draft>();
    for (const d of drafts) if (d.userId && !unique.has(d.userId)) unique.set(d.userId, d);
    if (!unique.size) return 0;
    const rows = [...unique.values()].map((d) => ({
      userId: d.userId,
      eventType,
      category: d.category,
      title: d.title,
      body: d.body,
      sensitive,
      data: { incidentId: incident.id, referenceNumber: incident.referenceNumber, ...(status ? { status } : {}) },
      dedupeKey: `${dedupeBase}:${d.userId}`,
    }));
    try {
      await this.prisma.notification.createMany({ data: rows, skipDuplicates: true });
      const created = await this.prisma.notification.findMany({
        where: { dedupeKey: { in: rows.map((r) => r.dedupeKey) } },
        select: { id: true, userId: true, title: true, body: true },
      });
      void Promise.all(
        created.map((n) =>
          this.push
            .sendToUser(
              n.userId,
              {
                title: sensitive ? "ABG ONE" : n.title,
                body: sensitive
                  ? eventType === "INCIDENT_REPORTED"
                    ? "You have a new report to review. Open the app to view."
                    : "There is an update on your report. Open the app to view."
                  : n.body,
                data: { incidentId: incident.id, notificationId: n.id, eventType },
              },
              n.id,
            )
            .catch((err) => this.logger.warn(`Push failed: ${(err as Error).message}`)),
        ),
      );
      return created.length;
    } catch (err) {
      // Never undo a report because a notification failed.
      this.logger.error(`Incident notification ${dedupeBase} failed: ${(err as Error).message}`);
      return 0;
    }
  }

  /**
   * Notifications for the ABG ONE modules (tours, pool cars, visitors,
   * licences, notices). Each row carries `data.route`, the app path that
   * opens the item (e.g. "/pool-car/<id>"); the apps navigate there on tap.
   * `lockScreen` replaces the push text for sensitive items.
   */
  async deliverModule(
    item: { module: string; id: string; reference: string; route: string; status?: string },
    dedupeBase: string,
    eventType: string,
    drafts: Draft[],
    opts: { sensitive?: boolean; lockScreen?: string } = {},
  ): Promise<number> {
    const unique = new Map<string, Draft>();
    for (const d of drafts) if (d.userId && !unique.has(d.userId)) unique.set(d.userId, d);
    if (!unique.size) return 0;
    const sensitive = !!opts.sensitive;
    const data = { module: item.module, objectId: item.id, reference: item.reference, route: item.route, ...(item.status ? { status: item.status } : {}) };
    const rows = [...unique.values()].map((d) => ({
      userId: d.userId,
      eventType,
      category: d.category,
      title: d.title,
      body: d.body,
      sensitive,
      data,
      dedupeKey: `${dedupeBase}:${d.userId}`,
    }));
    try {
      await this.prisma.notification.createMany({ data: rows, skipDuplicates: true });
      const created = await this.prisma.notification.findMany({
        where: { dedupeKey: { in: rows.map((r) => r.dedupeKey) } },
        select: { id: true, userId: true, title: true, body: true },
      });
      void Promise.all(
        created.map((n) =>
          this.push
            .sendToUser(
              n.userId,
              {
                title: sensitive ? "ABG ONE" : n.title,
                body: sensitive ? (opts.lockScreen ?? "You have an update. Open the app to view.") : n.body,
                data: { route: item.route, notificationId: n.id, eventType },
              },
              n.id,
            )
            .catch((err) => this.logger.warn(`Push failed: ${(err as Error).message}`)),
        ),
      );
      return created.length;
    } catch (err) {
      // Never undo the business action because a notification failed.
      this.logger.error(`Notification ${dedupeBase} failed: ${(err as Error).message}`);
      return 0;
    }
  }

  /** Active users holding any of `roles`, optionally limited to people whose role scope or home office is in `branchIds`. */
  async usersWithRoles(roles: string[], branchIds?: (string | null)[]): Promise<string[]> {
    const ids = branchIds?.filter((b): b is string => !!b);
    const rows = await this.prisma.userRole.findMany({
      where: {
        role: { in: roles },
        user: { active: true },
        ...(ids ? { OR: [{ branchId: { in: ids } }, { branchId: null, user: { employee: { branchId: { in: ids } } } }] } : {}),
      },
      select: { userId: true },
    });
    return [...new Set(rows.map((r) => r.userId))];
  }

  async superAdminUsers(): Promise<string[]> {
    const rows = await this.prisma.userRole.findMany({ where: { role: RoleCode.SUPER_ADMIN, user: { active: true } }, select: { userId: true } });
    return [...new Set(rows.map((r) => r.userId))];
  }

  private copyInput(p: Parcel) {
    return { classification: p.classification as Classification, trackingNumber: p.trackingNumber, title: p.title };
  }

  private async deliver(p: Parcel, dedupeBase: string, eventType: string, drafts: Draft[]) {
    const unique = new Map<string, Draft>();
    for (const d of drafts) if (d.userId && !unique.has(d.userId)) unique.set(d.userId, d);
    if (!unique.size) return;
    const sensitive = isSensitive(p.classification as Classification);
    const rows = [...unique.values()].map((d) => ({
      userId: d.userId,
      parcelId: p.id,
      eventId: dedupeBase.includes(":") ? null : dedupeBase,
      eventType,
      category: d.category,
      title: d.title,
      body: d.body,
      sensitive,
      data: { parcelId: p.id, trackingNumber: p.trackingNumber },
      dedupeKey: `${dedupeBase}:${d.userId}`,
    }));
    await this.prisma.notification.createMany({ data: rows, skipDuplicates: true });
    const created = await this.prisma.notification.findMany({
      where: { dedupeKey: { in: rows.map((r) => r.dedupeKey) } },
      select: { id: true, userId: true, title: true, body: true },
    });
    // Push in the background; in-app rows are the source of truth.
    void Promise.all(
      created.map((n) =>
        this.push
          .sendToUser(
            n.userId,
            {
              // Lock-screen copy for sensitive parcels never includes the parcel title.
              title: sensitive ? "ABG ONE" : n.title,
              body: sensitive ? "You have a confidential parcel update. Open the app to view." : n.body,
              data: { parcelId: p.id, notificationId: n.id, eventType },
            },
            n.id,
          )
          .catch((err) => this.logger.warn(`Push failed: ${(err as Error).message}`)),
      ),
    );
  }

  private senderUsers(p: Parcel): string[] {
    return [p.senderEmployee.user?.id, p.createdById].filter((x): x is string => !!x);
  }

  private async receiverUsers(p: Parcel): Promise<string[]> {
    if (p.receiverType === ReceiverType.EMPLOYEE) return [p.receiverEmployee?.user?.id].filter((x): x is string => !!x);
    if (p.receiverType === ReceiverType.DEPARTMENT && p.receiverDepartmentId) {
      const users = await this.prisma.user.findMany({
        where: { active: true, employee: { departmentId: p.receiverDepartmentId, status: "ACTIVE" } },
        select: { id: true },
      });
      return users.map((u) => u.id);
    }
    if (p.receiverType === ReceiverType.BRANCH && p.destinationBranchId) return this.opsUsers([p.destinationBranchId]);
    return [];
  }

  private carrierUsers(p: Parcel): string[] {
    return [p.currentAssignment?.employee?.user?.id].filter((x): x is string => !!x);
  }

  async opsUsers(branchIds: (string | null)[], roles: string[] = [RoleCode.DISPATCH_OFFICER, RoleCode.BRANCH_ADMIN]): Promise<string[]> {
    const ids = branchIds.filter((b): b is string => !!b);
    if (!ids.length) return [];
    const rows = await this.prisma.userRole.findMany({
      where: {
        role: { in: roles },
        user: { active: true },
        OR: [{ branchId: { in: ids } }, { branchId: null, user: { employee: { branchId: { in: ids } } } }],
      },
      select: { userId: true },
    });
    return [...new Set(rows.map((r) => r.userId))];
  }

  async headOfficeUsers(): Promise<string[]> {
    const rows = await this.prisma.userRole.findMany({ where: { role: RoleCode.HEAD_OFFICE_ADMIN, user: { active: true } }, select: { userId: true } });
    return [...new Set(rows.map((r) => r.userId))];
  }

  private async compose(p: Parcel, e: ParcelEvent): Promise<Draft[]> {
    const C = NotificationCategory;
    const subject = notificationSubject(this.copyInput(p));
    const sensitive = isSensitive(p.classification as Classification);
    const tn = p.trackingNumber;
    const at = dhakaTime(e.serverTimestamp);
    const receiverName = p.receiverEmployee?.fullName ?? p.receiverDepartment?.name ?? p.externalReceiverName ?? p.destinationBranch?.name ?? "receiver";
    const destination = p.destinationBranch?.name ?? "the destination";
    const carrierName = p.currentAssignment?.carrierNameSnapshot ?? "the courier";
    const meta = (e.metadata ?? {}) as Record<string, unknown>;
    const to = (ids: string[], category: string, title: string, body: string): Draft[] => ids.map((userId) => ({ userId, category, title, body }));

    switch (e.eventType) {
      case EventType.PARCEL_CREATED:
      case EventType.PARCEL_BOOKED: {
        if (p.status === "DRAFT") return [];
        return [
          ...to(this.senderUsers(p), C.PARCEL_UPDATE, "Parcel booked successfully", `${tn} · To: ${receiverName} · Destination: ${destination}`),
          ...to(
            await this.receiverUsers(p),
            C.PARCEL_UPDATE,
            "A parcel has been booked for you",
            sensitive
              ? `From: ${p.senderEmployee.fullName} · Tracking: ${tn}. Tap to track.`
              : `From: ${p.senderEmployee.fullName} · ${p.title} · Tracking: ${tn}. Tap to track.`,
          ),
        ];
      }
      case EventType.CARRIER_ASSIGNED:
      case EventType.CARRIER_REASSIGNED: {
        if (p.status === "DRAFT") return [];
        const drafts = to(this.carrierUsers(p), C.ACTION_REQUIRED, "New pickup assigned", `${p.originBranch.name} → ${destination} · ${tn}. Tap to view.`);
        const previous = typeof meta.previousCarrierUserId === "string" ? meta.previousCarrierUserId : null;
        if (previous) drafts.push({ userId: previous, category: C.PARCEL_UPDATE, title: "Assignment removed", body: `You are no longer carrying ${tn}.` });
        return drafts;
      }
      case EventType.HANDOVER_REQUESTED:
        return to(this.senderUsers(p), C.ACTION_REQUIRED, "Confirm handover", `${carrierName} is ready to collect ${subject} (${tn}). Confirm the handover in the app.`);
      case EventType.PICKED_UP:
        return [
          ...to(this.senderUsers(p), C.PARCEL_UPDATE, "Parcel picked up", `Your parcel was picked up by ${carrierName} at ${at}.`),
          ...to(await this.receiverUsers(p), C.PARCEL_UPDATE, "Your parcel is now in transit", `${tn} from ${p.senderEmployee.fullName} is on its way.`),
        ];
      case EventType.ARRIVED_AT_DESTINATION:
        return to(this.senderUsers(p), C.PARCEL_UPDATE, "Arrived at destination", `${tn} reached ${destination} at ${at} and is waiting for receipt.`);
      case EventType.PENDING_RECEIPT:
        return to(await this.receiverUsers(p), C.ACTION_REQUIRED, "Your parcel has arrived", `${tn} is waiting for your receipt confirmation. Tap to receive.`);
      case EventType.RECEIPT_OTP_SENT: {
        const recipient = typeof meta.recipientUserId === "string" ? meta.recipientUserId : null;
        return recipient
          ? [{ userId: recipient, category: C.ACTION_REQUIRED, title: "Receipt code sent", body: `A one-time code for ${tn} was sent to your phone. Share it only when the parcel is in your hands.` }]
          : [];
      }
      case EventType.RECEIVED: {
        const by = p.actualReceiverName ?? receiverName;
        const drafts = to(this.senderUsers(p), C.PARCEL_UPDATE, "Delivered successfully", `Received by ${by} at ${at}.`);
        if (p.receivedOnBehalf) {
          drafts.push(
            ...to(await this.receiverUsers(p), C.PARCEL_UPDATE, "Received on your behalf", `Your parcel ${tn} was received on your behalf by ${by} at ${at}.`),
          );
        }
        drafts.push(...to(this.carrierUsers(p), C.PARCEL_UPDATE, "Delivery confirmed", `${tn} was received by ${by}. Thank you.`));
        return drafts;
      }
      case EventType.EXCEPTION_RECORDED:
      case EventType.PUT_ON_HOLD:
      case EventType.DELIVERY_FAILED: {
        const label = EXCEPTION_LABEL[meta.code as keyof typeof EXCEPTION_LABEL] ?? "Delivery exception";
        const title = e.eventType === EventType.PUT_ON_HOLD ? "Parcel on hold" : e.eventType === EventType.DELIVERY_FAILED ? "Delivery failed" : "Delivery exception";
        const ops = await this.opsUsers([p.originBranchId, p.destinationBranchId]);
        return [
          ...to(ops, C.ACTION_REQUIRED, title, `${tn}: ${label}. Reported by ${e.actorNameSnapshot}.`),
          ...to(this.senderUsers(p), C.PARCEL_UPDATE, title, `${tn}: ${label}.`),
          ...to(await this.receiverUsers(p), C.PARCEL_UPDATE, title, `${tn}: ${label}.`),
        ];
      }
      case EventType.EXCEPTION_RESOLVED:
      case EventType.RELEASED_FROM_HOLD:
        return to(this.senderUsers(p), C.PARCEL_UPDATE, "Exception resolved", `${tn} is moving again.`);
      case EventType.RETURN_REQUESTED:
        return [
          ...to(this.carrierUsers(p), C.ACTION_REQUIRED, "Return requested", `Bring ${tn} back to ${p.originBranch.name}.`),
          ...to(await this.receiverUsers(p), C.PARCEL_UPDATE, "Parcel being returned", `${tn} is being returned to the sender.`),
          ...to(this.senderUsers(p), C.PARCEL_UPDATE, "Return requested", `${tn} will be returned to ${p.originBranch.name}.`),
        ];
      case EventType.RETURNED:
        return to(this.senderUsers(p), C.PARCEL_UPDATE, "Returned to sender", `${tn} is back at ${p.originBranch.name} (${at}).`);
      case EventType.CANCELLED:
        return [
          ...to(this.carrierUsers(p), C.PARCEL_UPDATE, "Pickup cancelled", `${tn} was cancelled. No pickup needed.`),
          ...to(await this.receiverUsers(p), C.PARCEL_UPDATE, "Parcel cancelled", `${tn} from ${p.senderEmployee.fullName} was cancelled.`),
        ];
      default:
        return [];
    }
  }

  /** SMS for people without the app: guest carriers on assignment, external receivers on dispatch. */
  private async smsFor(p: Parcel, e: ParcelEvent) {
    const assignment = p.currentAssignment;
    if ((e.eventType === EventType.CARRIER_ASSIGNED || e.eventType === EventType.CARRIER_REASSIGNED) && assignment?.guestCarrier && p.status !== "DRAFT") {
      await this.sms.send(
        assignment.guestCarrier.phone,
        `ABG ONE: you are assigned ${p.trackingNumber} (${p.originBranch.name} → ${p.destinationBranch?.name ?? "external"}). Open the ABG ONE app and sign in with this number to start.`,
      );
    }
    if (e.eventType === EventType.PICKED_UP && p.receiverType === ReceiverType.EXTERNAL && p.externalReceiverPhone) {
      await this.sms.send(p.externalReceiverPhone, `ABG ONE: ${p.trackingNumber} from Anvir Bashundhara Group is on its way to you.`);
    }
  }
}

type Parcel = Prisma.ParcelGetPayload<{ select: typeof NOTIFY_PARCEL }>;
