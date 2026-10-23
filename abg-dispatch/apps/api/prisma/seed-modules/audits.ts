import {
  AuditRating,
  AuditStatus,
  AuditType,
  AuditUpdateType,
  FINDING_SEVERITY_LABEL,
  FindingSeverity,
  FindingStatus,
  NotificationCategory,
  formatAuditNumber,
  formatFindingNumber,
} from "@abg-dispatch/shared";
import { DAY, type SeedContext } from "./context";

/**
 * Demo data: audits across the offices — a buyer audit at Factory B with
 * corrective actions open (one overdue, one fix waiting for verification), an
 * ISO 45001 audit under way at Factory A with a critical finding, closed fire
 * and electrical safety audits, upcoming DoE and stock audits, and a cancelled
 * review — dated relative to today (Asia/Dhaka).
 */

const dhakaIso = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka", year: "numeric", month: "2-digit", day: "2-digit" });
const shortDay = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", day: "numeric", month: "short" });
const S = AuditStatus;
const F = FindingStatus;
const SHIRIN = "ABG-2400";
const ARIF = "ABG-1001";

interface FindingSeed {
  title: string;
  detail: string;
  severity: FindingSeverity;
  clause?: string;
  area?: string;
  recommendation?: string;
  owner?: string;
  /** Due, in days from today. */
  due?: number;
  status: FindingStatus;
  /** Days before now it was recorded. */
  ago: number;
  response?: string;
  submittedAgo?: number;
  verifiedAgo?: number;
}

interface AuditSeed {
  title: string;
  type: AuditType;
  branch: string;
  scope: string;
  externalBody?: string;
  team?: string[];
  lead: string;
  /** Planned dates, in days from today. */
  start: number;
  end: number;
  status: AuditStatus;
  plannedAgo: number;
  startedAgo?: number;
  fieldworkAgo?: number;
  closedAgo?: number;
  cancelledAgo?: number;
  rating?: AuditRating;
  score?: number;
  conclusion?: string;
  note?: string;
  findings?: FindingSeed[];
}

const SEEDS: AuditSeed[] = [
  {
    title: "Fire safety inspection — Factory A",
    type: AuditType.SAFETY,
    branch: "FCA",
    scope: "Fire detection and suppression, exits and signage, fire-drill records, hot-work permits.",
    externalBody: "Fire Service & Civil Defence",
    team: ["Shirin Akhter", "Insp. Mahbubur Rahman (FSCD)"],
    lead: SHIRIN,
    start: -40,
    end: -39,
    status: S.CLOSED,
    plannedAgo: 55,
    startedAgo: 40,
    fieldworkAgo: 39,
    closedAgo: 12,
    rating: AuditRating.SATISFACTORY,
    score: 88,
    conclusion: "Fire safety systems are in good order; two minor gaps were fixed within the month.",
    findings: [
      { title: "Two extinguishers past their refill date in the store room", detail: "CO₂ units ST-04 and ST-07 last refilled in March.", severity: FindingSeverity.MINOR, area: "Store room", owner: "ABG-5120", due: -10, status: F.VERIFIED, ago: 39, response: "Both refilled and tagged by the vendor; next refill date added to the maintenance calendar.", submittedAgo: 20, verifiedAgo: 18 },
      { title: "Emergency exit sign not lit on the production floor", detail: "Exit E-3 sign battery failed.", severity: FindingSeverity.MINOR, area: "Production floor", owner: "ABG-7231", due: -15, status: F.VERIFIED, ago: 39, response: "Battery pack replaced; all exit signs tested.", submittedAgo: 25, verifiedAgo: 24 },
      { title: "Fire-drill register should be signed by shift supervisors", detail: "Drills are held monthly but the register carries only the safety officer's signature.", severity: FindingSeverity.OBSERVATION, status: F.NOTED, ago: 39 },
    ],
  },
  {
    title: "Electrical safety audit — Dhaka Branch",
    type: AuditType.SAFETY,
    branch: "DHK",
    scope: "Distribution boards, earthing, UPS room and emergency lighting.",
    team: ["Shirin Akhter", "Engr. Kamal Hossain (consultant)"],
    lead: SHIRIN,
    start: -20,
    end: -20,
    status: S.CLOSED,
    plannedAgo: 30,
    startedAgo: 20,
    fieldworkAgo: 20,
    closedAgo: 6,
    rating: AuditRating.SATISFACTORY,
    score: 81,
    conclusion: "Safe overall after the 2nd-floor board was rewired.",
    findings: [
      { title: "Overloaded distribution board on the 2nd floor", detail: "Board DB-2 at 118% of rated load at peak; breakers warm to the touch.", severity: FindingSeverity.MAJOR, clause: "BNBC 2020 Part 8", area: "2nd floor", owner: ARIF, due: -2, status: F.VERIFIED, ago: 20, response: "Load split to a new board DB-2B by the electrical contractor.", submittedAgo: 9, verifiedAgo: 7 },
    ],
  },
  {
    title: "Buyer social-compliance audit — Factory B",
    type: AuditType.BUYER,
    branch: "FCB",
    scope: "Working hours, wages, health & safety, chemical management and grievance handling (buyer code of conduct).",
    externalBody: "Bureau Veritas",
    team: ["Bureau Veritas audit team (3)", "Shirin Akhter"],
    lead: SHIRIN,
    start: -6,
    end: -5,
    status: S.FOLLOW_UP,
    plannedAgo: 30,
    startedAgo: 6,
    fieldworkAgo: 5,
    rating: AuditRating.NEEDS_IMPROVEMENT,
    score: 72,
    conclusion: "Working-hours records and the chemical store need attention before the buyer's follow-up visit.",
    findings: [
      { title: "Overtime above 60 hours a week for 12 line workers in September", detail: "Time cards for Line 2 show 62–66 hours in weeks 37 and 38.", severity: FindingSeverity.MAJOR, clause: "Bangladesh Labour Act s.102", area: "Line 2", recommendation: "Cap overtime in the shift plan and get the buyer's agreement for peak weeks.", owner: "ABG-7455", due: 24, status: F.OPEN, ago: 5 },
      { title: "No secondary containment for solvent drums in the chemical store", detail: "Six 200 L drums stored directly on the floor.", severity: FindingSeverity.MAJOR, clause: "Buyer RSL / chemical policy 4.2", area: "Chemical store", recommendation: "Bunded pallets and a spill kit.", owner: "ABG-7420", due: 24, status: F.SUBMITTED, ago: 5, response: "Bunded pallets installed and a spill kit placed beside the door — photos are with the admin office.", submittedAgo: 1 },
      { title: "First-aid box on Line 3 missing items", detail: "No burn gel or eye wash; register not filled since July.", severity: FindingSeverity.MINOR, area: "Line 3", owner: "ABG-7420", due: -2, status: F.OPEN, ago: 5 },
      { title: "Grievance box could be placed away from the supervisor's desk", detail: "Workers may hesitate to use it where it is.", severity: FindingSeverity.OBSERVATION, status: F.NOTED, ago: 5 },
    ],
  },
  {
    title: "ISO 45001 surveillance audit — Factory A",
    type: AuditType.ISO,
    branch: "FCA",
    scope: "Occupational health & safety management system: hazard identification, permits to work, PPE, contractor control.",
    externalBody: "TÜV SÜD Bangladesh",
    team: ["TÜV SÜD lead auditor", "Shirin Akhter"],
    lead: SHIRIN,
    start: -1,
    end: 1,
    status: S.IN_PROGRESS,
    plannedAgo: 45,
    startedAgo: 1,
    findings: [
      { title: "Boiler room permit-to-work not followed during maintenance", detail: "Valve replacement on Boiler 2 done without a signed permit or isolation tag.", severity: FindingSeverity.CRITICAL, clause: "ISO 45001 8.1.4", area: "Boiler room", recommendation: "Stop-work until permits are re-briefed; lock-out tag-out kit at the boiler room door.", owner: "ABG-5120", due: 6, status: F.OPEN, ago: 0.5 },
      { title: "PPE issue register not updated since August", detail: "New joiners in September are not on the register.", severity: FindingSeverity.MINOR, area: "Stores", owner: "ABG-7231", due: 59, status: F.OPEN, ago: 0.4 },
    ],
  },
  {
    title: "Environmental compliance — Factory B",
    type: AuditType.ENVIRONMENT,
    branch: "FCB",
    scope: "ECC conditions, effluent treatment plant logs, stack emissions and hazardous-waste manifests.",
    externalBody: "Department of Environment",
    team: ["Shirin Akhter"],
    lead: SHIRIN,
    start: 9,
    end: 9,
    status: S.PLANNED,
    plannedAgo: 12,
  },
  {
    title: "Quarterly stock audit — Central Warehouse",
    type: AuditType.FINANCIAL,
    branch: "WH",
    scope: "Cylinder stock, spare parts and finished goods against the ERP; write-offs and slow movers.",
    team: ["Mahmuda Akter", "Rashed Khan"],
    lead: ARIF,
    start: 14,
    end: 15,
    status: S.PLANNED,
    plannedAgo: 8,
  },
  {
    title: "Head office internal controls review",
    type: AuditType.INTERNAL,
    branch: "HO",
    scope: "Purchase approvals, petty cash and delegation of authority.",
    team: ["Mahmuda Akter"],
    lead: ARIF,
    start: -25,
    end: -24,
    status: S.CANCELLED,
    plannedAgo: 40,
    cancelledAgo: 28,
    note: "Merged into the year-end external audit.",
  },
];

export async function seedAudits(ctx: SeedContext) {
  const { prisma, now, users, branches } = ctx;
  const today = new Date(`${dhakaIso.format(now)}T00:00:00.000Z`);
  const date = (n: number) => new Date(today.getTime() + n * DAY);
  const ago = (n: number) => new Date(now.getTime() - n * DAY);
  const year = new Date(now.getTime() + 6 * 3_600_000).getUTCFullYear();

  let seq = 0;
  for (const seed of [...SEEDS].sort((a, b) => b.plannedAgo - a.plannedAgo)) {
    seq += 1;
    const lead = users[seed.lead];
    const audit = await prisma.audit.create({
      data: {
        referenceNumber: formatAuditNumber(year, seq),
        title: seed.title,
        type: seed.type,
        scope: seed.scope,
        branchId: branches[seed.branch].id,
        externalBody: seed.externalBody ?? null,
        team: seed.team ?? [],
        leadUserId: lead.id,
        plannedStart: date(seed.start),
        plannedEnd: date(seed.end),
        status: seed.status,
        rating: seed.rating ?? null,
        score: seed.score ?? null,
        conclusion: seed.conclusion ?? null,
        statusNote: seed.note ?? null,
        statusChangedAt: ago(seed.closedAgo ?? seed.cancelledAgo ?? seed.fieldworkAgo ?? seed.startedAgo ?? seed.plannedAgo),
        startedAt: seed.startedAgo !== undefined ? ago(seed.startedAgo) : null,
        fieldworkCompletedAt: seed.fieldworkAgo !== undefined ? ago(seed.fieldworkAgo) : null,
        closedAt: seed.closedAgo !== undefined ? ago(seed.closedAgo) : null,
        cancelledAt: seed.cancelledAgo !== undefined ? ago(seed.cancelledAgo) : null,
        createdByName: lead.name,
        createdAt: ago(seed.plannedAgo),
      },
    });
    const history: { type: string; from?: string; to?: string; note?: string | null; by: string; at: Date; findingId?: string; metadata?: object }[] = [
      { type: AuditUpdateType.CREATED, to: S.PLANNED, by: seed.lead, at: ago(seed.plannedAgo), metadata: { lead: lead.name } },
    ];
    if (seed.startedAgo !== undefined) history.push({ type: AuditUpdateType.STATUS_CHANGED, from: S.PLANNED, to: S.IN_PROGRESS, by: seed.lead, at: ago(seed.startedAgo) });
    if (seed.cancelledAgo !== undefined) history.push({ type: AuditUpdateType.STATUS_CHANGED, from: S.PLANNED, to: S.CANCELLED, note: seed.note, by: seed.lead, at: ago(seed.cancelledAgo) });

    let fseq = 0;
    for (const f of seed.findings ?? []) {
      fseq += 1;
      const owner = f.owner ? users[f.owner] : null;
      const finding = await prisma.auditFinding.create({
        data: {
          auditId: audit.id,
          sequence: fseq,
          number: formatFindingNumber(fseq),
          title: f.title,
          detail: f.detail,
          clause: f.clause ?? null,
          area: f.area ?? null,
          severity: f.severity,
          status: f.status,
          recommendation: f.recommendation ?? null,
          ownerUserId: owner?.id ?? null,
          dueDate: f.due !== undefined ? date(f.due) : null,
          response: f.response ?? null,
          submittedAt: f.submittedAgo !== undefined ? ago(f.submittedAgo) : null,
          verifiedAt: f.verifiedAgo !== undefined ? ago(f.verifiedAgo) : null,
          verifiedByName: f.verifiedAgo !== undefined ? lead.name : null,
          // The overdue alert for an action already past its date has gone out.
          overdueNotifiedAt: f.status === F.OPEN && f.due !== undefined && f.due < 0 ? ago(Math.max(0.1, -f.due - 1)) : null,
          createdAt: ago(f.ago),
        },
      });
      history.push({ type: AuditUpdateType.FINDING_ADDED, to: f.severity === FindingSeverity.OBSERVATION ? F.NOTED : F.OPEN, note: f.title, by: seed.lead, at: ago(f.ago), findingId: finding.id, metadata: { number: finding.number, severity: f.severity, owner: owner?.name ?? null } });
      if (f.submittedAgo !== undefined) history.push({ type: AuditUpdateType.FINDING_SUBMITTED, from: F.OPEN, to: F.SUBMITTED, note: f.response, by: f.owner!, at: ago(f.submittedAgo), findingId: finding.id, metadata: { number: finding.number } });
      if (f.verifiedAgo !== undefined) history.push({ type: AuditUpdateType.FINDING_VERIFIED, from: F.SUBMITTED, to: F.VERIFIED, by: seed.lead, at: ago(f.verifiedAgo), findingId: finding.id, metadata: { number: finding.number } });

      // Inbox: open actions for their owners, fixes for the lead to verify, overdue alerts.
      const data = { module: "audits", objectId: audit.id, reference: audit.referenceNumber, route: `/audits/${audit.id}`, status: seed.status };
      const send = (code: string, eventType: string, title: string, body: string) =>
        prisma.notification.create({ data: { userId: users[code].id, eventType, category: NotificationCategory.ACTION_REQUIRED, title, body, data, createdAt: ago(f.ago), dedupeKey: `seed:audit:${audit.referenceNumber}:${finding.number}:${code}:${eventType}` } });
      if (f.status === F.OPEN && owner) {
        if (f.due! < 0) await send(f.owner!, "AUDIT_ACTION_OVERDUE", "Corrective action overdue", `${finding.number} · ${f.title} was due ${shortDay.format(date(f.due!))}. ${audit.referenceNumber}`);
        else await send(f.owner!, "AUDIT_ACTION_ASSIGNED", `${FINDING_SEVERITY_LABEL[f.severity]} finding to fix by ${shortDay.format(date(f.due!))}`, `${finding.number} · ${f.title} — ${seed.title}. ${audit.referenceNumber}`);
      }
      if (f.status === F.SUBMITTED) await send(seed.lead, "AUDIT_ACTION_SUBMITTED", "Fix submitted for verification", `${finding.number} · ${f.title} — ${owner!.name}: ${f.response} ${audit.referenceNumber}`);
    }
    if (seed.fieldworkAgo !== undefined) history.push({ type: AuditUpdateType.STATUS_CHANGED, from: S.IN_PROGRESS, to: seed.closedAgo !== undefined && seed.closedAgo === seed.fieldworkAgo ? S.CLOSED : S.FOLLOW_UP, note: seed.conclusion, by: seed.lead, at: ago(seed.fieldworkAgo) });
    if (seed.closedAgo !== undefined && seed.closedAgo !== seed.fieldworkAgo) history.push({ type: AuditUpdateType.STATUS_CHANGED, from: S.FOLLOW_UP, to: S.CLOSED, by: seed.lead, at: ago(seed.closedAgo) });

    for (const h of history.sort((a, b) => a.at.getTime() - b.at.getTime())) {
      await prisma.auditUpdate.create({
        data: { auditId: audit.id, findingId: h.findingId ?? null, type: h.type, fromStatus: h.from ?? null, toStatus: h.to ?? null, note: h.note ?? null, actorUserId: users[h.by].id, actorName: users[h.by].name, metadata: h.metadata ?? {}, createdAt: h.at },
      });
    }
  }

  await prisma.trackingSequence.upsert({
    where: { branchCode_dayStamp: { branchCode: "AU", dayStamp: String(year) } },
    create: { branchCode: "AU", dayStamp: String(year), lastValue: seq },
    update: { lastValue: seq },
  });
}
