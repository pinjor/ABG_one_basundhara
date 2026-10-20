import { Prisma } from "@prisma/client";
import {
  CANCELLABLE_STATUSES,
  Capability,
  CarrierType,
  Classification,
  ContentAccess,
  IN_CUSTODY_STATUSES,
  ParcelStatus,
  REDACTED_DESCRIPTION,
  REDACTED_TITLE,
  ViewerRelation,
  canTransition,
  contentAccess,
  isTerminal,
  maskPhone,
  qrPayload,
} from "@abg-dispatch/shared";
import type { Actor } from "../common/actor";
import { ACCESS_SELECT, ParcelAccessService } from "./parcel-access.service";

const EMPLOYEE_CARD = {
  select: {
    id: true,
    employeeCode: true,
    fullName: true,
    designation: true,
    phone: true,
    photoUrl: true,
    department: { select: { id: true, name: true } },
    branch: { select: { id: true, name: true, code: true } },
  },
} as const;

export const PARCEL_INCLUDE = {
  category: { select: { id: true, code: true, name: true } },
  createdBy: { select: { id: true, displayName: true, employeeId: true } },
  senderEmployee: EMPLOYEE_CARD,
  senderDepartment: { select: { id: true, name: true } },
  originBranch: { select: { id: true, name: true, code: true, type: true } },
  originLocation: { select: { id: true, name: true, path: true } },
  receiverEmployee: EMPLOYEE_CARD,
  receiverDepartment: { select: { id: true, name: true, branchId: true } },
  destinationBranch: { select: { id: true, name: true, code: true, type: true } },
  destinationLocation: { select: { id: true, name: true, path: true } },
  actualReceiverEmployee: EMPLOYEE_CARD,
  currentAssignment: {
    include: {
      employee: EMPLOYEE_CARD,
      guestCarrier: { select: { id: true, fullName: true, phone: true, company: true, vehicleNumber: true, phoneVerifiedAt: true } },
      courierProvider: { select: { id: true, code: true, name: true } },
    },
  },
  assignments: ACCESS_SELECT.assignments,
} satisfies Prisma.ParcelInclude;

export type ParcelWithRelations = Prisma.ParcelGetPayload<{ include: typeof PARCEL_INCLUDE }>;

type EmployeeCard = NonNullable<ParcelWithRelations["senderEmployee"]>;

function person(e: EmployeeCard | null | undefined, showPhone: boolean) {
  if (!e) return null;
  return {
    id: e.id,
    employeeCode: e.employeeCode,
    fullName: e.fullName,
    designation: e.designation,
    phone: showPhone ? e.phone : maskPhone(e.phone),
    photoUrl: e.photoUrl,
    department: e.department,
    branch: e.branch,
  };
}

export const ParcelAction = {
  BOOK_DRAFT: "BOOK_DRAFT",
  ASSIGN_CARRIER: "ASSIGN_CARRIER",
  ACCEPT_ASSIGNMENT: "ACCEPT_ASSIGNMENT",
  REQUEST_HANDOVER: "REQUEST_HANDOVER",
  CONFIRM_HANDOVER_SENDER: "CONFIRM_HANDOVER_SENDER",
  CONFIRM_HANDOVER_PIN: "CONFIRM_HANDOVER_PIN",
  CONFIRM_HANDOVER_OFFICER: "CONFIRM_HANDOVER_OFFICER",
  START_TRANSIT: "START_TRANSIT",
  CHECKPOINT: "CHECKPOINT",
  MARK_ARRIVED: "MARK_ARRIVED",
  REQUEST_RECEIPT_CODE: "REQUEST_RECEIPT_CODE",
  RECEIVE: "RECEIVE",
  RECEIVE_ON_BEHALF: "RECEIVE_ON_BEHALF",
  RECEIVE_WITH_CODE: "RECEIVE_WITH_CODE",
  RECORD_EXCEPTION: "RECORD_EXCEPTION",
  RESOLVE_EXCEPTION: "RESOLVE_EXCEPTION",
  PUT_ON_HOLD: "PUT_ON_HOLD",
  CANCEL: "CANCEL",
  REQUEST_RETURN: "REQUEST_RETURN",
  START_RETURN: "START_RETURN",
  CONFIRM_RETURN: "CONFIRM_RETURN",
  COMMENT: "COMMENT",
  ATTACH: "ATTACH",
  CORRECT: "CORRECT",
  RESEND_NOTIFICATION: "RESEND_NOTIFICATION",
  UPDATE_SLA: "UPDATE_SLA",
  EXTERNAL_STATUS: "EXTERNAL_STATUS",
} as const;
export type ParcelAction = (typeof ParcelAction)[keyof typeof ParcelAction];

/**
 * What this viewer can do next. Computed server-side so the app shows exactly
 * the buttons the API will accept; the workflow service re-checks every one.
 */
export function availableActions(actor: Actor, p: ParcelWithRelations, access: ParcelAccessService, relation?: ViewerRelation | null): ParcelAction[] {
  const A = ParcelAction;
  if (relation === ViewerRelation.DESTINATION_COLLEAGUE) return [A.RECEIVE_ON_BEHALF];
  const status = p.status as ParcelStatus;
  const out: ParcelAction[] = [];
  const readOnly = actor.kind === "user" && actor.roles.length > 0 && actor.roles.every((r) => r === "AUDITOR");
  if (readOnly) return out;

  const sender = access.isSenderSide(actor, p);
  const receiver = access.isIntendedReceiver(actor, p);
  const carrier = access.isCurrentCarrier(actor, p);
  const ops = (cap: Capability) => access.hasOpsReach(actor, p, cap);
  const assignment = p.currentAssignment;
  const internalCarrier = assignment && assignment.carrierType !== CarrierType.EXTERNAL_COURIER;

  if (status === ParcelStatus.DRAFT && sender) out.push(A.BOOK_DRAFT);
  if (!isTerminal(status) && (ops(Capability.CARRIER_ASSIGN) || (sender && [ParcelStatus.DRAFT, ParcelStatus.BOOKED, ParcelStatus.AWAITING_PICKUP].includes(status as never)))) {
    out.push(A.ASSIGN_CARRIER);
  }
  if (carrier && assignment?.status === "ASSIGNED") out.push(A.ACCEPT_ASSIGNMENT);
  if (status === ParcelStatus.AWAITING_PICKUP && assignment) {
    if (carrier && internalCarrier) out.push(A.REQUEST_HANDOVER, A.CONFIRM_HANDOVER_PIN);
    if (sender) out.push(A.CONFIRM_HANDOVER_SENDER);
    if (access.hasOpsReachAt(actor, p.originBranchId, Capability.HANDOVER_OFFICER)) out.push(A.CONFIRM_HANDOVER_OFFICER);
  }
  const externalOps = assignment?.carrierType === CarrierType.EXTERNAL_COURIER && ops(Capability.EXTERNAL_STATUS_UPDATE);
  if (status === ParcelStatus.PICKED_UP && (carrier || externalOps)) out.push(A.START_TRANSIT);
  if ((carrier || externalOps) && [ParcelStatus.PICKED_UP, ParcelStatus.IN_TRANSIT].includes(status as never)) out.push(A.CHECKPOINT);
  const desk = access.hasOpsReachAt(actor, p.destinationBranchId, Capability.RECEIVE_AT_DESK);
  if ([ParcelStatus.PICKED_UP, ParcelStatus.IN_TRANSIT].includes(status as never) && (carrier || externalOps || desk)) {
    out.push(A.MARK_ARRIVED);
  }
  if (status === ParcelStatus.PENDING_RECEIPT) {
    if (receiver) out.push(A.RECEIVE);
    const canBehalf = p.classification !== Classification.HIGHLY_CONFIDENTIAL && actor.kind === "user" && !receiver && !!actor.employeeId;
    if (canBehalf && (desk || (actor.kind === "user" && actor.branchId === p.destinationBranchId))) {
      out.push(A.RECEIVE_ON_BEHALF);
    }
    if (carrier || desk) out.push(A.REQUEST_RECEIPT_CODE, A.RECEIVE_WITH_CODE);
  }
  if (!isTerminal(status) && (sender || receiver || carrier || ops(Capability.EXCEPTION_RECORD))) out.push(A.RECORD_EXCEPTION);
  if (p.hasOpenException && ops(Capability.EXCEPTION_RESOLVE)) out.push(A.RESOLVE_EXCEPTION);
  if (!isTerminal(status) && status !== ParcelStatus.ON_HOLD && canTransition(status, ParcelStatus.ON_HOLD) && ops(Capability.PARCEL_HOLD)) out.push(A.PUT_ON_HOLD);
  if (CANCELLABLE_STATUSES.includes(status) && (ops(Capability.PARCEL_CANCEL_ANY) || (sender && status !== ParcelStatus.ON_HOLD))) out.push(A.CANCEL);
  if (canTransition(status, ParcelStatus.RETURN_REQUESTED) && (sender || ops(Capability.PARCEL_RETURN_ANY))) out.push(A.REQUEST_RETURN);
  if (status === ParcelStatus.RETURN_REQUESTED && (carrier || externalOps || ops(Capability.PARCEL_RETURN_ANY))) out.push(A.START_RETURN);
  if (status === ParcelStatus.RETURN_IN_TRANSIT && (sender || access.hasOpsReachAt(actor, p.originBranchId, Capability.HANDOVER_OFFICER))) out.push(A.CONFIRM_RETURN);
  out.push(A.COMMENT);
  if (!isTerminal(status) || IN_CUSTODY_STATUSES.includes(status) || status === ParcelStatus.RECEIVED) out.push(A.ATTACH);
  if (ops(Capability.PARCEL_CORRECT)) out.push(A.CORRECT);
  if (ops(Capability.NOTIFY_RESEND) && !isTerminal(status)) out.push(A.RESEND_NOTIFICATION);
  if (ops(Capability.SLA_UPDATE) && !isTerminal(status)) out.push(A.UPDATE_SLA);
  if (externalOps && !isTerminal(status)) out.push(A.EXTERNAL_STATUS);
  return [...new Set(out)];
}

export function serializeParcel(actor: Actor, p: ParcelWithRelations, access: ParcelAccessService, qrBaseUrl: string, relationOverride?: ViewerRelation) {
  const relation = relationOverride ?? access.relation(actor, p) ?? ViewerRelation.CARRIER;
  const content: ContentAccess = contentAccess(relation, p.classification as Classification);
  const showPhones = relation !== ViewerRelation.AUDITOR;
  const sender = access.isSenderSide(actor, p);
  const carrier = access.isCurrentCarrier(actor, p);
  const opsViewer = [ViewerRelation.BRANCH_OPS, ViewerRelation.HEAD_OFFICE, ViewerRelation.SUPER_ADMIN].includes(relation as never);
  // The receiver never gets the QR token: scanning the physical label is their proof of possession.
  const canSeeQr = sender || carrier || opsViewer;
  const a = p.currentAssignment;

  return {
    id: p.id,
    trackingNumber: p.trackingNumber,
    qrPayload: canSeeQr ? qrPayload(qrBaseUrl, p.qrToken) : null,
    title: content === "REDACTED" ? REDACTED_TITLE : p.title,
    description: content === "FULL" ? p.description : content === "TITLE_ONLY" ? "Description hidden for this classification." : REDACTED_DESCRIPTION,
    contentAccess: content,
    category: p.category,
    classification: p.classification,
    priority: p.priority,
    status: p.status,
    deliveryMethod: p.deliveryMethod,
    createdBy: { id: p.createdBy.id, name: p.createdBy.displayName },
    sentOnBehalf: p.createdBy.employeeId !== p.senderEmployeeId,
    sender: person(p.senderEmployee, showPhones),
    senderDepartment: p.senderDepartment,
    origin: { branch: p.originBranch, location: p.originLocation },
    receiverType: p.receiverType,
    receiver: {
      employee: person(p.receiverEmployee, showPhones),
      department: p.receiverDepartment ? { id: p.receiverDepartment.id, name: p.receiverDepartment.name } : null,
      external: p.externalReceiverName
        ? {
            name: p.externalReceiverName,
            phone: showPhones ? p.externalReceiverPhone : maskPhone(p.externalReceiverPhone),
            organization: p.externalReceiverOrganization,
            address: p.externalReceiverAddress,
          }
        : null,
    },
    destination: { branch: p.destinationBranch, location: p.destinationLocation, address: p.externalReceiverAddress },
    carrier: a
      ? {
          assignmentId: a.id,
          type: a.carrierType,
          status: a.status,
          name: a.carrierNameSnapshot,
          code: a.carrierCodeSnapshot,
          phone: showPhones ? a.carrierPhoneSnapshot : maskPhone(a.carrierPhoneSnapshot),
          employee: a.employee ? person(a.employee, showPhones) : null,
          guest: a.guestCarrier
            ? { id: a.guestCarrier.id, company: a.guestCarrier.company, vehicleNumber: a.guestCarrier.vehicleNumber, phoneVerified: !!a.guestCarrier.phoneVerifiedAt }
            : null,
          provider: a.courierProvider,
          externalTrackingNumber: a.externalTrackingNumber,
          externalBookingReference: a.externalBookingReference,
          riderName: a.riderName,
          riderPhone: showPhones ? a.riderPhone : maskPhone(a.riderPhone),
          trackingUrl: a.trackingUrl,
          externalStatus: a.externalRawStatus,
          externalStatusAt: a.externalStatusAt,
          assignedAt: a.assignedAt,
          acceptedAt: a.acceptedAt,
          handoverRequestedAt: a.handoverRequestedAt,
          custodyStartedAt: a.custodyStartedAt,
        }
      : null,
    receipt: p.receivedAt
      ? {
          receivedAt: p.receivedAt,
          receivedBy: {
            name: p.actualReceiverName,
            employeeCode: p.actualReceiverCode,
            phone: showPhones ? p.actualReceiverPhone : maskPhone(p.actualReceiverPhone),
            employee: person(p.actualReceiverEmployee, showPhones),
          },
          onBehalf: p.receivedOnBehalf,
          onBehalfReason: p.onBehalfReason,
          onBehalfRelationship: p.onBehalfRelationship,
          verification: p.receiptVerification,
        }
      : null,
    milestones: {
      bookedAt: p.bookedAt,
      carrierAssignedAt: p.carrierAssignedAt,
      handedOverAt: p.handedOverAt,
      pickedUpAt: p.pickedUpAt,
      inTransitAt: p.inTransitAt,
      arrivedAt: p.arrivedAt,
      pendingReceiptAt: p.pendingReceiptAt,
      receivedAt: p.receivedAt,
      cancelledAt: p.cancelledAt,
      returnRequestedAt: p.returnRequestedAt,
      returnedAt: p.returnedAt,
    },
    statusChangedAt: p.statusChangedAt,
    expectedDeliveryAt: p.expectedDeliveryAt,
    isOverdue: p.isOverdue,
    overdueSince: p.overdueSince,
    hasOpenException: p.hasOpenException,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    viewer: {
      relation,
      isSender: sender,
      isReceiver: access.isIntendedReceiver(actor, p),
      isCurrentCarrier: carrier,
      actions: availableActions(actor, p, access, relation),
    },
  };
}

export type ParcelDto = ReturnType<typeof serializeParcel>;

/** Compact row for lists and dashboards. */
export function serializeParcelRow(actor: Actor, p: ParcelWithRelations, access: ParcelAccessService) {
  const content = access.contentAccess(actor, p);
  const a = p.currentAssignment;
  return {
    id: p.id,
    trackingNumber: p.trackingNumber,
    title: content === "REDACTED" ? REDACTED_TITLE : p.title,
    contentAccess: content,
    category: p.category.name,
    classification: p.classification,
    priority: p.priority,
    status: p.status,
    deliveryMethod: p.deliveryMethod,
    sender: { name: p.senderEmployee.fullName, employeeCode: p.senderEmployee.employeeCode },
    receiver: p.receiverEmployee
      ? { name: p.receiverEmployee.fullName, employeeCode: p.receiverEmployee.employeeCode }
      : p.receiverDepartment
        ? { name: p.receiverDepartment.name, employeeCode: null }
        : { name: p.externalReceiverName ?? p.destinationBranch?.name ?? "—", employeeCode: null },
    origin: p.originBranch.name,
    originCode: p.originBranch.code,
    destination: p.destinationBranch?.name ?? p.externalReceiverAddress ?? "External",
    destinationCode: p.destinationBranch?.code ?? null,
    carrier: a ? { type: a.carrierType, name: a.carrierNameSnapshot, provider: a.courierProvider?.name ?? null, externalTrackingNumber: a.externalTrackingNumber } : null,
    receivedBy: p.actualReceiverName,
    receivedOnBehalf: p.receivedOnBehalf,
    bookedAt: p.bookedAt,
    pickedUpAt: p.pickedUpAt,
    arrivedAt: p.arrivedAt,
    receivedAt: p.receivedAt,
    statusChangedAt: p.statusChangedAt,
    expectedDeliveryAt: p.expectedDeliveryAt,
    isOverdue: p.isOverdue,
    hasOpenException: p.hasOpenException,
    createdAt: p.createdAt,
    direction:
      actor.kind === "user" && actor.employeeId
        ? p.senderEmployeeId === actor.employeeId || p.createdById === actor.userId
          ? "OUTGOING"
          : access.isIntendedReceiver(actor, p) || p.actualReceiverEmployeeId === actor.employeeId
            ? "INCOMING"
            : access.isCurrentCarrier(actor, p) || p.assignments.some((x) => x.employeeId === actor.employeeId)
              ? "CARRYING"
              : "OTHER"
        : actor.kind === "guest"
          ? "CARRYING"
          : "OTHER",
  };
}
