import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { MemberDto } from "@bsc/shared";

export interface MemberFilters {
  tier?: string;
  status?: string;
  search?: string;
}

export function useMembers(filters: MemberFilters) {
  return useQuery({
    queryKey: ["members", filters],
    queryFn: async () => (await api.get<MemberDto[]>("/members", { params: filters })).data,
  });
}

export function useMember(id: string | null) {
  return useQuery({
    queryKey: ["members", id],
    queryFn: async () => (await api.get<MemberDto>(`/members/${id}`)).data,
    enabled: !!id,
  });
}

export function useMemberAuditLog(id: string | null) {
  return useQuery({
    queryKey: ["members", id, "audit-log"],
    queryFn: async () => (await api.get(`/members/${id}/audit-log`)).data,
    enabled: !!id,
  });
}

export function useCreateMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<MemberDto>) => (await api.post<MemberDto>("/members", payload)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["members"] });
      qc.invalidateQueries({ queryKey: ["dashboard-summary"] });
    },
  });
}

export function useSetMemberStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) =>
      (await api.post<MemberDto>(`/members/${id}/status`, { status })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["members"] });
      qc.invalidateQueries({ queryKey: ["dashboard-summary"] });
    },
  });
}

export function useCheckInMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.post<MemberDto>(`/members/${id}/check-in`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["members"] }),
  });
}

export function useRenewMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, expiryDate }: { id: string; expiryDate?: string }) =>
      (await api.post<MemberDto>(`/members/${id}/renew`, { expiryDate })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["members"] });
      qc.invalidateQueries({ queryKey: ["dashboard-summary"] });
    },
  });
}
