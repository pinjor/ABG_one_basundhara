import {
  DEFAULT_WEEKEND_DAYS,
  LEAVE_SETTING_HOLIDAYS,
  LEAVE_SETTING_WEEKEND,
  LEAVE_TYPE_LABEL,
  LEAVE_TYPE_RULES,
  LeaveStatus,
  LeaveType,
  LeaveUpdateType,
  NotificationCategory,
  countLeaveDays,
  formatLeaveDays,
  formatLeaveNumber,
  type HalfDaySession,
  type PublicHoliday,
} from "@abg-dispatch/shared";
import { DAY, type SeedContext } from "./context";

/**
 * Demo data: leave applications across every stage, dated relative to today
 * (Asia/Dhaka) so the board always looks current — two people away today,
 * applications waiting for their heads of department and for HR, a maternity
 * leave on its way to HR, history, a rejection and a cancellation.
 */

/** Public holidays as announced for 2026, and the first of 2027. HR keeps this list. */
export const PUBLIC_HOLIDAYS: PublicHoliday[] = [
  { date: "2026-02-21", name: "Shaheed Day and International Mother Language Day" },
  { date: "2026-03-20", name: "Eid-ul-Fitr" },
  { date: "2026-03-21", name: "Eid-ul-Fitr" },
  { date: "2026-03-22", name: "Eid-ul-Fitr" },
  { date: "2026-03-26", name: "Independence Day" },
  { date: "2026-04-14", name: "Pohela Boishakh (Bengali New Year)" },
  { date: "2026-05-01", name: "May Day" },
  { date: "2026-05-26", name: "Eid-ul-Azha" },
  { date: "2026-05-27", name: "Eid-ul-Azha" },
  { date: "2026-05-28", name: "Eid-ul-Azha" },
  { date: "2026-08-05", name: "July Mass Uprising Day" },
  { date: "2026-08-26", name: "Eid-e-Miladunnabi" },
  { date: "2026-10-20", name: "Durga Puja (Bijoya Dashami)" },
  { date: "2026-12-16", name: "Victory Day" },
  { date: "2026-12-25", name: "Christmas Day" },
  { date: "2027-02-21", name: "Shaheed Day and International Mother Language Day" },
  { date: "2027-03-26", name: "Independence Day" },
  { date: "2027-04-14", name: "Pohela Boishakh (Bengali New Year)" },
  { date: "2027-05-01", name: "May Day" },
];

const dhakaIso = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka", year: "numeric", month: "2-digit", day: "2-digit" });
const iso = (d: Date) => d.toISOString().slice(0, 10);
const plus = (d: Date, n: number) => new Date(d.getTime() + n * DAY);

interface Step {
  to: LeaveStatus;
  /** Employee code of who made the move. */
  by: string;
  /** Days before now. */
  ago: number;
  note?: string;
}

interface LeaveSeed {
  applicant: string;
  approver: string;
  type: LeaveType;
  /** First day, in days from today; moved forward to the next working day. */
  start: number;
  /** Working days (calendar days for maternity). */
  length: number;
  halfDay?: HalfDaySession;
  reason: string;
  reliever?: string;
  address?: string;
  /** Days before now the application was made. */
  appliedAgo: number;
  steps: Step[];
}

const S = LeaveStatus;
const HR_NUSRAT = "ABG-2055";
const HR_SADIA = "ABG-2101";

const SEEDS: LeaveSeed[] = [
  {
    applicant: "ABG-2041",
    approver: "ABG-2210",
    type: LeaveType.EARNED,
    start: -70,
    length: 5,
    reason: "Family visit to Sylhet",
    address: "Zindabazar, Sylhet",
    appliedAgo: 80,
    steps: [
      { to: S.PENDING_HR, by: "ABG-2210", ago: 79 },
      { to: S.APPROVED, by: HR_SADIA, ago: 78 },
    ],
  },
  { applicant: "ABG-2041", approver: "ABG-2210", type: LeaveType.CASUAL, start: 3, length: 2, reason: "My sister's wedding in Cumilla", address: "Kandirpar, Cumilla", appliedAgo: 0.2, steps: [] },
  {
    applicant: "ABG-7310",
    approver: "ABG-7231",
    type: LeaveType.SICK,
    start: -1,
    length: 3,
    reason: "Fever and throat infection — the doctor advised three days' rest",
    appliedAgo: 1.2,
    steps: [
      { to: S.PENDING_HR, by: "ABG-7231", ago: 1.1, note: "Get well soon. Kamrul covers the front office." },
      { to: S.APPROVED, by: HR_NUSRAT, ago: 1.0 },
    ],
  },
  {
    applicant: "ABG-7420",
    approver: "ABG-7455",
    type: LeaveType.EARNED,
    start: 14,
    length: 6,
    reason: "Visiting my parents in Rajshahi",
    reliever: "ABG-7333",
    address: "Shaheb Bazar, Rajshahi",
    appliedAgo: 3,
    steps: [{ to: S.PENDING_HR, by: "ABG-7455", ago: 2.5, note: "Production plan adjusted; Monir Hossain runs the shift." }],
  },
  { applicant: "ABG-6021", approver: "ABG-2210", type: LeaveType.CASUAL, start: 1, length: 1, halfDay: "FIRST_HALF", reason: "Bank work for the home-loan documents", appliedAgo: 0.1, steps: [] },
  {
    applicant: "ABG-6150",
    approver: "ABG-2101",
    type: LeaveType.EARNED,
    start: 50,
    length: 6,
    reason: "Annual family holiday in Cox's Bazar",
    address: "Kolatoli, Cox's Bazar",
    appliedAgo: 10,
    steps: [
      { to: S.PENDING_HR, by: "ABG-2101", ago: 9 },
      // Sadia approved as head of department, so the HR approval is Nusrat's.
      { to: S.APPROVED, by: HR_NUSRAT, ago: 8 },
    ],
  },
  {
    applicant: "ABG-6188",
    approver: "ABG-2210",
    type: LeaveType.CASUAL,
    start: -6,
    length: 2,
    reason: "Personal work in Chattogram",
    appliedAgo: 9,
    steps: [{ to: S.REJECTED, by: "ABG-2210", ago: 8.5, note: "Quarter-end dealer meetings that week — please move it to next month." }],
  },
  {
    applicant: "ABG-8015",
    approver: "ABG-1001",
    type: LeaveType.PATERNITY,
    start: -2,
    length: 5,
    reason: "Birth of our daughter",
    address: "Tongi, Gazipur",
    appliedAgo: 4,
    steps: [
      { to: S.PENDING_HR, by: "ABG-1001", ago: 3.9, note: "Congratulations!" },
      { to: S.APPROVED, by: HR_SADIA, ago: 3.8 },
    ],
  },
  {
    applicant: "ABG-2305",
    approver: "ABG-2055",
    type: LeaveType.SICK,
    start: -20,
    length: 2,
    reason: "Food poisoning",
    appliedAgo: 21,
    steps: [{ to: S.CANCELLED, by: "ABG-2305", ago: 20.5, note: "Recovered — back at work tomorrow." }],
  },
  { applicant: "ABG-3550", approver: "ABG-1001", type: LeaveType.EARNED, start: 10, length: 4, reason: "Home visit to Bogura", reliever: "ABG-4832", address: "Satmatha, Bogura", appliedAgo: 1, steps: [] },
  {
    applicant: "ABG-4832",
    approver: "ABG-3550",
    type: LeaveType.CASUAL,
    start: -30,
    length: 1,
    reason: "National ID correction at the election office",
    appliedAgo: 32,
    steps: [
      { to: S.PENDING_HR, by: "ABG-3550", ago: 31.5 },
      { to: S.APPROVED, by: HR_SADIA, ago: 31 },
    ],
  },
  { applicant: "ABG-5205", approver: "ABG-5120", type: LeaveType.CASUAL, start: 5, length: 2, reason: "My son's school admission in Narayanganj", appliedAgo: 0.5, steps: [] },
  {
    applicant: "ABG-2101",
    approver: "ABG-2210",
    type: LeaveType.EARNED,
    start: 21,
    length: 5,
    reason: "Umrah with my mother",
    reliever: "ABG-2120",
    appliedAgo: 6,
    steps: [
      { to: S.PENDING_HR, by: "ABG-2210", ago: 5 },
      { to: S.APPROVED, by: HR_NUSRAT, ago: 4 },
    ],
  },
  {
    applicant: "ABG-6110",
    approver: "ABG-1002",
    type: LeaveType.MATERNITY,
    start: 25,
    length: 112,
    reason: "Expected delivery in the last week of November",
    address: "Uttara Sector 7, Dhaka",
    appliedAgo: 2,
    steps: [{ to: S.PENDING_HR, by: "ABG-1002", ago: 1.5, note: "Best wishes — take the full leave." }],
  },
  {
    applicant: "ABG-7231",
    approver: "ABG-5120",
    type: LeaveType.EARNED,
    start: 40,
    length: 3,
    reason: "Attending a family wedding in Khulna",
    reliever: "ABG-7310",
    appliedAgo: 4,
    steps: [{ to: S.PENDING_HR, by: "ABG-5120", ago: 3 }],
  },
  {
    applicant: "ABG-2055",
    approver: "ABG-2210",
    type: LeaveType.CASUAL,
    start: -12,
    length: 1,
    reason: "Parent–teacher meeting",
    appliedAgo: 14,
    steps: [
      { to: S.PENDING_HR, by: "ABG-2210", ago: 13.5 },
      { to: S.APPROVED, by: HR_SADIA, ago: 13 },
    ],
  },
];

export async function seedLeave(ctx: SeedContext) {
  const { prisma, now, users, employees } = ctx;
  const weekend = new Set<number>(DEFAULT_WEEKEND_DAYS);
  const holidaySet = new Set(PUBLIC_HOLIDAYS.map((h) => h.date));
  const isWorking = (d: Date) => !weekend.has(d.getUTCDay()) && !holidaySet.has(iso(d));
  const today = new Date(`${dhakaIso.format(now)}T00:00:00.000Z`);

  await prisma.appSetting.upsert({ where: { key: LEAVE_SETTING_WEEKEND }, create: { key: LEAVE_SETTING_WEEKEND, value: [...DEFAULT_WEEKEND_DAYS], updatedBy: "Sadia Rahman" }, update: { value: [...DEFAULT_WEEKEND_DAYS] } });
  await prisma.appSetting.upsert({
    where: { key: LEAVE_SETTING_HOLIDAYS },
    create: { key: LEAVE_SETTING_HOLIDAYS, value: PUBLIC_HOLIDAYS as unknown as object, updatedBy: "Sadia Rahman" },
    update: { value: PUBLIC_HOLIDAYS as unknown as object },
  });

  // Four days of 2025's earned leave carried forward for Md. Rahim.
  const year = today.getUTCFullYear();
  await prisma.leaveEntitlement.create({ data: { userId: users["ABG-2041"].id, year, type: LeaveType.EARNED, days: 22, note: "18 days plus 4 carried forward from last year", updatedBy: "Sadia Rahman" } });

  const span = (seed: LeaveSeed) => {
    let start = plus(today, seed.start);
    if (LEAVE_TYPE_RULES[seed.type].calendarDays) return { start, end: plus(start, seed.length - 1) };
    while (!isWorking(start)) start = plus(start, 1);
    let end = start;
    for (let n = 1; n < seed.length; ) {
      end = plus(end, 1);
      if (isWorking(end)) n += 1;
    }
    return { start, end };
  };

  const sequences = new Map<number, number>();
  const ordered = [...SEEDS].sort((a, b) => b.appliedAgo - a.appliedAgo);
  for (const seed of ordered) {
    const { start, end } = span(seed);
    const leaveYear = start.getUTCFullYear();
    const seq = (sequences.get(leaveYear) ?? 0) + 1;
    sequences.set(leaveYear, seq);
    const days = countLeaveDays(iso(start), iso(end), { type: seed.type, halfDay: seed.halfDay, weekendDays: [...weekend], holidays: [...holidaySet] });
    const at = (ago: number) => new Date(now.getTime() - ago * DAY);
    const last = seed.steps[seed.steps.length - 1];
    const status = last?.to ?? S.PENDING_HOD;
    const stamp = (to: LeaveStatus) => {
      const step = seed.steps.find((s) => s.to === to);
      return step ? at(step.ago) : null;
    };
    const applicant = users[seed.applicant];
    const emp = employees[seed.applicant];
    const leave = await prisma.leaveRequest.create({
      data: {
        referenceNumber: formatLeaveNumber(leaveYear, seq),
        type: seed.type,
        startDate: start,
        endDate: end,
        halfDay: seed.halfDay ?? null,
        days,
        year: leaveYear,
        reason: seed.reason,
        addressDuringLeave: seed.address ?? null,
        applicantUserId: applicant.id,
        branchId: emp.branchId,
        departmentId: emp.departmentId,
        approverUserId: users[seed.approver].id,
        relieverEmployeeId: seed.reliever ? employees[seed.reliever].id : null,
        status,
        statusNote: last?.note ?? null,
        statusChangedAt: last ? at(last.ago) : at(seed.appliedAgo),
        hodApprovedAt: seed.steps.find((s) => s.to === S.PENDING_HR) ? at(seed.steps.find((s) => s.to === S.PENDING_HR)!.ago) : null,
        approvedAt: stamp(S.APPROVED),
        rejectedAt: stamp(S.REJECTED),
        cancelledAt: stamp(S.CANCELLED),
        createdAt: at(seed.appliedAgo),
      },
    });
    await prisma.leaveUpdate.create({
      data: { leaveId: leave.id, type: LeaveUpdateType.SUBMITTED, toStatus: S.PENDING_HOD, actorUserId: applicant.id, actorName: applicant.name, metadata: { approver: users[seed.approver].name, days }, createdAt: at(seed.appliedAgo) },
    });
    let from: LeaveStatus = S.PENDING_HOD;
    for (const step of seed.steps) {
      await prisma.leaveUpdate.create({
        data: { leaveId: leave.id, type: LeaveUpdateType.STATUS_CHANGED, fromStatus: from, toStatus: step.to, note: step.note ?? null, actorUserId: users[step.by].id, actorName: users[step.by].name, createdAt: at(step.ago) },
      });
      from = step.to;
    }

    // Inbox: who has to act now, and the latest news for the applicant.
    const what = `${LEAVE_TYPE_LABEL[seed.type]}, ${days === 0.5 ? "half a day" : formatLeaveDays(days)}`;
    const data = { module: "leave", objectId: leave.id, reference: leave.referenceNumber, route: `/leave/${leave.id}`, status };
    const send = (code: string, eventType: string, category: string, title: string, body: string, read = false) =>
      prisma.notification.create({
        data: { userId: users[code].id, eventType, category, title, body, data, readAt: read ? now : null, createdAt: leave.statusChangedAt, dedupeKey: `seed:leave:${leave.referenceNumber}:${code}:${eventType}` },
      });
    if (status === S.PENDING_HOD) {
      await send(seed.approver, "LEAVE_SUBMITTED", NotificationCategory.ACTION_REQUIRED, "Leave application needs your approval", `${applicant.name} · ${what} — ${seed.reason}. ${leave.referenceNumber}`);
    } else if (status === S.PENDING_HR) {
      for (const code of [HR_NUSRAT, HR_SADIA].filter((c) => c !== seed.applicant && c !== seed.approver)) {
        await send(code, "LEAVE_APPROVAL_REQUIRED", NotificationCategory.ACTION_REQUIRED, "Leave needs HR approval", `${applicant.name} · ${what}. ${leave.referenceNumber}`);
      }
      await send(seed.applicant, "LEAVE_UPDATED", NotificationCategory.PARCEL_UPDATE, "Approved by your head of department", `${what} — next: HR approval. ${leave.referenceNumber}`, true);
    } else if (status === S.APPROVED && seed.appliedAgo < 15) {
      await send(seed.applicant, "LEAVE_UPDATED", NotificationCategory.PARCEL_UPDATE, "Leave approved", `${what} is approved. ${leave.referenceNumber}`);
    } else if (status === S.REJECTED) {
      await send(seed.applicant, "LEAVE_UPDATED", NotificationCategory.PARCEL_UPDATE, "Leave not approved", `${what} — ${last!.note} ${leave.referenceNumber}`, true);
    }
  }

  for (const [y, value] of sequences) {
    await prisma.trackingSequence.upsert({
      where: { branchCode_dayStamp: { branchCode: "LV", dayStamp: String(y) } },
      create: { branchCode: "LV", dayStamp: String(y), lastValue: value },
      update: { lastValue: value },
    });
  }
}
