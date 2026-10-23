export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

export interface FindingCounts {
  total: number;
  open: number;
  submitted: number;
  verified: number;
  noted: number;
  overdue: number;
  criticalOpen: number;
  bySeverity: Record<string, number>;
}

export interface AuditRow {
  id: string;
  referenceNumber: string;
  title: string;
  type: string;
  branch: { id: string; name: string; code: string };
  externalBody: string | null;
  lead: { name: string };
  plannedStart: string;
  plannedEnd: string;
  status: string;
  rating: string | null;
  score: number | null;
  statusChangedAt: string;
  createdAt: string;
  counts: FindingCounts;
}

export interface Finding {
  id: string;
  number: string;
  title: string;
  detail: string;
  clause: string | null;
  area: string | null;
  severity: string;
  status: string;
  recommendation: string | null;
  owner: { userId: string; name: string; designation: string | null; department: string | null } | null;
  dueDate: string | null;
  overdue: boolean;
  response: string | null;
  submittedAt: string | null;
  verifiedAt: string | null;
  verifiedByName: string | null;
  createdAt: string;
  actions: string[];
}

export interface MyAction extends Finding {
  audit: { id: string; referenceNumber: string; title: string; type: string; status: string; branch: { id: string; name: string; code: string }; lead: string };
}

export interface AuditUpdate {
  id: string;
  type: string;
  findingId: string | null;
  fromStatus: string | null;
  toStatus: string | null;
  note: string | null;
  actor: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface Audit {
  id: string;
  referenceNumber: string;
  title: string;
  type: string;
  scope: string;
  branch: { id: string; name: string; code: string };
  externalBody: string | null;
  team: string[];
  lead: { userId: string; name: string; designation: string | null };
  plannedStart: string;
  plannedEnd: string;
  status: string;
  rating: string | null;
  score: number | null;
  conclusion: string | null;
  statusNote: string | null;
  statusChangedAt: string;
  startedAt: string | null;
  fieldworkCompletedAt: string | null;
  closedAt: string | null;
  createdByName: string;
  createdAt: string;
  counts: FindingCounts;
  findings: Finding[];
  updates: AuditUpdate[];
  viewer: { isLead: boolean; isStaff: boolean; canManage: boolean; ownsFindings: boolean; partial: boolean; actions: string[] };
}

export interface AuditSummary {
  openAudits: number;
  inProgress: number;
  openActions: number;
  overdueActions: number;
  criticalOpen: number;
  awaitingVerification: number;
  openActionsByOffice: Record<string, number>;
  upcoming: AuditRow[];
  ratingsThisYear: Record<string, number>;
  year: number;
  counts: Record<string, number>;
}
