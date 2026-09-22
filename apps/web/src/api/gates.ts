import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { GateDto, AccessLogEntryDto } from "@bsc/shared";

export interface GateFilters {
  zoneId?: string;
  type?: string;
  status?: string;
}

export function useGates(filters: GateFilters) {
  return useQuery({
    queryKey: ["gates", filters],
    queryFn: async () => (await api.get<GateDto[]>("/gates", { params: filters })).data,
    refetchInterval: 10000,
  });
}

export function useGate(id: string | null) {
  return useQuery({
    queryKey: ["gates", id],
    queryFn: async () => (await api.get<GateDto & { accessLogs: AccessLogEntryDto[] }>(`/gates/${id}`)).data,
    enabled: !!id,
  });
}

export function useGateAuditLog(id: string | null) {
  return useQuery({
    queryKey: ["gates", id, "audit-log"],
    queryFn: async () => (await api.get(`/gates/${id}/audit-log`)).data,
    enabled: !!id,
  });
}

export function useRecentAccessLog() {
  return useQuery({
    queryKey: ["access-log-recent"],
    queryFn: async () => (await api.get<AccessLogEntryDto[]>("/gates/access-log/recent", { params: { take: 25 } })).data,
    refetchInterval: 8000,
  });
}

export function useCreateGate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { name: string; zoneId: string; type: string }) =>
      (await api.post<GateDto>("/gates", payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["gates"] }),
  });
}

export function useToggleGate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.post<GateDto>(`/gates/${id}/toggle`)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["gates"] });
      qc.invalidateQueries({ queryKey: ["dashboard-summary"] });
    },
  });
}

export function useScanGate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, personRef, method }: { id: string; personRef: string; method: string }) =>
      (await api.post<AccessLogEntryDto>(`/gates/${id}/scan`, { personRef, method })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["gates"] });
      qc.invalidateQueries({ queryKey: ["access-log-recent"] });
      qc.invalidateQueries({ queryKey: ["dashboard-summary"] });
    },
  });
}
