import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { Role } from "@bsc/shared";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";
import { RequestUser } from "../auth/current-user.decorator";
import { CreateDeskRecordDto } from "./desk.dto";

const MODULES = ["finance", "procurement", "hrm", "ticketing"] as const;
type DeskModule = (typeof MODULES)[number];
type DeskAction = "CHECK_IN" | "CHECK_OUT" | "APPROVE" | "REJECT";

const START: Record<DeskModule, string> = {
  finance: "DRAFT",
  procurement: "DRAFT",
  hrm: "DRAFT",
  ticketing: "OPEN",
};

const NEXT: Record<DeskModule, Record<string, string[]>> = {
  finance: { DRAFT: ["POSTED"], POSTED: ["REVERSED"], REVERSED: [] },
  procurement: { DRAFT: ["SUBMITTED"], SUBMITTED: ["APPROVED", "RETURNED"], RETURNED: ["SUBMITTED"], APPROVED: ["CLOSED"], CLOSED: [] },
  hrm: { DRAFT: ["ACTIVE"], ACTIVE: ["CLOSED"], CLOSED: [] },
  ticketing: { OPEN: ["ACTIVE"], ACTIVE: ["CLOSED"], CLOSED: [] },
};

const ATTENDANCE = new Set(["check-in-check-out", "attendance-tracking", "attendance-management"]);
const APPROVAL = new Set(["financial-approval", "purchase-approval", "approval-workflow", "leave-management"]);

function isModule(value: string): value is DeskModule {
  return (MODULES as readonly string[]).includes(value);
}

function asDetails(value: Prisma.JsonValue | null): Record<string, string | number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const details: Record<string, string | number> = {};
  for (const [key, item] of Object.entries(value)) {
    if (typeof item === "string" || typeof item === "number") details[key] = item;
  }
  return details;
}

function parseDetails(raw: string | undefined): Record<string, string | number> {
  if (!raw || raw.trim() === "") return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new BadRequestException("Feature details must be a JSON object");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new BadRequestException("Feature details must be a JSON object");
  }
  const entries = Object.entries(parsed);
  if (entries.length > 24) throw new BadRequestException("Too many feature fields");
  const details: Record<string, string | number> = {};
  for (const [key, value] of entries) {
    if (!/^[a-zA-Z][a-zA-Z0-9]{0,40}$/.test(key)) throw new BadRequestException("Invalid feature field");
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed) continue;
      if (trimmed.length > 240) throw new BadRequestException(`${key} is too long`);
      details[key] = trimmed;
    } else if (typeof value === "number" && Number.isFinite(value) && Math.abs(value) <= 1_000_000_000) {
      details[key] = value;
    } else {
      throw new BadRequestException(`${key} must be text or a number`);
    }
  }
  return details;
}

@Injectable()
export class DeskService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private assert(user: RequestUser, moduleKey: DeskModule, write: boolean) {
    if (user.role === Role.SUPER_ADMIN) return;
    if (!write && user.role === Role.READ_ONLY_EXECUTIVE) return;
    if (moduleKey === "finance" && user.role === Role.FINANCE_CONTROLLER) return;
    if (moduleKey === "ticketing" && (user.role === Role.TICKET_ADMINISTRATOR || user.role === Role.FINANCE_CONTROLLER || user.role === Role.GATE_SECURITY_OFFICER)) return;
    throw new ForbiddenException(`Role ${user.role} cannot ${write ? "update" : "view"} ${moduleKey}`);
  }

  private parseModule(moduleKey: string): DeskModule {
    if (!isModule(moduleKey)) throw new BadRequestException("Unknown module");
    return moduleKey;
  }

  private present(row: {
    amountBdt: Prisma.Decimal | null;
    details: Prisma.JsonValue;
    id: string;
    moduleKey: string;
    featureKey: string;
    reference: string;
    title: string;
    party: string;
    notes: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    createdById: string;
  }) {
    return { ...row, amountBdt: row.amountBdt == null ? null : Number(row.amountBdt), details: asDetails(row.details) };
  }

  private startStatus(module: DeskModule, featureKey: string) {
    if (ATTENDANCE.has(featureKey)) return "EXPECTED";
    if (APPROVAL.has(featureKey)) return "PENDING";
    return START[module];
  }

  async list(moduleKey: string, featureKey: string | undefined, user: RequestUser) {
    const module = this.parseModule(moduleKey);
    this.assert(user, module, false);
    const rows = await this.prisma.moduleDeskRecord.findMany({
      where: { moduleKey: module, featureKey: featureKey || undefined },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return rows.map((row) => this.present(row));
  }

  async create(moduleKey: string, dto: CreateDeskRecordDto, user: RequestUser) {
    const module = this.parseModule(moduleKey);
    this.assert(user, module, true);
    const details = parseDetails(dto.detailsJson);
    const prefix = { finance: "FIN", procurement: "PRC", hrm: "HRM", ticketing: "TKT" }[module];
    const reference = `${prefix}-${Date.now().toString(36).toUpperCase()}`;
    const created = await this.prisma.moduleDeskRecord.create({
      data: {
        moduleKey: module,
        featureKey: dto.featureKey,
        reference,
        title: dto.title.trim(),
        party: dto.party.trim(),
        notes: dto.notes?.trim() ?? "",
        amountBdt: dto.amountBdt == null ? null : new Prisma.Decimal(dto.amountBdt.toFixed(2)),
        details,
        status: this.startStatus(module, dto.featureKey),
        createdById: user.id,
      },
    });
    await this.audit.record({
      entityType: "ModuleDeskRecord",
      entityId: created.id,
      action: "CREATE",
      userId: user.id,
      after: { module, featureKey: dto.featureKey, reference, status: created.status },
    });
    return this.present(created);
  }

  async setStatus(moduleKey: string, id: string, status: string, user: RequestUser) {
    const module = this.parseModule(moduleKey);
    this.assert(user, module, true);
    const current = await this.prisma.moduleDeskRecord.findFirst({ where: { id, moduleKey: module } });
    if (!current) throw new NotFoundException("Record not found");
    if (ATTENDANCE.has(current.featureKey) || APPROVAL.has(current.featureKey)) {
      throw new BadRequestException("Use the feature action for this record");
    }
    const allowed = NEXT[module][current.status] ?? [];
    if (!allowed.includes(status)) throw new BadRequestException(`Cannot move ${current.status} to ${status}`);
    const updated = await this.prisma.moduleDeskRecord.update({ where: { id }, data: { status } });
    await this.audit.record({
      entityType: "ModuleDeskRecord",
      entityId: id,
      action: "SET_STATUS",
      userId: user.id,
      before: { status: current.status },
      after: { status },
    });
    return this.present(updated);
  }

  async act(moduleKey: string, id: string, action: DeskAction, user: RequestUser) {
    const module = this.parseModule(moduleKey);
    this.assert(user, module, true);
    const current = await this.prisma.moduleDeskRecord.findFirst({ where: { id, moduleKey: module } });
    if (!current) throw new NotFoundException("Record not found");
    const details = asDetails(current.details);
    let status = current.status;

    if (action === "CHECK_IN" || action === "CHECK_OUT") {
      if (!ATTENDANCE.has(current.featureKey)) throw new BadRequestException("This feature has no check-in");
      if (action === "CHECK_IN") {
        if (details.checkInAt) throw new BadRequestException("Already checked in");
        details.checkInAt = new Date().toISOString();
        status = "CHECKED_IN";
      } else {
        if (!details.checkInAt) throw new BadRequestException("Check in before check out");
        if (details.checkOutAt) throw new BadRequestException("Already checked out");
        details.checkOutAt = new Date().toISOString();
        status = "CHECKED_OUT";
      }
    } else {
      if (!APPROVAL.has(current.featureKey)) throw new BadRequestException("This feature has no approval");
      if (current.status !== "PENDING") throw new BadRequestException("This record is already decided");
      status = action === "APPROVE" ? "APPROVED" : "REJECTED";
    }

    const updated = await this.prisma.moduleDeskRecord.update({
      where: { id },
      data: { details, status },
    });
    await this.audit.record({
      entityType: "ModuleDeskRecord",
      entityId: id,
      action,
      userId: user.id,
      before: { status: current.status },
      after: { status, checkInAt: details.checkInAt ?? null, checkOutAt: details.checkOutAt ?? null },
    });
    return this.present(updated);
  }
}
