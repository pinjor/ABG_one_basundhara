import { randomBytes } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { deflateSync } from "zlib";
import {
  LicenceAlertLevel,
  LicenceCategory,
  LicenceEventType,
  RENEWAL_STAGES,
  RENEWAL_STAGE_LABEL,
  RenewalStage,
  addCalendarDays,
  dhakaToday,
  licenceAlertLevel,
  licenceAlertThreshold,
  licenceAlertThresholds,
  licenceStateForDays,
} from "@abg-dispatch/shared";
import type { SeedContext } from "./context";

/**
 * Demo data: the regulatory licence register. Sixteen licences across the
 * group's offices, dated relative to today so the mix always reads the same:
 * two expired, three expiring within 30 days (two with renewals under way),
 * three inside their renewal window and the rest valid. Alerts already sent
 * are recorded (history, `lastAlertDays`, inbox items) exactly as the engine
 * would have recorded them, so its first run finds nothing new to send.
 */

const ADDRESS: Record<string, string> = {
  HO: "Plot 314/A, Block E, Bashundhara R/A, Dhaka",
  CO: "Road 90, Gulshan-2, Dhaka",
  FCA: "Kanchpur Industrial Area, Sonargaon, Narayanganj",
  FCB: "BSCIC Industrial Estate, Konabari, Gazipur",
  DHK: "Dilkusha C/A, Motijheel, Dhaka",
  WH: "Tongi Industrial Area, Gazipur",
};

/** Who looks after each office's licences (employee codes). */
const OWNER: Record<string, string> = { HO: "ABG-2400", CO: "ABG-2400", DHK: "ABG-2400", FCA: "ABG-5120", FCB: "ABG-7455", WH: "ABG-1001" };
const BRANCH_ADMINS: Record<string, string[]> = { FCA: ["ABG-5120"], FCB: ["ABG-7455"] };
const COMPLIANCE = ["ABG-2400"];
const HEAD_OFFICE = ["ABG-1001"];
const EXECUTIVES = ["ABG-1002", "ABG-1003"];

interface StageStep {
  stage: RenewalStage;
  daysAgo: number;
  by: string;
  note?: string;
}

interface LicenceSeed {
  key: string;
  name: string;
  /** Short title printed on the generated scan. */
  printed: string;
  number: string;
  category: LicenceCategory;
  authority: string;
  branch: string;
  /** Expiry, in calendar days from today (negative: already expired). */
  days: number;
  /** Length of one licence period in days (sets the issue date). */
  validity: number;
  lead?: number;
  fee?: number;
  steps?: StageStep[];
  document?: "pdf" | "png";
  notes?: string;
  note?: { daysAgo: number; by: string; text: string };
  /** Renewed earlier this year (shows a RENEWED entry). */
  renewedDaysAgo?: number;
  /** Seed an inbox item for the most recent alert. */
  inbox?: boolean;
}

const LICENCES: LicenceSeed[] = [
  // ── Expired ──
  {
    key: "fire-fcb", name: "Fire licence", printed: "FIRE LICENCE", number: "FSCD/GAZ/LIC/2020/2206", category: LicenceCategory.FIRE_SAFETY,
    authority: "Fire Service & Civil Defence", branch: "FCB", days: -9, validity: 365, fee: 15_000, document: "png", inbox: true,
    steps: [{ stage: RenewalStage.DOCUMENTS_PREPARED, daysAgo: 30, by: "ABG-7455", note: "Fire drill register, layout plan and extinguisher service certificates compiled. Waiting for the hydrant pressure test report." }],
    notes: "Covers the production hall, LPG cylinder yard and stores. Inspection needs the hydrant pressure test report.",
  },
  {
    key: "boiler-fca", name: "Boiler certificate — Boiler No. 2", printed: "CERTIFICATE OF FITNESS FOR BOILER", number: "CIB/NAR/BLR-2/2014/0218", category: LicenceCategory.BOILER,
    authority: "Office of the Chief Inspector of Boilers", branch: "FCA", days: -4, validity: 365, lead: 60, fee: 6_000, inbox: true,
    notes: "Thermax 6 TPH steam boiler. Annual hydraulic test by the Inspector of Boilers is required before the certificate is renewed.",
  },
  // ── Expiring within 30 days ──
  {
    key: "factory-fca", name: "Factory licence", printed: "FACTORY LICENCE", number: "DIFE/NARAYAN/FL/2016/4471", category: LicenceCategory.FACTORY,
    authority: "Department of Inspection for Factories and Establishments (DIFE)", branch: "FCA", days: 12, validity: 365, fee: 24_000, document: "pdf", inbox: true,
    steps: [
      { stage: RenewalStage.DOCUMENTS_PREPARED, daysAgo: 40, by: "ABG-5120", note: "Worker list, layout plan and safety committee minutes ready." },
      { stage: RenewalStage.APPLICATION_SUBMITTED, daysAgo: 20, by: "ABG-2400", note: "Submitted on the DIFE online portal; application no. DIFE-REN-2026-04417." },
    ],
  },
  {
    key: "ecc-fcb", name: "Environmental Clearance Certificate", printed: "ENVIRONMENTAL CLEARANCE CERTIFICATE", number: "DoE/GAZ/ECC/2019/1183", category: LicenceCategory.ENVIRONMENT,
    authority: "Department of Environment (DoE)", branch: "FCB", days: 23, validity: 365, fee: 50_000, inbox: true,
    steps: [
      { stage: RenewalStage.DOCUMENTS_PREPARED, daysAgo: 60, by: "ABG-7455", note: "Effluent test results and ETP log book collected." },
      { stage: RenewalStage.APPLICATION_SUBMITTED, daysAgo: 45, by: "ABG-2400" },
      { stage: RenewalStage.INSPECTION_SCHEDULED, daysAgo: 6, by: "ABG-2400", note: "DoE Gazipur office will inspect the ETP next week; Tahmina to accompany the inspector." },
    ],
  },
  {
    key: "trade-dhk", name: "Trade licence", printed: "TRADE LICENCE", number: "TRAD/DSCC/031245/2021", category: LicenceCategory.TRADE,
    authority: "Dhaka South City Corporation", branch: "DHK", days: 5, validity: 365, fee: 7_200, document: "png", inbox: true,
    note: { daysAgo: 2, by: "ABG-2400", text: "DSCC zone office needs the updated holding tax receipt before the renewal can be filed. Requested from the landlord today." },
  },
  // ── Inside the renewal window ──
  {
    key: "lpg-storage-wh", name: "LPG storage licence", printed: "LICENCE TO STORE LIQUEFIED PETROLEUM GAS", number: "DEX/LPG/STR/2020/0345", category: LicenceCategory.EXPLOSIVES,
    authority: "Department of Explosives", branch: "WH", days: 48, validity: 730, fee: 20_000,
    notes: "Storage of filled LPG cylinders, up to 12,000 kg. The licensed quantity must not be exceeded during peak season.",
  },
  {
    key: "irc-ho", name: "Import Registration Certificate (IRC)", printed: "IMPORT REGISTRATION CERTIFICATE", number: "CCIE/IRC/DHK/0187654", category: LicenceCategory.IMPORT_EXPORT,
    authority: "Office of the Chief Controller of Imports & Exports (CCI&E)", branch: "HO", days: 64, validity: 365, fee: 6_000,
  },
  {
    key: "trade-fcb", name: "Trade licence", printed: "TRADE LICENCE", number: "GCC/TL/KON/2024/11592", category: LicenceCategory.TRADE,
    authority: "Gazipur City Corporation", branch: "FCB", days: 75, validity: 365, fee: 9_800,
  },
  // ── Valid ──
  {
    key: "trade-ho", name: "Trade licence", printed: "TRADE LICENCE", number: "TRAD/DNCC/082417/2019", category: LicenceCategory.TRADE,
    authority: "Dhaka North City Corporation", branch: "HO", days: 252, validity: 365, fee: 18_500, document: "pdf", renewedDaysAgo: 110,
  },
  {
    key: "trade-fca", name: "Trade licence", printed: "TRADE LICENCE", number: "NCC/TL/2023/07731", category: LicenceCategory.TRADE,
    authority: "Narayanganj City Corporation", branch: "FCA", days: 252, validity: 365, fee: 12_000,
  },
  {
    key: "berc-ho", name: "BERC LPG marketing licence", printed: "LICENCE FOR LPG MARKETING", number: "BERC/LPG/MKT/2021/009", category: LicenceCategory.ENERGY_REGULATORY,
    authority: "Bangladesh Energy Regulatory Commission (BERC)", branch: "HO", days: 410, validity: 1825, lead: 120, fee: 250_000, document: "pdf",
    notes: "Marketing and distribution of LPG under the BERC licensing regulations. Quarterly sales returns are due to BERC.",
  },
  {
    key: "erc-co", name: "Export Registration Certificate (ERC)", printed: "EXPORT REGISTRATION CERTIFICATE", number: "CCIE/ERC/DHK/0045812", category: LicenceCategory.IMPORT_EXPORT,
    authority: "Office of the Chief Controller of Imports & Exports (CCI&E)", branch: "CO", days: 180, validity: 365, fee: 3_000,
  },
  {
    key: "fire-fca", name: "Fire licence", printed: "FIRE LICENCE", number: "FSCD/NAR/LIC/2017/1874", category: LicenceCategory.FIRE_SAFETY,
    authority: "Fire Service & Civil Defence", branch: "FCA", days: 140, validity: 365, fee: 15_000,
  },
  {
    key: "bsti-fca", name: "BSTI certification — LPG cylinders", printed: "CERTIFICATION MARKS LICENCE", number: "BSTI/CM/LPG-CYL/2019/0612", category: LicenceCategory.STANDARDS,
    authority: "Bangladesh Standards and Testing Institution (BSTI)", branch: "FCA", days: 300, validity: 1095, fee: 15_000,
  },
  {
    key: "trade-wh", name: "Trade licence", printed: "TRADE LICENCE", number: "GCC/TL/TNG/2022/08814", category: LicenceCategory.TRADE,
    authority: "Gazipur City Corporation", branch: "WH", days: 252, validity: 365, fee: 8_500,
  },
  {
    key: "ecc-fca", name: "Environmental Clearance Certificate", printed: "ENVIRONMENTAL CLEARANCE CERTIFICATE", number: "DoE/NAR/ECC/2018/0957", category: LicenceCategory.ENVIRONMENT,
    authority: "Department of Environment (DoE)", branch: "FCA", days: 200, validity: 365, fee: 50_000,
  },
];

const dateFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const pretty = (day: string) => dateFmt.format(new Date(`${day}T00:00:00Z`));
const asDate = (day: string) => new Date(`${day}T00:00:00Z`);
/** 10:30 in Dhaka on a calendar day. */
const officeHours = (day: string, minutes = 0) => new Date(new Date(`${day}T04:30:00Z`).getTime() + minutes * 60_000);
/** One minute past midnight in Dhaka on a calendar day — when the scheduled check would have alerted. */
const alertTime = (day: string) => new Date(new Date(`${day}T00:00:00Z`).getTime() - 6 * 3_600_000 + 60_000);

export async function seedLicences(ctx: SeedContext): Promise<void> {
  const { prisma } = ctx;
  const today = dhakaToday(ctx.now);
  const user = (code: string) => ctx.users[code];
  const name = (code: string) => user(code).name;
  await mkdir(join(ctx.storageRoot, "seed"), { recursive: true });

  for (const s of LICENCES) {
    const branch = ctx.branches[s.branch];
    const lead = s.lead ?? 90;
    const expiresAt = addCalendarDays(today, s.days);
    // A one-year licence issued on 3 Nov 2025 is valid until 2 Nov 2026.
    const issued = addCalendarDays(expiresAt, -(s.validity - 1));
    const issuedAt = issued < today ? issued : addCalendarDays(today, -30);
    const owner = OWNER[s.branch];
    const createdDay = addCalendarDays(today, -Math.max(240, (s.renewedDaysAgo ?? 0) + 130));
    const stage = s.steps?.length ? s.steps[s.steps.length - 1].stage : RenewalStage.NOT_STARTED;
    const threshold = licenceAlertThreshold(s.days, lead);

    let document: { key: string; name: string; mime: string; size: number } | null = null;
    if (s.document) {
      const facts = { authority: s.authority, title: s.printed, number: s.number, holder: `Anvir Bashundhara Group - ${branch.name}`, address: ADDRESS[s.branch], issued: pretty(issuedAt), expires: pretty(expiresAt) };
      const data = s.document === "pdf" ? certificatePdf(facts) : certificatePng(s.key);
      const key = `seed/${randomBytes(12).toString("base64url")}.${s.document}`;
      await writeFile(join(ctx.storageRoot, key), data);
      document = { key, name: `${s.key}-${s.document === "pdf" ? "certificate" : "scan"}.${s.document}`, mime: s.document === "pdf" ? "application/pdf" : "image/png", size: data.length };
    }

    const lastAlertAt = threshold === null ? null : alertTime(addCalendarDays(expiresAt, -threshold));
    const licence = await prisma.licence.create({
      data: {
        name: s.name,
        licenceNumber: s.number,
        category: s.category,
        issuingAuthority: s.authority,
        branchId: branch.id,
        ownerUserId: user(owner).id,
        issuedAt: asDate(issuedAt),
        expiresAt: asDate(expiresAt),
        renewalLeadDays: lead,
        renewalStage: stage,
        renewalStartedAt: s.steps?.length ? officeHours(addCalendarDays(today, -s.steps[0].daysAgo)) : null,
        renewalFee: s.fee ?? null,
        documentKey: document?.key ?? null,
        documentName: document?.name ?? null,
        documentMime: document?.mime ?? null,
        documentSize: document?.size ?? null,
        lastAlertDays: threshold,
        lastAlertAt,
        notes: s.notes ?? null,
        createdAt: officeHours(createdDay),
      },
    });

    // ── History, oldest first ──
    const events: { type: string; at: Date; actorCode: string | null; note?: string | null; metadata: Record<string, unknown> }[] = [];
    const previousExpiry = s.renewedDaysAgo ? addCalendarDays(expiresAt, -365) : expiresAt;
    events.push({ type: LicenceEventType.CREATED, at: officeHours(createdDay), actorCode: "ABG-2400", metadata: { expiresAt: previousExpiry, category: s.category, office: branch.code } });
    if (document) {
      events.push({ type: LicenceEventType.DOCUMENT_UPLOADED, at: officeHours(createdDay, 25), actorCode: "ABG-2400", metadata: { fileName: document.name, mimeType: document.mime, size: document.size, replaced: false } });
    }
    if (s.renewedDaysAgo) {
      events.push({
        type: LicenceEventType.RENEWED,
        at: officeHours(addCalendarDays(today, -s.renewedDaysAgo)),
        actorCode: "ABG-2400",
        note: "Renewed at the DNCC zone office; fee paid by pay order.",
        metadata: { previousExpiresAt: previousExpiry, newExpiresAt: expiresAt, issuedAt, previousStage: RenewalStage.FEE_PAID, withDocument: false },
      });
    }
    let from: RenewalStage = RenewalStage.NOT_STARTED;
    for (const step of s.steps ?? []) {
      events.push({
        type: LicenceEventType.RENEWAL_STAGE_CHANGED,
        at: officeHours(addCalendarDays(today, -step.daysAgo), 15),
        actorCode: step.by,
        note: step.note ?? null,
        metadata: { from, to: step.stage, direction: RENEWAL_STAGES.indexOf(step.stage) > RENEWAL_STAGES.indexOf(from) ? "FORWARD" : "BACK" },
      });
      from = step.stage;
    }
    if (s.note) events.push({ type: LicenceEventType.NOTE_ADDED, at: officeHours(addCalendarDays(today, -s.note.daysAgo), 40), actorCode: s.note.by, note: s.note.text, metadata: {} });

    // Every threshold reached so far for this expiry date, as the engine would have sent them.
    const sent = licenceAlertThresholds(lead).filter((t) => s.days <= t);
    for (const t of sent) {
      const day = addCalendarDays(expiresAt, -t);
      const level = licenceAlertLevel(t);
      const recipients = recipientsFor(s.branch, level);
      events.push({
        type: LicenceEventType.ESCALATED,
        at: alertTime(day),
        actorCode: null,
        metadata: { thresholdDays: t, daysLeft: t, level, expiresAt, notified: recipients.map(name) },
      });
    }
    events.sort((a, b) => a.at.getTime() - b.at.getTime());
    await prisma.licenceEvent.createMany({
      data: events.map((e) => ({
        licenceId: licence.id,
        type: e.type,
        note: e.note ?? null,
        actorUserId: e.actorCode ? user(e.actorCode).id : null,
        actorName: e.actorCode ? name(e.actorCode) : "ABG ONE alerts",
        metadata: e.metadata as object,
        createdAt: e.at,
      })),
    });

    // Inbox: the most recent alert, for the people it went to.
    if (s.inbox && threshold !== null) {
      const day = addCalendarDays(expiresAt, -threshold);
      const level = licenceAlertLevel(threshold);
      const at = alertTime(day);
      const daysAtAlert = threshold;
      const title = daysAtAlert === 0 ? `${s.name} expires today` : `${s.name} expires in ${daysAtAlert} days`;
      const stageAtAlert = (s.steps ?? []).filter((st) => addCalendarDays(today, -st.daysAgo) < day).pop()?.stage ?? RenewalStage.NOT_STARTED;
      const body = `${branch.name} · ${s.number} (${s.authority}). Expires on ${pretty(expiresAt)}; renewal: ${RENEWAL_STAGE_LABEL[stageAtAlert].toLowerCase()}.${level === LicenceAlertLevel.LEADERSHIP ? " Escalated to head office and the MD." : ""}`;
      const read = ctx.now.getTime() - at.getTime() > 5 * 86_400_000;
      await prisma.notification.createMany({
        data: recipientsFor(s.branch, level).map((code) => ({
          userId: user(code).id,
          eventType: "LICENCE_EXPIRY_ALERT",
          category: "ACTION_REQUIRED",
          title,
          body,
          createdAt: at,
          readAt: read ? new Date(at.getTime() + 9 * 3_600_000) : null,
          dedupeKey: `licence:${licence.id}:alert:${expiresAt}:${threshold}:${user(code).id}`,
          data: { module: "licences", objectId: licence.id, reference: s.number, route: `/licences/${licence.id}`, status: licenceStateForDays(daysAtAlert, lead) },
        })),
        skipDuplicates: true,
      });
    }
  }
}

/** The engine's audience rules, by employee code: owner, compliance, office admins, head office, MD / Chairman. */
function recipientsFor(branch: string, level: LicenceAlertLevel): string[] {
  const out = [OWNER[branch], ...COMPLIANCE];
  if (level !== LicenceAlertLevel.OWNER) out.push(...(BRANCH_ADMINS[branch] ?? []));
  if (level === LicenceAlertLevel.LEADERSHIP) out.push(...HEAD_OFFICE, ...EXECUTIVES);
  return [...new Set(out)];
}

// ── Generated scans ──────────────────────────────────────────────────────────

interface CertificateFacts {
  authority: string;
  title: string;
  number: string;
  holder: string;
  address: string;
  issued: string;
  expires: string;
}

/** PDF strings: ASCII only, with the delimiters escaped. */
const pdfText = (s: string) => s.replace(/[^\x20-\x7e]/g, "-").replace(/([\\()])/g, "\\$1");

/** A one-page A4 certificate as a small, valid PDF (Helvetica, no embedded fonts). */
function certificatePdf(f: CertificateFacts): Buffer {
  const text = (x: number, y: number, font: "F1" | "F2", size: number, s: string) => `BT /${font} ${size} Tf ${x} ${y} Td (${pdfText(s)}) Tj ET`;
  const circle = (cx: number, cy: number, r: number) => {
    const k = 0.5523 * r;
    return `${cx + r} ${cy} m ${cx + r} ${cy + k} ${cx + k} ${cy + r} ${cx} ${cy + r} c ${cx - k} ${cy + r} ${cx - r} ${cy + k} ${cx - r} ${cy} c ${cx - r} ${cy - k} ${cx - k} ${cy - r} ${cx} ${cy - r} c ${cx + k} ${cy - r} ${cx + r} ${cy - k} ${cx + r} ${cy} c S`;
  };
  const body = [
    "This licence is granted under the applicable Act and Rules and is subject to the conditions",
    "endorsed overleaf. It must be displayed at the licensed premises, produced on demand to an",
    "authorised officer, and renewed before the date of expiry shown above.",
  ];
  const content = [
    "q 0 0.416 0.306 RG 6 w 28 28 539 786 re S 1 w 40 40 515 762 re S Q",
    "q 0 0.416 0.306 rg 60 742 54 34 re f 0.957 0.165 0.255 rg " + circle(84, 759, 10).replace(/ S$/, " f") + " Q",
    "0.15 0.15 0.15 rg",
    text(126, 764, "F1", 10, "Government of the People's Republic of Bangladesh"),
    text(126, 748, "F2", 13, f.authority),
    text(60, 680, "F2", 22, f.title),
    text(60, 650, "F2", 12, `Licence No. ${f.number}`),
    text(60, 600, "F1", 11, "Issued to"),
    text(160, 600, "F2", 11, f.holder),
    text(60, 580, "F1", 11, "Premises"),
    text(160, 580, "F2", 11, f.address),
    text(60, 560, "F1", 11, "Date of issue"),
    text(160, 560, "F2", 11, f.issued),
    text(60, 540, "F1", 11, "Valid until"),
    text(160, 540, "F2", 11, f.expires),
    ...body.map((line, i) => text(60, 490 - i * 16, "F1", 10, line)),
    "q 0.545 0.118 0.247 RG 3 w " + circle(455, 190, 52) + " 1 w " + circle(455, 190, 40) + " Q",
    "q 0.545 0.118 0.247 rg " + text(427, 187, "F2", 8, "OFFICIAL SEAL") + " Q",
    "q 0.2 0.2 0.2 RG 0.8 w 60 170 m 250 170 l S Q",
    text(60, 154, "F1", 10, "Authorised officer"),
    "q 0.55 0.55 0.55 rg " + text(60, 60, "F1", 8, "Scanned copy held in the ABG ONE regulatory licence register.") + " Q",
  ].join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${Buffer.byteLength(content, "latin1")} >>\nstream\n${content}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
  ];
  let out = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((o, i) => {
    offsets.push(Buffer.byteLength(out, "latin1"));
    out += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = Buffer.byteLength(out, "latin1");
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}`;
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, "latin1");
}

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

/** A photographed-paper look: a bordered certificate with a flag, text lines, a signature and a seal. */
function certificatePng(seedKey: string): Buffer {
  const w = 720;
  const h = 500;
  const px = Buffer.alloc(w * h * 3);
  let seed = [...seedKey].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  const rand = () => ((seed = (Math.imul(seed, 1103515245) + 12345) >>> 0) / 4294967296);
  const set = (x: number, y: number, [r, g, b]: number[]) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const i = (Math.round(y) * w + Math.round(x)) * 3;
    px[i] = r;
    px[i + 1] = g;
    px[i + 2] = b;
  };
  const rect = (x: number, y: number, rw: number, rh: number, c: number[]) => {
    for (let yy = y; yy < y + rh; yy++) for (let xx = x; xx < x + rw; xx++) set(xx, yy, c);
  };
  const ring = (cx: number, cy: number, r: number, t: number, c: number[], fill = false) => {
    for (let yy = cy - r - t; yy <= cy + r + t; yy++)
      for (let xx = cx - r - t; xx <= cx + r + t; xx++) {
        const d = Math.hypot(xx - cx, yy - cy);
        if (fill ? d <= r : Math.abs(d - r) <= t / 2) set(xx, yy, c);
      }
  };
  // Paper with a little scanner grain and a soft shadow towards the bottom-right.
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const shade = Math.round((x / w + y / h) * 6);
      const grain = Math.round(rand() * 8) - 4;
      set(x, y, [246 - shade + grain, 241 - shade + grain, 228 - shade + grain]);
    }
  const green = [0, 106, 78];
  const ink = [38, 44, 56];
  const grey = [150, 152, 158];
  rect(14, 14, w - 28, 8, green);
  rect(14, h - 22, w - 28, 8, green);
  rect(14, 14, 8, h - 28, green);
  rect(w - 22, 14, 8, h - 28, green);
  rect(32, 32, w - 64, 2, green);
  rect(32, h - 34, w - 64, 2, green);
  rect(32, 32, 2, h - 64, green);
  rect(w - 34, 32, 2, h - 64, green);
  // Flag and heading.
  rect(56, 54, 78, 46, green);
  ring(88, 77, 14, 0, [244, 42, 65], true);
  rect(156, 58, 380, 12, ink);
  rect(156, 80, 260, 8, grey);
  rect(200, 124, 320, 18, ink);
  // Body text lines.
  for (let i = 0; i < 7; i++) {
    const width = 420 + Math.round(rand() * 180);
    rect(60, 176 + i * 28, i === 6 ? width / 2 : width, 7, i % 3 === 0 ? ink : grey);
  }
  // Signature.
  for (let x = 380; x < 540; x++) {
    const y = 420 + Math.sin((x - 380) / 9) * 9 + Math.sin((x - 380) / 23) * 6;
    rect(x, y, 2, 2, [24, 40, 96]);
  }
  rect(372, 444, 180, 1, ink);
  // Seal.
  ring(626, 404, 46, 5, [139, 30, 63]);
  ring(626, 404, 34, 2, [139, 30, 63]);
  rect(600, 400, 52, 7, [139, 30, 63]);

  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 3 + 1)] = 0;
    px.copy(raw, y * (w * 3 + 1) + 1, y * w * 3, (y + 1) * w * 3);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", deflateSync(raw)),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}
