import { useQuery } from "@tanstack/react-query";
import { api } from "./api";

export interface Branch {
  id: string;
  name: string;
  code: string;
  type: string;
  city: string | null;
  address: string | null;
  phone: string | null;
  active: boolean;
  _count?: { employees: number; locations: number; departments: number };
}
export interface Category {
  id: string;
  code: string;
  name: string;
  description: string | null;
  sortOrder: number;
  active: boolean;
  _count?: { parcels: number };
}
export interface Provider {
  id: string;
  code: string;
  name: string;
  enabled: boolean;
  apiEnabled: boolean;
  webhookEnabled: boolean;
  trackingUrlTemplate: string | null;
  healthStatus: string;
  config: Record<string, unknown> | null;
}

/** Reference data used by filters and forms; cached for the session. */
export const useBranches = () => useQuery({ queryKey: ["admin", "branches"], queryFn: () => api.get<Branch[]>("/admin/branches"), staleTime: 5 * 60_000 });
export const useCategories = () => useQuery({ queryKey: ["admin", "categories"], queryFn: () => api.get<Category[]>("/admin/categories"), staleTime: 5 * 60_000 });
export const useProviders = () => useQuery({ queryKey: ["admin", "courier-providers"], queryFn: () => api.get<Provider[]>("/admin/courier-providers"), staleTime: 5 * 60_000 });
