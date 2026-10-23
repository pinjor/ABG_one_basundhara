import { beforeAll, describe, expect, test } from "bun:test";
import { countLeaveDays } from "@abg-dispatch/shared";
import { api, clearTokens, key, login, resetAndSeed, startApp } from "./helpers";

const RAHIM = "rahim@abg.com.bd"; // HO Legal; manager Farid Uddin
const FARID = "farid.uddin@abg.com.bd"; // Executive Director, head of department
const NUSRAT = "nusrat.jahan@abg.com.bd"; // HR & Finance
const SADIA = "sadia.rahman@abg.com.bd"; // HR & Finance; Laila's manager
const LAILA = "laila.rahman@abg.com.bd"; // Dhaka Branch HR; manager Sadia
const JAMAL = "jamal.uddin@abg.com.bd"; // Corporate Office; manager Farid
const KAMRUL = "kamrul.hasan@abg.com.bd"; // Factory A; manager Sabina
const SHAHIN = "shahin.ahmed@abg.com.bd"; // Factory A; on sick leave today
const IMRAN = "imran.hossain@abg.com.bd"; // Factory B
const TAHMINA = "tahmina.begum@abg.com.bd"; // Factory B branch admin
const KARIM = "karim.ahmed@abg.com.bd"; // covers for Tanvir
const ARIF = "arif.chowdhury@abg.com.bd"; // Head office admin
const AUDITOR = "mahmuda.akter@abg.com.bd";

const dhakaIso = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka", year: "numeric", month: "2-digit", day: "2-digit" });
const today = () => dhakaIso.format(new Date());
const shift = (d: string, n: number) => new Date(Date.parse(`${d}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

let weekendDays: number[] = [5];
let holidays: string[] = [];
const working = (d: string) => !weekendDays.includes(new Date(`${d}T00:00:00Z`).getUTCDay()) && !holidays.includes(d);

/** `length` working days starting at the first working day on or after today + `offset`. */
function span(offset: number, length: number): { startDate: string; endDate: string } {
  let start = shift(today(), offset);
  while (!working(start)) start = shift(start, 1);
  let end = start;
  for (let n = 1; n < length; ) {
    end = shift(end, 1);
    if (working(end)) n += 1;
  }
  return { startDate: start, endDate: end };
}

async function apply(identifier: string, body: Record<string, unknown>) {
  return api("POST", "/leave", { token: await login(identifier), body, headers: { "idempotency-key": key("leave") } });
}

async function decide(identifier: string, id: string, body: Record<string, unknown>) {
  return api("POST", `/leave/${id}/decision`, { token: await login(identifier), body });
}

async function balance(identifier: string, type: string) {
  const res = await api("GET", "/leave/balance", { token: await login(identifier) });
  return (res.body.balances as any[]).find((b) => b.type === type);
}

async function notificationsFor(identifier: string, leaveId: string) {
  const items = (await api("GET", "/notifications?limit=100", { token: await login(identifier) })).body.items as any[];
  return items.filter((n) => n.data?.objectId === leaveId);
}

describe("leave", () => {
  beforeAll(async () => {
    await startApp();
    await resetAndSeed();
    clearTokens();
    const settings = (await api("GET", "/leave/calendar-settings", { token: await login(RAHIM) })).body;
    weekendDays = settings.weekendDays;
    holidays = settings.holidays.map((h: any) => h.date);
  });

  test("an application goes head of department → HR → approved, counting working days and spending the balance", async () => {
    const { prisma } = await startApp();
    const dates = span(7, 3);
    const year = Number(dates.startDate.slice(0, 4));
    const seeded = await prisma.leaveRequest.count({ where: { year } });
    const before = await balance(RAHIM, "EARNED");
    expect(before.entitled).toBe(22); // HR's carried-forward entitlement

    const res = await apply(RAHIM, { type: "EARNED", ...dates, reason: "Visiting family in Rangpur", addressDuringLeave: "Rangpur Sadar" });
    expect(res.status).toBe(201);
    const leave = res.body;
    expect(leave.referenceNumber).toBe(`ABG-LV-${year}-${String(seeded + 1).padStart(3, "0")}`);
    expect(leave).toMatchObject({ status: "PENDING_HOD", awaiting: "HOD", type: "EARNED", days: 3, reason: "Visiting family in Rangpur" });
    expect(leave.approver.name).toBe("Farid Uddin"); // defaulted to the line manager
    expect(leave.pipeline.map((p: any) => p.key)).toEqual(["SUBMITTED", "PENDING_HOD", "PENDING_HR", "APPROVED"]);
    expect(leave.balance.pending).toBe(before.pending + 3);
    expect(leave.viewer.actions).toContain("CANCEL");
    expect(leave.viewer.actions).not.toContain("APPROVE");

    const toFarid = await notificationsFor(FARID, leave.id);
    expect(toFarid[0]).toMatchObject({ eventType: "LEAVE_SUBMITTED", category: "ACTION_REQUIRED", data: { route: `/leave/${leave.id}`, module: "leave" } });
    expect((await api("GET", "/leave/approvals", { token: await login(FARID) })).body.items.map((i: any) => i.id)).toContain(leave.id);

    // The applicant cannot approve their own leave.
    expect((await decide(RAHIM, leave.id, { decision: "APPROVE" })).body.code).toBe("OWN_REQUEST");
    // HR cannot jump the head of department.
    expect((await decide(NUSRAT, leave.id, { decision: "APPROVE" })).body.code).toBe("NOT_YOUR_STAGE");

    const hod = await decide(FARID, leave.id, { decision: "APPROVE", note: "Enjoy the break." });
    expect(hod.status).toBe(200);
    expect(hod.body).toMatchObject({ status: "PENDING_HR", awaiting: "HR" });
    expect((await notificationsFor(NUSRAT, leave.id)).map((n) => n.eventType)).toContain("LEAVE_APPROVAL_REQUIRED");
    expect((await notificationsFor(SADIA, leave.id)).map((n) => n.eventType)).toContain("LEAVE_APPROVAL_REQUIRED");
    // Too late for the head of department now.
    expect((await decide(FARID, leave.id, { decision: "APPROVE" })).body.code).toBe("LEAVE_STATE_CONFLICT");

    const hr = await decide(NUSRAT, leave.id, { decision: "APPROVE" });
    expect(hr.body).toMatchObject({ status: "APPROVED", awaiting: null });
    expect(hr.body.pipeline.every((p: any) => p.state === "done")).toBe(true);
    const after = await balance(RAHIM, "EARNED");
    expect(after.used).toBe(before.used + 3);
    expect(after.available).toBe(before.available - 3);
    expect((await notificationsFor(RAHIM, leave.id)).map((n) => n.title)).toContain("Leave approved");
    // HR approvals are audited.
    const log = await prisma.auditLog.findFirst({ where: { objectId: leave.id, action: "leave.approved" } });
    expect(log?.actorName).toBe("Nusrat Jahan");
  });

  test("whoever approved as head of department cannot also give the HR approval", async () => {
    const res = await apply(LAILA, { type: "CASUAL", ...span(2, 1), reason: "Personal errand at the passport office" });
    expect(res.status).toBe(201);
    const id = res.body.id;
    expect((await decide(SADIA, id, { decision: "APPROVE" })).body.status).toBe("PENDING_HR");
    const blocked = await decide(SADIA, id, { decision: "APPROVE" });
    expect(blocked.status).toBe(403);
    expect(blocked.body.code).toBe("SEPARATION_OF_DUTIES");
    expect((await api("GET", `/leave/${id}`, { token: await login(SADIA) })).body.viewer.blockedReason).toBe("SEPARATION_OF_DUTIES");
    expect((await api("GET", "/leave/approvals", { token: await login(SADIA) })).body.items.map((i: any) => i.id)).not.toContain(id);
    expect((await decide(NUSRAT, id, { decision: "APPROVE" })).body.status).toBe("APPROVED");
  });

  test("rejecting needs a reason, and the applicant is told", async () => {
    const res = await apply(KAMRUL, { type: "CASUAL", ...span(20, 1), reason: "Family event" });
    const id = res.body.id;
    const sabina = "sabina.yasmin@abg.com.bd";
    expect((await decide(sabina, id, { decision: "REJECT" })).body.code).toBe("REASON_REQUIRED");
    const rejected = await decide(sabina, id, { decision: "REJECT", note: "Stock count that day — choose another date." });
    expect(rejected.body).toMatchObject({ status: "REJECTED", statusNote: "Stock count that day — choose another date." });
    expect(rejected.body.pipeline.find((p: any) => p.key === "PENDING_HOD").state).toBe("rejected");
    expect((await notificationsFor(KAMRUL, id)).map((n) => n.title)).toContain("Leave not approved");
  });

  test("the policy rules: notice, back-dating, half days, holidays, the per-application cap and the balance", async () => {
    const codes = async (identifier: string, body: Record<string, unknown>) => (await apply(identifier, body)).body.code;
    // Earned leave needs three days' notice; sick leave may go back a week, not more.
    expect(await codes(RAHIM, { type: "EARNED", startDate: today(), endDate: today(), reason: "Short notice" })).toBe("NOTICE_TOO_SHORT");
    expect(await codes(RAHIM, { type: "SICK", startDate: shift(today(), -10), endDate: shift(today(), -9), reason: "Flu last week" })).toBe("START_TOO_EARLY");
    // Half days: one day only, and not for earned leave.
    const one = span(30, 1);
    expect(await codes(KAMRUL, { type: "EARNED", ...span(30, 1), halfDay: "FIRST_HALF", reason: "Half a day off" })).toBe("HALF_DAY_NOT_ALLOWED");
    expect(await codes(KAMRUL, { type: "CASUAL", ...span(30, 2), halfDay: "FIRST_HALF", reason: "Half a day off" })).toBe("HALF_DAY_RANGE");
    const half = await apply(KAMRUL, { type: "CASUAL", ...one, halfDay: "SECOND_HALF", reason: "Doctor's appointment in the afternoon" });
    expect(half.status).toBe(201);
    expect(half.body.days).toBe(0.5);
    // A weekly holiday on its own is nothing to take leave for.
    let friday = shift(today(), 5);
    while (new Date(`${friday}T00:00:00Z`).getUTCDay() !== weekendDays[0]) friday = shift(friday, 1);
    expect(await codes(KAMRUL, { type: "CASUAL", startDate: friday, endDate: friday, reason: "Friday off" })).toBe("NO_WORKING_DAYS");
    // Holidays inside the range are not charged.
    const holiday = holidays.find((h) => h > shift(today(), 3) && working(shift(h, -1)) && working(shift(h, 1)));
    if (holiday) {
      const around = await apply(IMRAN, { type: "SICK", startDate: shift(holiday, -1), endDate: shift(holiday, 1), reason: "Planned surgery and recovery" });
      expect(around.status).toBe(201);
      expect(around.body.days).toBe(countLeaveDays(shift(holiday, -1), shift(holiday, 1), { type: "SICK", weekendDays, holidays }));
      expect(around.body.days).toBe(2);
    }
    // Casual leave is at most three days at a time.
    expect(await codes(JAMAL, { type: "CASUAL", ...span(40, 4), reason: "Long weekend" })).toBe("TOO_MANY_DAYS");
    // HR sets Jamal's casual entitlement to one day; half a day is already waiting, so a full day is too much.
    const { prisma } = await startApp();
    const jamal = await prisma.user.findUniqueOrThrow({ where: { email: JAMAL } });
    const year = Number(today().slice(0, 4));
    expect((await api("PUT", "/admin/leave/entitlements", { token: await login(RAHIM), body: { userId: jamal.id, year, type: "CASUAL", days: 1, note: "Joined mid-year" } })).status).toBe(403);
    const set = await api("PUT", "/admin/leave/entitlements", { token: await login(SADIA), body: { userId: jamal.id, year, type: "CASUAL", days: 1, note: "Joined in October: pro-rata" } });
    expect(set.status).toBe(200);
    expect(set.body.balances.find((b: any) => b.type === "CASUAL")).toMatchObject({ entitled: 1, pending: 0.5, available: 0.5, adjusted: true });
    expect(await prisma.auditLog.count({ where: { action: "leave.entitlement_changed", objectId: jamal.id } })).toBe(1);
    const tooMuch = await apply(JAMAL, { type: "CASUAL", ...span(40, 1), reason: "Personal work" });
    expect(tooMuch.status).toBe(400);
    expect(tooMuch.body).toMatchObject({ code: "INSUFFICIENT_BALANCE", details: { available: 0.5, requested: 1 } });
    // Leave without pay keeps no balance.
    const unpaid = await apply(JAMAL, { type: "UNPAID", ...span(45, 2), reason: "Extended family matter" });
    expect(unpaid.status).toBe(201);
  });

  test("nobody holds two applications for the same day — in the API and in the database", async () => {
    const { prisma } = await startApp();
    const seeded = await prisma.leaveRequest.findFirstOrThrow({ where: { applicant: { email: RAHIM }, status: "PENDING_HOD" } });
    const clash = await apply(RAHIM, { type: "SICK", startDate: seeded.startDate.toISOString().slice(0, 10), endDate: seeded.startDate.toISOString().slice(0, 10), reason: "Clinic visit" });
    expect(clash.status).toBe(409);
    expect(clash.body.code).toBe("LEAVE_OVERLAP");
    const { id: _id, referenceNumber, createdAt: _c, updatedAt: _u, ...rest } = seeded;
    await expect(Promise.resolve(prisma.leaveRequest.create({ data: { ...rest, referenceNumber: `${referenceNumber}-X` } }))).rejects.toThrow(/leave_no_overlap/);
  });

  test("only the people involved, HR and the office's staff can see an application", async () => {
    const { prisma } = await startApp();
    const rahims = await prisma.leaveRequest.findFirstOrThrow({ where: { applicant: { email: RAHIM }, status: "PENDING_HOD" } });
    for (const outsider of [IMRAN, TAHMINA, KARIM]) {
      expect((await api("GET", `/leave/${rahims.id}`, { token: await login(outsider) })).status).toBe(404);
    }
    expect((await api("GET", `/leave/${rahims.id}`, { token: await login(ARIF) })).status).toBe(200);
    const audit = await api("GET", `/leave/${rahims.id}`, { token: await login(AUDITOR) });
    expect(audit.status).toBe(200);
    expect(audit.body.viewer.actions).toEqual([]);
    // The colleague covering the work can read it, without the private details.
    const tanvirs = await prisma.leaveRequest.findFirstOrThrow({ where: { applicant: { email: "tanvir.hasan@abg.com.bd" } } });
    const asReliever = await api("GET", `/leave/${tanvirs.id}`, { token: await login(KARIM) });
    expect(asReliever.status).toBe(200);
    expect(asReliever.body).toMatchObject({ reason: null, contactPhone: null, balance: null, viewer: { isReliever: true, actions: [] } });
    // Office staff see their own office only.
    const fcb = (await api("GET", "/admin/leave?limit=100", { token: await login(TAHMINA) })).body.items as any[];
    expect(fcb.length).toBeGreaterThan(0);
    expect(fcb.every((l) => l.branch.code === "FCB")).toBe(true);
    expect((await api("GET", "/admin/leave", { token: await login(RAHIM) })).status).toBe(403);
  });

  test("cancelling: before approval, approved leave before it starts, and HR after", async () => {
    const { prisma } = await startApp();
    const pending = await prisma.leaveRequest.findFirstOrThrow({ where: { applicant: { email: RAHIM }, status: "PENDING_HOD" } });
    const before = await balance(RAHIM, "CASUAL");
    expect((await api("POST", `/leave/${pending.id}/cancel`, { token: await login(RAHIM), body: {} })).body.code).toBe("REASON_REQUIRED");
    const cancelled = await api("POST", `/leave/${pending.id}/cancel`, { token: await login(RAHIM), body: { note: "The wedding moved to December." } });
    expect(cancelled.body.status).toBe("CANCELLED");
    expect((await balance(RAHIM, "CASUAL")).pending).toBe(before.pending - pending.days);
    expect((await notificationsFor(FARID, pending.id)).map((n) => n.eventType)).toContain("LEAVE_CANCELLED");

    // Shahin's sick leave has started: not cancellable from the app.
    const started = await prisma.leaveRequest.findFirstOrThrow({ where: { applicant: { email: SHAHIN }, status: "APPROVED" } });
    expect((await api("GET", `/leave/${started.id}`, { token: await login(SHAHIN) })).body.viewer.actions).not.toContain("CANCEL");
    expect((await api("POST", `/leave/${started.id}/cancel`, { token: await login(SHAHIN), body: { note: "Back early" } })).body.code).toBe("LEAVE_STARTED");

    // HR can cancel approved leave, and it is audited.
    const laila = await prisma.leaveRequest.findFirstOrThrow({ where: { applicant: { email: LAILA }, type: "EARNED", status: "APPROVED" } });
    expect((await api("GET", `/leave/${laila.id}`, { token: await login(NUSRAT) })).body.viewer.actions).toContain("CANCEL");
    const byHr = await api("POST", `/leave/${laila.id}/cancel`, { token: await login(NUSRAT), body: { note: "Recalled for the year-end audit; the days are returned." } });
    expect(byHr.body.status).toBe("CANCELLED");
    expect(await prisma.auditLog.count({ where: { objectId: laila.id, action: "leave.cancelled" } })).toBe(1);
    expect((await notificationsFor(LAILA, laila.id)).map((n) => n.title)).toContain("Leave cancelled by HR");
  });

  test("approvals inbox, team calendar, office calendar and summary", async () => {
    const hrInbox = (await api("GET", "/leave/approvals", { token: await login(NUSRAT) })).body.items as any[];
    expect(hrInbox.length).toBeGreaterThanOrEqual(3);
    expect(hrInbox.every((i) => i.awaiting === "HR" && i.applicant.name !== "Nusrat Jahan")).toBe(true);
    expect(hrInbox.map((i) => i.type)).toContain("MATERNITY");

    const from = today();
    const to = shift(from, 45);
    const team = await api("GET", `/leave/team?from=${from}&to=${to}`, { token: await login(FARID) });
    expect(team.status).toBe(200);
    const names = (team.body.people as any[]).map((p) => p.name);
    expect(names).toContain("Jamal Uddin");
    expect(names).not.toContain("Imran Hossain"); // not Farid's report
    expect((await api("GET", `/leave/team?from=${from}&to=${shift(from, 100)}`, { token: await login(FARID) })).body.code).toBe("RANGE_TOO_LONG");

    const office = await api("GET", `/admin/leave/calendar?from=${from}&to=${to}`, { token: await login(SADIA) });
    expect(office.status).toBe(200);
    expect((office.body.people as any[]).length).toBeGreaterThan(names.length);
    expect((await api("GET", `/admin/leave/calendar?from=${from}&to=${to}`, { token: await login(RAHIM) })).status).toBe(403);

    const summary = await api("GET", "/admin/leave/summary", { token: await login(ARIF) });
    expect(summary.status).toBe(200);
    expect(summary.body.onLeaveToday).toBeGreaterThanOrEqual(2);
    expect(summary.body.onLeave.map((p: any) => p.name)).toEqual(expect.arrayContaining(["Selim Reza", "Shahin Ahmed"]));
    expect(summary.body.pendingByStage.PENDING_HR).toBeGreaterThanOrEqual(3);
  });

  test("HR keeps the leave calendar", async () => {
    const current = (await api("GET", "/leave/calendar-settings", { token: await login(RAHIM) })).body;
    expect((await api("PUT", "/admin/leave/settings", { token: await login(RAHIM), body: { weekendDays: [5], holidays: [] } })).status).toBe(403);
    const day = span(60, 1).startDate;
    const updated = await api("PUT", "/admin/leave/settings", { token: await login(SADIA), body: { weekendDays: [5, 6], holidays: [...current.holidays, { date: day, name: "Company foundation day" }] } });
    expect(updated.status).toBe(200);
    expect(updated.body.weekendDays).toEqual([5, 6]);
    expect(updated.body.holidays.find((h: any) => h.date === day)?.name).toBe("Company foundation day");
    // Back as it was, for the other tests.
    expect((await api("PUT", "/admin/leave/settings", { token: await login(SADIA), body: { weekendDays: current.weekendDays, holidays: current.holidays } })).status).toBe(200);
  });

  test("history is append-only", async () => {
    const { prisma } = await startApp();
    const update = await prisma.leaveUpdate.findFirstOrThrow();
    await expect(Promise.resolve(prisma.$executeRaw`UPDATE "leave_updates" SET "note" = 'changed' WHERE "id" = ${update.id}`)).rejects.toThrow();
    await expect(Promise.resolve(prisma.$executeRaw`DELETE FROM "leave_updates" WHERE "id" = ${update.id}`)).rejects.toThrow();
    // A half day is one day long and half a day's balance, in the database too.
    await expect(Promise.resolve(prisma.$executeRaw`UPDATE "leave_requests" SET "halfDay" = 'FIRST_HALF' WHERE "days" > 1`)).rejects.toThrow();
  });
});
