import type { StatusTone } from "./labels";

/**
 * Request for appointment: an employee asks for a meeting with the MD, the
 * Chairman or a head of department. The person asked — or, for the MD and the
 * Chairman, their executive office — confirms it, proposes another time or
 * declines; a proposed time goes back to the requester to accept.
 */
export const AppointmentStatus = {
  /** Waiting for the person asked (or their office) to answer. */
  PENDING: "PENDING",
  /** Another time was proposed; waiting for the requester to accept it. */
  PROPOSED: "PROPOSED",
  CONFIRMED: "CONFIRMED",
  /** The meeting took place. */
  COMPLETED: "COMPLETED",
  DECLINED: "DECLINED",
  CANCELLED: "CANCELLED",
} as const;
export type AppointmentStatus = (typeof AppointmentStatus)[keyof typeof AppointmentStatus];

export const AppointmentPurpose = {
  BUSINESS_REVIEW: "BUSINESS_REVIEW",
  APPROVAL: "APPROVAL",
  PROJECT_UPDATE: "PROJECT_UPDATE",
  PROPOSAL: "PROPOSAL",
  PERSONAL: "PERSONAL",
  COURTESY: "COURTESY",
  OTHER: "OTHER",
} as const;
export type AppointmentPurpose = (typeof AppointmentPurpose)[keyof typeof AppointmentPurpose];

export const MeetingMode = {
  IN_PERSON: "IN_PERSON",
  VIDEO: "VIDEO",
  PHONE: "PHONE",
} as const;
export type MeetingMode = (typeof MeetingMode)[keyof typeof MeetingMode];

export const AppointmentUpdateType = {
  SUBMITTED: "SUBMITTED",
  STATUS_CHANGED: "STATUS_CHANGED",
  /** A new time was proposed (also when a confirmed meeting is moved). */
  TIME_PROPOSED: "TIME_PROPOSED",
  NOTE_ADDED: "NOTE_ADDED",
} as const;
export type AppointmentUpdateType = (typeof AppointmentUpdateType)[keyof typeof AppointmentUpdateType];

/**
 * Who makes each move is decided by the API: the host side confirms,
 * proposes, declines and marks a meeting held; the requester accepts a
 * proposed time or cancels; either side can cancel a confirmed meeting.
 */
export const APPOINTMENT_TRANSITIONS: Record<AppointmentStatus, readonly AppointmentStatus[]> = {
  PENDING: [AppointmentStatus.CONFIRMED, AppointmentStatus.PROPOSED, AppointmentStatus.DECLINED, AppointmentStatus.CANCELLED],
  PROPOSED: [AppointmentStatus.CONFIRMED, AppointmentStatus.DECLINED, AppointmentStatus.CANCELLED],
  CONFIRMED: [AppointmentStatus.COMPLETED, AppointmentStatus.PROPOSED, AppointmentStatus.CANCELLED],
  COMPLETED: [],
  DECLINED: [],
  CANCELLED: [],
};

export function canAppointmentTransition(from: string, to: string): boolean {
  return APPOINTMENT_TRANSITIONS[from as AppointmentStatus]?.includes(to as AppointmentStatus) ?? false;
}

/** Still to happen: waiting for an answer, or booked. */
export const OPEN_APPOINTMENT_STATUSES: readonly AppointmentStatus[] = [AppointmentStatus.PENDING, AppointmentStatus.PROPOSED, AppointmentStatus.CONFIRMED];
export const CLOSED_APPOINTMENT_STATUSES: readonly AppointmentStatus[] = [AppointmentStatus.COMPLETED, AppointmentStatus.DECLINED, AppointmentStatus.CANCELLED];

/** What a viewer may do now (`viewer.actions`); the API re-checks each one. */
export const AppointmentAction = {
  CONFIRM: "CONFIRM",
  PROPOSE: "PROPOSE",
  DECLINE: "DECLINE",
  ACCEPT: "ACCEPT",
  CANCEL: "CANCEL",
  COMPLETE: "COMPLETE",
  ADD_NOTE: "ADD_NOTE",
} as const;
export type AppointmentAction = (typeof AppointmentAction)[keyof typeof AppointmentAction];

export const APPOINTMENT_STATUS_LABEL: Record<AppointmentStatus, string> = {
  PENDING: "Awaiting confirmation",
  PROPOSED: "New time proposed",
  CONFIRMED: "Confirmed",
  COMPLETED: "Held",
  DECLINED: "Declined",
  CANCELLED: "Cancelled",
};

export const APPOINTMENT_STATUS_TONE: Record<AppointmentStatus, StatusTone> = {
  PENDING: "pending",
  PROPOSED: "pending",
  CONFIRMED: "active",
  COMPLETED: "success",
  DECLINED: "danger",
  CANCELLED: "neutral",
};

export const APPOINTMENT_PURPOSE_LABEL: Record<AppointmentPurpose, string> = {
  BUSINESS_REVIEW: "Business review / report",
  APPROVAL: "Approval or signature",
  PROJECT_UPDATE: "Project update",
  PROPOSAL: "New proposal",
  PERSONAL: "Personal / HR matter",
  COURTESY: "Courtesy call",
  OTHER: "Other",
};

export const MEETING_MODE_LABEL: Record<MeetingMode, string> = {
  IN_PERSON: "In person",
  VIDEO: "Video call",
  PHONE: "Phone call",
};

/** Lengths a requester can ask for, in minutes. */
export const APPOINTMENT_DURATIONS: readonly number[] = [15, 30, 45, 60, 90, 120];

export const APPOINTMENT_LIMITS = {
  subjectMin: 3,
  subjectMax: 140,
  agendaMax: 2000,
  locationMax: 140,
  noteMax: 1000,
  /** Declining, cancelling and proposing say why. */
  reasonMin: 3,
  maxAttendees: 8,
  attendeeNameMax: 80,
  /** Ask at least this many minutes ahead. */
  minLeadMinutes: 15,
  /** And at most this many days ahead. */
  maxLeadDays: 90,
  /** Meetings are between these hours, Asia/Dhaka. */
  dayStartHour: 8,
  dayEndHour: 20,
} as const;

/** ABG-AP-YYYY-NNN, e.g. ABG-AP-2026-031. */
export function formatAppointmentNumber(year: number, sequence: number): string {
  return `ABG-AP-${year}-${String(sequence).padStart(3, "0")}`;
}

/** The meeting's span; used for clash checks. */
export function appointmentWindow(start: Date, durationMinutes: number): { start: Date; end: Date } {
  return { start, end: new Date(start.getTime() + durationMinutes * 60_000) };
}

export function appointmentsOverlap(a: { start: Date; end: Date }, b: { start: Date; end: Date }): boolean {
  return a.start.getTime() < b.end.getTime() && b.start.getTime() < a.end.getTime();
}

/** True when `at` falls inside meeting hours (Asia/Dhaka) and the meeting ends by the close of the day. */
export function withinMeetingHours(at: Date, durationMinutes: number): boolean {
  const dhaka = new Date(at.getTime() + 6 * 3_600_000);
  const startMin = dhaka.getUTCHours() * 60 + dhaka.getUTCMinutes();
  return startMin >= APPOINTMENT_LIMITS.dayStartHour * 60 && startMin + durationMinutes <= APPOINTMENT_LIMITS.dayEndHour * 60;
}
