import { randomBytes } from "crypto";
import {
  CarRequisitionStatus,
  CarRequisitionUpdateType,
  DriverStatus,
  GateScanDirection,
  NotificationCategory,
  TripType,
  VehicleStatus,
  VehicleType,
  dhakaDateStamp,
  formatCarRequisitionNumber,
} from "@abg-dispatch/shared";
import { DAY, MINUTE, type SeedContext } from "./context";

const S = CarRequisitionStatus;
const U = CarRequisitionUpdateType;
const HOUR = 60 * MINUTE;

interface VehicleSeed {
  key: string;
  registrationNumber: string;
  make: string;
  model: string;
  type: VehicleType;
  seats: number;
  colour: string;
  fuelType: string;
  branch: string;
  odometerKm: number;
  /** Days from today; negative is overdue. */
  serviceIn: number;
  fitnessIn: number;
  insuranceIn: number;
  status?: VehicleStatus;
  statusNote?: string;
  notes?: string;
}

const VEHICLES: VehicleSeed[] = [
  { key: "premio", registrationNumber: "Dhaka Metro-GA 27-4512", make: "Toyota", model: "Premio", type: VehicleType.SEDAN, seats: 4, colour: "Pearl white", fuelType: "Octane", branch: "HO", odometerKm: 48262, serviceIn: 18, fitnessIn: 204, insuranceIn: 95 },
  { key: "noah", registrationNumber: "Dhaka Metro-CHA 15-2234", make: "Toyota", model: "Noah", type: VehicleType.MICROBUS, seats: 7, colour: "Silver", fuelType: "Hybrid", branch: "HO", odometerKm: 35580, serviceIn: 61, fitnessIn: 318, insuranceIn: 12 },
  { key: "hiace", registrationNumber: "Dhaka Metro-CHA 19-0871", make: "Toyota", model: "Hiace", type: VehicleType.MICROBUS, seats: 12, colour: "White", fuelType: "Diesel", branch: "HO", odometerKm: 92440, serviceIn: -3, fitnessIn: 151, insuranceIn: 212, notes: "High-roof commuter. First choice for team visits to the factories." },
  {
    key: "pajero", registrationNumber: "Dhaka Metro-GHA 11-3378", make: "Mitsubishi", model: "Pajero Sport", type: VehicleType.SUV, seats: 6, colour: "Black", fuelType: "Diesel", branch: "HO", odometerKm: 54210, serviceIn: 85, fitnessIn: 40, insuranceIn: 160,
    status: VehicleStatus.MAINTENANCE, statusNote: "AC compressor and front brake pads being replaced at Rancon Motors, Tejgaon — expected back on Thursday.",
  },
  { key: "prado", registrationNumber: "Dhaka Metro-GHA 13-0907", make: "Toyota", model: "Land Cruiser Prado", type: VehicleType.SUV, seats: 6, colour: "Black", fuelType: "Diesel", branch: "HO", odometerKm: 23458, serviceIn: 44, fitnessIn: 260, insuranceIn: 300, notes: "Reserved first for Board members and the MD's guests." },
  { key: "axio", registrationNumber: "Narayanganj-GA 11-2087", make: "Toyota", model: "Axio", type: VehicleType.SEDAN, seats: 4, colour: "Silver", fuelType: "CNG / Octane", branch: "FCA", odometerKm: 61246, serviceIn: 27, fitnessIn: -6, insuranceIn: 130 },
  { key: "dmax", registrationNumber: "Narayanganj-THA 11-0453", make: "Isuzu", model: "D-Max (double cab)", type: VehicleType.PICKUP, seats: 4, colour: "White", fuelType: "Diesel", branch: "FCA", odometerKm: 18842, serviceIn: 70, fitnessIn: 190, insuranceIn: 75, notes: "Carries spare parts and samples between the factory and the Tongi warehouse." },
];

interface DriverSeed {
  key: string;
  fullName: string;
  phone: string;
  licenseNumber: string;
  licenseIn: number;
  branch: string;
  /** Employee code of the driver's ABG ONE account, if they have one. */
  account?: string;
}

const DRIVERS: DriverSeed[] = [
  { key: "abul", fullName: "Abul Kalam", phone: "01739362000", licenseNumber: "DK0412305L00011", licenseIn: 640, branch: "HO", account: "ABG-3620" },
  { key: "mizan", fullName: "Mizanur Rahman", phone: "01740362100", licenseNumber: "DK0715822L00034", licenseIn: 410, branch: "HO", account: "ABG-3621" },
  { key: "sohel", fullName: "Sohel Rana", phone: "01741762000", licenseNumber: "NG0918264L00007", licenseIn: 820, branch: "FCA", account: "ABG-7620" },
  { key: "delwar", fullName: "Delwar Hossain", phone: "01819456721", licenseNumber: "DK0303117L00052", licenseIn: 20, branch: "HO" },
  { key: "shahidul", fullName: "Shahidul Islam", phone: "01911783204", licenseNumber: "NG1120490L00015", licenseIn: 530, branch: "FCA" },
];

interface Step {
  type: string;
  from?: string;
  to?: string;
  at: Date;
  by: string;
  note?: string;
  metadata?: Record<string, unknown>;
}

interface RequisitionSeed {
  requester: string;
  approver: string;
  tripType: TripType;
  purpose: string;
  pickupLocation: string;
  dropLocation: string;
  pickupAt: Date;
  returnAt?: Date;
  passengers: [string, string?][];
  passengerCount: number;
  urgent?: boolean;
  vehiclePreference?: string;
  createdAt: Date;
  status: CarRequisitionStatus;
  vehicle?: string;
  driver?: string;
  statusNote?: string;
  hodApprovedAt?: Date;
  assignedAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  rejectedAt?: Date;
  cancelledAt?: Date;
  startKm?: number;
  endKm?: number;
  steps: Step[];
}

/** Demo data: the fleet register, drivers, and pool car requisitions in every state. */
export async function seedFleet(ctx: SeedContext): Promise<void> {
  const { prisma, now, branches, employees, users } = ctx;
  const at = (minutes: number) => new Date(now.getTime() + minutes * MINUTE);
  const ago = (minutes: number) => at(-minutes);
  const days = (n: number) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) + n * DAY);
  const name = (code: string) => users[code].name;
  const phone = (code: string) => employees[code].phone ?? undefined;

  // ── Register ──
  const vehicles: Record<string, { id: string; label: string; branchId: string }> = {};
  for (const v of VEHICLES) {
    const row = await prisma.vehicle.create({
      data: {
        registrationNumber: v.registrationNumber,
        make: v.make,
        model: v.model,
        type: v.type,
        seats: v.seats,
        colour: v.colour,
        fuelType: v.fuelType,
        branchId: branches[v.branch].id,
        odometerKm: v.odometerKm,
        nextServiceAt: days(v.serviceIn),
        fitnessExpiry: days(v.fitnessIn),
        insuranceExpiry: days(v.insuranceIn),
        status: v.status ?? VehicleStatus.AVAILABLE,
        statusNote: v.statusNote ?? null,
        statusChangedAt: v.status ? ago(26 * 60) : ago(30 * DAY / MINUTE),
        notes: v.notes ?? null,
        createdAt: ago(200 * DAY / MINUTE),
      },
    });
    vehicles[v.key] = { id: row.id, label: `${v.make} ${v.model} · ${v.registrationNumber}`, branchId: row.branchId };
  }
  const drivers: Record<string, { id: string; name: string; userId: string | null }> = {};
  for (const d of DRIVERS) {
    const row = await prisma.driver.create({
      data: {
        fullName: d.fullName,
        phone: d.phone,
        licenseNumber: d.licenseNumber,
        licenseExpiry: days(d.licenseIn),
        branchId: branches[d.branch].id,
        userId: d.account ? users[d.account].id : null,
        employeeId: d.account ? employees[d.account].id : null,
        createdAt: ago(200 * DAY / MINUTE),
      },
    });
    drivers[d.key] = { id: row.id, name: d.fullName, userId: row.userId };
  }

  const JAHANGIR = "ABG-3610";
  const REZAUL = "ABG-3700";
  const NURUL = "ABG-5290";
  const HO = "ABG Head Office, Plot 314/A, Bashundhara R/A";
  const FCA = "Factory A, Kanchpur Industrial Area, Sonargaon";
  const assigned = (when: Date, v: string, d: string): Step => ({ type: U.ASSIGNED, from: S.PENDING_FLEET, to: S.ASSIGNED, at: when, by: JAHANGIR, metadata: { vehicle: vehicles[v].label, vehicleId: vehicles[v].id, driver: drivers[d].name, driverId: drivers[d].id } });
  const submitted = (when: Date, approver: string, urgent = false): Step => ({ type: U.SUBMITTED, to: S.PENDING_HOD, at: when, by: "", metadata: { approver: name(approver), urgent } });
  const approved = (when: Date, approver: string): Step => ({ type: U.STATUS_CHANGED, from: S.PENDING_HOD, to: S.PENDING_FLEET, at: when, by: approver, metadata: { step: "HOD" } });
  const exit = (when: Date, guard: string, km: number, v: string, d: string): Step => ({ type: U.GATE_SCANNED, from: S.ASSIGNED, to: S.IN_PROGRESS, at: when, by: guard, metadata: { direction: GateScanDirection.EXIT, odometerKm: km, vehicle: vehicles[v].label, driver: drivers[d].name } });
  const back = (when: Date, guard: string, startKm: number, endKm: number): Step => ({ type: U.GATE_SCANNED, from: S.IN_PROGRESS, to: S.COMPLETED, at: when, by: guard, metadata: { direction: GateScanDirection.RETURN, odometerKm: endKm, distanceKm: endKm - startKm } });

  /** A finished round trip: submitted, approved, assigned, out through the gate and back. */
  const completedTrip = (o: { requester: string; approver: string; tripType: TripType; purpose: string; pickupLocation: string; dropLocation: string; daysAgo: number; hour: number; hours: number; passengers: [string, string?][]; count: number; vehicle: string; driver: string; startKm: number; endKm: number; guard: string; vehiclePreference?: string }): RequisitionSeed => {
    const pickupAt = new Date(days(-o.daysAgo).getTime() + (o.hour - 6) * HOUR);
    const createdAt = new Date(pickupAt.getTime() - 26 * HOUR);
    const hod = new Date(createdAt.getTime() + 95 * MINUTE);
    const assign = new Date(hod.getTime() + 140 * MINUTE);
    const startedAt = new Date(pickupAt.getTime() + 7 * MINUTE);
    const completedAt = new Date(pickupAt.getTime() + o.hours * HOUR - 12 * MINUTE);
    return {
      requester: o.requester,
      approver: o.approver,
      tripType: o.tripType,
      purpose: o.purpose,
      pickupLocation: o.pickupLocation,
      dropLocation: o.dropLocation,
      pickupAt,
      returnAt: new Date(pickupAt.getTime() + o.hours * HOUR),
      passengers: o.passengers,
      passengerCount: o.count,
      vehiclePreference: o.vehiclePreference,
      createdAt,
      status: S.COMPLETED,
      vehicle: o.vehicle,
      driver: o.driver,
      hodApprovedAt: hod,
      assignedAt: assign,
      startedAt,
      completedAt,
      startKm: o.startKm,
      endKm: o.endKm,
      steps: [submitted(createdAt, o.approver), approved(hod, o.approver), assigned(assign, o.vehicle, o.driver), exit(startedAt, o.guard, o.startKm, o.vehicle, o.driver), back(completedAt, o.guard, o.startKm, o.endKm)],
    };
  };

  const REQUISITIONS: Record<string, RequisitionSeed> = {
    // On the road right now: the Premio left the head office gate with Mizanur Rahman.
    inProgress: {
      requester: "ABG-2055", approver: "ABG-2210", tripType: TripType.ROUND_TRIP,
      purpose: "Quarterly treasury review at Bangladesh Bank", pickupLocation: HO, dropLocation: "Bangladesh Bank, Motijheel C/A, Dhaka",
      pickupAt: ago(95), returnAt: at(150), passengers: [["Nusrat Jahan", phone("ABG-2055")], ["Rashed Khan", "01733206600"]], passengerCount: 2,
      createdAt: ago(26 * 60), status: S.IN_PROGRESS, vehicle: "premio", driver: "mizan",
      hodApprovedAt: ago(24 * 60), assignedAt: ago(20 * 60), startedAt: ago(88), startKm: 48262,
      steps: [submitted(ago(26 * 60), "ABG-2210"), approved(ago(24 * 60), "ABG-2210"), assigned(ago(20 * 60), "premio", "mizan"), exit(ago(88), REZAUL, 48262, "premio", "mizan")],
    },
    // Leaves within the hour: the gate pass is live for today.
    assignedToday: {
      requester: "ABG-2041", approver: "ABG-2210", tripType: TripType.AIRPORT,
      purpose: "Receive the external audit team arriving from Singapore (SQ 446)", pickupLocation: HO, dropLocation: "Hazrat Shahjalal International Airport, Terminal 2",
      pickupAt: at(80), returnAt: at(80 + 210),
      passengers: [["Md. Rahim", phone("ABG-2041")], ["Daniel Tan (KPMG Singapore)"], ["Priya Nair (KPMG Singapore)"]], passengerCount: 3, vehiclePreference: VehicleType.MICROBUS,
      createdAt: ago(30 * 60), status: S.ASSIGNED, vehicle: "noah", driver: "abul",
      hodApprovedAt: ago(28 * 60), assignedAt: ago(5 * 60), statusNote: "Wait at the arrival hall Gate 2; parking ticket is reimbursed.",
      steps: [submitted(ago(30 * 60), "ABG-2210"), approved(ago(28 * 60), "ABG-2210"), { ...assigned(ago(5 * 60), "noah", "abul"), note: "Wait at the arrival hall Gate 2; parking ticket is reimbursed." }],
    },
    // Waiting for Farid Uddin — urgent.
    urgentHod: {
      requester: "ABG-2101", approver: "ABG-2210", tripType: TripType.ROUND_TRIP, urgent: true,
      purpose: "Interview panel for Factory A production supervisors", pickupLocation: HO, dropLocation: FCA,
      pickupAt: at(150), returnAt: at(150 + 7 * 60),
      passengers: [["Sadia Rahman", phone("ABG-2101")], ["Taslima Nasrin", "01732212000"], ["Kamal Uddin (external panel member)", "01815302114"]], passengerCount: 3,
      createdAt: ago(25), status: S.PENDING_HOD,
      steps: [submitted(ago(25), "ABG-2210", true)],
    },
    // Waiting for Sabina Yasmin at Factory A.
    factoryHod: {
      requester: "ABG-7231", approver: "ABG-5120", tripType: TripType.FULL_DAY,
      purpose: "Supplier site visit — Meghna Packaging corrugated carton line", pickupLocation: "Factory A, Administration Block", dropLocation: "Meghna Packaging Ltd, Konabari, Gazipur",
      pickupAt: at(22 * 60), returnAt: at(31 * 60),
      passengers: [["Farhana Islam", phone("ABG-7231")], ["Shahin Ahmed", phone("ABG-7310")]], passengerCount: 2,
      createdAt: ago(90), status: S.PENDING_HOD,
      steps: [submitted(ago(90), "ABG-5120")],
    },
    // Approved; the fleet manager has to find a car.
    registry: {
      requester: "ABG-2041", approver: "ABG-2210", tripType: TripType.ROUND_TRIP,
      purpose: "Title deed verification at the Tejgaon Sub-Registry Office", pickupLocation: HO, dropLocation: "Sub-Registry Office, Tejgaon Industrial Area, Dhaka",
      pickupAt: at(26 * 60), returnAt: at(29 * 60), passengers: [["Md. Rahim", phone("ABG-2041")]], passengerCount: 1,
      createdAt: ago(5 * 60), status: S.PENDING_FLEET, hodApprovedAt: ago(3 * 60),
      steps: [submitted(ago(5 * 60), "ABG-2210"), approved(ago(3 * 60), "ABG-2210")],
    },
    vendorAudit: {
      requester: "ABG-2305", approver: "ABG-2055", tripType: TripType.FULL_DAY,
      purpose: "Vendor compliance audit — three accessories suppliers in Ashulia", pickupLocation: HO, dropLocation: "Ashulia, Savar (Zirabo and Narsinghapur supplier factories)",
      pickupAt: at(44 * 60), returnAt: at(54 * 60), vehiclePreference: VehicleType.MICROBUS,
      passengers: [["Mehedi Hasan", phone("ABG-2305")], ["Rashed Khan", "01733206600"], ["Nusrat Jahan", phone("ABG-2055")]], passengerCount: 5,
      createdAt: ago(20 * 60), status: S.PENDING_FLEET, hodApprovedAt: ago(18 * 60),
      steps: [submitted(ago(20 * 60), "ABG-2055"), { ...approved(ago(18 * 60), "ABG-2055"), note: "Approved — take the QA checklist pack from Procurement." }],
    },
    supremeCourt: completedTrip({
      requester: "ABG-2041", approver: "ABG-2210", tripType: TripType.ROUND_TRIP, purpose: "Hearing at the Supreme Court — land acquisition writ petition",
      pickupLocation: HO, dropLocation: "Supreme Court of Bangladesh, Shahbag, Dhaka", daysAgo: 6, hour: 9, hours: 5, passengers: [["Md. Rahim", phone("ABG-2041")]], count: 1,
      vehicle: "premio", driver: "mizan", startKm: 48120, endKm: 48168, guard: REZAUL,
    }),
    sparesRun: completedTrip({
      requester: "ABG-7231", approver: "ABG-5120", tripType: TripType.ROUND_TRIP, purpose: "Collect urgent boiler spares from the Tongi central warehouse",
      pickupLocation: "Factory A, Store Room", dropLocation: "ABG Central Warehouse, Tongi Industrial Area", daysAgo: 3, hour: 10, hours: 6, passengers: [["Farhana Islam", phone("ABG-7231")], ["Rafiq Islam", "01719487000"]], count: 2,
      vehicle: "dmax", driver: "shahidul", startKm: 18750, endKm: 18842, guard: NURUL, vehiclePreference: VehicleType.PICKUP,
    }),
    dcOffice: completedTrip({
      requester: "ABG-7231", approver: "ABG-5120", tripType: TripType.ROUND_TRIP, purpose: "Factory licence hearing at the Narayanganj DC office",
      pickupLocation: "Factory A, Administration Block", dropLocation: "Deputy Commissioner's Office, Narayanganj", daysAgo: 9, hour: 10, hours: 4, passengers: [["Farhana Islam", phone("ABG-7231")]], count: 1,
      vehicle: "axio", driver: "sohel", startKm: 61200, endKm: 61246, guard: NURUL,
    }),
    boardGuests: completedTrip({
      requester: "ABG-1001", approver: "ABG-1002", tripType: TripType.AIRPORT, purpose: "Board guests arriving from Dubai (EK 582)",
      pickupLocation: HO, dropLocation: "Hazrat Shahjalal International Airport, Terminal 1", daysAgo: 14, hour: 7, hours: 3, passengers: [["Arif Chowdhury", phone("ABG-1001")], ["Mr. Khalid Al Mansoori"], ["Ms. Aisha Rahman"]], count: 3,
      vehicle: "prado", driver: "abul", startKm: 23410, endKm: 23458, guard: REZAUL, vehiclePreference: VehicleType.SUV,
    }),
    bondSettlement: completedTrip({
      requester: "ABG-2055", approver: "ABG-2210", tripType: TripType.ROUND_TRIP, purpose: "Bond settlement documents to Bangladesh Bank",
      pickupLocation: HO, dropLocation: "Bangladesh Bank, Motijheel C/A, Dhaka", daysAgo: 20, hour: 11, hours: 3, passengers: [["Nusrat Jahan", phone("ABG-2055")]], count: 1,
      vehicle: "noah", driver: "delwar", startKm: 35200, endKm: 35236, guard: REZAUL,
    }),
    rejected: {
      requester: "ABG-6021", approver: "ABG-2210", tripType: TripType.ONE_WAY,
      purpose: "Drop home after the late month-end close", pickupLocation: "ABG Corporate Office, Road 90, Gulshan-2", dropLocation: "Uttara Sector 7, Dhaka",
      pickupAt: ago(4 * 24 * 60 - 13 * 60), passengers: [["Jamal Uddin", phone("ABG-6021")]], passengerCount: 1,
      createdAt: ago(4 * 24 * 60), status: S.REJECTED, rejectedAt: ago(4 * 24 * 60 - 40),
      statusNote: "Pool cars are for official trips. Please claim the late-night ride under the transport allowance instead.",
      steps: [
        submitted(ago(4 * 24 * 60), "ABG-2210"),
        { type: U.STATUS_CHANGED, from: S.PENDING_HOD, to: S.REJECTED, at: ago(4 * 24 * 60 - 40), by: "ABG-2210", note: "Pool cars are for official trips. Please claim the late-night ride under the transport allowance instead.", metadata: { step: "HOD" } },
      ],
    },
    cancelled: {
      requester: "ABG-2400", approver: "ABG-2210", tripType: TripType.ROUND_TRIP,
      purpose: "Department of Environment hearing — clearance certificate renewal", pickupLocation: HO, dropLocation: "Department of Environment, Paribesh Bhaban, Agargaon",
      pickupAt: at(3 * 24 * 60), returnAt: at(3 * 24 * 60 + 4 * 60), passengers: [["Shirin Akhter", phone("ABG-2400")]], passengerCount: 1,
      createdAt: ago(2 * 24 * 60), status: S.CANCELLED, hodApprovedAt: ago(2 * 24 * 60 - 120), cancelledAt: ago(20 * 60),
      statusNote: "The hearing has been moved to next month.",
      steps: [
        submitted(ago(2 * 24 * 60), "ABG-2210"),
        approved(ago(2 * 24 * 60 - 120), "ABG-2210"),
        { type: U.STATUS_CHANGED, from: S.PENDING_FLEET, to: S.CANCELLED, at: ago(20 * 60), by: "ABG-2400", note: "The hearing has been moved to next month." },
      ],
    },
  };

  // Reference numbers in order of creation, continuing each office's daily counter.
  const counters = new Map<string, number>();
  const created: Record<string, { id: string; referenceNumber: string; status: string }> = {};
  const ordered = Object.entries(REQUISITIONS).sort(([, a], [, b]) => a.createdAt.getTime() - b.createdAt.getTime());
  for (const [key, r] of ordered) {
    const requester = employees[r.requester];
    const branchCode = Object.values(branches).find((b) => b.id === requester.branchId)!.code;
    const day = dhakaDateStamp(r.createdAt);
    const counterKey = `PC:${branchCode}|${day}`;
    const sequence = (counters.get(counterKey) ?? 0) + 1;
    counters.set(counterKey, sequence);
    const live = r.status === S.ASSIGNED || r.status === S.IN_PROGRESS || r.status === S.COMPLETED;
    const lastChange = r.steps[r.steps.length - 1].at;
    const row = await prisma.carRequisition.create({
      data: {
        referenceNumber: formatCarRequisitionNumber(day, branchCode, sequence),
        requesterUserId: users[r.requester].id,
        branchId: requester.branchId,
        departmentId: requester.departmentId,
        tripType: r.tripType,
        purpose: r.purpose,
        pickupLocation: r.pickupLocation,
        dropLocation: r.dropLocation,
        pickupAt: r.pickupAt,
        returnAt: r.returnAt ?? null,
        passengers: r.passengers.map(([n, p]) => ({ name: n, phone: p ?? null })),
        passengerCount: r.passengerCount,
        urgent: !!r.urgent,
        vehiclePreference: r.vehiclePreference ?? "ANY",
        approverUserId: users[r.approver].id,
        status: r.status,
        statusNote: r.statusNote ?? null,
        statusChangedAt: lastChange,
        vehicleId: r.vehicle ? vehicles[r.vehicle].id : null,
        driverId: r.driver ? drivers[r.driver].id : null,
        gatePassToken: live ? randomBytes(24).toString("base64url") : null,
        hodApprovedAt: r.hodApprovedAt ?? null,
        assignedAt: r.assignedAt ?? null,
        startedAt: r.startedAt ?? null,
        completedAt: r.completedAt ?? null,
        rejectedAt: r.rejectedAt ?? null,
        cancelledAt: r.cancelledAt ?? null,
        startOdometerKm: r.startKm ?? null,
        endOdometerKm: r.endKm ?? null,
        createdAt: r.createdAt,
        updatedAt: lastChange,
      },
    });
    for (const step of r.steps) {
      const by = step.by || r.requester;
      await prisma.carRequisitionUpdate.create({
        data: {
          requisitionId: row.id,
          type: step.type,
          fromStatus: step.from ?? null,
          toStatus: step.to ?? null,
          note: step.note ?? null,
          actorUserId: users[by].id,
          actorName: users[by].name,
          metadata: (step.metadata ?? {}) as object,
          createdAt: step.at,
        },
      });
    }
    created[key] = { id: row.id, referenceNumber: row.referenceNumber, status: row.status };
  }
  for (const [key, value] of counters) {
    const [branchCode, dayStamp] = key.split("|");
    await prisma.trackingSequence.upsert({ where: { branchCode_dayStamp: { branchCode, dayStamp } }, create: { branchCode, dayStamp, lastValue: value }, update: { lastValue: value } });
  }

  // The trip on the road holds its car and driver.
  await prisma.vehicle.update({ where: { id: vehicles.premio.id }, data: { status: VehicleStatus.ON_TRIP, statusChangedAt: ago(88) } });
  await prisma.driver.update({ where: { id: drivers.mizan.id }, data: { status: DriverStatus.ON_TRIP } });

  // ── A few notifications people would have by now ──
  const notify = async (code: string, key: string, eventType: string, category: string, title: string, body: string, minutesAgo: number, read = false) => {
    const r = created[key];
    await prisma.notification.create({
      data: {
        userId: users[code].id,
        eventType,
        category,
        title,
        body,
        sensitive: false,
        data: { module: "fleet", objectId: r.id, reference: r.referenceNumber, route: `/pool-car/${r.id}`, status: r.status },
        dedupeKey: `seed:fleet:${key}:${code}:${eventType}`,
        createdAt: ago(minutesAgo),
        readAt: read ? ago(minutesAgo - 5) : null,
      },
    });
  };
  const R = REQUISITIONS;
  const when = (d: Date) => new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Dhaka", hour: "numeric", minute: "2-digit" }).format(d);
  await notify("ABG-2210", "urgentHod", "CAR_REQUESTED", NotificationCategory.ACTION_REQUIRED, "Urgent: Pool car request to approve", `${name("ABG-2101")} · ${R.urgentHod.purpose} — ABG Head Office → Factory A, ${when(R.urgentHod.pickupAt)}. ${created.urgentHod.referenceNumber}`, 25);
  await notify("ABG-5120", "factoryHod", "CAR_REQUESTED", NotificationCategory.ACTION_REQUIRED, "Pool car request to approve", `${name("ABG-7231")} · ${R.factoryHod.purpose}. ${created.factoryHod.referenceNumber}`, 90);
  await notify(JAHANGIR, "registry", "CAR_APPROVED", NotificationCategory.ACTION_REQUIRED, "Assign a pool car", `${created.registry.referenceNumber} · ${name("ABG-2041")} — Tejgaon Sub-Registry Office · 1 person`, 180);
  await notify(JAHANGIR, "vendorAudit", "CAR_APPROVED", NotificationCategory.ACTION_REQUIRED, "Assign a pool car", `${created.vendorAudit.referenceNumber} · ${name("ABG-2305")} — Ashulia supplier audit · 5 people`, 18 * 60, true);
  await notify("ABG-2041", "assignedToday", "CAR_ASSIGNED", NotificationCategory.PARCEL_UPDATE, "Car assigned: Toyota Noah", `Dhaka Metro-CHA 15-2234 · Driver Abul Kalam (01739362000) · pickup ${when(R.assignedToday.pickupAt)}. Your gate pass is ready in the app.`, 5 * 60);
  await notify("ABG-3620", "assignedToday", "CAR_ASSIGNED", NotificationCategory.ACTION_REQUIRED, `New trip: ${when(R.assignedToday.pickupAt)}`, `Toyota Noah · Dhaka Metro-CHA 15-2234 · ABG Head Office → Airport Terminal 2 · Md. Rahim (${phone("ABG-2041")}). ${created.assignedToday.referenceNumber}`, 5 * 60);
  await notify("ABG-2055", "inProgress", "CAR_TRIP_STARTED", NotificationCategory.PARCEL_UPDATE, "Your car has left the gate", `Toyota Premio · Dhaka Metro-GA 27-4512 with Mizanur Rahman (01740362100). ${created.inProgress.referenceNumber}`, 88, true);
  await notify("ABG-6021", "rejected", "CAR_REJECTED", NotificationCategory.PARCEL_UPDATE, "Your car request was not approved", `${created.rejected.referenceNumber} · Farid Uddin: ${R.rejected.statusNote}`, 4 * 24 * 60 - 40, true);
}
