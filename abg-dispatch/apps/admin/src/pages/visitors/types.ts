/** Shapes returned by the visitors API (apps/api/src/visitors). */

export type VisitAction = "CHECK_IN" | "CHECK_OUT" | "CANCEL";

export interface VisitRow {
  id: string;
  passNumber: string;
  status: string;
  walkIn: boolean;
  visitorName: string;
  visitorPhone: string | null;
  company: string | null;
  purpose: string;
  purposeDetail: string | null;
  partySize: number;
  vehicleNumber: string | null;
  carrying: string | null;
  badgeNumber: string | null;
  branch: { id: string; name: string; code: string };
  location: string | null;
  hostName: string;
  isHost: boolean;
  expectedAt: string;
  expectedUntil: string | null;
  checkedInAt: string | null;
  checkedOutAt: string | null;
  cancelledAt: string | null;
  onSiteMinutes: number | null;
  overstay: boolean;
  actions: VisitAction[];
}

export interface Visit {
  id: string;
  passNumber: string;
  status: string;
  walkIn: boolean;
  visitorName: string;
  visitorPhone: string | null;
  company: string | null;
  idLast4: string | null;
  purpose: string;
  purposeDetail: string | null;
  partySize: number;
  vehicleNumber: string | null;
  carrying: string | null;
  notes: string | null;
  branch: { id: string; name: string; code: string; address: string | null; city: string | null };
  location: { id: string; name: string; path: string } | null;
  host: { userId: string | null; name: string; employeeCode: string | null; designation: string | null; department: string | null; phone: string | null };
  expectedAt: string;
  expectedUntil: string | null;
  badgeNumber: string | null;
  checkedInAt: string | null;
  checkedInBy: string | null;
  checkInPoint: string | null;
  checkedOutAt: string | null;
  checkedOutBy: string | null;
  cancelledAt: string | null;
  cancelledBy: string | null;
  cancelReason: string | null;
  expiredAt: string | null;
  createdAt: string;
  onSiteMinutes: number | null;
  overstay: boolean;
  pass: { token: string; payload: string } | null;
  viewer: { isHost: boolean; isStaff: boolean; canManage: boolean; actions: VisitAction[] };
}

export interface VisitSummary {
  onSiteNow: number;
  peopleOnSite: number;
  overstaying: number;
  expectedToday: number;
  checkedOutToday: number;
  walkInsToday: number;
  visitsToday: number;
  byPurposeToday: Record<string, number>;
  last7Days: { day: string; visits: number }[];
  longestOnSite: { id: string; visitorName: string; since: string } | null;
  asOf: string;
}

export interface PassWarning {
  code: "WRONG_OFFICE" | "WRONG_DAY" | "EARLY" | "CANCELLED" | "EXPIRED" | "ALREADY_OUT" | "OVERSTAY";
  message: string;
  blocking: boolean;
}

export interface GatePassView {
  token: string | null;
  visitId: string | null;
  passNumber: string;
  status: string;
  walkIn: boolean;
  valid: boolean;
  allowed: VisitAction[];
  warnings: PassWarning[];
  visitor: { name: string; company: string | null; phone: string | null; idLast4: string | null; partySize: number; vehicleNumber: string | null; carrying: string | null };
  purpose: string;
  purposeDetail: string | null;
  host: { name: string; designation: string | null; department: string | null };
  branch: { id: string; name: string; code: string };
  location: string | null;
  expectedAt: string;
  expectedUntil: string | null;
  checkedInAt: string | null;
  checkedOutAt: string | null;
  checkInPoint: string | null;
  badgeNumber: string | null;
}

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}
