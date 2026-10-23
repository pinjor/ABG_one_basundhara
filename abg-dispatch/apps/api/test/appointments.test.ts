import { beforeAll, describe, expect, test } from "bun:test";
import { api, clearTokens, key, login, resetAndSeed, startApp } from "./helpers";

const RAHIM = "rahim@abg.com.bd";
const FARID = "farid.uddin@abg.com.bd"; // Executive Director, head of department
const MD = "md@abg.com.bd";
const CHAIRMAN = "chairman@abg.com.bd";
const PA = "rumana.ahmed@abg.com.bd"; // the executive office
const MEHEDI = "mehedi.hasan@abg.com.bd";
const IMRAN = "imran.hossain@abg.com.bd";
const ARIF = "arif.chowdhury@abg.com.bd";
const AUDITOR = "mahmuda.akter@abg.com.bd";

const dhakaIso = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka", year: "numeric", month: "2-digit", day: "2-digit" });
const day = (n: number) => new Date(Date.parse(`${dhakaIso.format(new Date())}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
/** A Dhaka wall-clock time `n` days from today. */
const slot = (n: number, time: string) => `${day(n)}T${time}:00+06:00`;

let ids: Record<string, string> = {};

async function ask(identifier: string, body: Record<string, unknown>) {
  return api("POST", "/appointments", { token: await login(identifier), body, headers: { "idempotency-key": key("appt") } });
}

async function act(identifier: string, id: string, action: string, body: Record<string, unknown> = {}) {
  return api("POST", `/appointments/${id}/${action}`, { token: await login(identifier), body });
}

async function notificationsFor(identifier: string, id: string) {
  const items = (await api("GET", "/notifications?limit=100", { token: await login(identifier) })).body.items as any[];
  return items.filter((n) => n.data?.objectId === id);
}

const BASE = { subject: "Budget for the new LPG cylinder testing rig", purpose: "APPROVAL", agenda: "Quotation from two vendors.", mode: "IN_PERSON", durationMinutes: 30 };

describe("requests for appointment", () => {
  beforeAll(async () => {
    const { prisma } = await startApp();
    await resetAndSeed();
    clearTokens();
    const users = await prisma.user.findMany({ where: { email: { in: [RAHIM, FARID, MD, CHAIRMAN, PA, MEHEDI] } }, select: { id: true, email: true } });
    ids = Object.fromEntries(users.map((u) => [u.email!, u.id]));
  });

  test("the hosts list puts the MD and the Chairman first, then heads of department", async () => {
    const res = await api("GET", "/appointments/hosts", { token: await login(RAHIM) });
    expect(res.status).toBe(200);
    const items = res.body.items as any[];
    expect(items.slice(0, 2).map((h) => h.name).sort()).toEqual(["Kazi Ashraful Haque", "Shafiqul Alam"]);
    expect(items.slice(0, 2).every((h) => h.executive)).toBe(true);
    expect(items.find((h) => h.name === "Farid Uddin")).toMatchObject({ headOfDepartment: true });
    expect(items.some((h) => h.name === "Md. Rahim")).toBe(false); // not oneself
    expect(items.some((h) => h.name === "Mahmuda Akter")).toBe(false); // read-only auditors take no appointments
    const search = await api("GET", "/appointments/hosts?q=procurement", { token: await login(RAHIM) });
    expect((search.body.items as any[]).map((h) => h.name)).toContain("Mehedi Hasan");
  });

  test("asking the MD: the executive office answers, at the alternative time", async () => {
    const { prisma } = await startApp();
    const year = Number(day(0).slice(0, 4));
    const seeded = await prisma.appointment.count({ where: { referenceNumber: { startsWith: `ABG-AP-${year}-` } } });
    const res = await ask(RAHIM, { ...BASE, hostUserId: ids[MD], preferredAt: slot(20, "11:00"), alternativeAt: slot(21, "15:30"), attendees: ["Engr. Monir Hossain", " engr. monir hossain "] });
    expect(res.status).toBe(201);
    const appt = res.body;
    expect(appt.referenceNumber).toBe(`ABG-AP-${year}-${String(seeded + 1).padStart(3, "0")}`);
    expect(appt).toMatchObject({ status: "PENDING", attendees: ["Engr. Monir Hossain"], host: { name: "Kazi Ashraful Haque", executive: true } });
    expect(appt.viewer.actions).toEqual(["CANCEL", "ADD_NOTE"]);

    // Both the MD and the executive office hear about it and see it waiting.
    for (const who of [MD, PA]) {
      expect((await notificationsFor(who, appt.id)).map((n) => n.eventType)).toContain("APPOINTMENT_REQUESTED");
      expect(((await api("GET", "/appointments/inbox", { token: await login(who) })).body.items as any[]).map((i) => i.id)).toContain(appt.id);
    }
    const asOffice = await api("GET", `/appointments/${appt.id}`, { token: await login(PA) });
    expect(asOffice.body.viewer).toMatchObject({ isOffice: true, isHost: false });
    expect(asOffice.body.viewer.actions).toEqual(expect.arrayContaining(["CONFIRM", "PROPOSE", "DECLINE"]));
    expect(asOffice.body.requester.phone).toBeTruthy();
    // Nobody else can see it.
    for (const outsider of [MEHEDI, FARID, ARIF, AUDITOR]) {
      expect((await api("GET", `/appointments/${appt.id}`, { token: await login(outsider) })).status).toBe(404);
    }
    // The requester cannot answer their own request.
    expect((await act(RAHIM, appt.id, "confirm")).body.code).toBe("NOT_HOST");

    const confirmed = await act(PA, appt.id, "confirm", { at: slot(21, "15:30"), location: "MD's Office, Level 9", note: "Bring both quotations." });
    expect(confirmed.status).toBe(200);
    expect(confirmed.body).toMatchObject({ status: "CONFIRMED", location: "MD's Office, Level 9", respondedByName: "Rumana Ahmed" });
    expect(new Date(confirmed.body.scheduledAt).toISOString()).toBe(new Date(slot(21, "15:30")).toISOString());
    const toRahim = await notificationsFor(RAHIM, appt.id);
    expect(toRahim.map((n) => n.title)).toContain("Meeting confirmed");
    expect(toRahim.find((n) => n.title === "Meeting confirmed").body).toContain("MD's Office, Level 9");
  });

  test("a host is never double-booked: a clash is refused, another time is proposed and accepted", async () => {
    const { prisma } = await startApp();
    const taken = slot(21, "15:30"); // confirmed in the test above
    const res = await ask(MEHEDI, { ...BASE, subject: "Valve vendor contract", hostUserId: ids[MD], preferredAt: slot(21, "15:45") });
    const id = res.body.id;
    const detail = await api("GET", `/appointments/${id}`, { token: await login(MD) });
    expect(detail.body.clashes.length).toBe(1); // the host side is warned before answering
    const clash = await act(MD, id, "confirm");
    expect(clash.status).toBe(409);
    expect(clash.body.code).toBe("APPOINTMENT_CLASH");

    expect((await act(MD, id, "propose", { at: slot(22, "10:00") })).body.code).toBe("REASON_REQUIRED");
    const proposed = await act(MD, id, "propose", { at: slot(22, "10:00"), note: "I'm with the board at that time." });
    expect(proposed.body).toMatchObject({ status: "PROPOSED" });
    expect(proposed.body.viewer.actions).not.toContain("ACCEPT");
    expect((await notificationsFor(MEHEDI, id)).find((n) => n.eventType === "APPOINTMENT_PROPOSED")?.category).toBe("ACTION_REQUIRED");
    // Only the requester accepts a proposal.
    expect((await act(MD, id, "accept")).body.code).toBe("NOT_REQUESTER");
    const mine = await api("GET", `/appointments/${id}`, { token: await login(MEHEDI) });
    expect(mine.body.viewer.actions).toEqual(expect.arrayContaining(["ACCEPT", "CANCEL"]));
    const accepted = await act(MEHEDI, id, "accept");
    expect(accepted.body.status).toBe("CONFIRMED");
    expect((await notificationsFor(PA, id)).map((n) => n.title)).toContain("Proposed time accepted");

    // The database refuses an overlap too, whatever writes it.
    await expect(Promise.resolve(prisma.$executeRaw`UPDATE "appointments" SET "scheduledAt" = ${new Date(taken)} WHERE "id" = ${id}`)).rejects.toThrow(/appointment_host_no_clash/);
  });

  test("declining and cancelling say why; the host side declines rather than cancels a request", async () => {
    const a = (await ask(RAHIM, { ...BASE, subject: "Leave encashment policy", hostUserId: ids[FARID], preferredAt: slot(25, "12:00") })).body;
    expect((await act(FARID, a.id, "decline")).body.code).toBe("REASON_REQUIRED");
    expect((await act(FARID, a.id, "cancel", { note: "Busy" })).body.code).toBe("APPOINTMENT_STATE_CONFLICT");
    const declined = await act(FARID, a.id, "decline", { note: "HR owns this — please ask Sadia Rahman." });
    expect(declined.body).toMatchObject({ status: "DECLINED", statusNote: "HR owns this — please ask Sadia Rahman." });
    expect((await notificationsFor(RAHIM, a.id)).map((n) => n.title)).toContain("Appointment declined");
    // The PA does not answer for heads of department.
    expect((await api("GET", `/appointments/${a.id}`, { token: await login(PA) })).status).toBe(404);

    const b = (await ask(RAHIM, { ...BASE, subject: "Contract renewals", hostUserId: ids[FARID], preferredAt: slot(26, "12:00") })).body;
    expect((await act(RAHIM, b.id, "cancel")).body.code).toBe("REASON_REQUIRED");
    expect((await act(RAHIM, b.id, "cancel", { note: "Sorted by email." })).body.status).toBe("CANCELLED");
    expect((await notificationsFor(FARID, b.id)).map((n) => n.eventType)).toContain("APPOINTMENT_CANCELLED");

    const c = (await ask(RAHIM, { ...BASE, subject: "Court hearing preparation", hostUserId: ids[FARID], preferredAt: slot(27, "12:00") })).body;
    await act(FARID, c.id, "confirm");
    const cancelled = await act(FARID, c.id, "cancel", { note: "I'm travelling to Chattogram that day." });
    expect(cancelled.body.status).toBe("CANCELLED");
    expect((await notificationsFor(RAHIM, c.id)).map((n) => n.title)).toContain("Meeting cancelled");
  });

  test("times must be ahead, within meeting hours and within 90 days", async () => {
    const code = async (body: Record<string, unknown>) => (await ask(RAHIM, { ...BASE, hostUserId: ids[FARID], ...body })).body.code;
    expect(await code({ preferredAt: new Date(Date.now() - 3_600_000).toISOString() })).toBe("TIME_IN_PAST");
    expect(await code({ preferredAt: slot(10, "07:00") })).toBe("OUTSIDE_MEETING_HOURS");
    expect(await code({ preferredAt: slot(10, "19:45") })).toBe("OUTSIDE_MEETING_HOURS"); // a 30-minute meeting would end after 20:00
    expect(await code({ preferredAt: slot(120, "11:00") })).toBe("TIME_TOO_FAR");
    expect(await code({ preferredAt: slot(10, "11:00"), alternativeAt: slot(10, "11:00") })).toBe("ALTERNATIVE_SAME");
    expect(await code({ preferredAt: slot(10, "11:00"), hostUserId: ids[RAHIM] })).toBe("HOST_SELF");
    expect((await ask(RAHIM, { ...BASE, hostUserId: ids[FARID], preferredAt: slot(10, "11:00"), durationMinutes: 25 })).status).toBe(400);
  });

  test("a meeting is marked held only once it has taken place", async () => {
    const { prisma } = await startApp();
    const a = (await ask(RAHIM, { ...BASE, subject: "Signing the land lease", hostUserId: ids[FARID], preferredAt: slot(30, "10:00") })).body;
    await act(FARID, a.id, "confirm");
    expect((await act(FARID, a.id, "complete")).body.code).toBe("APPOINTMENT_NOT_YET");
    await prisma.appointment.update({ where: { id: a.id }, data: { scheduledAt: new Date(Date.now() - 2 * 3_600_000) } });
    expect((await api("GET", `/appointments/${a.id}`, { token: await login(FARID) })).body.viewer.actions).toContain("COMPLETE");
    const held = await act(FARID, a.id, "complete", { note: "Signed; Legal to register it on Thursday." });
    expect(held.body).toMatchObject({ status: "COMPLETED" });
    expect((await notificationsFor(RAHIM, a.id)).map((n) => n.title)).toContain("Meeting notes");
  });

  test("the diary and summary: the executive office covers the MD and the Chairman", async () => {
    const from = day(0);
    const to = day(30);
    const office = await api("GET", `/appointments/diary?from=${from}&to=${to}`, { token: await login(PA) });
    expect(office.status).toBe(200);
    expect((office.body.hosts as any[]).map((h) => h.name).sort()).toEqual(["Kazi Ashraful Haque", "Shafiqul Alam"]);
    const farid = await api("GET", `/appointments/diary?from=${from}&to=${to}`, { token: await login(FARID) });
    expect((farid.body.items as any[]).every((i) => i.host.name === "Farid Uddin")).toBe(true);
    expect((await api("GET", `/appointments/diary?from=${from}&to=${day(60)}`, { token: await login(FARID) })).body.code).toBe("RANGE_TOO_LONG");

    const summary = await api("GET", "/appointments/summary", { token: await login(PA) });
    expect(summary.body).toMatchObject({ answersFor: "EXECUTIVES" });
    expect(summary.body.awaitingAnswer).toBeGreaterThanOrEqual(2); // Rahim's lease and Shirin's urgent licence
    expect(summary.body.confirmedThisWeek).toBeGreaterThanOrEqual(1);
    const imran = await api("GET", "/appointments/mine", { token: await login(IMRAN) });
    expect((imran.body.items as any[])[0]).toMatchObject({ status: "PROPOSED" });
  });

  test("history is append-only", async () => {
    const { prisma } = await startApp();
    const u = await prisma.appointmentUpdate.findFirstOrThrow();
    await expect(Promise.resolve(prisma.$executeRaw`UPDATE "appointment_updates" SET "note" = 'x' WHERE "id" = ${u.id}`)).rejects.toThrow();
    await expect(Promise.resolve(prisma.$executeRaw`DELETE FROM "appointment_updates" WHERE "id" = ${u.id}`)).rejects.toThrow();
    // Confirmed needs a time, in the database too.
    await expect(Promise.resolve(prisma.$executeRaw`UPDATE "appointments" SET "scheduledAt" = NULL WHERE "status" = 'CONFIRMED'`)).rejects.toThrow();
  });
});
