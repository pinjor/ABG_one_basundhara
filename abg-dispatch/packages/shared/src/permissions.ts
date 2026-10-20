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
} as const;
export type Capability = (typeof Capability)[keyof typeof Capability];

const C = Capability;

const EMPLOYEE_CAPS: Capability[] = [C.PARCEL_CREATE, C.PARCEL_VIEW_OWN, C.EXCEPTION_RECORD];

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
  RECEIVER: [C.PARCEL_VIEW_OWN, C.EXCEPTION_RECORD],
  COURIER_RUNNER: [C.PARCEL_VIEW_OWN, C.COURIER_ACTIONS, C.EXCEPTION_RECORD],
  DISPATCH_OFFICER: [...EMPLOYEE_CAPS, ...OPERATIONS_CAPS, C.COURIER_ACTIONS],
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
  ],
  AUDITOR: [C.PARCEL_VIEW_ALL, C.DASHBOARD_VIEW, C.ANALYTICS_VIEW, C.REPORTS_EXPORT, C.AUDIT_VIEW],
  SUPER_ADMIN: Object.values(Capability),
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
];

/** Roles that must use MFA once REQUIRE_ADMIN_MFA is on. */
export const PRIVILEGED_ROLES: readonly RoleCode[] = [
  RoleCode.BRANCH_ADMIN,
  RoleCode.HEAD_OFFICE_ADMIN,
  RoleCode.AUDITOR,
  RoleCode.SUPER_ADMIN,
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
