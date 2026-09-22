import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { VisitorDto } from "@bsc/shared";

export interface VisitorFilters {
  category?: string;
  status?: string;
  search?: string;
}

export function useVisitors(filters: VisitorFilters) {
  return useQuery({
    queryKey: ["visitors", filters],
    queryFn: async () => (await api.get<VisitorDto[]>("/visitors", { params: filters })).data,
  });
}

export function useVisitor(id: string | null) {
  return useQuery({
    queryKey: ["visitors", id],
    queryFn: async () => (await api.get<VisitorDto>(`/visitors/${id}`)).data,
    enabled: !!id,
  });
}

export function useVisitorAuditLog(id: string | null) {
  return useQuery({
    queryKey: ["visitors", id, "audit-log"],
    queryFn: async () => (await api.get(`/visitors/${id}/audit-log`)).data,
    enabled: !!id,
  });
}

export function useCreateVisitor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => (await api.post<VisitorDto>("/visitors", payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["visitors"] }),
  });
}

export function useCheckInVisitor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.post<VisitorDto>(`/visitors/${id}/check-in`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["visitors"] }),
  });
}

export function useCheckOutVisitor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.post<VisitorDto>(`/visitors/${id}/check-out`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["visitors"] }),
  });
}
