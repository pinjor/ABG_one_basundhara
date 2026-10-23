import { Classification, RoleCode } from "./enums";

/**
 * Capabilities are what the API checks. Roles are only bundles of
 * capabilities, so the matrix below is the single place that says who may do
 * what. Object-level checks (is this *your* parcel, is it in *your* branch)
 * happen on top of these in the API's ParcelAccessService.
 */
export const Capability = {
  PARCEL_CREATE: "parcel.create",
  PARCEL_VIEW_OWN: "parcel.view.own",
  PARCEL_VIEW_BRANCH: "parcel.view.branch",
  PARCEL_VIEW_ALL: "parcel.view.all",
  COURIER_ACTIONS: "courier.actions",
  CARRIER_ASSIGN: "parcel.carrier.assign",
  HANDOVER_OFFICER: "parcel.handover.officer",
  RECEIVE_AT_DESK: "parcel.receive.desk",
  EXCEPTION_RECORD: "parcel.exception.record",
  EXCEPTION_RESOLVE: "parcel.exception.resolve",
  PARCEL_HOLD: "parcel.hold",
  PARCEL_CANCEL_ANY: "parcel.cancel.any",
  PARCEL_RETURN_ANY: "parcel.return.any",
  PARCEL_CORRECT: "parcel.correct",
  NOTIFY_RESEND: "parcel.notify.resend",
  SLA_UPDATE: "parcel.sla.update",
  EXTERNAL_STATUS_UPDATE: "parcel.external.update",
  DASHBOARD_VIEW: "dashboard.view",
  ANALYTICS_VIEW: "analytics.view",
  REPORTS_EXPORT: "reports.export",
  AUDIT_VIEW: "audit.view",
  CONFIG_MANAGE: "config.manage",
  USERS_MANAGE: "users.manage",
  INTEGRATIONS_MANAGE: "integrations.manage",
  /** Report a workplace incident (every employee). */
  INCIDENT_REPORT: "incident.report",
  /** See incident reports for one's offices. */
  INCIDENT_VIEW: "incident.view",
  /** Change an incident's status, add notes and fix photos. */
  INCIDENT_MANAGE: "incident.manage",
  /** Apply for an official tour (every employee). HOD approval is by being the named approver. */
  TOUR_REQUEST: "tour.request",
  /** See every tour request in one's offices (all offices for head office). */
  TOUR_VIEW: "tour.view",
  /** HR & Finance vetting of tour budgets. */
  TOUR_VET: "tour.vet",
  /** MD / Chairman sanction of overseas tours. */
  TOUR_SANCTION: "tour.sanction",
  /** Request a pool car (every employee). */
  FLEET_REQUEST: "fleet.request",
  /** See every requisition and the fleet. */
  FLEET_VIEW: "fleet.view",
  /** Assign vehicles and drivers; keep the vehicle and driver register. */
  FLEET_MANAGE: "fleet.manage",
  /** Start and finish one's own assigned trips. */
  FLEET_DRIVE: "fleet.drive",
  /** Pre-register a visitor one is hosting (every employee). */
  VISITOR_INVITE: "visitor.invite",
  /** See visitors at one's offices. */
  VISITOR_VIEW: "visitor.view",
  /** Check visitors in and out, register walk-ins. */
  VISITOR_MANAGE: "visitor.manage",
  /** Scan and verify visitor and vehicle gate passes. */
  GATE_VERIFY: "gate.verify",
  /** See the licence register for one's offices. */
  LICENCE_VIEW: "licence.view",
  /** Add licences, track renewals, upload scans. */
  LICENCE_MANAGE: "licence.manage",
  /** Read published notices (every signed-in employee). */
  NOTICE_READ: "notice.read",
  /** Publish notices (branch admins to their offices only). */
  NOTICE_PUBLISH: "notice.publish",
  /** Edit or archive anyone's notices and see every acknowledgement report. */
  NOTICE_MANAGE: "notice.manage",
  /** Ask for a meeting with the MD, the Chairman or a head of department (every employee). The person asked answers by being the host. */
  APPOINTMENT_REQUEST: "appointment.request",
  /** The executive office: answer appointment requests and keep the diaries of the MD and the Chairman. */
  APPOINTMENT_MANAGE: "appointment.manage",
  /** See audits, their findings and corrective actions for one's offices. (Not the audit log: that is `audit.view`.) */
  AUDITS_VIEW: "audits.view",
  /** Plan audits, record findings, assign and verify corrective actions. */
  AUDITS_MANAGE: "audits.manage",
  /** Apply for leave (every employee). HOD approval is by being the named approver. */
  LEAVE_APPLY: "leave.apply",
  /** See leave applications and who is on leave in one's offices. */
  LEAVE_VIEW: "leave.view",
  /** HR: the second approval, balances and entitlements, holidays. */
  LEAVE_MANAGE: "leave.manage",
} as const;
export type Capability = (typeof Capability)[keyof typeof Capability];

const C = Capability;

/** What every employee gets across the modules: request, report, read. */
const SELF_SERVICE_CAPS: Capability[] = [C.INCIDENT_REPORT, C.TOUR_REQUEST, C.FLEET_REQUEST, C.VISITOR_INVITE, C.NOTICE_READ, C.APPOINTMENT_REQUEST, C.LEAVE_APPLY];

const EMPLOYEE_CAPS: Capability[] = [C.PARCEL_CREATE, C.PARCEL_VIEW_OWN, C.EXCEPTION_RECORD, ...SELF_SERVICE_CAPS];

/** Office-level oversight of the facility modules. */
const FACILITY_ADMIN_CAPS: Capability[] = [
  C.INCIDENT_VIEW,
  C.INCIDENT_MANAGE,
  C.TOUR_VIEW,
  C.FLEET_VIEW,
  C.VISITOR_VIEW,
  C.VISITOR_MANAGE,
  C.GATE_VERIFY,
  C.LICENCE_VIEW,
  C.NOTICE_PUBLISH,
  C.AUDITS_VIEW,
  C.LEAVE_VIEW,
];

const OPERATIONS_CAPS: Capability[] = [
  C.PARCEL_VIEW_BRANCH,
  C.CARRIER_ASSIGN,
  C.HANDOVER_OFFICER,
  C.RECEIVE_AT_DESK,
  C.EXCEPTION_RECORD,
  C.EXCEPTION_RESOLVE,
  C.EXTERNAL_STATUS_UPDATE,
  C.NOTIFY_RESEND,
  C.DASHBOARD_VIEW,
  C.REPORTS_EXPORT,
];

export const ROLE_CAPABILITIES: Record<RoleCode, readonly Capability[]> = {
  EMPLOYEE: EMPLOYEE_CAPS,
  SENDER: EMPLOYEE_CAPS,
  RECEIVER: [C.PARCEL_VIEW_OWN, C.EXCEPTION_RECORD, ...SELF_SERVICE_CAPS],
  COURIER_RUNNER: [C.PARCEL_VIEW_OWN, C.COURIER_ACTIONS, C.EXCEPTION_RECORD, ...SELF_SERVICE_CAPS],
  // Front-desk dispatch officers also run reception: visitors and gate passes.
  DISPATCH_OFFICER: [...EMPLOYEE_CAPS, ...OPERATIONS_CAPS, C.COURIER_ACTIONS, C.VISITOR_VIEW, C.VISITOR_MANAGE, C.GATE_VERIFY],
  BRANCH_ADMIN: [
    ...EMPLOYEE_CAPS,
    ...OPERATIONS_CAPS,
    C.PARCEL_HOLD,
    C.PARCEL_CANCEL_ANY,
    C.PARCEL_RETURN_ANY,
    C.PARCEL_CORRECT,
    C.SLA_UPDATE,
    C.ANALYTICS_VIEW,
    C.AUDIT_VIEW,
    ...FACILITY_ADMIN_CAPS,
  ],
  HEAD_OFFICE_ADMIN: [
    ...EMPLOYEE_CAPS,
    ...OPERATIONS_CAPS,
    C.PARCEL_VIEW_ALL,
    C.PARCEL_HOLD,
    C.PARCEL_CANCEL_ANY,
    C.PARCEL_RETURN_ANY,
    C.PARCEL_CORRECT,
    C.SLA_UPDATE,
    C.ANALYTICS_VIEW,
    C.AUDIT_VIEW,
    ...FACILITY_ADMIN_CAPS,
    C.LICENCE_MANAGE,
    C.NOTICE_MANAGE,
    C.AUDITS_MANAGE,
  ],
  AUDITOR: [
    C.PARCEL_VIEW_ALL,
    C.DASHBOARD_VIEW,
    C.ANALYTICS_VIEW,
    C.REPORTS_EXPORT,
    C.AUDIT_VIEW,
    C.INCIDENT_VIEW,
    C.TOUR_VIEW,
    C.FLEET_VIEW,
    C.VISITOR_VIEW,
    C.LICENCE_VIEW,
    C.NOTICE_READ,
    C.AUDITS_VIEW,
    C.LEAVE_VIEW,
  ],
  SUPER_ADMIN: Object.values(Capability),
  FLEET_MANAGER: [...EMPLOYEE_CAPS, C.FLEET_VIEW, C.FLEET_MANAGE, C.GATE_VERIFY],
  DRIVER: [C.PARCEL_VIEW_OWN, C.EXCEPTION_RECORD, ...SELF_SERVICE_CAPS, C.FLEET_DRIVE],
  SECURITY_GUARD: [C.PARCEL_VIEW_OWN, ...SELF_SERVICE_CAPS, C.VISITOR_VIEW, C.VISITOR_MANAGE, C.GATE_VERIFY],
  HR_FINANCE: [...EMPLOYEE_CAPS, C.TOUR_VIEW, C.TOUR_VET, C.NOTICE_PUBLISH, C.LEAVE_VIEW, C.LEAVE_MANAGE],
  EXECUTIVE: [...EMPLOYEE_CAPS, C.TOUR_VIEW, C.TOUR_SANCTION, C.NOTICE_PUBLISH, C.NOTICE_MANAGE, C.LICENCE_VIEW, C.INCIDENT_VIEW, C.AUDITS_VIEW, C.LEAVE_VIEW],
  COMPLIANCE_OFFICER: [...EMPLOYEE_CAPS, C.LICENCE_VIEW, C.LICENCE_MANAGE, C.NOTICE_PUBLISH, C.AUDITS_VIEW, C.AUDITS_MANAGE],
  EXECUTIVE_ASSISTANT: [...EMPLOYEE_CAPS, C.APPOINTMENT_MANAGE],
};

export function capabilitiesFor(roles: readonly string[]): Set<Capability> {
  const caps = new Set<Capability>();
  for (const role of roles) {
    for (const cap of ROLE_CAPABILITIES[role as RoleCode] ?? []) caps.add(cap);
  }
  return caps;
}

export function hasCapability(roles: readonly string[], cap: Capability): boolean {
  return capabilitiesFor(roles).has(cap);
}

/** Roles that may sign in to the admin portal. */
export const ADMIN_PORTAL_ROLES: readonly RoleCode[] = [
  RoleCode.DISPATCH_OFFICER,
  RoleCode.BRANCH_ADMIN,
  RoleCode.HEAD_OFFICE_ADMIN,
  RoleCode.AUDITOR,
  RoleCode.SUPER_ADMIN,
  RoleCode.FLEET_MANAGER,
  RoleCode.SECURITY_GUARD,
  RoleCode.HR_FINANCE,
  RoleCode.EXECUTIVE,
  RoleCode.COMPLIANCE_OFFICER,
  RoleCode.EXECUTIVE_ASSISTANT,
];

/** Roles that must use MFA once REQUIRE_ADMIN_MFA is on. */
export const PRIVILEGED_ROLES: readonly RoleCode[] = [
  RoleCode.BRANCH_ADMIN,
  RoleCode.HEAD_OFFICE_ADMIN,
  RoleCode.AUDITOR,
  RoleCode.SUPER_ADMIN,
  RoleCode.FLEET_MANAGER,
  RoleCode.HR_FINANCE,
  RoleCode.EXECUTIVE,
  RoleCode.COMPLIANCE_OFFICER,
];

/** A role that may read but never change operational data. */
export const READ_ONLY_ROLES: readonly RoleCode[] = [RoleCode.AUDITOR];

/**
 * How a viewer is related to a parcel. The API works this out per request and
 * uses it for both access and redaction.
 */
export const ViewerRelation = {
  PARTY: "PARTY",
  CARRIER: "CARRIER",
  BRANCH_OPS: "BRANCH_OPS",
  HEAD_OFFICE: "HEAD_OFFICE",
  AUDITOR: "AUDITOR",
  SUPER_ADMIN: "SUPER_ADMIN",
  /**
   * A colleague at the destination office who has scanned the physical label
   * of a parcel waiting for receipt. Enough to receive it on the receiver's
   * behalf; sees no more than a carrier would.
   */
  DESTINATION_COLLEAGUE: "DESTINATION_COLLEAGUE",
} as const;
export type ViewerRelation = (typeof ViewerRelation)[keyof typeof ViewerRelation];

export type ContentAccess = "FULL" | "TITLE_ONLY" | "REDACTED";

/**
 * What a viewer may see of a parcel's contents (title, description, content
 * attachments). Routing data — who, where, when, which carrier — is always
 * visible to anyone with access, because that is what operations need.
 *
 *   NORMAL / INTERNAL     everyone with access sees everything
 *   CONFIDENTIAL          carriers and branch operations see the title only
 *   HIGHLY_CONFIDENTIAL   only the parties, auditors and super admins see the
 *                         title; everyone else sees a placeholder
 */
export function contentAccess(relation: ViewerRelation, classification: Classification): ContentAccess {
  if (relation === ViewerRelation.PARTY || relation === ViewerRelation.SUPER_ADMIN || relation === ViewerRelation.AUDITOR) {
    return "FULL";
  }
  switch (classification) {
    case Classification.NORMAL:
    case Classification.INTERNAL:
      return "FULL";
    case Classification.CONFIDENTIAL:
      return relation === ViewerRelation.HEAD_OFFICE ? "FULL" : "TITLE_ONLY";
    case Classification.HIGHLY_CONFIDENTIAL:
      return "REDACTED";
    default:
      return "REDACTED";
  }
}

export const REDACTED_TITLE = "Highly confidential dispatch";
export const REDACTED_DESCRIPTION = "Contents are visible only to the sender and receiver.";

/** Mask a phone number for viewers who don't need the whole thing: 01712345678 → 017•••••678. */
export function maskPhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\s+/g, "");
  if (digits.length <= 6) return "•".repeat(digits.length);
  return `${digits.slice(0, 3)}${"•".repeat(digits.length - 6)}${digits.slice(-3)}`;
}
