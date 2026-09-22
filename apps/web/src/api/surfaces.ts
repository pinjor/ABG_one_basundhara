import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { SurfaceDto, EquipmentDto } from "@bsc/shared";

export function useSurfaces(params: { facilityId?: string; closureStatus?: string } = {}) {
  return useQuery({
    queryKey: ["surfaces", params],
    queryFn: async () => (await api.get<SurfaceDto[]>("/surfaces", { params })).data,
  });
}

export function useCreateSurface() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => (await api.post<SurfaceDto>("/surfaces", payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["surfaces"] }),
  });
}

export function useSetClosureStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, closureStatus }: { id: string; closureStatus: string }) =>
      (await api.post<SurfaceDto>(`/surfaces/${id}/closure-status`, { closureStatus })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["surfaces"] }),
  });
}

export function useEquipment(params: { category?: string; status?: string } = {}) {
  return useQuery({
    queryKey: ["equipment", params],
    queryFn: async () => (await api.get<EquipmentDto[]>("/equipment", { params })).data,
  });
}

export function useCreateEquipment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { name: string; category: string; quantity: number }) =>
      (await api.post<EquipmentDto>("/equipment", payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["equipment"] }),
  });
}

export function useSetEquipmentStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) =>
      (await api.post<EquipmentDto>(`/equipment/${id}/status`, { status })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["equipment"] }),
  });
}
