import { beforeAll, describe, expect, test } from "bun:test";
import { randomBytes } from "crypto";
import type { PrismaClient } from "@prisma/client";
import { dhakaDateStamp, maskPhone } from "@abg-dispatch/shared";
import { api, clearTokens, key, login, resetAndSeed, startApp } from "./helpers";

const FARHANA = "farhana.islam@abg.com.bd"; // Factory A employee (host)
const SHAHIN = "shahin.ahmed@abg.com.bd"; // Factory A employee
const RAHIM = "rahim@abg.com.bd"; // Head office employee
const IMRAN = "imran.hossain@abg.com.bd"; // Factory B employee
const SABINA = "sabina.yasmin@abg.com.bd"; // Factory A branch admin
const TAHMINA = "tahmina.begum@abg.com.bd"; // Factory B branch admin
const ARIF = "arif.chowdhury@abg.com.bd"; // Head office admin (every office)
const AUDITOR = "mahmuda.akter@abg.com.bd";
const NURUL = "nurul.amin@abg.com.bd"; // Security, Factory A gate
const KAMRUL = "kamrul.hasan@abg.com.bd"; // Front desk dispatch officer, Factory A
const REZAUL = "rezaul.karim@abg.com.bd"; // Security, head office reception

const isoDay = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka", year: "numeric", month: "2-digit", day: "2-digit" });
const dhakaDay = (d: Date = new Date()) => isoDay.format(d);
/** A couple of minutes from now: "today" for every test, whatever the time of day. */
const soon = () => new Date(Date.now() + 2 * 60_000).toISOString();

let prisma: PrismaClient;
const employeeId = async (code: string) => (await prisma.employee.findUniqueOrThrow({ where: { employeeCode: code } })).id;
const branchId = async (code: string) => (await prisma.branch.findUniqueOrThrow({ where: { code } })).id;

async function invite(who: string, overrides: Record<string, unknown> = {}, idempotencyKey = key("visit")) {
  return api("POST", "/visitors", {
    token: await login(who),
    headers: { "idempotency-key": idempotencyKey },
    body: { visitorName: "Rakibul Hasan", visitorPhone: "01713 665021", company: "Akij Packaging Ltd", purpose: "VENDOR_SUPPLIER", partySize: 2, expectedAt: soon(), ...overrides },
  });
}

async function invited(who: string, overrides: Record<string, unknown> = {}) {
  const res = await invite(who, overrides);
  if (res.status !== 201) throw new Error(`invite failed: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body;
}

async function notificationsFor(identifier: string) {
  return (await api("GET", "/notifications?limit=50", { token: await login(identifier) })).body.items as any[];
}

const smsTo = (phone: string) => prisma.notificationDelivery.count({ where: { channel: "SMS", target: maskPhone(phone)! } });

describe("factory visitor management", () => {
  beforeAll(async () => {
    ({ prisma } = await startApp());
    await resetAndSeed();
    clearTokens();
  });

  test("a host pre-registers a visitor: one-day pass number, QR gate pass and an SMS to the visitor", async () => {
    const smsBefore = await smsTo("01713665021");
    const expectedAt = soon();
    const res = await invite(FARHANA, { expectedAt, carrying: "Carton samples", purposeDetail: "Corrugated carton sample approval" });
    expect(res.status).toBe(201);
    const v = res.body;
    const stamp = dhakaDateStamp(new Date(expectedAt));
    expect(v.passNumber).toMatch(new RegExp(`^VP-${stamp}-FCA-\\d{3}$`));
    expect(v).toMatchObject({ status: "EXPECTED", walkIn: false, visitorPhone: "01713665021", partySize: 2, branch: { code: "FCA" }, host: { name: "Farhana Islam" } });
    expect(v.pass.payload).toMatch(/\/g\/v\/[A-Za-z0-9_-]{32}$/);
    expect(v.pass.payload.endsWith(v.pass.token)).toBe(true);
    expect(v.viewer).toMatchObject({ isHost: true, canManage: false, actions: ["CANCEL"] });

    // The office's VP counter continues after the seeded passes.
    const sameDay = await prisma.visit.count({ where: { passNumber: { startsWith: `VP-${stamp}-FCA-` } } });
    expect(Number(v.passNumber.slice(-3))).toBe(sameDay);
    expect(await smsTo("01713665021")).toBe(smsBefore + 1);

    const mine = await api("GET", "/visitors/mine?scope=upcoming", { token: await login(FARHANA) });
    expect(mine.body.items.some((i: any) => i.id === v.id && i.isHost && i.actions.includes("CANCEL"))).toBe(true);
  });

  test("the gate verifies the pass, checks the visitor in (host told) and out", async () => {
    const v = await invited(FARHANA, { visitorName: "Shamim Ahmed", company: "Pran Packaging" });
    const nurul = await login(NURUL);

    const pass = await api("GET", `/visitors/passes/${v.pass.token}`, { token: nurul });
    expect(pass.status).toBe(200);
    expect(pass.body).toMatchObject({ passNumber: v.passNumber, status: "EXPECTED", valid: true, allowed: ["CHECK_IN"], visitor: { name: "Shamim Ahmed", company: "Pran Packaging", phone: "01713665021" }, host: { name: "Farhana Islam" }, branch: { code: "FCA" } });
    expect(pass.body.warnings.filter((w: any) => w.blocking)).toEqual([]);

    const typed = await api("GET", `/visitors/passes/by-number/${encodeURIComponent(v.passNumber.toLowerCase().replace(/-/g, " "))}`, { token: nurul });
    expect(typed.status).toBe(200);
    expect(typed.body.token).toBe(v.pass.token);

    const inRes = await api("POST", `/visitors/passes/${v.pass.token}/check-in`, { token: nurul, body: { badgeNumber: "FCA-V21" } });
    expect(inRes.status).toBe(200);
    expect(inRes.body).toMatchObject({ status: "CHECKED_IN", allowed: ["CHECK_OUT"], badgeNumber: "FCA-V21" });
    expect(inRes.body.checkInPoint).toContain("Security Gate");

    const arrived = (await notificationsFor(FARHANA)).find((n) => n.data?.objectId === v.id && n.eventType === "VISITOR_ARRIVED");
    expect(arrived).toBeTruthy();
    expect(arrived.title).toBe("Shamim Ahmed has arrived");
    expect(arrived.body).toContain("Security Gate");
    expect(arrived.data.route).toBe(`/visitors/${v.id}`);

    const seen = await api("GET", `/visitors/${v.id}`, { token: await login(FARHANA) });
    expect(seen.body).toMatchObject({ status: "CHECKED_IN", checkedInBy: "Nurul Amin", badgeNumber: "FCA-V21" });

    const out = await api("POST", `/visitors/${v.id}/check-out`, { token: await login(KAMRUL) });
    expect(out.status).toBe(200);
    expect(out.body).toMatchObject({ status: "CHECKED_OUT", checkedOutBy: "Kamrul Hasan" });
    expect(out.body.onSiteMinutes).toBeGreaterThanOrEqual(0);
    expect((await notificationsFor(FARHANA)).some((n) => n.data?.objectId === v.id && n.eventType === "VISITOR_LEFT")).toBe(true);

    const again = await api("POST", `/visitors/${v.id}/check-out`, { token: nurul });
    expect(again.status).toBe(409);
    expect(again.body.code).toBe("VISIT_STATE_CONFLICT");
    const used = await api("GET", `/visitors/passes/${v.pass.token}`, { token: nurul });
    expect(used.body.allowed).toEqual([]);
    expect(used.body.warnings.map((w: any) => w.code)).toContain("ALREADY_OUT");

    const audit = await prisma.auditLog.findMany({ where: { objectType: "visit", objectId: v.id }, orderBy: { createdAt: "asc" } });
    expect(audit.map((a) => a.action)).toEqual(["visit.checked_in", "visit.checked_out"]);
  });

  test("the gate registers a walk-in, checked in at once, and the host is told they are at the gate", async () => {
    const nurul = await login(NURUL);
    const res = await api("POST", "/visitors/walk-in", {
      token: nurul,
      headers: { "idempotency-key": key("walk") },
      body: { visitorName: "Selim Mia", visitorPhone: "+880 1912-347785", company: "Sundarban Courier Service", purpose: "DELIVERY", carrying: "3 cartons", hostEmployeeId: await employeeId("ABG-7310"), badgeNumber: "FCA-V30" },
    });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ status: "CHECKED_IN", walkIn: true, visitorPhone: "01912347785", badgeNumber: "FCA-V30", host: { name: "Shahin Ahmed" }, checkedInBy: "Nurul Amin" });
    expect(res.body.viewer.actions).toEqual(["CHECK_OUT"]);
    const told = (await notificationsFor(SHAHIN)).find((n) => n.data?.objectId === res.body.id);
    expect(told).toMatchObject({ eventType: "VISITOR_AT_GATE", category: "ACTION_REQUIRED", title: "Your visitor Selim Mia is at the gate" });

    // A host who is not in the app: the name is kept, nobody to notify.
    const named = await api("POST", "/visitors/walk-in", { token: nurul, body: { visitorName: "Rokeya Begum", visitorPhone: "01811000222", purpose: "PERSONAL", hostName: "Monir Hossain" } });
    expect(named.status).toBe(201);
    expect(named.body.host).toMatchObject({ userId: null, name: "Monir Hossain" });

    const noHost = await api("POST", "/visitors/walk-in", { token: nurul, body: { visitorName: "Nobody Waiting", visitorPhone: "01811000333", purpose: "OTHER" } });
    expect(noHost.status).toBe(400);
    expect(noHost.body.code).toBe("HOST_REQUIRED");

    const notGate = await api("POST", "/visitors/walk-in", { token: await login(FARHANA), body: { visitorName: "Someone", visitorPhone: "01811000444", purpose: "OTHER", hostName: "Farhana Islam" } });
    expect(notGate.status).toBe(403);

    const elsewhere = await api("POST", "/visitors/walk-in", { token: nurul, body: { visitorName: "Someone", visitorPhone: "01811000555", purpose: "OTHER", hostName: "Md. Rahim", branchId: await branchId("HO") } });
    expect(elsewhere.status).toBe(403);
    expect(elsewhere.body.code).toBe("OUT_OF_SCOPE");
  });

  test("security is office-scoped: the Factory A gate cannot check in a head office visitor", async () => {
    const v = await invited(RAHIM, { visitorName: "Sharmin Chowdhury", company: "Dutch-Bangla Bank PLC", purpose: "MEETING", visitorPhone: "01713046678", partySize: 1 });
    expect(v.branch.code).toBe("HO");
    const nurul = await login(NURUL);

    expect((await api("GET", `/visitors/${v.id}`, { token: nurul })).status).toBe(404);
    const byId = await api("POST", `/visitors/${v.id}/check-in`, { token: nurul, body: {} });
    expect(byId.status).toBe(404);
    expect(byId.body.code).toBe("VISIT_NOT_FOUND");

    // Scanning another office's pass tells the guard where to send the visitor, and nothing more.
    const scanned = await api("GET", `/visitors/passes/${v.pass.token}`, { token: nurul });
    expect(scanned.status).toBe(200);
    expect(scanned.body).toMatchObject({ valid: false, allowed: [], token: null, visitId: null, branch: { code: "HO" } });
    expect(scanned.body.warnings[0]).toMatchObject({ code: "WRONG_OFFICE", blocking: true });
    expect(scanned.body.visitor.phone).not.toBe("01713046678");
    const refused = await api("POST", `/visitors/passes/${v.pass.token}/check-in`, { token: nurul, body: {} });
    expect(refused.status).toBe(403);
    expect(refused.body.code).toBe("WRONG_OFFICE");
    expect((await api("GET", `/visitors/passes/by-number/${v.passNumber}`, { token: nurul })).status).toBe(404);

    const rezaul = await login(REZAUL);
    expect((await api("GET", `/visitors/passes/${v.pass.token}`, { token: rezaul })).body.allowed).toEqual(["CHECK_IN"]);
    const ok = await api("POST", `/visitors/passes/${v.pass.token}/check-in`, { token: rezaul, body: {} });
    expect(ok.status).toBe(200);
    expect(ok.body.checkInPoint).toContain("Reception");

    const board = await api("GET", "/admin/visitors?status=ALL&limit=100", { token: nurul });
    expect(board.status).toBe(200);
    expect(board.body.items.length).toBeGreaterThan(0);
    expect(board.body.items.every((i: any) => i.branch.code === "FCA")).toBe(true);
  });

  test("only the host and the office's visitor staff can see a visit; everyone else gets 404", async () => {
    const v = await invited(FARHANA, { visitorName: "Tanvir Alam", company: "Rahimafrooz Batteries Ltd", visitorPhone: "01716093341" });
    const path = `/visitors/${v.id}`;
    for (const outsider of [RAHIM, SHAHIN, TAHMINA, REZAUL]) {
      const res = await api("GET", path, { token: await login(outsider) });
      expect(res.status).toBe(404);
      expect(res.body.code).toBe("VISIT_NOT_FOUND");
    }
    const sabina = await api("GET", path, { token: await login(SABINA) });
    expect(sabina.status).toBe(200);
    expect(sabina.body.viewer).toMatchObject({ isStaff: true, canManage: true });
    expect(sabina.body.viewer.actions).toEqual(["CHECK_IN", "CANCEL"]);
    expect(sabina.body.pass).toBeTruthy();
    expect((await api("GET", path, { token: await login(ARIF) })).status).toBe(200);

    // Auditors read, but get no gate pass and only a masked phone number.
    const audit = await api("GET", path, { token: await login(AUDITOR) });
    expect(audit.status).toBe(200);
    expect(audit.body.pass).toBeNull();
    expect(audit.body.visitorPhone).toBe(maskPhone("01716093341"));
    expect(audit.body.viewer.actions).toEqual([]);

    const rahim = await login(RAHIM);
    expect((await api("GET", "/admin/visitors", { token: rahim })).status).toBe(403);
    expect((await api("GET", "/admin/visitors/summary", { token: rahim })).status).toBe(403);
    expect((await api("GET", `/visitors/passes/${v.pass.token}`, { token: rahim })).status).toBe(403);
    expect((await api("GET", `/visitors/${crypto.randomUUID()}`, { token: rahim })).status).toBe(404);
    expect((await api("GET", "/visitors/not-a-uuid", { token: rahim })).status).toBe(404);
  });

  test("cancelling: the host or the gate, only while the visitor is expected", async () => {
    const v = await invited(FARHANA, { visitorName: "Kamal Uddin", company: "Partex Cables Ltd", visitorPhone: "01819450372" });
    const smsBefore = await smsTo("01819450372");
    expect((await api("POST", `/visitors/${v.id}/cancel`, { token: await login(SHAHIN), body: {} })).status).toBe(404);
    expect((await api("POST", `/visitors/${v.id}/cancel`, { token: await login(AUDITOR), body: {} })).status).toBe(403);

    const farhana = await login(FARHANA);
    const cancelled = await api("POST", `/visitors/${v.id}/cancel`, { token: farhana, body: { reason: "Supplier rescheduled to next week." } });
    expect(cancelled.status).toBe(200);
    expect(cancelled.body).toMatchObject({ status: "CANCELLED", cancelledBy: "Farhana Islam", cancelReason: "Supplier rescheduled to next week." });
    expect(cancelled.body.viewer.actions).toEqual([]);
    expect(await smsTo("01819450372")).toBe(smsBefore + 1);

    const twice = await api("POST", `/visitors/${v.id}/cancel`, { token: farhana, body: {} });
    expect(twice.status).toBe(409);
    expect(twice.body.code).toBe("VISIT_STATE_CONFLICT");
    const nurul = await login(NURUL);
    expect((await api("POST", `/visitors/${v.id}/check-in`, { token: nurul, body: {} })).status).toBe(409);
    const scanned = await api("GET", `/visitors/passes/${v.pass.token}`, { token: nurul });
    expect(scanned.body.allowed).toEqual([]);
    expect(scanned.body.warnings[0]).toMatchObject({ code: "CANCELLED", blocking: true });

    // The branch admin can cancel too; the host is told and it is audited.
    const other = await invited(FARHANA, { visitorName: "Delwar Hossain", company: "Confidence Cement PLC" });
    const bySabina = await api("POST", `/visitors/${other.id}/cancel`, { token: await login(SABINA), body: { reason: "Factory closed for the audit." } });
    expect(bySabina.status).toBe(200);
    expect((await notificationsFor(FARHANA)).find((n) => n.data?.objectId === other.id)).toMatchObject({ eventType: "VISIT_CANCELLED" });
    expect(await prisma.auditLog.count({ where: { objectId: other.id, action: "visit.cancelled" } })).toBe(1);

    // Once the visitor is in, the pass can no longer be cancelled.
    const inside = await invited(FARHANA, { visitorName: "Nasir Uddin Bhuiyan" });
    await api("POST", `/visitors/${inside.id}/check-in`, { token: nurul, body: {} });
    const late = await api("POST", `/visitors/${inside.id}/cancel`, { token: farhana, body: {} });
    expect(late.status).toBe(409);
  });

  test("status changes follow the rules, and two guards cannot check in the same visitor", async () => {
    const nurul = await login(NURUL);
    const v = await invited(FARHANA, { visitorName: "Faruk Hossain", company: "KDS Accessories Ltd" });
    const early = await api("POST", `/visitors/${v.id}/check-out`, { token: nurul });
    expect(early.status).toBe(409);
    expect(early.body.message).toContain("not been checked in");

    const [a, b] = await Promise.all([
      api("POST", `/visitors/${v.id}/check-in`, { token: nurul, body: { badgeNumber: "FCA-V40" } }),
      api("POST", `/visitors/passes/${v.pass.token}/check-in`, { token: await login(KAMRUL), body: { badgeNumber: "FCA-V41" } }),
    ]);
    expect([a.status, b.status].sort()).toEqual([200, 409]);
    expect([a.body.code, b.body.code]).toContain("VISIT_STATE_CONFLICT");

    // A pass for another day cannot be used today.
    const later = await invited(FARHANA, { visitorName: "Engr. Saidur Rahman", expectedAt: new Date(Date.now() + 2 * 86_400_000).toISOString() });
    const scanned = await api("GET", `/visitors/passes/${later.pass.token}`, { token: nurul });
    expect(scanned.body.allowed).toEqual([]);
    expect(scanned.body.warnings.map((w: any) => w.code)).toContain("WRONG_DAY");
    const wrongDay = await api("POST", `/visitors/${later.id}/check-in`, { token: nurul, body: {} });
    expect(wrongDay.status).toBe(409);
    expect(wrongDay.body.code).toBe("VISIT_WRONG_DAY");
    expect((await api("GET", `/visitors/${later.id}`, { token: await login(SABINA) })).body.viewer.actions).toEqual(["CANCEL"]);
  });

  test("forged and malformed pass tokens are refused", async () => {
    const nurul = await login(NURUL);
    const forged = randomBytes(24).toString("base64url");
    const res = await api("GET", `/visitors/passes/${forged}`, { token: nurul });
    expect(res.status).toBe(404);
    expect(res.body.code).toBe("PASS_NOT_FOUND");
    expect((await api("POST", `/visitors/passes/${forged}/check-in`, { token: nurul, body: {} })).status).toBe(404);
    expect((await api("GET", "/visitors/passes/short", { token: nurul })).status).toBe(404);

    const real = await invited(FARHANA, { visitorName: "Abdul Mannan" });
    const tampered = real.pass.token.slice(0, -1) + (real.pass.token.endsWith("A") ? "B" : "A");
    expect((await api("GET", `/visitors/passes/${tampered}`, { token: nurul })).status).toBe(404);
    expect((await api("GET", "/visitors/passes/by-number/VP-991231-FCA-001", { token: nurul })).status).toBe(404);
    expect((await api("GET", "/visitors/passes/by-number/hello", { token: nurul })).status).toBe(404);
  });

  test("passes not used by the end of their Dhaka day expire", async () => {
    const yesterday = new Date(Date.now() - 86_400_000);
    const fca = await branchId("FCA");
    const farhanaUser = await prisma.user.findFirstOrThrow({ where: { email: FARHANA } });
    const stale = await prisma.visit.create({
      data: {
        passNumber: `VP-${dhakaDateStamp(yesterday)}-FCA-900`,
        passToken: randomBytes(24).toString("base64url"),
        visitorName: "Sharif Ahmed",
        visitorPhone: "01711000900",
        purpose: "VENDOR_SUPPLIER",
        branchId: fca,
        hostUserId: farhanaUser.id,
        hostName: "Farhana Islam",
        expectedAt: yesterday,
        status: "EXPECTED",
        createdById: farhanaUser.id,
      },
    });
    const upcoming = await invited(FARHANA, { visitorName: "Mahmudul Hasan" });

    const list = await api("GET", `/admin/visitors?date=${dhakaDay(yesterday)}&status=EXPIRED&limit=100`, { token: await login(NURUL) });
    expect(list.status).toBe(200);
    expect(list.body.items.map((i: any) => i.id)).toContain(stale.id);

    const row = await prisma.visit.findUniqueOrThrow({ where: { id: stale.id } });
    expect(row.status).toBe("EXPIRED");
    // Stamped with the Dhaka midnight that ended its day.
    expect(row.expiredAt!.getTime()).toBe(new Date(`${dhakaDay()}T00:00:00+06:00`).getTime());

    const scanned = await api("GET", `/visitors/passes/${stale.passToken}`, { token: await login(NURUL) });
    expect(scanned.body).toMatchObject({ status: "EXPIRED", allowed: [] });
    expect(scanned.body.warnings[0].code).toBe("EXPIRED");
    expect((await api("POST", `/visitors/${stale.id}/check-in`, { token: await login(NURUL), body: {} })).status).toBe(409);
    expect((await prisma.visit.findUniqueOrThrow({ where: { id: upcoming.id } })).status).toBe("EXPECTED");
  });

  test("the summary counts today's board for the office", async () => {
    const tahmina = await login(TAHMINA);
    const fcb = await branchId("FCB");
    const empty = await api("GET", `/admin/visitors/summary?branchId=${fcb}`, { token: tahmina });
    expect(empty.status).toBe(200);
    expect(empty.body).toMatchObject({ onSiteNow: 0, expectedToday: 0, checkedOutToday: 0, walkInsToday: 0, visitsToday: 0, longestOnSite: null });

    const meeting = await invited(IMRAN, { visitorName: "Raihan Kabir", company: "KPMG Bangladesh", purpose: "MEETING", partySize: 2 });
    const vendor = await invited(IMRAN, { visitorName: "Sharif Ahmed", company: "Bengal Plastics Ltd", purpose: "VENDOR_SUPPLIER", partySize: 1 });
    await invited(IMRAN, { visitorName: "Tasnim Ferdous", purpose: "INTERVIEW", company: null, partySize: 1 });
    expect(meeting.branch.code).toBe("FCB");
    expect((await api("POST", `/visitors/${meeting.id}/check-in`, { token: tahmina, body: {} })).status).toBe(200);
    expect((await api("POST", `/visitors/${vendor.id}/check-in`, { token: tahmina, body: {} })).status).toBe(200);
    expect((await api("POST", `/visitors/${vendor.id}/check-out`, { token: tahmina })).status).toBe(200);
    const walk = await api("POST", "/visitors/walk-in", { token: tahmina, body: { visitorName: "Jewel Rana", visitorPhone: "01911000777", company: "Pathao Courier", purpose: "DELIVERY", hostEmployeeId: await employeeId("ABG-7420") } });
    expect(walk.status).toBe(201);
    expect((await notificationsFor(IMRAN)).some((n) => n.data?.objectId === walk.body.id && n.eventType === "VISITOR_AT_GATE")).toBe(true);

    const s = (await api("GET", `/admin/visitors/summary?branchId=${fcb}`, { token: tahmina })).body;
    expect(s).toMatchObject({ onSiteNow: 2, peopleOnSite: 3, expectedToday: 1, checkedOutToday: 1, walkInsToday: 1, visitsToday: 3 });
    expect(s.byPurposeToday).toMatchObject({ MEETING: 1, VENDOR_SUPPLIER: 1, DELIVERY: 1, INTERVIEW: 0, CONTRACTOR: 0 });
    expect(s.last7Days).toHaveLength(7);
    expect(s.last7Days[6]).toEqual({ day: dhakaDay(), visits: 3 });
    expect(s.last7Days.slice(0, 6).every((d: any) => d.visits === 0)).toBe(true);
    expect(s.longestOnSite).toMatchObject({ id: meeting.id, visitorName: "Raihan Kabir" });
    // A branch admin's summary covers only their offices.
    expect((await api("GET", "/admin/visitors/summary", { token: tahmina })).body.visitsToday).toBe(3);

    // Factory A, with the seeded board: the boiler contractor has been on site the longest.
    const fca = (await api("GET", "/admin/visitors/summary", { token: await login(SABINA) })).body;
    expect(fca.longestOnSite.visitorName).toBe("Engr. Alamgir Kabir");
    const onSite = await api("GET", "/admin/visitors?status=CHECKED_IN&limit=100", { token: await login(SABINA) });
    expect(onSite.body.items).toHaveLength(fca.onSiteNow);
    expect(onSite.body.items[0].visitorName).toBe("Engr. Alamgir Kabir");
    expect(onSite.body.items.every((i: any) => i.actions.includes("CHECK_OUT"))).toBe(true);

    // Head office sees the whole group, with a week of seeded history.
    const all = (await api("GET", "/admin/visitors/summary", { token: await login(ARIF) })).body;
    expect(all.last7Days.slice(0, 6).every((d: any) => d.visits > 0)).toBe(true);
    expect(all.onSiteNow).toBeGreaterThanOrEqual(fca.onSiteNow + 2);
  });

  test("creating a visit is idempotent", async () => {
    const k = key("same");
    const body = { visitorName: "Nafis Iqbal", visitorPhone: "01755000111", company: "A. Qasem & Co.", purpose: "MEETING", expectedAt: soon() };
    const farhana = await login(FARHANA);
    const first = await api("POST", "/visitors", { token: farhana, body, headers: { "idempotency-key": k } });
    const second = await api("POST", "/visitors", { token: farhana, body, headers: { "idempotency-key": k } });
    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(second.headers.get("idempotent-replay")).toBe("true");
    expect(second.body.id).toBe(first.body.id);
    expect(await prisma.visit.count({ where: { visitorName: "Nafis Iqbal" } })).toBe(1);
    expect(await smsTo("01755000111")).toBe(1);

    const changed = await api("POST", "/visitors", { token: farhana, body: { ...body, partySize: 3 }, headers: { "idempotency-key": k } });
    expect(changed.status).toBe(409);
    expect(changed.body.code).toBe("IDEMPOTENCY_MISMATCH");
  });

  test("phone numbers, ID digits and times are validated", async () => {
    const bad = async (overrides: Record<string, unknown>) => {
      const res = await invite(FARHANA, overrides);
      expect(res.status).toBe(400);
      return res.body;
    };
    expect((await bad({ visitorPhone: "12345" })).message).toContain("Bangladeshi mobile");
    await bad({ visitorPhone: "01211223344" });
    expect((await bad({ idLast4: "12" })).message).toContain("last 4 digits");
    expect((await bad({ idLast4: "1990123456789" })).message).toContain("never the full number");
    expect((await bad({ nationalId: "19901234567890123" })).code).toBe("VALIDATION");
    expect((await bad({ expectedAt: new Date(Date.now() - 2 * 3_600_000).toISOString() })).code).toBe("TIME_IN_PAST");
    const at = new Date(Date.now() + 3_600_000);
    expect((await bad({ expectedAt: at.toISOString(), expectedUntil: new Date(at.getTime() - 60_000).toISOString() })).code).toBe("WINDOW_INVALID");
    await bad({ partySize: 21 });
    await bad({ purpose: "PICNIC" });
    const hoGate = await prisma.location.findFirstOrThrow({ where: { branch: { code: "HO" }, type: "GATE" } });
    expect((await bad({ locationId: hoGate.id })).code).toBe("LOCATION_INVALID");

    const ok = await invite(FARHANA, { visitorName: "Mashrafi Hasan", visitorPhone: "+880 1711-223344", idLast4: "5a7z" });
    expect(ok.status).toBe(201);
    expect(ok.body).toMatchObject({ visitorPhone: "01711223344", idLast4: "5A7Z" });
  });

  test("full national ID numbers are never stored", async () => {
    const fullIds = ["1990123456789", "19901234567890123"];
    for (const id of fullIds) expect((await invite(FARHANA, { idLast4: id, visitorName: "Nazia Sultana Prova" })).status).toBe(400);
    expect((await invite(FARHANA, { nationalId: fullIds[1], visitorName: "Nazia Sultana Prova" })).status).toBe(400);
    const stored = JSON.stringify([
      await prisma.visit.findMany(),
      await prisma.auditLog.findMany({ where: { objectType: "visit" } }),
      await prisma.idempotencyRecord.findMany(),
      await prisma.notification.findMany(),
    ]);
    for (const id of fullIds) expect(stored).not.toContain(id);
    expect(await prisma.visit.count({ where: { visitorName: "Nazia Sultana Prova" } })).toBe(0);

    // Even a direct write is stopped by the database.
    const farhanaUser = await prisma.user.findFirstOrThrow({ where: { email: FARHANA } });
    let refused = false;
    try {
      await prisma.visit.create({
        data: { passNumber: "VP-261021-FCA-999", passToken: randomBytes(24).toString("base64url"), visitorName: "Direct Write", visitorPhone: "01711000999", idLast4: fullIds[0], purpose: "OTHER", branchId: await branchId("FCA"), hostName: "Farhana Islam", expectedAt: new Date(), createdById: farhanaUser.id },
      });
    } catch (err) {
      refused = String(err).includes("visit_id_last4_check");
    }
    expect(refused).toBe(true);
  });

  test("the board filters by status, purpose, search and day, and pages with a cursor", async () => {
    const sabina = await login(SABINA);
    const expected = await api("GET", "/admin/visitors?status=EXPECTED&limit=100", { token: sabina });
    const times = expected.body.items.map((i: any) => new Date(i.expectedAt).getTime());
    expect(times).toEqual([...times].sort((a, b) => a - b));
    expect(expected.body.items.every((i: any) => i.status === "EXPECTED" && dhakaDay(new Date(i.expectedAt)) === dhakaDay())).toBe(true);
    expect(expected.body.items.every((i: any) => i.actions.includes("CHECK_IN") && i.actions.includes("CANCEL"))).toBe(true);

    const akij = await api("GET", "/admin/visitors?status=ALL&q=Akij&limit=100", { token: sabina });
    expect(akij.body.items.length).toBeGreaterThan(0);
    expect(akij.body.items.every((i: any) => i.company === "Akij Packaging Ltd")).toBe(true);

    const audits = await api("GET", "/admin/visitors?status=ALL&purpose=AUDIT_INSPECTION&limit=100", { token: sabina });
    expect(audits.body.items.length).toBeGreaterThan(0);
    expect(audits.body.items.every((i: any) => i.purpose === "AUDIT_INSPECTION")).toBe(true);

    const lastWeek = dhakaDay(new Date(Date.now() - 3 * 86_400_000));
    const history = await api("GET", `/admin/visitors?status=CHECKED_OUT&date=${lastWeek}&limit=100`, { token: sabina });
    expect(history.body.items.length).toBeGreaterThan(0);
    expect(history.body.items.every((i: any) => i.actions.length === 0)).toBe(true);

    const first = await api("GET", "/admin/visitors?status=ALL&limit=3", { token: sabina });
    expect(first.body.items).toHaveLength(3);
    expect(first.body.nextCursor).toBeTruthy();
    const second = await api("GET", `/admin/visitors?status=ALL&limit=3&cursor=${first.body.nextCursor}`, { token: sabina });
    const ids = new Set(first.body.items.map((i: any) => i.id));
    expect(second.body.items.length).toBeGreaterThan(0);
    expect(second.body.items.some((i: any) => ids.has(i.id))).toBe(false);

    const past = await api("GET", "/visitors/mine?scope=past", { token: await login(FARHANA) });
    const statuses = new Set(past.body.items.map((i: any) => i.status));
    expect(statuses.has("CANCELLED")).toBe(true);
    expect(statuses.has("CHECKED_OUT")).toBe(true);
    expect([...statuses].every((s) => ["CHECKED_OUT", "CANCELLED", "EXPIRED"].includes(s as string))).toBe(true);
  });
});
