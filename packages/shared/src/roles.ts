/**
 * RBAC roles — Section 3 of the master build prompt.
 */
export enum Role {
  SUPER_ADMIN = "SUPER_ADMIN",
  VENUE_FACILITY_MANAGER = "VENUE_FACILITY_MANAGER",
  BOOKINGS_OFFICER = "BOOKINGS_OFFICER",
  GATE_SECURITY_OFFICER = "GATE_SECURITY_OFFICER",
  PROTOCOL_OFFICER = "PROTOCOL_OFFICER",
  HOSPITALITY_LEAD = "HOSPITALITY_LEAD",
  PARKING_MARSHAL = "PARKING_MARSHAL",
  FLEET_DISPATCHER = "FLEET_DISPATCHER",
  READ_ONLY_EXECUTIVE = "READ_ONLY_EXECUTIVE",
}

export const ROLE_LABELS: Record<Role, string> = {
  [Role.SUPER_ADMIN]: "Super Admin",
  [Role.VENUE_FACILITY_MANAGER]: "Venue / Facility Manager",
  [Role.BOOKINGS_OFFICER]: "Bookings Officer",
  [Role.GATE_SECURITY_OFFICER]: "Gate / Security Officer",
  [Role.PROTOCOL_OFFICER]: "Protocol Officer",
  [Role.HOSPITALITY_LEAD]: "Hospitality Lead",
  [Role.PARKING_MARSHAL]: "Parking Marshal",
  [Role.FLEET_DISPATCHER]: "Fleet Dispatcher",
  [Role.READ_ONLY_EXECUTIVE]: "Read-only Executive",
};

/** Modules each role may access. "*" means every module. Read-only executive gets read access to all. */
export const ROLE_MODULE_ACCESS: Record<Role, { modules: string[] | "*"; readOnly: boolean }> = {
  [Role.SUPER_ADMIN]: { modules: "*", readOnly: false },
  [Role.VENUE_FACILITY_MANAGER]: { modules: ["zones", "facilities", "surfaces", "equipment"], readOnly: false },
  [Role.BOOKINGS_OFFICER]: { modules: ["bookings", "members"], readOnly: false },
  [Role.GATE_SECURITY_OFFICER]: { modules: ["gates", "access-log", "visitors"], readOnly: false },
  [Role.PROTOCOL_OFFICER]: { modules: ["vip-guests"], readOnly: false },
  [Role.HOSPITALITY_LEAD]: { modules: ["lounges", "service-requests", "outlets", "orders"], readOnly: false },
  [Role.PARKING_MARSHAL]: { modules: ["parking-zones", "vehicle-log"], readOnly: false },
  [Role.FLEET_DISPATCHER]: { modules: ["fleet", "trips"], readOnly: false },
  [Role.READ_ONLY_EXECUTIVE]: { modules: "*", readOnly: true },
};
