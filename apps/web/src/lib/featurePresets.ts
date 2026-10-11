import { useEffect } from "react";
import { useActiveFeature } from "../hooks/useActiveFeature";

export interface FeaturePreset {
  type?: string;
  status?: string;
  search?: string;
  category?: string;
  tier?: string;
  classification?: string;
  focus?: "map" | "list" | "log" | "kanban" | "trips" | "equipment";
}

const PRESETS: Record<string, FeaturePreset> = {
  "venue-mapping": { type: "Stadium" },
  "parking-zone-mapping": { type: "Parking" },
  "restricted-area-setup": { type: "Restricted", status: "Restricted" },
  "emergency-zone-setup": { type: "Restricted" },
  "hospitality-zone-setup": { type: "Hospitality" },
  "media-zone-setup": { type: "Restricted", search: "Media" },
  "team-zone-setup": { type: "Facility", search: "Training" },
  "broadcast-zone-setup": { type: "Restricted", search: "Broadcast" },
  "gis-mapping": { focus: "map" },
  "indoor-navigation": { focus: "map" },
  "pedestrian-route-mapping": { focus: "map" },
  "buggy-route-mapping": { focus: "map" },
  "service-road-mapping": { focus: "map" },
  "capacity-mapping": { focus: "list" },
  "location-search": { focus: "list" },
  "building-setup": { search: "Building" },
  "floor-mapping": { search: "Floor" },
  "gate-setup": { search: "Gate" },

  "stadium-management": { type: "Stadium" },
  "football-field-setup": { type: "Football Pitch" },
  "cricket-stadium-setup": { type: "Cricket Ground" },
  "event-hall-setup": { type: "Event Hall" },
  "room-management": { type: "Event Hall" },
  "locker-management": { type: "Changing Room" },
  "training-ground-setup": { type: "Training Ground" },
  "turf-management": { type: "Turf" },
  "basketball-court-setup": { type: "Basketball Court" },
  "tennis-court-setup": { type: "Tennis Court" },
  "swimming-pool-setup": { type: "Swimming Pool" },
  "gym-facility-setup": { type: "Gym" },
  "restaurant-setup": { type: "Restaurant" },
  "lounge-setup": { type: "Lounge" },
  "changing-room-setup": { type: "Changing Room" },
  "media-room-setup": { type: "Media Room" },
  "medical-room-setup": { type: "Medical Room" },
  "storage-area-setup": { type: "Storage" },
  "facility-availability": { status: "Available" },
  "venue-inspection": { search: "Inspection" },
  "operating-hours": { focus: "list" },
  "capacity-management": { focus: "list" },

  "surface-condition": { focus: "list" },
  "closure-management": { status: "Closed for Maintenance" },
  "turf-recovery": { status: "Closed for Recovery" },
  "equipment-inventory": { focus: "equipment" },
  "equipment-status": { focus: "equipment" },
  "kit-deployment": { focus: "equipment" },
  "pool-equipment": { search: "Pool" },
  "gym-equipment": { search: "Gym" },

  "public-booking": { type: "Public" },
  "member-booking": { type: "Member" },
  "team-booking": { type: "Team" },
  "club-booking": { type: "Corporate" },
  "academy-booking": { type: "Academy" },
  "school-booking": { type: "School" },
  "corporate-booking": { type: "Corporate" },
  "online-booking": { focus: "list" },
  "field-reservation": { search: "Field" },
  "turf-reservation": { search: "Turf" },
  "court-reservation": { search: "Court" },
  "lane-reservation": { search: "Lane" },
  "room-reservation": { search: "Room" },
  "event-space-booking": { search: "Event" },
  "waiting-list": { status: "Pending" },
  "cancellation-policy": { status: "Cancelled" },
  "deposit-management": { search: "Deposit" },
  "payment-integration": { search: "Paid" },
  "qr-confirmation": { focus: "list" },
  "conflict-detection": { focus: "list" },

  "individual-membership": { tier: "Individual" },
  "family-membership": { tier: "Family" },
  "corporate-membership": { tier: "Corporate" },
  "membership-freeze": { status: "Frozen" },
  "membership-renewal": { status: "Expired" },
  "member-check-in": { status: "Active" },
  "day-pass-management": { search: "Pass" },
  "locker-allocation": { search: "Locker" },
  "gym-access": { search: "Gym" },
  "pool-access": { search: "Pool" },

  "main-gate-management": { type: "Main" },
  "vip-gate": { type: "VIP" },
  "vvip-gate": { type: "VIP" },
  "team-gate": { type: "Team" },
  "media-gate": { type: "Media" },
  "service-gate": { type: "Service" },
  "access-logging": { focus: "log" },
  "gate-monitoring": { focus: "list" },
  "device-status-monitoring": { focus: "list" },
  "offline-validation": { status: "Offline" },
  "emergency-open-mode": { focus: "list" },

  "visitor-check-in": { status: "Expected" },
  "visitor-check-out": { status: "Checked In" },
  "tour-management": { category: "Tour" },
  "school-visit-management": { category: "School Group" },
  "supplier-visit": { category: "Supplier" },
  "contractor-visit": { category: "Contractor" },
  "escort-management": { search: "Escort" },
  "guest-invitation": { category: "Guest" },
  "visitor-history": { status: "Checked Out" },
  "qr-visitor-pass": { focus: "list" },

  "vip-database": { focus: "list" },
  "vvip-database": { search: "VVIP" },
  "guest-classification": { focus: "list" },
  "arrival-planning": { status: "Scheduled" },
  "departure-management": { status: "Departed" },
  "privacy-control": { search: "Privacy" },
  "seat-allocation": { search: "Seat" },
  "meal-preference": { search: "Meal" },
  "protocol-planning": { status: "Scheduled" },

  "service-request-management": { focus: "kanban" },
  "lounge-capacity-control": { focus: "list" },
  "hospitality-analytics": { focus: "list" },
  "vip-lounge-setup": { search: "VIP" },
  "vvip-lounge-setup": { search: "VVIP" },

  "food-court-management": { type: "Food Court" },
  "concession-counter-setup": { type: "Concession" },
  "order-management": { focus: "kanban" },
  "sales-analytics": { focus: "list" },
  "event-catering": { search: "Event" },

  "vip-parking": { type: "VIP" },
  "vvip-parking": { type: "VIP" },
  "staff-parking": { type: "Staff" },
  "visitor-parking": { type: "Visitor" },
  "team-parking": { type: "Team" },
  "occupancy-monitoring": { focus: "list" },
  "vehicle-registration": { focus: "log" },
  "parking-analytics": { focus: "list" },

  "buggy-management": { type: "Buggy" },
  "shuttle-vehicle-management": { type: "Shuttle" },
  "vip-transport": { type: "VIP Car" },
  "trip-management": { focus: "trips" },
  "vehicle-maintenance": { status: "Maintenance" },
  "driver-management": { focus: "list" },
  "gps-tracking": { focus: "list" },
  "real-time-vehicle-location": { focus: "list" },
};

export function featurePreset(featureKey: string | null): FeaturePreset {
  if (!featureKey) return {};
  return PRESETS[featureKey] ?? {};
}

export function useFeaturePreset(apply: (preset: FeaturePreset) => void) {
  const { featureKey } = useActiveFeature();
  useEffect(() => {
    apply(featurePreset(featureKey));
  }, [featureKey]);
}
