import { create } from "zustand";

export interface Profile {
  id: string;
  displayName: string;
  email: string | null;
  roles: string[];
  capabilities: string[];
  scopedBranchIds: string[];
  canUseAdminPortal: boolean;
  mfaEnabled: boolean;
  roleScopes: { role: string; branch: { id: string; name: string; code: string } | null }[];
  employee: { employeeCode: string; fullName: string; designation: string | null; branch: { id: string; name: string; code: string } } | null;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  profile: Profile | null;
  mfaEnrollmentRequired: boolean;
  set: (s: Partial<AuthState>) => void;
  clear: () => void;
}

const KEY = "abg-dispatch-admin";

function load(): Pick<AuthState, "accessToken" | "refreshToken" | "profile" | "mfaEnrollmentRequired"> {
  try {
    // Session storage: the sign-in ends when the browser tab closes.
    const raw = sessionStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* storage unavailable */
  }
  return { accessToken: null, refreshToken: null, profile: null, mfaEnrollmentRequired: false };
}

export const useAuth = create<AuthState>((set, get) => ({
  ...load(),
  set: (s) => {
    set(s);
    const { accessToken, refreshToken, profile, mfaEnrollmentRequired } = get();
    try {
      sessionStorage.setItem(KEY, JSON.stringify({ accessToken, refreshToken, profile, mfaEnrollmentRequired }));
    } catch {
      /* ignore */
    }
  },
  clear: () => {
    set({ accessToken: null, refreshToken: null, profile: null, mfaEnrollmentRequired: false });
    try {
      sessionStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
  },
}));

export function can(capability: string): boolean {
  return useAuth.getState().profile?.capabilities.includes(capability) ?? false;
}

export function useCan(capability: string): boolean {
  return useAuth((s) => s.profile?.capabilities.includes(capability) ?? false);
}
