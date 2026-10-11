import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { LoungeDto, ServiceRequestDto } from "@bsc/shared";

export function useLounges(params: { zoneId?: string; status?: string } = {}) {
  return useQuery({
    queryKey: ["lounges", params],
    queryFn: async () => (await api.get<LoungeDto[]>("/lounges", { params })).data,
    refetchInterval: 10000,
  });
}

export function useLounge(id: string | null) {
  return useQuery({
    queryKey: ["lounges", id],
    queryFn: async () => (await api.get<LoungeDto & { serviceRequests: ServiceRequestDto[] }>(`/lounges/${id}`)).data,
    enabled: !!id,
  });
}

export function useCreateLounge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { name: string; zoneId: string; capacity: number }) =>
      (await api.post<LoungeDto>("/lounges", payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lounges"] }),
  });
}

export function useAdjustLoungeOccupancy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, direction }: { id: string; direction: "check-in" | "check-out" }) =>
      (await api.post<LoungeDto>(`/lounges/${id}/${direction}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lounges"] }),
  });
}

export function useToggleLounge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.post<LoungeDto>(`/lounges/${id}/toggle`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lounges"] }),
  });
}

export function useServiceRequests(params: { loungeId?: string; status?: string } = {}) {
  return useQuery({
    queryKey: ["service-requests", params],
    queryFn: async () => (await api.get<ServiceRequestDto[]>("/service-requests", { params })).data,
    refetchInterval: 8000,
  });
}

export function useCreateServiceRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { loungeId: string; partyRef: string; item: string; eventPackId?: string }) =>
      (await api.post<ServiceRequestDto>("/service-requests", payload)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["service-requests"] });
      qc.invalidateQueries({ queryKey: ["event-board"] });
    },
  });
}

export function useAdvanceServiceRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) =>
      (await api.post<ServiceRequestDto>(`/service-requests/${id}/status`, { status })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["service-requests"] }),
  });
}
