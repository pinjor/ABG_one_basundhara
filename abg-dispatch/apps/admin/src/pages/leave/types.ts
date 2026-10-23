import type { ProgressStage } from "../../components/StatusChip";

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

export interface LeaveBalance {
  type: string;
  entitled: number | null;
  used: number;
  pending: number;
  available: number | null;
  adjusted: boolean;
  note: string | null;
}

export interface LeaveRow {
  id: string;
  referenceNumber: string;
  type: string;
  startDate: string;
  endDate: string;
  halfDay: string | null;
  days: number;
  year: number;
  reason: string;
  status: string;
  awaiting: "HOD" | "HR" | null;
  onLeaveNow: boolean;
  statusNote: string | null;
  statusChangedAt: string;
  createdAt: string;
  applicant: { name: string; employeeCode: string | null; designation: string | null; department: string | null };
  approver: { name: string };
  reliever: { name: string } | null;
  branch: { id: string; name: string; code: string };
}

export interface LeaveApprovalRow {
  id: string;
  referenceNumber: string;
  type: string;
  startDate: string;
  endDate: string;
  halfDay: string | null;
  days: number;
  reason: string;
  status: string;
  awaiting: "HOD" | "HR";
  applicant: { name: string; designation: string | null; department: string | null };
  createdAt: string;
}

export interface LeaveUpdate {
  id: string;
  type: string;
  fromStatus: string | null;
  toStatus: string | null;
  note: string | null;
  actor: string;
  createdAt: string;
}

export interface Leave {
  id: string;
  referenceNumber: string;
  type: string;
  startDate: string;
  endDate: string;
  halfDay: string | null;
  days: number;
  year: number;
  reason: string | null;
  addressDuringLeave: string | null;
  contactPhone: string | null;
  status: string;
  awaiting: "HOD" | "HR" | null;
  onLeaveNow: boolean;
  statusNote: string | null;
  statusChangedAt: string;
  hodApprovedAt: string | null;
  approvedAt: string | null;
  createdAt: string;
  branch: { id: string; name: string; code: string };
  applicant: { name: string; employeeCode: string | null; designation: string | null; department: string | null };
  approver: { name: string; designation: string | null };
  reliever: { name: string; designation: string | null } | null;
  balance: LeaveBalance | null;
  pipeline: ProgressStage[];
  updates: LeaveUpdate[];
  viewer: { isApplicant: boolean; isApprover: boolean; isHr: boolean; isReliever: boolean; canDecide: boolean; blockedReason: string | null; actions: string[] };
}

export interface LeaveSummary {
  onLeaveToday: number;
  onLeave: { id: string; name: string; designation: string | null; type: string; until: string }[];
  pendingApprovals: number;
  pendingByStage: { PENDING_HOD: number; PENDING_HR: number };
  startingThisWeek: number;
  approvedDaysByType: Record<string, number>;
  year: number;
  counts: Record<string, number>;
}

export interface PublicHoliday {
  date: string;
  name: string;
}

export interface LeaveSettings {
  weekendDays: number[];
  holidays: PublicHoliday[];
  updatedAt: string | null;
  updatedBy: string | null;
}

export interface CalendarLeave {
  id: string;
  referenceNumber: string;
  type: string;
  status: string;
  startDate: string;
  endDate: string;
  halfDay: string | null;
  days: number;
}

export interface LeaveCalendar {
  from: string;
  to: string;
  weekendDays: number[];
  holidays: PublicHoliday[];
  people: { userId: string; name: string; designation: string | null; department: string | null; office: string; leaves: CalendarLeave[] }[];
}

export interface PersonBalances {
  year: number;
  person: { userId: string; name: string; employeeCode: string; designation: string | null; department: string | null };
  balances: LeaveBalance[];
}
