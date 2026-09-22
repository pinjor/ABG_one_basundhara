import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { ParkingZoneDto, VehicleLogEntryDto } from "@bsc/shared";

export function useParkingZones(params: { type?: string } = {}) {
  return useQuery({
    queryKey: ["parking-zones", params],
    queryFn: async () => (await api.get<ParkingZoneDto[]>("/parking-zones", { params })).data,
    refetchInterval: 10000,
  });
}

export function useParkingZone(id: string | null) {
  return useQuery({
    queryKey: ["parking-zones", id],
    queryFn: async () => (await api.get<ParkingZoneDto & { vehicleLogs: VehicleLogEntryDto[] }>(`/parking-zones/${id}`)).data,
    enabled: !!id,
  });
}

export function useCreateParkingZone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { name: string; type: string; zoneId?: string; capacity: number }) =>
      (await api.post<ParkingZoneDto>("/parking-zones", payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["parking-zones"] }),
  });
}

export function useVehicleEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, plateNumber, type }: { id: string; plateNumber: string; type: string }) =>
      (await api.post<VehicleLogEntryDto>(`/parking-zones/${id}/entry`, { plateNumber, type })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["parking-zones"] }),
  });
}

export function useVehicleExit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, plateNumber }: { id: string; plateNumber: string }) =>
      (await api.post<VehicleLogEntryDto>(`/parking-zones/${id}/exit`, { plateNumber })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["parking-zones"] }),
  });
}
