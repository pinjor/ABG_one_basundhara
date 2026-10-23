export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

export interface Host {
  userId: string;
  name: string;
  designation: string | null;
  department: string | null;
  office: string | null;
  executive: boolean;
  headOfDepartment: boolean;
}

export interface AppointmentRow {
  id: string;
  referenceNumber: string;
  subject: string;
  purpose: string;
  mode: string;
  durationMinutes: number;
  preferredAt: string;
  alternativeAt: string | null;
  scheduledAt: string | null;
  location: string | null;
  urgent: boolean;
  status: string;
  statusNote: string | null;
  statusChangedAt: string;
  createdAt: string;
  requester: { name: string; designation: string | null; department: string | null };
  host: { userId: string; name: string; designation: string | null };
  branch: { id: string; name: string; code: string };
}

export interface AppointmentUpdate {
  id: string;
  type: string;
  fromStatus: string | null;
  toStatus: string | null;
  note: string | null;
  actor: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface Person {
  userId: string;
  name: string;
  designation: string | null;
  department: string | null;
  office: string | null;
  executive: boolean;
}

export interface Appointment {
  id: string;
  referenceNumber: string;
  subject: string;
  purpose: string;
  purposeLabel: string;
  agenda: string;
  mode: string;
  durationMinutes: number;
  preferredAt: string;
  alternativeAt: string | null;
  scheduledAt: string | null;
  endsAt: string | null;
  location: string | null;
  attendees: string[];
  urgent: boolean;
  status: string;
  statusNote: string | null;
  statusChangedAt: string;
  respondedByName: string | null;
  confirmedAt: string | null;
  createdAt: string;
  branch: { id: string; name: string; code: string };
  requester: Person & { phone: string | null };
  host: Person;
  clashes: { id: string; referenceNumber: string; subject: string; scheduledAt: string; with: string }[];
  updates: AppointmentUpdate[];
  viewer: { isRequester: boolean; isHost: boolean; isOffice: boolean; actions: string[] };
}

export interface AppointmentSummary {
  awaitingAnswer: number;
  awaitingRequester: number;
  confirmedToday: number;
  confirmedThisWeek: number;
  next: AppointmentRow | null;
  myOpenRequests: number;
  answersFor: "EXECUTIVES" | "SELF";
}

export interface Diary {
  from: string;
  to: string;
  hosts: { userId: string; name: string; designation: string | null }[];
  items: AppointmentRow[];
}
