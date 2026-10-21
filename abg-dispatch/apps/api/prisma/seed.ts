/**
 * Demo data for ABG ONE: the organisation, the people named in the
 * product brief, every parcel state on today's board, and 30 days of history
 * so analytics have something to say.
 *
 *   bun prisma/seed.ts           seed an empty database
 *   bun prisma/seed.ts --reset   wipe and re-seed (development only)
 *
 * All seeded accounts use the password  Dispatch@2026
 */
import { Prisma, PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { existsSync } from "fs";
import { mkdir, readFile, writeFile } from "fs/promises";
import { join, resolve } from "path";
import type { SeedContext } from "./seed-modules/context";
import { seedFleet } from "./seed-modules/fleet";
import { seedLicences } from "./seed-modules/licences";
import { seedNotices } from "./seed-modules/notices";
import { seedTours } from "./seed-modules/tours";
import { seedVisitors } from "./seed-modules/visitors";
import {
  ANONYMOUS_REPORTER,
  ActorType,
  AssignmentStatus,
  CarrierType,
  Classification,
  EventType,
  INCIDENT_CATEGORY_LABEL,
  IncidentCategory,
  IncidentPhotoKind,
  IncidentSeverity,
  IncidentStatus,
  IncidentUpdateType,
  ParcelStatus,
  Priority,
  ProofType,
  ReceiverType,
  RoleCode,
  SlaAudience,
  SlaStage,
  VerificationMethod,
  dhakaDateStamp,
  formatIncidentNumber,
  formatTrackingNumber,
} from "@abg-dispatch/shared";

export const SEED_PASSWORD = "Dispatch@2026";
/** Handover PIN on every seeded parcel, so the PIN flow can be demonstrated. Real parcels get a random one. */
export const SEED_HANDOVER_PIN = "246810";
const token = () => randomBytes(18).toString("base64url");
const MIN = 60_000;

// ─── deterministic randomness ────────────────────────────────────────────────
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export async function resetDatabase(prisma: PrismaClient) {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = current_schema()
      AND tablename NOT IN ('_prisma_migrations', 'parcel_status_transitions')`;
  if (tables.length) await prisma.$executeRawUnsafe(`TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(", ")} CASCADE`);
}

interface PersonSeed {
  code: string;
  name: string;
  branch: string;
  dept: string;
  designation: string;
  phone: string;
  email?: string;
  roles?: { role: RoleCode; branch?: string }[];
  loc?: string;
  /** Employee code of their head of department / line manager (the approver for tours and pool cars). */
  manager?: string;
}

const BRANCHES = [
  { code: "HO", name: "ABG Head Office", type: "HEAD_OFFICE", unit: "CORP", address: "Plot 314/A, Block E, Bashundhara R/A", city: "Dhaka", phone: "09612000100" },
  { code: "CO", name: "ABG Corporate Office", type: "CORPORATE_OFFICE", unit: "CORP", address: "Road 90, Gulshan-2", city: "Dhaka", phone: "09612000200" },
  { code: "FCA", name: "Factory A", type: "FACTORY", unit: "MFG", address: "Kanchpur Industrial Area, Sonargaon", city: "Narayanganj", phone: "09612000300" },
  { code: "FCB", name: "Factory B", type: "FACTORY", unit: "MFG", address: "BSCIC Industrial Estate, Konabari", city: "Gazipur", phone: "09612000400" },
  { code: "DHK", name: "Dhaka Branch", type: "BRANCH_OFFICE", unit: "CORP", address: "Dilkusha C/A, Motijheel", city: "Dhaka", phone: "09612000500" },
  { code: "WH", name: "Central Warehouse", type: "WAREHOUSE", unit: "MFG", address: "Tongi Industrial Area", city: "Gazipur", phone: "09612000600" },
];

/** [branch, key, type, name, parentKey] — keys are referenced as "HO:LEGAL". */
const LOCATIONS: [string, string, string, string, string?][] = [
  ["HO", "GATE", "GATE", "Main Gate"],
  ["HO", "RECEPTION", "RECEPTION", "Ground Floor Reception"],
  ["HO", "L2", "FLOOR", "Level 2"],
  ["HO", "DISP", "DESK", "Internal Dispatch Desk", "L2"],
  ["HO", "L3", "FLOOR", "Level 3"],
  ["HO", "ADMIN", "DEPARTMENT", "Administration", "L3"],
  ["HO", "L4", "FLOOR", "Level 4"],
  ["HO", "HR", "DEPARTMENT", "Human Resources", "L4"],
  ["HO", "L5", "FLOOR", "Level 5"],
  ["HO", "FIN", "DEPARTMENT", "Finance Department", "L5"],
  ["HO", "PROC", "DEPARTMENT", "Procurement", "L5"],
  ["HO", "L7", "FLOOR", "Level 7"],
  ["HO", "LEGAL", "DEPARTMENT", "Legal Department", "L7"],
  ["HO", "L9", "FLOOR", "Level 9"],
  ["HO", "DIR", "OFFICE", "Director's Office", "L9"],
  ["CO", "RECEPTION", "RECEPTION", "Reception"],
  ["CO", "ACC", "DEPARTMENT", "Accounts"],
  ["CO", "BS", "OFFICE", "Board Secretariat"],
  ["FCA", "GATE", "GATE", "Security Gate"],
  ["FCA", "ADMINBLK", "BUILDING", "Administration Block"],
  ["FCA", "ADMIN", "DEPARTMENT", "Administration Office", "ADMINBLK"],
  ["FCA", "PROD", "DEPARTMENT", "Production Floor"],
  ["FCA", "STORE", "DEPARTMENT", "Store Room"],
  ["FCA", "QA", "DEPARTMENT", "Quality Lab"],
  ["FCB", "GATE", "GATE", "Main Gate"],
  ["FCB", "ADMIN", "DEPARTMENT", "Administration"],
  ["FCB", "PROD", "DEPARTMENT", "Production"],
  ["FCB", "QA", "DEPARTMENT", "Quality Assurance"],
  ["DHK", "DESK", "RECEPTION", "Front Desk"],
  ["DHK", "HR", "DEPARTMENT", "HR Department"],
  ["DHK", "SALES", "DEPARTMENT", "Sales"],
  ["WH", "GATE", "GATE", "Loading Bay Gate"],
  ["WH", "STORE", "DEPARTMENT", "Stores Office"],
];

const DEPARTMENTS: [string, string, string, string][] = [
  ["HO", "LEGAL", "Legal", "LEGAL"],
  ["HO", "FIN", "Finance", "FIN"],
  ["HO", "ADMIN", "Administration", "ADMIN"],
  ["HO", "DISP", "Internal Dispatch", "DISP"],
  ["HO", "HR", "Human Resources", "HR"],
  ["HO", "DIR", "Director's Office", "DIR"],
  ["HO", "PROC", "Procurement", "PROC"],
  ["CO", "ACC", "Accounts", "ACC"],
  ["CO", "BS", "Board Secretariat", "BS"],
  ["FCA", "ADMIN", "Administration", "ADMIN"],
  ["FCA", "PROD", "Production", "PROD"],
  ["FCA", "STORE", "Stores", "STORE"],
  ["FCA", "QA", "Quality", "QA"],
  ["FCB", "ADMIN", "Administration", "ADMIN"],
  ["FCB", "PROD", "Production", "PROD"],
  ["FCB", "QA", "Quality Assurance", "QA"],
  ["DHK", "HR", "Human Resources", "HR"],
  ["DHK", "SALES", "Sales", "SALES"],
  ["WH", "STORE", "Stores", "STORE"],
];

export const PEOPLE: PersonSeed[] = [
  { code: "ABG-0001", name: "System Administrator", branch: "HO", dept: "ADMIN", designation: "IT Systems Administrator", phone: "01700000001", email: "admin@abg.com.bd", roles: [{ role: RoleCode.SUPER_ADMIN }, { role: RoleCode.EMPLOYEE }], manager: "ABG-1001" },
  { code: "ABG-1001", name: "Arif Chowdhury", branch: "HO", dept: "ADMIN", designation: "Head of Administration", phone: "01711000101", email: "arif.chowdhury@abg.com.bd", roles: [{ role: RoleCode.HEAD_OFFICE_ADMIN }, { role: RoleCode.EMPLOYEE }], manager: "ABG-1002" },
  { code: "ABG-2041", name: "Md. Rahim", branch: "HO", dept: "LEGAL", designation: "Senior Legal Officer", phone: "01712204100", email: "rahim@abg.com.bd", roles: [{ role: RoleCode.EMPLOYEE }], manager: "ABG-2210" },
  { code: "ABG-2055", name: "Nusrat Jahan", branch: "HO", dept: "FIN", designation: "Finance Manager", phone: "01713205500", email: "nusrat.jahan@abg.com.bd", roles: [{ role: RoleCode.HR_FINANCE }, { role: RoleCode.EMPLOYEE }], manager: "ABG-2210" },
  { code: "ABG-2101", name: "Sadia Rahman", branch: "HO", dept: "HR", designation: "HR Manager", phone: "01714210100", email: "sadia.rahman@abg.com.bd", roles: [{ role: RoleCode.HR_FINANCE }, { role: RoleCode.EMPLOYEE }], manager: "ABG-2210" },
  { code: "ABG-2210", name: "Farid Uddin", branch: "HO", dept: "DIR", designation: "Executive Director", phone: "01715221000", email: "farid.uddin@abg.com.bd", roles: [{ role: RoleCode.EMPLOYEE }], manager: "ABG-1002" },
  { code: "ABG-2305", name: "Mehedi Hasan", branch: "HO", dept: "PROC", designation: "Procurement Officer", phone: "01716230500", email: "mehedi.hasan@abg.com.bd", roles: [{ role: RoleCode.EMPLOYEE }], manager: "ABG-2055" },
  { code: "ABG-3550", name: "Tanvir Hasan", branch: "HO", dept: "DISP", designation: "Dispatch Officer", phone: "01717355000", email: "tanvir.hasan@abg.com.bd", roles: [{ role: RoleCode.DISPATCH_OFFICER }, { role: RoleCode.EMPLOYEE }], loc: "HO:DISP", manager: "ABG-1001" },
  { code: "ABG-4832", name: "Karim Ahmed", branch: "HO", dept: "DISP", designation: "Internal Runner", phone: "01718483200", email: "karim.ahmed@abg.com.bd", roles: [{ role: RoleCode.COURIER_RUNNER }, { role: RoleCode.EMPLOYEE }], loc: "HO:DISP", manager: "ABG-3550" },
  { code: "ABG-4870", name: "Rafiq Islam", branch: "FCA", dept: "STORE", designation: "Runner", phone: "01719487000", email: "rafiq.islam@abg.com.bd", roles: [{ role: RoleCode.COURIER_RUNNER }, { role: RoleCode.EMPLOYEE }], manager: "ABG-5120" },
  { code: "ABG-5120", name: "Sabina Yasmin", branch: "FCA", dept: "ADMIN", designation: "Factory Admin Lead", phone: "01720512000", email: "sabina.yasmin@abg.com.bd", roles: [{ role: RoleCode.BRANCH_ADMIN }, { role: RoleCode.EMPLOYEE }], manager: "ABG-1001" },
  { code: "ABG-5205", name: "Kamrul Hasan", branch: "FCA", dept: "ADMIN", designation: "Front Desk & Dispatch", phone: "01721520500", email: "kamrul.hasan@abg.com.bd", roles: [{ role: RoleCode.DISPATCH_OFFICER }, { role: RoleCode.EMPLOYEE }], loc: "FCA:GATE", manager: "ABG-5120" },
  { code: "ABG-7231", name: "Farhana Islam", branch: "FCA", dept: "ADMIN", designation: "Administration Manager", phone: "01722723100", email: "farhana.islam@abg.com.bd", roles: [{ role: RoleCode.EMPLOYEE }], manager: "ABG-5120" },
  { code: "ABG-7310", name: "Shahin Ahmed", branch: "FCA", dept: "ADMIN", designation: "Administrative Assistant", phone: "01723731000", email: "shahin.ahmed@abg.com.bd", roles: [{ role: RoleCode.EMPLOYEE }], manager: "ABG-7231" },
  { code: "ABG-7420", name: "Imran Hossain", branch: "FCB", dept: "PROD", designation: "Production Manager", phone: "01724742000", email: "imran.hossain@abg.com.bd", roles: [{ role: RoleCode.EMPLOYEE }], manager: "ABG-7455" },
  { code: "ABG-7455", name: "Tahmina Begum", branch: "FCB", dept: "ADMIN", designation: "Factory B Admin Lead", phone: "01725745500", email: "tahmina.begum@abg.com.bd", roles: [{ role: RoleCode.BRANCH_ADMIN }, { role: RoleCode.EMPLOYEE }], manager: "ABG-1001" },
  { code: "ABG-6021", name: "Jamal Uddin", branch: "CO", dept: "ACC", designation: "Accounts Officer", phone: "01726602100", email: "jamal.uddin@abg.com.bd", roles: [{ role: RoleCode.EMPLOYEE }], manager: "ABG-2210" },
  { code: "ABG-6110", name: "Rubina Akter", branch: "CO", dept: "BS", designation: "Board Secretary", phone: "01727611000", email: "rubina.akter@abg.com.bd", roles: [{ role: RoleCode.EMPLOYEE }], manager: "ABG-1002" },
  { code: "ABG-6150", name: "Laila Rahman", branch: "DHK", dept: "HR", designation: "HR Executive", phone: "01728615000", email: "laila.rahman@abg.com.bd", roles: [{ role: RoleCode.EMPLOYEE }], manager: "ABG-2101" },
  { code: "ABG-6188", name: "Nazmul Karim", branch: "DHK", dept: "SALES", designation: "Sales Manager", phone: "01729618800", email: "nazmul.karim@abg.com.bd", roles: [{ role: RoleCode.EMPLOYEE }], manager: "ABG-2210" },
  { code: "ABG-8015", name: "Selim Reza", branch: "WH", dept: "STORE", designation: "Warehouse Supervisor", phone: "01730801500", email: "selim.reza@abg.com.bd", roles: [{ role: RoleCode.EMPLOYEE }], manager: "ABG-1001" },
  { code: "ABG-9002", name: "Mahmuda Akter", branch: "HO", dept: "ADMIN", designation: "Internal Auditor", phone: "01731900200", email: "mahmuda.akter@abg.com.bd", roles: [{ role: RoleCode.AUDITOR }], manager: "ABG-1002" },
  // Leadership and the people who run the ABG ONE modules.
  { code: "ABG-1003", name: "Shafiqul Alam", branch: "HO", dept: "DIR", designation: "Chairman", phone: "01711000103", email: "chairman@abg.com.bd", roles: [{ role: RoleCode.EXECUTIVE }, { role: RoleCode.EMPLOYEE }] },
  { code: "ABG-1002", name: "Kazi Ashraful Haque", branch: "HO", dept: "DIR", designation: "Managing Director", phone: "01711000102", email: "md@abg.com.bd", roles: [{ role: RoleCode.EXECUTIVE }, { role: RoleCode.EMPLOYEE }], manager: "ABG-1003" },
  { code: "ABG-2400", name: "Shirin Akhter", branch: "HO", dept: "ADMIN", designation: "Compliance & Licensing Manager", phone: "01737240000", email: "shirin.akhter@abg.com.bd", roles: [{ role: RoleCode.COMPLIANCE_OFFICER }, { role: RoleCode.EMPLOYEE }], manager: "ABG-2210" },
  { code: "ABG-3610", name: "Jahangir Alam", branch: "HO", dept: "ADMIN", designation: "Transport & Fleet Manager", phone: "01738361000", email: "jahangir.alam@abg.com.bd", roles: [{ role: RoleCode.FLEET_MANAGER }, { role: RoleCode.EMPLOYEE }], manager: "ABG-1001" },
  { code: "ABG-3620", name: "Abul Kalam", branch: "HO", dept: "ADMIN", designation: "Driver", phone: "01739362000", email: "abul.kalam@abg.com.bd", roles: [{ role: RoleCode.DRIVER }], manager: "ABG-3610", loc: "HO:GATE" },
  { code: "ABG-3621", name: "Mizanur Rahman", branch: "HO", dept: "ADMIN", designation: "Driver", phone: "01740362100", email: "mizanur.rahman@abg.com.bd", roles: [{ role: RoleCode.DRIVER }], manager: "ABG-3610", loc: "HO:GATE" },
  { code: "ABG-7620", name: "Sohel Rana", branch: "FCA", dept: "ADMIN", designation: "Driver", phone: "01741762000", email: "sohel.rana@abg.com.bd", roles: [{ role: RoleCode.DRIVER }], manager: "ABG-3610", loc: "FCA:GATE" },
  { code: "ABG-3700", name: "Rezaul Karim", branch: "HO", dept: "ADMIN", designation: "Security Officer, Reception", phone: "01742370000", email: "rezaul.karim@abg.com.bd", roles: [{ role: RoleCode.SECURITY_GUARD }], manager: "ABG-1001", loc: "HO:RECEPTION" },
  { code: "ABG-5290", name: "Nurul Amin", branch: "FCA", dept: "ADMIN", designation: "Security Supervisor, Main Gate", phone: "01743529000", email: "nurul.amin@abg.com.bd", roles: [{ role: RoleCode.SECURITY_GUARD }], manager: "ABG-5120", loc: "FCA:GATE" },
  // Directory-only employees (no app account yet).
  { code: "ABG-2120", name: "Taslima Nasrin", branch: "HO", dept: "HR", designation: "HR Executive", phone: "01732212000" },
  { code: "ABG-2066", name: "Rashed Khan", branch: "HO", dept: "FIN", designation: "Treasury Officer", phone: "01733206600" },
  { code: "ABG-7333", name: "Monir Hossain", branch: "FCA", dept: "PROD", designation: "Shift Supervisor", phone: "01734733300" },
  { code: "ABG-7466", name: "Sharmin Sultana", branch: "FCB", dept: "QA", designation: "QA Engineer", phone: "01735746600" },
  { code: "ABG-6033", name: "Habibur Rahman", branch: "CO", dept: "ACC", designation: "Chief Accountant", phone: "01736603300" },
];

const CATEGORIES = [
  ["OFFICIAL_DOCUMENT", "Official Document"],
  ["AGREEMENT_CONTRACT", "Agreement / Contract"],
  ["INVOICE_BILL", "Invoice / Bill"],
  ["CHEQUE_FINANCIAL", "Cheque / Financial Document"],
  ["APPROVAL_FILE", "Approval File"],
  ["LEGAL_DOCUMENT", "Legal Document"],
  ["HR_DOCUMENT", "HR Document"],
  ["DRAWING_BLUEPRINT", "Drawing / Blueprint"],
  ["TENDER_DOCUMENT", "Tender Document"],
  ["TECHNICAL_PAPER", "Technical Paper"],
  ["PROFESSIONAL_INSTRUMENT", "Professional Instrument"],
  ["ELECTRONIC_DEVICE", "Electronic Device"],
  ["SAMPLE", "Sample"],
  ["SPARE_PART", "Spare Part"],
  ["CONFIDENTIAL_PACKAGE", "Confidential Package"],
  ["OTHER", "Other"],
];

type Actor = string | "SYSTEM" | { guest: string } | { provider: string };

interface Step {
  type: EventType;
  at: number; // minutes after start
  to?: ParcelStatus;
  by?: Actor;
  loc?: string;
  locName?: string;
  verify?: string;
  proof?: string;
  notes?: string;
  meta?: Record<string, unknown>;
}

interface ParcelSeed {
  title: string;
  description: string;
  category: string;
  classification: Classification;
  priority: Priority;
  sender: string;
  creator?: string;
  receiver: { employee: string } | { department: string } | { external: { name: string; phone: string; organization: string; address: string } };
  originLoc?: string;
  destLoc?: string;
  carrier?: { employee: string } | { guest: string } | { external: { provider: string; tracking: string; rider?: string; riderPhone?: string } };
  start: Date;
  steps: Step[];
  expectedMinutes?: number;
  overdue?: boolean;
  receivedBy?: { code?: string; name?: string; onBehalf?: boolean; reason?: string; relationship?: string };
  exception?: { code: string; details: string; raisedBy: string; resolvedBy?: string; resolution?: string; at: number };
  sequence?: number;
  draft?: boolean;
}

export async function seed(prisma: PrismaClient, opts: { now?: Date; history?: boolean } = {}) {
  const now = opts.now ?? new Date();
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);
  const pinHash = await bcrypt.hash(SEED_HANDOVER_PIN, 8);

  // ── organisation ──
  const org = await prisma.organization.create({ data: { name: "Anvir Bashundhara Group", code: "ABG" } });
  const units = {
    CORP: await prisma.businessUnit.create({ data: { organizationId: org.id, name: "ABG Corporate", code: "CORP" } }),
    MFG: await prisma.businessUnit.create({ data: { organizationId: org.id, name: "ABG Manufacturing", code: "MFG" } }),
  };
  const branches: Record<string, { id: string; name: string; code: string }> = {};
  const locations: Record<string, { id: string; path: string; branchId: string }> = {};
  for (const b of BRANCHES) {
    const branch = await prisma.branch.create({
      data: { organizationId: org.id, businessUnitId: units[b.unit as "CORP" | "MFG"].id, name: b.name, code: b.code, type: b.type, address: b.address, city: b.city, phone: b.phone },
    });
    branches[b.code] = branch;
    const site = await prisma.location.create({ data: { branchId: branch.id, type: "SITE", name: b.name, path: b.name } });
    locations[`${b.code}:SITE`] = { id: site.id, path: site.path, branchId: branch.id };
  }
  for (const [b, key, type, name, parent] of LOCATIONS) {
    const parentLoc = locations[`${b}:${parent ?? "SITE"}`];
    const path = `${parentLoc.path} › ${name}`;
    const loc = await prisma.location.create({ data: { branchId: branches[b].id, parentId: parentLoc.id, type, name, code: key, path } });
    locations[`${b}:${key}`] = { id: loc.id, path, branchId: branches[b].id };
  }
  const departments: Record<string, { id: string; name: string; locationId: string | null }> = {};
  for (const [b, code, name, locKey] of DEPARTMENTS) {
    const d = await prisma.department.create({ data: { branchId: branches[b].id, code, name, locationId: locations[`${b}:${locKey}`]?.id ?? null } });
    departments[`${b}:${code}`] = d;
  }

  // ── people ──
  const employees: Record<string, { id: string; fullName: string; phone: string | null; branchId: string; code: string; branch: string; departmentId: string | null; locKey: string }> = {};
  const users: Record<string, { id: string; name: string; code: string }> = {};
  for (const p of PEOPLE) {
    const dept = departments[`${p.branch}:${p.dept}`];
    const locKey = p.loc ?? `${p.branch}:${DEPARTMENTS.find((d) => d[0] === p.branch && d[1] === p.dept)?.[3] ?? "SITE"}`;
    const e = await prisma.employee.create({
      data: {
        employeeCode: p.code,
        fullName: p.name,
        phone: p.phone,
        email: p.email ?? null,
        designation: p.designation,
        branchId: branches[p.branch].id,
        departmentId: dept.id,
        defaultLocationId: locations[locKey]?.id ?? null,
      },
    });
    employees[p.code] = { id: e.id, fullName: e.fullName, phone: e.phone, branchId: e.branchId, code: p.code, branch: p.branch, departmentId: dept.id, locKey };
    if (p.email && p.roles) {
      const u = await prisma.user.create({
        data: {
          email: p.email,
          employeeId: e.id,
          displayName: p.name,
          passwordHash,
          lastLoginAt: new Date(now.getTime() - 60 * MIN),
          roles: { create: p.roles.map((r) => ({ role: r.role, branchId: r.branch ? branches[r.branch].id : null })) },
        },
      });
      users[p.code] = { id: u.id, name: p.name, code: p.code };
    }
  }
  // Reporting lines: each person's manager is the approver for their tour and pool car requests.
  for (const p of PEOPLE) {
    if (p.manager && employees[p.manager]) await prisma.employee.update({ where: { id: employees[p.code].id }, data: { managerId: employees[p.manager].id } });
  }
  const admin = users["ABG-0001"];

  const categories: Record<string, string> = {};
  for (const [i, [code, name]] of CATEGORIES.entries()) {
    const c = await prisma.parcelCategory.create({ data: { code, name, sortOrder: i * 10 } });
    categories[code] = c.id;
  }

  const providers: Record<string, { id: string; name: string }> = {};
  for (const [code, name, webhook] of [
    ["PATHAO", "Pathao Courier", true],
    ["REDX", "REDX", false],
    ["STEADFAST", "Steadfast Courier", true],
    ["OTHER", "Other courier", false],
  ] as const) {
    providers[code] = await prisma.courierProvider.create({
      data: { code, name, webhookEnabled: webhook, healthStatus: webhook ? "HEALTHY" : "UNKNOWN", healthMessage: webhook ? "Webhook endpoint ready" : null, healthCheckedAt: webhook ? now : null },
    });
  }

  const guests: Record<string, { id: string; fullName: string; phone: string; vehicle: string | null }> = {};
  for (const g of [
    { key: "malek", fullName: "Abdul Malek", phone: "01811223344", company: "ABG Transport Pool", vehicleNumber: "DHAKA METRO-GA 11-2345", idType: "NID", idReference: "•••• 4471" },
    { key: "jahid", fullName: "Jahid Hasan", phone: "01822334455", company: "Rent-a-Car Services", vehicleNumber: "DHAKA METRO-CHA 15-8890", idType: null, idReference: null },
    { key: "babul", fullName: "Babul Mia", phone: "01833445566", company: "Messenger", vehicleNumber: null, idType: null, idReference: null },
  ]) {
    const created = await prisma.guestCarrier.create({
      data: { fullName: g.fullName, phone: g.phone, company: g.company, vehicleNumber: g.vehicleNumber, idType: g.idType, idReference: g.idReference, createdByUserId: users["ABG-3550"].id, phoneVerifiedAt: g.key === "malek" ? null : now },
    });
    guests[g.key] = { id: created.id, fullName: created.fullName, phone: created.phone, vehicle: created.vehicleNumber };
  }

  // ── SLA rules ──
  const sla: Prisma.SlaPolicyCreateManyInput[] = [
    { name: "Critical pickup reminder", stage: SlaStage.PICKUP, thresholdMinutes: 15, priority: Priority.CRITICAL, audience: [SlaAudience.CARRIER, SlaAudience.SENDER, SlaAudience.DISPATCH_OFFICER] },
    { name: "Urgent pickup reminder", stage: SlaStage.PICKUP, thresholdMinutes: 30, priority: Priority.URGENT, audience: [SlaAudience.CARRIER, SlaAudience.SENDER] },
    { name: "Pickup not started", stage: SlaStage.PICKUP, thresholdMinutes: 120, audience: [SlaAudience.DISPATCH_OFFICER, SlaAudience.BRANCH_ADMIN], marksOverdue: true },
    { name: "Transit taking long", stage: SlaStage.DELIVERY, thresholdMinutes: 240, audience: [SlaAudience.DISPATCH_OFFICER] },
    { name: "Receipt reminder", stage: SlaStage.RECEIPT, thresholdMinutes: 60, audience: [SlaAudience.RECEIVER] },
    { name: "Receipt escalation", stage: SlaStage.RECEIPT, thresholdMinutes: 120, audience: [SlaAudience.BRANCH_ADMIN, SlaAudience.RECEIVER], marksOverdue: true },
    { name: "Office SLA breached", stage: SlaStage.END_TO_END, thresholdMinutes: 480, audience: [SlaAudience.HEAD_OFFICE_ADMIN, SlaAudience.BRANCH_ADMIN], marksOverdue: true },
  ];
  await prisma.slaPolicy.createMany({ data: sla });
  const slaPolicies = await prisma.slaPolicy.findMany();
  const policy = (name: string) => slaPolicies.find((p) => p.name === name)!;

  // ── parcel builder ──
  const counters = new Map<string, number>();
  const nextSeq = (branch: string, at: Date, explicit?: number) => {
    const key = `${branch}|${dhakaDateStamp(at)}`;
    const value = explicit ?? (counters.get(key) ?? 0) + 1;
    counters.set(key, Math.max(value, counters.get(key) ?? 0));
    return value;
  };

  const actorOf = (by: Actor | undefined, fallback: string) => {
    const a = by ?? fallback;
    if (a === "SYSTEM") return { actorType: ActorType.SYSTEM, actorUserId: null, actorGuestId: null, actorNameSnapshot: "ABG ONE", actorCodeSnapshot: null };
    if (typeof a === "object" && "guest" in a) {
      const g = guests[a.guest];
      return { actorType: ActorType.GUEST, actorUserId: null, actorGuestId: g.id, actorNameSnapshot: g.fullName, actorCodeSnapshot: `${g.phone.slice(0, 3)}•••••${g.phone.slice(-3)}` };
    }
    if (typeof a === "object" && "provider" in a) {
      const p = providers[a.provider];
      return { actorType: ActorType.EXTERNAL_PROVIDER, actorUserId: null, actorGuestId: null, actorNameSnapshot: p.name, actorCodeSnapshot: a.provider };
    }
    const e = employees[a];
    return { actorType: ActorType.EMPLOYEE, actorUserId: users[a]?.id ?? null, actorGuestId: null, actorNameSnapshot: e.fullName, actorCodeSnapshot: e.code };
  };

  const createdParcels: Record<string, string> = {};

  async function makeParcel(key: string, s: ParcelSeed) {
    const sender = employees[s.sender];
    const creator = employees[s.creator ?? s.sender];
    const at = (m: number) => new Date(s.start.getTime() + m * MIN);
    let status: ParcelStatus = s.draft ? ParcelStatus.DRAFT : ParcelStatus.BOOKED;
    for (const step of s.steps) if (step.to) status = step.to;
    const stepAt = (type: EventType) => {
      const st = [...s.steps].reverse().find((x) => x.type === type);
      return st ? at(st.at) : null;
    };

    let receiverEmployeeId: string | null = null;
    let receiverDepartmentId: string | null = null;
    let destinationBranchId: string | null = null;
    let destinationLocationId: string | null = null;
    let receiverType: string = ReceiverType.EMPLOYEE;
    let external: { name: string; phone: string; organization: string; address: string } | null = null;
    if ("employee" in s.receiver) {
      const r = employees[s.receiver.employee];
      receiverEmployeeId = r.id;
      destinationBranchId = r.branchId;
      destinationLocationId = locations[s.destLoc ?? r.locKey]?.id ?? null;
    } else if ("department" in s.receiver) {
      const d = departments[s.receiver.department];
      receiverType = ReceiverType.DEPARTMENT;
      receiverDepartmentId = d.id;
      destinationBranchId = branches[s.receiver.department.split(":")[0]].id;
      destinationLocationId = d.locationId;
    } else {
      receiverType = ReceiverType.EXTERNAL;
      external = s.receiver.external;
    }
    const destLoc = destinationLocationId ? Object.values(locations).find((l) => l.id === destinationLocationId)! : null;
    const originLoc = locations[s.originLoc ?? sender.locKey];

    const carrier = s.carrier;
    const deliveryMethod = !carrier ? CarrierType.INTERNAL_EMPLOYEE : "employee" in carrier ? CarrierType.INTERNAL_EMPLOYEE : "guest" in carrier ? CarrierType.GUEST_PERSON : CarrierType.EXTERNAL_COURIER;
    const trackingNumber = formatTrackingNumber(s.start, sender.branch, nextSeq(sender.branch, s.start, s.sequence));

    const receivedAt = stepAt(EventType.RECEIVED);
    const actualReceiver = s.receivedBy?.code ? employees[s.receivedBy.code] : "employee" in s.receiver && receivedAt ? employees[s.receiver.employee] : null;

    const parcel = await prisma.parcel.create({
      data: {
        trackingNumber,
        qrToken: token(),
        title: s.title,
        description: s.description,
        categoryId: categories[s.category],
        classification: s.classification,
        priority: s.priority,
        status,
        deliveryMethod,
        createdById: users[creator.code].id,
        senderEmployeeId: sender.id,
        senderDepartmentId: sender.departmentId,
        originBranchId: sender.branchId,
        originLocationId: originLoc?.id ?? null,
        receiverType,
        receiverEmployeeId,
        receiverDepartmentId,
        externalReceiverName: external?.name ?? null,
        externalReceiverPhone: external?.phone ?? null,
        externalReceiverOrganization: external?.organization ?? null,
        externalReceiverAddress: external?.address ?? null,
        destinationBranchId,
        destinationLocationId,
        expectedDeliveryAt: s.expectedMinutes ? at(s.expectedMinutes) : null,
        handoverPinHash: pinHash,
        actualReceiverEmployeeId: receivedAt ? (actualReceiver?.id ?? null) : null,
        actualReceiverName: receivedAt ? (actualReceiver?.fullName ?? s.receivedBy?.name ?? external?.name ?? null) : null,
        actualReceiverCode: receivedAt ? (actualReceiver?.code ?? null) : null,
        actualReceiverPhone: receivedAt ? (actualReceiver?.phone ?? external?.phone ?? null) : null,
        receivedOnBehalf: !!s.receivedBy?.onBehalf,
        onBehalfReason: s.receivedBy?.reason ?? null,
        onBehalfRelationship: s.receivedBy?.relationship ?? null,
        receiptVerification: receivedAt ? ([...s.steps].reverse().find((x) => x.type === EventType.RECEIVED)?.verify ?? VerificationMethod.APP_CONFIRMATION) : null,
        bookedAt: s.draft ? null : s.start,
        carrierAssignedAt: stepAt(EventType.CARRIER_ASSIGNED),
        handedOverAt: stepAt(EventType.HANDOVER_CONFIRMED),
        pickedUpAt: stepAt(EventType.PICKED_UP),
        inTransitAt: stepAt(EventType.IN_TRANSIT),
        arrivedAt: stepAt(EventType.ARRIVED_AT_DESTINATION),
        pendingReceiptAt: stepAt(EventType.PENDING_RECEIPT),
        receivedAt,
        cancelledAt: stepAt(EventType.CANCELLED),
        returnRequestedAt: stepAt(EventType.RETURN_REQUESTED),
        returnedAt: stepAt(EventType.RETURNED),
        statusChangedAt: at([...s.steps].reverse().find((x) => x.to)?.at ?? 0),
        resumeStatus: status === ParcelStatus.DELIVERY_EXCEPTION ? ParcelStatus.IN_TRANSIT : null,
        isOverdue: !!s.overdue && !["RECEIVED", "RETURNED", "CANCELLED"].includes(status),
        overdueSince: s.overdue ? at([...s.steps].reverse().find((x) => x.type === EventType.SLA_ESCALATED)?.at ?? s.steps[s.steps.length - 1]?.at ?? 0) : null,
        hasOpenException: !!s.exception && !s.exception.resolvedBy,
        createdAt: s.start,
        updatedAt: at(s.steps[s.steps.length - 1]?.at ?? 0),
      },
    });

    let assignmentId: string | null = null;
    if (carrier) {
      const assignedAt = stepAt(EventType.CARRIER_ASSIGNED) ?? s.start;
      const terminal = ["RECEIVED", "RETURNED"].includes(status) ? AssignmentStatus.COMPLETED : status === "CANCELLED" ? AssignmentStatus.CANCELLED : stepAt(EventType.PICKED_UP) ? AssignmentStatus.IN_CUSTODY : stepAt(EventType.CARRIER_ACCEPTED) || stepAt(EventType.HANDOVER_REQUESTED) ? AssignmentStatus.ACCEPTED : AssignmentStatus.ASSIGNED;
      const base = {
        parcelId: parcel.id,
        carrierType: deliveryMethod,
        status: terminal,
        assignedByUserId: users[creator.code].id,
        assignedAt,
        acceptedAt: stepAt(EventType.HANDOVER_REQUESTED) ?? stepAt(EventType.PICKED_UP),
        handoverRequestedAt: stepAt(EventType.HANDOVER_REQUESTED),
        custodyStartedAt: stepAt(EventType.PICKED_UP),
        endedAt: receivedAt ?? stepAt(EventType.RETURNED) ?? stepAt(EventType.CANCELLED),
      };
      let a;
      if ("employee" in carrier) {
        const c = employees[carrier.employee];
        a = await prisma.carrierAssignment.create({ data: { ...base, employeeId: c.id, carrierNameSnapshot: c.fullName, carrierPhoneSnapshot: c.phone, carrierCodeSnapshot: c.code } });
      } else if ("guest" in carrier) {
        const g = guests[carrier.guest];
        a = await prisma.carrierAssignment.create({ data: { ...base, guestCarrierId: g.id, carrierNameSnapshot: g.fullName, carrierPhoneSnapshot: g.phone, carrierCodeSnapshot: g.vehicle } });
      } else {
        const p = providers[carrier.external.provider];
        a = await prisma.carrierAssignment.create({
          data: {
            ...base,
            courierProviderId: p.id,
            externalTrackingNumber: carrier.external.tracking,
            riderName: carrier.external.rider ?? null,
            riderPhone: carrier.external.riderPhone ?? null,
            carrierNameSnapshot: carrier.external.rider ? `${p.name} · ${carrier.external.rider}` : p.name,
            carrierPhoneSnapshot: carrier.external.riderPhone ?? null,
            carrierCodeSnapshot: carrier.external.tracking,
            externalRawStatus: [...s.steps].reverse().find((x) => x.type === EventType.EXTERNAL_STATUS_UPDATE)?.meta?.rawStatus as string | undefined,
            externalStatusAt: [...s.steps].reverse().find((x) => x.type === EventType.EXTERNAL_STATUS_UPDATE) ? at([...s.steps].reverse().find((x) => x.type === EventType.EXTERNAL_STATUS_UPDATE)!.at) : null,
          },
        });
      }
      assignmentId = a.id;
      await prisma.parcel.update({ where: { id: parcel.id }, data: { currentAssignmentId: a.id } });
    }

    let prev: ParcelStatus | null = null;
    let seq = 0;
    for (const step of [{ type: EventType.PARCEL_CREATED, at: 0, to: s.draft ? ParcelStatus.DRAFT : ParcelStatus.BOOKED, by: s.creator ?? s.sender } as Step, ...s.steps]) {
      seq++;
      let proofId: string | null = null;
      if (step.proof) {
        const proof = await prisma.parcelProof.create({
          data: { parcelId: parcel.id, type: step.proof, createdByUserId: typeof step.by === "string" && step.by !== "SYSTEM" ? users[step.by]?.id ?? null : null, metadata: (step.meta ?? {}) as object, createdAt: at(step.at) },
        });
        proofId = proof.id;
      }
      const loc = step.loc ? locations[step.loc] : null;
      await prisma.parcelEvent.create({
        data: {
          parcelId: parcel.id,
          sequence: seq,
          eventType: step.type,
          fromStatus: seq === 1 ? null : step.to ? prev : null,
          toStatus: step.to ?? null,
          ...actorOf(step.by, s.sender),
          locationId: loc?.id ?? null,
          locationNameSnapshot: loc?.path ?? step.locName ?? null,
          carrierAssignmentId: assignmentId,
          serverTimestamp: at(step.at),
          verificationMethod: step.verify ?? null,
          proofId,
          notes: step.notes ?? null,
          externalProvider: typeof step.by === "object" && "provider" in step.by ? step.by.provider : null,
          metadata: (step.meta ?? {}) as object,
          createdAt: at(step.at),
        },
      });
      if (step.to) prev = step.to;
    }
    await prisma.parcel.update({ where: { id: parcel.id }, data: { lastEventSequence: seq } });

    if (s.exception) {
      await prisma.parcelException.create({
        data: {
          parcelId: parcel.id,
          code: s.exception.code,
          details: s.exception.details,
          statusBefore: ParcelStatus.IN_TRANSIT,
          raisedByName: employees[s.exception.raisedBy]?.fullName ?? s.exception.raisedBy,
          raisedByUserId: users[s.exception.raisedBy]?.id ?? null,
          raisedAt: at(s.exception.at),
          resolvedByName: s.exception.resolvedBy ? employees[s.exception.resolvedBy].fullName : null,
          resolvedByUserId: s.exception.resolvedBy ? users[s.exception.resolvedBy]?.id ?? null : null,
          resolvedAt: s.exception.resolvedBy ? at(s.exception.at + 40) : null,
          resolution: s.exception.resolution ?? null,
        },
      });
    }
    createdParcels[key] = parcel.id;
    return parcel;
  }

  // Standard happy-path steps for an internal courier.
  const happy = (o: { sender: string; carrier: string; receiver?: string; origin: string; dest: string; t: number[]; via?: string; verify?: string; receiptBy?: string; guest?: boolean }) => {
    const carrierActor: Actor = o.guest ? { guest: o.carrier } : o.carrier;
    const [assign, request, confirm, pickup, transit, arrive, receive] = o.t;
    const steps: Step[] = [
      { type: EventType.CARRIER_ASSIGNED, at: assign, to: ParcelStatus.AWAITING_PICKUP, by: o.sender, meta: { carrierName: o.guest ? guests[o.carrier].fullName : employees[o.carrier].fullName } },
    ];
    if (request !== undefined) steps.push({ type: EventType.HANDOVER_REQUESTED, at: request, by: carrierActor, loc: o.origin });
    if (confirm !== undefined) {
      steps.push({ type: EventType.HANDOVER_CONFIRMED, at: confirm, by: o.sender, loc: o.origin, verify: VerificationMethod.SENDER_APP, proof: ProofType.SENDER_APP, meta: { scannedByCarrier: true } });
    }
    if (pickup !== undefined) steps.push({ type: EventType.PICKED_UP, at: pickup, to: ParcelStatus.PICKED_UP, by: o.sender, loc: o.origin, verify: VerificationMethod.SENDER_APP });
    if (transit !== undefined) steps.push({ type: EventType.IN_TRANSIT, at: transit, to: ParcelStatus.IN_TRANSIT, by: carrierActor });
    if (o.via && arrive !== undefined) steps.push({ type: EventType.CHECKPOINT, at: arrive - 3, by: carrierActor, loc: o.via });
    if (arrive !== undefined) {
      steps.push({ type: EventType.ARRIVED_AT_DESTINATION, at: arrive, to: ParcelStatus.ARRIVED_AT_DESTINATION, by: carrierActor, loc: o.dest });
      steps.push({ type: EventType.PENDING_RECEIPT, at: arrive, to: ParcelStatus.PENDING_RECEIPT, by: "SYSTEM", loc: o.dest });
    }
    if (receive !== undefined) {
      steps.push({
        type: EventType.RECEIVED,
        at: receive,
        to: ParcelStatus.RECEIVED,
        by: o.verify === VerificationMethod.OTP ? carrierActor : (o.receiptBy ?? o.receiver),
        loc: o.dest,
        verify: o.verify ?? VerificationMethod.APP_CONFIRMATION,
        proof: o.verify === VerificationMethod.OTP ? ProofType.OTP : ProofType.APP_CONFIRMATION,
        meta: { receivedBy: employees[o.receiptBy ?? o.receiver ?? o.sender]?.fullName },
      });
    }
    return steps;
  };

  // ── today's board ──
  const minutesAgo = (m: number) => new Date(now.getTime() - m * MIN);
  const startOfDhakaDay = new Date(`${new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka" }).format(now)}T00:00:00+06:00`);
  const today = (m: number) => {
    const t = minutesAgo(m);
    return t < startOfDhakaDay ? new Date(startOfDhakaDay.getTime() + 5 * MIN) : t;
  };

  // The reference parcel from the brief, timed exactly as in its example timeline.
  await makeParcel("sample", {
    title: "Quarterly Supplier Agreement",
    description: "Agreement requiring director signature and return to Legal Department.",
    category: "AGREEMENT_CONTRACT",
    classification: Classification.CONFIDENTIAL,
    priority: Priority.URGENT,
    sender: "ABG-2041",
    receiver: { employee: "ABG-7231" },
    destLoc: "FCA:ADMIN",
    carrier: { employee: "ABG-4832" },
    start: today(150),
    sequence: 428,
    steps: [
      ...happy({ sender: "ABG-2041", carrier: "ABG-4832", receiver: "ABG-7231", origin: "HO:LEGAL", dest: "FCA:ADMIN", via: "FCA:GATE", t: [3, 7, 8, 10, 12, 82, 93] }),
    ],
  });
  await makeParcel("inTransit", {
    title: "Cheque Batch — Vendor Payments",
    description: "Six signed cheques for Factory B raw-material vendors. Hand to Production Manager only.",
    category: "CHEQUE_FINANCIAL",
    classification: Classification.CONFIDENTIAL,
    priority: Priority.PRIORITY,
    sender: "ABG-2055",
    receiver: { employee: "ABG-7420" },
    carrier: { employee: "ABG-4832" },
    start: today(70),
    steps: happy({ sender: "ABG-2055", carrier: "ABG-4832", origin: "HO:FIN", dest: "FCB:PROD", t: [4, 18, 19, 20, 24] }),
    expectedMinutes: 240,
  });
  await makeParcel("pendingReceipt", {
    title: "Signed Factory Compliance Certificates",
    description: "Fire-safety and environmental compliance certificates signed by the factory manager for the Legal archive.",
    category: "OFFICIAL_DOCUMENT",
    classification: Classification.INTERNAL,
    priority: Priority.NORMAL,
    sender: "ABG-7231",
    receiver: { employee: "ABG-2041" },
    carrier: { employee: "ABG-4870" },
    start: today(140),
    steps: happy({ sender: "ABG-7231", carrier: "ABG-4870", origin: "FCA:ADMIN", dest: "HO:LEGAL", via: "HO:GATE", t: [5, 14, 15, 16, 19, 112] }),
  });
  await makeParcel("awaitingPickup", {
    title: "Vendor Invoices — September",
    description: "Original vendor invoices for September reconciliation, with Legal sign-off sheet.",
    category: "INVOICE_BILL",
    classification: Classification.INTERNAL,
    priority: Priority.NORMAL,
    sender: "ABG-2041",
    receiver: { employee: "ABG-6021" },
    carrier: { employee: "ABG-4832" },
    start: today(18),
    steps: happy({ sender: "ABG-2041", carrier: "ABG-4832", origin: "HO:LEGAL", dest: "CO:ACC", t: [2] }),
  });
  await makeParcel("booked", {
    title: "Employee Appointment Letters",
    description: "Appointment letters for three new joiners at Dhaka Branch, to be countersigned and returned.",
    category: "HR_DOCUMENT",
    classification: Classification.CONFIDENTIAL,
    priority: Priority.NORMAL,
    sender: "ABG-2101",
    receiver: { employee: "ABG-6150" },
    start: today(9),
    steps: [{ type: EventType.NOTE_ADDED, at: 1, by: "ABG-2101", notes: "Dispatch: please assign a runner for the afternoon Motijheel trip." }],
  });
  await makeParcel("overdue", {
    title: "Board Meeting Minutes — Q3",
    description: "Signed minutes and resolutions of the Q3 board meeting for the Executive Director's review.",
    category: "CONFIDENTIAL_PACKAGE",
    classification: Classification.HIGHLY_CONFIDENTIAL,
    priority: Priority.CRITICAL,
    sender: "ABG-6110",
    receiver: { employee: "ABG-2210" },
    carrier: { guest: "jahid" },
    start: today(330),
    overdue: true,
    steps: [
      ...happy({ sender: "ABG-6110", carrier: "jahid", guest: true, origin: "CO:BS", dest: "HO:DIR", t: [6, 20, 21, 22, 25, 95] }),
      { type: EventType.SLA_REMINDER, at: 155, by: "SYSTEM", notes: "Receipt reminder: 60 min in receipt stage (limit 60 min)", meta: { policyId: policy("Receipt reminder").id, stage: "RECEIPT" } },
      { type: EventType.SLA_ESCALATED, at: 215, by: "SYSTEM", notes: "Receipt escalation: 120 min in receipt stage (limit 120 min)", meta: { policyId: policy("Receipt escalation").id, stage: "RECEIPT" } },
    ],
  });
  await makeParcel("exception", {
    title: "Tender Document — Boiler Supply",
    description: "Sealed technical and financial bid for the boiler supply tender. Must be logged by Factory B admin.",
    category: "TENDER_DOCUMENT",
    classification: Classification.CONFIDENTIAL,
    priority: Priority.URGENT,
    sender: "ABG-2305",
    receiver: { employee: "ABG-7420" },
    carrier: { employee: "ABG-4832" },
    start: today(200),
    exception: { code: "OFFICE_CLOSED", details: "Factory B administration office closed for the compliance audit; gate refused entry.", raisedBy: "ABG-4832", at: 120 },
    steps: [
      ...happy({ sender: "ABG-2305", carrier: "ABG-4832", origin: "HO:PROC", dest: "FCB:ADMIN", t: [3, 10, 11, 12, 15] }),
      { type: EventType.CHECKPOINT, at: 118, by: "ABG-4832", loc: "FCB:GATE" },
      { type: EventType.EXCEPTION_RECORDED, at: 120, to: ParcelStatus.DELIVERY_EXCEPTION, by: "ABG-4832", loc: "FCB:GATE", notes: "Factory B administration office closed for the compliance audit; gate refused entry.", meta: { code: "OFFICE_CLOSED" } },
    ],
  });
  await makeParcel("guest", {
    title: "Calibration Gauge Set",
    description: "Pressure gauge set returned from calibration lab, with certificates.",
    category: "PROFESSIONAL_INSTRUMENT",
    classification: Classification.INTERNAL,
    priority: Priority.PRIORITY,
    sender: "ABG-1001",
    receiver: { employee: "ABG-5120" },
    carrier: { guest: "malek" },
    start: today(25),
    steps: happy({ sender: "ABG-1001", carrier: "malek", guest: true, origin: "HO:ADMIN", dest: "FCA:ADMIN", t: [3] }),
  });
  await makeParcel("external", {
    title: "Audit Confirmation Letters",
    description: "Balance confirmation letters for the statutory auditors.",
    category: "OFFICIAL_DOCUMENT",
    classification: Classification.INTERNAL,
    priority: Priority.NORMAL,
    sender: "ABG-6021",
    receiver: { external: { name: "Rahman & Co. Chartered Accountants", phone: "01911556677", organization: "Rahman & Co.", address: "House 12, Road 7, Dhanmondi, Dhaka 1205" } },
    carrier: { external: { provider: "PATHAO", tracking: "DT201026PTH58213", rider: "Sohel Rana", riderPhone: "01944112233" } },
    start: today(120),
    steps: [
      { type: EventType.CARRIER_ASSIGNED, at: 2, to: ParcelStatus.AWAITING_PICKUP, by: "ABG-6021", meta: { carrierName: "Pathao Courier" } },
      { type: EventType.EXTERNAL_STATUS_UPDATE, at: 34, by: { provider: "PATHAO" }, meta: { rawStatus: "Picked", normalized: "PICKED_UP" } },
      { type: EventType.HANDOVER_CONFIRMED, at: 34, by: { provider: "PATHAO" }, verify: VerificationMethod.EXTERNAL_PROVIDER },
      { type: EventType.PICKED_UP, at: 34, to: ParcelStatus.PICKED_UP, by: { provider: "PATHAO" }, verify: VerificationMethod.EXTERNAL_PROVIDER, loc: "CO:RECEPTION" },
      { type: EventType.EXTERNAL_STATUS_UPDATE, at: 71, by: { provider: "PATHAO" }, meta: { rawStatus: "At_the_Sorting_HUB", normalized: "IN_TRANSIT" } },
      { type: EventType.IN_TRANSIT, at: 71, to: ParcelStatus.IN_TRANSIT, by: { provider: "PATHAO" }, verify: VerificationMethod.EXTERNAL_PROVIDER },
    ],
  });
  await makeParcel("draft", {
    title: "Draft — Land Mutation Papers",
    description: "Mutation papers for the Rupganj plot; awaiting final page from Legal.",
    category: "LEGAL_DOCUMENT",
    classification: Classification.CONFIDENTIAL,
    priority: Priority.NORMAL,
    sender: "ABG-2041",
    receiver: { employee: "ABG-2210" },
    start: today(5),
    draft: true,
    steps: [],
  });

  // Yesterday: received on behalf, a return and a cancellation.
  const yesterday = new Date(startOfDhakaDay.getTime() - 24 * 60 * MIN + 11 * 60 * MIN);
  await makeParcel("onBehalf", {
    title: "Factory Lease Renewal Draft",
    description: "Lease renewal draft with landlord's comments for the Administration Manager.",
    category: "AGREEMENT_CONTRACT",
    classification: Classification.CONFIDENTIAL,
    priority: Priority.PRIORITY,
    sender: "ABG-2041",
    receiver: { employee: "ABG-7231" },
    carrier: { employee: "ABG-4832" },
    start: yesterday,
    receivedBy: { code: "ABG-7310", onBehalf: true, reason: "Farhana Islam was in the production review meeting.", relationship: "Administrative Assistant, same department" },
    steps: happy({ sender: "ABG-2041", carrier: "ABG-4832", origin: "HO:LEGAL", dest: "FCA:ADMIN", t: [4, 15, 16, 17, 20, 96, 118], receiptBy: "ABG-7310" }),
  });
  await makeParcel("returned", {
    title: "Spare Encoder Module",
    description: "Encoder module sent for Line 2; wrong part number, returning to warehouse.",
    category: "SPARE_PART",
    classification: Classification.NORMAL,
    priority: Priority.NORMAL,
    sender: "ABG-8015",
    receiver: { employee: "ABG-7333" },
    carrier: { employee: "ABG-4870" },
    start: new Date(yesterday.getTime() - 26 * 60 * MIN),
    steps: [
      ...happy({ sender: "ABG-8015", carrier: "ABG-4870", origin: "WH:STORE", dest: "FCA:PROD", t: [5, 30, 31, 32, 35] }),
      { type: EventType.RETURN_REQUESTED, at: 80, to: ParcelStatus.RETURN_REQUESTED, by: "ABG-8015", notes: "Wrong part number — return to warehouse." },
      { type: EventType.RETURN_IN_TRANSIT, at: 95, to: ParcelStatus.RETURN_IN_TRANSIT, by: "ABG-4870" },
      { type: EventType.RETURNED, at: 160, to: ParcelStatus.RETURNED, by: "ABG-8015", verify: VerificationMethod.SENDER_APP, proof: ProofType.SENDER_APP, loc: "WH:STORE" },
    ],
  });
  await makeParcel("cancelled", {
    title: "Product Samples — Retail Pitch",
    description: "Packaging samples for the retail pitch; meeting moved online.",
    category: "SAMPLE",
    classification: Classification.NORMAL,
    priority: Priority.NORMAL,
    sender: "ABG-6188",
    receiver: { employee: "ABG-7466" },
    carrier: { guest: "babul" },
    start: new Date(yesterday.getTime() + 90 * MIN),
    steps: [
      { type: EventType.CARRIER_ASSIGNED, at: 3, to: ParcelStatus.AWAITING_PICKUP, by: "ABG-6188" },
      { type: EventType.CANCELLED, at: 40, to: ParcelStatus.CANCELLED, by: "ABG-6188", notes: "Meeting moved online; samples not needed." },
    ],
  });

  // ── 30 days of history ──
  if (opts.history !== false) {
    const rand = mulberry32(20261020);
    const pick = <T,>(xs: T[]) => xs[Math.floor(rand() * xs.length)];
    const routes: [string, string][] = [
      ["ABG-2041", "ABG-7231"], ["ABG-2055", "ABG-7420"], ["ABG-2055", "ABG-6021"], ["ABG-7231", "ABG-2041"], ["ABG-6021", "ABG-2055"],
      ["ABG-2101", "ABG-6150"], ["ABG-6150", "ABG-2101"], ["ABG-2305", "ABG-8015"], ["ABG-8015", "ABG-7333"], ["ABG-7420", "ABG-2305"],
      ["ABG-6110", "ABG-2210"], ["ABG-1001", "ABG-5120"], ["ABG-5120", "ABG-1001"], ["ABG-6188", "ABG-2055"], ["ABG-7455", "ABG-2041"],
    ];
    const titles: [string, string, Classification][] = [
      ["OFFICIAL_DOCUMENT", "Monthly Compliance Report", Classification.INTERNAL],
      ["INVOICE_BILL", "Supplier Invoices Bundle", Classification.INTERNAL],
      ["CHEQUE_FINANCIAL", "Signed Cheques for Disbursement", Classification.CONFIDENTIAL],
      ["APPROVAL_FILE", "Capex Approval File", Classification.CONFIDENTIAL],
      ["HR_DOCUMENT", "Leave & Attendance Sheets", Classification.INTERNAL],
      ["DRAWING_BLUEPRINT", "Line Layout Drawings", Classification.INTERNAL],
      ["TECHNICAL_PAPER", "Machine Maintenance Log", Classification.NORMAL],
      ["SPARE_PART", "Bearing Kit", Classification.NORMAL],
      ["SAMPLE", "Fabric Swatches", Classification.NORMAL],
      ["AGREEMENT_CONTRACT", "Service Agreement Copy", Classification.CONFIDENTIAL],
      ["LEGAL_DOCUMENT", "Court Notice Copy", Classification.CONFIDENTIAL],
      ["ELECTRONIC_DEVICE", "Laptop for Re-imaging", Classification.INTERNAL],
    ];
    const runnersFor = (branch: string) => (branch === "FCA" || branch === "FCB" || branch === "WH" ? "ABG-4870" : "ABG-4832");
    for (let day = 30; day >= 2; day--) {
      const date = new Date(startOfDhakaDay.getTime() - day * 24 * 60 * MIN);
      const weekday = new Date(date.getTime() + 6 * 60 * MIN).getUTCDay(); // Friday = 5
      const count = weekday === 5 ? 0 : weekday === 6 ? 2 : 3 + Math.floor(rand() * 4);
      for (let i = 0; i < count; i++) {
        const [sender, receiver] = pick(routes);
        const [category, title, classification] = pick(titles);
        const start = new Date(date.getTime() + (9 * 60 + Math.floor(rand() * 420)) * MIN);
        const mode = rand();
        const toPickup = 5 + Math.floor(rand() * 50);
        const transit = 25 + Math.floor(rand() * 120);
        const wait = rand() < 0.15 ? 120 + Math.floor(rand() * 180) : 2 + Math.floor(rand() * 70);
        const outcome = rand();
        const s = employees[sender];
        const r = employees[receiver];
        const originLoc = s.locKey;
        const destLoc = r.locKey;
        const t0 = 2;
        const pickup = t0 + toPickup;
        const arrive = pickup + 3 + transit;
        const received = arrive + wait;
        const breached = wait > 120 || received > 480;
        const base = {
          title,
          description: `${title} — routine dispatch ${s.branch} → ${r.branch}.`,
          category,
          classification,
          priority: rand() < 0.15 ? Priority.URGENT : rand() < 0.3 ? Priority.PRIORITY : Priority.NORMAL,
          sender,
          receiver: { employee: receiver },
          start,
        };
        if (outcome < 0.04) {
          await makeParcel(`h${day}-${i}`, {
            ...base,
            carrier: { employee: runnersFor(s.branch) },
            steps: [
              { type: EventType.CARRIER_ASSIGNED, at: t0, to: ParcelStatus.AWAITING_PICKUP, by: sender },
              { type: EventType.CANCELLED, at: t0 + 20, to: ParcelStatus.CANCELLED, by: sender, notes: "No longer required." },
            ],
          });
          continue;
        }
        if (mode < 0.15) {
          const provider = pick(["PATHAO", "STEADFAST", "REDX"]);
          await makeParcel(`h${day}-${i}`, {
            ...base,
            carrier: { external: { provider, tracking: `${provider.slice(0, 3)}${dhakaDateStamp(start)}${String(i).padStart(3, "0")}${Math.floor(rand() * 900 + 100)}` } },
            overdue: breached,
            steps: [
              { type: EventType.CARRIER_ASSIGNED, at: t0, to: ParcelStatus.AWAITING_PICKUP, by: sender },
              { type: EventType.HANDOVER_CONFIRMED, at: pickup, by: { provider }, verify: VerificationMethod.EXTERNAL_PROVIDER },
              { type: EventType.PICKED_UP, at: pickup, to: ParcelStatus.PICKED_UP, by: { provider }, verify: VerificationMethod.EXTERNAL_PROVIDER, loc: originLoc },
              { type: EventType.IN_TRANSIT, at: pickup + 3, to: ParcelStatus.IN_TRANSIT, by: { provider } },
              { type: EventType.ARRIVED_AT_DESTINATION, at: arrive + 60, to: ParcelStatus.ARRIVED_AT_DESTINATION, by: { provider }, loc: destLoc },
              { type: EventType.PENDING_RECEIPT, at: arrive + 60, to: ParcelStatus.PENDING_RECEIPT, by: "SYSTEM", loc: destLoc },
              { type: EventType.RECEIVED, at: received + 60, to: ParcelStatus.RECEIVED, by: receiver, loc: destLoc, verify: VerificationMethod.APP_CONFIRMATION, proof: ProofType.APP_CONFIRMATION },
            ],
          });
          continue;
        }
        const guest = mode < 0.28;
        const carrier = guest ? pick(["jahid", "babul"]) : runnersFor(s.branch);
        const steps = happy({ sender, carrier, guest, receiver, origin: originLoc, dest: destLoc, t: [t0, pickup - 2, pickup - 1, pickup, pickup + 3, arrive, received], verify: rand() < 0.25 ? VerificationMethod.OTP : undefined, receiptBy: receiver });
        if (outcome > 0.96) {
          steps.splice(steps.length - 3, 3);
          steps.push(
            { type: EventType.RETURN_REQUESTED, at: arrive - 10, to: ParcelStatus.RETURN_REQUESTED, by: sender, notes: "Receiver transferred; returning." },
            { type: EventType.RETURN_IN_TRANSIT, at: arrive, to: ParcelStatus.RETURN_IN_TRANSIT, by: guest ? { guest: carrier } : carrier },
            { type: EventType.RETURNED, at: arrive + transit, to: ParcelStatus.RETURNED, by: sender, verify: VerificationMethod.SENDER_APP, proof: ProofType.SENDER_APP, loc: originLoc },
          );
        } else if (breached) {
          steps.splice(steps.length - 1, 0, { type: EventType.SLA_ESCALATED, at: arrive + 120, by: "SYSTEM", notes: "Receipt escalation: limit 120 min", meta: { stage: "RECEIPT" } });
        }
        await makeParcel(`h${day}-${i}`, { ...base, carrier: guest ? { guest: carrier } : { employee: carrier }, steps, overdue: breached && outcome <= 0.96 });
      }
    }
  }

  // Tracking sequences continue after the seeded numbers.
  for (const [key, value] of counters) {
    const [branchCode, dayStamp] = key.split("|");
    await prisma.trackingSequence.upsert({ where: { branchCode_dayStamp: { branchCode, dayStamp } }, create: { branchCode, dayStamp, lastValue: value }, update: { lastValue: value } });
  }

  // Escalation records for the overdue demo parcel so the SLA engine does not fire them again.
  await prisma.escalation.createMany({
    data: [policy("Receipt reminder"), policy("Receipt escalation")].map((p) => ({ parcelId: createdParcels.overdue, slaPolicyId: p.id, stage: p.stage, audience: p.audience, notifiedCount: 2, triggeredAt: now })),
  });

  // A few inbox items so the notification centre is not empty on first launch.
  const notify = async (code: string, parcelKey: string, category: string, eventType: string, title: string, body: string, minutes: number, read = false) => {
    const parcelId = createdParcels[parcelKey];
    const p = await prisma.parcel.findUniqueOrThrow({ where: { id: parcelId }, select: { classification: true } });
    await prisma.notification.create({
      data: { userId: users[code].id, parcelId, eventType, category, title, body, sensitive: p.classification === Classification.HIGHLY_CONFIDENTIAL, readAt: read ? now : null, createdAt: minutesAgo(minutes), dedupeKey: `seed:${parcelKey}:${code}:${eventType}`, data: { parcelId } },
    });
  };
  const tn = async (k: string) => (await prisma.parcel.findUniqueOrThrow({ where: { id: createdParcels[k] }, select: { trackingNumber: true } })).trackingNumber;
  await notify("ABG-2041", "pendingReceipt", "ACTION_REQUIRED", EventType.PENDING_RECEIPT, "Your parcel has arrived", `${await tn("pendingReceipt")} is waiting for your receipt confirmation. Tap to receive.`, 28);
  await notify("ABG-2041", "sample", "PARCEL_UPDATE", EventType.RECEIVED, "Delivered successfully", "Received by Farhana Islam.", 57, true);
  await notify("ABG-2041", "awaitingPickup", "PARCEL_UPDATE", EventType.PARCEL_CREATED, "Parcel booked successfully", `${await tn("awaitingPickup")} · To: Jamal Uddin · Destination: ABG Corporate Office`, 18);
  await notify("ABG-2041", "pendingReceipt", "PARCEL_UPDATE", EventType.PICKED_UP, "Your parcel is now in transit", `${await tn("pendingReceipt")} from Farhana Islam is on its way.`, 124, true);
  await notify("ABG-4832", "awaitingPickup", "ACTION_REQUIRED", EventType.CARRIER_ASSIGNED, "New pickup assigned", `ABG Head Office → ABG Corporate Office · ${await tn("awaitingPickup")}. Tap to view.`, 16);
  await notify("ABG-4832", "exception", "PARCEL_UPDATE", EventType.EXCEPTION_RECORDED, "Delivery exception", `${await tn("exception")}: Office closed.`, 80, true);
  await notify("ABG-7231", "sample", "ACTION_REQUIRED", EventType.PENDING_RECEIPT, "Your parcel has arrived", `${await tn("sample")} is waiting for your receipt confirmation.`, 68, true);
  await notify("ABG-7231", "onBehalf", "PARCEL_UPDATE", EventType.RECEIVED, "Received on your behalf", `Your parcel ${await tn("onBehalf")} was received on your behalf by Shahin Ahmed.`, 1200, true);
  await notify("ABG-2210", "overdue", "ACTION_REQUIRED", EventType.SLA_ESCALATED, "Your parcel has arrived", "You have a confidential parcel awaiting receipt.", 115);
  await notify("ABG-5120", "overdue", "ACTION_REQUIRED", EventType.SLA_ESCALATED, "Receipt overdue", `${await tn("overdue")}: Receipt escalation. Needs attention.`, 115);
  await notify("ABG-3550", "booked", "ACTION_REQUIRED", EventType.PARCEL_CREATED, "Assign a courier", `${await tn("booked")} is booked without a courier.`, 8);
  await notify("ABG-3550", "exception", "ACTION_REQUIRED", EventType.EXCEPTION_RECORDED, "Delivery exception", `${await tn("exception")}: Office closed. Reported by Karim Ahmed.`, 80);
  await notify("ABG-1001", "overdue", "ACTION_REQUIRED", EventType.SLA_ESCALATED, "Dispatch SLA breached", `${await tn("overdue")} is overdue at the destination.`, 115);

  await seedIncidents(prisma, { now, branches, locations, users });

  // ABG ONE modules.
  const moduleCtx: SeedContext = { prisma, now, storageRoot: resolve(process.env.STORAGE_DIR || "./storage"), branches, locations, departments, employees, users };
  await seedNotices(moduleCtx);
  await seedLicences(moduleCtx);
  await seedFleet(moduleCtx);
  await seedTours(moduleCtx);
  await seedVisitors(moduleCtx);

  await prisma.auditLog.create({ data: { actorType: ActorType.SYSTEM, actorName: "Seed", action: "system.seeded", objectType: "system", objectId: "seed", summary: "Demo data loaded", actorUserId: admin.id } });

  return { org, branches, employees, users, categories, providers, guests, parcels: createdParcels, departments, locations };
}

// ── Workplace incident reports ──

interface IncidentSeed {
  key: string;
  branch: string;
  loc?: string;
  detail?: string;
  title: string;
  description: string;
  category: IncidentCategory;
  severity: IncidentSeverity;
  reporter: string;
  anonymous?: boolean;
  photo?: string;
  minutesAgo: number;
  steps?: { to?: IncidentStatus; note: string; by: string; minutesAgo: number }[];
}

const INCIDENTS: IncidentSeed[] = [
  {
    key: "leak", branch: "HO", loc: "L7", detail: "Beside lift 2, outside the Legal Department",
    title: "Water leaking from the ceiling near the Level 7 lift",
    description: "Water is dripping from a stained ceiling tile onto the corridor floor. People are walking around it.",
    category: IncidentCategory.BUILDING_DAMAGE, severity: IncidentSeverity.HIGH, reporter: "ABG-2041", photo: "ceiling-leak.jpg", minutesAgo: 185,
    steps: [{ to: IncidentStatus.PROCESSING, note: "Maintenance informed — a plumber is on the way and the area is cordoned off.", by: "ABG-1001", minutesAgo: 150 }],
  },
  {
    key: "canteen", branch: "FCA", loc: "ADMINBLK", detail: "Staff canteen, ground floor",
    title: "Cafeteria serving counter not cleaned after lunch",
    description: "Leftover food and flies on the serving counter at 3 pm. Trays stacked next to the bin.",
    category: IncidentCategory.CAFETERIA_HYGIENE, severity: IncidentSeverity.MEDIUM, reporter: "ABG-7310", anonymous: true, minutesAgo: 40,
  },
  {
    key: "crack", branch: "FCB", loc: "PROD", detail: "Store room, north wall behind the racks",
    title: "Crack spreading across the store-room wall",
    description: "The crack has grown over the last week and plaster has fallen near the racks.",
    category: IncidentCategory.BUILDING_DAMAGE, severity: IncidentSeverity.MEDIUM, reporter: "ABG-7420", photo: "cracked-wall.jpg", minutesAgo: 130,
  },
  {
    key: "wires", branch: "FCA", loc: "PROD", detail: "Switchboard by the north entrance",
    title: "Exposed wires at the production-floor switchboard",
    description: "The switchboard cover is missing and wires are exposed at hand height.",
    category: IncidentCategory.ELECTRICAL, severity: IncidentSeverity.URGENT, reporter: "ABG-4870", minutesAgo: 55,
    steps: [{ to: IncidentStatus.PROCESSING, note: "Electrician called; the area is closed until it is made safe.", by: "ABG-5120", minutesAgo: 45 }],
  },
  {
    key: "wetfloor", branch: "HO", loc: "RECEPTION", detail: "Main entrance, near the visitor sofas",
    title: "Wet floor at reception with no warning sign",
    description: "Rainwater tracked in from the entrance. A visitor nearly slipped.",
    category: IncidentCategory.SAFETY_HAZARD, severity: IncidentSeverity.HIGH, reporter: "ABG-2055", photo: "wet-floor.jpg", minutesAgo: 1500,
    steps: [
      { to: IncidentStatus.PROCESSING, note: "Housekeeping alerted.", by: "ABG-1001", minutesAgo: 1490 },
      { to: IncidentStatus.DONE, note: "Floor dried and a caution sign placed. Housekeeping will check every hour when it rains.", by: "ABG-1001", minutesAgo: 1440 },
    ],
  },
  {
    key: "washroom", branch: "CO", loc: "RECEPTION", detail: "2nd floor washroom",
    title: "No water in the 2nd floor washroom",
    description: "Taps and flush have had no water since morning.",
    category: IncidentCategory.WASHROOM, severity: IncidentSeverity.MEDIUM, reporter: "ABG-6021", minutesAgo: 4300,
    steps: [
      { to: IncidentStatus.PROCESSING, note: "Building management contacted about the pump.", by: "ABG-1001", minutesAgo: 4200 },
      { to: IncidentStatus.DONE, note: "Water pump repaired; supply restored.", by: "ABG-1001", minutesAgo: 3000 },
    ],
  },
  {
    key: "supplier", branch: "HO", loc: "L5", detail: "Procurement",
    title: "Supplier asking staff for cash to speed up deliveries",
    description: "A supplier's representative has twice suggested a cash payment to move our orders up the queue.",
    category: IncidentCategory.MISCONDUCT, severity: IncidentSeverity.HIGH, reporter: "ABG-2305", anonymous: true, minutesAgo: 1600,
    steps: [{ to: IncidentStatus.PROCESSING, note: "Thank you for reporting this. Head office is reviewing it confidentially.", by: "ABG-1001", minutesAgo: 1380 }],
  },
  {
    key: "drawer", branch: "DHK", loc: "DESK", detail: "Front-desk drawer",
    title: "Broken lock on the front-desk drawer",
    description: "The drawer where visitor passes are kept no longer locks.",
    category: IncidentCategory.SECURITY, severity: IncidentSeverity.LOW, reporter: "ABG-6150", minutesAgo: 2900,
    steps: [{ to: IncidentStatus.DECLINED, note: "Visitor passes have moved to the locked cabinet; the old drawer is being removed with the desk refit.", by: "ABG-1001", minutesAgo: 2700 }],
  },
];

async function seedIncidents(
  prisma: PrismaClient,
  ctx: { now: Date; branches: Record<string, { id: string; name: string; code: string }>; locations: Record<string, { id: string }>; users: Record<string, { id: string; name: string }> },
) {
  const storageRoot = resolve(process.env.STORAGE_DIR || "./storage");
  const counters = new Map<string, number>();
  for (const seed of [...INCIDENTS].sort((a, b) => b.minutesAgo - a.minutesAgo)) {
    const createdAt = new Date(ctx.now.getTime() - seed.minutesAgo * MIN);
    const day = dhakaDateStamp(createdAt);
    const counterKey = `INC:${seed.branch}|${day}`;
    const n = (counters.get(counterKey) ?? 0) + 1;
    counters.set(counterKey, n);
    const steps = seed.steps ?? [];
    const last = steps[steps.length - 1];
    const status = last?.to ?? IncidentStatus.PENDING;
    const at = (m: number) => new Date(ctx.now.getTime() - m * MIN);
    const reporter = ctx.users[seed.reporter];
    const incident = await prisma.incident.create({
      data: {
        referenceNumber: formatIncidentNumber(day, seed.branch, n),
        title: seed.title,
        description: seed.description,
        category: seed.category,
        severity: seed.severity,
        status,
        branchId: ctx.branches[seed.branch].id,
        locationId: seed.loc ? ctx.locations[`${seed.branch}:${seed.loc}`]?.id ?? null : null,
        locationDetail: seed.detail ?? null,
        reporterUserId: reporter.id,
        anonymous: !!seed.anonymous,
        statusNote: last?.note ?? null,
        statusChangedAt: last ? at(last.minutesAgo) : createdAt,
        processingAt: steps.find((s) => s.to === IncidentStatus.PROCESSING) ? at(steps.find((s) => s.to === IncidentStatus.PROCESSING)!.minutesAgo) : null,
        doneAt: status === IncidentStatus.DONE ? at(last!.minutesAgo) : null,
        declinedAt: status === IncidentStatus.DECLINED ? at(last!.minutesAgo) : null,
        lastHandledById: last ? ctx.users[last.by].id : null,
        createdAt,
      },
    });
    if (seed.photo) {
      const source = join(__dirname, "demo-photos", seed.photo);
      if (existsSync(source)) {
        const key = `seed/${randomBytes(12).toString("base64url")}.jpg`;
        await mkdir(join(storageRoot, "seed"), { recursive: true });
        const data = await readFile(source);
        await writeFile(join(storageRoot, key), data);
        await prisma.incidentPhoto.create({
          data: { incidentId: incident.id, kind: IncidentPhotoKind.REPORT, storageKey: key, fileName: seed.photo, mimeType: "image/jpeg", sizeBytes: data.length, uploadedByUserId: seed.anonymous ? null : reporter.id, createdAt },
        });
      }
    }
    await prisma.incidentUpdate.create({
      data: { incidentId: incident.id, type: IncidentUpdateType.SUBMITTED, toStatus: IncidentStatus.PENDING, actorUserId: seed.anonymous ? null : reporter.id, actorName: seed.anonymous ? ANONYMOUS_REPORTER : reporter.name, metadata: { photos: seed.photo ? 1 : 0 }, createdAt },
    });
    let from: string = IncidentStatus.PENDING;
    for (const step of steps) {
      await prisma.incidentUpdate.create({
        data: { incidentId: incident.id, type: IncidentUpdateType.STATUS_CHANGED, fromStatus: from, toStatus: step.to, note: step.note, actorUserId: ctx.users[step.by].id, actorName: ctx.users[step.by].name, createdAt: at(step.minutesAgo) },
      });
      from = step.to ?? from;
    }
    // Inbox items: the handler hears about new reports; the reporter hears about progress.
    const data = { incidentId: incident.id, referenceNumber: incident.referenceNumber, status };
    if (status === IncidentStatus.PENDING) {
      const handler = seed.branch === "FCA" ? "ABG-5120" : seed.branch === "FCB" ? "ABG-7455" : "ABG-1001";
      await prisma.notification.create({
        data: { userId: ctx.users[handler].id, eventType: "INCIDENT_REPORTED", category: "ACTION_REQUIRED", title: `New incident at ${ctx.branches[seed.branch].name}`, body: `${seed.title} — ${INCIDENT_CATEGORY_LABEL[seed.category]}. ${incident.referenceNumber}`, createdAt, dedupeKey: `seed:incident:${seed.key}:${handler}`, data: { ...data, status: IncidentStatus.PENDING } },
      });
    }
    if (last) {
      await prisma.notification.create({
        data: {
          userId: reporter.id,
          eventType: "INCIDENT_UPDATED",
          category: "PARCEL_UPDATE",
          title: status === IncidentStatus.DONE ? "Your report has been resolved" : status === IncidentStatus.DECLINED ? "Your report was declined" : "Your report is being processed",
          body: `${incident.referenceNumber} · ${seed.title} — ${last.note}`,
          sensitive: seed.category === IncidentCategory.MISCONDUCT,
          readAt: seed.minutesAgo > 600 ? ctx.now : null,
          createdAt: at(last.minutesAgo),
          dedupeKey: `seed:incident:${seed.key}:reporter`,
          data,
        },
      });
    }
  }
  // New reports continue each office's numbering for the day.
  for (const [key, value] of counters) {
    const [branchCode, dayStamp] = key.split("|");
    await prisma.trackingSequence.upsert({ where: { branchCode_dayStamp: { branchCode, dayStamp } }, create: { branchCode, dayStamp, lastValue: value }, update: { lastValue: value } });
  }
}

async function main() {
  const prisma = new PrismaClient();
  try {
    const reset = process.argv.includes("--reset");
    if (reset) {
      if (process.env.NODE_ENV === "production") throw new Error("--reset is disabled in production");
      await resetDatabase(prisma);
    } else if ((await prisma.organization.count()) > 0) {
      console.log("Database already has data; skipping seed (use --reset to wipe and re-seed).");
      return;
    }
    const result = await seed(prisma);
    const parcels = await prisma.parcel.count();
    const events = await prisma.parcelEvent.count();
    console.log(`Seeded ${Object.keys(result.users).length} accounts, ${parcels} parcels, ${events} ledger events.`);
    console.log(`Sign in with any seeded email (e.g. rahim@abg.com.bd) or employee ID and the password ${SEED_PASSWORD}`);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
