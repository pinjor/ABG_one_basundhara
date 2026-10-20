import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { Capability, Classification, ParcelStatus, ReceiverType, RoleCode, ViewerRelation, contentAccess } from "@abg-dispatch/shared";
import { PrismaService } from "../common/prisma.service";
import { notFound, PARCEL_NOT_FOUND } from "../common/errors";
import type { Actor, UserActor } from "../common/actor";

const LIVE_ASSIGNMENT = ["ASSIGNED", "ACCEPTED", "IN_CUSTODY"];

/** The fields needed to decide who may see a parcel. */
export interface AccessFacts {
  id: string;
  status: string;
  classification: string;
  createdById: string;
  senderEmployeeId: string;
  receiverType: string;
  receiverEmployeeId: string | null;
  receiverDepartmentId: string | null;
  actualReceiverEmployeeId: string | null;
  originBranchId: string;
  destinationBranchId: string | null;
  currentAssignmentId: string | null;
  assignments: { id: string; employeeId: string | null; guestCarrierId: string | null; status: string }[];
}

export const ACCESS_SELECT = {
  id: true,
  status: true,
  classification: true,
  createdById: true,
  senderEmployeeId: true,
  receiverType: true,
  receiverEmployeeId: true,
  receiverDepartmentId: true,
  actualReceiverEmployeeId: true,
  originBranchId: true,
  destinationBranchId: true,
  currentAssignmentId: true,
  assignments: { select: { id: true, employeeId: true, guestCarrierId: true, status: true } },
} satisfies Prisma.ParcelSelect;

/**
 * Object-level authorisation (OWASP API1). Every endpoint that takes a parcel
 * id or token resolves the caller's relation to that specific parcel here; a
 * valid session alone is never enough.
 */
@Injectable()
export class ParcelAccessService {
  constructor(private readonly prisma: PrismaService) {}

  isParty(actor: UserActor, p: AccessFacts): boolean {
    if (p.createdById === actor.userId) return true;
    if (!actor.employeeId) return false;
    if (p.senderEmployeeId === actor.employeeId) return true;
    if (p.receiverEmployeeId === actor.employeeId || p.actualReceiverEmployeeId === actor.employeeId) return true;
    return p.receiverType === ReceiverType.DEPARTMENT && !!p.receiverDepartmentId && p.receiverDepartmentId === actor.departmentId;
  }

  isIntendedReceiver(actor: Actor, p: AccessFacts): boolean {
    if (actor.kind !== "user" || !actor.employeeId) return false;
    if (p.receiverEmployeeId === actor.employeeId) return true;
    return p.receiverType === ReceiverType.DEPARTMENT && !!p.receiverDepartmentId && p.receiverDepartmentId === actor.departmentId;
  }

  isSenderSide(actor: Actor, p: AccessFacts): boolean {
    return actor.kind === "user" && (p.createdById === actor.userId || (!!actor.employeeId && p.senderEmployeeId === actor.employeeId));
  }

  isCurrentCarrier(actor: Actor, p: AccessFacts): boolean {
    const current = p.assignments.find((a) => a.id === p.currentAssignmentId);
    if (!current || !LIVE_ASSIGNMENT.includes(current.status)) return false;
    if (actor.kind === "guest") return current.guestCarrierId === actor.guestCarrierId;
    return !!actor.employeeId && current.employeeId === actor.employeeId;
  }

  inBranchScope(actor: UserActor, ...branchIds: (string | null)[]): boolean {
    return branchIds.some((b) => !!b && actor.scopedBranchIds.includes(b));
  }

  /**
   * Ops reach at one end of the journey: pickup-side actions need the origin
   * office, receipt-side actions the destination office.
   */
  hasOpsReachAt(actor: Actor, branchId: string | null, cap: Capability): boolean {
    if (actor.kind !== "user" || !actor.capabilities.has(cap)) return false;
    if (actor.roles.includes(RoleCode.SUPER_ADMIN) || actor.roles.includes(RoleCode.HEAD_OFFICE_ADMIN)) return true;
    return this.inBranchScope(actor, branchId);
  }

  /** Ops reach: head office and super admins everywhere; branch roles in their branches. */
  hasOpsReach(actor: Actor, p: AccessFacts, cap: Capability): boolean {
    if (actor.kind !== "user" || !actor.capabilities.has(cap)) return false;
    if (actor.roles.includes(RoleCode.SUPER_ADMIN) || actor.roles.includes(RoleCode.HEAD_OFFICE_ADMIN)) return true;
    return this.inBranchScope(actor, p.originBranchId, p.destinationBranchId);
  }

  relation(actor: Actor, p: AccessFacts): ViewerRelation | null {
    if (actor.kind === "guest") {
      const live = p.assignments.some((a) => a.guestCarrierId === actor.guestCarrierId && LIVE_ASSIGNMENT.includes(a.status));
      return live ? ViewerRelation.CARRIER : null;
    }
    if (actor.roles.includes(RoleCode.SUPER_ADMIN)) return ViewerRelation.SUPER_ADMIN;
    if (this.isParty(actor, p)) return ViewerRelation.PARTY;
    if (actor.employeeId && p.assignments.some((a) => a.employeeId === actor.employeeId)) return ViewerRelation.CARRIER;
    if (actor.roles.includes(RoleCode.HEAD_OFFICE_ADMIN)) return ViewerRelation.HEAD_OFFICE;
    if (actor.roles.includes(RoleCode.AUDITOR)) return ViewerRelation.AUDITOR;
    if (actor.capabilities.has(Capability.PARCEL_VIEW_BRANCH) && this.inBranchScope(actor, p.originBranchId, p.destinationBranchId)) {
      return ViewerRelation.BRANCH_OPS;
    }
    return null;
  }

  /**
   * Receiving on someone's behalf by scanning the label: the scanner must be an
   * employee of the destination office, the parcel must be waiting for receipt,
   * and it must not be highly confidential. Possession of the label is checked
   * by the caller against the parcel's QR token.
   */
  colleagueMayReceive(actor: Actor, p: AccessFacts): boolean {
    return (
      actor.kind === "user" &&
      !!actor.employeeId &&
      !!p.destinationBranchId &&
      actor.branchId === p.destinationBranchId &&
      p.status === ParcelStatus.PENDING_RECEIPT &&
      p.classification !== Classification.HIGHLY_CONFIDENTIAL
    );
  }

  contentAccess(actor: Actor, p: AccessFacts) {
    const rel = this.relation(actor, p);
    return rel ? contentAccess(rel, p.classification as Classification) : "REDACTED";
  }

  /** Loads the facts and throws the same 404 whether the parcel is missing or merely not yours. */
  async assertView(actor: Actor, parcelId: string): Promise<{ facts: AccessFacts; relation: ViewerRelation }> {
    const facts = await this.prisma.parcel.findUnique({ where: { id: parcelId }, select: ACCESS_SELECT });
    if (!facts) throw notFound(PARCEL_NOT_FOUND);
    const relation = this.relation(actor, facts);
    if (!relation) throw notFound(PARCEL_NOT_FOUND);
    return { facts, relation };
  }

  /**
   * A Prisma filter equivalent to `relation() !== null`, for list queries.
   * Keep the two in step — test/authorization.test.ts compares them.
   */
  visibleWhere(actor: Actor): Prisma.ParcelWhereInput {
    if (actor.kind === "guest") {
      return { assignments: { some: { guestCarrierId: actor.guestCarrierId, status: { in: LIVE_ASSIGNMENT } } } };
    }
    if (actor.roles.some((r) => r === RoleCode.SUPER_ADMIN || r === RoleCode.HEAD_OFFICE_ADMIN || r === RoleCode.AUDITOR)) {
      return {};
    }
    const or: Prisma.ParcelWhereInput[] = [{ createdById: actor.userId }];
    if (actor.employeeId) {
      or.push(
        { senderEmployeeId: actor.employeeId },
        { receiverEmployeeId: actor.employeeId },
        { actualReceiverEmployeeId: actor.employeeId },
        { assignments: { some: { employeeId: actor.employeeId } } },
      );
      if (actor.departmentId) or.push({ receiverType: ReceiverType.DEPARTMENT, receiverDepartmentId: actor.departmentId });
    }
    if (actor.capabilities.has(Capability.PARCEL_VIEW_BRANCH) && actor.scopedBranchIds.length) {
      or.push({ originBranchId: { in: actor.scopedBranchIds } }, { destinationBranchId: { in: actor.scopedBranchIds } });
    }
    return { OR: or };
  }

  /**
   * Text search must not reveal what a viewer cannot read: title matches only
   * count on parcels whose title the viewer may see, description matches only
   * where they may see the description.
   */
  searchWhere(actor: Actor, q: string): Prisma.ParcelWhereInput {
    const text = { contains: q, mode: "insensitive" as const };
    const fullReader = actor.kind === "user" && actor.roles.some((r) => r === RoleCode.SUPER_ADMIN || r === RoleCode.AUDITOR);
    const partyWhere: Prisma.ParcelWhereInput =
      actor.kind === "user"
        ? {
            OR: [
              { createdById: actor.userId },
              ...(actor.employeeId
                ? [{ senderEmployeeId: actor.employeeId }, { receiverEmployeeId: actor.employeeId }, { actualReceiverEmployeeId: actor.employeeId }]
                : []),
            ],
          }
        : { id: "__none__" };
    const headOffice = actor.kind === "user" && actor.roles.includes(RoleCode.HEAD_OFFICE_ADMIN);
    const titleVisible: Prisma.ParcelWhereInput = fullReader
      ? {}
      : { OR: [{ classification: { not: Classification.HIGHLY_CONFIDENTIAL } }, partyWhere] };
    const descriptionVisible: Prisma.ParcelWhereInput = fullReader
      ? {}
      : {
          OR: [
            { classification: { in: headOffice ? [Classification.NORMAL, Classification.INTERNAL, Classification.CONFIDENTIAL] : [Classification.NORMAL, Classification.INTERNAL] } },
            partyWhere,
          ],
        };
    return {
      OR: [
        { trackingNumber: text },
        { AND: [{ title: text }, titleVisible] },
        { AND: [{ description: text }, descriptionVisible] },
        { senderEmployee: { OR: [{ fullName: text }, { employeeCode: text }, { phone: text }] } },
        { receiverEmployee: { OR: [{ fullName: text }, { employeeCode: text }, { phone: text }] } },
        { externalReceiverName: text },
        { actualReceiverName: text },
        { assignments: { some: { OR: [{ carrierNameSnapshot: text }, { carrierPhoneSnapshot: text }, { externalTrackingNumber: text }] } } },
      ],
    };
  }
}
