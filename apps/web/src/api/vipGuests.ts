import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { VIPGuestDto } from "@bsc/shared";

export interface VipGuestFilters {
  classification?: string;
  status?: string;
  search?: string;
}

export function useVipGuests(filters: VipGuestFilters) {
  return useQuery({
    queryKey: ["vip-guests", filters],
    queryFn: async () => (await api.get<VIPGuestDto[]>("/vip-guests", { params: filters })).data,
  });
}

export function useVipGuest(id: string | null) {
  return useQuery({
    queryKey: ["vip-guests", id],
    queryFn: async () => (await api.get<VIPGuestDto>(`/vip-guests/${id}`)).data,
    enabled: !!id,
  });
}

export function useVipGuestAuditLog(id: string | null) {
  return useQuery({
    queryKey: ["vip-guests", id, "audit-log"],
    queryFn: async () => (await api.get(`/vip-guests/${id}/audit-log`)).data,
    enabled: !!id,
  });
}

export function useCreateVipGuest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => (await api.post<VIPGuestDto>("/vip-guests", payload)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vip-guests"] });
      qc.invalidateQueries({ queryKey: ["event-board"] });
    },
  });
}

export function useSetVipGuestStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) =>
      (await api.post<VIPGuestDto>(`/vip-guests/${id}/status`, { status })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vip-guests"] });
      qc.invalidateQueries({ queryKey: ["event-board"] });
    },
  });
}
