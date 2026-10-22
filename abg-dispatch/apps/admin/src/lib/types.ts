/** Shapes returned by the API (see apps/api/src/parcels/parcel-serializer.ts). */

export interface Person {
  id: string;
  employeeCode: string;
  fullName: string;
  designation: string | null;
  phone: string | null;
  department: { id: string; name: string } | null;
  branch: { id: string; name: string; code: string } | null;
}

export interface Parcel {
  id: string;
  trackingNumber: string;
  qrPayload: string | null;
  title: string;
  description: string;
  contentAccess: "FULL" | "TITLE_ONLY" | "REDACTED";
  category: { id: string; code: string; name: string };
  classification: string;
  priority: string;
  status: string;
  deliveryMethod: string;
  createdBy: { id: string; name: string };
  sentOnBehalf: boolean;
  sender: Person;
  senderDepartment: { id: string; name: string } | null;
  origin: { branch: { id: string; name: string; code: string }; location: { id: string; name: string; path: string } | null };
  receiverType: string;
  receiver: {
    employee: Person | null;
    department: { id: string; name: string } | null;
    external: { name: string; phone: string | null; organization: string | null; address: string | null } | null;
  };
  destination: { branch: { id: string; name: string; code: string } | null; location: { id: string; name: string; path: string } | null; address: string | null };
  carrier: {
    assignmentId: string;
    type: string;
    status: string;
    name: string;
    code: string | null;
    phone: string | null;
    employee: Person | null;
    guest: { id: string; company: string | null; vehicleNumber: string | null; phoneVerified: boolean } | null;
    provider: { id: string; code: string; name: string } | null;
    externalTrackingNumber: string | null;
    externalBookingReference: string | null;
    riderName: string | null;
    riderPhone: string | null;
    trackingUrl: string | null;
    externalStatus: string | null;
    externalStatusAt: string | null;
    assignedAt: string;
    acceptedAt: string | null;
    custodyStartedAt: string | null;
  } | null;
  receipt: {
    receivedAt: string;
    receivedBy: { name: string | null; employeeCode: string | null; phone: string | null };
    onBehalf: boolean;
    onBehalfReason: string | null;
    onBehalfRelationship: string | null;
    verification: string | null;
  } | null;
  milestones: Record<"bookedAt" | "carrierAssignedAt" | "handedOverAt" | "pickedUpAt" | "inTransitAt" | "arrivedAt" | "pendingReceiptAt" | "receivedAt" | "cancelledAt" | "returnRequestedAt" | "returnedAt", string | null>;
  statusChangedAt: string;
  expectedDeliveryAt: string | null;
  isOverdue: boolean;
  overdueSince: string | null;
  hasOpenException: boolean;
  createdAt: string;
  viewer: { relation: string; isSender: boolean; isReceiver: boolean; isCurrentCarrier: boolean; actions: string[] };
}

export interface TimelineEvent {
  id: string;
  sequence: number;
  eventType: string;
  label: string;
  fromStatus: string | null;
  toStatus: string | null;
  actor: { type: string; name: string; code: string | null };
  location: string | null;
  at: string;
  deviceAt: string | null;
  coordinates: { latitude: number; longitude: number } | null;
  verification: { method: string; label: string } | null;
  proof: { id: string; type: string; attachmentId: string | null } | null;
  notes: string | null;
  externalProvider: string | null;
  correctsEventId: string | null;
  correctedBy: string[];
  metadata: Record<string, unknown>;
}

export interface Timeline {
  events: TimelineEvent[];
  attachments: { id: string; kind: string; fileName: string; mimeType: string; sizeBytes: number; uploadedBy: string; createdAt: string }[];
  comments: { id: string; author: string; body: string; createdAt: string }[];
  exceptions: { id: string; code: string; details: string; raisedBy: string; raisedAt: string; resolvedBy: string | null; resolvedAt: string | null; resolution: string | null; open: boolean }[];
}

/** Shapes returned by the incident endpoints (see apps/api/src/incidents/incidents.service.ts). */
export interface IncidentRow {
  id: string;
  referenceNumber: string;
  title: string;
  group: string;
  category: string;
  severity: string;
  status: string;
  resolution: string | null;
  confidential: boolean;
  anonymous: boolean;
  statusNote: string | null;
  statusChangedAt: string;
  createdAt: string;
  branch: { id: string; name: string; code: string };
  place: string | null;
  reporterName: string | null;
  reporterCode: string | null;
  photoCount: number;
  thumbnailUrl: string | null;
}

export interface IncidentPhoto {
  id: string;
  kind: "REPORT" | "RESOLUTION";
  mimeType: string;
  createdAt: string;
  url: string;
}

export interface IncidentUpdate {
  id: string;
  type: string;
  fromStatus: string | null;
  toStatus: string | null;
  note: string | null;
  actor: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

/** One stage of the Reported → Acknowledged → Under Investigation → Closed tracker. */
export interface IncidentStage {
  status: "REPORTED" | "ACKNOWLEDGED" | "UNDER_INVESTIGATION" | "CLOSED";
  state: "done" | "current" | "upcoming" | "skipped";
  at: string | null;
  by: string | null;
  resolution?: string | null;
}

export interface Incident {
  id: string;
  referenceNumber: string;
  title: string;
  description: string;
  group: string;
  category: string;
  severity: string;
  status: string;
  resolution: string | null;
  confidential: boolean;
  anonymous: boolean;
  statusNote: string | null;
  statusChangedAt: string;
  acknowledgedAt: string | null;
  investigationStartedAt: string | null;
  closedAt: string | null;
  createdAt: string;
  branch: { id: string; name: string; code: string };
  location: { id: string; name: string; path: string } | null;
  locationDetail: string | null;
  reporter: { name: string; employeeCode: string | null; designation: string | null; department: string | null; phone: string | null } | null;
  photos: IncidentPhoto[];
  updates: IncidentUpdate[];
  stages: IncidentStage[];
  viewer: { isReporter: boolean; isStaff: boolean; canManage: boolean; actions: string[] };
}

export interface IncidentSummary {
  counts: Record<"REPORTED" | "ACKNOWLEDGED" | "UNDER_INVESTIGATION" | "CLOSED", number>;
  open: number;
  criticalOpen: number;
  /** Critical + High, still open. */
  urgentOpen: number;
  byGroupOpen: Record<"SAFETY_INDUSTRIAL" | "ADMIN_FACILITY" | "SECURITY" | "IT_TECHNICAL", number>;
  oldestReportedAt: string | null;
  closedLast30Days: number;
  avgHoursToClose: number | null;
  /** The latest six reports in the viewer's scope ("recent incident logs"). */
  recent: {
    id: string;
    referenceNumber: string;
    title: string;
    group: string;
    category: string;
    severity: string;
    status: string;
    confidential: boolean;
    branch: { name: string; code: string };
    createdAt: string;
  }[];
}
