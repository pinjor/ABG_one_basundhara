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

export const FLEET_LIMITS = {
  purposeMin: 3,
  purposeMax: 200,
  placeMax: 200,
  noteMax: 1000,
  maxPassengers: 14,
} as const;

/** PC-YYMMDD-OFFICE-NNN, e.g. PC-261021-HO-004. */
export function formatCarRequisitionNumber(dayStamp: string, branchCode: string, sequence: number): string {
  return `PC-${dayStamp}-${branchCode}-${String(sequence).padStart(3, "0")}`;
}
