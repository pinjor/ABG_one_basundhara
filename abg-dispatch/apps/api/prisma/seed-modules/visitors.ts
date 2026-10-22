import { randomBytes } from "crypto";
import { NotificationCategory, VisitPurpose, VisitStatus, dhakaDateStamp, formatVisitorPassNumber } from "@abg-dispatch/shared";
import { DAY, MINUTE, type SeedContext } from "./context";

/**
 * Demo data: visitors and gate passes at Factory A and head office.
 *
 * Today's board (relative to the seed time): four visitors on site — a boiler
 * contractor in for more than three hours, a DIFE inspector, a walk-in courier
 * and an auditor at head office — five still expected (one pre-registered by
 * Farhana Islam), four already gone, a cancelled pass and two passes for the
 * coming days. Before that, six days of history (8–20 visits a day) across
 * vendors, contractors, deliveries, audits and inspections (DIFE, Fire
 * Service, buyers' auditors), interviews and government officials, with the
 * occasional no-show. Pass numbers continue each office's VP:<code> counter.
 */
export async function seedVisitors(ctx: SeedContext): Promise<void> {
  const { prisma, now, branches, locations, employees, users } = ctx;
  const rand = mulberry32(20261021);
  const pick = <T>(xs: readonly T[]): T => xs[Math.floor(rand() * xs.length)];
  const between = (a: number, b: number) => a + Math.floor(rand() * (b - a + 1));

  const todayStart = dhakaMidnight(now);
  const minutesAgo = (m: number) => new Date(now.getTime() - m * MINUTE);
  /** Later today, but never past the end of the Dhaka day (unless the seed runs at the very end of it). */
  const laterToday = (m: number) => {
    const t = now.getTime() + m * MINUTE;
    const cap = todayStart.getTime() + DAY - 20 * MINUTE;
    return new Date(t < cap ? t : Math.max(now.getTime() + 5 * MINUTE, cap));
  };
  /** A wall-clock time in Dhaka, `offsetDays` from today. */
  const dhakaAt = (offsetDays: number, hour: number, minute = 0) => new Date(todayStart.getTime() + offsetDays * DAY + (hour * 60 + minute) * MINUTE);

  /** The end of a visit `m` minutes after it starts (always after the start, as the database requires). */
  const plus = (start: Date, m: number) => new Date(start.getTime() + m * MINUTE);
  const userOf = (code: string) => users[code]?.id ?? null;
  const pointFor = (guard: string, branch: string) => {
    if (guard === "ABG-3700") return locations["HO:RECEPTION"].path;
    return locations[`${branch}:GATE`].path;
  };

  async function nextPass(branchCode: string, visitDay: Date): Promise<string> {
    const day = dhakaDateStamp(visitDay);
    const rows = await prisma.$queryRaw<{ lastValue: number }[]>`
      INSERT INTO "tracking_sequences" ("branchCode", "dayStamp", "lastValue")
      VALUES (${`VP:${branchCode}`}, ${day}, 1)
      ON CONFLICT ("branchCode", "dayStamp")
      DO UPDATE SET "lastValue" = "tracking_sequences"."lastValue" + 1
      RETURNING "lastValue"`;
    return formatVisitorPassNumber(day, branchCode, Number(rows[0].lastValue));
  }

  interface VisitSeed {
    branch: "FCA" | "HO";
    name: string;
    phone: string;
    company?: string | null;
    purpose: VisitPurpose;
    detail?: string | null;
    party?: number;
    vehicle?: string | null;
    carrying?: string | null;
    idLast4?: string | null;
    loc?: string;
    host: string;
    createdBy?: string;
    createdAt: Date;
    expectedAt: Date;
    expectedUntil?: Date | null;
    walkIn?: boolean;
    status: VisitStatus;
    inAt?: Date;
    outAt?: Date;
    inBy?: string;
    outBy?: string;
    badge?: string | null;
    cancelledAt?: Date;
    cancelledBy?: string;
    cancelReason?: string | null;
    notes?: string | null;
  }

  async function create(s: VisitSeed): Promise<{ id: string; passNumber: string; visitorName: string; status: string }> {
    const branch = branches[s.branch];
    const hostEmployee = employees[s.host];
    const hostUserId = userOf(s.host);
    const creator = s.createdBy ?? (s.walkIn ? s.inBy! : hostUserId ? s.host : s.branch === "FCA" ? "ABG-5120" : "ABG-1001");
    const passNumber = await nextPass(branch.code, s.expectedAt);
    const expiredAt = s.status === VisitStatus.EXPIRED ? new Date(dhakaMidnight(s.expectedAt).getTime() + DAY) : null;
    return prisma.visit.create({
      data: {
        passNumber,
        passToken: randomBytes(24).toString("base64url"),
        visitorName: s.name,
        visitorPhone: s.phone,
        company: s.company ?? null,
        idLast4: s.idLast4 ?? null,
        purpose: s.purpose,
        purposeDetail: s.detail ?? null,
        partySize: s.party ?? 1,
        vehicleNumber: s.vehicle ?? null,
        carrying: s.carrying ?? null,
        branchId: branch.id,
        locationId: s.loc ? locations[s.loc].id : null,
        hostUserId,
        hostName: hostEmployee.fullName,
        expectedAt: s.expectedAt,
        expectedUntil: s.expectedUntil ?? null,
        status: s.status,
        walkIn: !!s.walkIn,
        badgeNumber: s.badge ?? null,
        checkedInAt: s.inAt ?? null,
        checkedInById: s.inBy ? userOf(s.inBy) : null,
        checkedInByName: s.inBy ? employees[s.inBy].fullName : null,
        checkInPoint: s.inBy ? pointFor(s.inBy, s.branch) : null,
        checkedOutAt: s.outAt ?? null,
        checkedOutById: s.outBy ? userOf(s.outBy) : null,
        checkedOutByName: s.outBy ? employees[s.outBy].fullName : null,
        cancelledAt: s.cancelledAt ?? null,
        cancelledById: s.cancelledBy ? userOf(s.cancelledBy) : null,
        cancelledByName: s.cancelledBy ? employees[s.cancelledBy].fullName : null,
        cancelReason: s.cancelReason ?? null,
        expiredAt,
        createdById: userOf(creator) ?? users["ABG-5120"].id,
        notes: s.notes ?? null,
        createdAt: s.createdAt,
        updatedAt: s.outAt ?? s.cancelledAt ?? expiredAt ?? s.inAt ?? s.createdAt,
      },
      select: { id: true, passNumber: true, visitorName: true, status: true },
    });
  }

  // ── Today ──

  const NURUL = "ABG-5290";
  const KAMRUL = "ABG-5205";
  const REZAUL = "ABG-3700";

  const boiler = await create({
    branch: "FCA", name: "Engr. Alamgir Kabir", phone: "01711458203", company: "Rahman Engineering & Construction", purpose: VisitPurpose.CONTRACTOR,
    detail: "Boiler room steam line repair", party: 3, vehicle: "Narayanganj-Ta 14-0921", carrying: "Welding set, pipe wrenches, safety harnesses", idLast4: "4417",
    loc: "FCA:PROD", host: "ABG-7333", createdBy: "ABG-5120", createdAt: minutesAgo(26 * 60), expectedAt: minutesAgo(215), expectedUntil: laterToday(150),
    status: VisitStatus.CHECKED_IN, inAt: minutesAgo(204), inBy: NURUL, badge: "FCA-V07", notes: "Hot work permit issued by the maintenance team.",
  });
  const dife = await create({
    branch: "FCA", name: "Md. Mahbubur Rahman", phone: "01819224617", company: "DIFE, Narayanganj", purpose: VisitPurpose.AUDIT_INSPECTION,
    detail: "Routine labour and occupational safety inspection", party: 2, carrying: "Inspection checklist, camera", idLast4: "0932",
    loc: "FCA:ADMIN", host: "ABG-5120", createdAt: minutesAgo(2 * 24 * 60 + 90), expectedAt: minutesAgo(80), expectedUntil: laterToday(110),
    status: VisitStatus.CHECKED_IN, inAt: minutesAgo(70), inBy: NURUL, badge: "FCA-V11",
  });
  const courier = await create({
    branch: "FCA", name: "Selim Mia", phone: "01912347785", company: "Sundarban Courier Service", purpose: VisitPurpose.DELIVERY,
    detail: "Lab reagents for the Quality Lab", vehicle: "Dhaka Metro-Na 12-4410", carrying: "3 cartons of reagents",
    loc: "FCA:QA", host: "ABG-7310", walkIn: true, createdAt: minutesAgo(25), expectedAt: minutesAgo(25),
    status: VisitStatus.CHECKED_IN, inAt: minutesAgo(25), inBy: KAMRUL, badge: "FCA-V14",
  });
  const auditor = await create({
    branch: "HO", name: "Nadia Sultana", phone: "01552318840", company: "Bureau Veritas Bangladesh", purpose: VisitPurpose.AUDIT_INSPECTION,
    detail: "Licence and compliance documentation review", carrying: "Laptop", idLast4: "7781",
    loc: "HO:ADMIN", host: "ABG-2400", createdAt: minutesAgo(3 * 24 * 60), expectedAt: minutesAgo(60), expectedUntil: laterToday(150),
    status: VisitStatus.CHECKED_IN, inAt: minutesAgo(45), inBy: REZAUL, badge: "HO-V03",
  });

  // Still to come today — Farhana pre-registered the Akij Packaging visit yesterday.
  const akijAt = laterToday(50);
  const fireAt = laterToday(130);
  const interviewAt = laterToday(95);
  const bankAt = laterToday(180);
  const steelAt = laterToday(240);
  await create({
    branch: "FCA", name: "Rakibul Hasan", phone: "01713665021", company: "Akij Packaging Ltd", purpose: VisitPurpose.VENDOR_SUPPLIER,
    detail: "Corrugated carton sample approval", party: 2, vehicle: "Dhaka Metro-Ga 25-7781", carrying: "Carton samples",
    loc: "FCA:ADMIN", host: "ABG-7231", createdAt: minutesAgo(22 * 60), expectedAt: akijAt, expectedUntil: plus(akijAt, 120), status: VisitStatus.EXPECTED,
  });
  await create({
    branch: "FCA", name: "Station Officer Abdur Razzak", phone: "01730045118", company: "Fire Service & Civil Defence, Sonargaon", purpose: VisitPurpose.AUDIT_INSPECTION,
    detail: "Annual fire safety and hydrant inspection", party: 3, vehicle: "Fire Service jeep", loc: "FCA:PROD", host: "ABG-5120",
    createdAt: minutesAgo(3 * 24 * 60 + 30), expectedAt: fireAt, expectedUntil: plus(fireAt, 120), status: VisitStatus.EXPECTED,
    notes: "Keep the fire pump room and hydrant log book ready.",
  });
  await create({
    branch: "HO", name: "Sumaiya Akter", phone: "01687402215", purpose: VisitPurpose.INTERVIEW, detail: "Interview: Executive, HR & Compliance",
    carrying: "Certificates folder", loc: "HO:HR", host: "ABG-2101", createdAt: minutesAgo(2 * 24 * 60), expectedAt: interviewAt, expectedUntil: plus(interviewAt, 60), status: VisitStatus.EXPECTED,
  });
  await create({
    branch: "HO", name: "Ishtiaque Ahmed", phone: "01755120934", company: "BRAC Bank PLC", purpose: VisitPurpose.MEETING, detail: "Corporate account and payroll review",
    party: 2, carrying: "Laptop", loc: "HO:FIN", host: "ABG-2055", createdAt: minutesAgo(26 * 60), expectedAt: bankAt, expectedUntil: plus(bankAt, 60), status: VisitStatus.EXPECTED,
  });
  await create({
    branch: "HO", name: "Golam Rabbani", phone: "01818774306", company: "Abul Khair Steel", purpose: VisitPurpose.VENDOR_SUPPLIER, detail: "Quotation for MS angle and channel",
    loc: "HO:PROC", host: "ABG-2305", createdAt: minutesAgo(5 * 60), expectedAt: steelAt, expectedUntil: plus(steelAt, 60), status: VisitStatus.EXPECTED,
  });

  // Already gone.
  const battery = await create({
    branch: "FCA", name: "Tanvir Alam", phone: "01716093341", company: "Rahimafrooz Batteries Ltd", purpose: VisitPurpose.VENDOR_SUPPLIER,
    detail: "IPS battery bank replacement survey", carrying: "Laptop, battery tester", loc: "FCA:ADMIN", host: "ABG-7231",
    createdAt: minutesAgo(2 * 24 * 60 + 200), expectedAt: minutesAgo(340), expectedUntil: minutesAgo(250),
    status: VisitStatus.CHECKED_OUT, inAt: minutesAgo(332), outAt: minutesAgo(262), inBy: NURUL, outBy: NURUL, badge: "FCA-V02",
  });
  await create({
    branch: "FCA", name: "Babul Hossain", phone: "01924558190", company: "S.A. Paribahan", purpose: VisitPurpose.DELIVERY, detail: "Spare parts consignment for the store",
    vehicle: "Narayanganj-Ma 11-2087", carrying: "6 cartons", loc: "FCA:STORE", host: "ABG-4870", walkIn: true,
    createdAt: minutesAgo(282), expectedAt: minutesAgo(282), status: VisitStatus.CHECKED_OUT, inAt: minutesAgo(282), outAt: minutesAgo(255), inBy: KAMRUL, outBy: KAMRUL, badge: "FCA-V04",
  });
  await create({
    branch: "HO", name: "Arifur Rahman", phone: "01676230418", purpose: VisitPurpose.INTERVIEW, detail: "Interview: Management Trainee, Finance", carrying: "Certificates folder",
    loc: "HO:HR", host: "ABG-2101", createdAt: minutesAgo(3 * 24 * 60), expectedAt: minutesAgo(195), expectedUntil: minutesAgo(135),
    status: VisitStatus.CHECKED_OUT, inAt: minutesAgo(188), outAt: minutesAgo(121), inBy: REZAUL, outBy: REZAUL, badge: "HO-V01",
  });
  await create({
    branch: "FCA", name: "Farzana Haque", phone: "01711902263", company: "SGS Bangladesh Ltd", purpose: VisitPurpose.AUDIT_INSPECTION, detail: "Buyer social compliance pre-audit",
    party: 2, carrying: "Laptop, audit files", idLast4: "5520", loc: "FCA:ADMIN", host: "ABG-5120", createdAt: minutesAgo(4 * 24 * 60),
    expectedAt: minutesAgo(305), expectedUntil: minutesAgo(65), status: VisitStatus.CHECKED_OUT, inAt: minutesAgo(298), outAt: minutesAgo(76), inBy: NURUL, outBy: KAMRUL, badge: "FCA-V03",
  });

  // Cancelled by the host.
  await create({
    branch: "FCA", name: "Kamal Uddin", phone: "01819450372", company: "Partex Cables Ltd", purpose: VisitPurpose.VENDOR_SUPPLIER, detail: "Cable tray specification meeting",
    loc: "FCA:ADMIN", host: "ABG-7231", createdAt: minutesAgo(2 * 24 * 60 + 300), expectedAt: laterToday(150), status: VisitStatus.CANCELLED,
    cancelledAt: minutesAgo(120), cancelledBy: "ABG-7231", cancelReason: "The supplier asked to move the meeting to next week.",
  });

  // The coming days.
  await create({
    branch: "HO", name: "Sharmin Chowdhury", phone: "01713046678", company: "Dutch-Bangla Bank PLC", purpose: VisitPurpose.MEETING, detail: "Term loan legal documentation",
    loc: "HO:LEGAL", host: "ABG-2041", createdAt: minutesAgo(40), expectedAt: dhakaAt(1, 11), expectedUntil: dhakaAt(1, 12, 30), status: VisitStatus.EXPECTED,
  });
  await create({
    branch: "FCA", name: "Engr. Saidur Rahman", phone: "01552907714", company: "BSTI, Dhaka", purpose: VisitPurpose.AUDIT_INSPECTION, detail: "Product certification sampling",
    party: 2, carrying: "Sampling kit", loc: "FCA:QA", host: "ABG-7231", createdAt: minutesAgo(15), expectedAt: dhakaAt(2, 10, 30), expectedUntil: dhakaAt(2, 13), status: VisitStatus.EXPECTED,
  });

  // Hosts were told as their visitors arrived and left.
  const told = async (code: string, visit: { id: string; passNumber: string; status: string }, eventType: string, category: string, title: string, body: string, ago: number, read: boolean) => {
    await prisma.notification.create({
      data: {
        userId: users[code].id,
        eventType,
        category,
        title,
        body,
        data: { module: "visitors", objectId: visit.id, reference: visit.passNumber, route: `/visitors/${visit.id}`, status: visit.status },
        readAt: read ? minutesAgo(ago - 5) : null,
        createdAt: minutesAgo(ago),
        dedupeKey: `seed:visit:${visit.id}:${eventType}:${code}`,
      },
    });
  };
  await told("ABG-5120", dife, "VISITOR_ARRIVED", NotificationCategory.ACTION_REQUIRED, `${dife.visitorName} has arrived`, `${dife.visitorName} (DIFE, Narayanganj) with 1 other has arrived at ${locations["FCA:GATE"].path} · badge FCA-V11. ${dife.passNumber}`, 70, true);
  await told("ABG-7310", courier, "VISITOR_AT_GATE", NotificationCategory.ACTION_REQUIRED, `Your visitor ${courier.visitorName} is at the gate`, `Selim Mia (Sundarban Courier Service) has arrived at ${locations["FCA:GATE"].path} and was checked in by Kamrul Hasan. Delivery · ${courier.passNumber}`, 25, false);
  await told("ABG-2400", auditor, "VISITOR_ARRIVED", NotificationCategory.ACTION_REQUIRED, `${auditor.visitorName} has arrived`, `Nadia Sultana (Bureau Veritas Bangladesh) has arrived at ${locations["HO:RECEPTION"].path} · badge HO-V03. ${auditor.passNumber}`, 45, false);
  await told("ABG-7231", battery, "VISITOR_LEFT", NotificationCategory.PARCEL_UPDATE, `${battery.visitorName} has left`, `Checked out after 1 h 10 min on site. ${battery.passNumber}`, 262, true);
  void boiler;

  // ── Six days of history ──

  for (let back = 6; back >= 1; back--) {
    const dayStart = new Date(todayStart.getTime() - back * DAY);
    const friday = new Date(dayStart.getTime() + 12 * 3_600_000).getUTCDay() === 5;
    const total = friday ? between(10, 12) : between(12, 20);
    const factory = Math.round(total * 0.6);
    const badges: Record<string, number> = { FCA: 0, HO: 0 };
    const plan: { branch: "FCA" | "HO"; arrive: number }[] = [];
    for (let i = 0; i < total; i++) plan.push({ branch: i < factory ? "FCA" : "HO", arrive: between(9 * 60, 16 * 60 + 30) });
    plan.sort((a, b) => a.arrive - b.arrive);

    for (const { branch, arrive } of plan) {
      const purpose = weighted(rand, branch === "FCA" ? (friday ? FCA_FRIDAY_MIX : FCA_MIX) : HO_MIX);
      const pool = POOLS[purpose];
      const person = pick(pool.people);
      const company = pool.companies ? pick(pool.companies) : person[1];
      const host = pick(HOSTS[branch][purpose]);
      const walkIn = purpose === VisitPurpose.DELIVERY ? rand() < 0.8 : rand() < 0.1;
      const [minStay, maxStay] = STAY[purpose];
      const stay = between(minStay, maxStay);
      const expected = dayStart.getTime() + Math.round(arrive / 15) * 15 * MINUTE;
      const inAt = new Date(walkIn ? dayStart.getTime() + arrive * MINUTE : expected + between(-20, 25) * MINUTE);
      const outAt = new Date(Math.min(inAt.getTime() + stay * MINUTE, dayStart.getTime() + (19 * 60 + 30) * MINUTE));
      const guard = branch === "HO" ? REZAUL : rand() < 0.6 ? NURUL : KAMRUL;
      const outGuard = branch === "HO" ? REZAUL : rand() < 0.6 ? NURUL : KAMRUL;
      const outcome = walkIn ? "out" : weighted(rand, [["out", 86], ["noshow", 9], ["cancelled", 5]] as const);
      const expectedAt = walkIn ? inAt : new Date(expected);
      const createdAt = walkIn ? inAt : new Date(expected - between(1, 3) * DAY - between(0, 300) * MINUTE);
      const seed: VisitSeed = {
        branch,
        name: person[0],
        phone: phoneFor(rand),
        company,
        purpose,
        detail: pick(pool.details),
        party: purpose === VisitPurpose.CONTRACTOR || purpose === VisitPurpose.AUDIT_INSPECTION ? between(1, 3) : rand() < 0.15 ? 2 : 1,
        vehicle: rand() < (VEHICLE_ODDS[purpose] ?? 0.2) ? pick(VEHICLES) : null,
        carrying: pool.carrying.length ? pick(pool.carrying) : null,
        idLast4: rand() < 0.6 ? String(between(0, 9999)).padStart(4, "0") : null,
        loc: pick(AREAS[branch]),
        host,
        walkIn,
        createdAt,
        expectedAt,
        expectedUntil: walkIn ? null : new Date(expected + Math.max(30, Math.round(stay / 15) * 15) * MINUTE),
        status: VisitStatus.CHECKED_OUT,
      };
      if (outcome === "out") {
        badges[branch] += 1;
        Object.assign(seed, { status: VisitStatus.CHECKED_OUT, inAt, outAt, inBy: guard, outBy: outGuard, badge: `${branch}-V${String(badges[branch]).padStart(2, "0")}` });
      } else if (outcome === "noshow") {
        seed.status = VisitStatus.EXPIRED;
      } else {
        const cancelledAt = new Date(Math.min(expected - between(60, 600) * MINUTE, now.getTime()));
        Object.assign(seed, { status: VisitStatus.CANCELLED, cancelledAt: cancelledAt < createdAt ? new Date(createdAt.getTime() + 30 * MINUTE) : cancelledAt, cancelledBy: userOf(host) ? host : branch === "FCA" ? "ABG-5120" : "ABG-1001", cancelReason: pick(CANCEL_REASONS) });
      }
      await create(seed);
    }
  }
}

// ── Reference pools ──

type Mix = readonly (readonly [VisitPurpose, number])[];

const FCA_MIX: Mix = [
  [VisitPurpose.VENDOR_SUPPLIER, 26],
  [VisitPurpose.CONTRACTOR, 22],
  [VisitPurpose.DELIVERY, 20],
  [VisitPurpose.AUDIT_INSPECTION, 11],
  [VisitPurpose.GOVERNMENT_OFFICIAL, 6],
  [VisitPurpose.MEETING, 6],
  [VisitPurpose.INTERVIEW, 6],
  [VisitPurpose.PERSONAL, 3],
];
/** Fridays are maintenance days at the factory: mostly contractors and deliveries. */
const FCA_FRIDAY_MIX: Mix = [
  [VisitPurpose.CONTRACTOR, 50],
  [VisitPurpose.DELIVERY, 25],
  [VisitPurpose.VENDOR_SUPPLIER, 10],
  [VisitPurpose.AUDIT_INSPECTION, 10],
  [VisitPurpose.PERSONAL, 5],
];
const HO_MIX: Mix = [
  [VisitPurpose.MEETING, 24],
  [VisitPurpose.INTERVIEW, 20],
  [VisitPurpose.VENDOR_SUPPLIER, 18],
  [VisitPurpose.DELIVERY, 14],
  [VisitPurpose.AUDIT_INSPECTION, 8],
  [VisitPurpose.GOVERNMENT_OFFICIAL, 8],
  [VisitPurpose.CONTRACTOR, 6],
  [VisitPurpose.PERSONAL, 2],
];

interface Pool {
  /** [person, organisation] — the organisation is used when the purpose has no company list. */
  people: readonly (readonly [string, string | null])[];
  companies?: readonly string[];
  details: readonly string[];
  carrying: readonly string[];
}

const POOLS: Record<VisitPurpose, Pool> = {
  VENDOR_SUPPLIER: {
    people: [["Md. Jashim Uddin", null], ["Shamim Ahmed", null], ["Abdul Mannan", null], ["Nasir Uddin Bhuiyan", null], ["Faruk Hossain", null], ["Delwar Hossain", null], ["Sharif Ahmed", null], ["Mahmudul Hasan", null]],
    companies: ["Akij Packaging Ltd", "Meghna Steel Supplies", "Pran Packaging", "Bengal Plastics Ltd", "Rahimafrooz Batteries Ltd", "Partex Cables Ltd", "BSRM Steels Ltd", "KDS Accessories Ltd", "Confidence Cement PLC", "Energypac Power Generation"],
    details: ["Quotation for packaging cartons", "Raw material sample submission", "Delivery schedule meeting", "Product demonstration for procurement", "Invoice reconciliation", "Spare parts quotation", "New supplier site visit"],
    carrying: ["Samples", "Laptop", "Product catalogue", "Sample cartons", "Laptop, brochures"],
  },
  CONTRACTOR: {
    people: [["Monirul Islam", null], ["Shahidul Haque", null], ["Rubel Mia", null], ["Jahid Hasan", null], ["Anwar Hossain", null], ["Saiful Islam", null], ["Mostafizur Rahman", null]],
    companies: ["Rahman Engineering & Construction", "Habib Electric Works", "Al-Amin Fire Safety Solutions", "Delta Lift & Escalator Services", "Green Clean Facility Services", "Shapla HVAC Engineering", "Sigma Generator Services", "Karim Plumbing & Sanitary"],
    details: ["Generator servicing", "Lift annual maintenance", "Fire alarm panel testing", "Roof waterproofing", "Chiller maintenance visit", "Distribution board rewiring", "Pest control", "Boundary wall repair"],
    carrying: ["Tool kit", "Ladder, tool kit", "Testing equipment", "Drill machine, tool box", "Spray equipment"],
  },
  DELIVERY: {
    people: [["Rafiqul Islam", null], ["Jewel Rana", null], ["Shakil Ahmed", null], ["Kawsar Hamid", null], ["Liton Das", null], ["Abul Bashar", null]],
    companies: ["Sundarban Courier Service", "S.A. Paribahan", "Pathao Courier", "Karatoa Courier Service", "Continental Courier", "Steadfast Courier", "RedX Logistics", "Janani Transport"],
    details: ["Spare parts consignment", "Document delivery", "Office supplies", "Chemical drums", "Packaging material drop-off", "Courier pickup"],
    carrying: ["Cartons", "Documents", "Parcel", "2 drums", "Pallet of cartons"],
  },
  AUDIT_INSPECTION: {
    people: [["Md. Mahbubur Rahman", "DIFE, Narayanganj"], ["Inspector Ashraful Alam", "DIFE, Narayanganj"], ["Station Officer Abdur Razzak", "Fire Service & Civil Defence, Sonargaon"], ["Nadia Sultana", "Bureau Veritas Bangladesh"], ["Farzana Haque", "SGS Bangladesh Ltd"], ["Tahsin Kabir", "Intertek Bangladesh"], ["Dr. Rezwanul Karim", "Department of Environment"], ["Kazi Mehnaz", "amfori BSCI"], ["Engr. Saidur Rahman", "BSTI, Dhaka"]],
    details: ["Routine factory inspection", "Fire safety inspection", "Buyer social compliance audit", "Environmental clearance follow-up", "Quality management audit", "Product standards sampling"],
    carrying: ["Laptop, audit files", "Inspection checklist", "Camera, checklist", "Sampling kit"],
  },
  MEETING: {
    people: [["Ishtiaque Ahmed", "BRAC Bank PLC"], ["Sharmin Chowdhury", "Dutch-Bangla Bank PLC"], ["Raihan Kabir", "KPMG Bangladesh"], ["Tasnuva Hossain", "MetLife Bangladesh"], ["Mashrafi Hasan", "Grameenphone Business"], ["Imtiaz Uddin", "A. Qasem & Co."], ["Nabila Rahman", "City Bank PLC"]],
    details: ["Corporate account review", "Payroll banking proposal", "Statutory audit planning", "Group insurance renewal", "Corporate connectivity proposal", "Tax advisory meeting"],
    carrying: ["Laptop", "Documents"],
  },
  INTERVIEW: {
    people: [["Nusrat Jahan Mim", null], ["Rakib Hossain", null], ["Tasnim Ferdous", null], ["Mehedi Hasan Shuvo", null], ["Sanjida Islam", null], ["Fahim Shahriar", null]],
    details: ["Interview: QA Officer", "Interview: Production Supervisor", "Interview: Junior Accountant", "Interview: Maintenance Engineer", "Interview: Management Trainee, Finance"],
    carrying: ["Certificates folder"],
  },
  GOVERNMENT_OFFICIAL: {
    people: [["Md. Shafiqul Islam", "Upazila Nirbahi Office, Sonargaon"], ["Abu Sayeed", "Customs Bond Commissionerate, Dhaka"], ["Engr. Nazrul Islam", "Titas Gas Transmission & Distribution"], ["Mohammad Ali", "Palli Bidyut Samity, Narayanganj"], ["Rokonuzzaman", "National Board of Revenue (VAT)"], ["SI Hasibul Hasan", "Industrial Police-4, Narayanganj"]],
    details: ["Bonded warehouse inspection", "Gas line safety check", "Electricity meter inspection", "VAT document verification", "Routine area visit"],
    carrying: ["Official documents"],
  },
  PERSONAL: {
    people: [["Rokeya Begum", null], ["Abdul Karim", null], ["Shirin Sultana", null]],
    details: ["Visiting a family member", "Dropping off lunch", "Family matter"],
    carrying: [],
  },
  OTHER: {
    people: [["Hasan Mahmud", null]],
    details: ["Other"],
    carrying: [],
  },
};

/** Hosts by office and purpose (employee codes). ABG-7333, ABG-2120 and ABG-2066 have no app account: their name is kept, no notifications. */
const HOSTS: Record<"FCA" | "HO", Record<VisitPurpose, readonly string[]>> = {
  FCA: {
    VENDOR_SUPPLIER: ["ABG-7231", "ABG-5120", "ABG-4870"],
    CONTRACTOR: ["ABG-5120", "ABG-7333", "ABG-7231"],
    DELIVERY: ["ABG-4870", "ABG-7310", "ABG-7231"],
    AUDIT_INSPECTION: ["ABG-5120", "ABG-7231"],
    MEETING: ["ABG-5120", "ABG-7231"],
    INTERVIEW: ["ABG-7231", "ABG-5120"],
    GOVERNMENT_OFFICIAL: ["ABG-5120"],
    PERSONAL: ["ABG-7310", "ABG-7333", "ABG-4870"],
    OTHER: ["ABG-7231"],
  },
  HO: {
    VENDOR_SUPPLIER: ["ABG-2305", "ABG-2055"],
    CONTRACTOR: ["ABG-1001", "ABG-3610"],
    DELIVERY: ["ABG-2305", "ABG-3550", "ABG-2041"],
    AUDIT_INSPECTION: ["ABG-2400", "ABG-2055"],
    MEETING: ["ABG-2055", "ABG-2210", "ABG-1001", "ABG-2041"],
    INTERVIEW: ["ABG-2101", "ABG-2120"],
    GOVERNMENT_OFFICIAL: ["ABG-2400", "ABG-1001"],
    PERSONAL: ["ABG-2041", "ABG-2066"],
    OTHER: ["ABG-1001"],
  },
};

const AREAS: Record<"FCA" | "HO", readonly string[]> = {
  FCA: ["FCA:ADMIN", "FCA:PROD", "FCA:STORE", "FCA:QA"],
  HO: ["HO:ADMIN", "HO:FIN", "HO:PROC", "HO:HR", "HO:LEGAL", "HO:DIR"],
};

/** Minutes on site by purpose. */
const STAY: Record<VisitPurpose, readonly [number, number]> = {
  DELIVERY: [10, 40],
  VENDOR_SUPPLIER: [30, 120],
  CONTRACTOR: [120, 420],
  AUDIT_INSPECTION: [120, 360],
  MEETING: [45, 150],
  INTERVIEW: [45, 120],
  GOVERNMENT_OFFICIAL: [30, 120],
  PERSONAL: [15, 60],
  OTHER: [20, 90],
};

const VEHICLE_ODDS: Partial<Record<VisitPurpose, number>> = { DELIVERY: 0.9, CONTRACTOR: 0.5, VENDOR_SUPPLIER: 0.4, AUDIT_INSPECTION: 0.5, GOVERNMENT_OFFICIAL: 0.7, MEETING: 0.3 };

const VEHICLES = ["Dhaka Metro-Ga 13-5521", "Narayanganj-Ta 11-3302", "Dhaka Metro-Ta 18-6120", "Dhaka Metro-Ma 51-0918", "Gazipur-Na 11-2290", "Dhaka Metro-Kha 12-8834", "Narayanganj-Ga 11-0457", "Dhaka Metro-Cha 52-1146"];

const CANCEL_REASONS = ["Rescheduled to next week.", "The visitor is unwell.", "Meeting moved online.", "The supplier cancelled.", "Host travelling to head office."];

const OPERATOR_PREFIXES = ["013", "014", "015", "016", "017", "018", "019"];

function phoneFor(rand: () => number): string {
  const prefix = OPERATOR_PREFIXES[Math.floor(rand() * OPERATOR_PREFIXES.length)];
  return `${prefix}${String(Math.floor(rand() * 100_000_000)).padStart(8, "0")}`;
}

function weighted<T>(rand: () => number, items: readonly (readonly [T, number])[]): T {
  const total = items.reduce((s, [, w]) => s + w, 0);
  let r = rand() * total;
  for (const [v, w] of items) {
    r -= w;
    if (r < 0) return v;
  }
  return items[items.length - 1][0];
}

/** UTC instant of the Asia/Dhaka midnight that starts `date`'s day (UTC+6, no DST). */
function dhakaMidnight(date: Date): Date {
  const shifted = date.getTime() + 6 * 3_600_000;
  return new Date(shifted - (shifted % DAY) - 6 * 3_600_000);
}

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
