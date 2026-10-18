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
  HR_MANAGER = "HR_MANAGER",
  SECURITY_MANAGER = "SECURITY_MANAGER",
  CHAIRMAN = "CHAIRMAN",
}

export const ROLE_LABELS: Record<Role, string> = {
  [Role.SUPER_ADMIN]: "Super Admin",
  [Role.VENUE_FACILITY_MANAGER]: "Venue / Facility Manager",
  [Role.BOOKINGS_OFFICER]: "Booking Manager",
  [Role.GATE_SECURITY_OFFICER]: "Gate / Security Officer",
  [Role.PROTOCOL_OFFICER]: "Protocol Officer",
  [Role.HOSPITALITY_LEAD]: "Hospitality Lead",
  [Role.PARKING_MARSHAL]: "Parking Marshal",
  [Role.FLEET_DISPATCHER]: "Fleet Dispatcher",
  [Role.READ_ONLY_EXECUTIVE]: "Read-only Executive",
  [Role.TICKET_ADMINISTRATOR]: "Ticket Administrator",
  [Role.FINANCE_CONTROLLER]: "Finance Executive",
  [Role.HR_MANAGER]: "HRM",
  [Role.SECURITY_MANAGER]: "Security Manager",
  [Role.CHAIRMAN]: "Chairman",
};

export const ROLE_SCOPE: Record<Role, string> = {
  [Role.SUPER_ADMIN]: "Full command of every module",
  [Role.VENUE_FACILITY_MANAGER]: "Zones, venues and surfaces",
  [Role.BOOKINGS_OFFICER]: "Facility booking and match tickets",
  [Role.GATE_SECURITY_OFFICER]: "Gates and visitors",
  [Role.PROTOCOL_OFFICER]: "VIP / VVIP protocol",
  [Role.HOSPITALITY_LEAD]: "Lounges and outlets",
  [Role.PARKING_MARSHAL]: "Parking operations",
  [Role.FLEET_DISPATCHER]: "Transport and fleet",
  [Role.READ_ONLY_EXECUTIVE]: "View-only across the city",
  [Role.TICKET_ADMINISTRATOR]: "Events, ticket prices and orders",
  [Role.FINANCE_CONTROLLER]: "Finance, procurement and inventory",
  [Role.HR_MANAGER]: "Staff, attendance and workforce",
  [Role.SECURITY_MANAGER]: "Cameras, access and site security",
  [Role.CHAIRMAN]: "Whole-city overview",
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
  [Role.FINANCE_CONTROLLER]: "/finance",
  [Role.HR_MANAGER]: "/hrm",
  [Role.SECURITY_MANAGER]: "/security",
  [Role.CHAIRMAN]: "/chairman",
};

/**
 * Modules each role may open. Keys match NAV module keys (Sidebar / routes).
 * "*" means every module. Retired demo roles have no modules.
 */
const TICKETING_MODULES = [
  "ticketing-overview",
  "ticketing-events",
  "ticketing-orders",
  "ticketing-payments",
  "ticketing-scan",
  "ticketing-reports",
];

const NONE: { modules: string[]; readOnly: boolean } = { modules: [], readOnly: true };

export const ROLE_MODULE_ACCESS: Record<Role, { modules: string[] | "*"; readOnly: boolean }> = {
  [Role.SUPER_ADMIN]: { modules: "*", readOnly: false },
  [Role.BOOKINGS_OFFICER]: { modules: ["bookings", "membership", "facilities", ...TICKETING_MODULES], readOnly: false },
  [Role.FINANCE_CONTROLLER]: { modules: ["finance", "procurement"], readOnly: false },
  [Role.HR_MANAGER]: { modules: ["hrm"], readOnly: false },
  [Role.SECURITY_MANAGER]: { modules: ["security"], readOnly: false },
  [Role.CHAIRMAN]: { modules: "*", readOnly: true },
  [Role.VENUE_FACILITY_MANAGER]: NONE,
  [Role.GATE_SECURITY_OFFICER]: NONE,
  [Role.PROTOCOL_OFFICER]: NONE,
  [Role.HOSPITALITY_LEAD]: NONE,
  [Role.PARKING_MARSHAL]: NONE,
  [Role.FLEET_DISPATCHER]: NONE,
  [Role.READ_ONLY_EXECUTIVE]: NONE,
  [Role.TICKET_ADMINISTRATOR]: NONE,
};

export function canAccessModule(role: string | undefined | null, moduleKey: string): boolean {
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
