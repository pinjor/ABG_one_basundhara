/**
 * Domain vocabulary for ABG Dispatch. These string values are stored verbatim in
 * PostgreSQL, sent over the API and rendered by the mobile app and admin portal,
 * so renaming one is a data migration, not a refactor.
 */

export const ParcelStatus = {
  DRAFT: "DRAFT",
  BOOKED: "BOOKED",
  AWAITING_PICKUP: "AWAITING_PICKUP",
  PICKED_UP: "PICKED_UP",
  IN_TRANSIT: "IN_TRANSIT",
  ARRIVED_AT_DESTINATION: "ARRIVED_AT_DESTINATION",
  PENDING_RECEIPT: "PENDING_RECEIPT",
  RECEIVED: "RECEIVED",
  ON_HOLD: "ON_HOLD",
  DELIVERY_EXCEPTION: "DELIVERY_EXCEPTION",
  DELIVERY_FAILED: "DELIVERY_FAILED",
  RETURN_REQUESTED: "RETURN_REQUESTED",
  RETURN_IN_TRANSIT: "RETURN_IN_TRANSIT",
  RETURNED: "RETURNED",
  CANCELLED: "CANCELLED",
} as const;
export type ParcelStatus = (typeof ParcelStatus)[keyof typeof ParcelStatus];

/** Every entry in the custody ledger carries one of these. */
export const EventType = {
  PARCEL_CREATED: "PARCEL_CREATED",
  PARCEL_BOOKED: "PARCEL_BOOKED",
  CARRIER_ASSIGNED: "CARRIER_ASSIGNED",
  CARRIER_ACCEPTED: "CARRIER_ACCEPTED",
  CARRIER_REASSIGNED: "CARRIER_REASSIGNED",
  HANDOVER_REQUESTED: "HANDOVER_REQUESTED",
  HANDOVER_CONFIRMED: "HANDOVER_CONFIRMED",
  PICKED_UP: "PICKED_UP",
  IN_TRANSIT: "IN_TRANSIT",
  CHECKPOINT: "CHECKPOINT",
  ARRIVED_AT_DESTINATION: "ARRIVED_AT_DESTINATION",
  PENDING_RECEIPT: "PENDING_RECEIPT",
  RECEIPT_OTP_SENT: "RECEIPT_OTP_SENT",
  RECEIVED: "RECEIVED",
  EXCEPTION_RECORDED: "EXCEPTION_RECORDED",
  EXCEPTION_RESOLVED: "EXCEPTION_RESOLVED",
  PUT_ON_HOLD: "PUT_ON_HOLD",
  RELEASED_FROM_HOLD: "RELEASED_FROM_HOLD",
  DELIVERY_FAILED: "DELIVERY_FAILED",
  RETURN_REQUESTED: "RETURN_REQUESTED",
  RETURN_IN_TRANSIT: "RETURN_IN_TRANSIT",
  RETURNED: "RETURNED",
  CANCELLED: "CANCELLED",
  NOTE_ADDED: "NOTE_ADDED",
  ATTACHMENT_ADDED: "ATTACHMENT_ADDED",
  CORRECTION_ADDED: "CORRECTION_ADDED",
  EXPECTED_DELIVERY_CHANGED: "EXPECTED_DELIVERY_CHANGED",
  SLA_REMINDER: "SLA_REMINDER",
  SLA_ESCALATED: "SLA_ESCALATED",
  EXTERNAL_STATUS_UPDATE: "EXTERNAL_STATUS_UPDATE",
  NOTIFICATION_RESENT: "NOTIFICATION_RESENT",
} as const;
export type EventType = (typeof EventType)[keyof typeof EventType];

export const RoleCode = {
  EMPLOYEE: "EMPLOYEE",
  SENDER: "SENDER",
  RECEIVER: "RECEIVER",
  COURIER_RUNNER: "COURIER_RUNNER",
  DISPATCH_OFFICER: "DISPATCH_OFFICER",
  BRANCH_ADMIN: "BRANCH_ADMIN",
  HEAD_OFFICE_ADMIN: "HEAD_OFFICE_ADMIN",
  AUDITOR: "AUDITOR",
  SUPER_ADMIN: "SUPER_ADMIN",
  /** Assigns pool cars and drivers; keeps the fleet register. */
  FLEET_MANAGER: "FLEET_MANAGER",
  /** Drives pool cars: sees and starts/finishes their own trips. */
  DRIVER: "DRIVER",
  /** Gate security: checks visitors in and out, verifies gate passes. */
  SECURITY_GUARD: "SECURITY_GUARD",
  /** HR & Finance: vets official tours and their budgets; publishes HR notices. */
  HR_FINANCE: "HR_FINANCE",
  /** Managing Director / Chairman: sanctions overseas tours, publishes executive notices. */
  EXECUTIVE: "EXECUTIVE",
  /** Keeps the regulatory licence register. */
  COMPLIANCE_OFFICER: "COMPLIANCE_OFFICER",
  /** The MD's and Chairman's office (PA): answers appointment requests and keeps their diaries. */
  EXECUTIVE_ASSISTANT: "EXECUTIVE_ASSISTANT",
} as const;
export type RoleCode = (typeof RoleCode)[keyof typeof RoleCode];

export const CarrierType = {
  INTERNAL_EMPLOYEE: "INTERNAL_EMPLOYEE",
  EXTERNAL_COURIER: "EXTERNAL_COURIER",
  GUEST_PERSON: "GUEST_PERSON",
} as const;
export type CarrierType = (typeof CarrierType)[keyof typeof CarrierType];

export const Priority = {
  NORMAL: "NORMAL",
  PRIORITY: "PRIORITY",
  URGENT: "URGENT",
  CRITICAL: "CRITICAL",
} as const;
export type Priority = (typeof Priority)[keyof typeof Priority];

export const PRIORITY_RANK: Record<Priority, number> = { NORMAL: 0, PRIORITY: 1, URGENT: 2, CRITICAL: 3 };

export const Classification = {
  NORMAL: "NORMAL",
  INTERNAL: "INTERNAL",
  CONFIDENTIAL: "CONFIDENTIAL",
  HIGHLY_CONFIDENTIAL: "HIGHLY_CONFIDENTIAL",
} as const;
export type Classification = (typeof Classification)[keyof typeof Classification];

export const ReceiverType = {
  EMPLOYEE: "EMPLOYEE",
  DEPARTMENT: "DEPARTMENT",
  BRANCH: "BRANCH",
  EXTERNAL: "EXTERNAL",
} as const;
export type ReceiverType = (typeof ReceiverType)[keyof typeof ReceiverType];

export const ActorType = {
  EMPLOYEE: "EMPLOYEE",
  GUEST: "GUEST",
  ADMIN: "ADMIN",
  SYSTEM: "SYSTEM",
  EXTERNAL_PROVIDER: "EXTERNAL_PROVIDER",
} as const;
export type ActorType = (typeof ActorType)[keyof typeof ActorType];

/** How a custody change was proven. */
export const VerificationMethod = {
  NONE: "NONE",
  SENDER_APP: "SENDER_APP",
  SENDER_PIN: "SENDER_PIN",
  DISPATCH_OFFICER: "DISPATCH_OFFICER",
  APP_CONFIRMATION: "APP_CONFIRMATION",
  QR_CONFIRMATION: "QR_CONFIRMATION",
  OTP: "OTP",
  SIGNATURE: "SIGNATURE",
  PHOTO: "PHOTO",
  EXTERNAL_PROVIDER: "EXTERNAL_PROVIDER",
  ADMIN_OVERRIDE: "ADMIN_OVERRIDE",
} as const;
export type VerificationMethod = (typeof VerificationMethod)[keyof typeof VerificationMethod];

export const ProofType = {
  OTP: "OTP",
  APP_CONFIRMATION: "APP_CONFIRMATION",
  QR_CONFIRMATION: "QR_CONFIRMATION",
  SIGNATURE: "SIGNATURE",
  PHOTO: "PHOTO",
  DOCUMENT: "DOCUMENT",
  ADMIN_OVERRIDE: "ADMIN_OVERRIDE",
  SENDER_PIN: "SENDER_PIN",
  SENDER_APP: "SENDER_APP",
  OFFICER_CONFIRMATION: "OFFICER_CONFIRMATION",
  EXTERNAL_PROVIDER: "EXTERNAL_PROVIDER",
} as const;
export type ProofType = (typeof ProofType)[keyof typeof ProofType];

export const AttachmentKind = {
  COVER_PHOTO: "COVER_PHOTO",
  DISPATCH_CHALLAN: "DISPATCH_CHALLAN",
  SUPPORTING_DOCUMENT: "SUPPORTING_DOCUMENT",
  COURIER_RECEIPT: "COURIER_RECEIPT",
  PROOF_OF_DELIVERY: "PROOF_OF_DELIVERY",
  SIGNATURE: "SIGNATURE",
  OTHER: "OTHER",
} as const;
export type AttachmentKind = (typeof AttachmentKind)[keyof typeof AttachmentKind];

/** Proof-type attachments photograph the sealed package, never its contents. */
export const PROOF_ATTACHMENT_KINDS: AttachmentKind[] = [
  AttachmentKind.PROOF_OF_DELIVERY,
  AttachmentKind.SIGNATURE,
  AttachmentKind.COURIER_RECEIPT,
];

export const ExceptionCode = {
  RECEIVER_UNAVAILABLE: "RECEIVER_UNAVAILABLE",
  WRONG_DESTINATION: "WRONG_DESTINATION",
  ADDRESS_CLARIFICATION: "ADDRESS_CLARIFICATION",
  COURIER_CHANGED: "COURIER_CHANGED",
  PACKAGE_DAMAGED: "PACKAGE_DAMAGED",
  OFFICE_CLOSED: "OFFICE_CLOSED",
  AWAITING_AUTHORIZATION: "AWAITING_AUTHORIZATION",
  SEAL_BROKEN: "SEAL_BROKEN",
  OTHER: "OTHER",
} as const;
export type ExceptionCode = (typeof ExceptionCode)[keyof typeof ExceptionCode];

export const BranchType = {
  HEAD_OFFICE: "HEAD_OFFICE",
  CORPORATE_OFFICE: "CORPORATE_OFFICE",
  FACTORY: "FACTORY",
  BRANCH_OFFICE: "BRANCH_OFFICE",
  WAREHOUSE: "WAREHOUSE",
  PROJECT_SITE: "PROJECT_SITE",
} as const;
export type BranchType = (typeof BranchType)[keyof typeof BranchType];

export const LocationType = {
  SITE: "SITE",
  BUILDING: "BUILDING",
  FLOOR: "FLOOR",
  DEPARTMENT: "DEPARTMENT",
  DESK: "DESK",
  RECEPTION: "RECEPTION",
  GATE: "GATE",
  OFFICE: "OFFICE",
  EXTERNAL: "EXTERNAL",
} as const;
export type LocationType = (typeof LocationType)[keyof typeof LocationType];

export const AssignmentStatus = {
  ASSIGNED: "ASSIGNED",
  ACCEPTED: "ACCEPTED",
  IN_CUSTODY: "IN_CUSTODY",
  COMPLETED: "COMPLETED",
  REASSIGNED: "REASSIGNED",
  CANCELLED: "CANCELLED",
} as const;
export type AssignmentStatus = (typeof AssignmentStatus)[keyof typeof AssignmentStatus];

export const NotificationCategory = {
  ACTION_REQUIRED: "ACTION_REQUIRED",
  PARCEL_UPDATE: "PARCEL_UPDATE",
  SYSTEM: "SYSTEM",
} as const;
export type NotificationCategory = (typeof NotificationCategory)[keyof typeof NotificationCategory];

export const NotificationChannel = {
  IN_APP: "IN_APP",
  PUSH: "PUSH",
  SMS: "SMS",
  EMAIL: "EMAIL",
} as const;
export type NotificationChannel = (typeof NotificationChannel)[keyof typeof NotificationChannel];

/** Which clock an SLA rule measures. */
export const SlaStage = {
  PICKUP: "PICKUP",
  DELIVERY: "DELIVERY",
  RECEIPT: "RECEIPT",
  END_TO_END: "END_TO_END",
} as const;
export type SlaStage = (typeof SlaStage)[keyof typeof SlaStage];

export const SlaAudience = {
  CARRIER: "CARRIER",
  SENDER: "SENDER",
  RECEIVER: "RECEIVER",
  BRANCH_ADMIN: "BRANCH_ADMIN",
  DISPATCH_OFFICER: "DISPATCH_OFFICER",
  HEAD_OFFICE_ADMIN: "HEAD_OFFICE_ADMIN",
} as const;
export type SlaAudience = (typeof SlaAudience)[keyof typeof SlaAudience];

export const CourierProviderCode = {
  MANUAL: "MANUAL",
  PATHAO: "PATHAO",
  REDX: "REDX",
  STEADFAST: "STEADFAST",
  OTHER: "OTHER",
} as const;
export type CourierProviderCode = (typeof CourierProviderCode)[keyof typeof CourierProviderCode];

export const EmployeeStatus = {
  ACTIVE: "ACTIVE",
  ON_LEAVE: "ON_LEAVE",
  INACTIVE: "INACTIVE",
  TERMINATED: "TERMINATED",
} as const;
export type EmployeeStatus = (typeof EmployeeStatus)[keyof typeof EmployeeStatus];

export const OtpPurpose = {
  GUEST_LOGIN: "GUEST_LOGIN",
  GUEST_PHONE_VERIFY: "GUEST_PHONE_VERIFY",
  RECEIPT: "RECEIPT",
} as const;
export type OtpPurpose = (typeof OtpPurpose)[keyof typeof OtpPurpose];

/** Courier-provider statuses after normalisation. Each adapter maps its raw vocabulary onto these. */
export const ExternalStatus = {
  PENDING: "PENDING",
  PICKED_UP: "PICKED_UP",
  IN_TRANSIT: "IN_TRANSIT",
  OUT_FOR_DELIVERY: "OUT_FOR_DELIVERY",
  DELIVERED: "DELIVERED",
  FAILED: "FAILED",
  ON_HOLD: "ON_HOLD",
  RETURNING: "RETURNING",
  RETURNED: "RETURNED",
  CANCELLED: "CANCELLED",
} as const;
export type ExternalStatus = (typeof ExternalStatus)[keyof typeof ExternalStatus];
