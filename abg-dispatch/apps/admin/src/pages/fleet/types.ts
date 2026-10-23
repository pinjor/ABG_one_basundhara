/** Shapes returned by the pool car API (apps/api/src/fleet/fleet.service.ts). */

export interface BranchRef {
  id: string;
  name: string;
  code: string;
}

export interface PipelineStep {
  status: string;
  label: string;
  at: string | null;
  state: "DONE" | "CURRENT" | "UPCOMING" | "HALTED";
}

export interface CarRequisition {
  id: string;
  referenceNumber: string;
  status: string;
  statusNote: string | null;
  statusChangedAt: string;
  tripType: string;
  purpose: string;
  pickupLocation: string;
  dropLocation: string;
  pickupAt: string;
  returnAt: string | null;
  expectedEndAt: string;
  passengers: { name: string; phone: string | null }[];
  passengerCount: number;
  urgent: boolean;
  vehiclePreference: string;
  branch: BranchRef;
  requester: { userId: string; name: string; employeeCode: string | null; designation: string | null; department: string | null; phone: string | null };
  approver: { userId: string; name: string; designation: string | null };
  vehicle: VehicleBrief | null;
  driver: { id: string; fullName: string; phone: string; hasAccount: boolean } | null;
  odometer: { startKm: number | null; endKm: number | null; distanceKm: number | null; vehicleKm: number | null };
  createdAt: string;
  hodApprovedAt: string | null;
  assignedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  rejectedAt: string | null;
  cancelledAt: string | null;
  pipeline: { steps: PipelineStep[]; outcome: { status: string; label: string; at: string | null; note: string | null } | null };
  gatePass: { payload: string; token: string; validFrom: string; validUntil: string } | null;
  updates: CarUpdate[];
  viewer: { isRequester: boolean; isApprover: boolean; isDriver: boolean; isStaff: boolean; canManage: boolean; actions: string[] };
}

export interface CarUpdate {
  id: string;
  type: string;
  fromStatus: string | null;
  toStatus: string | null;
  note: string | null;
  actor: string;
  byMe: boolean;
  metadata: Record<string, any>;
  createdAt: string;
}

export interface CarRow {
  id: string;
  referenceNumber: string;
  status: string;
  statusNote: string | null;
  statusChangedAt: string;
  tripType: string;
  purpose: string;
  pickupLocation: string;
  dropLocation: string;
  pickupAt: string;
  returnAt: string | null;
  passengerCount: number;
  urgent: boolean;
  vehiclePreference: string;
  branch: BranchRef;
  requester: { name: string; employeeCode: string | null; designation: string | null; department: string | null };
  approverName: string;
  vehicle: { id: string; registrationNumber: string; name: string; type: string; seats: number } | null;
  driver: { id: string; fullName: string; phone: string } | null;
  awaiting: "HOD" | "FLEET" | null;
  mine: boolean;
  awaitingMe: boolean;
  createdAt: string;
}

/** A row of GET /pool-car/approvals (the HOD inbox). */
export interface ApprovalRow {
  id: string;
  referenceNumber: string;
  title: string;
  tripType: string;
  pickupAt: string;
  returnAt: string | null;
  pickupLocation: string;
  dropLocation: string;
  passengerCount: number;
  urgent: boolean;
  status: string;
  awaiting: "HOD";
  requester: { name: string; designation: string | null; department: string | null };
  createdAt: string;
}

export interface VehicleBrief {
  id: string;
  registrationNumber: string;
  make: string;
  model: string;
  name: string;
  type: string;
  typeLabel: string;
  seats: number;
  colour: string | null;
  status: string;
}

export interface Availability {
  available: boolean;
  code: string | null;
  reason: string | null;
  conflict: { id: string; referenceNumber: string; status: string; pickupAt: string; until: string } | null;
}

export interface TripBrief {
  id: string;
  referenceNumber: string;
  status: string;
  pickupAt: string;
  until: string;
}

export interface Vehicle extends VehicleBrief {
  fuelType: string | null;
  branch: BranchRef;
  statusLabel: string;
  statusNote: string | null;
  statusChangedAt: string;
  odometerKm: number;
  nextServiceAt: string | null;
  fitnessExpiry: string | null;
  insuranceExpiry: string | null;
  notes: string | null;
  active: boolean;
  alerts: { kind: "SERVICE" | "FITNESS" | "INSURANCE"; date: string; state: "OVERDUE" | "DUE_SOON" }[];
  currentTrip: (TripBrief & { driverName: string | null }) | null;
  nextTrip: (TripBrief & { driverName: string | null }) | null;
  upcomingTrips: number;
  availability: Availability & { matchesPreference: boolean | null };
}

export interface Driver {
  id: string;
  fullName: string;
  phone: string;
  licenseNumber: string;
  licenseExpiry: string | null;
  licenseAlert: { state: "OVERDUE" | "DUE_SOON"; date: string } | null;
  branch: BranchRef;
  status: string;
  statusLabel: string;
  active: boolean;
  employeeId: string | null;
  hasAccount: boolean;
  currentTrip: (TripBrief & { vehicle: string | null }) | null;
  nextTrip: (TripBrief & { vehicle: string | null }) | null;
  upcomingTrips: number;
  availability: Availability;
}

export interface FleetSummary {
  activeRequisitions: number;
  pendingHod: number;
  pendingFleet: number;
  assigned: number;
  inProgress: number;
  awaitingMe: number;
  tripsToday: number;
  completedLast30Days: number;
  counts: Record<string, number>;
  vehicles: { total: number; available: number; onTrip: number; maintenance: number; inactive: number; documentsDue: number };
  poolAvailabilityPct: number;
  drivers: { total: number; available: number; onTrip: number; offDuty: number };
}

export interface GatePassView {
  state: "VALID" | "OUT" | "USED" | "CANCELLED" | "EXPIRED" | "NOT_YET_VALID";
  valid: boolean;
  message: string;
  allowed: ("EXIT" | "RETURN")[];
  scanHere: boolean;
  scanNote: string | null;
  validFrom: string;
  validUntil: string;
  requisition: {
    id: string;
    referenceNumber: string;
    status: string;
    tripType: string;
    purpose: string;
    pickupLocation: string;
    dropLocation: string;
    pickupAt: string;
    returnAt: string | null;
    urgent: boolean;
    passengerCount: number;
    startedAt: string | null;
    completedAt: string | null;
    branch: BranchRef;
    requester: { name: string; designation: string | null; department: string | null; phone: string | null };
    approver: { name: string };
  };
  vehicle: VehicleBrief | null;
  driver: { id: string; fullName: string; phone: string; licenseNumber: string } | null;
  passengers: { name: string; phone: string | null }[];
  scans: { direction: "EXIT" | "RETURN" | null; at: string; by: string }[];
}

export interface DirectoryPerson {
  id: string;
  employeeCode: string;
  fullName: string;
  designation: string | null;
  department: { id: string; name: string } | null;
  branch: { id: string; name: string; code: string } | null;
  isMe: boolean;
  hasAccount: boolean;
}

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}
