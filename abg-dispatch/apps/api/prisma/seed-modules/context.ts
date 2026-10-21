import type { PrismaClient } from "@prisma/client";

/** What the main seed hands each module's seeder. Keys are codes: branches "HO", locations "HO:GATE", people "ABG-2041". */
export interface SeedContext {
  prisma: PrismaClient;
  now: Date;
  /** Private file storage root (STORAGE_DIR), for seeded documents and photos. */
  storageRoot: string;
  branches: Record<string, { id: string; name: string; code: string }>;
  locations: Record<string, { id: string; path: string; branchId: string }>;
  departments: Record<string, { id: string; name: string }>;
  employees: Record<string, { id: string; fullName: string; phone: string | null; branchId: string; code: string; branch: string; departmentId: string | null }>;
  /** People with an app account, by employee code. */
  users: Record<string, { id: string; name: string; code: string }>;
}

export const MINUTE = 60_000;
export const DAY = 86_400_000;
