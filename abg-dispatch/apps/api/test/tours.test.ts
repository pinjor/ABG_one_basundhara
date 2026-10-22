import { beforeAll, describe, expect, test } from "bun:test";
import { passportNeedsRenewal } from "@abg-dispatch/shared";
import { api, clearTokens, directoryIds, key, login, resetAndSeed, startApp } from "./helpers";

const RAHIM = "rahim@abg.com.bd"; // HO Legal; manager Farid Uddin
const FARID = "farid.uddin@abg.com.bd"; // Executive Director (plain employee role)
const NUSRAT = "nusrat.jahan@abg.com.bd"; // HR & Finance
const SADIA = "sadia.rahman@abg.com.bd"; // HR & Finance
const MD = "md@abg.com.bd"; // Executive
const CHAIRMAN = "chairman@abg.com.bd"; // Executive
const ARIF = "arif.chowdhury@abg.com.bd"; // Head office admin
const SABINA = "sabina.yasmin@abg.com.bd"; // Factory A branch admin
const TAHMINA = "tahmina.begum@abg.com.bd"; // Factory B branch admin
const FARHANA = "farhana.islam@abg.com.bd"; // Factory A; manager Sabina
const MEHEDI = "mehedi.hasan@abg.com.bd"; // Procurement; manager Nusrat
const AUDITOR = "mahmuda.akter@abg.com.bd";

const dhakaIso = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka", year: "numeric", month: "2-digit", day: "2-digit" });
/** A Dhaka calendar date `n` days from today. */
const dateIn = (n: number) => new Date(new Date(`${dhakaIso.format(new Date())}T00:00:00Z`).getTime() + n * 86_400_000).toISOString().slice(0, 10);

const FOREIGN = {
  type: "FOREIGN",
  purpose: "CONFERENCE",
  title: "Gastech 2026 — LPG terminal sessions",
  description: "Sessions on LPG terminal safety and meetings with two valve suppliers.",
  destination: "Frankfurt",
  country: "Germany",
  startDate: dateIn(20),
  endDate: dateIn(24),
  transportMode: "AIR",
  coTravellers: ["Engr. Monir Hossain", "  Engr. Monir Hossain "],
  estimatedBudget: 320_000,
  advanceRequested: 100_000,
  passportNumber: "a0 1234567",
  passportExpiry: dateIn(24 + 900),
};

const LOCAL = {
  type: "LOCAL",
  purpose: "PLANT_VISIT",
  title: "Chattogram plant lease review",
  destination: "Chattogram — LPG refinery",
  startDate: dateIn(0),
  endDate: dateIn(1),
  transportMode: "AIR",
  estimatedBudget: 42_000,
};

async function apply(identifier: string, body: Record<string, unknown>, idempotencyKey = key("tour")) {
  return api("POST", "/tours", { token: await login(identifier), body, headers: { "idempotency-key": idempotencyKey } });
}

async function decide(identifier: string, id: string, body: Record<string, unknown>) {
  return api("POST", `/tours/${id}/decision`, { token: await login(identifier), body });
}

async function notificationsFor(identifier: string, tourId: string) {
  const items = (await api("GET", "/notifications?limit=100", { token: await login(identifier) })).body.items as any[];
  return items.filter((n) => n.data?.objectId === tourId);
}

async function approvalsFor(identifier: string) {
  return (await api("GET", "/tours/approvals?limit=100", { token: await login(identifier) })).body.items as any[];
}

describe("official tour requests", () => {
  let employee: (code: string) => Promise<string>;

  beforeAll(async () => {
    await startApp();
    await resetAndSeed();
    clearTokens();
    employee = (await directoryIds()).emp;
  });

  test("a foreign tour goes HOD → HR & Finance → MD / Chairman → approved, and the next person is told at each stage", async () => {
    const { prisma } = await startApp();
    const year = Number(dhakaIso.format(new Date()).slice(0, 4));
    const seeded = await prisma.tourRequest.findMany({ where: { referenceNumber: { startsWith: `ABG-TR-${year}-` } }, select: { referenceNumber: true } });
    const next = Math.max(0, ...seeded.map((t) => Number(t.referenceNumber.split("-").pop()))) + 1;

    const res = await apply(RAHIM, FOREIGN);
    expect(res.status).toBe(201);
    const tour = res.body;
    // Carries on the year's numbering after the seeded requests.
    expect(tour.referenceNumber).toBe(`ABG-TR-${year}-${String(next).padStart(3, "0")}`);
    expect(tour).toMatchObject({ status: "PENDING_HOD", awaiting: "HOD", type: "FOREIGN", country: "Germany", passportNumber: "A01234567", passportAlert: false, coTravellers: ["Engr. Monir Hossain"] });
    expect(tour.approver.name).toBe("Farid Uddin"); // defaulted to the traveller's line manager
    expect(tour.pipeline.map((p: any) => p.key)).toEqual(["SUBMITTED", "PENDING_HOD", "PENDING_VETTING", "PENDING_SANCTION", "APPROVED", "ACTIVE", "COMPLETED"]);
    expect(tour.pipeline[1]).toMatchObject({ state: "current", waitingFor: "Farid Uddin" });
    expect(tour.viewer.actions).toEqual(["CANCEL", "ADD_NOTE"]);

    const toFarid = await notificationsFor(FARID, tour.id);
    expect(toFarid).toHaveLength(1);
    expect(toFarid[0]).toMatchObject({ category: "ACTION_REQUIRED", eventType: "TOUR_SUBMITTED", data: { module: "tours", route: `/tours/${tour.id}`, reference: tour.referenceNumber } });
    expect(toFarid[0].body).toContain("Md. Rahim");
    expect((await approvalsFor(FARID)).some((a) => a.id === tour.id && a.awaiting === "HOD")).toBe(true);
    expect((await api("GET", `/tours/${tour.id}`, { token: await login(FARID) })).body.viewer.actions).toContain("APPROVE");

    // Head of department.
    const hod = await decide(FARID, tour.id, { decision: "APPROVE", note: "Go ahead." });
    expect(hod.status).toBe(200);
    expect(hod.body).toMatchObject({ status: "PENDING_VETTING", awaiting: "VETTING" });
    expect(hod.body.hodApprovedAt).toBeTruthy();
    expect((await notificationsFor(RAHIM, tour.id)).map((n) => n.title)).toContain("Approved by your head of department");
    for (const who of [NUSRAT, SADIA]) {
      const n = await notificationsFor(who, tour.id);
      expect(n.map((x) => x.title)).toContain("Tour budget needs vetting");
      expect(n[0].category).toBe("ACTION_REQUIRED");
    }
    expect(await notificationsFor(MD, tour.id)).toHaveLength(0);

    // HR & Finance vetting, trimming the budget.
    const vet = await decide(NUSRAT, tour.id, { decision: "APPROVE", sanctionedBudget: 300_000, note: "Economy fares; hotel at the group rate." });
    expect(vet.status).toBe(200);
    expect(vet.body).toMatchObject({ status: "PENDING_SANCTION", awaiting: "SANCTION", sanctionedBudget: 300_000 });
    expect((await notificationsFor(RAHIM, tour.id)).map((n) => n.title)).toContain("Vetted by HR & Finance");
    for (const who of [MD, CHAIRMAN]) expect((await notificationsFor(who, tour.id)).map((n) => n.title)).toContain("Overseas tour needs your sanction");
    expect((await approvalsFor(CHAIRMAN)).find((a) => a.id === tour.id)?.awaiting).toBe("SANCTION");

    // MD sanction.
    const sanction = await decide(MD, tour.id, { decision: "APPROVE" });
    expect(sanction.status).toBe(200);
    expect(sanction.body).toMatchObject({ status: "APPROVED", awaiting: null, sanctionedBudget: 300_000 });
    expect(sanction.body.sanctionedAt).toBeTruthy();
    expect((await notificationsFor(RAHIM, tour.id)).map((n) => n.title)).toContain("Tour approved & funds sanctioned");
    expect((await notificationsFor(SADIA, tour.id)).map((n) => n.title)).toContain("Overseas tour sanctioned");
    expect((await approvalsFor(CHAIRMAN)).some((a) => a.id === tour.id)).toBe(false);

    const seen = (await api("GET", `/tours/${tour.id}`, { token: await login(RAHIM) })).body;
    const stage = (k: string) => seen.pipeline.find((p: any) => p.key === k);
    expect(stage("PENDING_HOD")).toMatchObject({ state: "done", by: "Farid Uddin", note: "Go ahead." });
    expect(stage("PENDING_VETTING")).toMatchObject({ state: "done", by: "Nusrat Jahan" });
    expect(stage("PENDING_SANCTION")).toMatchObject({ state: "done", by: "Kazi Ashraful Haque" });
    expect(stage("APPROVED").state).toBe("done");
    expect(stage("ACTIVE").state).toBe("upcoming");
    expect(seen.updates.map((u: any) => u.type)).toEqual(["SUBMITTED", "STATUS_CHANGED", "STATUS_CHANGED", "BUDGET_CHANGED", "STATUS_CHANGED"]);
    expect(seen.updates[3].metadata).toMatchObject({ before: null, after: 300_000, estimated: 320_000 });
    expect(seen.viewer.actions).toContain("CANCEL");
    expect(seen.viewer.actions).not.toContain("START"); // starts in 20 days
    expect(seen.viewer.startableFrom).toBe(dateIn(19));

    const audits = await prisma.auditLog.findMany({ where: { objectType: "tour", objectId: tour.id } });
    expect(audits.map((a) => a.action).sort()).toEqual(["tour.approved", "tour.approved", "tour.approved"]);
  });

  test("a local tour skips the sanction stage; the traveller starts and completes it", async () => {
    const created = (await apply(RAHIM, LOCAL)).body;
    expect(created.pipeline.map((p: any) => p.key)).toEqual(["SUBMITTED", "PENDING_HOD", "PENDING_VETTING", "APPROVED", "ACTIVE", "COMPLETED"]);
    expect(created.passportNumber).toBeNull();
    await decide(FARID, created.id, { decision: "APPROVE" });
    const vetted = await decide(SADIA, created.id, { decision: "APPROVE" });
    expect(vetted.body).toMatchObject({ status: "APPROVED", sanctionedBudget: 42_000, sanctionedAt: null });
    expect((await notificationsFor(RAHIM, created.id)).map((n) => n.title)).toContain("Tour approved & funds sanctioned");
    expect(await notificationsFor(MD, created.id)).toHaveLength(0);
    expect((await approvalsFor(MD)).some((a) => a.id === created.id)).toBe(false);

    const rahim = await login(RAHIM);
    expect((await api("GET", `/tours/${created.id}`, { token: rahim })).body.viewer.actions).toContain("START");
    const started = await api("POST", `/tours/${created.id}/start`, { token: rahim, body: {} });
    expect(started.status).toBe(200);
    expect(started.body).toMatchObject({ status: "ACTIVE" });
    expect(started.body.viewer.actions).toContain("COMPLETE");
    expect(started.body.viewer.actions).not.toContain("CANCEL");
    expect((await notificationsFor(FARID, created.id)).map((n) => n.title)).toContain("Tour started");

    const done = await api("POST", `/tours/${created.id}/complete`, { token: rahim, body: { note: "Lease signed." } });
    expect(done.body).toMatchObject({ status: "COMPLETED" });
    expect(done.body.completedAt).toBeTruthy();
    expect(done.body.pipeline.every((p: any) => p.state === "done")).toBe(true);

    const mine = await api("GET", "/tours/mine?state=closed", { token: rahim });
    expect(mine.body.items.some((t: any) => t.id === created.id && t.status === "COMPLETED")).toBe(true);
    const open = await api("GET", "/tours/mine?state=open", { token: rahim });
    expect(open.body.items.some((t: any) => t.id === created.id)).toBe(false);
  });

  test("only the named approver can take the HOD step", async () => {
    const tour = (await apply(RAHIM, { ...LOCAL, startDate: dateIn(8), endDate: dateIn(9), approverEmployeeId: await employee("ABG-1001") })).body;
    expect(tour.approver.name).toBe("Arif Chowdhury");
    // His usual manager is not involved this time and cannot even see it.
    expect((await decide(FARID, tour.id, { decision: "APPROVE" })).status).toBe(404);
    expect((await approvalsFor(FARID)).some((a) => a.id === tour.id)).toBe(false);
    // HR & Finance can see every tour, but the HOD step is not theirs.
    const early = await decide(NUSRAT, tour.id, { decision: "APPROVE" });
    expect(early.status).toBe(403);
    expect(early.body.code).toBe("NOT_YOUR_STAGE");
    const own = await decide(RAHIM, tour.id, { decision: "APPROVE" });
    expect(own.status).toBe(403);
    expect(own.body.code).toBe("OWN_REQUEST");
    // The HOD does not set the sanctioned amount.
    expect((await decide(ARIF, tour.id, { decision: "APPROVE", sanctionedBudget: 10 })).body.code).toBe("BUDGET_NOT_ALLOWED");

    expect((await approvalsFor(ARIF)).some((a) => a.id === tour.id)).toBe(true);
    const ok = await decide(ARIF, tour.id, { decision: "APPROVE" });
    expect(ok.status).toBe(200);
    expect(ok.body.status).toBe("PENDING_VETTING");
    expect((await approvalsFor(ARIF)).some((a) => a.id === tour.id)).toBe(false);
  });

  test("HR & Finance vet and the MD / Chairman sanction; nobody else can, and an HOD from HR & Finance cannot also vet", async () => {
    const tour = (await apply(MEHEDI, { ...FOREIGN, purpose: "VENDOR_AUDIT", title: "Valve supplier audit" })).body;
    expect(tour.approver.name).toBe("Nusrat Jahan");
    await decide(NUSRAT, tour.id, { decision: "APPROVE" });

    const twice = await decide(NUSRAT, tour.id, { decision: "APPROVE" });
    expect(twice.status).toBe(403);
    expect(twice.body.code).toBe("SEPARATION_OF_DUTIES");
    expect((await approvalsFor(NUSRAT)).some((a) => a.id === tour.id)).toBe(false);
    expect((await api("GET", `/tours/${tour.id}`, { token: await login(NUSRAT) })).body.viewer).toMatchObject({ canDecide: false, blockedReason: "SEPARATION_OF_DUTIES" });
    expect((await approvalsFor(SADIA)).some((a) => a.id === tour.id && a.awaiting === "VETTING")).toBe(true);
    // Nobody told Nusrat to vet the request she approved as HOD.
    expect((await notificationsFor(NUSRAT, tour.id)).some((n) => n.title === "Tour budget needs vetting")).toBe(false);

    expect((await decide(MD, tour.id, { decision: "APPROVE" })).body.code).toBe("NOT_YOUR_STAGE");
    expect((await decide(ARIF, tour.id, { decision: "APPROVE" })).body.code).toBe("NOT_YOUR_STAGE");
    expect((await decide(SADIA, tour.id, { decision: "APPROVE" })).body.status).toBe("PENDING_SANCTION");

    const late = await decide(SADIA, tour.id, { decision: "APPROVE" });
    expect(late.status).toBe(409);
    expect(late.body.code).toBe("TOUR_STATE_CONFLICT");
    expect((await decide(ARIF, tour.id, { decision: "APPROVE" })).status).toBe(403);
    expect((await decide(CHAIRMAN, tour.id, { decision: "APPROVE", sanctionedBudget: 290_000 })).body).toMatchObject({ status: "APPROVED", sanctionedBudget: 290_000 });
    const after = await decide(MD, tour.id, { decision: "APPROVE" });
    expect(after.status).toBe(409);
    expect(after.body.code).toBe("TOUR_STATE_CONFLICT");
  });

  test("rejecting needs a reason, and the traveller is told why", async () => {
    const tour = (await apply(FARHANA, { ...LOCAL, destination: "Sylhet", title: "DIFE compliance workshop", startDate: dateIn(10), endDate: dateIn(11) })).body;
    expect(tour.approver.name).toBe("Sabina Yasmin");
    const bare = await decide(SABINA, tour.id, { decision: "REJECT" });
    expect(bare.status).toBe(400);
    expect(bare.body.code).toBe("REASON_REQUIRED");
    const rejected = await decide(SABINA, tour.id, { decision: "REJECT", note: "The workshop is repeated online next month — join that instead." });
    expect(rejected.body).toMatchObject({ status: "REJECTED", statusNote: "The workshop is repeated online next month — join that instead." });
    expect(rejected.body.rejectedAt).toBeTruthy();
    expect(rejected.body.pipeline.find((p: any) => p.key === "PENDING_HOD")).toMatchObject({ state: "rejected", by: "Sabina Yasmin" });
    expect(rejected.body.pipeline.find((p: any) => p.key === "APPROVED").state).toBe("skipped");
    const told = await notificationsFor(FARHANA, tour.id);
    expect(told[0]).toMatchObject({ title: "Tour request rejected" });
    expect(told[0].body).toContain("repeated online");

    expect((await decide(SABINA, tour.id, { decision: "APPROVE" })).status).toBe(409);
    expect((await api("POST", `/tours/${tour.id}/cancel`, { token: await login(FARHANA), body: { note: "No longer needed" } })).status).toBe(409);
  });

  test("state rules: one decision wins a race, no start before approval or too early, cancel needs a reason and stops before the tour", async () => {
    const { prisma } = await startApp();
    const tour = (await apply(RAHIM, { ...LOCAL, startDate: dateIn(3), endDate: dateIn(4) })).body;
    const rahim = await login(RAHIM);
    const early = await api("POST", `/tours/${tour.id}/start`, { token: rahim, body: {} });
    expect(early.status).toBe(409);
    expect(early.body.code).toBe("TOUR_STATE_CONFLICT");

    await decide(FARID, tour.id, { decision: "APPROVE" });
    // Both HR & Finance managers press Approve at the same moment: exactly one wins.
    const race = await Promise.all([decide(NUSRAT, tour.id, { decision: "APPROVE" }), decide(SADIA, tour.id, { decision: "APPROVE" })]);
    expect(race.map((r) => r.status).sort()).toEqual([200, 409]);
    expect(await prisma.tourUpdate.count({ where: { tourId: tour.id, fromStatus: "PENDING_VETTING" } })).toBe(1);

    const tooEarly = await api("POST", `/tours/${tour.id}/start`, { token: rahim, body: {} });
    expect(tooEarly.status).toBe(409);
    expect(tooEarly.body.code).toBe("TOUR_TOO_EARLY");

    const noReason = await api("POST", `/tours/${tour.id}/cancel`, { token: rahim, body: {} });
    expect(noReason.body.code).toBe("REASON_REQUIRED");
    expect((await api("POST", `/tours/${tour.id}/cancel`, { token: await login(FARID), body: { note: "Not needed" } })).status).toBe(403);
    const cancelled = await api("POST", `/tours/${tour.id}/cancel`, { token: rahim, body: { note: "The landlord postponed the meeting." } });
    expect(cancelled.body).toMatchObject({ status: "CANCELLED", statusNote: "The landlord postponed the meeting." });
    expect(cancelled.body.pipeline.find((p: any) => p.key === "APPROVED").state).toBe("done");
    expect(cancelled.body.pipeline.find((p: any) => p.key === "ACTIVE").state).toBe("cancelled");
    expect((await notificationsFor(FARID, tour.id)).map((n) => n.title)).toContain("Tour request cancelled");
    expect((await api("POST", `/tours/${tour.id}/cancel`, { token: rahim, body: { note: "again" } })).status).toBe(409);

    // An active tour (seeded: Nazmul Karim in Dubai) cannot be cancelled, only completed.
    const dubai = await prisma.tourRequest.findFirstOrThrow({ where: { country: "United Arab Emirates", status: "ACTIVE" } });
    const nazmul = await login("nazmul.karim@abg.com.bd");
    const stop = await api("POST", `/tours/${dubai.id}/cancel`, { token: nazmul, body: { note: "Coming home early" } });
    expect(stop.status).toBe(409);
    expect(stop.body.message).toContain("mark it completed");
  });

  test("visibility: unrelated people get 404, offices see their own, auditors read but never act", async () => {
    const { prisma } = await startApp();
    const tour = (await apply(RAHIM, { ...FOREIGN, title: "Hannover valve fair" })).body;
    const farhanaTour = (await apply(FARHANA, { ...LOCAL, title: "Gazipur supplier visit", startDate: dateIn(6), endDate: dateIn(6) })).body;

    const missing = await api("GET", `/tours/${tour.id}`, { token: await login(FARHANA) });
    expect(missing.status).toBe(404);
    expect(missing.body.code).toBe("TOUR_NOT_FOUND");
    expect((await api("GET", `/tours/${crypto.randomUUID()}`, { token: await login(RAHIM) })).status).toBe(404);
    expect((await api("POST", `/tours/${tour.id}/notes`, { token: await login(FARHANA), body: { note: "Hello there" } })).status).toBe(404);

    // Branch scope: Factory A's admin sees Factory A only.
    expect((await api("GET", `/tours/${tour.id}`, { token: await login(SABINA) })).status).toBe(404);
    expect((await api("GET", `/tours/${farhanaTour.id}`, { token: await login(SABINA) })).status).toBe(200);
    expect((await api("GET", `/tours/${farhanaTour.id}`, { token: await login(TAHMINA) })).status).toBe(404);
    const sabinaList = await api("GET", "/admin/tours?status=ALL&limit=100", { token: await login(SABINA) });
    expect(sabinaList.status).toBe(200);
    expect(sabinaList.body.items.length).toBeGreaterThan(0);
    expect(sabinaList.body.items.every((t: any) => t.branch.code === "FCA")).toBe(true);

    // Head office sees everything; passport numbers are only shown in full to the traveller and HR & Finance / executives.
    const arif = await api("GET", `/tours/${tour.id}`, { token: await login(ARIF) });
    expect(arif.status).toBe(200);
    expect(arif.body.passportNumber).toBe("••••••567");
    expect((await api("GET", `/tours/${tour.id}`, { token: await login(NUSRAT) })).body.passportNumber).toBe("A01234567");

    // Auditor: read-only.
    const audit = await api("GET", `/tours/${tour.id}`, { token: await login(AUDITOR) });
    expect(audit.status).toBe(200);
    expect(audit.body.viewer.actions).toEqual([]);
    const blocked = await decide(AUDITOR, tour.id, { decision: "APPROVE" });
    expect(blocked.status).toBe(403);
    expect(blocked.body.code).toBe("READ_ONLY");
    expect((await api("GET", "/admin/tours?limit=5", { token: await login(AUDITOR) })).status).toBe(200);
    expect((await api("GET", "/tours/approvals", { token: await login(AUDITOR) })).body.items).toEqual([]);

    // Plain employees have no oversight list.
    expect((await api("GET", "/admin/tours", { token: await login(RAHIM) })).status).toBe(403);
    expect((await api("GET", "/admin/tours/summary", { token: await login(RAHIM) })).status).toBe(403);

    // Search and filters.
    const found = await api("GET", `/admin/tours?q=${encodeURIComponent("Hannover")}&type=FOREIGN&status=OPEN`, { token: await login(ARIF) });
    expect(found.body.items.map((t: any) => t.id)).toEqual([tour.id]);
    const byDates = await api("GET", `/admin/tours?dateFrom=${dateIn(21)}&dateTo=${dateIn(22)}&limit=100`, { token: await login(ARIF) });
    expect(byDates.body.items.some((t: any) => t.id === tour.id)).toBe(true);
    expect(byDates.body.items.some((t: any) => t.id === farhanaTour.id)).toBe(false);
    const several = await api("GET", "/admin/tours?status=REJECTED,CANCELLED&limit=100", { token: await login(ARIF) });
    expect(several.body.items.every((t: any) => t.status === "REJECTED" || t.status === "CANCELLED")).toBe(true);
    expect(several.body.items.length).toBe(await prisma.tourRequest.count({ where: { status: { in: ["REJECTED", "CANCELLED"] } } }));
    expect((await api("GET", "/admin/tours?status=BOGUS", { token: await login(ARIF) })).status).toBe(400);
  });

  test("applications are validated: dates, passport and country for foreign tours, budget and approver", async () => {
    const cases: [Record<string, unknown>, string][] = [
      [{ ...LOCAL, startDate: dateIn(-1), endDate: dateIn(1) }, "START_IN_PAST"],
      [{ ...LOCAL, startDate: dateIn(5), endDate: dateIn(4) }, "END_BEFORE_START"],
      [{ ...LOCAL, startDate: "2026-02-30", endDate: "2026-03-02" }, "DATE_INVALID"],
      [{ ...LOCAL, startDate: dateIn(1), endDate: dateIn(120) }, "TOUR_TOO_LONG"],
      [{ ...FOREIGN, passportNumber: undefined }, "PASSPORT_REQUIRED"],
      [{ ...FOREIGN, passportExpiry: undefined }, "PASSPORT_REQUIRED"],
      [{ ...FOREIGN, passportExpiry: dateIn(22) }, "PASSPORT_EXPIRED"],
      [{ ...FOREIGN, passportNumber: "12-34" }, "PASSPORT_NUMBER_INVALID"],
      [{ ...FOREIGN, country: undefined }, "COUNTRY_REQUIRED"],
      [{ ...FOREIGN, country: "Bangladesh" }, "COUNTRY_INVALID"],
      [{ ...FOREIGN, transportMode: "POOL_CAR" }, "TRANSPORT_INVALID"],
      [{ ...LOCAL, advanceRequested: 50_000 }, "ADVANCE_TOO_HIGH"],
      [{ ...LOCAL, approverEmployeeId: await employee("ABG-2041") }, "APPROVER_SELF"],
      [{ ...LOCAL, approverEmployeeId: await employee("ABG-2120") }, "APPROVER_HAS_NO_ACCOUNT"],
      [{ ...LOCAL, approverEmployeeId: await employee("ABG-9002") }, "APPROVER_CANNOT_APPROVE"],
      [{ ...LOCAL, type: "SPACE" }, "VALIDATION"],
      [{ ...LOCAL, estimatedBudget: 12.5 }, "VALIDATION"],
    ];
    for (const [body, code] of cases) {
      const res = await apply(RAHIM, body);
      expect({ code: res.body.code, status: res.status }).toEqual({ code, status: 400 });
    }
    // The Chairman has no line manager on record, so must name an approver.
    expect((await apply(CHAIRMAN, LOCAL)).body.code).toBe("APPROVER_REQUIRED");

    // A passport valid for less than six months after return is accepted but flagged.
    const flagged = await apply(RAHIM, { ...FOREIGN, passportExpiry: dateIn(24 + 120) });
    expect(flagged.status).toBe(201);
    expect(flagged.body.passportAlert).toBe(true);
    expect(passportNeedsRenewal(flagged.body.passportExpiry, flagged.body.endDate)).toBe(true);
  });

  test("an application sent twice with the same Idempotency-Key is filed once", async () => {
    const { prisma } = await startApp();
    const k = key("tour");
    const body = { ...LOCAL, title: "Double-tap check", startDate: dateIn(2), endDate: dateIn(2) };
    const a = await apply(RAHIM, body, k);
    const b = await apply(RAHIM, body, k);
    expect(a.status).toBe(201);
    expect(b.status).toBe(201);
    expect(b.headers.get("idempotent-replay")).toBe("true");
    expect(b.body.id).toBe(a.body.id);
    expect(await prisma.tourRequest.count({ where: { title: "Double-tap check" } })).toBe(1);
    expect((await notificationsFor(FARID, a.body.id)).length).toBe(1);
  });

  test("notes reach the other side, and history cannot be altered even with direct SQL", async () => {
    const { prisma } = await startApp();
    const tour = (await apply(RAHIM, { ...LOCAL, title: "Note check", startDate: dateIn(4), endDate: dateIn(5) })).body;
    const fromTraveller = await api("POST", `/tours/${tour.id}/notes`, { token: await login(RAHIM), body: { note: "Flight options attached to the email." } });
    expect(fromTraveller.status).toBe(200);
    expect((await notificationsFor(FARID, tour.id)).map((n) => n.title)).toContain("Note from Md. Rahim");
    await api("POST", `/tours/${tour.id}/notes`, { token: await login(FARID), body: { note: "Take the morning flight." } });
    expect((await notificationsFor(RAHIM, tour.id)).map((n) => n.title)).toContain("Note on your tour request");
    const seen = (await api("GET", `/tours/${tour.id}`, { token: await login(RAHIM) })).body;
    expect(seen.updates.filter((u: any) => u.type === "NOTE_ADDED").map((u: any) => u.actor)).toEqual(["Md. Rahim", "Farid Uddin"]);

    await expect(Promise.resolve(prisma.$executeRawUnsafe(`UPDATE "tour_updates" SET "note" = 'edited' WHERE "tourId" = '${tour.id}'`))).rejects.toThrow();
    await expect(Promise.resolve(prisma.$executeRawUnsafe(`DELETE FROM "tour_updates" WHERE "tourId" = '${tour.id}'`))).rejects.toThrow();
    // The database also refuses an overseas tour marked approved without the MD / Chairman's sanction.
    const pending = await prisma.tourRequest.findFirstOrThrow({ where: { type: "FOREIGN", status: "PENDING_HOD" } });
    await expect(
      Promise.resolve(prisma.$executeRawUnsafe(`UPDATE "tour_requests" SET "status" = 'APPROVED', "hodApprovedAt" = now(), "vettedAt" = now(), "sanctionedBudget" = 1 WHERE "id" = '${pending.id}'`)),
    ).rejects.toThrow();
  });

  test("the approvals inbox returns exactly the agreed row shape", async () => {
    const rows = await approvalsFor(SADIA);
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows) {
      expect(Object.keys(r).sort()).toEqual(["awaiting", "createdAt", "destination", "endDate", "estimatedBudget", "id", "referenceNumber", "startDate", "status", "title", "traveller", "type"]);
      expect(Object.keys(r.traveller).sort()).toEqual(["department", "designation", "name"]);
      expect(r.awaiting).toBe("VETTING");
    }
    // Seeded: the Mongla depot visit is with HR & Finance.
    expect(rows.some((r) => r.destination === "Mongla terminal depot" && r.traveller.name === "Selim Reza")).toBe(true);
    const md = await approvalsFor(MD);
    expect(md.some((r) => r.destination === "Frankfurt, Germany" && r.awaiting === "SANCTION")).toBe(true);
  });

  test("the summary adds up, and HR & Finance can change the annual travel budget", async () => {
    const { prisma } = await startApp();
    const arif = await login(ARIF);
    const res = await api("GET", "/admin/tours/summary", { token: arif });
    expect(res.status).toBe(200);
    const s = res.body;
    expect(Object.keys(s)).toEqual(expect.arrayContaining(["activeForeign", "activeForeignCountries", "pendingApprovals", "pendingByStage", "ytdSanctioned", "annualBudget", "utilisationPct", "passportAlerts", "upcomingThisMonth"]));

    const count = (status: string) => prisma.tourRequest.count({ where: { status } });
    expect(s.pendingByStage).toEqual({ PENDING_HOD: await count("PENDING_HOD"), PENDING_VETTING: await count("PENDING_VETTING"), PENDING_SANCTION: await count("PENDING_SANCTION") });
    expect(s.pendingApprovals).toBe(s.pendingByStage.PENDING_HOD + s.pendingByStage.PENDING_VETTING + s.pendingByStage.PENDING_SANCTION);
    expect(s.activeForeign).toBe(await prisma.tourRequest.count({ where: { type: "FOREIGN", status: "ACTIVE" } }));
    expect(s.activeForeignCountries).toEqual(["Singapore", "United Arab Emirates"]);
    expect(s.annualBudget).toBe(6_500_000);

    const year = Number(dhakaIso.format(new Date()).slice(0, 4));
    const start = new Date(`${year}-01-01T00:00:00+06:00`);
    const end = new Date(`${year + 1}-01-01T00:00:00+06:00`);
    const sanctioned = await prisma.tourRequest.findMany({ where: { status: { in: ["APPROVED", "ACTIVE", "COMPLETED"] } } });
    const ytd = sanctioned
      .filter((t) => {
        const at = t.type === "FOREIGN" ? t.sanctionedAt : t.vettedAt;
        return !!at && at >= start && at < end;
      })
      .reduce((sum, t) => sum + (t.sanctionedBudget ?? 0), 0);
    expect(ytd).toBeGreaterThan(0);
    expect(s.ytdSanctioned).toBe(ytd);
    expect(s.utilisationPct).toBe(Math.round((ytd / 6_500_000) * 1000) / 10);

    const live = await prisma.tourRequest.findMany({ where: { type: "FOREIGN", status: { in: ["PENDING_HOD", "PENDING_VETTING", "PENDING_SANCTION", "APPROVED", "ACTIVE"] } } });
    const alerts = live.filter((t) => passportNeedsRenewal(t.passportExpiry, t.endDate)).length;
    expect(alerts).toBeGreaterThanOrEqual(3); // two seeded + one flagged in the validation test
    expect(s.passportAlerts).toBe(alerts);

    const today = dhakaIso.format(new Date());
    const [y, m] = today.split("-").map(Number);
    const upcoming = await prisma.tourRequest.count({
      where: { status: { in: ["PENDING_HOD", "PENDING_VETTING", "PENDING_SANCTION", "APPROVED"] }, startDate: { gte: new Date(`${today}T00:00:00Z`), lte: new Date(Date.UTC(y, m, 0)) } },
    });
    expect(s.upcomingThisMonth).toBe(upcoming);

    // A branch admin's summary covers their office only.
    const fca = (await api("GET", "/admin/tours/summary", { token: await login(SABINA) })).body;
    const fcaBranch = await prisma.branch.findUniqueOrThrow({ where: { code: "FCA" } });
    expect(fca.pendingApprovals).toBe(await prisma.tourRequest.count({ where: { branchId: fcaBranch.id, status: { in: ["PENDING_HOD", "PENDING_VETTING", "PENDING_SANCTION"] } } }));

    // The annual budget: HR & Finance may change it; head office admins may not.
    expect((await api("PUT", "/admin/tours/settings", { token: arif, body: { annualTravelBudget: 9_000_000 } })).status).toBe(403);
    const changed = await api("PUT", "/admin/tours/settings", { token: await login(NUSRAT), body: { annualTravelBudget: 8_000_000 } });
    expect(changed.status).toBe(200);
    expect(changed.body).toMatchObject({ annualTravelBudget: 8_000_000, updatedBy: "Nusrat Jahan" });
    const after = (await api("GET", "/admin/tours/summary", { token: arif })).body;
    expect(after.annualBudget).toBe(8_000_000);
    expect(after.utilisationPct).toBe(Math.round((ytd / 8_000_000) * 1000) / 10);
    expect((await prisma.auditLog.findFirst({ where: { action: "tour.settings_changed" } }))?.actorName).toBe("Nusrat Jahan");
  });
});
