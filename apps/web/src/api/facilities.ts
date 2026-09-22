import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { FacilityDto } from "@bsc/shared";

export interface FacilityFilters {
  zoneId?: string;
  type?: string;
  status?: string;
  search?: string;
}

export function useFacilities(filters: FacilityFilters) {
  return useQuery({
    queryKey: ["facilities", filters],
    queryFn: async () => (await api.get<FacilityDto[]>("/facilities", { params: filters })).data,
  });
}

export function useFacility(id: string | null) {
  return useQuery({
    queryKey: ["facilities", id],
    queryFn: async () => (await api.get<FacilityDto & { surfaces: any[]; bookings: any[] }>(`/facilities/${id}`)).data,
    enabled: !!id,
  });
}

export function useFacilityAuditLog(id: string | null) {
  return useQuery({
    queryKey: ["facilities", id, "audit-log"],
    queryFn: async () => (await api.get(`/facilities/${id}/audit-log`)).data,
    enabled: !!id,
  });
}

export function useCreateFacility() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<FacilityDto>) => (await api.post<FacilityDto>("/facilities", payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["facilities"] }),
  });
}

export function useUpdateFacility() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<FacilityDto> }) =>
      (await api.patch<FacilityDto>(`/facilities/${id}`, payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["facilities"] }),
  });
}

export function useSetFacilityStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) =>
      (await api.post<FacilityDto>(`/facilities/${id}/status`, { status })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["facilities"] }),
  });
}
