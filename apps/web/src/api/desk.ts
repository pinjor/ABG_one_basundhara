import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

export type DeskModule = "finance" | "procurement" | "hrm" | "ticketing";
export type DeskAction = "CHECK_IN" | "CHECK_OUT" | "APPROVE" | "REJECT";

export interface DeskRecord {
  id: string;
  moduleKey: DeskModule;
  featureKey: string;
  reference: string;
  title: string;
  party: string;
  notes: string;
  amountBdt: number | null;
  details: Record<string, string | number>;
  status: string;
  createdAt: string;
}

const NEXT: Record<DeskModule, Record<string, string[]>> = {
  finance: { DRAFT: ["POSTED"], POSTED: ["REVERSED"], REVERSED: [] },
  procurement: { DRAFT: ["SUBMITTED"], SUBMITTED: ["APPROVED", "RETURNED"], RETURNED: ["SUBMITTED"], APPROVED: ["CLOSED"], CLOSED: [] },
  hrm: { DRAFT: ["ACTIVE"], ACTIVE: ["CLOSED"], CLOSED: [] },
  ticketing: { OPEN: ["ACTIVE"], ACTIVE: ["CLOSED"], CLOSED: [] },
};

export function nextDeskStatuses(module: DeskModule, status: string): string[] {
  return NEXT[module][status] ?? [];
}

export function useDeskRecords(module: DeskModule, feature?: string) {
  return useQuery({
    queryKey: ["desk", module, feature ?? ""],
    queryFn: async () => (await api.get<DeskRecord[]>(`/desk/${module}`, { params: { feature: feature || undefined } })).data,
  });
}

export function useCreateDeskRecord(module: DeskModule) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (body: { featureKey: string; title: string; party: string; notes?: string; amountBdt?: number; detailsJson?: string }) =>
      (await api.post<DeskRecord>(`/desk/${module}`, body)).data,
    onSuccess: () => void client.invalidateQueries({ queryKey: ["desk", module] }),
  });
}

export function useSetDeskStatus(module: DeskModule) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (body: { id: string; status: string }) =>
      (await api.post<DeskRecord>(`/desk/${module}/${body.id}/status`, { status: body.status })).data,
    onSuccess: () => void client.invalidateQueries({ queryKey: ["desk", module] }),
  });
}

export function useDeskAction(module: DeskModule) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (body: { id: string; action: DeskAction }) =>
      (await api.post<DeskRecord>(`/desk/${module}/${body.id}/action`, { action: body.action })).data,
    onSuccess: () => void client.invalidateQueries({ queryKey: ["desk", module] }),
  });
}
