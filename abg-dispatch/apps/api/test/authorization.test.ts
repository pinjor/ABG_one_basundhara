import { beforeAll, describe, expect, test } from "bun:test";
import { STATUS_TRANSITIONS, ParcelStatus } from "@abg-dispatch/shared";
import { api, book, clearTokens, directoryIds, login, resetAndSeed, startApp } from "./helpers";
import { normalizeExternal } from "../src/couriers/status-map";

const RAHIM = "rahim@abg.com.bd";
const KARIM = "karim.ahmed@abg.com.bd";
const FARHANA = "farhana.islam@abg.com.bd";
const SABINA = "sabina.yasmin@abg.com.bd"; // Factory A branch admin
const KAMRUL = "kamrul.hasan@abg.com.bd"; // Factory A dispatch desk
const TAHMINA = "tahmina.begum@abg.com.bd"; // Factory B branch admin
const AUDITOR = "mahmuda.akter@abg.com.bd";
const ARIF = "arif.chowdhury@abg.com.bd";

describe("object-level authorisation", () => {
  let parcel: any;

  beforeAll(async () => {
    await startApp();
    await resetAndSeed();
    clearTokens();
    parcel = (await book(RAHIM)).parcel; // HO → Factory A, confidential
  });

  test("branch admins see parcels touching their branch, and nothing else", async () => {
    expect((await api("GET", `/parcels/${parcel.id}`, { token: await login(SABINA) })).status).toBe(200);
    expect((await api("GET", `/parcels/${parcel.id}`, { token: await login(TAHMINA) })).status).toBe(404);
    const list = await api("GET", "/admin/parcels?limit=100", { token: await login(TAHMINA) });
    const { branch } = await directoryIds();
    const fcb = await branch("FCB");
    const { prisma } = await startApp();
    const rows = await prisma.parcel.findMany({ where: { id: { in: list.body.items.map((p: any) => p.id) } } });
    expect(rows.every((p) => p.originBranchId === fcb || p.destinationBranchId === fcb)).toBe(true);
  });

  test("a confidential description is hidden from the courier and branch operations", async () => {
    const karim = (await api("GET", `/parcels/${parcel.id}`, { token: await login(KARIM) })).body;
    expect(karim.contentAccess).toBe("TITLE_ONLY");
    expect(karim.title).toBe("Contract Documents");
    expect(karim.description).not.toContain("supplier");
    const sabina = (await api("GET", `/parcels/${parcel.id}`, { token: await login(SABINA) })).body;
    expect(sabina.description).not.toContain("supplier");
    const arif = (await api("GET", `/parcels/${parcel.id}`, { token: await login(ARIF) })).body;
    expect(arif.description).toContain("supplier");
  });

  test("the receiver never receives the QR token, so a QR receipt proves physical possession", async () => {
    const farhana = (await api("GET", `/parcels/${parcel.id}`, { token: await login(FARHANA) })).body;
    expect(farhana.qrPayload).toBeNull();
    expect((await api("GET", `/parcels/${parcel.id}`, { token: await login(RAHIM) })).body.qrPayload).toBeTruthy();
  });

  test("auditors read everything and change nothing", async () => {
    const t = await login(AUDITOR);
    expect((await api("GET", `/parcels/${parcel.id}`, { token: t })).status).toBe(200);
    expect((await api("GET", "/admin/audit-logs", { token: t })).status).toBe(200);
    const comment = await api("POST", `/parcels/${parcel.id}/comments`, { token: t, body: { body: "audit note" } });
    expect(comment.status).toBe(403);
    expect(comment.body.code).toBe("READ_ONLY");
    expect((await api("POST", "/parcels", { token: t, body: {} })).status).toBe(403);
    expect((await api("GET", `/parcels/${parcel.id}`, { token: t })).body.viewer.actions).toEqual([]);
    const audit = await api("GET", `/parcels/${parcel.id}/timeline`, { token: t });
    expect(audit.body.events[0].coordinates).toBeNull();
  });

  test("employees cannot reach admin endpoints", async () => {
    const t = await login(RAHIM);
    for (const path of ["/admin/parcels", "/admin/dashboard", "/admin/analytics", "/admin/users", "/admin/audit-logs"]) {
      expect((await api("GET", path, { token: t })).status).toBe(403);
    }
  });

  test("branch dispatch can confirm a handover only in their own branch", async () => {
    const hoParcel = (await book(RAHIM, { classification: "INTERNAL" })).parcel;
    const res = await api("POST", `/parcels/${hoParcel.id}/handover/confirm`, { token: await login(KAMRUL), body: { method: "DISPATCH_OFFICER" } });
    expect(res.status).toBe(403);
    const ok = await api("POST", `/parcels/${hoParcel.id}/handover/confirm`, { token: await login("tanvir.hasan@abg.com.bd"), body: { method: "DISPATCH_OFFICER" } });
    expect(ok.status).toBe(200);
    expect(ok.body.parcel.status).toBe("PICKED_UP");
  });

  test("clients cannot set a status directly", async () => {
    const { cat, emp } = await directoryIds();
    const res = await api("POST", "/parcels", {
      token: await login(RAHIM),
      body: { title: "x title", description: "desc", categoryId: await cat("OTHER"), classification: "NORMAL", priority: "NORMAL", deliveryMethod: "INTERNAL_EMPLOYEE", receiverType: "EMPLOYEE", receiverEmployeeId: await emp("ABG-7231"), status: "RECEIVED" },
    });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("VALIDATION");
  });

  test("receiving before arrival is refused with a clear reason", async () => {
    const p = (await book(RAHIM)).parcel;
    const res = await api("POST", `/parcels/${p.id}/receive`, { token: await login(FARHANA), body: { method: "APP_CONFIRMATION" } });
    expect(res.status).toBe(409);
    expect(res.body.message).toBe("Parcel cannot be received because it has not reached the destination.");
  });

  test("a parcel already with the courier cannot be cancelled", async () => {
    const p = await book(RAHIM, { classification: "INTERNAL" });
    await api("POST", `/parcels/${p.parcel.id}/handover/confirm`, { token: await login(KARIM), body: { method: "SENDER_PIN", pin: p.handoverPin } });
    const res = await api("POST", `/parcels/${p.parcel.id}/cancel`, { token: await login(RAHIM), body: { reason: "Changed my mind" } });
    expect(res.status).toBe(409);
    expect(res.body.message).toContain("Request a return instead");
  });

  test("wrong handover PINs lock out after five attempts", async () => {
    const p = await book(RAHIM, { classification: "INTERNAL" });
    const t = await login(KARIM);
    for (let i = 0; i < 5; i++) {
      const res = await api("POST", `/parcels/${p.parcel.id}/handover/confirm`, { token: t, body: { method: "SENDER_PIN", pin: p.handoverPin === "000000" ? "111111" : "000000" } });
      expect(res.status).toBe(400);
    }
    const locked = await api("POST", `/parcels/${p.parcel.id}/handover/confirm`, { token: t, body: { method: "SENDER_PIN", pin: p.handoverPin } });
    expect(locked.status).toBe(429);
    expect(locked.body.code).toBe("PIN_LOCKED");
  });

  test("a deactivated user's sessions stop working immediately", async () => {
    const t = await login("laila.rahman@abg.com.bd");
    expect((await api("GET", "/auth/me", { token: t })).status).toBe(200);
    const { prisma } = await startApp();
    const user = await prisma.user.findUniqueOrThrow({ where: { email: "laila.rahman@abg.com.bd" } });
    expect((await api("POST", `/admin/users/${user.id}/deactivate`, { token: await login("admin@abg.com.bd") })).status).toBe(200);
    const after = await api("GET", "/auth/me", { token: t });
    expect(after.status).toBe(401);
    expect(after.body.code).toBe("SESSION_REVOKED");
  });

  test("repeated wrong passwords lock the account", async () => {
    for (let i = 0; i < 5; i++) await api("POST", "/auth/login", { body: { identifier: "jamal.uddin@abg.com.bd", password: "wrong-password" } });
    const res = await api("POST", "/auth/login", { body: { identifier: "jamal.uddin@abg.com.bd", password: "Dispatch@2026" } });
    expect(res.status).toBe(401);
    expect(res.body.code).toBe("ACCOUNT_LOCKED");
  });

  test("refresh tokens rotate and old ones stop working", async () => {
    const first = await api("POST", "/auth/login", { body: { identifier: "ABG-2055", password: "Dispatch@2026" } });
    const r1 = await api("POST", "/auth/refresh", { body: { refreshToken: first.body.refreshToken } });
    expect(r1.status).toBe(200);
    expect((await api("POST", "/auth/refresh", { body: { refreshToken: first.body.refreshToken } })).status).toBe(401);
  });

  test("the list filter and the per-parcel check agree for every seeded user", async () => {
    const { prisma, app } = await startApp();
    const { ParcelAccessService } = await import("../src/parcels/parcel-access.service");
    const { ActorLoaderService } = await import("../src/auth/actor-loader.service");
    const { ACCESS_SELECT } = await import("../src/parcels/parcel-access.service");
    const access = app.get(ParcelAccessService);
    const loader = app.get(ActorLoaderService);
    const all = await prisma.parcel.findMany({ select: ACCESS_SELECT });
    const users = await prisma.user.findMany({ include: { roles: true, employee: true } });
    for (const u of users) {
      const actor = loader.toActor(u, "test", false);
      const viaWhere = new Set((await prisma.parcel.findMany({ where: access.visibleWhere(actor), select: { id: true } })).map((p) => p.id));
      const viaCheck = new Set(all.filter((p) => access.relation(actor, p)).map((p) => p.id));
      expect([...viaWhere].sort()).toEqual([...viaCheck].sort());
    }
  });
});

describe("ledger integrity in the database", () => {
  test("the transition table in PostgreSQL matches the shared state machine", async () => {
    const { prisma } = await startApp();
    const rows = await prisma.$queryRaw<{ fromStatus: string; toStatus: string }[]>`SELECT "fromStatus", "toStatus" FROM "parcel_status_transitions"`;
    const db = rows.map((r) => `${r.fromStatus}>${r.toStatus}`).sort();
    const shared = Object.entries(STATUS_TRANSITIONS).flatMap(([from, tos]) => tos.map((to) => `${from}>${to}`)).sort();
    expect(db).toEqual(shared);
  });

  test("an invalid status change is rejected even by a direct SQL update", async () => {
    const { prisma } = await startApp();
    const p = await prisma.parcel.findFirstOrThrow({ where: { status: ParcelStatus.IN_TRANSIT } });
    await expect(Promise.resolve(prisma.$executeRaw`UPDATE "parcels" SET status = 'RECEIVED' WHERE id = ${p.id}`)).rejects.toThrow();
    await expect(Promise.resolve(prisma.$executeRaw`UPDATE "parcels" SET status = 'CANCELLED' WHERE id = ${p.id}`)).rejects.toThrow(/Invalid parcel status transition/);
  });

  test("RECEIVED requires a receiver, a time and a verification method", async () => {
    const { prisma } = await startApp();
    const p = await prisma.parcel.findFirstOrThrow({ where: { status: ParcelStatus.PENDING_RECEIPT } });
    await expect(Promise.resolve(prisma.$executeRaw`UPDATE "parcels" SET status = 'RECEIVED' WHERE id = ${p.id}`)).rejects.toThrow(/parcels_received_has_receiver/);
  });

  test("proofs and audit entries cannot be altered", async () => {
    const { prisma } = await startApp();
    await expect(Promise.resolve(prisma.$executeRaw`UPDATE "parcel_proofs" SET type = 'ADMIN_OVERRIDE'`)).rejects.toThrow(/append-only/);
    await expect(Promise.resolve(prisma.$executeRaw`DELETE FROM "audit_logs"`)).rejects.toThrow(/append-only/);
  });

  test("event sequences are gap-free per parcel", async () => {
    const { prisma } = await startApp();
    const gaps = await prisma.$queryRaw<{ n: bigint }[]>`
      SELECT count(*) AS n FROM (
        SELECT "parcelId", max(sequence) AS mx, count(*) AS c FROM "parcel_events" GROUP BY 1
      ) t WHERE mx <> c`;
    expect(Number(gaps[0].n)).toBe(0);
  });
});

describe("courier status normalisation", () => {
  test("maps each provider's vocabulary onto ABG statuses", () => {
    expect(normalizeExternal("PATHAO", "order.picked")).toBe("PICKED_UP");
    expect(normalizeExternal("PATHAO", "At_the_Sorting_HUB")).toBe("IN_TRANSIT");
    expect(normalizeExternal("PATHAO", "Delivered")).toBe("DELIVERED");
    expect(normalizeExternal("REDX", "delivery-in-progress")).toBe("OUT_FOR_DELIVERY");
    expect(normalizeExternal("REDX", "agent-returning")).toBe("RETURNING");
    expect(normalizeExternal("STEADFAST", "delivered_approval_pending")).toBe("DELIVERED");
    expect(normalizeExternal("STEADFAST", "hold")).toBe("ON_HOLD");
    expect(normalizeExternal("OTHER", "Out for delivery")).toBe("OUT_FOR_DELIVERY");
    expect(normalizeExternal("OTHER", "something odd")).toBeNull();
  });
});
