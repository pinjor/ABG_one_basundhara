import { randomBytes } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import {
  NOTICE_CHANNEL_LABEL,
  NoticeAudience,
  NoticeCategory,
  NoticeChannel,
  NoticeStatus,
  NotificationCategory,
  formatNoticeNumber,
  noticeExcerpt,
} from "@abg-dispatch/shared";
import { dhakaYear, nextSequence } from "../../src/common/sequence";
import { MINUTE, type SeedContext } from "./context";

// ─── A small, valid PDF writer (letterhead + wrapped text, multi-page) ───────

export interface NoticePdfContent {
  reference?: string;
  title: string;
  /** Short line under the title, e.g. the issuing office and date. */
  subtitle?: string;
  /** Paragraphs; a paragraph starting with "## " is a section heading, "- " a bullet. */
  paragraphs: string[];
  signature?: string[];
}

const ASCII: Record<string, string> = { "–": "-", "—": "-", "‘": "'", "’": "'", "“": '"', "”": '"', "…": "...", "•": "-", "·": "-", "৳": "Tk ", "×": "x" };

function pdfText(s: string): string {
  const plain = s.replace(/[–—‘’“”…•·৳×]/g, (c) => ASCII[c] ?? "").replace(/[^\x20-\x7e]/g, "");
  return plain.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function wrap(text: string, max: number): string[] {
  const words = text.replace(/\s+/g, " ").trim().split(" ");
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    if (!line) line = w;
    else if (line.length + 1 + w.length <= max) line += ` ${w}`;
    else {
      lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * Builds a real, viewer-compatible PDF (PDF 1.4, Helvetica, A4) with the
 * group letterhead. Used for the seeded circulars and by the tests.
 */
export function buildNoticePdf(doc: NoticePdfContent): Buffer {
  const W = 595;
  const H = 842;
  const left = 64;
  const bottom = 72;
  type Op = string;
  const pages: Op[][] = [];
  let ops: Op[] = [];
  let y = 0;
  const navy = "0.047 0.090 0.153";
  const muted = "0.357 0.400 0.471";
  const text = (font: "F1" | "F2", size: number, x: number, yy: number, s: string, color = navy) =>
    ops.push(`BT ${color} rg /${font} ${size} Tf 1 0 0 1 ${x} ${yy.toFixed(1)} Tm (${pdfText(s)}) Tj ET`);

  const newPage = (first: boolean) => {
    ops = [];
    pages.push(ops);
    // Letterhead band.
    ops.push(`${navy} rg 0 ${H - 92} ${W} 92 re f`);
    text("F2", 17, left, H - 48, "ANVIR BASHUNDHARA GROUP", "0.933 0.945 0.961");
    text("F1", 9, left, H - 66, "Plot 314/A, Block E, Bashundhara R/A, Dhaka  |  Official notice board", "0.792 0.816 0.847");
    if (doc.reference) text("F2", 9.5, W - left - 120, H - 48, doc.reference, "0.792 0.816 0.847");
    y = H - 130;
    if (first) {
      for (const t of wrap(doc.title, 58)) {
        text("F2", 15, left, y, t);
        y -= 20;
      }
      if (doc.subtitle) {
        text("F1", 9.5, left, y, doc.subtitle, muted);
        y -= 14;
      }
      ops.push(`0.79 0.82 0.85 RG 0.8 w ${left} ${y.toFixed(1)} m ${W - left} ${y.toFixed(1)} l S`);
      y -= 24;
    }
  };
  const ensure = (needed: number) => {
    if (y - needed < bottom) newPage(false);
  };

  newPage(true);
  for (const p of doc.paragraphs) {
    if (p.startsWith("## ")) {
      ensure(30);
      y -= 4;
      text("F2", 11.5, left, y, p.slice(3));
      y -= 18;
      continue;
    }
    const bullet = p.startsWith("- ");
    const lines = wrap(bullet ? p.slice(2) : p, bullet ? 84 : 88);
    for (const [i, line] of lines.entries()) {
      ensure(16);
      if (bullet && i === 0) text("F1", 10.5, left + 4, y, "-");
      text("F1", 10.5, bullet ? left + 16 : left, y, line);
      y -= 15;
    }
    y -= 7;
  }
  if (doc.signature?.length) {
    ensure(20 + doc.signature.length * 15);
    y -= 14;
    for (const [i, s] of doc.signature.entries()) {
      text(i === 0 ? "F2" : "F1", 10.5, left, y, s);
      y -= 15;
    }
  }
  pages.forEach((page, i) => {
    page.push(`BT ${muted} rg /F1 8.5 Tf 1 0 0 1 ${left} 40 Tm (${pdfText(`Issued through ABG ONE${doc.reference ? `  |  ${doc.reference}` : ""}`)}) Tj ET`);
    page.push(`BT ${muted} rg /F1 8.5 Tf 1 0 0 1 ${W - left - 48} 40 Tm (Page ${i + 1} of ${pages.length}) Tj ET`);
  });

  // Objects: 1 catalog, 2 pages, 3 Helvetica, 4 Helvetica-Bold, 5 info, then page + content pairs.
  const objects: string[] = [];
  const pageIds = pages.map((_, i) => 6 + i * 2);
  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[2] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pages.length} >>`;
  objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";
  objects[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>";
  objects[5] = `<< /Title (${pdfText(doc.title)}) /Author (Anvir Bashundhara Group) /Producer (ABG ONE) >>`;
  pages.forEach((page, i) => {
    const stream = page.join("\n");
    objects[pageIds[i]] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${pageIds[i] + 1} 0 R >>`;
    objects[pageIds[i] + 1] = `<< /Length ${Buffer.byteLength(stream, "latin1")} >>\nstream\n${stream}\nendstream`;
  });
  let out = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
  const offsets: number[] = [];
  for (let id = 1; id < objects.length; id++) {
    offsets[id] = Buffer.byteLength(out, "latin1");
    out += `${id} 0 obj\n${objects[id]}\nendobj\n`;
  }
  const xref = Buffer.byteLength(out, "latin1");
  out += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let id = 1; id < objects.length; id++) out += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
  out += `trailer\n<< /Size ${objects.length} /Root 1 0 R /Info 5 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, "latin1");
}

// ─── Deterministic randomness, so every reseed looks the same ────────────────

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ─── The notices ─────────────────────────────────────────────────────────────

type ReceiptState = "ack" | "read" | "none";

interface NoticeSeed {
  key: string;
  author: string;
  channel: NoticeChannel;
  category: NoticeCategory;
  title: string;
  body: string;
  signedBy: string;
  urgent?: boolean;
  pinned?: boolean;
  /** Branch codes; omitted means everyone. */
  offices?: string[];
  requiresAcknowledgement: boolean;
  status: NoticeStatus;
  /** Minutes before now. */
  publishedAgo?: number;
  createdAgo: number;
  archivedAgo?: number;
  expiresIn?: number;
  pdf?: { fileName: string; content: NoticePdfContent };
  /** Share of the audience who acknowledged / only opened it. */
  ackShare?: number;
  readShare?: number;
  /** Fixed states for the demo personas, by employee code. */
  personas?: Record<string, ReceiptState>;
  /** Write the "new notice" notification into people's inboxes. */
  notify?: boolean;
}

const TRAVEL_POLICY: NoticePdfContent = {
  title: "Circular: Foreign travel requires MD / Chairman sanction",
  subtitle: "Office of the Managing Director  |  Effective immediately",
  paragraphs: [
    "## 1. Purpose",
    "This circular sets out how official travel outside Bangladesh is approved across Anvir Bashundhara Group and its concerns. It replaces every earlier instruction on foreign travel.",
    "## 2. Who must obtain sanction",
    "- Every employee, consultant and director travelling abroad on group business, whatever the funding source.",
    "- Travel for trade fairs, supplier visits, training, audits and plant commissioning is included.",
    "- Personal travel during a sanctioned trip must be declared in the same request.",
    "## 3. How to apply",
    "- Raise an Official Tour Request in ABG ONE at least 15 working days before departure.",
    "- Your head of department recommends; HR & Finance vet the purpose and the budget.",
    "- The Managing Director sanctions; tours above Tk 15,00,000 or longer than 14 days also need the Chairman.",
    "## 4. Tickets, visas and advances",
    "No ticket may be issued, visa fee paid or travel advance released until the sanction appears on the tour request. Travel desks must check the sanction reference before booking.",
    "## 5. After the trip",
    "Submit the tour report and settle the advance within 7 working days of return. Unsettled advances are recovered from salary.",
    "## 6. Compliance",
    "Travel without sanction is a breach of the group's code of conduct and will be handled under the disciplinary policy.",
  ],
  signature: ["Kazi Ashraful Haque", "Managing Director", "Anvir Bashundhara Group"],
};

const HOLIDAY_SCHEDULE: NoticePdfContent = {
  title: "Holiday schedule: Durga Puja and Victory Day 2026",
  subtitle: "Human Resources Division  |  October - December 2026",
  paragraphs: [
    "## Offices closed",
    "- Durga Puja (Bijoya Dashami): Tuesday, 20 October 2026.",
    "- Victory Day: Wednesday, 16 December 2026.",
    "## Factories and the Central Warehouse",
    "- Factory A and Factory B production lines run a reduced holiday roster; shift supervisors will publish the duty list three days before each holiday.",
    "- Employees on holiday duty receive a substitute day off within 30 days, recorded through HR.",
    "## Before you leave",
    "- Hand over urgent files and parcels to your designated alternate.",
    "- Security and gate staff follow the holiday deployment plan issued by Administration.",
    "## Questions",
    "Contact HR on extension 2101 or email hr@abg.com.bd.",
  ],
  signature: ["Sadia Rahman", "HR Manager", "Human Resources Division"],
};

const NOTICES: NoticeSeed[] = [
  {
    key: "chairman-message",
    author: "ABG-1003",
    channel: NoticeChannel.CHAIRMAN,
    category: NoticeCategory.GENERAL,
    title: "A message from the Chairman: one group, one standard",
    body: [
      "Dear colleagues,",
      "As we enter the last quarter of 2026, I want to thank every one of you — in our offices, factories, warehouse and on the road — for the work that has carried Anvir Bashundhara Group through a demanding year.",
      "ABG ONE now brings our parcels, tours, pool cars, visitors, licences and notices into one place. It means every request is traceable, every approval is recorded and nobody has to chase a signature on paper. I ask each of you to use it fully.",
      "Our standard is simple: do the right thing, record it, and be ready to show it. Safety on our factory floors, honesty in our accounts and respect for each other are not negotiable.",
      "Please read this message and acknowledge it in the app so I know it has reached you.",
      "With gratitude,",
    ].join("\n\n"),
    signedBy: "Shafiqul Alam, Chairman",
    pinned: true,
    requiresAcknowledgement: true,
    status: NoticeStatus.PUBLISHED,
    createdAgo: 12 * 24 * 60 + 90,
    publishedAgo: 12 * 24 * 60,
    ackShare: 0.78,
    readShare: 0.1,
    personas: { "ABG-2041": "ack", "ABG-7231": "ack", "ABG-7420": "read" },
    notify: true,
  },
  {
    key: "md-foreign-travel",
    author: "ABG-1002",
    channel: NoticeChannel.MANAGING_DIRECTOR,
    category: NoticeCategory.POLICY,
    title: "Foreign travel requires MD / Chairman sanction",
    body: [
      "With immediate effect, all official travel outside Bangladesh — for any concern of the group and whatever the funding source — must be sanctioned by the Managing Director before tickets are issued, visa fees paid or advances released.",
      "Tours costing more than Tk 15,00,000, or longer than 14 days, also need the Chairman's sanction.",
      "Apply through an Official Tour Request in ABG ONE at least 15 working days before departure. Your head of department recommends it and HR & Finance vet the purpose and budget before it reaches me.",
      "The full circular is attached. Heads of department are responsible for making sure their teams have read it.",
    ].join("\n\n"),
    signedBy: "Kazi Ashraful Haque, Managing Director",
    requiresAcknowledgement: true,
    status: NoticeStatus.PUBLISHED,
    createdAgo: 6 * 24 * 60 + 40,
    publishedAgo: 6 * 24 * 60,
    pdf: { fileName: "ABG-Foreign-Travel-Circular.pdf", content: TRAVEL_POLICY },
    ackShare: 0.62,
    readShare: 0.16,
    personas: { "ABG-2041": "read", "ABG-7231": "ack", "ABG-7420": "none" },
    notify: true,
  },
  {
    key: "hr-holidays",
    author: "ABG-2101",
    channel: NoticeChannel.HR,
    category: NoticeCategory.HOLIDAY,
    title: "Durga Puja and Victory Day holidays",
    body: [
      "All offices of the group will remain closed on Tuesday, 20 October 2026 for Durga Puja (Bijoya Dashami) and on Wednesday, 16 December 2026 for Victory Day.",
      "Factory A, Factory B and the Central Warehouse will run a reduced holiday roster. Shift supervisors will share the duty list three days before each holiday, and everyone on duty gets a substitute day off within 30 days.",
      "The attached schedule has the details. Shubho Bijoya to all who celebrate.",
    ].join("\n\n"),
    signedBy: "Sadia Rahman, HR Manager",
    requiresAcknowledgement: false,
    status: NoticeStatus.PUBLISHED,
    createdAgo: 10 * 24 * 60 + 30,
    publishedAgo: 10 * 24 * 60,
    expiresIn: 57 * 24 * 60,
    pdf: { fileName: "ABG-Holiday-Schedule-Q4-2026.pdf", content: HOLIDAY_SCHEDULE },
    readShare: 0.82,
    personas: { "ABG-2041": "read", "ABG-7231": "read" },
  },
  {
    key: "lpg-safety",
    author: "ABG-1001",
    channel: NoticeChannel.ADMINISTRATION,
    category: NoticeCategory.SAFETY,
    title: "Safety circular: LPG cylinder handling at Factory A and Factory B",
    body: [
      "Following a gas leak at the Factory B canteen store last week, the following rules apply at Factory A and Factory B with immediate effect.",
      "1. LPG cylinders are stored upright, chained, in the ventilated cylinder cage only — never inside kitchens, stores or under stairs.\n2. Only trained canteen and maintenance staff may connect or change a cylinder. Check every joint with soapy water, never with a flame.\n3. Regulators and hoses older than two years are replaced this month. Maintenance will tag each one with its fitting date.\n4. If you smell gas: do not switch anything on or off, open doors and windows, move people out and call the safety officer on 333.",
      "Floor supervisors must brief every shift and confirm in the app that they have read this circular. A fire-safety inspection of both factories follows next week.",
    ].join("\n\n"),
    signedBy: "Arif Chowdhury, Head of Administration",
    urgent: true,
    offices: ["FCA", "FCB"],
    requiresAcknowledgement: true,
    status: NoticeStatus.PUBLISHED,
    createdAgo: 2 * 24 * 60 + 20,
    publishedAgo: 2 * 24 * 60,
    ackShare: 0.55,
    readShare: 0.2,
    personas: { "ABG-7231": "none", "ABG-7420": "ack", "ABG-5120": "ack" },
    notify: true,
  },
  {
    key: "it-two-factor",
    author: "ABG-0001",
    channel: NoticeChannel.IT,
    category: NoticeCategory.CIRCULAR,
    title: "Two-factor sign-in becomes mandatory for administrators",
    body: [
      "From 1 November 2026, everyone with an administrator role in ABG ONE — office and head office admins, HR & Finance, compliance, fleet, executives and auditors — must sign in with a six-digit code from an authenticator app as well as their password.",
      "Set it up now: open the admin portal, choose My security, scan the QR code with Google Authenticator or Microsoft Authenticator and enter the code it shows. It takes two minutes.",
      "Employees without an administrator role are not affected. Never share your codes; IT will never ask for them.",
    ].join("\n\n"),
    signedBy: "IT Systems Administration",
    requiresAcknowledgement: false,
    status: NoticeStatus.PUBLISHED,
    createdAgo: 4 * 24 * 60 + 15,
    publishedAgo: 4 * 24 * 60,
    expiresIn: 26 * 24 * 60,
    readShare: 0.52,
    personas: { "ABG-2041": "none", "ABG-7231": "read" },
  },
  {
    key: "fca-canteen",
    author: "ABG-5120",
    channel: NoticeChannel.ADMINISTRATION,
    category: NoticeCategory.GENERAL,
    title: "Factory A canteen: new opening hours",
    body: [
      "From Sunday, the Factory A canteen opens in three sittings so each shift can eat without queueing:",
      "Breakfast 7:00–8:30 am · Lunch 12:30–2:30 pm · Night shift meal 9:00–10:00 pm.",
      "Tea and water remain available at the counter throughout the day. Please bring your ID card; meal tokens are no longer used.",
    ].join("\n\n"),
    signedBy: "Sabina Yasmin, Factory Admin Lead",
    offices: ["FCA"],
    requiresAcknowledgement: false,
    status: NoticeStatus.PUBLISHED,
    createdAgo: 22 * 60,
    publishedAgo: 20 * 60,
    readShare: 0.4,
    personas: { "ABG-7231": "none" },
    notify: true,
  },
  {
    key: "compliance-drill",
    author: "ABG-2400",
    channel: NoticeChannel.COMPLIANCE,
    category: NoticeCategory.POLICY,
    title: "Reminder: licence display and fire-drill records",
    body: [
      "Inspectors from the Department of Inspection for Factories and Establishments and the Fire Service may visit any of our sites without notice.",
      "Every office and factory must keep its trade licence, factory licence and fire licence on display at reception, with the renewal date visible, and keep the last two fire-drill records in the admin office.",
      "Office admins: confirm your site is ready by acknowledging this notice. Licences due for renewal are tracked in the Regulatory Licences register.",
    ].join("\n\n"),
    signedBy: "Shirin Akhter, Compliance & Licensing Manager",
    requiresAcknowledgement: true,
    status: NoticeStatus.PUBLISHED,
    createdAgo: 9 * 24 * 60 + 45,
    publishedAgo: 9 * 24 * 60,
    ackShare: 0.6,
    readShare: 0.14,
    personas: { "ABG-2041": "none", "ABG-5120": "ack", "ABG-7455": "read" },
  },
  {
    key: "hr-winter-draft",
    author: "ABG-2101",
    channel: NoticeChannel.HR,
    category: NoticeCategory.HR,
    title: "Winter uniform and blanket distribution",
    body: [
      "Winter uniforms for factory and warehouse staff, and blankets for night-shift workers, will be distributed from the first week of December.",
      "Department heads: send your headcount and sizes to HR by 20 November.",
    ].join("\n\n"),
    signedBy: "Sadia Rahman, HR Manager",
    requiresAcknowledgement: false,
    status: NoticeStatus.DRAFT,
    createdAgo: 26 * 60,
  },
  {
    key: "hr-sports-day",
    author: "ABG-2101",
    channel: NoticeChannel.HR,
    category: NoticeCategory.EVENT,
    title: "Annual Sports Day 2026: registrations open",
    body: [
      "The ABG Annual Sports Day takes place at the Bashundhara sports complex. Football, cricket, tug of war and family races are open to all employees and their families.",
      "Register your team with your office HR focal point by the end of the month.",
    ].join("\n\n"),
    signedBy: "Sadia Rahman, HR Manager",
    requiresAcknowledgement: false,
    status: NoticeStatus.ARCHIVED,
    createdAgo: 48 * 24 * 60 + 60,
    publishedAgo: 48 * 24 * 60,
    archivedAgo: 20 * 24 * 60,
    readShare: 0.88,
  },
];

/** Demo data: notice board posts, who has read and acknowledged them, and the announcements in people's inboxes. */
export async function seedNotices(ctx: SeedContext): Promise<void> {
  const { prisma, now } = ctx;
  const at = (minutesAgo: number) => new Date(now.getTime() - minutesAgo * MINUTE);
  const people = Object.values(ctx.users).map((u) => ({ ...u, branch: ctx.employees[u.code]?.branch ?? null }));
  await mkdir(join(ctx.storageRoot, "seed"), { recursive: true });

  // Number them in the order they were written, as the live system would have.
  const ordered = [...NOTICES].sort((a, b) => b.createdAgo - a.createdAgo);
  for (const [index, seed] of ordered.entries()) {
    const author = ctx.users[seed.author];
    const createdAt = at(seed.createdAgo);
    const year = dhakaYear(createdAt);
    const referenceNumber = formatNoticeNumber(year, await nextSequence(prisma, "NB", String(year)));
    const publishedAt = seed.publishedAgo !== undefined ? at(seed.publishedAgo) : null;

    let attachment = {};
    if (seed.pdf) {
      const data = buildNoticePdf({ ...seed.pdf.content, reference: referenceNumber });
      const key = `seed/${randomBytes(12).toString("base64url")}.pdf`;
      await writeFile(join(ctx.storageRoot, key), data);
      attachment = { attachmentKey: key, attachmentName: seed.pdf.fileName, attachmentMime: "application/pdf", attachmentSize: data.length };
    }

    const branchIds = (seed.offices ?? []).map((code) => ctx.branches[code].id);
    const notice = await prisma.notice.create({
      data: {
        referenceNumber,
        title: seed.title,
        body: seed.body,
        channel: seed.channel,
        category: seed.category,
        urgent: !!seed.urgent,
        pinned: !!seed.pinned,
        audience: seed.offices ? NoticeAudience.BRANCHES : NoticeAudience.ALL,
        branchIds,
        requiresAcknowledgement: seed.requiresAcknowledgement,
        status: seed.status,
        authorUserId: author.id,
        signedBy: seed.signedBy,
        ...attachment,
        publishedAt,
        expiresAt: seed.expiresIn !== undefined ? new Date(now.getTime() + seed.expiresIn * MINUTE) : null,
        archivedAt: seed.archivedAgo !== undefined ? at(seed.archivedAgo) : null,
        createdAt,
        updatedAt: seed.archivedAgo !== undefined ? at(seed.archivedAgo) : (publishedAt ?? createdAt),
      },
    });
    if (!publishedAt) continue;

    // Receipts: the personas as scripted, everyone else drawn deterministically.
    const audience = people.filter((p) => p.id !== author.id && (!seed.offices || (p.branch && seed.offices.includes(p.branch))));
    const random = mulberry32(1000 + index * 97);
    const since = (seed.publishedAgo ?? 0) - (seed.archivedAgo ?? 0);
    const receipts: { noticeId: string; userId: string; readAt: Date; acknowledgedAt: Date | null }[] = [];
    const states = new Map<string, ReceiptState>();
    for (const person of audience) {
      const roll = random();
      const scripted = seed.personas?.[person.code];
      const state: ReceiptState = scripted ?? (roll < (seed.ackShare ?? 0) ? "ack" : roll < (seed.ackShare ?? 0) + (seed.readShare ?? 0) ? "read" : "none");
      const effective: ReceiptState = state === "ack" && !seed.requiresAcknowledgement ? "read" : state;
      states.set(person.id, effective);
      if (effective === "none") continue;
      // Most people open a notice within the first day; a few catch up later.
      const readMinutes = Math.min(since - 5, Math.round((random() < 0.75 ? random() * 0.15 : random()) * since) + 5);
      const readAt = new Date(publishedAt.getTime() + Math.max(5, readMinutes) * MINUTE);
      const ackAt = effective === "ack" ? new Date(Math.min(readAt.getTime() + Math.round(2 + random() * 90) * MINUTE, now.getTime() - MINUTE)) : null;
      receipts.push({ noticeId: notice.id, userId: person.id, readAt, acknowledgedAt: ackAt });
    }
    if (receipts.length) await prisma.noticeReceipt.createMany({ data: receipts });

    if (seed.notify && seed.status === NoticeStatus.PUBLISHED) {
      const title = seed.urgent ? `Urgent notice: ${seed.title}` : `New notice: ${seed.title}`;
      const body = `${NOTICE_CHANNEL_LABEL[seed.channel]} · ${noticeExcerpt(seed.body, 120)}${seed.requiresAcknowledgement ? " Please read and acknowledge." : ""}`;
      await prisma.notification.createMany({
        data: audience.map((p) => ({
          userId: p.id,
          eventType: "NOTICE_PUBLISHED",
          category: seed.requiresAcknowledgement ? NotificationCategory.ACTION_REQUIRED : NotificationCategory.PARCEL_UPDATE,
          title,
          body,
          data: { module: "notices", objectId: notice.id, reference: referenceNumber, route: `/notices/${notice.id}`, status: NoticeStatus.PUBLISHED },
          readAt: states.get(p.id) === "none" ? null : receipts.find((r) => r.userId === p.id)?.readAt ?? null,
          createdAt: publishedAt,
          dedupeKey: `notice:${notice.id}:published:${p.id}`,
        })),
        skipDuplicates: true,
      });
    }
  }
}
