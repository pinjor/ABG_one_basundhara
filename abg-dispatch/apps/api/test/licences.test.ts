import { beforeAll, describe, expect, test } from "bun:test";
import { addCalendarDays, dhakaToday } from "@abg-dispatch/shared";
import { api, clearTokens, key, login, resetAndSeed, startApp } from "./helpers";

const SHIRIN = "shirin.akhter@abg.com.bd"; // Compliance officer (manages the register)
const ARIF = "arif.chowdhury@abg.com.bd"; // Head office admin (manages)
const SABINA = "sabina.yasmin@abg.com.bd"; // Factory A branch admin (reads Factory A)
const TAHMINA = "tahmina.begum@abg.com.bd"; // Factory B branch admin (reads Factory B)
const MD = "md@abg.com.bd"; // Managing Director (reads everything)
const CHAIRMAN = "chairman@abg.com.bd";
const AUDITOR = "mahmuda.akter@abg.com.bd";
const RAHIM = "rahim@abg.com.bd"; // Employee without licence access

let baseUrl = "";
let origin = "";
const ids: Record<string, string> = {};
const userIds: Record<string, string> = {};

const day = (offset: number) => addCalendarDays(dhakaToday(), offset);

const PDF = Buffer.from(
  "%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [] /Count 0 >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n",
  "latin1",
);
// 1×1 transparent PNG.
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=", "base64");

async function upload(identifier: string, path: string, file: { data: Buffer; name: string; type: string } | null, fields: Record<string, string> = {}) {
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) form.append(k, v);
  if (file) form.append("file", new Blob([file.data], { type: file.type }), file.name);
  const res = await fetch(`${baseUrl}${path}`, { method: "POST", headers: { authorization: `Bearer ${await login(identifier)}` }, body: form });
  return { status: res.status, body: (await res.json()) as any };
}

async function create(identifier: string, overrides: Record<string, unknown> = {}) {
  const body = {
    name: "Trade licence",
    licenceNumber: `TEST/${crypto.randomUUID().slice(0, 8)}`,
    category: "TRADE",
    issuingAuthority: "Narayanganj City Corporation",
    branchId: ids.FCA,
    ownerUserId: userIds.SABINA,
    issuedAt: day(-300),
    expiresAt: day(200),
    renewalLeadDays: 90,
    renewalFee: 12000,
    ...overrides,
  };
  return api("POST", "/licences", { token: await login(identifier), body, headers: { "idempotency-key": key("lic") } });
}

/** A person's notifications about one licence (read from the database: later engine runs fill inboxes quickly). */
async function notificationsFor(email: string, licenceId: string) {
  const { prisma } = await startApp();
  const rows = await prisma.notification.findMany({ where: { user: { email }, data: { path: ["objectId"], equals: licenceId } }, orderBy: { createdAt: "asc" } });
  return rows as unknown as { title: string; body: string; category: string; eventType: string; data: { route: string; objectId: string } }[];
}

async function runAlerts() {
  const res = await api("POST", "/admin/licences/run-alerts", { token: await login(SHIRIN) });
  expect(res.status).toBe(200);
  return res.body as { checked: number; alerted: number; alerts: { id: string; thresholdDays: number; level: string; notified: number }[] };
}

describe("regulatory licence register", () => {
  beforeAll(async () => {
    ({ baseUrl } = await startApp());
    origin = baseUrl.replace(/\/api$/, "");
    await resetAndSeed();
    clearTokens();
    const { prisma } = await startApp();
    for (const code of ["HO", "FCA", "FCB", "WH"]) ids[code] = (await prisma.branch.findUniqueOrThrow({ where: { code } })).id;
    for (const [k, email] of Object.entries({ SHIRIN, ARIF, SABINA, TAHMINA, RAHIM })) userIds[k] = (await prisma.user.findFirstOrThrow({ where: { email } })).id;
  });

  test("the register lists licences soonest expiry first, with countdowns and renewal progress", async () => {
    const res = await api("GET", "/licences?limit=100", { token: await login(SHIRIN) });
    expect(res.status).toBe(200);
    const items = res.body.items as any[];
    expect(items).toHaveLength(16);
    const dates = items.map((i) => i.expiresAt);
    expect([...dates].sort()).toEqual(dates);
    expect(items[0]).toMatchObject({ name: "Fire licence", state: "EXPIRED", daysLeft: -9, renewalStage: "DOCUMENTS_PREPARED", renewalProgress: 20, hasDocument: true });
    expect(items[0].branch.code).toBe("FCB");
    expect(items[0].owner.name).toBe("Tahmina Begum");
    const factory = items.find((i) => i.licenceNumber === "DIFE/NARAYAN/FL/2016/4471");
    expect(factory).toMatchObject({ state: "EXPIRING", daysLeft: 12, renewalStage: "APPLICATION_SUBMITTED", renewalProgress: 40, issuingAuthority: "Department of Inspection for Factories and Establishments (DIFE)" });
    for (const k of ["id", "name", "licenceNumber", "category", "issuingAuthority", "branch", "owner", "expiresAt", "daysLeft", "state", "renewalStage", "renewalProgress", "hasDocument"]) expect(factory).toHaveProperty(k);

    // Keyset pages never overlap.
    const first = await api("GET", "/licences?limit=6", { token: await login(SHIRIN) });
    expect(first.body.nextCursor).toBeTruthy();
    const second = await api("GET", `/licences?limit=6&cursor=${first.body.nextCursor}`, { token: await login(SHIRIN) });
    expect([...first.body.items, ...second.body.items].map((i: any) => i.id)).toEqual(items.slice(0, 12).map((i) => i.id));
  });

  test("filter tabs, category, office and search", async () => {
    const token = await login(SHIRIN);
    const count = async (query: string) => (await api("GET", `/licences?limit=100&${query}`, { token })).body.items as any[];
    expect((await count("state=EXPIRED")).map((i) => i.daysLeft)).toEqual([-9, -4]);
    expect((await count("state=EXPIRING")).map((i) => i.daysLeft)).toEqual([5, 12, 23]);
    expect((await count("state=DUE_SOON")).map((i) => i.daysLeft)).toEqual([48, 64, 75]);
    expect(await count("state=VALID")).toHaveLength(8);
    expect((await count("state=RENEWAL_IN_PROGRESS")).map((i) => i.renewalStage).sort()).toEqual(["APPLICATION_SUBMITTED", "DOCUMENTS_PREPARED", "INSPECTION_SCHEDULED"]);
    expect(await count("category=TRADE")).toHaveLength(5);
    expect((await count(`branchId=${ids.FCA}`)).every((i) => i.branch.code === "FCA")).toBe(true);
    expect((await count("q=gazipur city")).map((i) => i.branch.code).sort()).toEqual(["FCB", "WH"]);
    expect((await count("q=DIFE/NARAYAN"))[0].name).toBe("Factory licence");
    expect((await api("GET", "/licences?state=SOMETHING", { token })).status).toBe(400);
  });

  test("the summary counts the register for the dashboard", async () => {
    const res = await api("GET", "/admin/licences/summary", { token: await login(MD) });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ total: 16, valid: 8, dueSoon: 3, expiring: 3, expired: 2, renewalsInProgress: 3 });
    expect(res.body.nextExpiry).toMatchObject({ name: "Trade licence", daysLeft: 5 });
    expect(res.body.nextExpiry.branch.code).toBe("DHK");
    expect(res.body.byCategory).toMatchObject({ TRADE: 5, FIRE_SAFETY: 2, ENVIRONMENT: 2, IMPORT_EXPORT: 2, OTHER: 0 });
    const fca = await api("GET", `/admin/licences/summary?branchId=${ids.FCA}`, { token: await login(SHIRIN) });
    expect(fca.body).toMatchObject({ total: 6, expired: 1, expiring: 1, valid: 4 });
  });

  test("the seeded alerts are already on record, so the first run sends nothing", async () => {
    const run = await runAlerts();
    expect(run.checked).toBeGreaterThan(0);
    expect(run.alerted).toBe(0);
    const shirinInbox = (await api("GET", "/notifications?limit=100", { token: await login(SHIRIN) })).body.items as any[];
    expect(shirinInbox.some((n) => n.eventType === "LICENCE_EXPIRY_ALERT" && n.data.route.startsWith("/licences/"))).toBe(true);
  });

  test("only the compliance team and head office add or edit licences; changes are validated and audited", async () => {
    for (const who of [SABINA, MD]) expect((await create(who)).status).toBe(403);
    expect((await create(AUDITOR)).status).toBe(403);

    const created = await create(SHIRIN, { licenceNumber: "NCC/TL/2026/T-0001" });
    expect(created.status).toBe(201);
    ids.created = created.body.id;
    expect(created.body).toMatchObject({ state: "VALID", daysLeft: 200, renewalStage: "NOT_STARTED", renewalProgress: 0, hasDocument: false, documentUrl: null });
    expect(created.body.owner.name).toBe("Sabina Yasmin");
    expect(created.body.viewer.actions).toEqual(["EDIT", "ADVANCE_RENEWAL", "MARK_RENEWED", "UPLOAD_DOCUMENT", "ADD_NOTE"]);
    expect(created.body.history.map((h: any) => h.type)).toEqual(["CREATED"]);

    const duplicate = await create(ARIF, { licenceNumber: "NCC/TL/2026/T-0001" });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.code).toBe("LICENCE_NUMBER_TAKEN");
    expect((await create(SHIRIN, { licenceNumber: "NCC/TL/2026/T-0001", branchId: ids.FCB, ownerUserId: undefined })).status).toBe(201);

    expect((await create(SHIRIN, { expiresAt: "2027-02-30" })).body.code).toBe("DATE_INVALID");
    expect((await create(SHIRIN, { issuedAt: day(10), expiresAt: day(5) })).body.code).toBe("ISSUED_IN_FUTURE");
    expect((await create(SHIRIN, { issuedAt: day(-10), expiresAt: day(-20) })).body.code).toBe("ISSUED_AFTER_EXPIRY");
    expect((await create(SHIRIN, { ownerUserId: userIds.RAHIM })).body.code).toBe("OWNER_INVALID");
    // Tahmina looks after Factory B, so she cannot own a Factory A licence.
    expect((await create(SHIRIN, { ownerUserId: userIds.TAHMINA })).body.code).toBe("OWNER_INVALID");
    const lead = await create(SHIRIN, { renewalLeadDays: 400 });
    expect(lead.status).toBe(400);
    expect(lead.body.code).toBe("VALIDATION");

    const owners = await api("GET", `/licences/owners?branchId=${ids.FCA}`, { token: await login(SHIRIN) });
    const ownerNames = owners.body.map((o: any) => o.name);
    expect(ownerNames).toContain("Sabina Yasmin");
    expect(ownerNames).not.toContain("Tahmina Begum");
    expect(ownerNames).not.toContain("Mahmuda Akter");

    const edited = await api("PATCH", `/licences/${ids.created}`, { token: await login(ARIF), body: { name: "Trade licence (Kanchpur)", expiresAt: day(150), renewalFee: 13500 } });
    expect(edited.status).toBe(200);
    expect(edited.body).toMatchObject({ name: "Trade licence (Kanchpur)", daysLeft: 150, renewalFee: 13500 });
    const change = edited.body.history.at(-1);
    expect(change).toMatchObject({ type: "DETAILS_CHANGED", actor: "Arif Chowdhury" });
    expect(change.metadata.changes.expiresAt).toEqual({ before: day(200), after: day(150) });
    expect(change.metadata.alertsReset).toBe(true);
    expect((await api("PATCH", `/licences/${ids.created}`, { token: await login(SABINA), body: { name: "x y z" } })).status).toBe(403);

    const { prisma } = await startApp();
    const audit = await prisma.auditLog.findFirstOrThrow({ where: { objectId: ids.created, action: "licence.updated" } });
    expect(audit.before).toMatchObject({ name: "Trade licence", expiresAt: day(200), renewalFee: 12000 });
    expect(audit.after).toMatchObject({ name: "Trade licence (Kanchpur)", expiresAt: day(150), renewalFee: 13500 });
    expect(await prisma.auditLog.count({ where: { objectId: ids.created, action: "licence.created" } })).toBe(1);
  });

  test("state follows the expiry date and the licence's own renewal window", async () => {
    const make = async (expiresIn: number, renewalLeadDays = 90) => (await create(SHIRIN, { expiresAt: day(expiresIn), issuedAt: day(-300), renewalLeadDays })).body;
    const dueSoon = await make(45);
    expect(dueSoon).toMatchObject({ state: "DUE_SOON", daysLeft: 45 });
    // The 60-day threshold has been reached and not yet alerted: the next run sends it.
    expect(dueSoon.alerts).toMatchObject({ lastDays: null, due: true, nextDays: 30 });
    expect(await make(20)).toMatchObject({ state: "EXPIRING", daysLeft: 20 });
    expect(await make(0)).toMatchObject({ state: "EXPIRING", daysLeft: 0 });
    expect(await make(-1)).toMatchObject({ state: "EXPIRED", daysLeft: -1 });
    expect(await make(45, 30)).toMatchObject({ state: "VALID" });
    const detail = await make(100, 120);
    expect(detail).toMatchObject({ state: "DUE_SOON", renewalWindowOpensOn: day(-20) });
    expect(detail.alerts).toMatchObject({ lastDays: null, due: false, nextDays: 90, nextOn: day(10), nextLevel: "OWNER" });
  });

  test("renewal stages move forward or back with a reason; Mark renewed sets the new expiry and starts again", async () => {
    const token = await login(SHIRIN);
    const id = ids.created;
    const skip = await api("POST", `/licences/${id}/renewal`, { token, body: { stage: "APPLICATION_SUBMITTED" } });
    expect(skip.status).toBe(200);
    expect(skip.body).toMatchObject({ renewalStage: "APPLICATION_SUBMITTED", renewalProgress: 40 });
    expect(skip.body.renewalStartedAt).toBeTruthy();

    const same = await api("POST", `/licences/${id}/renewal`, { token, body: { stage: "APPLICATION_SUBMITTED" } });
    expect(same.status).toBe(409);
    expect(same.body.code).toBe("LICENCE_STATE_CONFLICT");
    expect((await api("POST", `/licences/${id}/renewal`, { token, body: { stage: "RENEWED" } })).body.code).toBe("USE_MARK_RENEWED");
    expect((await api("POST", `/licences/${id}/renewal`, { token, body: { stage: "DOCUMENTS_PREPARED" } })).body.code).toBe("REASON_REQUIRED");
    const back = await api("POST", `/licences/${id}/renewal`, { token, body: { stage: "DOCUMENTS_PREPARED", note: "City corporation returned the file: holding tax receipt missing." } });
    expect(back.body.renewalStage).toBe("DOCUMENTS_PREPARED");
    expect(back.body.history.at(-1)).toMatchObject({ type: "RENEWAL_STAGE_CHANGED", note: "City corporation returned the file: holding tax receipt missing.", metadata: { from: "APPLICATION_SUBMITTED", to: "DOCUMENTS_PREPARED", direction: "BACK" } });
    await api("POST", `/licences/${id}/renewal`, { token, body: { stage: "FEE_PAID" } });

    const earlier = await api("POST", `/licences/${id}/renew`, { token, body: { newExpiresAt: day(100) } });
    expect(earlier.status).toBe(400);
    expect(earlier.body.code).toBe("EXPIRY_NOT_LATER");
    expect((await api("POST", `/licences/${id}/renew`, { token: await login(SABINA), body: { newExpiresAt: day(515) } })).status).toBe(403);

    // Multipart, with the new certificate's scan.
    const renewed = await upload(SHIRIN, `/licences/${id}/renew`, { data: PDF, name: "renewed-trade-licence.pdf", type: "application/pdf" }, { newExpiresAt: day(515), renewalFee: "14,000", note: "Renewed for FY 2027-28." });
    expect(renewed.status).toBe(200);
    expect(renewed.body).toMatchObject({ expiresAt: day(515), issuedAt: dhakaToday(), renewalStage: "NOT_STARTED", renewalProgress: 0, renewalFee: 14000, state: "VALID", hasDocument: true });
    expect(renewed.body.renewalStartedAt).toBeNull();
    expect(renewed.body.alerts.lastDays).toBeNull();
    const [r, d] = renewed.body.history.slice(-2);
    expect(r).toMatchObject({ type: "RENEWED", note: "Renewed for FY 2027-28.", metadata: { previousExpiresAt: day(150), newExpiresAt: day(515), previousStage: "FEE_PAID" } });
    expect(d).toMatchObject({ type: "DOCUMENT_UPLOADED", metadata: { mimeType: "application/pdf", replaced: false } });
    // The owner hears that it is done.
    expect((await notificationsFor(SABINA, id)).map((n) => n.title)).toContain("Trade licence (Kanchpur) renewed");
  });

  test("scanned copies are accepted by content, kept private and served through short-lived signed links", async () => {
    const id = ids.created;
    const fake = await upload(SHIRIN, `/licences/${id}/document`, { data: Buffer.from("this is a text file, not a scan at all"), name: "licence.pdf", type: "application/pdf" });
    expect(fake.status).toBe(400);
    expect(fake.body.code).toBe("DOCUMENT_TYPE");
    expect((await upload(SHIRIN, `/licences/${id}/document`, null)).body.code).toBe("DOCUMENT_REQUIRED");
    expect((await upload(SABINA, `/licences/${id}/document`, { data: PNG, name: "scan.png", type: "image/png" })).status).toBe(403);

    const detail = (await api("GET", `/licences/${id}`, { token: await login(SABINA) })).body;
    const pdf = await fetch(`${origin}${detail.documentUrl}`);
    expect(pdf.status).toBe(200);
    expect(pdf.headers.get("content-type")).toBe("application/pdf");
    expect(pdf.headers.get("content-disposition")).toStartWith("inline;");
    expect(pdf.headers.get("x-frame-options")).toBe("SAMEORIGIN");
    expect(Buffer.from(await pdf.arrayBuffer()).subarray(0, 5).toString()).toBe("%PDF-");

    const forged = await fetch(`${origin}${detail.documentUrl.replace(/sig=[^&]+/, "sig=forged")}`);
    expect(forged.status).toBe(401);
    expect(((await forged.json()) as any).code).toBe("LINK_INVALID");
    const { prisma } = await startApp();
    const { loadConfig } = await import("../src/common/config");
    const { hmacSha256 } = await import("../src/common/crypto");
    const stored = await prisma.licence.findUniqueOrThrow({ where: { id } });
    const exp = Math.floor(Date.now() / 1000) - 60;
    const sig = hmacSha256(loadConfig().jwtSecret, `licence-document.${id}.${stored.documentKey}.${exp}`, "base64url");
    const expired = await fetch(`${baseUrl}/licence-documents/${id}/content?exp=${exp}&sig=${sig}`);
    expect(expired.status).toBe(401);
    expect(((await expired.json()) as any).code).toBe("LINK_EXPIRED");

    const replaced = await upload(SHIRIN, `/licences/${id}/document`, { data: PNG, name: "Scan 2026 (front).png", type: "image/png" }, { note: "Clearer scan" });
    expect(replaced.status).toBe(200);
    expect(replaced.body.document).toMatchObject({ mimeType: "image/png", isPdf: false, uploadedBy: "Shirin Akhter" });
    expect(replaced.body.history.at(-1)).toMatchObject({ type: "DOCUMENT_UPLOADED", note: "Clearer scan", metadata: { replaced: true } });
    // A link to the old scan stops working once it is replaced.
    expect((await fetch(`${origin}${detail.documentUrl}`)).status).toBe(401);
    const png = await fetch(`${origin}${replaced.body.documentUrl}`);
    expect(png.headers.get("content-type")).toBe("image/png");

    const authed = await fetch(`${baseUrl}/licences/${id}/document/content`, { headers: { authorization: `Bearer ${await login(SABINA)}` } });
    expect(authed.status).toBe(200);
    expect((await fetch(`${baseUrl}/licences/${id}/document/content`, { headers: { authorization: `Bearer ${await login(TAHMINA)}` } })).status).toBe(404);
  });

  test("expiry alerts widen as expiry nears: owner and compliance, then office admins, then head office and the MD", async () => {
    const make = async (expiresIn: number, owner = userIds.SHIRIN) => (await create(SHIRIN, { expiresAt: day(expiresIn), issuedAt: day(-300), ownerUserId: owner, name: `Fire licence ${expiresIn}` })).body.id as string;
    const early = await make(40, userIds.SABINA);
    const office = await make(12);
    const final = await make(3);
    const expired = await make(-2);

    const run = await runAlerts();
    const byId = Object.fromEntries(run.alerts.map((a) => [a.id, a]));
    expect(byId[early]).toMatchObject({ thresholdDays: 60, level: "OWNER" });
    expect(byId[office]).toMatchObject({ thresholdDays: 15, level: "OFFICE" });
    expect(byId[final]).toMatchObject({ thresholdDays: 7, level: "LEADERSHIP" });
    expect(byId[expired]).toMatchObject({ thresholdDays: 0, level: "LEADERSHIP" });

    const told = async (id: string) => {
      const out: string[] = [];
      for (const [who, email] of Object.entries({ SHIRIN, SABINA, TAHMINA, ARIF, MD, CHAIRMAN })) if ((await notificationsFor(email, id)).length) out.push(who);
      return out;
    };
    expect(await told(early)).toEqual(["SHIRIN", "SABINA"]);
    expect(await told(office)).toEqual(["SHIRIN", "SABINA"]);
    expect(await told(final)).toEqual(["SHIRIN", "SABINA", "ARIF", "MD", "CHAIRMAN"]);
    expect(await told(expired)).toEqual(["SHIRIN", "SABINA", "ARIF", "MD", "CHAIRMAN"]);

    const [sabinaEarly] = await notificationsFor(SABINA, early);
    expect(sabinaEarly).toMatchObject({ category: "ACTION_REQUIRED", title: "Fire licence 40 expires in 40 days" });
    expect(sabinaEarly.data.route).toBe(`/licences/${early}`);
    expect((await notificationsFor(MD, final))[0].title).toBe("Fire licence 3 expires in 3 days");
    expect((await notificationsFor(MD, expired))[0].title).toBe("Fire licence -2 has expired");
    expect((await notificationsFor(MD, expired))[0].body).toContain("Escalated to head office and the MD.");

    const history = (await api("GET", `/licences/${final}`, { token: await login(SHIRIN) })).body;
    expect(history.history.at(-1)).toMatchObject({ type: "ESCALATED", actor: "ABG ONE alerts", metadata: { thresholdDays: 7, daysLeft: 3, level: "LEADERSHIP" } });
    const notified = history.history.at(-1).metadata.notified as string[];
    expect(notified.slice(0, 3)).toEqual(["Shirin Akhter", "Sabina Yasmin", "Arif Chowdhury"]);
    expect(notified.slice(3).sort()).toEqual(["Kazi Ashraful Haque", "Shafiqul Alam"]);
    expect(history.alerts).toMatchObject({ lastDays: 7, nextDays: 0, nextOn: day(3), nextLevel: "LEADERSHIP", due: false });
    ids.early = early;
  });

  test("an alert is never sent twice for the same threshold; the next threshold and a renewal start fresh alerts", async () => {
    const { app, prisma } = await startApp();
    const { LicenceAlertsService } = await import("../src/licences/licence-alerts.service");
    const engine = app.get(LicenceAlertsService);
    const id = ids.early;
    const count = async () => (await notificationsFor(SHIRIN, id)).length;
    expect(await count()).toBe(1);

    // Running again (now, or concurrently) sends nothing new.
    const [a, b] = await Promise.all([runAlerts(), runAlerts()]);
    expect(a.alerted + b.alerted).toBe(0);
    expect(await count()).toBe(1);

    // 20 days later the licence has 20 days left: the 30-day alert, now including the office admins.
    const later = new Date(Date.now() + 20 * 86_400_000);
    const next = await engine.run(later);
    expect(next.alerts.find((x) => x.id === id)).toMatchObject({ thresholdDays: 30, level: "OFFICE" });
    expect((await engine.run(later)).alerts.some((x) => x.id === id)).toBe(false);
    expect(await count()).toBe(2);
    expect(await prisma.licenceEvent.count({ where: { licenceId: id, type: "ESCALATED" } })).toBe(2);

    // Renewal resets the ladder; the new expiry date is a year away, so nothing is due.
    await api("POST", `/licences/${id}/renew`, { token: await login(SHIRIN), body: { newExpiresAt: day(405) } });
    expect((await prisma.licence.findUniqueOrThrow({ where: { id } })).lastAlertDays).toBeNull();
    expect((await runAlerts()).alerts.some((x) => x.id === id)).toBe(false);
    // As that expiry approaches, alerts begin again from the top of the ladder.
    const nextYear = await engine.run(new Date(Date.now() + 320 * 86_400_000));
    expect(nextYear.alerts.find((x) => x.id === id)).toMatchObject({ thresholdDays: 90, level: "OWNER" });
    expect(await count()).toBe(3);
  });

  test("office admins see only their own offices' licences; others get 404", async () => {
    const fcaLicence = ids.created;
    const tahmina = await api("GET", "/licences?limit=100", { token: await login(TAHMINA) });
    expect(tahmina.status).toBe(200);
    expect(tahmina.body.items.length).toBeGreaterThan(0);
    expect(tahmina.body.items.every((i: any) => i.branch.code === "FCB")).toBe(true);
    const hidden = await api("GET", `/licences/${fcaLicence}`, { token: await login(TAHMINA) });
    expect(hidden.status).toBe(404);
    expect(hidden.body.code).toBe("LICENCE_NOT_FOUND");
    expect((await api("GET", `/licences?branchId=${ids.FCA}`, { token: await login(TAHMINA) })).body.items).toHaveLength(0);
    const offices = await api("GET", "/licences/offices", { token: await login(TAHMINA) });
    expect(offices.body.map((o: any) => o.code)).toEqual(["FCB"]);
    const summary = await api("GET", "/admin/licences/summary", { token: await login(TAHMINA) });
    expect(summary.body.byCategory.FACTORY).toBe(0);

    const sabina = await api("GET", `/licences/${fcaLicence}`, { token: await login(SABINA) });
    expect(sabina.status).toBe(200);
    expect(sabina.body.viewer).toEqual({ canManage: false, actions: [] });
    expect((await api("GET", "/licences/00000000-0000-4000-8000-000000000000", { token: await login(SHIRIN) })).status).toBe(404);
  });

  test("employees without licence access are refused; auditors and the MD read but never change", async () => {
    const rahim = await login(RAHIM);
    expect((await api("GET", "/licences", { token: rahim })).status).toBe(403);
    expect((await api("GET", `/licences/${ids.created}`, { token: rahim })).status).toBe(403);
    expect((await api("GET", "/admin/licences/summary", { token: rahim })).status).toBe(403);
    expect((await api("POST", "/admin/licences/run-alerts", { token: rahim })).status).toBe(403);

    for (const reader of [AUDITOR, MD]) {
      const token = await login(reader);
      const list = await api("GET", "/licences?limit=100", { token });
      expect(list.status).toBe(200);
      expect(new Set(list.body.items.map((i: any) => i.branch.code)).size).toBeGreaterThan(3);
      const detail = await api("GET", `/licences/${ids.created}`, { token });
      expect(detail.status).toBe(200);
      expect(detail.body.viewer.actions).toEqual([]);
      expect((await api("PATCH", `/licences/${ids.created}`, { token, body: { name: "Edited name" } })).status).toBe(403);
      expect((await api("POST", `/licences/${ids.created}/renewal`, { token, body: { stage: "FEE_PAID" } })).status).toBe(403);
      expect((await api("POST", `/licences/${ids.created}/notes`, { token, body: { note: "Checked" } })).status).toBe(403);
      expect((await api("POST", "/admin/licences/run-alerts", { token })).status).toBe(403);
      expect((await upload(reader, `/licences/${ids.created}/document`, { data: PNG, name: "scan.png", type: "image/png" })).status).toBe(403);
    }
  });

  test("notes, and retiring a licence that is no longer required", async () => {
    const token = await login(SHIRIN);
    const noted = await api("POST", `/licences/${ids.created}/notes`, { token, body: { note: "Holding tax receipt received from the landlord." } });
    expect(noted.status).toBe(200);
    expect(noted.body.history.at(-1)).toMatchObject({ type: "NOTE_ADDED", actor: "Shirin Akhter", note: "Holding tax receipt received from the landlord." });

    const doomed = (await create(SHIRIN, { expiresAt: day(5), issuedAt: day(-300), name: "Temporary storage permit" })).body.id;
    const retired = await api("PATCH", `/licences/${doomed}`, { token, body: { active: false } });
    expect(retired.body).toMatchObject({ active: false });
    expect(retired.body.viewer.actions).toEqual(["EDIT", "UPLOAD_DOCUMENT", "ADD_NOTE"]);
    expect((await api("GET", "/licences?limit=100", { token })).body.items.some((i: any) => i.id === doomed)).toBe(false);
    expect((await api("GET", "/licences?state=RETIRED", { token })).body.items.map((i: any) => i.id)).toEqual([doomed]);
    expect((await runAlerts()).alerts.some((a) => a.id === doomed)).toBe(false);
    const renewal = await api("POST", `/licences/${doomed}/renewal`, { token, body: { stage: "DOCUMENTS_PREPARED" } });
    expect(renewal.status).toBe(409);
    expect(renewal.body.code).toBe("LICENCE_RETIRED");
    expect((await api("GET", "/admin/licences/summary", { token })).body.retired).toBe(1);
  });

  test("a licence's history cannot be altered, even with direct SQL", async () => {
    const { prisma } = await startApp();
    await expect(Promise.resolve(prisma.$executeRawUnsafe(`UPDATE "licence_events" SET "note" = 'edited' WHERE "licenceId" = '${ids.created}'`))).rejects.toThrow();
    await expect(Promise.resolve(prisma.$executeRawUnsafe(`DELETE FROM "licence_events" WHERE "licenceId" = '${ids.created}'`))).rejects.toThrow();
    expect(await prisma.licenceEvent.count({ where: { licenceId: ids.created } })).toBeGreaterThan(5);
  });

  test("seeded scans are real files: a PDF and a PNG served with the right type", async () => {
    const token = await login(SHIRIN);
    const list = (await api("GET", "/licences?limit=100", { token })).body.items as any[];
    const withScan = list.filter((i) => i.hasDocument && !i.licenceNumber.startsWith("TEST/") && !i.licenceNumber.startsWith("NCC/TL/2026/"));
    const types = new Set<string>();
    for (const row of withScan) {
      const detail = (await api("GET", `/licences/${row.id}`, { token })).body;
      if (!detail.documentUrl) continue;
      const res = await fetch(`${origin}${detail.documentUrl}`);
      expect(res.status).toBe(200);
      const head = Buffer.from(await res.arrayBuffer()).subarray(0, 8);
      const type = res.headers.get("content-type")!;
      types.add(type);
      if (type === "application/pdf") expect(head.subarray(0, 5).toString()).toBe("%PDF-");
      else expect(head[1]).toBe(0x50);
    }
    expect([...types].sort()).toEqual(["application/pdf", "image/png"]);
  });
});
