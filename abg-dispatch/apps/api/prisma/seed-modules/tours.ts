import {
  DEFAULT_ANNUAL_TRAVEL_BUDGET,
  NotificationCategory,
  TOUR_SETTING_ANNUAL_BUDGET,
  TourPurpose,
  TourStatus,
  TourType,
  TourUpdateType,
  TransportMode,
  formatTaka,
  formatTourNumber,
} from "@abg-dispatch/shared";
import { DAY, type SeedContext } from "./context";

/**
 * Demo data: official tour requests across every status, for an oil & gas /
 * manufacturing group. Dates are relative to "today" in Asia/Dhaka, so the
 * board always looks current: two engineers abroad right now, an overseas
 * vendor audit waiting for the MD / Chairman, a Mongla depot visit with
 * HR & Finance, requests waiting for their heads of department, and history.
 */

const HOUR = DAY / 24;
const dhakaIso = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka", year: "numeric", month: "2-digit", day: "2-digit" });
const dhakaYear = (d: Date) => new Date(d.getTime() + 6 * HOUR).getUTCFullYear();
/** A calendar date `offset` days from today (Dhaka), as a UTC-midnight Date for @db.Date columns. */
const dateFrom = (now: Date, offset: number) => new Date(new Date(`${dhakaIso.format(now)}T00:00:00.000Z`).getTime() + offset * DAY);
const addMonths = (d: Date, months: number) => {
  const out = new Date(d);
  out.setUTCMonth(out.getUTCMonth() + months);
  return out;
};

interface Step {
  to: TourStatus;
  /** Employee code of who made the move. */
  by: string;
  /** Days before now (fractions allowed). */
  ago: number;
  note?: string;
  /** Sanctioned amount set at this step (vetting or sanction). */
  budget?: number;
}

interface TourSeed {
  traveller: string;
  approver: string;
  type: TourType;
  purpose: TourPurpose;
  title: string;
  description: string;
  destination: string;
  country?: string;
  /** Start, in days from today; negative = already begun or past. */
  start: number;
  days: number;
  transport: TransportMode;
  coTravellers?: string[];
  estimated: number;
  advance?: number;
  /** Overseas only: number and months of validity left after the return date. */
  passport?: { number: string; monthsAfterReturn: number };
  createdAgo: number;
  steps: Step[];
}

const S = TourStatus;

const TOURS: TourSeed[] = [
  {
    traveller: "ABG-1001", // Arif Chowdhury, Head of Administration
    approver: "ABG-1002", // MD
    type: TourType.FOREIGN,
    purpose: TourPurpose.TECHNICAL_INSPECTION,
    title: "Factory acceptance test — LPG cylinder production line",
    description: "Witness the factory acceptance test of the new 12 kg cylinder welding and hydro-test line before shipment, and agree the installation schedule for Factory A.",
    destination: "Shanghai",
    country: "China",
    start: -60,
    days: 7,
    transport: TransportMode.AIR,
    coTravellers: ["Engr. Mahbub Alam (Quality, Factory A)"],
    estimated: 540_000,
    advance: 200_000,
    passport: { number: "A03718452", monthsAfterReturn: 38 },
    createdAgo: 75,
    steps: [
      { to: S.PENDING_VETTING, by: "ABG-1002", ago: 74.2, note: "Approved. Take the QA engineer — the welds need a second pair of eyes." },
      { to: S.PENDING_SANCTION, by: "ABG-2055", ago: 72.5, budget: 520_000, note: "Hotel capped at the group rate; per diem as per the overseas policy." },
      { to: S.APPROVED, by: "ABG-1003", ago: 70.1, note: "Sanctioned." },
      { to: S.ACTIVE, by: "ABG-1001", ago: 60 - 0.25 },
      { to: S.COMPLETED, by: "ABG-1001", ago: 52.6, note: "Back in Dhaka. FAT passed with two punch-list items; the report is with Procurement." },
    ],
  },
  {
    traveller: "ABG-2041", // Md. Rahim, Legal
    approver: "ABG-2210", // Farid Uddin
    type: TourType.LOCAL,
    purpose: TourPurpose.OTHER,
    title: "Land registry verification — Rajshahi solar site",
    description: "Verify the mutation records and deeds for the 14-acre solar site at the Rajshahi sub-registry office before the lease is signed.",
    destination: "Rajshahi",
    start: -30,
    days: 3,
    transport: TransportMode.RAIL,
    estimated: 22_000,
    advance: 10_000,
    createdAgo: 38,
    steps: [
      { to: S.PENDING_VETTING, by: "ABG-2210", ago: 37.3 },
      { to: S.APPROVED, by: "ABG-2101", ago: 36.1, budget: 22_000 },
      { to: S.ACTIVE, by: "ABG-2041", ago: 30 - 0.3 },
      { to: S.COMPLETED, by: "ABG-2041", ago: 27.4, note: "Records verified; certified copies collected." },
    ],
  },
  {
    traveller: "ABG-6150", // Laila Rahman, HR Executive (Dhaka Branch)
    approver: "ABG-2101", // Sadia Rahman
    type: TourType.LOCAL,
    purpose: TourPurpose.OTHER,
    title: "Campus recruitment drive — Rajshahi University",
    description: "Graduate engineer recruitment stall and first-round interviews at the university career fair.",
    destination: "Rajshahi University",
    start: 12,
    days: 2,
    transport: TransportMode.ROAD,
    coTravellers: ["Taslima Nasrin"],
    estimated: 30_000,
    createdAgo: 20,
    steps: [
      { to: S.PENDING_VETTING, by: "ABG-2101", ago: 19.4 },
      { to: S.APPROVED, by: "ABG-2055", ago: 18.2, budget: 30_000 },
      { to: S.CANCELLED, by: "ABG-6150", ago: 5.1, note: "The university moved its career fair to February; I will apply again then." },
    ],
  },
  {
    traveller: "ABG-2400", // Shirin Akhter, Compliance
    approver: "ABG-2210",
    type: TourType.FOREIGN,
    purpose: TourPurpose.TRAINING,
    title: "ISO 45001 lead auditor course",
    description: "Five-day certified lead auditor course for occupational health and safety management systems.",
    destination: "Kuala Lumpur",
    country: "Malaysia",
    start: 40,
    days: 5,
    transport: TransportMode.AIR,
    estimated: 260_000,
    advance: 100_000,
    passport: { number: "EB0571824", monthsAfterReturn: 51 },
    createdAgo: 9,
    steps: [
      { to: S.PENDING_VETTING, by: "ABG-2210", ago: 8.2, note: "Supported — we need an in-house lead auditor before the next DIFE inspection." },
      { to: S.REJECTED, by: "ABG-2055", ago: 6.3, note: "Not in this year's training budget. The same certified course runs in Dhaka in January — please apply for that one instead." },
    ],
  },
  {
    traveller: "ABG-2210", // Farid Uddin, Executive Director
    approver: "ABG-1002", // MD
    type: TourType.FOREIGN,
    purpose: TourPurpose.CONFERENCE,
    title: "Asia LNG & LPG trading summit",
    description: "Panel on LPG import logistics for South Asia and meetings with two Gulf suppliers on next year's term contract.",
    destination: "Singapore",
    country: "Singapore",
    start: -1,
    days: 5,
    transport: TransportMode.AIR,
    estimated: 380_000,
    advance: 150_000,
    passport: { number: "A02918346", monthsAfterReturn: 44 },
    createdAgo: 21,
    steps: [
      { to: S.PENDING_VETTING, by: "ABG-1002", ago: 20.3 },
      { to: S.PENDING_SANCTION, by: "ABG-2101", ago: 19.1, budget: 360_000, note: "Registration paid by the organisers; budget trimmed accordingly." },
      { to: S.APPROVED, by: "ABG-1003", ago: 17.2 },
      { to: S.ACTIVE, by: "ABG-2210", ago: 1 + 0.2 },
    ],
  },
  {
    traveller: "ABG-6188", // Nazmul Karim, Sales Manager
    approver: "ABG-2210",
    type: TourType.FOREIGN,
    purpose: TourPurpose.CLIENT_MEETING,
    title: "LPG export buyer meetings",
    description: "Meetings with three Jebel Ali distributors on bottled LPG supply, and a visit to one buyer's filling plant.",
    destination: "Dubai",
    country: "United Arab Emirates",
    start: -3,
    days: 7,
    transport: TransportMode.AIR,
    coTravellers: ["Rashed Khan (Treasury)"],
    estimated: 320_000,
    advance: 120_000,
    passport: { number: "A05530917", monthsAfterReturn: 29 },
    createdAgo: 16,
    steps: [
      { to: S.PENDING_VETTING, by: "ABG-2210", ago: 15.2 },
      { to: S.PENDING_SANCTION, by: "ABG-2055", ago: 14.1, budget: 300_000 },
      { to: S.APPROVED, by: "ABG-1002", ago: 12.3, note: "Sanctioned. Share the buyer minutes with me on return." },
      { to: S.ACTIVE, by: "ABG-6188", ago: 3 + 0.15 },
    ],
  },
  {
    traveller: "ABG-2041", // Md. Rahim
    approver: "ABG-2210",
    type: TourType.LOCAL,
    purpose: TourPurpose.PLANT_VISIT,
    title: "Lease & title review — Chattogram LPG refinery and plant",
    description: "Review the port land lease renewal and the title documents for the bottling plant extension with the plant manager and the port authority's estate office.",
    destination: "Chattogram — LPG refinery & bottling plant, Patenga",
    start: 6,
    days: 3,
    transport: TransportMode.AIR,
    estimated: 48_000,
    advance: 20_000,
    createdAgo: 6,
    steps: [
      { to: S.PENDING_VETTING, by: "ABG-2210", ago: 5.2 },
      { to: S.APPROVED, by: "ABG-2055", ago: 4.1, budget: 45_000, note: "Approved at ৳ 45,000 — the plant guest house is available, so hotel is not needed." },
    ],
  },
  {
    traveller: "ABG-2305", // Mehedi Hasan, Procurement
    approver: "ABG-2055", // Nusrat Jahan
    type: TourType.FOREIGN,
    purpose: TourPurpose.VENDOR_AUDIT,
    title: "Compressor vendor audit & Gastech follow-up",
    description: "Supplier audit of two LPG compressor and valve manufacturers ahead of the terminal expansion tender, with follow-up meetings from Gastech.",
    destination: "Frankfurt",
    country: "Germany",
    start: 24,
    days: 6,
    transport: TransportMode.AIR,
    coTravellers: ["Engr. Monir Hossain (Factory A)"],
    estimated: 485_000,
    advance: 150_000,
    // Expires four months after the return date: flagged for renewal.
    passport: { number: "A01847263", monthsAfterReturn: 4 },
    createdAgo: 5,
    steps: [
      { to: S.PENDING_VETTING, by: "ABG-2055", ago: 4.3, note: "Approved — this audit is a tender requirement." },
      { to: S.PENDING_SANCTION, by: "ABG-2101", ago: 2.2, budget: 460_000, note: "Vetted at ৳ 4,60,000 (economy fares). Passport needs renewal before the visa appointment." },
    ],
  },
  {
    traveller: "ABG-8015", // Selim Reza, Warehouse Supervisor
    approver: "ABG-1001", // Arif Chowdhury
    type: TourType.LOCAL,
    purpose: TourPurpose.PLANT_VISIT,
    title: "Stock reconciliation — Mongla terminal depot",
    description: "Quarter-end physical count of cylinders and valves at the Mongla port depot and reconciliation with the ERP.",
    destination: "Mongla terminal depot",
    start: 9,
    days: 4,
    transport: TransportMode.ROAD,
    estimated: 36_500,
    advance: 15_000,
    createdAgo: 3,
    steps: [{ to: S.PENDING_VETTING, by: "ABG-1001", ago: 2.1, note: "Approved — please also check the fire extinguisher log at the depot." }],
  },
  {
    traveller: "ABG-7420", // Imran Hossain, Production Manager (Factory B)
    approver: "ABG-7455", // Tahmina Begum
    type: TourType.FOREIGN,
    purpose: TourPurpose.TRAINING,
    title: "Bottling-line commissioning training",
    description: "Hands-on commissioning and maintenance training on the carousel filling machine ordered for Factory B.",
    destination: "Chennai",
    country: "India",
    start: 30,
    days: 7,
    transport: TransportMode.AIR,
    estimated: 210_000,
    advance: 80_000,
    passport: { number: "A04402871", monthsAfterReturn: 3 },
    createdAgo: 1,
    steps: [],
  },
  {
    traveller: "ABG-7231", // Farhana Islam, Factory A
    approver: "ABG-5120", // Sabina Yasmin
    type: TourType.LOCAL,
    purpose: TourPurpose.TRAINING,
    title: "Fire-safety & DIFE compliance training",
    description: "Two-day fire-safety officer refresher and DIFE compliance workshop for factory administrators.",
    destination: "Sylhet",
    start: 14,
    days: 3,
    transport: TransportMode.RAIL,
    estimated: 28_000,
    advance: 10_000,
    createdAgo: 0.3,
    steps: [],
  },
  {
    traveller: "ABG-6021", // Jamal Uddin, Accounts
    approver: "ABG-2210", // Farid Uddin
    type: TourType.LOCAL,
    purpose: TourPurpose.PLANT_VISIT,
    title: "Quarterly depot stock audit — Bogura",
    description: "Cash and cylinder stock audit at the Bogura distribution depot with the area sales office.",
    destination: "Bogura distribution depot",
    start: 5,
    days: 2,
    transport: TransportMode.POOL_CAR,
    estimated: 18_500,
    createdAgo: 0.1,
    steps: [],
  },
];

/** Reference numbers carry on from earlier in the year. */
const FIRST_NUMBER = 79;

export async function seedTours(ctx: SeedContext): Promise<void> {
  const { prisma, now, users, employees } = ctx;
  const at = (ago: number) => new Date(now.getTime() - ago * DAY);
  const counters = new Map<number, number>();

  for (const seed of [...TOURS].sort((a, b) => b.createdAgo - a.createdAgo)) {
    const traveller = users[seed.traveller];
    const employee = employees[seed.traveller];
    const createdAt = at(seed.createdAgo);
    const year = dhakaYear(createdAt);
    const n = (counters.get(year) ?? FIRST_NUMBER - 1) + 1;
    counters.set(year, n);

    const startDate = dateFrom(now, seed.start);
    const endDate = dateFrom(now, seed.start + seed.days - 1);
    const last = seed.steps[seed.steps.length - 1];
    const status = last?.to ?? S.PENDING_HOD;
    const stepTo = (to: TourStatus) => seed.steps.find((s) => s.to === to);
    const approvalFrom = (from: TourStatus) => {
      // The step that moved the request out of `from` (not a rejection or cancellation).
      const order = [S.PENDING_HOD, ...seed.steps.map((s) => s.to)];
      const i = order.indexOf(from);
      const next = i >= 0 ? seed.steps[i] : undefined;
      return next && next.to !== S.REJECTED && next.to !== S.CANCELLED ? next : undefined;
    };
    const budget = seed.steps.reduce<number | null>((b, s) => s.budget ?? b, null);
    const vetting = approvalFrom(S.PENDING_VETTING);

    const tour = await prisma.tourRequest.create({
      data: {
        referenceNumber: formatTourNumber(year, n),
        type: seed.type,
        purpose: seed.purpose,
        title: seed.title,
        description: seed.description,
        destination: seed.destination,
        country: seed.country ?? null,
        startDate,
        endDate,
        transportMode: seed.transport,
        travellerUserId: traveller.id,
        branchId: employee.branchId,
        departmentId: employee.departmentId,
        coTravellers: seed.coTravellers ?? [],
        estimatedBudget: seed.estimated,
        advanceRequested: seed.advance ?? 0,
        sanctionedBudget: budget,
        passportNumber: seed.passport?.number ?? null,
        passportExpiry: seed.passport ? addMonths(endDate, seed.passport.monthsAfterReturn) : null,
        approverUserId: users[seed.approver].id,
        status,
        statusNote: last && last.to !== S.ACTIVE && last.to !== S.COMPLETED ? (last.note ?? null) : null,
        statusChangedAt: last ? at(last.ago) : createdAt,
        hodApprovedAt: approvalFrom(S.PENDING_HOD) ? at(approvalFrom(S.PENDING_HOD)!.ago) : null,
        vettedAt: vetting ? at(vetting.ago) : null,
        sanctionedAt: approvalFrom(S.PENDING_SANCTION) ? at(approvalFrom(S.PENDING_SANCTION)!.ago) : null,
        startedAt: stepTo(S.ACTIVE) ? at(stepTo(S.ACTIVE)!.ago) : null,
        completedAt: stepTo(S.COMPLETED) ? at(stepTo(S.COMPLETED)!.ago) : null,
        rejectedAt: stepTo(S.REJECTED) ? at(stepTo(S.REJECTED)!.ago) : null,
        cancelledAt: stepTo(S.CANCELLED) ? at(stepTo(S.CANCELLED)!.ago) : null,
        createdAt,
      },
    });

    await prisma.tourUpdate.create({
      data: {
        tourId: tour.id,
        type: TourUpdateType.SUBMITTED,
        toStatus: S.PENDING_HOD,
        actorUserId: traveller.id,
        actorName: traveller.name,
        metadata: { approver: users[seed.approver].name, estimatedBudget: seed.estimated, advanceRequested: seed.advance ?? 0 },
        createdAt,
      },
    });
    let from: TourStatus = S.PENDING_HOD;
    let sanctioned: number | null = null;
    for (const step of seed.steps) {
      const by = users[step.by];
      const when = at(step.ago);
      const decision = from === S.PENDING_HOD || from === S.PENDING_VETTING || from === S.PENDING_SANCTION;
      await prisma.tourUpdate.create({
        data: {
          tourId: tour.id,
          type: TourUpdateType.STATUS_CHANGED,
          fromStatus: from,
          toStatus: step.to,
          note: step.note ?? null,
          actorUserId: by.id,
          actorName: by.name,
          metadata: decision
            ? { decision: step.to === S.REJECTED ? "REJECT" : "APPROVE", stage: from === S.PENDING_HOD ? "HOD" : from === S.PENDING_VETTING ? "VETTING" : "SANCTION", sanctionedBudget: step.budget ?? sanctioned }
            : {},
          createdAt: when,
        },
      });
      if (step.budget !== undefined && step.budget !== sanctioned) {
        await prisma.tourUpdate.create({
          data: {
            tourId: tour.id,
            type: TourUpdateType.BUDGET_CHANGED,
            actorUserId: by.id,
            actorName: by.name,
            metadata: { before: sanctioned, after: step.budget, estimated: seed.estimated, stage: from === S.PENDING_VETTING ? "VETTING" : "SANCTION" },
            createdAt: new Date(when.getTime() + 1),
          },
        });
        sanctioned = step.budget;
      }
      from = step.to;
    }

    await notify(ctx, tour, seed, status, budget);
  }

  // New requests carry on the numbering.
  for (const [year, value] of counters) {
    await prisma.trackingSequence.upsert({
      where: { branchCode_dayStamp: { branchCode: "TR", dayStamp: String(year) } },
      create: { branchCode: "TR", dayStamp: String(year), lastValue: value },
      update: { lastValue: value },
    });
  }

  await prisma.appSetting.upsert({
    where: { key: TOUR_SETTING_ANNUAL_BUDGET },
    create: { key: TOUR_SETTING_ANNUAL_BUDGET, value: DEFAULT_ANNUAL_TRAVEL_BUDGET, updatedBy: "Seed" },
    update: { value: DEFAULT_ANNUAL_TRAVEL_BUDGET, updatedBy: "Seed" },
  });
}

/** Inbox items: whoever must decide next, and the traveller for recent outcomes. */
async function notify(
  ctx: SeedContext,
  tour: { id: string; referenceNumber: string; title: string; destination: string; country: string | null; estimatedBudget: number; startDate: Date; endDate: Date; statusChangedAt: Date },
  seed: TourSeed,
  status: TourStatus,
  budget: number | null,
) {
  const { prisma, users } = ctx;
  const where = tour.country ? `${tour.destination}, ${tour.country}` : tour.destination;
  const data = { module: "tours", objectId: tour.id, reference: tour.referenceNumber, route: `/tours/${tour.id}`, status };
  const traveller = users[seed.traveller].name;
  const send = async (code: string, eventType: string, category: string, title: string, body: string, read = false) =>
    prisma.notification.create({
      data: { userId: users[code].id, eventType, category, title, body, data, readAt: read ? ctx.now : null, createdAt: tour.statusChangedAt, dedupeKey: `seed:tour:${tour.referenceNumber}:${code}:${eventType}` },
    });
  const summary = `${traveller} · ${tour.title} — ${where} · est. ${formatTaka(tour.estimatedBudget)}. ${tour.referenceNumber}`;
  switch (status) {
    case S.PENDING_HOD:
      await send(seed.approver, "TOUR_SUBMITTED", NotificationCategory.ACTION_REQUIRED, `${seed.type === TourType.FOREIGN ? "Overseas tour" : "Tour"} request needs your approval`, summary);
      break;
    case S.PENDING_VETTING:
      for (const code of ["ABG-2055", "ABG-2101"]) await send(code, "TOUR_APPROVAL_REQUIRED", NotificationCategory.ACTION_REQUIRED, "Tour budget needs vetting", summary);
      break;
    case S.PENDING_SANCTION:
      for (const code of ["ABG-1002", "ABG-1003"]) await send(code, "TOUR_APPROVAL_REQUIRED", NotificationCategory.ACTION_REQUIRED, "Overseas tour needs your sanction", `${traveller} · ${tour.title} — ${where} · ${formatTaka(budget ?? tour.estimatedBudget)}. ${tour.referenceNumber}`);
      break;
    case S.APPROVED:
      await send(seed.traveller, "TOUR_UPDATED", NotificationCategory.PARCEL_UPDATE, "Tour approved & funds sanctioned", `${tour.referenceNumber} · ${tour.title} — ${formatTaka(budget)} sanctioned. Have a safe trip.`);
      break;
    case S.REJECTED:
      await send(seed.traveller, "TOUR_UPDATED", NotificationCategory.PARCEL_UPDATE, "Tour request rejected", `${tour.referenceNumber} · ${tour.title} — ${seed.steps[seed.steps.length - 1].note}`);
      break;
    default:
      break;
  }
}
