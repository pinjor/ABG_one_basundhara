export type FlowKind =
  | "zone-setup"
  | "zone-map"
  | "facility-setup"
  | "facility-status"
  | "booking-create"
  | "booking-advance"
  | "booking-pay"
  | "member-create"
  | "member-checkin"
  | "member-lifecycle"
  | "gate-setup"
  | "gate-scan"
  | "gate-toggle"
  | "gate-log"
  | "visitor-journey"
  | "visitor-checkin"
  | "visitor-checkout"
  | "vip-journey"
  | "lounge-setup"
  | "lounge-party"
  | "service-request"
  | "outlet-setup"
  | "order-flow"
  | "parking-setup"
  | "parking-cycle"
  | "fleet-setup"
  | "trip-run"
  | "surface-close"
  | "equipment-flow";

export interface FlowDef {
  kind: FlowKind;
  steps: string[];
  brief: string;
  type?: string;
  status?: string;
  method?: string;
  category?: string;
  tier?: string;
}

const STEPS: Record<FlowKind, string[]> = {
  "zone-setup": ["Details", "Capacity", "Activate", "Live"],
  "zone-map": ["Map", "Select zone", "Occupancy", "Done"],
  "facility-setup": ["Space", "Hours", "Open", "Live"],
  "facility-status": ["Pick space", "Transition", "Confirm", "Done"],
  "booking-create": ["Slot", "Customer", "Hold", "Pay & QR"],
  "booking-advance": ["Pick booking", "Advance status", "Done"],
  "booking-pay": ["Pick booking", "Take payment", "Receipt"],
  "member-create": ["Profile", "Tier", "Activate", "Live"],
  "member-checkin": ["Find member", "Check in", "Done"],
  "member-lifecycle": ["Find member", "Change status", "Done"],
  "gate-setup": ["Gate", "Zone", "Online", "Live"],
  "gate-scan": ["Gate", "Credential", "Scan", "Result"],
  "gate-toggle": ["Gate", "Toggle", "Done"],
  "gate-log": ["Live log"],
  "visitor-journey": ["Register", "Check in", "QR pass", "Check out"],
  "visitor-checkin": ["Expected guest", "Check in", "QR pass"],
  "visitor-checkout": ["On site", "Check out", "Done"],
  "vip-journey": ["Profile", "Arrival plan", "Arrive", "Depart"],
  "lounge-setup": ["Lounge", "Capacity", "Open", "Live"],
  "lounge-party": ["Lounge", "Party in / out", "Done"],
  "service-request": ["Request", "Prepare", "Deliver"],
  "outlet-setup": ["Outlet", "Open", "Live"],
  "order-flow": ["Order", "Kitchen", "Deliver"],
  "parking-setup": ["Zone", "Capacity", "Open", "Live"],
  "parking-cycle": ["Zone", "Entry", "Exit"],
  "fleet-setup": ["Vehicle", "Driver", "Available", "Live"],
  "trip-run": ["Request", "Dispatch", "En route", "Complete"],
  "surface-close": ["Surface", "Closure", "Done"],
  "equipment-flow": ["Kit", "Stock", "Deploy", "Done"],
};

const BRIEFS: Record<FlowKind, string> = {
  "zone-setup": "Name the zone, set capacity, then activate it on the live complex map.",
  "zone-map": "Select a live zone, review occupancy, then change its operational status.",
  "facility-setup": "Attach a playable space to a zone, set hours, then open it for play.",
  "facility-status": "Pick a facility and walk it through the live availability graph.",
  "booking-create": "Reserve a slot, capture the customer, hold the booking, then take payment and issue the QR.",
  "booking-advance": "Pick a live booking and move it through pending → confirmed → completed.",
  "booking-pay": "Select a booking, collect payment, and issue the confirmation QR.",
  "member-create": "Capture the member, choose a tier, then activate access for a year.",
  "member-checkin": "Find the member and record a live gym / pool check-in.",
  "member-lifecycle": "Freeze, restore, or renew an existing membership on the live roll.",
  "gate-setup": "Name the gate, attach it to a zone, then bring the reader online.",
  "gate-scan": "Choose a gate, present a credential, and write the access result to the log.",
  "gate-toggle": "Take a gate online or offline for monitoring or emergency open.",
  "gate-log": "Read the live access log written by QR, RFID, face and biometric scans.",
  "visitor-journey": "Register the guest, check them in, issue a QR pass, then check them out.",
  "visitor-checkin": "Approve an expected guest and issue their QR visitor pass.",
  "visitor-checkout": "Close an on-site visit and retire the pass.",
  "vip-journey": "Plan the arrival, mark the guest arrived, then close protocol on departure.",
  "lounge-setup": "Create the lounge, set capacity, then open it for hospitality.",
  "lounge-party": "Check a party into a lounge or release capacity when they leave.",
  "service-request": "Raise a hospitality request, start prep, then mark it delivered.",
  "outlet-setup": "Register the outlet against a zone and open it for trade.",
  "order-flow": "Place an order, send it to the kitchen, then mark it delivered.",
  "parking-setup": "Create a parking zone, set capacity, then open it for vehicles.",
  "parking-cycle": "Log a vehicle in, occupy a bay, then log the exit.",
  "fleet-setup": "Register the vehicle and driver, then mark it available for dispatch.",
  "trip-run": "Request a trip, dispatch a vehicle, start the run, then complete arrival.",
  "surface-close": "Select or create a surface, then close it for maintenance or recovery.",
  "equipment-flow": "Stock a kit, then deploy or mark it under repair.",
};

function flow(kind: FlowKind, extras: Omit<FlowDef, "kind" | "steps" | "brief"> = {}): FlowDef {
  return { kind, steps: STEPS[kind], brief: BRIEFS[kind], ...extras };
}

const BY_FEATURE: Record<string, FlowDef> = {
  "campus-setup": flow("zone-setup"),
  "complex-master-setup": flow("zone-setup"),
  "zone-management": flow("zone-setup"),
  "venue-mapping": flow("zone-map", { type: "Stadium" }),
  "building-setup": flow("zone-setup"),
  "floor-mapping": flow("zone-map"),
  "area-configuration": flow("zone-setup"),
  "gate-setup": flow("gate-setup"),
  "parking-zone-mapping": flow("zone-setup", { type: "Parking" }),
  "pedestrian-route-mapping": flow("zone-map"),
  "buggy-route-mapping": flow("zone-map"),
  "service-road-mapping": flow("zone-map"),
  "restricted-area-setup": flow("zone-setup", { type: "Restricted", status: "Restricted" }),
  "emergency-zone-setup": flow("zone-setup", { type: "Restricted" }),
  "hospitality-zone-setup": flow("zone-setup", { type: "Hospitality" }),
  "media-zone-setup": flow("zone-setup", { type: "Restricted" }),
  "team-zone-setup": flow("zone-setup", { type: "Facility" }),
  "broadcast-zone-setup": flow("zone-setup", { type: "Restricted" }),
  "gis-mapping": flow("zone-map"),
  "indoor-navigation": flow("zone-map"),
  "capacity-mapping": flow("zone-map"),
  "location-search": flow("zone-map"),

  "stadium-management": flow("facility-setup", { type: "Stadium" }),
  "football-field-setup": flow("facility-setup", { type: "Football Pitch" }),
  "cricket-stadium-setup": flow("facility-setup", { type: "Cricket Ground" }),
  "event-hall-setup": flow("facility-setup", { type: "Event Hall" }),
  "room-management": flow("facility-setup", { type: "Event Hall" }),
  "locker-management": flow("facility-setup", { type: "Changing Room" }),
  "training-ground-setup": flow("facility-setup", { type: "Training Ground" }),
  "turf-management": flow("facility-setup", { type: "Turf" }),
  "basketball-court-setup": flow("facility-setup", { type: "Basketball Court" }),
  "tennis-court-setup": flow("facility-setup", { type: "Tennis Court" }),
  "swimming-pool-setup": flow("facility-setup", { type: "Swimming Pool" }),
  "gym-facility-setup": flow("facility-setup", { type: "Gym" }),
  "restaurant-setup": flow("facility-setup", { type: "Restaurant" }),
  "lounge-setup": flow("facility-setup", { type: "Lounge" }),
  "changing-room-setup": flow("facility-setup", { type: "Changing Room" }),
  "media-room-setup": flow("facility-setup", { type: "Media Room" }),
  "medical-room-setup": flow("facility-setup", { type: "Medical Room" }),
  "storage-area-setup": flow("facility-setup", { type: "Storage" }),
  "capacity-management": flow("facility-status"),
  "operating-hours": flow("facility-setup"),
  "facility-availability": flow("facility-status", { status: "Available" }),
  "venue-inspection": flow("facility-status"),

  "surface-condition": flow("surface-close"),
  "closure-management": flow("surface-close", { status: "Closed for Maintenance" }),
  "turf-recovery": flow("surface-close", { status: "Closed for Recovery" }),
  "equipment-inventory": flow("equipment-flow"),
  "equipment-status": flow("equipment-flow"),
  "kit-deployment": flow("equipment-flow"),
  "maintenance-schedule": flow("surface-close"),
  "pool-equipment": flow("equipment-flow", { type: "Pool Equipment" }),
  "gym-equipment": flow("equipment-flow", { type: "Gym Equipment" }),

  "online-booking": flow("booking-create"),
  "public-booking": flow("booking-create", { type: "Public" }),
  "member-booking": flow("booking-create", { type: "Member" }),
  "team-booking": flow("booking-create", { type: "Team" }),
  "club-booking": flow("booking-create", { type: "Corporate" }),
  "academy-booking": flow("booking-create", { type: "Academy" }),
  "school-booking": flow("booking-create", { type: "School" }),
  "corporate-booking": flow("booking-create", { type: "Corporate" }),
  "field-reservation": flow("booking-create"),
  "turf-reservation": flow("booking-create"),
  "court-reservation": flow("booking-create"),
  "lane-reservation": flow("booking-create"),
  "room-reservation": flow("booking-create"),
  "event-space-booking": flow("booking-create"),
  "slot-management": flow("booking-create"),
  "availability-calendar": flow("booking-create"),
  "recurring-booking": flow("booking-create"),
  "waiting-list": flow("booking-advance", { status: "Pending" }),
  "conflict-detection": flow("booking-create"),
  "setup-time-buffer": flow("booking-create"),
  "equipment-add-on": flow("booking-create"),
  "coach-booking": flow("booking-create"),
  "dynamic-pricing": flow("booking-create"),
  "peak-hour-pricing": flow("booking-create"),
  "deposit-management": flow("booking-pay"),
  "payment-integration": flow("booking-pay"),
  "cancellation-policy": flow("booking-advance", { status: "Confirmed" }),
  "qr-confirmation": flow("booking-pay"),

  "membership-setup": flow("member-create"),
  "individual-membership": flow("member-create", { tier: "Individual" }),
  "family-membership": flow("member-create", { tier: "Family" }),
  "corporate-membership": flow("member-create", { tier: "Corporate" }),
  "day-pass-management": flow("member-create", { tier: "Individual" }),
  "package-management": flow("member-create"),
  "gym-access": flow("member-checkin"),
  "pool-access": flow("member-checkin"),
  "fitness-class-management": flow("member-create"),
  "swimming-class-management": flow("member-create"),
  "personal-trainer-management": flow("member-create"),
  "trainer-schedule": flow("member-create"),
  "locker-allocation": flow("member-create"),
  "member-check-in": flow("member-checkin"),
  "capacity-control": flow("member-checkin"),
  "membership-renewal": flow("member-lifecycle", { status: "Expired" }),
  "membership-freeze": flow("member-lifecycle", { status: "Active" }),
  "recurring-billing": flow("member-create"),
  "health-declaration": flow("member-create"),
  "equipment-usage-tracking": flow("member-checkin"),
  "pool-lane-booking": flow("booking-create"),
  "sauna-management": flow("facility-setup", { type: "Swimming Pool" }),
  "jacuzzi-management": flow("facility-setup", { type: "Swimming Pool" }),

  "main-gate-management": flow("gate-toggle", { type: "Main" }),
  "vip-gate": flow("gate-scan", { type: "VIP", method: "Face" }),
  "vvip-gate": flow("gate-scan", { type: "VIP", method: "Face" }),
  "team-gate": flow("gate-scan", { type: "Team", method: "RFID" }),
  "media-gate": flow("gate-scan", { type: "Media", method: "QR" }),
  "service-gate": flow("gate-scan", { type: "Service", method: "RFID" }),
  "turnstile-integration": flow("gate-scan", { method: "QR" }),
  "qr-scanner": flow("gate-scan", { method: "QR" }),
  "rfid-reader": flow("gate-scan", { method: "RFID" }),
  "nfc-reader": flow("gate-scan", { method: "RFID" }),
  "biometric-access": flow("gate-scan", { method: "Biometric" }),
  "entry-validation": flow("gate-scan"),
  "exit-tracking": flow("gate-log"),
  "anti-passback": flow("gate-scan"),
  "occupancy-counting": flow("gate-log"),
  "gate-monitoring": flow("gate-toggle"),
  "device-status-monitoring": flow("gate-toggle"),
  "emergency-open-mode": flow("gate-toggle"),
  "offline-validation": flow("gate-toggle"),
  "access-logging": flow("gate-log"),

  "visitor-registration": flow("visitor-journey"),
  "guest-invitation": flow("visitor-journey", { category: "Guest" }),
  "host-approval": flow("visitor-checkin"),
  "reception-management": flow("visitor-checkin"),
  "visitor-check-in": flow("visitor-checkin"),
  "visitor-check-out": flow("visitor-checkout"),
  "qr-visitor-pass": flow("visitor-checkin"),
  "id-verification": flow("visitor-checkin"),
  "guest-category": flow("visitor-journey"),
  "purpose-tracking": flow("visitor-journey"),
  "escort-management": flow("visitor-journey"),
  "tour-management": flow("visitor-journey", { category: "Tour" }),
  "school-visit-management": flow("visitor-journey", { category: "School Group" }),
  "supplier-visit": flow("visitor-journey", { category: "Supplier" }),
  "contractor-visit": flow("visitor-journey", { category: "Contractor" }),
  "temporary-access": flow("visitor-journey"),
  "visitor-history": flow("visitor-checkout"),
  "guest-feedback": flow("visitor-checkout"),
  "blacklist-management": flow("visitor-checkout"),
  "visitor-analytics": flow("visitor-checkout"),

  "vip-database": flow("vip-journey"),
  "vvip-database": flow("vip-journey"),
  "guest-classification": flow("vip-journey"),
  "invitation-management": flow("vip-journey"),
  "protocol-planning": flow("vip-journey"),
  "arrival-planning": flow("vip-journey"),
  "airport-pickup": flow("vip-journey"),
  "hotel-coordination": flow("vip-journey"),
  "convoy-management": flow("vip-journey"),
  "dedicated-vehicle": flow("trip-run", { type: "VIP Car" }),
  "vip-parking": flow("parking-cycle", { type: "VIP" }),
  "vip-gate-access": flow("gate-scan", { type: "VIP", method: "Face" }),
  "vip-lounge-management": flow("lounge-party"),
  "holding-room": flow("vip-journey"),
  "security-coordination": flow("vip-journey"),
  "seat-allocation": flow("vip-journey"),
  "meal-preference": flow("vip-journey"),
  "gift-management": flow("vip-journey"),
  "ceremony-management": flow("vip-journey"),
  "departure-management": flow("vip-journey", { status: "Arrived" }),
  "privacy-control": flow("vip-journey"),

  "vip-lounge-setup": flow("lounge-setup"),
  "vvip-lounge-setup": flow("lounge-setup"),
  "guest-experience-management": flow("lounge-party"),
  "lounge-reservation": flow("lounge-party"),
  "refreshment-planning": flow("service-request"),
  "beverage-management": flow("service-request"),
  "vip-catering-coordination": flow("service-request"),
  "guest-preference-management": flow("service-request"),
  "premium-service-tracking": flow("service-request"),
  "hospitality-staff-assignment": flow("service-request"),
  "lounge-capacity-control": flow("lounge-party"),
  "service-request-management": flow("service-request"),
  "hospitality-analytics": flow("lounge-party"),

  "food-court-management": flow("outlet-setup", { type: "Food Court" }),
  "kitchen-management": flow("order-flow"),
  "menu-management": flow("order-flow"),
  "recipe-management": flow("order-flow"),
  "food-inventory": flow("order-flow"),
  "raw-material-tracking": flow("order-flow"),
  "catering-management": flow("order-flow"),
  "event-catering": flow("order-flow"),
  "concession-counter-setup": flow("outlet-setup", { type: "Concession" }),
  "pos-integration": flow("order-flow"),
  "order-management": flow("order-flow"),
  "table-management": flow("order-flow"),
  "delivery-management": flow("order-flow"),
  "food-safety-tracking": flow("order-flow"),
  "supplier-management": flow("outlet-setup"),
  "sales-analytics": flow("order-flow"),
  "customer-feedback": flow("order-flow"),

  "parking-area-setup": flow("parking-setup"),
  "vehicle-registration": flow("parking-cycle"),
  "parking-slot-management": flow("parking-setup"),
  "vvip-parking": flow("parking-cycle", { type: "VIP" }),
  "staff-parking": flow("parking-cycle", { type: "Staff" }),
  "visitor-parking": flow("parking-cycle", { type: "Visitor" }),
  "team-parking": flow("parking-cycle", { type: "Team" }),
  "digital-parking-pass": flow("parking-cycle"),
  "qr-parking-access": flow("parking-cycle"),
  "rfid-vehicle-access": flow("parking-cycle"),
  "parking-reservation": flow("parking-cycle"),
  "occupancy-monitoring": flow("parking-cycle"),
  "parking-guidance-system": flow("parking-cycle"),
  "payment-collection": flow("parking-cycle"),
  "parking-violation-tracking": flow("parking-cycle"),
  "parking-analytics": flow("parking-cycle"),

  "fleet-registration": flow("fleet-setup"),
  "vehicle-master": flow("fleet-setup"),
  "buggy-management": flow("fleet-setup", { type: "Buggy" }),
  "shuttle-vehicle-management": flow("fleet-setup", { type: "Shuttle" }),
  "driver-management": flow("fleet-setup"),
  "driver-assignment": flow("fleet-setup"),
  "vehicle-scheduling": flow("trip-run"),
  "route-planning": flow("trip-run"),
  "trip-management": flow("trip-run"),
  "fuel-management": flow("fleet-setup"),
  "vehicle-maintenance": flow("fleet-setup", { status: "Maintenance" }),
  "gps-tracking": flow("trip-run"),
  "real-time-vehicle-location": flow("trip-run"),
  "passenger-assignment": flow("trip-run"),
  "vip-transport": flow("trip-run", { type: "VIP Car" }),
  "team-transport": flow("trip-run", { type: "Shuttle" }),
  "event-transport": flow("trip-run"),
  "vehicle-inspection": flow("fleet-setup"),
  "transport-analytics": flow("trip-run"),
};

const MODULE_DEFAULT: Record<string, FlowDef> = {
  "/zones": flow("zone-setup"),
  "/facilities": flow("facility-setup"),
  "/surfaces": flow("surface-close"),
  "/bookings": flow("booking-create"),
  "/membership": flow("member-checkin"),
  "/gates": flow("gate-scan"),
  "/visitors": flow("visitor-journey"),
  "/vip": flow("vip-journey"),
  "/lounges": flow("service-request"),
  "/outlets": flow("order-flow"),
  "/parking": flow("parking-cycle"),
  "/fleet": flow("trip-run"),
};

const BY_MODULE_FEATURE: Record<string, FlowDef> = {
  "/outlets:restaurant-setup": flow("outlet-setup", { type: "Restaurant" }),
  "/lounges:hospitality-zone-setup": flow("lounge-setup"),
  "/lounges:guest-feedback": flow("lounge-party"),
  "/parking:parking-zone-mapping": flow("parking-setup"),
  "/vip:escort-management": flow("vip-journey"),
};

export function resolveFlow(featureKey: string | null, modulePath: string): FlowDef {
  if (featureKey) {
    const scoped = BY_MODULE_FEATURE[`${modulePath}:${featureKey}`];
    if (scoped) return scoped;
    if (BY_FEATURE[featureKey]) return BY_FEATURE[featureKey];
  }
  return MODULE_DEFAULT[modulePath] ?? flow("zone-setup");
}
