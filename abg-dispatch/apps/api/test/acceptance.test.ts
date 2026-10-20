/**
 * The 20 mandatory acceptance tests from the ABG Dispatch brief, run against
 * the real API and a real PostgreSQL database.
 */
import { beforeAll, describe, expect, test } from "bun:test";
import { createHmac } from "crypto";
import { api, book, directoryIds, key, login, resetAndSeed, startApp } from "./helpers";

const RAHIM = "rahim@abg.com.bd"; // sender, Legal, Head Office
const FARHANA = "farhana.islam@abg.com.bd"; // receiver, Factory A
const KARIM = "karim.ahmed@abg.com.bd"; // internal runner
const SHAHIN = "shahin.ahmed@abg.com.bd"; // Farhana's assistant
const NUSRAT = "nusrat.jahan@abg.com.bd"; // unrelated employee
const RAFIQ = "rafiq.islam@abg.com.bd"; // a different runner
const TANVIR = "tanvir.hasan@abg.com.bd"; // HO dispatch officer
const ARIF = "arif.chowdhury@abg.com.bd"; // head office admin
const SABINA = "sabina.yasmin@abg.com.bd"; // Factory A branch admin
const ADMIN = "admin@abg.com.bd"; // super admin

async function notificationsFor(email: string) {
  const res = await api("GET", "/notifications?limit=50", { token: await login(email) });
  expect(res.status).toBe(200);
  return res.body.items as { title: string; body: string; parcelId: string; category: string; sensitive: boolean }[];
}

async function timeline(id: string, email = RAHIM) {
  const res = await api("GET", `/parcels/${id}/timeline`, { token: await login(email) });
  expect(res.status).toBe(200);
  return res.body.events as { eventType: string; actor: { name: string; code: string | null }; at: string; toStatus: string | null; verification: { method: string } | null; metadata: any; id: string }[];
}

async function pickUp(id: string) {
  const k = await login(KARIM);
  expect((await api("POST", `/parcels/${id}/handover/request`, { token: k, body: {} })).status).toBe(200);
  const confirmed = await api("POST", `/parcels/${id}/handover/confirm`, { token: await login(RAHIM), body: { method: "SENDER_APP" } });
  expect(confirmed.status).toBe(200);
  return confirmed.body.parcel;
}

async function arrive(id: string) {
  const res = await api("POST", `/parcels/${id}/arrive`, { token: await login(KARIM), body: {} });
  expect(res.status).toBe(200);
  return res.body.parcel;
}

describe("ABG Dispatch mandatory acceptance tests", () => {
  let main: { parcel: any; handoverPin?: string };

  beforeAll(async () => {
    await startApp();
    await resetAndSeed();
  });

  test("1. An employee books a parcel with title and description; a unique tracking ID and QR are created", async () => {
    main = await book(RAHIM, { title: "Contract Documents", description: "Quarterly supplier agreement requiring director signature and return to Legal." });
    const p = main.parcel;
    expect(p.trackingNumber).toMatch(/^ABG-\d{6}-HO-\d{5}$/);
    expect(p.title).toBe("Contract Documents");
    expect(p.description).toContain("Quarterly supplier agreement");
    expect(p.qrPayload).toMatch(/\/q\/[A-Za-z0-9_-]{24}$/);
    expect(p.qrPayload).not.toContain(p.id);
    expect(main.handoverPin).toMatch(/^\d{6}$/);
    expect(p.status).toBe("AWAITING_PICKUP");
    const again = await book(RAHIM);
    expect(again.parcel.trackingNumber).not.toBe(p.trackingNumber);
  });

  test("2. Farhana is notified immediately after booking", async () => {
    const items = await notificationsFor(FARHANA);
    const n = items.find((x) => x.parcelId === main.parcel.id);
    expect(n?.title).toBe("A parcel has been booked for you");
    expect(n?.body).toContain("Md. Rahim");
    expect(n?.body).toContain(main.parcel.trackingNumber);
  });

  test("3. Only Karim (or authorised operations) can process courier actions", async () => {
    const id = main.parcel.id;
    for (const outsider of [NUSRAT, RAFIQ, SHAHIN]) {
      const res = await api("POST", `/parcels/${id}/handover/request`, { token: await login(outsider), body: {} });
      expect([403, 404]).toContain(res.status);
    }
    const sender = await api("POST", `/parcels/${id}/in-transit`, { token: await login(RAHIM), body: {} });
    expect(sender.status).toBe(403);
    expect(sender.body.code).toBe("NOT_ASSIGNED");
    const karimView = await api("GET", `/parcels/${id}`, { token: await login(KARIM) });
    expect(karimView.body.viewer.actions).toContain("REQUEST_HANDOVER");
  });

  test("4. Karim scans the QR at pickup, Rahim confirms, and the exact actors and server time are recorded", async () => {
    const id = main.parcel.id;
    const scan = await api("POST", "/parcels/scan", { token: await login(KARIM), body: { payload: main.parcel.qrPayload } });
    expect(scan.status).toBe(200);
    expect(scan.body.parcel.id).toBe(id);
    expect(scan.body.suggestedAction).toBe("REQUEST_HANDOVER");

    const before = Date.now();
    expect((await api("POST", `/parcels/${id}/handover/request`, { token: await login(KARIM), body: {} })).status).toBe(200);
    const ask = (await notificationsFor(RAHIM)).find((n) => n.parcelId === id && n.title === "Confirm handover");
    expect(ask?.category).toBe("ACTION_REQUIRED");

    const confirm = await api("POST", `/parcels/${id}/handover/confirm`, {
      token: await login(RAHIM),
      // A wrong phone clock must not become the official time.
      body: { method: "SENDER_APP", deviceTimestamp: "2020-01-01T00:00:00.000Z" },
    });
    expect(confirm.status).toBe(200);
    expect(confirm.body.parcel.status).toBe("PICKED_UP");

    const events = await timeline(id);
    const handover = events.find((e) => e.eventType === "HANDOVER_CONFIRMED")!;
    expect(handover.actor.name).toBe("Md. Rahim");
    expect(handover.verification?.method).toBe("SENDER_APP");
    expect(handover.metadata.to).toBe("Karim Ahmed");
    const at = new Date(handover.at).getTime();
    expect(at).toBeGreaterThanOrEqual(before - 1000);
    expect(at).toBeLessThanOrEqual(Date.now() + 1000);
    expect(events.find((e) => e.eventType === "PICKED_UP")?.toStatus).toBe("PICKED_UP");
    expect(confirm.body.parcel.carrier.name).toBe("Karim Ahmed");
    expect(confirm.body.parcel.carrier.code).toBe("ABG-4832");
  });

  test("5. The parcel appears in the administrator's In Route view", async () => {
    const res = await api("GET", "/admin/parcels?view=IN_ROUTE", { token: await login(TANVIR) });
    expect(res.status).toBe(200);
    expect(res.body.items.map((p: any) => p.id)).toContain(main.parcel.id);
    const kpis = await api("GET", "/admin/dashboard", { token: await login(ARIF) });
    expect(kpis.body.kpis.inRoute).toBeGreaterThanOrEqual(1);
  });

  test("6. Reaching the destination makes it PENDING_RECEIPT — never RECEIVED automatically", async () => {
    const p = await arrive(main.parcel.id);
    expect(p.status).toBe("PENDING_RECEIPT");
    expect(p.milestones.arrivedAt).toBeTruthy();
    expect(p.milestones.receivedAt).toBeNull();
    expect(p.receipt).toBeNull();
    const types = (await timeline(main.parcel.id)).map((e) => e.eventType);
    expect(types).toContain("ARRIVED_AT_DESTINATION");
    expect(types).toContain("PENDING_RECEIPT");
    expect(types).not.toContain("RECEIVED");
    const notice = (await notificationsFor(FARHANA)).find((n) => n.parcelId === main.parcel.id && n.title === "Your parcel has arrived");
    expect(notice?.category).toBe("ACTION_REQUIRED");
  });

  test("7. Farhana accepts with a one-time code; who, ID, date, time and proof are recorded", async () => {
    const id = main.parcel.id;
    const code = await api("POST", `/parcels/${id}/receipt-code`, { token: await login(KARIM), body: {} });
    expect(code.status).toBe(200);
    expect(code.body.sentTo).toMatch(/^017•+\d{3}$/);
    const wrong = await api("POST", `/parcels/${id}/receive`, { token: await login(KARIM), body: { method: "OTP", code: code.body.devOtp === "000000" ? "111111" : "000000" } });
    expect(wrong.status).toBe(400);
    expect(wrong.body.code).toBe("OTP_INVALID");
    const ok = await api("POST", `/parcels/${id}/receive`, { token: await login(KARIM), body: { method: "OTP", code: code.body.devOtp } });
    expect(ok.status).toBe(200);
    const receipt = (await api("GET", `/parcels/${id}`, { token: await login(RAHIM) })).body.receipt;
    expect(receipt.receivedBy.name).toBe("Farhana Islam");
    expect(receipt.receivedBy.employeeCode).toBe("ABG-7231");
    expect(new Date(receipt.receivedAt).getTime()).toBeGreaterThan(Date.now() - 60_000);
    expect(receipt.verification).toBe("OTP");
    expect(receipt.onBehalf).toBe(false);
  });

  test("8. Rahim is told the parcel was delivered and by whom", async () => {
    const n = (await notificationsFor(RAHIM)).find((x) => x.parcelId === main.parcel.id && x.title === "Delivered successfully");
    expect(n?.body).toContain("Received by Farhana Islam");
  });

  test("9. The admin sees it under Received with a complete, immutable timeline", async () => {
    const list = await api("GET", "/admin/parcels?view=RECEIVED", { token: await login(ARIF) });
    expect(list.body.items.map((p: any) => p.id)).toContain(main.parcel.id);
    const events = await timeline(main.parcel.id, ARIF);
    expect(events.map((e) => e.eventType)).toEqual([
      "PARCEL_CREATED",
      "CARRIER_ASSIGNED",
      "HANDOVER_REQUESTED",
      "HANDOVER_CONFIRMED",
      "PICKED_UP",
      "IN_TRANSIT",
      "ARRIVED_AT_DESTINATION",
      "PENDING_RECEIPT",
      "RECEIPT_OTP_SENT",
      "RECEIVED",
    ]);
    const { prisma } = await startApp();
    await expect(Promise.resolve(prisma.$executeRaw`UPDATE "parcel_events" SET "notes" = 'tampered' WHERE "parcelId" = ${main.parcel.id}`)).rejects.toThrow(/append-only/);
    await expect(Promise.resolve(prisma.$executeRaw`DELETE FROM "parcel_events" WHERE "parcelId" = ${main.parcel.id}`)).rejects.toThrow(/append-only/);
  });

  test("10. An employee with no relation to the parcel is refused by the backend", async () => {
    const t = await login(NUSRAT);
    const id = main.parcel.id;
    for (const [method, path, body] of [
      ["GET", `/parcels/${id}`],
      ["GET", `/parcels/${id}/timeline`],
      ["GET", `/parcels/by-tracking/${main.parcel.trackingNumber}`],
      ["POST", `/parcels/${id}/comments`, { body: "hello" }],
      ["POST", `/parcels/${id}/exceptions`, { code: "OTHER", details: "probing" }],
    ] as [string, string, unknown?][]) {
      const res = await api(method, path, { token: t, body });
      expect(res.status).toBe(404);
      expect(JSON.stringify(res.body)).not.toContain("Contract Documents");
    }
    const list = await api("GET", "/parcels?box=ALL&limit=100", { token: t });
    expect(list.body.items.map((p: any) => p.id)).not.toContain(id);
  });

  test("11. A guest carrier verifies their phone and can reach only their own assignment", async () => {
    const { emp } = await directoryIds();
    const guestParcel = await book(RAHIM, {
      deliveryMethod: "GUEST_PERSON",
      classification: "INTERNAL",
      carrier: { type: "GUEST_PERSON", guest: { fullName: "Abul Kashem", phone: "+880 1855-667788", vehicleNumber: "DHAKA METRO-GA 22-1100" } },
      receiverEmployeeId: await emp("ABG-7420"),
    });
    const ask = await api("POST", "/auth/guest/request-code", { body: { phone: "01855667788" } });
    expect(ask.status).toBe(200);
    expect(ask.body.devOtp).toMatch(/^\d{6}$/);
    const unknown = await api("POST", "/auth/guest/request-code", { body: { phone: "01999999999" } });
    expect(unknown.status).toBe(200);
    expect(unknown.body.devOtp).toBeUndefined();
    const verify = await api("POST", "/auth/guest/verify", { body: { phone: "01855667788", code: ask.body.devOtp } });
    expect(verify.status).toBe(200);
    const g = verify.body.accessToken;

    const mine = await api("GET", "/parcels", { token: g });
    expect(mine.body.items.map((p: any) => p.id)).toEqual([guestParcel.parcel.id]);
    expect((await api("GET", `/parcels/${main.parcel.id}`, { token: g })).status).toBe(404);
    expect((await api("GET", "/directory/employees", { token: g })).status).toBe(403);
    expect((await api("GET", "/notifications", { token: g })).status).toBe(403);
    expect((await api("GET", "/admin/parcels", { token: g })).status).toBe(403);
    expect((await api("POST", "/parcels", { token: g, body: {} })).status).toBe(403);

    expect((await api("POST", `/parcels/${guestParcel.parcel.id}/handover/request`, { token: g, body: {} })).status).toBe(200);
    const pin = await api("POST", `/parcels/${guestParcel.parcel.id}/handover/confirm`, { token: g, body: { method: "SENDER_PIN", pin: guestParcel.handoverPin } });
    expect(pin.status).toBe(200);
    expect(pin.body.parcel.status).toBe("PICKED_UP");
    expect((await timeline(guestParcel.parcel.id)).find((e) => e.eventType === "PICKED_UP")?.actor.name).toBe("Abul Kashem");
  });

  test("12. An external courier's provider and tracking number live in the same ABG record", async () => {
    const { prisma } = await startApp();
    const pathao = await prisma.courierProvider.findUniqueOrThrow({ where: { code: "PATHAO" } });
    const ext = await book(RAHIM, {
      deliveryMethod: "EXTERNAL_COURIER",
      classification: "INTERNAL",
      carrier: { type: "EXTERNAL_COURIER", external: { providerId: pathao.id, trackingNumber: "DT991020ABC12", riderName: "Sohel Rana", riderPhone: "01944112233" } },
    });
    expect(ext.handoverPin).toBeUndefined();
    const p = (await api("GET", `/parcels/${ext.parcel.id}`, { token: await login(RAHIM) })).body;
    expect(p.carrier.type).toBe("EXTERNAL_COURIER");
    expect(p.carrier.provider.code).toBe("PATHAO");
    expect(p.carrier.externalTrackingNumber).toBe("DT991020ABC12");
    expect(p.trackingNumber).toMatch(/^ABG-/);
    const search = await api("GET", "/admin/parcels?q=DT991020ABC12", { token: await login(ARIF) });
    expect(search.body.items.map((x: any) => x.id)).toEqual([ext.parcel.id]);
    (globalThis as any).__externalParcel = ext.parcel.id;
  });

  test("13. When the receiver is away, an assistant receives on her behalf and is recorded separately", async () => {
    const p = await book(RAHIM, { title: "Lease Renewal Draft" });
    await pickUp(p.parcel.id);
    await arrive(p.parcel.id);
    const s = await login(SHAHIN);
    // Without the parcel in hand, Shahin cannot even see it.
    expect((await api("GET", `/parcels/${p.parcel.id}`, { token: s })).status).toBe(404);
    expect((await api("POST", `/parcels/${p.parcel.id}/receive`, { token: s, body: { method: "APP_CONFIRMATION", onBehalf: { reason: "Covering for Farhana" } } })).status).toBe(404);
    // The courier hands him the parcel; he scans its label.
    const label = p.parcel.qrPayload as string;
    const scan = await api("POST", "/parcels/scan", { token: s, body: { payload: label } });
    expect(scan.status).toBe(200);
    expect(scan.body.suggestedAction).toBe("RECEIVE_ON_BEHALF");
    expect(scan.body.parcel.viewer.relation).toBe("DESTINATION_COLLEAGUE");
    expect(scan.body.parcel.description).not.toContain("supplier agreement");
    const noReason = await api("POST", `/parcels/${p.parcel.id}/receive`, { token: s, body: { method: "QR_CONFIRMATION", qrPayload: label } });
    expect(noReason.status).toBe(400);
    expect(noReason.body.code).toBe("REASON_REQUIRED");
    const res = await api("POST", `/parcels/${p.parcel.id}/receive`, {
      token: s,
      body: { method: "QR_CONFIRMATION", qrPayload: label, onBehalf: { reason: "Farhana is in the production review meeting", relationship: "Assistant" } },
    });
    expect(res.status).toBe(200);
    const receipt = (await api("GET", `/parcels/${p.parcel.id}`, { token: await login(RAHIM) })).body;
    expect(receipt.receiver.employee.fullName).toBe("Farhana Islam");
    expect(receipt.receipt.receivedBy.name).toBe("Shahin Ahmed");
    expect(receipt.receipt.receivedBy.employeeCode).toBe("ABG-7310");
    expect(receipt.receipt.onBehalf).toBe(true);
    expect(receipt.receipt.onBehalfReason).toContain("production review");
    expect(receipt.receipt.verification).toBe("QR_CONFIRMATION");
    const told = (await notificationsFor(FARHANA)).find((n) => n.parcelId === p.parcel.id && n.title === "Received on your behalf");
    expect(told?.body).toContain("Shahin Ahmed");
  });

  test("14. A parcel left in Pending Receipt past its SLA reminds the receiver, then escalates to the branch admin", async () => {
    const { prisma } = await startApp();
    const p = await book(RAHIM, { title: "Approval File — Line 4", priority: "NORMAL" });
    await pickUp(p.parcel.id);
    await arrive(p.parcel.id);
    const superAdmin = await login(ADMIN);

    await prisma.parcel.update({ where: { id: p.parcel.id }, data: { pendingReceiptAt: new Date(Date.now() - 70 * 60_000) } });
    expect((await api("POST", "/admin/sla/run", { token: superAdmin })).status).toBe(200);
    const reminder = (await notificationsFor(FARHANA)).find((n) => n.parcelId === p.parcel.id && n.title === "Waiting for your receipt");
    expect(reminder).toBeTruthy();
    expect((await notificationsFor(SABINA)).find((n) => n.parcelId === p.parcel.id)).toBeUndefined();

    await prisma.parcel.update({ where: { id: p.parcel.id }, data: { pendingReceiptAt: new Date(Date.now() - 130 * 60_000) } });
    await api("POST", "/admin/sla/run", { token: superAdmin });
    const escalation = (await notificationsFor(SABINA)).find((n) => n.parcelId === p.parcel.id);
    expect(escalation?.title).toBe("Receipt overdue");
    const state = (await api("GET", `/parcels/${p.parcel.id}`, { token: await login(RAHIM) })).body;
    expect(state.isOverdue).toBe(true);
    const types = (await timeline(p.parcel.id)).map((e) => e.eventType);
    expect(types).toContain("SLA_REMINDER");
    expect(types).toContain("SLA_ESCALATED");

    // Running again does not notify twice.
    await api("POST", "/admin/sla/run", { token: superAdmin });
    expect((await notificationsFor(SABINA)).filter((n) => n.parcelId === p.parcel.id)).toHaveLength(1);
  });

  test("15. A pickup captured offline syncs exactly once when the connection returns", async () => {
    const p = await book(RAHIM, { title: "Drawings for Line 3" });
    const k = await login(KARIM);
    const offlineKey = key("offline");
    const body = { method: "SENDER_PIN", pin: p.handoverPin, deviceTimestamp: new Date(Date.now() - 4 * 60_000).toISOString(), latitude: 23.8193, longitude: 90.4526 };
    const first = await api("POST", `/parcels/${p.parcel.id}/handover/confirm`, { token: k, body, headers: { "idempotency-key": offlineKey } });
    expect(first.status).toBe(200);
    // The phone never saw the response and retries the queued action.
    const retry = await api("POST", `/parcels/${p.parcel.id}/handover/confirm`, { token: k, body, headers: { "idempotency-key": offlineKey } });
    expect(retry.status).toBe(200);
    expect(retry.headers.get("idempotent-replay")).toBe("true");
    const events = await timeline(p.parcel.id);
    expect(events.filter((e) => e.eventType === "PICKED_UP")).toHaveLength(1);
    expect(events.filter((e) => e.eventType === "HANDOVER_CONFIRMED")).toHaveLength(1);
    const { prisma } = await startApp();
    const handover = await prisma.parcelEvent.findFirstOrThrow({ where: { parcelId: p.parcel.id, eventType: "HANDOVER_CONFIRMED" } });
    expect(handover.deviceTimestamp?.getTime()).toBe(new Date(body.deviceTimestamp).getTime());
    expect(handover.serverTimestamp.getTime()).toBeGreaterThan(handover.deviceTimestamp!.getTime());
  });

  test("16. A double-tapped Receive creates exactly one RECEIVED event", async () => {
    const p = await book(RAHIM, { title: "Signed NDA" });
    await pickUp(p.parcel.id);
    await arrive(p.parcel.id);
    const f = await login(FARHANA);
    const [a, b] = await Promise.all([
      api("POST", `/parcels/${p.parcel.id}/receive`, { token: f, body: { method: "APP_CONFIRMATION" }, headers: { "idempotency-key": key("tap") } }),
      api("POST", `/parcels/${p.parcel.id}/receive`, { token: f, body: { method: "APP_CONFIRMATION" }, headers: { "idempotency-key": key("tap") } }),
    ]);
    expect([a.status, b.status].sort()).toEqual([200, 409]);
    const loser = a.status === 409 ? a : b;
    expect(loser.body.code).toBe("ALREADY_RECEIVED");
    expect(loser.body.message).toMatch(/already received by Farhana Islam at \d{1,2}:\d{2} [AP]M/);
    expect((await timeline(p.parcel.id)).filter((e) => e.eventType === "RECEIVED")).toHaveLength(1);
  });

  test("17. An admin correction keeps the original event and logs the change", async () => {
    const before = await timeline(main.parcel.id, ARIF);
    const received = before.find((e) => e.eventType === "RECEIVED")!;
    const res = await api("POST", `/parcels/${main.parcel.id}/corrections`, {
      token: await login(ARIF),
      body: { eventId: received.id, field: "description", value: "Quarterly supplier agreement — two originals, director signature required.", reason: "Sender reported the copy count was missing." },
    });
    expect(res.status).toBe(200);
    expect(res.body.parcel.description).toContain("two originals");
    const after = await timeline(main.parcel.id, ARIF);
    expect(after.slice(0, before.length)).toEqual(before.map((e) => (e.id === received.id ? { ...e, correctedBy: expect.any(Array) } : e)));
    const correction = after.at(-1)!;
    expect(correction.eventType).toBe("CORRECTION_ADDED");
    expect(correction.metadata.before).toContain("Quarterly supplier agreement requiring");
    expect(correction.metadata.after).toContain("two originals");
    expect(after.find((e) => e.id === received.id)?.verification?.method).toBe("OTP");
    const audit = await api("GET", `/admin/audit-logs?objectId=${main.parcel.id}&action=parcel.corrected`, { token: await login(ARIF) });
    expect(audit.body.items[0].actorName).toBe("Arif Chowdhury");
    expect((await api("POST", `/parcels/${main.parcel.id}/corrections`, { token: await login(RAHIM), body: { field: "title", value: "x".repeat(5), reason: "self-serve edit" } })).status).toBe(403);
  });

  test("18. A Highly Confidential parcel's notification reveals nothing on the lock screen", async () => {
    const secret = await book(RAHIM, { title: "Board Acquisition Agreement for Company X", description: "Term sheet and SPA draft for the acquisition.", classification: "HIGHLY_CONFIDENTIAL" });
    const n = (await notificationsFor(FARHANA)).find((x) => x.parcelId === secret.parcel.id)!;
    expect(n.sensitive).toBe(true);
    expect(`${n.title} ${n.body}`).not.toContain("Acquisition");
    expect(`${n.title} ${n.body}`).not.toContain("Company X");
    expect(n.body).toContain(secret.parcel.trackingNumber);
    const karimView = (await api("GET", `/parcels/${secret.parcel.id}`, { token: await login(KARIM) })).body;
    expect(karimView.title).toBe("Highly confidential dispatch");
    expect(karimView.description).not.toContain("SPA");
    const adminView = (await api("GET", `/parcels/${secret.parcel.id}`, { token: await login(ARIF) })).body;
    expect(adminView.title).toBe("Highly confidential dispatch");
    const search = await api("GET", "/admin/parcels?q=Acquisition", { token: await login(ARIF) });
    expect(search.body.items).toHaveLength(0);
  });

  test("19. A repeated courier webhook is ignored the second time", async () => {
    const parcelId = (globalThis as any).__externalParcel as string;
    const payload = JSON.stringify({ event_id: "evt-pathao-0001", consignment_id: "DT991020ABC12", order_status: "Picked", updated_at: new Date().toISOString() });
    const sig = createHmac("sha256", "test-pathao-secret").update(payload).digest("hex");
    const forged = await api("POST", "/webhooks/couriers/PATHAO", { raw: payload, headers: { "x-pathao-signature": "deadbeef" } });
    expect(forged.status).toBe(401);
    const first = await api("POST", "/webhooks/couriers/PATHAO", { raw: payload, headers: { "x-pathao-signature": sig } });
    expect(first.status).toBe(200);
    expect(first.body.results[0].outcome).toBe("APPLIED");
    const second = await api("POST", "/webhooks/couriers/PATHAO", { raw: payload, headers: { "x-pathao-signature": sig } });
    expect(second.status).toBe(200);
    expect(second.body.results[0].outcome).toBe("DUPLICATE");
    const events = await timeline(parcelId);
    expect(events.filter((e) => e.eventType === "EXTERNAL_STATUS_UPDATE")).toHaveLength(1);
    expect(events.filter((e) => e.eventType === "PICKED_UP")).toHaveLength(1);
    expect((await api("GET", `/parcels/${parcelId}`, { token: await login(RAHIM) })).body.status).toBe("PICKED_UP");

    // Provider "Delivered" reaches the office, but the ABG receiver still has to confirm.
    const delivered = JSON.stringify({ event_id: "evt-pathao-0002", consignment_id: "DT991020ABC12", order_status: "Delivered" });
    await api("POST", "/webhooks/couriers/PATHAO", { raw: delivered, headers: { "x-pathao-signature": createHmac("sha256", "test-pathao-secret").update(delivered).digest("hex") } });
    expect((await api("GET", `/parcels/${parcelId}`, { token: await login(RAHIM) })).body.status).toBe("PENDING_RECEIPT");
  });

  test("20. Filtering In Route + Factory A destination + today returns exactly the right parcels", async () => {
    const { prisma } = await startApp();
    const { branch } = await directoryIds();
    const fca = await branch("FCA");
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka" }).format(new Date());
    const inRoute = await book(RAHIM, { title: "Filter check — in route" });
    await pickUp(inRoute.parcel.id);
    await book(RAHIM, { title: "Filter check — awaiting pickup" });

    const res = await api("GET", `/admin/parcels?view=IN_ROUTE&destinationBranchId=${fca}&dateFrom=${today}&dateTo=${today}&limit=100`, { token: await login(ARIF) });
    expect(res.status).toBe(200);
    const start = new Date(`${today}T00:00:00+06:00`);
    const expected = await prisma.parcel.findMany({
      where: { status: { in: ["PICKED_UP", "IN_TRANSIT"] }, destinationBranchId: fca, createdAt: { gte: start, lt: new Date(start.getTime() + 86_400_000) } },
      select: { id: true },
    });
    expect(res.body.items.map((p: any) => p.id).sort()).toEqual(expected.map((p) => p.id).sort());
    expect(res.body.items.map((p: any) => p.id)).toContain(inRoute.parcel.id);
    expect(res.body.items.every((p: any) => ["PICKED_UP", "IN_TRANSIT"].includes(p.status) && p.destinationCode === "FCA")).toBe(true);
  });
});
