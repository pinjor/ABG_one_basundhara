/**
 * Domain enums — Section 4 of the master build prompt.
 * Shared between API (Prisma maps to these) and web (status badges, filters).
 */

// 4.1 Zones
export enum ZoneType {
  STADIUM = "Stadium",
  FACILITY = "Facility",
  HOSPITALITY = "Hospitality",
  COMMERCIAL = "Commercial",
  PARKING = "Parking",
  RESTRICTED = "Restricted",
}
export enum ZoneStatus {
  OPERATIONAL = "Operational",
  MAINTENANCE = "Maintenance",
  RESTRICTED = "Restricted",
}

// 4.2 Facilities
export enum FacilityType {
  STADIUM = "Stadium",
  FOOTBALL_PITCH = "Football Pitch",
  CRICKET_GROUND = "Cricket Ground",
  EVENT_HALL = "Event Hall",
  TRAINING_GROUND = "Training Ground",
  TURF = "Turf",
  BASKETBALL_COURT = "Basketball Court",
  TENNIS_COURT = "Tennis Court",
  PADEL_COURT = "Padel Court",
  SQUASH_COURT = "Squash Court",
  BADMINTON_COURT = "Badminton Court",
  SWIMMING_POOL = "Swimming Pool",
  GYM = "Gym",
  RESTAURANT = "Restaurant",
  LOUNGE = "Lounge",
  CHANGING_ROOM = "Changing Room",
  MEDIA_ROOM = "Media Room",
  MEDICAL_ROOM = "Medical Room",
  STORAGE = "Storage",
}
export enum FacilityStatus {
  AVAILABLE = "Available",
  IN_USE = "In Use",
  RESERVED = "Reserved",
  MAINTENANCE = "Maintenance",
}

/** Facility status transition graph (Section 4.2) — enforced server-side, mirrored here for UI affordance. */
export const FACILITY_STATUS_TRANSITIONS: Record<string, string[]> = {
  [FacilityStatus.AVAILABLE]: [FacilityStatus.RESERVED, FacilityStatus.IN_USE, FacilityStatus.MAINTENANCE],
  [FacilityStatus.RESERVED]: [FacilityStatus.IN_USE, FacilityStatus.AVAILABLE],
  [FacilityStatus.IN_USE]: [FacilityStatus.AVAILABLE, FacilityStatus.MAINTENANCE],
  [FacilityStatus.MAINTENANCE]: [FacilityStatus.AVAILABLE],
};

// 4.3 Surfaces & Equipment
export enum SurfaceType {
  NATURAL_GRASS = "Natural Grass",
  HYBRID_TURF = "Hybrid Turf",
  SYNTHETIC_TURF = "Synthetic Turf",
  HARD_COURT = "Hard Court",
  CLAY_COURT = "Clay Court",
  POOL_WATER = "Pool Water",
  WOODEN_COURT = "Wooden Court",
}
export enum SurfaceCondition {
  EXCELLENT = "Excellent",
  GOOD = "Good",
  FAIR = "Fair",
  NEEDS_ATTENTION = "Needs Attention",
  CLOSED = "Closed",
}
export enum ClosureStatus {
  OPEN = "Open",
  CLOSED_FOR_MAINTENANCE = "Closed for Maintenance",
  CLOSED_FOR_RECOVERY = "Closed for Recovery",
}
export enum EquipmentCategory {
  BALLS = "Balls",
  NETS = "Nets",
  GOALS = "Goals",
  PROTECTIVE_GEAR = "Protective Gear",
  GYM_EQUIPMENT = "Gym Equipment",
  POOL_EQUIPMENT = "Pool Equipment",
  MAINTENANCE_TOOLS = "Maintenance Tools",
  AV_EQUIPMENT = "AV Equipment",
}
export enum EquipmentStatus {
  IN_STOCK = "In Stock",
  DEPLOYED = "Deployed",
  UNDER_REPAIR = "Under Repair",
}

// 4.4 Bookings
export enum BookingType {
  PUBLIC = "Public",
  MEMBER = "Member",
  CORPORATE = "Corporate",
  ACADEMY = "Academy",
  TEAM = "Team",
  SCHOOL = "School",
}
export enum BookingStatus {
  PENDING = "Pending",
  CONFIRMED = "Confirmed",
  CANCELLED = "Cancelled",
  COMPLETED = "Completed",
  NO_SHOW = "No-show",
}
export enum PaymentStatus {
  UNPAID = "Unpaid",
  DEPOSIT_PAID = "Deposit Paid",
  PAID = "Paid",
  REFUNDED = "Refunded",
}

// 4.5 Membership
export enum MembershipTier {
  INDIVIDUAL = "Individual",
  FAMILY = "Family",
  CORPORATE = "Corporate",
}
export enum MemberStatus {
  ACTIVE = "Active",
  FROZEN = "Frozen",
  EXPIRED = "Expired",
}

// 4.6 Access Control
export enum GateType {
  MAIN = "Main",
  VIP = "VIP",
  TEAM = "Team",
  MEDIA = "Media",
  SERVICE = "Service",
}
export enum GateStatus {
  ONLINE = "Online",
  OFFLINE = "Offline",
}
export enum AccessMethod {
  FACE = "Face",
  QR = "QR",
  RFID = "RFID",
  BIOMETRIC = "Biometric",
}
export enum AccessResult {
  APPROVED = "Approved",
  DENIED = "Denied",
}

// 4.7 Visitors
export enum VisitorCategory {
  GUEST = "Guest",
  CONTRACTOR = "Contractor",
  SUPPLIER = "Supplier",
  SCHOOL_GROUP = "School Group",
  TOUR = "Tour",
  MEDIA = "Media",
}
export enum VisitorStatus {
  EXPECTED = "Expected",
  CHECKED_IN = "Checked In",
  CHECKED_OUT = "Checked Out",
}

// 4.8 VIP / VVIP
export enum VIPClassification {
  GOVERNMENT = "Government",
  FEDERATION = "Federation",
  CORPORATE = "Corporate",
  DIPLOMATIC = "Diplomatic",
}
export enum VIPStatus {
  SCHEDULED = "Scheduled",
  ARRIVED = "Arrived",
  DEPARTED = "Departed",
}

// 4.9 Hospitality & Lounges
export enum LoungeStatus {
  OPEN = "Open",
  CLOSED = "Closed",
  AT_CAPACITY = "At Capacity",
}
export enum ServiceRequestStatus {
  PENDING = "Pending",
  PREPARING = "Preparing",
  DELIVERED = "Delivered",
}

// 4.10 Restaurant / Concessions
export enum OutletType {
  RESTAURANT = "Restaurant",
  FOOD_COURT = "Food Court",
  CAFE = "Café",
  CONCESSION = "Concession",
}
export enum OutletStatus {
  OPEN = "Open",
  CLOSED = "Closed",
}
export enum OrderStatus {
  ORDER_RECEIVED = "Order Received",
  PREPARING = "Preparing",
  READY_FOR_PICKUP = "Ready for Pickup",
  DELIVERED = "Delivered",
}

// 4.11 Parking
export enum ParkingZoneType {
  PUBLIC = "Public",
  VIP = "VIP",
  STAFF = "Staff",
  TEAM = "Team",
  VISITOR = "Visitor",
}

// 4.12 Transport & Fleet
export enum FleetVehicleType {
  BUGGY = "Buggy",
  SHUTTLE = "Shuttle",
  VIP_CAR = "VIP Car",
}
export enum FleetVehicleStatus {
  AVAILABLE = "Available",
  ON_TRIP = "On Trip",
  CHARGING = "Charging",
  MAINTENANCE = "Maintenance",
}
export enum TripStatus {
  REQUESTED = "Requested",
  IN_PROGRESS = "In Progress",
  COMPLETED = "Completed",
}
