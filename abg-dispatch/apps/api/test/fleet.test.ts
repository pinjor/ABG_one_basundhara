import { beforeAll, describe, expect, test } from "bun:test";
import { extractGatePass } from "@abg-dispatch/shared";
import { api, clearTokens, key, login, resetAndSeed, startApp } from "./helpers";

const RAHIM = "rahim@abg.com.bd"; // HO Legal; head of department Farid Uddin
const NUSRAT = "nusrat.jahan@abg.com.bd"; // HO Finance; head of department Farid Uddin
const FARID = "farid.uddin@abg.com.bd"; // HOD for Rahim and Nusrat
const FARHANA = "farhana.islam@abg.com.bd"; // Factory A; head of department Sabina Yasmin
const SHAHIN = "shahin.ahmed@abg.com.bd"; // Factory A employee
const SABINA = "sabina.yasmin@abg.com.bd"; // Factory A branch admin (fleet.view for Factory A)
const JAHANGIR = "jahangir.alam@abg.com.bd"; // fleet manager
const ABUL = "abul.kalam@abg.com.bd"; // driver (HO)
const MIZAN = "mizanur.rahman@abg.com.bd"; // driver (HO)
const SOHEL = "sohel.rana@abg.com.bd"; // driver (Factory A)
const REZAUL = "rezaul.karim@abg.com.bd"; // security, HO reception
const NURUL = "nurul.amin@abg.com.bd"; // security, Factory A gate
const ARIF = "arif.chowdhury@abg.com.bd"; // head office admin
const AUDITOR = "mahmuda.akter@abg.com.bd";
const CHAIRMAN = "chairman@abg.com.bd"; // nobody above him

const inHours = (h: number) => new Date(Date.now() + h * 3_600_000).toISOString();

async function requestCar(email: string, overrides: Record<string, unknown> = {}, idempotencyKey = key("pc")) {
  return api("POST", "/pool-car/requisitions", {
    token: await login(email),
    headers: { "idempotency-key": idempotencyKey },
    body: {
      tripType: "ROUND_TRIP",
      purpose: "Client meeting at the Gulshan office",
      pickupLocation: "ABG Head Office, Bashundhara R/A",
      dropLocation: "Road 90, Gulshan-2",
      pickupAt: inHours(30),
      returnAt: inHours(34),
      passengers: [{ name: "Md. Rahim", phone: "01712204100" }],
      passengerCount: 1,
      ...overrides,
    },
  });
}

async function notificationsFor(email: string) {
  return (await api("GET", "/notifications?limit=50", { token: await login(email) })).body.items as any[];
}

async function register() {
  const { prisma } = await startApp();
  const vehicle = async (reg: string) => (await prisma.vehicle.findUniqueOrThrow({ where: { registrationNumber: reg } })).id;
  const driver = async (name: string) => (await prisma.driver.findFirstOrThrow({ where: { fullName: name } })).id;
  return {
    premio: await vehicle("Dhaka Metro-GA 27-4512"),
    noah: await vehicle("Dhaka Metro-CHA 15-2234"),
    hiace: await vehicle("Dhaka Metro-CHA 19-0871"),
    pajero: await vehicle("Dhaka Metro-GHA 11-3378"),
    prado: await vehicle("Dhaka Metro-GHA 13-0907"),
    axio: await vehicle("Narayanganj-GA 11-2087"),
    abul: await driver("Abul Kalam"),
    mizan: await driver("Mizanur Rahman"),
    sohel: await driver("Sohel Rana"),
    delwar: await driver("Delwar Hossain"),
  };
}

const tokenOf = (payload: string) => extractGatePass(payload)!.token;

describe("pool car requisitions", () => {
  let fleet: Awaited<ReturnType<typeof register>>;
  /** Rahim's urgent round trip: Hiace + Delwar, later moved to the Prado. */
  let a: any;
  /** Nusrat's team trip for five, overlapping A. */
  let b: any;

  beforeAll(async () => {
    await startApp();
    await resetAndSeed();
    clearTokens();
    fleet = await register();
  });

  test("an employee requests a car and their head of department is told — urgent ones say so", async () => {
    const res = await requestCar(RAHIM, {
      urgent: true,
      vehiclePreference: "MICROBUS",
      passengerCount: 3,
      passengers: [{ name: "Md. Rahim", phone: "01712204100" }, { name: "Advocate Selina Haque" }],
      purpose: "Site inspection with the external counsel",
    });
    expect(res.status).toBe(201);
    a = res.body;
    expect(a.referenceNumber).toMatch(/^PC-\d{6}-HO-\d{3}$/);
    expect(a).toMatchObject({ status: "PENDING_HOD", urgent: true, passengerCount: 3, vehiclePreference: "MICROBUS", gatePass: null, vehicle: null, driver: null });
    expect(a.approver.name).toBe("Farid Uddin");
    expect(a.passengers).toEqual([{ name: "Md. Rahim", phone: "01712204100" }, { name: "Advocate Selina Haque", phone: null }]);
    expect(a.pipeline.steps.map((s: any) => s.state)).toEqual(["CURRENT", "UPCOMING", "UPCOMING", "UPCOMING", "UPCOMING"]);
    expect(a.viewer).toMatchObject({ isRequester: true, actions: ["CANCEL"] });
    expect(a.updates[0]).toMatchObject({ type: "SUBMITTED", toStatus: "PENDING_HOD", actor: "Md. Rahim" });

    const told = (await notificationsFor(FARID)).find((n) => n.data?.objectId === a.id);
    expect(told).toMatchObject({ category: "ACTION_REQUIRED", eventType: "CAR_REQUESTED", title: "Urgent: Pool car request to approve" });
    expect(told.data.route).toBe(`/pool-car/${a.id}`);

    const inbox = await api("GET", "/pool-car/approvals", { token: await login(FARID) });
    const row = inbox.body.items.find((r: any) => r.id === a.id);
    expect(row).toMatchObject({ referenceNumber: a.referenceNumber, title: "Site inspection with the external counsel", tripType: "ROUND_TRIP", passengerCount: 3, urgent: true, status: "PENDING_HOD", awaiting: "HOD" });
    expect(row.requester).toEqual({ name: "Md. Rahim", designation: "Senior Legal Officer", department: "Legal" });
    // Urgent requests come first in the inbox.
    expect(inbox.body.items[0].urgent).toBe(true);

    const mine = await api("GET", "/pool-car/requisitions/mine?state=open", { token: await login(RAHIM) });
    expect(mine.body.items[0]).toMatchObject({ id: a.id, awaiting: "HOD", mine: true });
  });

  test("requests are checked: times, return for round trips, passengers and a real approver", async () => {
    expect((await requestCar(RAHIM, { pickupAt: inHours(-3), returnAt: inHours(-1) })).body.code).toBe("PICKUP_IN_PAST");
    expect((await requestCar(RAHIM, { returnAt: undefined })).body.code).toBe("RETURN_REQUIRED");
    expect((await requestCar(RAHIM, { returnAt: inHours(29) })).body.code).toBe("RETURN_BEFORE_PICKUP");
    expect((await requestCar(RAHIM, { passengerCount: 0 })).status).toBe(400);
    expect((await requestCar(RAHIM, { passengerCount: 15 })).status).toBe(400);
    expect((await requestCar(RAHIM, { passengers: [{ name: "One" }, { name: "Two" }], passengerCount: 1 })).body.code).toBe("PASSENGERS_EXCEED_COUNT");
    // A one-way trip does not need a return time.
    expect((await requestCar(SHAHIN, { tripType: "ONE_WAY", returnAt: undefined })).status).toBe(201);

    const { prisma } = await startApp();
    const taslima = await prisma.employee.findUniqueOrThrow({ where: { employeeCode: "ABG-2120" } }); // no app account
    const rahim = await prisma.employee.findUniqueOrThrow({ where: { employeeCode: "ABG-2041" } });
    expect((await requestCar(RAHIM, { approverEmployeeId: taslima.id })).body.code).toBe("APPROVER_HAS_NO_ACCOUNT");
    expect((await requestCar(RAHIM, { approverEmployeeId: rahim.id })).body.code).toBe("APPROVER_SELF");
    expect((await requestCar(CHAIRMAN)).body.code).toBe("APPROVER_REQUIRED");
  });

  test("only the named approver can take the HOD step", async () => {
    // Factory A's admin cannot even see a head-office request; the fleet manager and HO admin can see it but not approve.
    expect((await api("POST", `/pool-car/requisitions/${a.id}/decision`, { token: await login(SABINA), body: { decision: "APPROVE" } })).status).toBe(404);
    const byFleet = await api("POST", `/pool-car/requisitions/${a.id}/decision`, { token: await login(JAHANGIR), body: { decision: "APPROVE" } });
    expect(byFleet.status).toBe(403);
    expect(byFleet.body.code).toBe("NOT_APPROVER");
    expect((await api("POST", `/pool-car/requisitions/${a.id}/decision`, { token: await login(ARIF), body: { decision: "APPROVE" } })).status).toBe(403);
    expect((await api("POST", `/pool-car/requisitions/${a.id}/decision`, { token: await login(RAHIM), body: { decision: "APPROVE" } })).status).toBe(403);

    const farid = await login(FARID);
    const noReason = await api("POST", `/pool-car/requisitions/${a.id}/decision`, { token: farid, body: { decision: "REJECT" } });
    expect(noReason.body.code).toBe("REASON_REQUIRED");

    const asApprover = await api("GET", `/pool-car/requisitions/${a.id}`, { token: farid });
    expect(asApprover.body.viewer).toMatchObject({ isApprover: true, actions: ["APPROVE", "REJECT"] });
    const ok = await api("POST", `/pool-car/requisitions/${a.id}/decision`, { token: farid, body: { decision: "APPROVE", note: "Approved — urgent hearing." } });
    expect(ok.status).toBe(200);
    expect(ok.body.status).toBe("PENDING_FLEET");
    expect(ok.body.hodApprovedAt).toBeTruthy();
    expect(ok.body.pipeline.steps.map((s: any) => s.state)).toEqual(["DONE", "CURRENT", "UPCOMING", "UPCOMING", "UPCOMING"]);
    expect(ok.body.viewer.actions).toEqual([]);

    const again = await api("POST", `/pool-car/requisitions/${a.id}/decision`, { token: farid, body: { decision: "APPROVE" } });
    expect(again.status).toBe(409);
    expect(again.body.code).toBe("CAR_REQUISITION_STATE_CONFLICT");
    expect((await api("GET", "/pool-car/approvals", { token: farid })).body.items.some((r: any) => r.id === a.id)).toBe(false);

    expect((await notificationsFor(RAHIM)).find((n) => n.data?.objectId === a.id)?.title).toBe("Your car request is approved");
    const fleetTold = (await notificationsFor(JAHANGIR)).find((n) => n.data?.objectId === a.id);
    expect(fleetTold).toMatchObject({ category: "ACTION_REQUIRED", title: "Urgent: Assign a pool car" });
  });

  test("only the fleet manager assigns; the requester then sees the driver, the vehicle and a gate pass", async () => {
    const body = { vehicleId: fleet.hiace, driverId: fleet.delwar };
    expect((await api("POST", `/pool-car/requisitions/${a.id}/assign`, { token: await login(FARID), body })).status).toBe(403);
    expect((await api("POST", `/pool-car/requisitions/${a.id}/assign`, { token: await login(ARIF), body })).status).toBe(403);
    expect((await api("POST", `/pool-car/requisitions/${a.id}/assign`, { token: await login(RAHIM), body })).status).toBe(403);

    const jahangir = await login(JAHANGIR);
    const asFleet = await api("GET", `/pool-car/requisitions/${a.id}`, { token: jahangir });
    expect(asFleet.body.viewer).toMatchObject({ isStaff: true, canManage: true, actions: ["ASSIGN", "REJECT"] });

    // The assign dialog: every vehicle says whether it can take this trip.
    const options = (await api("GET", `/pool-car/vehicles?requisitionId=${a.id}`, { token: jahangir })).body as any[];
    const byId = Object.fromEntries(options.map((v) => [v.id, v]));
    expect(byId[fleet.hiace].availability).toMatchObject({ available: true, matchesPreference: true });
    expect(byId[fleet.pajero].availability).toMatchObject({ available: false, code: "MAINTENANCE" });
    // The Premio is out right now but back long before this trip.
    expect(byId[fleet.premio].status).toBe("ON_TRIP");
    expect(byId[fleet.premio].availability.available).toBe(true);
    const drivers = (await api("GET", `/pool-car/drivers?requisitionId=${a.id}`, { token: jahangir })).body as any[];
    expect(drivers.find((d) => d.id === fleet.mizan)).toMatchObject({ status: "ON_TRIP", hasAccount: true });

    const res = await api("POST", `/pool-car/requisitions/${a.id}/assign`, { token: jahangir, body: { ...body, note: "Driver will call 15 minutes before pickup." } });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: "ASSIGNED", statusNote: "Driver will call 15 minutes before pickup." });
    expect(res.body.vehicle).toMatchObject({ registrationNumber: "Dhaka Metro-CHA 19-0871", name: "Toyota Hiace", seats: 12 });
    expect(res.body.viewer.actions).toEqual(["REASSIGN", "START"]);
    expect(res.body.gatePass.payload).toMatch(/^https:\/\/dispatch\.abg\.com\.bd\/g\/c\/[A-Za-z0-9_-]{32}$/);

    const seen = await api("GET", `/pool-car/requisitions/${a.id}`, { token: await login(RAHIM) });
    expect(seen.body.driver).toMatchObject({ fullName: "Delwar Hossain", phone: "01819456721", hasAccount: false });
    expect(seen.body.gatePass.payload).toBe(res.body.gatePass.payload);
    expect(seen.body.viewer.actions).toEqual(["CANCEL"]);
    expect(seen.body.updates.map((u: any) => u.type)).toEqual(["SUBMITTED", "STATUS_CHANGED", "ASSIGNED"]);
    const told = (await notificationsFor(RAHIM)).find((n) => n.data?.objectId === a.id && n.eventType === "CAR_ASSIGNED");
    expect(told.title).toBe("Car assigned: Toyota Hiace");
    expect(told.body).toContain("Delwar Hossain (01819456721)");
  });

  test("a vehicle in maintenance, too few seats, or a car or driver already booked at that time is refused", async () => {
    const created = await requestCar(NUSRAT, { pickupAt: inHours(31), returnAt: inHours(33), passengerCount: 5, purpose: "Treasury team at the bank's Gulshan branch" });
    b = created.body;
    await api("POST", `/pool-car/requisitions/${b.id}/decision`, { token: await login(FARID), body: { decision: "APPROVE" } });
    const jahangir = await login(JAHANGIR);
    const assign = (vehicleId: string, driverId: string) => api("POST", `/pool-car/requisitions/${b.id}/assign`, { token: jahangir, body: { vehicleId, driverId } });

    const maintenance = await assign(fleet.pajero, fleet.abul);
    expect(maintenance.status).toBe(409);
    expect(maintenance.body.code).toBe("VEHICLE_UNAVAILABLE");
    const small = await assign(fleet.premio, fleet.abul);
    expect(small.status).toBe(409);
    expect(small.body.code).toBe("VEHICLE_TOO_SMALL");
    const carBooked = await assign(fleet.hiace, fleet.abul);
    expect(carBooked.status).toBe(409);
    expect(carBooked.body.code).toBe("VEHICLE_BOOKED");
    expect(carBooked.body.details.conflict.referenceNumber).toBe(a.referenceNumber);
    const driverBooked = await assign(fleet.noah, fleet.delwar);
    expect(driverBooked.status).toBe(409);
    expect(driverBooked.body.code).toBe("DRIVER_BOOKED");

    const options = (await api("GET", `/pool-car/vehicles?requisitionId=${b.id}`, { token: jahangir })).body as any[];
    const byId = Object.fromEntries(options.map((v) => [v.id, v]));
    expect(byId[fleet.hiace].availability.code).toBe("BOOKED");
    expect(byId[fleet.premio].availability.code).toBe("SEATS");
    expect(byId[fleet.noah].availability.available).toBe(true);

    const ok = await assign(fleet.noah, fleet.abul);
    expect(ok.status).toBe(200);
    expect(ok.body.driver.fullName).toBe("Abul Kalam");
    const told = (await notificationsFor(ABUL)).find((n) => n.data?.objectId === b.id);
    expect(told).toMatchObject({ category: "ACTION_REQUIRED", eventType: "CAR_ASSIGNED" });
  });

  test("a driver sees only their own trips, and starts and completes them from the app", async () => {
    const { prisma } = await startApp();
    const today = await prisma.carRequisition.findFirstOrThrow({ where: { status: "ASSIGNED", vehicleId: fleet.noah, driverId: fleet.abul, id: { not: b.id } } });
    const abul = await login(ABUL);
    const trips = (await api("GET", "/pool-car/trips/mine", { token: abul })).body.items as any[];
    expect(trips.map((t) => t.id)).toEqual([today.id, b.id]);
    const mizanTrips = (await api("GET", "/pool-car/trips/mine", { token: await login(MIZAN) })).body.items as any[];
    expect(mizanTrips.every((t) => t.driver.fullName === "Mizanur Rahman")).toBe(true);
    expect(mizanTrips.some((t) => t.id === b.id || t.id === today.id)).toBe(false);
    expect((await api("GET", `/pool-car/requisitions/${a.id}`, { token: abul })).status).toBe(404);
    expect((await api("GET", `/pool-car/requisitions/${today.id}`, { token: await login(SOHEL) })).status).toBe(404);
    expect((await api("GET", "/pool-car/trips/mine", { token: await login(RAHIM) })).status).toBe(403);

    const asDriver = await api("GET", `/pool-car/requisitions/${today.id}`, { token: abul });
    expect(asDriver.body.viewer).toMatchObject({ isDriver: true, actions: ["START"] });
    expect(asDriver.body.gatePass).not.toBeNull();
    // The passenger cannot start the trip; another driver cannot even see it.
    expect((await api("POST", `/pool-car/requisitions/${today.id}/start`, { token: await login(RAHIM), body: {} })).status).toBe(403);
    expect((await api("POST", `/pool-car/requisitions/${today.id}/start`, { token: await login(SOHEL), body: {} })).status).toBe(404);
    expect((await api("POST", `/pool-car/requisitions/${today.id}/start`, { token: abul, body: { odometerKm: 35000 } })).body.code).toBe("ODOMETER_BEHIND");

    const started = await api("POST", `/pool-car/requisitions/${today.id}/start`, { token: abul, body: { odometerKm: 35602 } });
    expect(started.status).toBe(200);
    expect(started.body).toMatchObject({ status: "IN_PROGRESS", odometer: { startKm: 35602 } });
    expect(started.body.viewer.actions).toEqual(["COMPLETE"]);
    expect((await prisma.vehicle.findUniqueOrThrow({ where: { id: fleet.noah } })).status).toBe("ON_TRIP");
    expect((await prisma.driver.findUniqueOrThrow({ where: { id: fleet.abul } })).status).toBe("ON_TRIP");

    const done = await api("POST", `/pool-car/requisitions/${today.id}/complete`, { token: abul, body: { odometerKm: 35650 } });
    expect(done.body).toMatchObject({ status: "COMPLETED", odometer: { startKm: 35602, endKm: 35650, distanceKm: 48 }, gatePass: null });
    const noah = await prisma.vehicle.findUniqueOrThrow({ where: { id: fleet.noah } });
    expect(noah).toMatchObject({ status: "AVAILABLE", odometerKm: 35650 });
    expect((await prisma.driver.findUniqueOrThrow({ where: { id: fleet.abul } })).status).toBe("AVAILABLE");
    expect((await api("POST", `/pool-car/requisitions/${today.id}/complete`, { token: abul, body: {} })).status).toBe(409);
  });

  test("full pipeline through the gate: exit starts the trip, return completes it", async () => {
    const created = await requestCar(FARHANA, {
      tripType: "ONE_WAY",
      purpose: "Samples to the BSTI regional office",
      pickupLocation: "Factory A, Quality Lab",
      dropLocation: "BSTI, Narayanganj",
      pickupAt: inHours(0.1),
      returnAt: undefined,
      passengers: [{ name: "Farhana Islam" }],
    });
    expect(created.status).toBe(201);
    const id = created.body.id;
    expect(created.body.referenceNumber).toMatch(/^PC-\d{6}-FCA-\d{3}$/);
    await api("POST", `/pool-car/requisitions/${id}/decision`, { token: await login(SABINA), body: { decision: "APPROVE" } });
    const assigned = await api("POST", `/pool-car/requisitions/${id}/assign`, { token: await login(JAHANGIR), body: { vehicleId: fleet.axio, driverId: fleet.sohel } });
    expect(assigned.status).toBe(200);
    const token = tokenOf(assigned.body.gatePass.payload);

    const nurul = await login(NURUL);
    const pass = await api("GET", `/pool-car/passes/${token}`, { token: nurul });
    expect(pass.status).toBe(200);
    expect(pass.body).toMatchObject({ state: "VALID", valid: true, allowed: ["EXIT"], scanHere: true });
    expect(pass.body.vehicle.registrationNumber).toBe("Narayanganj-GA 11-2087");
    expect(pass.body.driver).toMatchObject({ fullName: "Sohel Rana", phone: "01741762000" });
    expect(pass.body.passengers).toEqual([{ name: "Farhana Islam", phone: null }]);
    expect(pass.body.requisition).toMatchObject({ id, status: "ASSIGNED", requester: { name: "Farhana Islam" } });

    // Head office reception can check the pass, but exit and return are recorded at Factory A's gate.
    const rezaul = await login(REZAUL);
    const elsewhere = await api("GET", `/pool-car/passes/${token}`, { token: rezaul });
    expect(elsewhere.body).toMatchObject({ valid: true, allowed: [], scanHere: false });
    expect((await api("POST", `/pool-car/passes/${token}/scan`, { token: rezaul, body: { direction: "EXIT" } })).body.code).toBe("GATE_OUT_OF_SCOPE");
    expect((await api("POST", `/pool-car/passes/${token}/scan`, { token: nurul, body: { direction: "RETURN" } })).body.code).toBe("GATE_PASS_NOT_USABLE");

    const out = await api("POST", `/pool-car/passes/${token}/scan`, { token: nurul, body: { direction: "EXIT", odometerKm: 61290 } });
    expect(out.status).toBe(200);
    expect(out.body).toMatchObject({ state: "OUT", allowed: ["RETURN"], requisition: { status: "IN_PROGRESS" } });
    expect(out.body.scans).toHaveLength(1);
    expect(out.body.scans[0]).toMatchObject({ direction: "EXIT", by: "Nurul Amin" });
    const { prisma } = await startApp();
    expect((await prisma.vehicle.findUniqueOrThrow({ where: { id: fleet.axio } })).status).toBe("ON_TRIP");
    expect((await prisma.driver.findUniqueOrThrow({ where: { id: fleet.sohel } })).status).toBe("ON_TRIP");
    const twice = await api("POST", `/pool-car/passes/${token}/scan`, { token: nurul, body: { direction: "EXIT" } });
    expect(twice.status).toBe(409);
    expect(twice.body.code).toBe("GATE_ALREADY_SCANNED");
    expect((await api("GET", "/pool-car/trips/mine", { token: await login(SOHEL) })).body.items.find((t: any) => t.id === id).status).toBe("IN_PROGRESS");

    expect((await api("POST", `/pool-car/passes/${token}/scan`, { token: nurul, body: { direction: "RETURN", odometerKm: 61250 } })).body.code).toBe("ODOMETER_BEHIND");
    const back = await api("POST", `/pool-car/passes/${token}/scan`, { token: nurul, body: { direction: "RETURN", odometerKm: 61338 } });
    expect(back.status).toBe(200);
    expect(back.body).toMatchObject({ state: "USED", valid: false, allowed: [], requisition: { status: "COMPLETED" } });
    expect(back.body.scans.map((s: any) => s.direction)).toEqual(["EXIT", "RETURN"]);
    expect(await prisma.vehicle.findUniqueOrThrow({ where: { id: fleet.axio } })).toMatchObject({ status: "AVAILABLE", odometerKm: 61338 });
    expect((await prisma.driver.findUniqueOrThrow({ where: { id: fleet.sohel } })).status).toBe("AVAILABLE");

    const final = await api("GET", `/pool-car/requisitions/${id}`, { token: await login(FARHANA) });
    expect(final.body).toMatchObject({ status: "COMPLETED", gatePass: null, odometer: { startKm: 61290, endKm: 61338, distanceKm: 48 } });
    expect(final.body.pipeline.steps.every((s: any) => s.state === "DONE" && s.at)).toBe(true);
    expect(final.body.updates.map((u: any) => u.type)).toEqual(["SUBMITTED", "STATUS_CHANGED", "ASSIGNED", "GATE_SCANNED", "GATE_SCANNED"]);
    const titles = (await notificationsFor(FARHANA)).filter((n) => n.data?.objectId === id).map((n) => n.title);
    expect(titles).toContain("Your car has left the gate");
    expect(titles).toContain("Trip completed");
  });

  test("reassigning issues a new gate pass and the old one stops working", async () => {
    const jahangir = await login(JAHANGIR);
    const before = await api("GET", `/pool-car/requisitions/${a.id}`, { token: jahangir });
    const oldToken = tokenOf(before.body.gatePass.payload);
    const same = await api("POST", `/pool-car/requisitions/${a.id}/assign`, { token: jahangir, body: { vehicleId: fleet.hiace, driverId: fleet.delwar } });
    expect(same.body.code).toBe("ASSIGNMENT_UNCHANGED");

    const moved = await api("POST", `/pool-car/requisitions/${a.id}/assign`, { token: jahangir, body: { vehicleId: fleet.prado, driverId: fleet.delwar, note: "Hiace needed for the factory shuttle." } });
    expect(moved.status).toBe(200);
    expect(moved.body.vehicle.name).toBe("Toyota Land Cruiser Prado");
    const reassigned = moved.body.updates.at(-1);
    expect(reassigned).toMatchObject({ type: "REASSIGNED", fromStatus: "ASSIGNED", toStatus: "ASSIGNED" });
    expect(reassigned.metadata.previous.vehicle).toContain("Dhaka Metro-CHA 19-0871");
    const newToken = tokenOf(moved.body.gatePass.payload);
    expect(newToken).not.toBe(oldToken);

    const rezaul = await login(REZAUL);
    const stale = await api("GET", `/pool-car/passes/${oldToken}`, { token: rezaul });
    expect(stale.status).toBe(404);
    expect(stale.body.code).toBe("GATE_PASS_INVALID");
    expect((await api("GET", `/pool-car/passes/${newToken}`, { token: rezaul })).body.vehicle.registrationNumber).toBe("Dhaka Metro-GHA 13-0907");
  });

  test("gate passes: forged tokens are refused, and only the requester, the driver and the fleet manager see the pass", async () => {
    const rezaul = await login(REZAUL);
    const forged = await api("GET", `/pool-car/passes/${"Q".repeat(32)}`, { token: rezaul });
    expect(forged.status).toBe(404);
    expect(forged.body).toMatchObject({ code: "GATE_PASS_INVALID" });
    expect(forged.body.message).toContain("not valid");
    expect((await api("GET", "/pool-car/passes/abc", { token: rezaul })).body.code).toBe("GATE_PASS_INVALID");
    expect((await api("POST", `/pool-car/passes/${"Q".repeat(32)}/scan`, { token: rezaul, body: { direction: "EXIT" } })).status).toBe(404);

    const pass = (email: string) => api("GET", `/pool-car/requisitions/${a.id}`, { token: email }).then((r) => r.body.gatePass);
    expect(await pass(await login(RAHIM))).not.toBeNull();
    expect(await pass(await login(JAHANGIR))).not.toBeNull();
    expect(await pass(await login(FARID))).toBeNull();
    expect(await pass(await login(ARIF))).toBeNull();
    expect(await pass(await login(AUDITOR))).toBeNull();
    // Scanning a pass is for security and front desks only.
    const token = tokenOf((await api("GET", `/pool-car/requisitions/${a.id}`, { token: await login(RAHIM) })).body.gatePass.payload);
    expect((await api("GET", `/pool-car/passes/${token}`, { token: await login(RAHIM) })).status).toBe(403);
    expect((await api("GET", `/pool-car/passes/${token}`, { token: await login(JAHANGIR) })).status).toBe(200);
  });

  test("people unrelated to a request get 404; office admins see their office; auditors read but never change", async () => {
    expect((await api("GET", `/pool-car/requisitions/${a.id}`, { token: await login(SHAHIN) })).status).toBe(404);
    expect((await api("GET", `/pool-car/requisitions/${a.id}`, { token: await login(SABINA) })).status).toBe(404);
    expect((await api("GET", `/pool-car/requisitions/${a.id}`, { token: await login(REZAUL) })).status).toBe(404);
    expect((await api("GET", "/pool-car/requisitions/7d1f5a7e-7f43-4d9b-9d26-5d1a3f0b2c11", { token: await login(JAHANGIR) })).status).toBe(404);
    expect((await api("GET", "/pool-car/requisitions/not-an-id", { token: await login(JAHANGIR) })).status).toBe(404);

    const sabinaList = (await api("GET", "/admin/pool-car/requisitions?status=ALL&limit=100", { token: await login(SABINA) })).body.items as any[];
    expect(sabinaList.length).toBeGreaterThan(0);
    expect(sabinaList.every((r) => r.branch.code === "FCA")).toBe(true);
    expect((await api("GET", "/admin/pool-car/requisitions", { token: await login(RAHIM) })).status).toBe(403);

    const auditor = await login(AUDITOR);
    const seen = await api("GET", `/pool-car/requisitions/${a.id}`, { token: auditor });
    expect(seen.status).toBe(200);
    expect(seen.body.viewer).toMatchObject({ isStaff: true, canManage: false, actions: [] });
    expect((await api("POST", `/pool-car/requisitions/${a.id}/cancel`, { token: auditor, body: {} })).status).toBe(403);
    expect((await api("POST", "/pool-car/vehicles", { token: auditor, body: {} })).status).toBe(403);
    expect((await api("GET", "/admin/pool-car/requisitions?status=OPEN", { token: auditor })).status).toBe(200);
  });

  test("the requester can cancel until the car leaves, which frees the car and driver; the fleet manager can turn a request down", async () => {
    expect((await api("POST", `/pool-car/requisitions/${b.id}/cancel`, { token: await login(FARID), body: {} })).body.code).toBe("NOT_REQUESTER");
    const passToken = tokenOf((await api("GET", `/pool-car/requisitions/${b.id}`, { token: await login(NUSRAT) })).body.gatePass.payload);
    const cancelled = await api("POST", `/pool-car/requisitions/${b.id}/cancel`, { token: await login(NUSRAT), body: { note: "The bank moved the meeting." } });
    expect(cancelled.status).toBe(200);
    expect(cancelled.body).toMatchObject({ status: "CANCELLED", gatePass: null, pipeline: { outcome: { status: "CANCELLED", note: "The bank moved the meeting." } } });
    expect(cancelled.body.pipeline.steps[2].state).toBe("HALTED");
    expect((await notificationsFor(ABUL)).some((n) => n.data?.objectId === b.id && n.title === "Trip cancelled")).toBe(true);
    const dead = await api("GET", `/pool-car/passes/${passToken}`, { token: await login(REZAUL) });
    expect(dead.body).toMatchObject({ state: "CANCELLED", valid: false, allowed: [] });

    // The Noah and Abul Kalam are free again for the same hours.
    const c = (await requestCar(RAHIM, { pickupAt: inHours(31), returnAt: inHours(33), passengerCount: 5, purpose: "Legal team to the Gulshan arbitration centre" })).body;
    await api("POST", `/pool-car/requisitions/${c.id}/decision`, { token: await login(FARID), body: { decision: "APPROVE" } });
    const jahangir = await login(JAHANGIR);
    expect((await api("POST", `/pool-car/requisitions/${c.id}/assign`, { token: jahangir, body: { vehicleId: fleet.noah, driverId: fleet.abul } })).status).toBe(200);

    // At the fleet stage the fleet manager may reject, with a reason; approving again is not a thing.
    const d = (await requestCar(RAHIM, { pickupAt: inHours(50), returnAt: inHours(52), purpose: "Document collection from the Motijheel branch" })).body;
    await api("POST", `/pool-car/requisitions/${d.id}/decision`, { token: await login(FARID), body: { decision: "APPROVE" } });
    expect((await api("POST", `/pool-car/requisitions/${d.id}/decision`, { token: jahangir, body: { decision: "APPROVE" } })).status).toBe(409);
    expect((await api("POST", `/pool-car/requisitions/${d.id}/decision`, { token: jahangir, body: { decision: "REJECT" } })).body.code).toBe("REASON_REQUIRED");
    const rejected = await api("POST", `/pool-car/requisitions/${d.id}/decision`, { token: jahangir, body: { decision: "REJECT", note: "No car is free that day; the Dhaka branch van can take it." } });
    expect(rejected.body).toMatchObject({ status: "REJECTED", statusNote: "No car is free that day; the Dhaka branch van can take it." });
    expect(rejected.body.pipeline.steps[1].state).toBe("HALTED");
    expect((await notificationsFor(RAHIM)).find((n) => n.data?.objectId === d.id && n.eventType === "CAR_REJECTED")?.title).toBe("Your car request was not approved");
    expect((await api("POST", `/pool-car/requisitions/${d.id}/cancel`, { token: await login(RAHIM), body: {} })).status).toBe(409);

    // A trip on the road cannot be cancelled.
    const { prisma } = await startApp();
    const out = await prisma.carRequisition.findFirstOrThrow({ where: { status: "IN_PROGRESS", vehicleId: fleet.premio } });
    const requester = await prisma.user.findUniqueOrThrow({ where: { id: out.requesterUserId } });
    expect((await api("POST", `/pool-car/requisitions/${out.id}/cancel`, { token: await login(requester.email!), body: {} })).status).toBe(409);
  });

  test("a request sent twice with the same Idempotency-Key is recorded once", async () => {
    const k = key("pc");
    const body = { tripType: "ONE_WAY", returnAt: undefined, pickupAt: inHours(20), purpose: "Bank deposit run" };
    const first = await requestCar(SHAHIN, body, k);
    const second = await requestCar(SHAHIN, body, k);
    expect(first.status).toBe(201);
    expect(second.body.id).toBe(first.body.id);
    expect(second.headers.get("idempotent-replay")).toBe("true");
    const other = await requestCar(SHAHIN, { ...body, purpose: "Something else entirely" }, k);
    expect(other.body.code).toBe("IDEMPOTENCY_MISMATCH");
  });

  test("a requisition's history cannot be altered, even with direct SQL", async () => {
    const { prisma } = await startApp();
    await expect(Promise.resolve(prisma.$executeRawUnsafe(`UPDATE "car_requisition_updates" SET "note" = 'edited' WHERE "requisitionId" = '${a.id}'`))).rejects.toThrow();
    await expect(Promise.resolve(prisma.$executeRawUnsafe(`DELETE FROM "car_requisition_updates" WHERE "requisitionId" = '${a.id}'`))).rejects.toThrow();
    // Nor can a car be marked assigned without a vehicle, driver and gate pass.
    await expect(Promise.resolve(prisma.$executeRawUnsafe(`UPDATE "car_requisitions" SET "status" = 'ASSIGNED', "gatePassToken" = NULL WHERE "id" = '${a.id}'`))).rejects.toThrow();
  });

  test("the fleet register: add and edit vehicles and drivers; maintenance needs a reason and waits for booked trips", async () => {
    const jahangir = await login(JAHANGIR);
    const { prisma } = await startApp();
    const ho = (await prisma.branch.findUniqueOrThrow({ where: { code: "HO" } })).id;
    const vehicle = { registrationNumber: "Dhaka Metro-JA 11-0042", make: "Toyota", model: "Coaster", type: "COASTER", seats: 26, branchId: ho, odometerKm: 1200, nextServiceAt: "2026-11-02", insuranceExpiry: "2027-06-30" };
    expect((await api("POST", "/pool-car/vehicles", { token: await login(ARIF), body: vehicle })).status).toBe(403);
    const added = await api("POST", "/pool-car/vehicles", { token: jahangir, body: vehicle });
    expect(added.status).toBe(201);
    expect(added.body).toMatchObject({ registrationNumber: "Dhaka Metro-JA 11-0042", type: "COASTER", seats: 26, status: "AVAILABLE", nextServiceAt: "2026-11-02" });
    expect((await api("POST", "/pool-car/vehicles", { token: jahangir, body: { ...vehicle, registrationNumber: "dhaka metro-ja 11-0042" } })).body.code).toBe("VEHICLE_DUPLICATE");

    const noNote = await api("PATCH", `/pool-car/vehicles/${added.body.id}`, { token: jahangir, body: { status: "MAINTENANCE" } });
    expect(noNote.body.code).toBe("STATUS_NOTE_REQUIRED");
    const shop = await api("PATCH", `/pool-car/vehicles/${added.body.id}`, { token: jahangir, body: { status: "MAINTENANCE", statusNote: "Gearbox service at Navana Toyota, Tejgaon" } });
    expect(shop.body).toMatchObject({ status: "MAINTENANCE", statusNote: "Gearbox service at Navana Toyota, Tejgaon", availability: { available: false, code: "MAINTENANCE" } });
    expect((await api("PATCH", `/pool-car/vehicles/${added.body.id}`, { token: jahangir, body: { status: "AVAILABLE" } })).body).toMatchObject({ status: "AVAILABLE", statusNote: null });
    expect((await api("PATCH", `/pool-car/vehicles/${added.body.id}`, { token: jahangir, body: { status: "ON_TRIP" } })).status).toBe(400);
    expect((await api("PATCH", `/pool-car/vehicles/${added.body.id}`, { token: jahangir, body: { odometerKm: 900 } })).body.code).toBe("ODOMETER_BEHIND");

    // The Prado is booked for Rahim's trip: it cannot go to the workshop until that trip is reassigned.
    const booked = await api("PATCH", `/pool-car/vehicles/${fleet.prado}`, { token: jahangir, body: { status: "MAINTENANCE", statusNote: "Tyre change" } });
    expect(booked.status).toBe(409);
    expect(booked.body.code).toBe("VEHICLE_HAS_BOOKINGS");
    const onTrip = await api("PATCH", `/pool-car/vehicles/${fleet.premio}`, { token: jahangir, body: { status: "MAINTENANCE", statusNote: "Oil change" } });
    expect(onTrip.body.code).toBe("VEHICLE_ON_TRIP");

    const list = (await api("GET", "/pool-car/vehicles", { token: jahangir })).body as any[];
    expect(list.find((v) => v.registrationNumber === "Dhaka Metro-CHA 19-0871").alerts).toContainEqual(expect.objectContaining({ kind: "SERVICE", state: "OVERDUE" }));
    expect(list.find((v) => v.id === fleet.premio).currentTrip).toMatchObject({ status: "IN_PROGRESS" });

    // Drivers: a directory link makes trips appear in that person's app.
    const karim = await prisma.employee.findUniqueOrThrow({ where: { employeeCode: "ABG-4832" } });
    const driver = await api("POST", "/pool-car/drivers", { token: jahangir, body: { fullName: "Karim Ahmed", phone: "+880 1718-483200", licenseNumber: "dk0555123l00099", licenseExpiry: new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10), branchId: ho, employeeId: karim.id } });
    expect(driver.status).toBe(201);
    expect(driver.body).toMatchObject({ phone: "01718483200", licenseNumber: "DK0555123L00099", hasAccount: true, licenseAlert: { state: "DUE_SOON" } });
    const abulUser = await prisma.employee.findUniqueOrThrow({ where: { employeeCode: "ABG-3620" } });
    expect((await api("POST", "/pool-car/drivers", { token: jahangir, body: { fullName: "Duplicate", phone: "01700000000", licenseNumber: "D", branchId: ho, employeeId: abulUser.id } })).status).toBe(400);
    expect((await api("POST", "/pool-car/drivers", { token: jahangir, body: { fullName: "Duplicate", phone: "01700000000", licenseNumber: "DK0000001", branchId: ho, employeeId: abulUser.id } })).body.code).toBe("DRIVER_ACCOUNT_LINKED");
    const offDuty = await api("PATCH", `/pool-car/drivers/${driver.body.id}`, { token: jahangir, body: { status: "OFF_DUTY" } });
    expect(offDuty.body).toMatchObject({ status: "OFF_DUTY", availability: { available: false, code: "OFF_DUTY" } });
    expect((await api("PATCH", `/pool-car/drivers/${fleet.delwar}`, { token: jahangir, body: { status: "OFF_DUTY" } })).body.code).toBe("DRIVER_HAS_BOOKINGS");

    // An off-duty driver cannot be assigned.
    const e = (await requestCar(RAHIM, { pickupAt: inHours(60), returnAt: inHours(62), purpose: "Collect stamp papers from the court" })).body;
    await api("POST", `/pool-car/requisitions/${e.id}/decision`, { token: await login(FARID), body: { decision: "APPROVE" } });
    expect((await api("POST", `/pool-car/requisitions/${e.id}/assign`, { token: jahangir, body: { vehicleId: fleet.hiace, driverId: driver.body.id } })).body.code).toBe("DRIVER_UNAVAILABLE");
  });

  test("the admin list filters, and the summary counts match the register", async () => {
    const jahangir = await login(JAHANGIR);
    const awaiting = (await api("GET", "/admin/pool-car/requisitions?status=AWAITING_ME&limit=100", { token: jahangir })).body.items as any[];
    expect(awaiting.length).toBeGreaterThan(0);
    expect(awaiting.every((r) => r.status === "PENDING_FLEET" && r.awaitingMe)).toBe(true);
    const urgent = (await api("GET", "/admin/pool-car/requisitions?status=ALL&urgent=true&limit=100", { token: jahangir })).body.items as any[];
    expect(urgent.length).toBeGreaterThan(0);
    expect(urgent.every((r) => r.urgent)).toBe(true);
    const found = (await api("GET", `/admin/pool-car/requisitions?status=ALL&q=${encodeURIComponent(a.referenceNumber)}`, { token: jahangir })).body.items as any[];
    expect(found.map((r) => r.id)).toEqual([a.id]);
    const byReg = (await api("GET", "/admin/pool-car/requisitions?status=ALL&q=GHA%2013-0907&limit=100", { token: jahangir })).body.items as any[];
    expect(byReg.some((r) => r.id === a.id)).toBe(true);

    const { prisma } = await startApp();
    const summary = (await api("GET", "/admin/pool-car/summary", { token: jahangir })).body;
    const open = await prisma.carRequisition.count({ where: { status: { in: ["PENDING_HOD", "PENDING_FLEET", "ASSIGNED", "IN_PROGRESS"] } } });
    const inService = await prisma.vehicle.count({ where: { status: { not: "INACTIVE" } } });
    const available = await prisma.vehicle.count({ where: { status: "AVAILABLE" } });
    expect(summary).toMatchObject({
      activeRequisitions: open,
      pendingHod: await prisma.carRequisition.count({ where: { status: "PENDING_HOD" } }),
      pendingFleet: await prisma.carRequisition.count({ where: { status: "PENDING_FLEET" } }),
      completedLast30Days: await prisma.carRequisition.count({ where: { status: "COMPLETED" } }),
      vehicles: { total: inService, available, onTrip: 1, maintenance: 1 },
      poolAvailabilityPct: Math.round((available * 100) / inService),
      drivers: { total: 6, available: 4, onTrip: 1, offDuty: 1 },
    });
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka" }).format(new Date());
    const dayStart = new Date(`${today}T00:00:00+06:00`);
    const tripsToday = await prisma.carRequisition.count({ where: { pickupAt: { gte: dayStart, lt: new Date(dayStart.getTime() + 86_400_000) }, status: { in: ["ASSIGNED", "IN_PROGRESS", "COMPLETED"] } } });
    expect(summary.tripsToday).toBe(tripsToday);
    expect(summary.awaitingMe).toBe(awaiting.length);

    // Factory A's admin sees Factory A's cars only.
    const sabina = (await api("GET", "/admin/pool-car/summary", { token: await login(SABINA) })).body;
    expect(sabina.vehicles.total).toBe(2);
    expect(sabina.drivers.total).toBe(2);
    expect((await api("GET", "/admin/pool-car/summary", { token: await login(RAHIM) })).status).toBe(403);
  });
});
