import {
  AppointmentPurpose,
  AppointmentStatus,
  AppointmentUpdateType,
  DEFAULT_WEEKEND_DAYS,
  MeetingMode,
  NotificationCategory,
  formatAppointmentNumber,
} from "@abg-dispatch/shared";
import { DAY, type SeedContext } from "./context";
import { PUBLIC_HOLIDAYS } from "./leave";

/**
 * Demo data: requests for appointment with the MD, the Chairman and heads of
 * department — waiting for the executive office, a new time proposed, meetings
 * confirmed this week, and history — dated relative to today (Asia/Dhaka).
 */

const HOUR = DAY / 24;
const dhakaIso = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka", year: "numeric", month: "2-digit", day: "2-digit" });
const meetingFmt = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Dhaka", weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true });
const S = AppointmentStatus;
const PA = "ABG-1010";

interface Slot {
  /** Working days from today (0 = today, or the next working day). Negative = in the past (calendar days). */
  day: number;
  /** "10:30", Asia/Dhaka. */
  time: string;
}

interface Step {
  to: AppointmentStatus;
  by: string;
  ago: number;
  note?: string;
  /** For a proposal: the new time. */
  at?: Slot;
}

interface AppointmentSeed {
  requester: string;
  host: string;
  subject: string;
  purpose: AppointmentPurpose;
  agenda: string;
  mode: MeetingMode;
  minutes: number;
  preferred: Slot;
  alternative?: Slot;
  location?: string;
  attendees?: string[];
  urgent?: boolean;
  askedAgo: number;
  steps: Step[];
}

const SEEDS: AppointmentSeed[] = [
  {
    requester: "ABG-2041",
    host: "ABG-1002",
    subject: "Lease agreement for the Chattogram refinery land",
    purpose: AppointmentPurpose.APPROVAL,
    agenda: "Final lease terms from the landowners; the MD's signature is needed before the registration date.",
    mode: MeetingMode.IN_PERSON,
    minutes: 30,
    preferred: { day: 3, time: "11:00" },
    alternative: { day: 4, time: "15:00" },
    askedAgo: 0.3,
    steps: [],
  },
  {
    requester: "ABG-2055",
    host: "ABG-1003",
    subject: "Q3 financial results briefing",
    purpose: AppointmentPurpose.BUSINESS_REVIEW,
    agenda: "Group results for July–September, LPG margins and the working-capital position.",
    mode: MeetingMode.IN_PERSON,
    minutes: 45,
    preferred: { day: 1, time: "10:30" },
    location: "Chairman's Office, Level 9",
    attendees: ["Rashed Khan"],
    askedAgo: 2,
    steps: [{ to: S.CONFIRMED, by: PA, ago: 1.5, note: "The Chairman will see you with the board pack." }],
  },
  {
    requester: "ABG-7420",
    host: "ABG-1002",
    subject: "Bottling line 2 commissioning plan",
    purpose: AppointmentPurpose.PROJECT_UPDATE,
    agenda: "Commissioning dates, the vendor's engineers and the shutdown window for Factory B.",
    mode: MeetingMode.VIDEO,
    minutes: 30,
    preferred: { day: 2, time: "12:00" },
    askedAgo: 1,
    steps: [{ to: S.PROPOSED, by: PA, ago: 0.5, at: { day: 5, time: "16:00" }, note: "The MD is at the BERC hearing that day — could we do this instead?" }],
  },
  {
    requester: "ABG-2305",
    host: "ABG-2210",
    subject: "Valve supplier shortlist",
    purpose: AppointmentPurpose.PROPOSAL,
    agenda: "Three LPG valve suppliers after the Frankfurt audit, with prices and lead times.",
    mode: MeetingMode.IN_PERSON,
    minutes: 30,
    preferred: { day: 0, time: "15:00" },
    location: "Executive Director's room, Level 9",
    askedAgo: 1.2,
    steps: [{ to: S.CONFIRMED, by: "ABG-2210", ago: 1 }],
  },
  {
    requester: "ABG-6021",
    host: "ABG-2210",
    subject: "Year-end closing timeline",
    purpose: AppointmentPurpose.BUSINESS_REVIEW,
    agenda: "Closing calendar for December and the auditors' fieldwork dates.",
    mode: MeetingMode.VIDEO,
    minutes: 30,
    preferred: { day: 2, time: "11:30" },
    askedAgo: 0.2,
    steps: [],
  },
  {
    requester: "ABG-2400",
    host: "ABG-1002",
    subject: "Factory B fire licence — renewal overdue",
    purpose: AppointmentPurpose.APPROVAL,
    agenda: "The Fire Service licence lapsed; a fine is likely. Need approval for the fast-track fee.",
    mode: MeetingMode.IN_PERSON,
    minutes: 15,
    preferred: { day: 1, time: "09:30" },
    urgent: true,
    askedAgo: 0.1,
    steps: [],
  },
  {
    requester: "ABG-7231",
    host: "ABG-5120",
    subject: "Canteen contract renewal",
    purpose: AppointmentPurpose.APPROVAL,
    agenda: "Renewal terms from the caterer and last quarter's hygiene audit.",
    mode: MeetingMode.IN_PERSON,
    minutes: 30,
    preferred: { day: -5, time: "14:00" },
    location: "Factory Admin Lead's office",
    askedAgo: 8,
    steps: [
      { to: S.CONFIRMED, by: "ABG-5120", ago: 7 },
      { to: S.COMPLETED, by: "ABG-5120", ago: 4.9, note: "Approved the 12-month renewal; send the signed copy to Admin." },
    ],
  },
  {
    requester: "ABG-8015",
    host: "ABG-1001",
    subject: "Warehouse racking safety",
    purpose: AppointmentPurpose.PROJECT_UPDATE,
    agenda: "Two racks bent by forklifts; quotation for guards and a load survey.",
    mode: MeetingMode.PHONE,
    minutes: 15,
    preferred: { day: -2, time: "12:00" },
    askedAgo: 4,
    steps: [{ to: S.DECLINED, by: "ABG-1001", ago: 3, note: "Bring this to Sunday's facilities meeting — I'll be there." }],
  },
  {
    requester: "ABG-6188",
    host: "ABG-1003",
    subject: "Dealer conference sponsorship",
    purpose: AppointmentPurpose.PROPOSAL,
    agenda: "Sponsorship packages for the national LPG dealer conference.",
    mode: MeetingMode.IN_PERSON,
    minutes: 30,
    preferred: { day: -1, time: "11:00" },
    askedAgo: 6,
    steps: [{ to: S.CANCELLED, by: "ABG-6188", ago: 2, note: "The conference moved to January; I'll ask again then." }],
  },
  {
    requester: "ABG-3550",
    host: "ABG-1001",
    subject: "Courier contract with REDX",
    purpose: AppointmentPurpose.APPROVAL,
    agenda: "Rates for inter-district documents and the SLA penalties.",
    mode: MeetingMode.IN_PERSON,
    minutes: 30,
    preferred: { day: 3, time: "12:00" },
    location: "Head of Administration, Level 3",
    askedAgo: 2.5,
    steps: [{ to: S.CONFIRMED, by: "ABG-1001", ago: 2 }],
  },
  {
    requester: "ABG-1001",
    host: "ABG-1002",
    subject: "Head-office security upgrade budget",
    purpose: AppointmentPurpose.APPROVAL,
    agenda: "CCTV replacement on Levels 1–9 and access control at the main gate.",
    mode: MeetingMode.IN_PERSON,
    minutes: 30,
    preferred: { day: 2, time: "16:00" },
    location: "MD's Office, Level 9",
    askedAgo: 3,
    steps: [{ to: S.CONFIRMED, by: "ABG-1002", ago: 2.8 }],
  },
  {
    requester: "ABG-2101",
    host: "ABG-1003",
    subject: "Long-service awards ceremony",
    purpose: AppointmentPurpose.COURTESY,
    agenda: "Invitation to present the 10- and 20-year service awards.",
    mode: MeetingMode.IN_PERSON,
    minutes: 15,
    preferred: { day: -10, time: "11:00" },
    location: "Chairman's Office, Level 9",
    askedAgo: 14,
    steps: [
      { to: S.CONFIRMED, by: PA, ago: 13 },
      { to: S.COMPLETED, by: PA, ago: 9.9, note: "The Chairman will attend on 12 November." },
    ],
  },
];

export async function seedAppointments(ctx: SeedContext) {
  const { prisma, now, users, employees } = ctx;
  const weekend = new Set<number>(DEFAULT_WEEKEND_DAYS);
  const holidays = new Set(PUBLIC_HOLIDAYS.map((h) => h.date));
  const today = new Date(`${dhakaIso.format(now)}T00:00:00.000Z`);
  const isWorking = (d: Date) => !weekend.has(d.getUTCDay()) && !holidays.has(d.toISOString().slice(0, 10));
  /** A Dhaka wall-clock time on the nth working day from today (past slots count calendar days back). */
  const at = (slot: Slot): Date => {
    let d = today;
    if (slot.day < 0) d = new Date(today.getTime() + slot.day * DAY);
    else {
      while (!isWorking(d)) d = new Date(d.getTime() + DAY);
      for (let n = 0; n < slot.day; ) {
        d = new Date(d.getTime() + DAY);
        if (isWorking(d)) n += 1;
      }
    }
    const [h, m] = slot.time.split(":").map(Number);
    const out = new Date(d.getTime() + (h - 6) * HOUR + m * 60_000);
    // Today's slot already gone: the same time on the next working day.
    if (slot.day === 0 && out.getTime() < now.getTime() + 30 * 60_000) return at({ day: 1, time: slot.time });
    return out;
  };

  const year = new Date(now.getTime() + 6 * HOUR).getUTCFullYear();
  let seq = 0;
  for (const seed of [...SEEDS].sort((a, b) => b.askedAgo - a.askedAgo)) {
    seq += 1;
    const ago = (days: number) => new Date(now.getTime() - days * DAY);
    const preferredAt = at(seed.preferred);
    const last = seed.steps[seed.steps.length - 1];
    const status = last?.to ?? S.PENDING;
    const proposal = seed.steps.find((s) => s.to === S.PROPOSED);
    const scheduledAt = proposal?.at ? at(proposal.at) : status === S.PENDING || status === S.DECLINED || status === S.CANCELLED ? null : preferredAt;
    const stamp = (to: AppointmentStatus) => {
      const s = seed.steps.find((x) => x.to === to);
      return s ? ago(s.ago) : null;
    };
    const requester = users[seed.requester];
    const host = users[seed.host];
    const appt = await prisma.appointment.create({
      data: {
        referenceNumber: formatAppointmentNumber(year, seq),
        subject: seed.subject,
        purpose: seed.purpose,
        agenda: seed.agenda,
        mode: seed.mode,
        durationMinutes: seed.minutes,
        preferredAt,
        alternativeAt: seed.alternative ? at(seed.alternative) : null,
        scheduledAt,
        location: seed.location ?? null,
        attendees: seed.attendees ?? [],
        urgent: !!seed.urgent,
        requesterUserId: requester.id,
        hostUserId: host.id,
        branchId: employees[seed.requester].branchId,
        status,
        statusNote: last?.note ?? null,
        statusChangedAt: last ? ago(last.ago) : ago(seed.askedAgo),
        respondedByName: seed.steps.filter((s) => s.by !== seed.requester).at(-1) ? users[seed.steps.filter((s) => s.by !== seed.requester).at(-1)!.by].name : null,
        confirmedAt: stamp(S.CONFIRMED),
        completedAt: stamp(S.COMPLETED),
        declinedAt: stamp(S.DECLINED),
        cancelledAt: stamp(S.CANCELLED),
        createdAt: ago(seed.askedAgo),
      },
    });
    await prisma.appointmentUpdate.create({
      data: { appointmentId: appt.id, type: AppointmentUpdateType.SUBMITTED, toStatus: S.PENDING, actorUserId: requester.id, actorName: requester.name, metadata: { host: host.name, preferredAt: preferredAt.toISOString() }, createdAt: ago(seed.askedAgo) },
    });
    let from: AppointmentStatus = S.PENDING;
    for (const step of seed.steps) {
      await prisma.appointmentUpdate.create({
        data: {
          appointmentId: appt.id,
          type: step.to === S.PROPOSED ? AppointmentUpdateType.TIME_PROPOSED : AppointmentUpdateType.STATUS_CHANGED,
          fromStatus: from,
          toStatus: step.to,
          note: step.note ?? null,
          actorUserId: users[step.by].id,
          actorName: users[step.by].name,
          metadata: step.at ? { scheduledAt: at(step.at).toISOString() } : {},
          createdAt: ago(step.ago),
        },
      });
      from = step.to;
    }

    const data = { module: "appointments", objectId: appt.id, reference: appt.referenceNumber, route: `/appointments/${appt.id}`, status };
    const send = (code: string, eventType: string, category: string, title: string, body: string, read = false) =>
      prisma.notification.create({
        data: { userId: users[code].id, eventType, category, title, body, data, readAt: read ? now : null, createdAt: appt.statusChangedAt, dedupeKey: `seed:appointment:${appt.referenceNumber}:${code}:${eventType}` },
      });
    const executive = seed.host === "ABG-1002" || seed.host === "ABG-1003";
    if (status === S.PENDING) {
      for (const code of executive ? [seed.host, PA] : [seed.host]) {
        await send(code, "APPOINTMENT_REQUESTED", NotificationCategory.ACTION_REQUIRED, `${seed.urgent ? "Urgent appointment" : "Appointment"} request${executive ? ` for ${host.name}` : ""}`, `${requester.name} · ${seed.subject} — ${meetingFmt.format(preferredAt)}. ${appt.referenceNumber}`);
      }
    } else if (status === S.PROPOSED) {
      await send(seed.requester, "APPOINTMENT_PROPOSED", NotificationCategory.ACTION_REQUIRED, "A new time is proposed", `${seed.subject} with ${host.name} — ${meetingFmt.format(scheduledAt!)}? ${last!.note} ${appt.referenceNumber}`);
    } else if (status === S.CONFIRMED) {
      await send(seed.requester, "APPOINTMENT_CONFIRMED", NotificationCategory.PARCEL_UPDATE, "Meeting confirmed", `${seed.subject} with ${host.name} — ${meetingFmt.format(scheduledAt!)}${seed.location ? ` · ${seed.location}` : ""}. ${appt.referenceNumber}`);
    } else if (status === S.DECLINED) {
      await send(seed.requester, "APPOINTMENT_DECLINED", NotificationCategory.PARCEL_UPDATE, "Appointment declined", `${seed.subject} with ${host.name} — ${last!.note} ${appt.referenceNumber}`, true);
    }
  }

  await prisma.trackingSequence.upsert({
    where: { branchCode_dayStamp: { branchCode: "AP", dayStamp: String(year) } },
    create: { branchCode: "AP", dayStamp: String(year), lastValue: seq },
    update: { lastValue: seq },
  });
}
