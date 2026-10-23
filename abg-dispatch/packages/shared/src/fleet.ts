import type { StatusTone } from "./labels";

/**
 * Pool car requisition and fleet management: an employee requests a car, the
 * head of department approves, the fleet manager assigns a vehicle and driver,
 * and the car leaves the gate on a QR gate pass that security scans.
 */
export const VehicleType = {
  SEDAN: "SEDAN",
  SUV: "SUV",
  MICROBUS: "MICROBUS",
  PICKUP: "PICKUP",
  COASTER: "COASTER",
} as const;
export type VehicleType = (typeof VehicleType)[keyof typeof VehicleType];

export const VehicleStatus = {
  AVAILABLE: "AVAILABLE",
  ON_TRIP: "ON_TRIP",
  MAINTENANCE: "MAINTENANCE",
  INACTIVE: "INACTIVE",
} as const;
export type VehicleStatus = (typeof VehicleStatus)[keyof typeof VehicleStatus];

export const DriverStatus = {
  AVAILABLE: "AVAILABLE",
  ON_TRIP: "ON_TRIP",
  OFF_DUTY: "OFF_DUTY",
} as const;
export type DriverStatus = (typeof DriverStatus)[keyof typeof DriverStatus];

export const TripType = {
  ONE_WAY: "ONE_WAY",
  ROUND_TRIP: "ROUND_TRIP",
  FULL_DAY: "FULL_DAY",
  AIRPORT: "AIRPORT",
} as const;
export type TripType = (typeof TripType)[keyof typeof TripType];

export const CarRequisitionStatus = {
  PENDING_HOD: "PENDING_HOD",
  PENDING_FLEET: "PENDING_FLEET",
  ASSIGNED: "ASSIGNED",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
  REJECTED: "REJECTED",
  CANCELLED: "CANCELLED",
} as const;
export type CarRequisitionStatus = (typeof CarRequisitionStatus)[keyof typeof CarRequisitionStatus];

export const CarRequisitionUpdateType = {
  SUBMITTED: "SUBMITTED",
  STATUS_CHANGED: "STATUS_CHANGED",
  ASSIGNED: "ASSIGNED",
  REASSIGNED: "REASSIGNED",
  GATE_SCANNED: "GATE_SCANNED",
  NOTE_ADDED: "NOTE_ADDED",
} as const;
export type CarRequisitionUpdateType = (typeof CarRequisitionUpdateType)[keyof typeof CarRequisitionUpdateType];

export const CAR_REQUISITION_TRANSITIONS: Record<CarRequisitionStatus, readonly CarRequisitionStatus[]> = {
  PENDING_HOD: [CarRequisitionStatus.PENDING_FLEET, CarRequisitionStatus.REJECTED, CarRequisitionStatus.CANCELLED],
  PENDING_FLEET: [CarRequisitionStatus.ASSIGNED, CarRequisitionStatus.REJECTED, CarRequisitionStatus.CANCELLED],
  ASSIGNED: [CarRequisitionStatus.IN_PROGRESS, CarRequisitionStatus.CANCELLED],
  IN_PROGRESS: [CarRequisitionStatus.COMPLETED],
  COMPLETED: [],
  REJECTED: [],
  CANCELLED: [],
};

export function canCarRequisitionTransition(from: string, to: string): boolean {
  return CAR_REQUISITION_TRANSITIONS[from as CarRequisitionStatus]?.includes(to as CarRequisitionStatus) ?? false;
}

export const OPEN_CAR_REQUISITION_STATUSES: readonly CarRequisitionStatus[] = [
  CarRequisitionStatus.PENDING_HOD,
  CarRequisitionStatus.PENDING_FLEET,
  CarRequisitionStatus.ASSIGNED,
  CarRequisitionStatus.IN_PROGRESS,
];

/** The workflow shown as a stepper: Pending HOD → Pending Fleet Manager → Assigned → In Progress → Completed. */
export const CAR_REQUISITION_PIPELINE: readonly CarRequisitionStatus[] = [
  CarRequisitionStatus.PENDING_HOD,
  CarRequisitionStatus.PENDING_FLEET,
  CarRequisitionStatus.ASSIGNED,
  CarRequisitionStatus.IN_PROGRESS,
  CarRequisitionStatus.COMPLETED,
];

export const VEHICLE_TYPE_LABEL: Record<VehicleType, string> = {
  SEDAN: "Sedan",
  SUV: "SUV",
  MICROBUS: "Microbus",
  PICKUP: "Pickup",
  COASTER: "Coaster",
};

export const VEHICLE_STATUS_LABEL: Record<VehicleStatus, string> = {
  AVAILABLE: "Available",
  ON_TRIP: "On trip",
  MAINTENANCE: "In maintenance",
  INACTIVE: "Inactive",
};

export const VEHICLE_STATUS_TONE: Record<VehicleStatus, StatusTone> = {
  AVAILABLE: "success",
  ON_TRIP: "active",
  MAINTENANCE: "pending",
  INACTIVE: "neutral",
};

export const DRIVER_STATUS_LABEL: Record<DriverStatus, string> = {
  AVAILABLE: "Available",
  ON_TRIP: "On trip",
  OFF_DUTY: "Off duty",
};

export const TRIP_TYPE_LABEL: Record<TripType, string> = {
  ONE_WAY: "One way",
  ROUND_TRIP: "Round trip",
  FULL_DAY: "Full day",
  AIRPORT: "Airport transfer",
};

export const CAR_REQUISITION_STATUS_LABEL: Record<CarRequisitionStatus, string> = {
  PENDING_HOD: "Pending HOD",
  PENDING_FLEET: "Pending fleet manager",
  ASSIGNED: "Assigned",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
};

export const CAR_REQUISITION_STATUS_TONE: Record<CarRequisitionStatus, StatusTone> = {
  PENDING_HOD: "pending",
  PENDING_FLEET: "pending",
  ASSIGNED: "active",
  IN_PROGRESS: "active",
  COMPLETED: "success",
  REJECTED: "danger",
  CANCELLED: "neutral",
};

export const DRIVER_STATUS_TONE: Record<DriverStatus, StatusTone> = {
  AVAILABLE: "success",
  ON_TRIP: "active",
  OFF_DUTY: "neutral",
};

/** What the requester would like: any car, or a type (a microbus for a team, an SUV for site roads). */
export const VEHICLE_PREFERENCE_ANY = "ANY";
export type VehiclePreference = typeof VEHICLE_PREFERENCE_ANY | VehicleType;
export const VEHICLE_PREFERENCES: readonly VehiclePreference[] = [VEHICLE_PREFERENCE_ANY, ...Object.values(VehicleType)];
export const VEHICLE_PREFERENCE_LABEL: Record<VehiclePreference, string> = {
  ANY: "Any available car",
  ...VEHICLE_TYPE_LABEL,
};

/** The buttons a viewer may see on a requisition (`viewer.actions`). The API re-checks every one. */
export const CarRequisitionAction = {
  APPROVE: "APPROVE",
  REJECT: "REJECT",
  ASSIGN: "ASSIGN",
  REASSIGN: "REASSIGN",
  START: "START",
  COMPLETE: "COMPLETE",
  CANCEL: "CANCEL",
} as const;
export type CarRequisitionAction = (typeof CarRequisitionAction)[keyof typeof CarRequisitionAction];

/** Security scans the gate pass when the car leaves (EXIT → In progress) and comes back (RETURN → Completed). */
export const GateScanDirection = {
  EXIT: "EXIT",
  RETURN: "RETURN",
} as const;
export type GateScanDirection = (typeof GateScanDirection)[keyof typeof GateScanDirection];

export const GATE_SCAN_DIRECTION_LABEL: Record<GateScanDirection, string> = {
  EXIT: "Exit",
  RETURN: "Return",
};

/** Round trips and full-day bookings must say when the car comes back. */
export const TRIP_TYPES_NEEDING_RETURN: readonly TripType[] = [TripType.ROUND_TRIP, TripType.FULL_DAY];

export function tripNeedsReturn(tripType: string): boolean {
  return TRIP_TYPES_NEEDING_RETURN.includes(tripType as TripType);
}

/** How long a car and driver are blocked when no return time is given. */
export const TRIP_DEFAULT_HOURS: Record<TripType, number> = {
  ONE_WAY: 3,
  ROUND_TRIP: 4,
  FULL_DAY: 10,
  AIRPORT: 4,
};

export const FLEET_LIMITS = {
  purposeMin: 3,
  purposeMax: 200,
  placeMax: 200,
  noteMax: 1000,
  maxPassengers: 14,
  passengerNameMax: 80,
  /** Passenger seats, not counting the driver. */
  maxSeats: 40,
  registrationMax: 40,
  odometerMaxKm: 2_000_000,
  /** Service, fitness, insurance and licence dates turn amber this many days ahead. */
  dueSoonDays: 30,
  /** A gate pass opens this many hours before the pickup day and closes this many after the trip's last day. */
  gatePassGraceHours: 6,
} as const;

const HOUR_MS = 3_600_000;
const DHAKA_OFFSET_MS = 6 * HOUR_MS;

/** 00:00 Asia/Dhaka (UTC+6, no daylight saving) of the day `date` falls on. */
function dhakaMidnight(date: Date): Date {
  const shifted = new Date(date.getTime() + DHAKA_OFFSET_MS);
  return new Date(Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate()) - DHAKA_OFFSET_MS);
}

/** The span a booking holds its car and driver: pickup until the return time (or a default length for the trip type). */
export function carTripWindow(pickupAt: Date, returnAt: Date | null | undefined, tripType: string): { start: Date; end: Date } {
  const hours = TRIP_DEFAULT_HOURS[tripType as TripType] ?? 4;
  const end = returnAt && returnAt.getTime() > pickupAt.getTime() ? returnAt : new Date(pickupAt.getTime() + hours * HOUR_MS);
  return { start: pickupAt, end };
}

export function carWindowsOverlap(a: { start: Date; end: Date }, b: { start: Date; end: Date }): boolean {
  return a.start.getTime() < b.end.getTime() && b.start.getTime() < a.end.getTime();
}

/** When a vehicle gate pass lets the car out: the pickup day (through the trip's last day) ± the grace window. */
export function gatePassValidity(pickupAt: Date, returnAt?: Date | null): { validFrom: Date; validUntil: Date } {
  const grace = FLEET_LIMITS.gatePassGraceHours * HOUR_MS;
  const lastDay = returnAt && returnAt.getTime() > pickupAt.getTime() ? returnAt : pickupAt;
  return {
    validFrom: new Date(dhakaMidnight(pickupAt).getTime() - grace),
    validUntil: new Date(dhakaMidnight(lastDay).getTime() + 24 * HOUR_MS + grace),
  };
}

export type FleetDateState = "OVERDUE" | "DUE_SOON";

/** Overdue once the day has passed, due soon within `dueSoonDays`; null when comfortably ahead or not set. */
export function fleetDateState(date: Date | string | null | undefined, now: Date = new Date()): FleetDateState | null {
  if (!date) return null;
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return null;
  const today = dhakaMidnight(now).getTime();
  if (d.getTime() < today) return "OVERDUE";
  if (d.getTime() < today + FLEET_LIMITS.dueSoonDays * 24 * HOUR_MS) return "DUE_SOON";
  return null;
}

/** PC-YYMMDD-OFFICE-NNN, e.g. PC-261021-HO-004. */
export function formatCarRequisitionNumber(dayStamp: string, branchCode: string, sequence: number): string {
  return `PC-${dayStamp}-${branchCode}-${String(sequence).padStart(3, "0")}`;
}
