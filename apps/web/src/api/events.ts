import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

export interface EventPackListItem {
  id: string;
  title: string;
  status: string;
  expectedCount: number;
  createdAt: string;
  booking: {
    id: string;
    customerName: string;
    type: string;
    date: string;
    timeSlotStart: string;
    timeSlotEnd: string;
    status: string;
    paymentStatus: string;
    facility: { id: string; name: string; type: string; zone?: { id: string; name: string } };
  };
  _count: {
    visitors: number;
    vipGuests: number;
    trips: number;
    orders: number;
    serviceRequests: number;
  };
}

export interface EventBoard {
  pack: { id: string; title: string; status: string; expectedCount: number };
  booking: {
    id: string;
    customerName: string;
    type: string;
    date: string;
    timeSlotStart: string;
    timeSlotEnd: string;
    status: string;
    paymentStatus: string;
    amount: string | number;
    qrConfirmationCode: string;
    facility: { id: string; name: string; type: string; status: string; zone?: { id: string; name: string } };
  };
  member: { id: string; name: string; status: string; tier: string } | null;
  surfaces: { id: string; surfaceType: string; condition: string; closureStatus: string }[];
  equipment: { id: string; name: string; status: string; quantity: number }[];
  gates: { id: string; name: string; status: string; entriesToday: number }[];
  accessEvents: { id: string; personRef: string; result: string; timestamp: string; gate?: { name: string } }[];
  visitors: { id: string; name: string; status: string; category: string }[];
  vipGuests: { id: string; name: string; status: string; classification: string; loungeAssignment: string | null }[];
  lounges: { id: string; name: string; status: string; currentOccupancy: number; capacity: number }[];
  serviceRequests: { id: string; item: string; status: string; partyRef: string }[];
  outlets: { id: string; name: string; status: string; type: string }[];
  orders: { id: string; status: string; amount: string | number }[];
  parking: { id: string; name: string; occupied: number; capacity: number }[];
  vehicleLogs: { id: string; plateNumber: string; exitTime: string | null }[];
  trips: { id: string; passengerRef: string; status: string; fromLocation: string; toLocation: string }[];
  tasks?: { id: string; title: string; status: string; area: string }[];
  incidents?: { id: string; title: string; status: string; severity: string }[];
  credentials?: { id: string; holderRef: string; status: string; type: string }[];
  parkingReservations?: { id: string; status: string; plateNumber: string | null; parkingZone?: { name: string } }[];
  readiness: {
    surfaceReady: boolean;
    venueReady: boolean;
    accessOnline: boolean;
    hospitalityReady: boolean;
    fnbReady: boolean;
    transportReady: boolean;
  };
  counts: {
    visitors: number;
    visitorsOnsite: number;
    vips: number;
    vipsArrived: number;
    openServiceRequests: number;
    orders: number;
    trips: number;
    activeTrips: number;
    gates: number;
    parkingOccupied: number;
    parkingCapacity: number;
    closedSurfaces: number;
    openTasks?: number;
    openIncidents?: number;
    credentials?: number;
    parkingReservations?: number;
  };
}

export function useEventPacks() {
  return useQuery({
    queryKey: ["event-packs"],
    queryFn: async () => (await api.get<EventPackListItem[]>("/events")).data,
  });
}

export function useEventBoard(id: string | null) {
  return useQuery({
    queryKey: ["event-board", id],
    queryFn: async () => (await api.get<EventBoard>(`/events/${id}`)).data,
    enabled: !!id,
    refetchInterval: 20000,
  });
}
