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
  TICKET_ADMINISTRATOR = "TICKET_ADMINISTRATOR",
  FINANCE_CONTROLLER = "FINANCE_CONTROLLER",
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
  [Role.TICKET_ADMINISTRATOR]: "Ticket Administrator",
  [Role.FINANCE_CONTROLLER]: "Finance Controller",
};

export const ROLE_SCOPE: Record<Role, string> = {
  [Role.SUPER_ADMIN]: "Full command of every module",
  [Role.VENUE_FACILITY_MANAGER]: "Zones, venues and surfaces",
  [Role.BOOKINGS_OFFICER]: "Bookings and membership",
  [Role.GATE_SECURITY_OFFICER]: "Gates and visitors",
  [Role.PROTOCOL_OFFICER]: "VIP / VVIP protocol",
  [Role.HOSPITALITY_LEAD]: "Lounges and outlets",
  [Role.PARKING_MARSHAL]: "Parking operations",
  [Role.FLEET_DISPATCHER]: "Transport and fleet",
  [Role.READ_ONLY_EXECUTIVE]: "View-only across the city",
  [Role.TICKET_ADMINISTRATOR]: "Events, ticket prices and orders",
  [Role.FINANCE_CONTROLLER]: "Payments, refunds and ticket reports",
};

/** Landing path after login — Command Centre for admin / executive, otherwise the role's first module. */
export const ROLE_HOME: Record<Role, string> = {
  [Role.SUPER_ADMIN]: "/",
  [Role.VENUE_FACILITY_MANAGER]: "/zones",
  [Role.BOOKINGS_OFFICER]: "/bookings",
  [Role.GATE_SECURITY_OFFICER]: "/gates",
  [Role.PROTOCOL_OFFICER]: "/vip",
  [Role.HOSPITALITY_LEAD]: "/lounges",
  [Role.PARKING_MARSHAL]: "/parking",
  [Role.FLEET_DISPATCHER]: "/fleet",
  [Role.READ_ONLY_EXECUTIVE]: "/",
  [Role.TICKET_ADMINISTRATOR]: "/ticketing",
  [Role.FINANCE_CONTROLLER]: "/ticketing/payments",
};

/**
 * Modules each role may open. Keys match NAV module keys (Sidebar / routes).
 * "*" means every module. Read-only executive can view all but cannot write.
 */
export const ROLE_MODULE_ACCESS: Record<Role, { modules: string[] | "*"; readOnly: boolean }> = {
  [Role.SUPER_ADMIN]: { modules: "*", readOnly: false },
  [Role.VENUE_FACILITY_MANAGER]: { modules: ["zones", "facilities", "surfaces"], readOnly: false },
  [Role.BOOKINGS_OFFICER]: { modules: ["bookings", "membership"], readOnly: false },
  [Role.GATE_SECURITY_OFFICER]: { modules: ["gates", "visitors", "ticketing-scan"], readOnly: false },
  [Role.PROTOCOL_OFFICER]: { modules: ["vip"], readOnly: false },
  [Role.HOSPITALITY_LEAD]: { modules: ["lounges", "outlets"], readOnly: false },
  [Role.PARKING_MARSHAL]: { modules: ["parking"], readOnly: false },
  [Role.FLEET_DISPATCHER]: { modules: ["fleet"], readOnly: false },
  [Role.READ_ONLY_EXECUTIVE]: { modules: "*", readOnly: true },
  [Role.TICKET_ADMINISTRATOR]: {
    modules: ["ticketing-overview", "ticketing-events", "ticketing-orders", "ticketing-reports"],
    readOnly: false,
  },
  [Role.FINANCE_CONTROLLER]: {
    modules: ["ticketing-overview", "ticketing-orders", "ticketing-payments", "ticketing-reports"],
    readOnly: false,
  },
};

export function canAccessModule(role: string | undefined | null, moduleKey: string): boolean {
  if (["command-centre", "calendar", "tasks", "approvals"].includes(moduleKey)) return true;
  const access = ROLE_MODULE_ACCESS[role as Role];
  if (!access) return false;
  return access.modules === "*" || access.modules.includes(moduleKey);
}

export function canWriteModule(role: string | undefined | null, moduleKey: string): boolean {
  if (!canAccessModule(role, moduleKey)) return false;
  return !ROLE_MODULE_ACCESS[role as Role].readOnly;
}

export function roleHomePath(role: string | undefined | null): string {
  return ROLE_HOME[role as Role] ?? "/";
}
