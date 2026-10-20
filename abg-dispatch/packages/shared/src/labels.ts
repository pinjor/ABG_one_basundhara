import {
  CarrierType,
  Classification,
  EventType,
  ExceptionCode,
  ParcelStatus,
  Priority,
  RoleCode,
  VerificationMethod,
} from "./enums";

export type StatusTone = "active" | "pending" | "success" | "danger" | "neutral";

/** One vocabulary for every screen. Do not invent synonyms in the UI. */
export const STATUS_LABEL: Record<ParcelStatus, string> = {
  DRAFT: "Draft",
  BOOKED: "Booked",
  AWAITING_PICKUP: "Awaiting Pickup",
  PICKED_UP: "Picked Up",
  IN_TRANSIT: "In Transit",
  ARRIVED_AT_DESTINATION: "Arrived",
  PENDING_RECEIPT: "Pending Receipt",
  RECEIVED: "Received",
  ON_HOLD: "On Hold",
  DELIVERY_EXCEPTION: "Exception",
  DELIVERY_FAILED: "Delivery Failed",
  RETURN_REQUESTED: "Return Requested",
  RETURN_IN_TRANSIT: "Return In Transit",
  RETURNED: "Returned",
  CANCELLED: "Cancelled",
};

export const STATUS_TONE: Record<ParcelStatus, StatusTone> = {
  DRAFT: "neutral",
  BOOKED: "pending",
  AWAITING_PICKUP: "pending",
  PICKED_UP: "active",
  IN_TRANSIT: "active",
  ARRIVED_AT_DESTINATION: "pending",
  PENDING_RECEIPT: "pending",
  RECEIVED: "success",
  ON_HOLD: "danger",
  DELIVERY_EXCEPTION: "danger",
  DELIVERY_FAILED: "danger",
  RETURN_REQUESTED: "danger",
  RETURN_IN_TRANSIT: "active",
  RETURNED: "neutral",
  CANCELLED: "neutral",
};

export const EVENT_LABEL: Record<EventType, string> = {
  PARCEL_CREATED: "Parcel Created",
  PARCEL_BOOKED: "Parcel Booked",
  CARRIER_ASSIGNED: "Courier Assigned",
  CARRIER_ACCEPTED: "Assignment Accepted",
  CARRIER_REASSIGNED: "Courier Reassigned",
  HANDOVER_REQUESTED: "Handover Requested",
  HANDOVER_CONFIRMED: "Handover Confirmed",
  PICKED_UP: "Picked Up",
  IN_TRANSIT: "In Transit",
  CHECKPOINT: "Checkpoint",
  ARRIVED_AT_DESTINATION: "Arrived at Destination",
  PENDING_RECEIPT: "Pending Receipt",
  RECEIPT_OTP_SENT: "Receipt Code Sent",
  RECEIVED: "Received",
  EXCEPTION_RECORDED: "Exception Recorded",
  EXCEPTION_RESOLVED: "Exception Resolved",
  PUT_ON_HOLD: "Put On Hold",
  RELEASED_FROM_HOLD: "Released From Hold",
  DELIVERY_FAILED: "Delivery Failed",
  RETURN_REQUESTED: "Return Requested",
  RETURN_IN_TRANSIT: "Return In Transit",
  RETURNED: "Returned to Sender",
  CANCELLED: "Cancelled",
  NOTE_ADDED: "Note Added",
  ATTACHMENT_ADDED: "Attachment Added",
  CORRECTION_ADDED: "Correction Added",
  EXPECTED_DELIVERY_CHANGED: "Expected Delivery Changed",
  SLA_REMINDER: "Reminder Sent",
  SLA_ESCALATED: "Escalated",
  EXTERNAL_STATUS_UPDATE: "Courier Status Update",
  NOTIFICATION_RESENT: "Notification Resent",
};

export const PRIORITY_LABEL: Record<Priority, string> = {
  NORMAL: "Normal",
  PRIORITY: "Priority",
  URGENT: "Urgent",
  CRITICAL: "Critical",
};

export const CLASSIFICATION_LABEL: Record<Classification, string> = {
  NORMAL: "Normal",
  INTERNAL: "Internal",
  CONFIDENTIAL: "Confidential",
  HIGHLY_CONFIDENTIAL: "Highly Confidential",
};

export const CARRIER_TYPE_LABEL: Record<CarrierType, string> = {
  INTERNAL_EMPLOYEE: "Employee Courier",
  EXTERNAL_COURIER: "External Courier",
  GUEST_PERSON: "Guest Carrier",
};

export const ROLE_LABEL: Record<RoleCode, string> = {
  EMPLOYEE: "Employee",
  SENDER: "Sender",
  RECEIVER: "Receiver",
  COURIER_RUNNER: "Courier / Runner",
  DISPATCH_OFFICER: "Dispatch Officer",
  BRANCH_ADMIN: "Branch Admin",
  HEAD_OFFICE_ADMIN: "Head Office Admin",
  AUDITOR: "Auditor",
  SUPER_ADMIN: "Super Admin",
};

export const VERIFICATION_LABEL: Record<VerificationMethod, string> = {
  NONE: "Not verified",
  SENDER_APP: "Sender approved in app",
  SENDER_PIN: "Sender handover PIN",
  DISPATCH_OFFICER: "Dispatch officer confirmation",
  APP_CONFIRMATION: "Receiver confirmed in app",
  QR_CONFIRMATION: "Receiver scanned QR",
  OTP: "One-time code verified",
  SIGNATURE: "Signature",
  PHOTO: "Photo evidence",
  EXTERNAL_PROVIDER: "Courier provider scan",
  ADMIN_OVERRIDE: "Administrator override",
};

export const EXCEPTION_LABEL: Record<ExceptionCode, string> = {
  RECEIVER_UNAVAILABLE: "Receiver unavailable",
  WRONG_DESTINATION: "Wrong destination",
  ADDRESS_CLARIFICATION: "Address clarification required",
  COURIER_CHANGED: "Courier changed",
  PACKAGE_DAMAGED: "Package damaged",
  OFFICE_CLOSED: "Office closed",
  AWAITING_AUTHORIZATION: "Waiting for authorization",
  SEAL_BROKEN: "Seal broken",
  OTHER: "Other",
};
