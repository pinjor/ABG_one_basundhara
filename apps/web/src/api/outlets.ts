import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { OutletDto, OrderDto } from "@bsc/shared";

export function useOutlets(params: { zoneId?: string; type?: string; status?: string } = {}) {
  return useQuery({
    queryKey: ["outlets", params],
    queryFn: async () => (await api.get<OutletDto[]>("/outlets", { params })).data,
  });
}

export function useCreateOutlet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { name: string; type: string; zoneId: string }) =>
      (await api.post<OutletDto>("/outlets", payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["outlets"] }),
  });
}

export function useToggleOutlet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.post<OutletDto>(`/outlets/${id}/toggle`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["outlets"] }),
  });
}

export function useOrders(params: { outletId?: string; status?: string } = {}) {
  return useQuery({
    queryKey: ["orders", params],
    queryFn: async () => (await api.get<OrderDto[]>("/orders", { params })).data,
    refetchInterval: 8000,
  });
}

export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { outletId: string; items: { name: string; qty: number }[]; amount: number }) =>
      (await api.post<OrderDto>("/orders", payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["orders"] }),
  });
}

export function useAdvanceOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) =>
      (await api.post<OrderDto>(`/orders/${id}/status`, { status })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["orders"] }),
  });
}
