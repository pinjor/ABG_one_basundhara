import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { ZoneDto } from "@bsc/shared";

export interface ZoneFilters {
  type?: string;
  status?: string;
  search?: string;
}

export function useZones(filters: ZoneFilters) {
  return useQuery({
    queryKey: ["zones", filters],
    queryFn: async () => (await api.get<ZoneDto[]>("/zones", { params: filters })).data,
  });
}

export function useZone(id: string | null) {
  return useQuery({
    queryKey: ["zones", id],
    queryFn: async () => (await api.get<ZoneDto & { facilities: any[]; childZones: any[] }>(`/zones/${id}`)).data,
    enabled: !!id,
  });
}

export function useZoneAuditLog(id: string | null) {
  return useQuery({
    queryKey: ["zones", id, "audit-log"],
    queryFn: async () => (await api.get(`/zones/${id}/audit-log`)).data,
    enabled: !!id,
  });
}

export function useCreateZone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<ZoneDto>) => (await api.post<ZoneDto>("/zones", payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["zones"] }),
  });
}

export function useUpdateZone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<ZoneDto> }) =>
      (await api.patch<ZoneDto>(`/zones/${id}`, payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["zones"] }),
  });
}

export function useSetZoneStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) =>
      (await api.post<ZoneDto>(`/zones/${id}/status`, { status })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["zones"] }),
  });
}
