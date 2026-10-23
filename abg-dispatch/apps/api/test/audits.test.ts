import { beforeAll, describe, expect, test } from "bun:test";
import { api, clearTokens, key, login, resetAndSeed, startApp } from "./helpers";

const SHIRIN = "shirin.akhter@abg.com.bd"; // Compliance: plans and runs audits group-wide
const ARIF = "arif.chowdhury@abg.com.bd"; // Head office admin: manages too
const TAHMINA = "tahmina.begum@abg.com.bd"; // Factory B branch admin: reads Factory B's audits
const SABINA = "sabina.yasmin@abg.com.bd"; // Factory A branch admin
const IMRAN = "imran.hossain@abg.com.bd"; // Factory B production manager: owns corrective actions
const RAHIM = "rahim@abg.com.bd";
const AUDITOR = "mahmuda.akter@abg.com.bd";
const MD = "md@abg.com.bd";

const dhakaIso = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka", year: "numeric", month: "2-digit", day: "2-digit" });
const day = (n: number) => new Date(Date.parse(`${dhakaIso.format(new Date())}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

let fcb = "";
let fca = "";
let imranId = "";
let rahimId = "";

async function call(identifier: string, method: string, path: string, body?: Record<string, unknown>) {
  return api(method, path, { token: await login(identifier), body, headers: method === "POST" ? { "idempotency-key": key("audit") } : undefined });
}

async function notificationsFor(identifier: string, auditId: string) {
  const items = (await api("GET", "/notifications?limit=100", { token: await login(identifier) })).body.items as any[];
  return items.filter((n) => n.data?.objectId === auditId);
}

const PLAN = { title: "Chemical store follow-up check", type: "COMPLIANCE", scope: "Containment, labelling and the spill kit.", team: ["Shirin Akhter", " shirin akhter "] };

describe("audits", () => {
  beforeAll(async () => {
    const { prisma } = await startApp();
    await resetAndSeed();
    clearTokens();
    fcb = (await prisma.branch.findUniqueOrThrow({ where: { code: "FCB" } })).id;
    fca = (await prisma.branch.findUniqueOrThrow({ where: { code: "FCA" } })).id;
    imranId = (await prisma.user.findUniqueOrThrow({ where: { email: IMRAN } })).id;
    rahimId = (await prisma.user.findUniqueOrThrow({ where: { email: RAHIM } })).id;
  });

  test("an audit is planned, started, findings recorded with owners, fixes verified, and closed", async () => {
    const { prisma } = await startApp();
    const year = Number(day(0).slice(0, 4));
    const seeded = await prisma.audit.count();
    // Only those who manage audits can plan one, and the lead must manage audits too.
    expect((await call(RAHIM, "POST", "/admin/audits", { ...PLAN, branchId: fcb, plannedStart: day(3), plannedEnd: day(3) })).status).toBe(403);
    expect((await call(TAHMINA, "POST", "/admin/audits", { ...PLAN, branchId: fcb, plannedStart: day(3), plannedEnd: day(3) })).status).toBe(403);
    expect((await call(SHIRIN, "POST", "/admin/audits", { ...PLAN, branchId: fcb, plannedStart: day(3), plannedEnd: day(3), leadUserId: rahimId })).body.code).toBe("LEAD_INVALID");
    expect((await call(SHIRIN, "POST", "/admin/audits", { ...PLAN, branchId: fcb, plannedStart: day(3), plannedEnd: day(2) })).body.code).toBe("END_BEFORE_START");

    const planned = await call(SHIRIN, "POST", "/admin/audits", { ...PLAN, branchId: fcb, plannedStart: day(3), plannedEnd: day(3), externalBody: "Bureau Veritas" });
    expect(planned.status).toBe(201);
    const audit = planned.body;
    expect(audit.referenceNumber).toBe(`ABG-AU-${year}-${String(seeded + 1).padStart(3, "0")}`);
    expect(audit).toMatchObject({ status: "PLANNED", team: ["Shirin Akhter"], lead: { name: "Shirin Akhter" }, viewer: { canManage: true } });
    expect(audit.viewer.actions).toEqual(expect.arrayContaining(["START", "CANCEL"]));
    expect((await notificationsFor(TAHMINA, audit.id)).map((n) => n.eventType)).toContain("AUDIT_PLANNED");
    expect(await prisma.auditLog.count({ where: { objectId: audit.id, action: "audit.planned" } })).toBe(1);

    // Findings only once the audit is under way.
    expect((await call(SHIRIN, "POST", `/audits/${audit.id}/findings`, { title: "Drums on the floor", severity: "MAJOR", ownerUserId: imranId })).body.code).toBe("AUDIT_STATE_CONFLICT");
    expect((await call(SHIRIN, "POST", `/audits/${audit.id}/start`)).body.status).toBe("IN_PROGRESS");
    expect((await call(SHIRIN, "POST", `/audits/${audit.id}/findings`, { title: "Drums on the floor", severity: "MAJOR" })).body.code).toBe("OWNER_REQUIRED");
    expect((await call(SHIRIN, "POST", `/audits/${audit.id}/findings`, { title: "Drums on the floor", severity: "MAJOR", ownerUserId: imranId, dueDate: day(-1) })).body.code).toBe("DUE_IN_PAST");

    const withMajor = await call(SHIRIN, "POST", `/audits/${audit.id}/findings`, { title: "Two solvent drums outside the bund", detail: "Next to the loading door.", severity: "MAJOR", clause: "Chemical policy 4.2", area: "Chemical store", ownerUserId: imranId });
    expect(withMajor.status).toBe(200);
    const major = withMajor.body.findings[0];
    expect(major).toMatchObject({ number: "F-01", status: "OPEN", dueDate: day(30), owner: { name: "Imran Hossain" }, overdue: false });
    const toImran = (await notificationsFor(IMRAN, audit.id)).find((n) => n.eventType === "AUDIT_ACTION_ASSIGNED");
    expect(toImran?.category).toBe("ACTION_REQUIRED");
    const withObservation = await call(SHIRIN, "POST", `/audits/${audit.id}/findings`, { title: "Label the spill kit in Bangla too", severity: "OBSERVATION" });
    expect(withObservation.body.findings[1]).toMatchObject({ number: "F-02", status: "NOTED", owner: null, dueDate: null });

    // The owner sees their own finding only, and answers it.
    const asOwner = await call(IMRAN, "GET", `/audits/${audit.id}`);
    expect(asOwner.status).toBe(200);
    expect(asOwner.body.viewer).toMatchObject({ partial: true, canManage: false });
    expect(asOwner.body.findings.map((f: any) => f.number)).toEqual(["F-01"]);
    expect(asOwner.body.findings[0].actions).toEqual(["SUBMIT"]);
    const mine = await call(IMRAN, "GET", "/audits/actions/mine");
    expect((mine.body.items as any[]).map((i) => i.id)).toContain(major.id);
    expect((await call(RAHIM, "GET", `/audits/${audit.id}`)).status).toBe(404);
    expect((await call(RAHIM, "POST", `/audits/findings/${major.id}/submit`, { response: "Done" })).status).toBe(404);
    // Office staff read the whole audit.
    expect((await call(TAHMINA, "GET", `/audits/${audit.id}`)).body.findings.length).toBe(2);

    expect((await call(IMRAN, "POST", `/audits/findings/${major.id}/submit`, { response: "Moved inside the bund." })).body.findings[0].status).toBe("SUBMITTED");
    expect((await notificationsFor(SHIRIN, audit.id)).map((n) => n.eventType)).toContain("AUDIT_ACTION_SUBMITTED");
    expect((await call(SHIRIN, "POST", `/audits/findings/${major.id}/reopen`, {})).body.code).toBe("REASON_REQUIRED");
    const reopened = await call(SHIRIN, "POST", `/audits/findings/${major.id}/reopen`, { note: "Add a drip tray under the tap too." });
    expect(reopened.body.findings[0].status).toBe("OPEN");
    expect((await notificationsFor(IMRAN, audit.id)).map((n) => n.title)).toContain("Corrective action sent back");
    await call(IMRAN, "POST", `/audits/findings/${major.id}/submit`, { response: "Drums moved inside the bund; drip tray fitted under the tap." });

    // Fieldwork ends with the action still waiting for verification: follow-up, and no closing yet.
    const fieldwork = await call(SHIRIN, "POST", `/audits/${audit.id}/complete-fieldwork`, { rating: "NEEDS_IMPROVEMENT", score: 74, conclusion: "Containment improved; verify the drip tray." });
    expect(fieldwork.body).toMatchObject({ status: "FOLLOW_UP", rating: "NEEDS_IMPROVEMENT", score: 74 });
    expect((await call(SHIRIN, "POST", `/audits/${audit.id}/close`)).body.code).toBe("AUDIT_ACTIONS_OPEN");
    // The database refuses it too.
    await expect(Promise.resolve(prisma.$executeRaw`UPDATE "audits" SET "status" = 'CLOSED', "closedAt" = now() WHERE "id" = ${audit.id}`)).rejects.toThrow(/open corrective actions/);

    const verified = await call(SHIRIN, "POST", `/audits/findings/${major.id}/verify`, { note: "Checked on site." });
    expect(verified.body.findings[0]).toMatchObject({ status: "VERIFIED", verifiedByName: "Shirin Akhter" });
    expect(verified.body.viewer.actions).toContain("CLOSE");
    expect((await notificationsFor(IMRAN, audit.id)).map((n) => n.title)).toContain("Corrective action verified");
    const closed = await call(SHIRIN, "POST", `/audits/${audit.id}/close`);
    expect(closed.body.status).toBe("CLOSED");
    expect(closed.body.counts).toMatchObject({ total: 2, verified: 1, noted: 1, open: 0 });
    expect(await prisma.auditLog.count({ where: { objectId: audit.id, action: "audit.closed" } })).toBe(1);
  });

  test("fieldwork with nothing open closes the audit; an audit with findings is not cancelled", async () => {
    const quick = (await call(ARIF, "POST", "/admin/audits", { title: "Petty cash count", type: "FINANCIAL", branchId: fca, plannedStart: day(0), plannedEnd: day(0) })).body;
    await call(ARIF, "POST", `/audits/${quick.id}/start`);
    const done = await call(ARIF, "POST", `/audits/${quick.id}/complete-fieldwork`, { rating: "SATISFACTORY", conclusion: "Cash matches the register." });
    expect(done.body).toMatchObject({ status: "CLOSED", rating: "SATISFACTORY" });

    const withFinding = (await call(ARIF, "POST", "/admin/audits", { title: "Gate log review", type: "INTERNAL", branchId: fca, plannedStart: day(0), plannedEnd: day(0) })).body;
    await call(ARIF, "POST", `/audits/${withFinding.id}/start`);
    await call(ARIF, "POST", `/audits/${withFinding.id}/findings`, { title: "Night shift log not countersigned", severity: "MINOR", ownerUserId: imranId });
    expect((await call(ARIF, "POST", `/audits/${withFinding.id}/cancel`, { note: "Not needed" })).body.code).toBe("AUDIT_HAS_FINDINGS");

    const planned = (await call(ARIF, "POST", "/admin/audits", { title: "Canteen hygiene check", type: "SAFETY", branchId: fca, plannedStart: day(5), plannedEnd: day(5) })).body;
    expect((await call(ARIF, "POST", `/audits/${planned.id}/cancel`, {})).body.code).toBe("REASON_REQUIRED");
    expect((await call(ARIF, "POST", `/audits/${planned.id}/cancel`, { note: "Covered by the buyer audit next week." })).body.status).toBe("CANCELLED");
  });

  test("offices see their own audits; read-only roles change nothing", async () => {
    const fcaOnly = (await call(SABINA, "GET", "/admin/audits?limit=100")).body.items as any[];
    expect(fcaOnly.length).toBeGreaterThan(0);
    expect(fcaOnly.every((a) => a.branch.code === "FCA")).toBe(true);
    const all = (await call(MD, "GET", "/admin/audits?limit=100")).body.items as any[];
    expect(new Set(all.map((a) => a.branch.code)).size).toBeGreaterThan(2);
    const planned = all.find((a) => a.status === "PLANNED");
    const asAuditor = await call(AUDITOR, "GET", `/audits/${planned.id}`);
    expect(asAuditor.status).toBe(200);
    expect(asAuditor.body.viewer.actions).toEqual([]);
    expect((await call(AUDITOR, "POST", `/audits/${planned.id}/start`)).status).toBe(403);
    expect((await call(SABINA, "POST", `/audits/${planned.id}/start`)).status).toBe(planned.branch.code === "FCA" ? 403 : 404);
    expect((await call(RAHIM, "GET", "/admin/audits")).status).toBe(403);
  });

  test("summary counts open, overdue and serious actions", async () => {
    const res = await call(MD, "GET", "/admin/audits/summary");
    expect(res.status).toBe(200);
    expect(res.body.overdueActions).toBeGreaterThanOrEqual(1); // the seeded first-aid box at Factory B
    expect(res.body.criticalOpen).toBeGreaterThanOrEqual(2); // the boiler permit (critical) and Factory B's overtime (major)
    expect(res.body.awaitingVerification).toBeGreaterThanOrEqual(1);
    expect(res.body.upcoming.length).toBeGreaterThanOrEqual(2);
    expect(res.body.openActionsByOffice.FCB).toBeGreaterThanOrEqual(2);
  });

  test("overdue corrective actions alert their owner and the lead once", async () => {
    const { app, prisma } = await startApp();
    const { AuditsService } = await import("../src/audits/audits.service");
    const service = app.get(AuditsService);
    const finding = await prisma.auditFinding.findFirstOrThrow({ where: { status: "OPEN", title: { contains: "PPE issue register" } }, include: { audit: true } });
    await prisma.auditFinding.update({ where: { id: finding.id }, data: { dueDate: new Date(`${day(-3)}T00:00:00Z`), overdueNotifiedAt: null } });
    expect(await service.alertOverdue()).toBeGreaterThanOrEqual(1);
    const owner = (await notificationsFor("farhana.islam@abg.com.bd", finding.auditId)).filter((n) => n.eventType === "AUDIT_ACTION_OVERDUE");
    expect(owner.length).toBe(1);
    expect((await notificationsFor(SHIRIN, finding.auditId)).some((n) => n.eventType === "AUDIT_ACTION_OVERDUE")).toBe(true);
    expect(await service.alertOverdue()).toBe(0);
    const mine = await call("farhana.islam@abg.com.bd", "GET", "/audits/actions/mine");
    expect(mine.body.items[0]).toMatchObject({ id: finding.id, overdue: true });
  });

  test("history is append-only", async () => {
    const { prisma } = await startApp();
    const u = await prisma.auditUpdate.findFirstOrThrow();
    await expect(Promise.resolve(prisma.$executeRaw`UPDATE "audit_updates" SET "note" = 'x' WHERE "id" = ${u.id}`)).rejects.toThrow();
    await expect(Promise.resolve(prisma.$executeRaw`DELETE FROM "audit_updates" WHERE "id" = ${u.id}`)).rejects.toThrow();
    // Observations are noted, never owed; actions always have an owner.
    await expect(Promise.resolve(prisma.$executeRaw`UPDATE "audit_findings" SET "ownerUserId" = NULL WHERE "severity" = 'MAJOR'`)).rejects.toThrow();
  });
});
