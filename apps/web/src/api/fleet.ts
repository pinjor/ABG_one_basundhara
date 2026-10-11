import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { FleetVehicleDto, TripDto } from "@bsc/shared";

export function useFleetVehicles(params: { type?: string; status?: string } = {}) {
  return useQuery({
    queryKey: ["fleet", params],
    queryFn: async () => (await api.get<FleetVehicleDto[]>("/fleet", { params })).data,
    refetchInterval: 10000,
  });
}

export function useCreateFleetVehicle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { type: string; driverName?: string; currentLocation?: string }) =>
      (await api.post<FleetVehicleDto>("/fleet", payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fleet"] }),
  });
}

export function useSetFleetVehicleStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) =>
      (await api.post<FleetVehicleDto>(`/fleet/${id}/status`, { status })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fleet"] }),
  });
}

export function useTrips(params: { vehicleId?: string; status?: string } = {}) {
  return useQuery({
    queryKey: ["trips", params],
    queryFn: async () => (await api.get<TripDto[]>("/trips", { params })).data,
    refetchInterval: 8000,
  });
}

export function useCreateTrip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { vehicleId?: string; passengerRef: string; fromLocation: string; toLocation: string; eventPackId?: string }) =>
      (await api.post<TripDto>("/trips", payload)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["trips"] });
      qc.invalidateQueries({ queryKey: ["fleet"] });
      qc.invalidateQueries({ queryKey: ["event-board"] });
    },
  });
}

export function useAdvanceTrip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) =>
      (await api.post<TripDto>(`/trips/${id}/status`, { status })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["trips"] });
      qc.invalidateQueries({ queryKey: ["fleet"] });
    },
  });
}
