import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { BookingDto } from "@bsc/shared";

export interface BookingFilters {
  facilityId?: string;
  status?: string;
  date?: string;
  search?: string;
}

export function useBookings(filters: BookingFilters) {
  return useQuery({
    queryKey: ["bookings", filters],
    queryFn: async () => (await api.get<BookingDto[]>("/bookings", { params: filters })).data,
  });
}

export function useBooking(id: string | null) {
  return useQuery({
    queryKey: ["bookings", id],
    queryFn: async () => (await api.get<BookingDto>(`/bookings/${id}`)).data,
    enabled: !!id,
  });
}

export function useBookingAuditLog(id: string | null) {
  return useQuery({
    queryKey: ["bookings", id, "audit-log"],
    queryFn: async () => (await api.get(`/bookings/${id}/audit-log`)).data,
    enabled: !!id,
  });
}

export function useCreateBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => (await api.post<BookingDto>("/bookings", payload)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bookings"] });
      qc.invalidateQueries({ queryKey: ["dashboard-summary"] });
      qc.invalidateQueries({ queryKey: ["event-packs"] });
    },
  });
}

export function useSetBookingStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) =>
      (await api.post<BookingDto>(`/bookings/${id}/status`, { status })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bookings"] });
      qc.invalidateQueries({ queryKey: ["dashboard-summary"] });
      qc.invalidateQueries({ queryKey: ["event-packs"] });
      qc.invalidateQueries({ queryKey: ["event-board"] });
    },
  });
}

export function useSetBookingPaymentStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, paymentStatus }: { id: string; paymentStatus: string }) =>
      (await api.post<BookingDto>(`/bookings/${id}/payment-status`, { paymentStatus })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bookings"] }),
  });
}
