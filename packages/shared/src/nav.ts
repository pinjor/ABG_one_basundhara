/**
 * Sidebar information architecture — Section 5 of the master build prompt.
 * Grouped by guest-journey phase, not alphabetically. This grouping is itself
 * information: it mirrors the physical flow of a visitor through the complex.
 */
export interface NavModule {
  key: string;
  label: string;
  path: string;
  /** Phase in which this module ships real functionality (Section 9). */
  phase: 1 | 2 | 3 | 4 | 5;
  /** Whether the module is actually implemented yet — drives the sidebar's "Phase N" badge. */
  built: boolean;
}

export interface NavGroup {
  key: string;
  label: string;
  modules: NavModule[];
}

export const NAV: NavGroup[] = [
  {
    key: "venue-play",
    label: "Venue & Play",
    modules: [
      { key: "zones", label: "Zones & Complex Map", path: "/zones", phase: 1, built: true },
      { key: "facilities", label: "Venues & Facilities", path: "/facilities", phase: 1, built: true },
      { key: "surfaces", label: "Surfaces & Equipment", path: "/surfaces", phase: 4, built: false },
      { key: "bookings", label: "Bookings & Reservations", path: "/bookings", phase: 2, built: true },
      { key: "membership", label: "Gym, Pool & Membership", path: "/membership", phase: 2, built: true },
    ],
  },
  {
    key: "access-guests",
    label: "Access & Guests",
    modules: [
      { key: "gates", label: "Access Control & Gates", path: "/gates", phase: 2, built: true },
      { key: "visitors", label: "Visitors & Guests", path: "/visitors", phase: 2, built: true },
      { key: "vip", label: "VIP / VVIP & Protocol", path: "/vip", phase: 3, built: false },
    ],
  },
  {
    key: "hospitality-retail",
    label: "Hospitality & Retail",
    modules: [
      { key: "lounges", label: "Hospitality & Lounges", path: "/lounges", phase: 3, built: false },
      { key: "outlets", label: "Restaurant & Concessions", path: "/outlets", phase: 3, built: false },
    ],
  },
  {
    key: "logistics",
    label: "Logistics",
    modules: [
      { key: "parking", label: "Parking", path: "/parking", phase: 4, built: false },
      { key: "fleet", label: "Transport & Fleet", path: "/fleet", phase: 4, built: false },
    ],
  },
];

export const COMMAND_CENTRE: NavModule = { key: "command-centre", label: "Command Centre", path: "/", phase: 1, built: true };
