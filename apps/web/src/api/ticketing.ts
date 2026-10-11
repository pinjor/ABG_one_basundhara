import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { newIdempotencyKey } from "../lib/apiError";

export interface TicketSectionCard {
  id: string;
  name: string;
  rows: number;
  seatsPerRow: number;
  capacity: number;
  sold: number;
  remaining: number;
  category: { id: string; name: string; priceBdt: number; gateName: string } | null;
}

export interface MatchEventCard {
  id: string;
  title: string;
  sport: string;
  venueName: string;
  venueNote: string | null;
  startsAt: string;
  doorsAt: string;
  salesStatus: string;
  vatRateBps: number;
  capacity: number;
  sold: number;
  remaining: number;
  fromPriceBdt: number | null;
  sections: TicketSectionCard[];
  imageNote: string;
}

export interface SeatMap {
  eventId: string;
  salesStatus: string;
  sections: {
    id: string;
    name: string;
    category: { id: string; name: string; priceBdt: number; gateName: string } | null;
    rows: { label: string; seats: { number: number; state: "available" | "held" | "sold" }[] }[];
  }[];
}

export interface TicketOrderView {
  reference: string;
  status: string;
  holdExpiresAt: string;
  holdCeilingAt: string;
  subtotal: number;
  vat: number;
  total: number;
  vatRateBps: number;
  vatNote: string;
  buyerName: string;
  buyerMobile: string;
  buyerEmail: string;
  event: { id: string; title: string; sport: string; venueName: string; startsAt: string; doorsAt: string; vatRateBps: number };
  sandboxPayments: boolean;
  items: {
    id: string;
    sectionName: string;
    categoryName: string;
    gateName: string;
    rowLabel: string;
    seatNumber: number;
    unitPrice: number;
    ticket: { id: string; status: string; gateName: string; token?: string } | null;
  }[];
  payment: { method: string; status: string; sandbox: boolean; providerRef: string | null; failureReason: string | null } | null;
  refund: { id: string; status: string; reason: string } | null;
}

export interface TicketAnalytics {
  generatedAt: string;
  ordersTotal: number;
  ticketsSold: number;
  revenueConfirmed: number;
  payments: { captured: number; failed: number; refunded: number };
  salesByDay: { date: string; tickets: number; revenue: number }[];
  byCategory: { name: string; sold: number; capacity: number }[];
  byChannel: { channel: string; count: number }[];
  checkIn: { admitted: number; notYetAdmitted: number; scanAllows: number; scanDenies: number };
  scansByHour: { hour: string; count: number }[];
  events: { id: string; title: string; sold: number; capacity: number; remaining: number }[];
  recentOrders: { reference: string; status: string; total: number; eventTitle: string; createdAt: string }[];
}

export interface StaffOrderRow {
  reference: string;
  status: string;
  buyerName: string;
  buyerMobile: string;
  total: number;
  seats: number;
  eventTitle: string;
  startsAt: string;
  paymentStatus: string | null;
  paymentMethod: string | null;
  sandbox: boolean | null;
  createdAt: string;
  holdExpiresAt: string;
}

export interface RefundRow {
  id: string;
  reason: string;
  status: string;
  createdAt: string;
  order: { reference: string; total: string | number; buyerName: string; status: string; event: { title: string } };
}

export interface ScanDecision {
  decision: "ALLOW" | "DENY";
  reason: string;
  detail?: { eventTitle: string; row: string; seat: number; gateName: string; firstName: string };
}

const DEVICE_KEY = "bsc-scan-device";

export function scanDeviceId(): string {
  const existing = localStorage.getItem(DEVICE_KEY);
  if (existing) return existing;
  const created = crypto.randomUUID();
  localStorage.setItem(DEVICE_KEY, created);
  return created;
}

export function usePublicEvents() {
  return useQuery({
    queryKey: ["ticket-events"],
    queryFn: async () => (await api.get<MatchEventCard[]>("/ticketing/events")).data,
  });
}

export function usePublicEvent(id: string | undefined) {
  return useQuery({
    queryKey: ["ticket-event", id],
    queryFn: async () => (await api.get<MatchEventCard>(`/ticketing/events/${id}`)).data,
    enabled: !!id,
  });
}

export function useSeatMap(id: string | undefined) {
  return useQuery({
    queryKey: ["ticket-seats", id],
    queryFn: async () => (await api.get<SeatMap>(`/ticketing/events/${id}/seats`)).data,
    enabled: !!id,
    refetchInterval: 8000,
  });
}

export function useTicketOrder(reference: string | undefined, mobile: string | undefined) {
  return useQuery({
    queryKey: ["ticket-order", reference, mobile],
    queryFn: async () => (await api.get<TicketOrderView>(`/ticketing/orders/${reference}`, { params: { mobile } })).data,
    enabled: !!reference && !!mobile,
  });
}

export function useCreateTicketOrder() {
  return useMutation({
    mutationFn: async (body: {
      eventId: string;
      buyerName: string;
      buyerMobile: string;
      buyerEmail: string;
      termsAccepted: true;
      seats: { sectionId: string; rowLabel: string; seatNumber: number }[];
    }) =>
      (
        await api.post<TicketOrderView>("/ticketing/orders", body, {
          headers: { "Idempotency-Key": newIdempotencyKey() },
        })
      ).data,
  });
}

export function usePayTicketOrder(reference: string) {
  return useMutation({
    mutationFn: async (body: { buyerMobile: string; method: string; simulateFailure?: boolean }) =>
      (
        await api.post<TicketOrderView>(`/ticketing/orders/${reference}/pay`, body, {
          headers: { "Idempotency-Key": newIdempotencyKey() },
        })
      ).data,
  });
}

export function useCancelTicketOrder(reference: string) {
  return useMutation({
    mutationFn: async (body: { buyerMobile: string; reason: string }) =>
      (
        await api.post<TicketOrderView>(`/ticketing/orders/${reference}/cancel-request`, body, {
          headers: { "Idempotency-Key": newIdempotencyKey() },
        })
      ).data,
  });
}

export function useTicketAnalytics() {
  return useQuery({
    queryKey: ["ticket-analytics"],
    queryFn: async () => (await api.get<TicketAnalytics>("/ticketing/ops/analytics")).data,
  });
}

export function useStaffEvents() {
  return useQuery({
    queryKey: ["ticket-staff-events"],
    queryFn: async () => (await api.get<MatchEventCard[]>("/ticketing/ops/events")).data,
  });
}

export function useStaffOrders(search: string, status: string) {
  return useQuery({
    queryKey: ["ticket-staff-orders", search, status],
    queryFn: async () => (await api.get<StaffOrderRow[]>("/ticketing/ops/orders", { params: { search: search || undefined, status: status || undefined } })).data,
  });
}

export function useRefunds() {
  return useQuery({
    queryKey: ["ticket-refunds"],
    queryFn: async () => (await api.get<RefundRow[]>("/ticketing/ops/refunds")).data,
  });
}

export function useCreateMatchEvent() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (body: unknown) =>
      (await api.post("/ticketing/ops/events", body, { headers: { "Idempotency-Key": newIdempotencyKey() } })).data,
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["ticket-staff-events"] });
      await client.invalidateQueries({ queryKey: ["ticket-events"] });
    },
  });
}

export function useSetSalesStatus() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; salesStatus: "ON_SALE" | "CLOSED" }) =>
      (await api.post(`/ticketing/ops/events/${input.id}/sales-status`, { salesStatus: input.salesStatus })).data,
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["ticket-staff-events"] });
    },
  });
}

export function useDecideRefund() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; decision: "APPROVED" | "REJECTED" }) =>
      (
        await api.post(`/ticketing/ops/refunds/${input.id}/decision`, { decision: input.decision }, {
          headers: { "Idempotency-Key": newIdempotencyKey() },
        })
      ).data,
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["ticket-refunds"] });
      await client.invalidateQueries({ queryKey: ["ticket-staff-orders"] });
    },
  });
}

export async function verifyTicket(body: { credentialToken: string; scanId: string; deviceId: string; direction: "IN" | "OUT"; gateId?: string }) {
  return (
    await api.post<ScanDecision>("/access/verifications", body, {
      headers: { "Idempotency-Key": newIdempotencyKey() },
    })
  ).data;
}
