/** Shapes returned by the licence register API (apps/api/src/licences). */

export interface LicenceOffice {
  id: string;
  name: string;
  code: string;
  city?: string | null;
}

export interface LicenceRow {
  id: string;
  name: string;
  licenceNumber: string;
  category: string;
  issuingAuthority: string;
  branch: LicenceOffice;
  owner: { id: string; name: string } | null;
  /** YYYY-MM-DD */
  expiresAt: string;
  daysLeft: number;
  state: string;
  renewalLeadDays: number;
  renewalStage: string;
  renewalProgress: number;
  hasDocument: boolean;
  active: boolean;
}

export interface LicenceEvent {
  id: string;
  type: string;
  note: string | null;
  actor: string;
  metadata: Record<string, any>;
  createdAt: string;
}

export interface LicenceDocument {
  name: string | null;
  mimeType: string | null;
  size: number | null;
  isPdf: boolean;
  uploadedAt: string;
  uploadedBy: string | null;
  url: string;
}

export interface Licence extends Omit<LicenceRow, "owner"> {
  categoryLabel: string;
  owner: { id: string; name: string; email: string | null; employeeCode: string | null; designation: string | null; phone: string | null } | null;
  issuedAt: string | null;
  renewalWindowOpensOn: string;
  renewalFee: number | null;
  renewalStartedAt: string | null;
  notes: string | null;
  documentUrl: string | null;
  document: LicenceDocument | null;
  alerts: { lastDays: number | null; lastAt: string | null; due: boolean; nextDays: number | null; nextOn: string | null; nextLevel: string | null };
  history: LicenceEvent[];
  createdAt: string;
  updatedAt: string;
  viewer: { canManage: boolean; actions: string[] };
}

export interface LicenceSummary {
  total: number;
  valid: number;
  dueSoon: number;
  expiring: number;
  expired: number;
  renewalsInProgress: number;
  retired: number;
  nextExpiry: { id: string; name: string; branch: LicenceOffice; expiresAt: string; daysLeft: number } | null;
  byCategory: Record<string, number>;
}

export interface LicenceOwnerOption {
  id: string;
  name: string;
  employeeCode: string | null;
  designation: string | null;
  office: LicenceOffice | null;
  roles: string[];
}

export interface AlertRun {
  ranAt: string;
  checked: number;
  alerted: number;
  alerts: { id: string; name: string; licenceNumber: string; branch: string; thresholdDays: number; daysLeft: number; level: string; notified: number }[];
}
