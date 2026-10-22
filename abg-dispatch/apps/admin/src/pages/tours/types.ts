/** Shapes returned by the tours API (apps/api/src/tours/tours.service.ts). */

export type TourAwaiting = "HOD" | "VETTING" | "SANCTION";

export interface TourPerson {
  name: string;
  employeeCode: string | null;
  designation: string | null;
  department: string | null;
}

/** GET /tours/mine and GET /admin/tours rows. */
export interface TourRow {
  id: string;
  referenceNumber: string;
  title: string;
  type: string;
  purpose: string;
  destination: string;
  country: string | null;
  startDate: string;
  endDate: string;
  durationDays: number;
  transportMode: string;
  estimatedBudget: number;
  advanceRequested: number;
  sanctionedBudget: number | null;
  status: string;
  awaiting: TourAwaiting | null;
  statusNote: string | null;
  statusChangedAt: string;
  createdAt: string;
  passportAlert: boolean;
  coTravellerCount: number;
  traveller: TourPerson;
  approver: { name: string };
  branch: { id: string; name: string; code: string };
}

/** GET /tours/approvals rows (also read by the mobile approvals inbox — fixed shape). */
export interface TourApprovalRow {
  id: string;
  referenceNumber: string;
  title: string;
  type: string;
  /** Destination with the country for overseas tours, e.g. "Frankfurt, Germany". */
  destination: string;
  startDate: string;
  endDate: string;
  estimatedBudget: number;
  status: string;
  awaiting: TourAwaiting;
  traveller: { name: string; designation: string | null; department: string | null };
  createdAt: string;
}

export type PipelineState = "done" | "current" | "upcoming" | "rejected" | "cancelled" | "skipped";

export interface PipelineStage {
  key: string;
  label: string;
  state: PipelineState;
  at: string | null;
  by: string | null;
  note: string | null;
  waitingFor: string | null;
}

export interface TourUpdate {
  id: string;
  type: "SUBMITTED" | "STATUS_CHANGED" | "NOTE_ADDED" | "BUDGET_CHANGED";
  fromStatus: string | null;
  toStatus: string | null;
  note: string | null;
  actor: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface Tour {
  id: string;
  referenceNumber: string;
  type: string;
  purpose: string;
  title: string;
  description: string;
  destination: string;
  country: string | null;
  startDate: string;
  endDate: string;
  durationDays: number;
  transportMode: string;
  coTravellers: string[];
  estimatedBudget: number;
  advanceRequested: number;
  sanctionedBudget: number | null;
  passportNumber: string | null;
  passportExpiry: string | null;
  passportAlert: boolean;
  status: string;
  awaiting: TourAwaiting | null;
  statusNote: string | null;
  statusChangedAt: string;
  hodApprovedAt: string | null;
  vettedAt: string | null;
  sanctionedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  rejectedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  branch: { id: string; name: string; code: string };
  traveller: TourPerson & { phone: string | null };
  approver: { name: string; designation: string | null; department: string | null };
  pipeline: PipelineStage[];
  updates: TourUpdate[];
  viewer: {
    isTraveller: boolean;
    isApprover: boolean;
    isStaff: boolean;
    canDecide: boolean;
    blockedReason: string | null;
    startableFrom: string | null;
    actions: string[];
  };
}

export interface TourSummary {
  activeForeign: number;
  activeForeignCountries: string[];
  pendingApprovals: number;
  pendingByStage: { PENDING_HOD: number; PENDING_VETTING: number; PENDING_SANCTION: number };
  ytdSanctioned: number;
  annualBudget: number;
  utilisationPct: number;
  passportAlerts: number;
  upcomingThisMonth: number;
  year: number;
  counts: Record<string, number>;
}

export interface TourSettings {
  annualTravelBudget: number;
  updatedAt: string | null;
  updatedBy: string | null;
}

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

/** /auth/me as the tours form needs it (the line manager is the default approver). */
export interface MeWithManager {
  employee: {
    id: string;
    fullName: string;
    branch: { id: string; name: string; code: string };
    manager: { employeeId: string; userId: string | null; fullName: string; designation: string | null; employeeCode: string } | null;
  } | null;
}

export interface DirectoryPerson {
  id: string;
  employeeCode: string;
  fullName: string;
  designation: string | null;
  department: { id: string; name: string } | null;
  branch: { id: string; name: string; code: string } | null;
  isMe: boolean;
  hasAccount: boolean;
}
