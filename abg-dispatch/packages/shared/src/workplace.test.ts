import { describe, expect, test } from "bun:test";
import {
  APPOINTMENT_TRANSITIONS,
  AUDIT_TRANSITIONS,
  Capability,
  FINDING_TRANSITIONS,
  LEAVE_TRANSITIONS,
  LEAVE_TYPE_RULES,
  RoleCode,
  appointmentWindow,
  appointmentsOverlap,
  canAppointmentTransition,
  canAuditTransition,
  canFindingTransition,
  canLeaveTransition,
  capabilitiesFor,
  countLeaveDays,
  findingOverdue,
  formatAppointmentNumber,
  formatAuditNumber,
  formatFindingNumber,
  formatLeaveDays,
  formatLeaveNumber,
  withinMeetingHours,
} from "./index";

describe("leave", () => {
  test("working days skip the weekly holiday and public holidays; maternity counts calendar days", () => {
    // 2026-12-12 (Sat) … 2026-12-19 (Sat): Friday the 18th and Victory Day (the 16th) are not charged.
    expect(countLeaveDays("2026-12-12", "2026-12-19", { type: "EARNED", weekendDays: [5], holidays: ["2026-12-16"] })).toBe(6);
    expect(countLeaveDays("2026-12-18", "2026-12-18", { type: "CASUAL", weekendDays: [5] })).toBe(0);
    expect(countLeaveDays("2026-11-02", "2026-11-02", { type: "CASUAL", halfDay: "FIRST_HALF" })).toBe(0.5);
    expect(countLeaveDays("2026-11-17", "2027-03-08", { type: "MATERNITY", weekendDays: [5] })).toBe(112);
    expect(countLeaveDays("2026-11-05", "2026-11-04", { type: "CASUAL" })).toBe(0);
  });

  test("the policy keeps a balance for every type but leave without pay", () => {
    expect(LEAVE_TYPE_RULES.CASUAL).toMatchObject({ annualDays: 10, maxPerRequest: 3, halfDayAllowed: true });
    expect(LEAVE_TYPE_RULES.SICK.annualDays).toBe(14);
    expect(LEAVE_TYPE_RULES.UNPAID.annualDays).toBeNull();
    expect(LEAVE_TYPE_RULES.MATERNITY.calendarDays).toBe(true);
  });

  test("transitions and formats", () => {
    expect(canLeaveTransition("PENDING_HOD", "PENDING_HR")).toBe(true);
    expect(canLeaveTransition("PENDING_HOD", "APPROVED")).toBe(false);
    expect(canLeaveTransition("APPROVED", "CANCELLED")).toBe(true);
    expect(LEAVE_TRANSITIONS.REJECTED).toEqual([]);
    expect(formatLeaveNumber(2026, 41)).toBe("ABG-LV-2026-041");
    expect(formatLeaveDays(0.5)).toBe("½ day");
    expect(formatLeaveDays(1)).toBe("1 day");
    expect(formatLeaveDays(2.5)).toBe("2.5 days");
  });
});

describe("appointments", () => {
  test("meeting hours are 08:00–20:00 in Dhaka", () => {
    expect(withinMeetingHours(new Date("2026-11-02T11:00:00+06:00"), 30)).toBe(true);
    expect(withinMeetingHours(new Date("2026-11-02T07:30:00+06:00"), 30)).toBe(false);
    expect(withinMeetingHours(new Date("2026-11-02T19:30:00+06:00"), 30)).toBe(true);
    expect(withinMeetingHours(new Date("2026-11-02T19:45:00+06:00"), 30)).toBe(false);
  });

  test("overlaps, transitions and formats", () => {
    const a = appointmentWindow(new Date("2026-11-02T11:00:00+06:00"), 30);
    expect(appointmentsOverlap(a, appointmentWindow(new Date("2026-11-02T11:15:00+06:00"), 30))).toBe(true);
    expect(appointmentsOverlap(a, appointmentWindow(new Date("2026-11-02T11:30:00+06:00"), 30))).toBe(false);
    expect(canAppointmentTransition("PENDING", "PROPOSED")).toBe(true);
    expect(canAppointmentTransition("PROPOSED", "COMPLETED")).toBe(false);
    expect(canAppointmentTransition("CONFIRMED", "PROPOSED")).toBe(true);
    expect(APPOINTMENT_TRANSITIONS.DECLINED).toEqual([]);
    expect(formatAppointmentNumber(2026, 7)).toBe("ABG-AP-2026-007");
  });
});

describe("audits", () => {
  test("transitions: findings close only through verification; observations are noted", () => {
    expect(canAuditTransition("PLANNED", "IN_PROGRESS")).toBe(true);
    expect(canAuditTransition("PLANNED", "CLOSED")).toBe(false);
    expect(canAuditTransition("FOLLOW_UP", "CANCELLED")).toBe(false);
    expect(AUDIT_TRANSITIONS.CLOSED).toEqual([]);
    expect(canFindingTransition("SUBMITTED", "OPEN")).toBe(true);
    expect(canFindingTransition("VERIFIED", "OPEN")).toBe(false);
    expect(FINDING_TRANSITIONS.NOTED).toEqual([]);
  });

  test("overdue is an open action past its Dhaka due date", () => {
    expect(findingOverdue("OPEN", "2026-10-20", "2026-10-23")).toBe(true);
    expect(findingOverdue("OPEN", "2026-10-23", "2026-10-23")).toBe(false);
    expect(findingOverdue("SUBMITTED", "2026-10-20", "2026-10-23")).toBe(false);
    expect(formatAuditNumber(2026, 12)).toBe("ABG-AU-2026-012");
    expect(formatFindingNumber(3)).toBe("F-03");
  });
});

describe("roles for the new modules", () => {
  test("every employee can apply for leave and ask for appointments; HR, compliance and the PA get their desks", () => {
    const employee = capabilitiesFor([RoleCode.EMPLOYEE]);
    expect(employee.has(Capability.LEAVE_APPLY)).toBe(true);
    expect(employee.has(Capability.APPOINTMENT_REQUEST)).toBe(true);
    expect(employee.has(Capability.LEAVE_VIEW)).toBe(false);
    expect(capabilitiesFor([RoleCode.HR_FINANCE]).has(Capability.LEAVE_MANAGE)).toBe(true);
    expect(capabilitiesFor([RoleCode.COMPLIANCE_OFFICER]).has(Capability.AUDITS_MANAGE)).toBe(true);
    expect(capabilitiesFor([RoleCode.EXECUTIVE_ASSISTANT]).has(Capability.APPOINTMENT_MANAGE)).toBe(true);
    // Auditors read audits but never manage them; the audit log stays a separate capability.
    const auditor = capabilitiesFor([RoleCode.AUDITOR]);
    expect(auditor.has(Capability.AUDITS_VIEW)).toBe(true);
    expect(auditor.has(Capability.AUDITS_MANAGE)).toBe(false);
    expect(Capability.AUDIT_VIEW).not.toBe(Capability.AUDITS_VIEW);
  });
});
