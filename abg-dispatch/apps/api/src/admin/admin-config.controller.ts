import { Body, Controller, Get, HttpCode, Param, Patch, Post, Put, Query } from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import { Capability, EmployeeStatus, ROLE_LABEL, RoleCode } from "@abg-dispatch/shared";
import { PrismaService, isUniqueViolation } from "../common/prisma.service";
import { RequireCapability } from "../auth/decorators";
import { CurrentActor, type Actor } from "../common/actor";
import { badRequest, conflict, notFound } from "../common/errors";
import { parseCsv } from "../common/csv";
import { AuditService } from "../audit/audit.service";
import { normalizePhone } from "../notifications/sms.service";
import {
  BranchDto,
  CategoryDto,
  CourierProviderDto,
  CreateUserDto,
  DepartmentDto,
  EmployeeDto,
  EmployeeImportDto,
  LocationDto,
  ResetPasswordDto,
  SetRolesDto,
  SlaPolicyDto,
} from "./admin.dto";

const IMPORT_HEADERS = ["employee_id", "full_name", "phone", "email", "department_code", "designation", "branch_code", "status", "manager_employee_id"];

/**
 * Organisation configuration (Super Admin). Reference data is soft-deleted via
 * `active: false` so historical parcels keep pointing at real rows.
 */
@Controller("admin")
export class AdminConfigController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private async log(actor: Actor, action: string, objectType: string, objectId: string, summary: string, before?: unknown, after?: unknown) {
    await this.audit.record({ actor, action, objectType, objectId, summary, before, after });
  }

  private unique<T>(p: Promise<T>, what: string): Promise<T> {
    return p.catch((err) => {
      if (isUniqueViolation(err)) throw conflict("DUPLICATE", `A ${what} with that code already exists.`);
      throw err;
    });
  }

  // ── Branches & locations ──

  @RequireCapability(Capability.DASHBOARD_VIEW)
  @Get("branches")
  branches() {
    return this.prisma.branch.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { employees: true, locations: true, departments: true } } } });
  }

  @RequireCapability(Capability.CONFIG_MANAGE)
  @Post("branches")
  async createBranch(@CurrentActor() actor: Actor, @Body() dto: BranchDto) {
    const org = await this.prisma.organization.findFirstOrThrow();
    const branch = await this.unique(this.prisma.branch.create({ data: { ...dto, organizationId: org.id, phone: dto.phone ? normalizePhone(dto.phone) : null } }), "branch");
    await this.prisma.location.create({ data: { branchId: branch.id, type: "SITE", name: branch.name, path: branch.name } });
    await this.log(actor, "config.branch_created", "branch", branch.id, `Created ${branch.name} (${branch.code})`, undefined, dto);
    return branch;
  }

  @RequireCapability(Capability.CONFIG_MANAGE)
  @Patch("branches/:id")
  async updateBranch(@CurrentActor() actor: Actor, @Param("id") id: string, @Body() dto: Partial<BranchDto>) {
    const before = await this.prisma.branch.findUnique({ where: { id } });
    if (!before) throw notFound("Branch not found.");
    if (dto.code && dto.code !== before.code) throw badRequest("A branch code cannot change once tracking numbers use it.", "CODE_LOCKED");
    const after = await this.prisma.branch.update({ where: { id }, data: dto });
    await this.log(actor, "config.branch_updated", "branch", id, `Updated ${after.name}`, before, after);
    return after;
  }

  @RequireCapability(Capability.DASHBOARD_VIEW)
  @Get("locations")
  locations(@Query("branchId") branchId?: string) {
    return this.prisma.location.findMany({ where: { branchId }, orderBy: { path: "asc" } });
  }

  @RequireCapability(Capability.CONFIG_MANAGE)
  @Post("locations")
  async createLocation(@CurrentActor() actor: Actor, @Body() dto: LocationDto) {
    const parent = dto.parentId ? await this.prisma.location.findUnique({ where: { id: dto.parentId } }) : null;
    if (dto.parentId && (!parent || parent.branchId !== dto.branchId)) throw badRequest("The parent location must be in the same office.");
    const branch = await this.prisma.branch.findUniqueOrThrow({ where: { id: dto.branchId } });
    const path = `${parent ? parent.path : branch.name} › ${dto.name}`;
    const loc = await this.prisma.location.create({ data: { ...dto, path } });
    await this.log(actor, "config.location_created", "location", loc.id, `Created ${path}`);
    return loc;
  }

  @RequireCapability(Capability.CONFIG_MANAGE)
  @Patch("locations/:id")
  async updateLocation(@CurrentActor() actor: Actor, @Param("id") id: string, @Body() dto: Partial<LocationDto>) {
    const before = await this.prisma.location.findUnique({ where: { id } });
    if (!before) throw notFound("Location not found.");
    const name = dto.name ?? before.name;
    const path = before.path.split(" › ").slice(0, -1).concat(name).join(" › ") || name;
    const after = await this.prisma.location.update({ where: { id }, data: { name, type: dto.type, code: dto.code, active: dto.active, path } });
    await this.log(actor, "config.location_updated", "location", id, `Updated ${after.path}`, before, after);
    return after;
  }

  // ── Departments & categories ──

  @RequireCapability(Capability.DASHBOARD_VIEW)
  @Get("departments")
  departments() {
    return this.prisma.department.findMany({ include: { branch: { select: { name: true, code: true } }, location: { select: { path: true } }, _count: { select: { employees: true } } }, orderBy: [{ branchId: "asc" }, { name: "asc" }] });
  }

  @RequireCapability(Capability.CONFIG_MANAGE)
  @Post("departments")
  async createDepartment(@CurrentActor() actor: Actor, @Body() dto: DepartmentDto) {
    const dep = await this.unique(this.prisma.department.create({ data: dto }), "department");
    await this.log(actor, "config.department_created", "department", dep.id, `Created ${dep.name}`);
    return dep;
  }

  @RequireCapability(Capability.CONFIG_MANAGE)
  @Patch("departments/:id")
  async updateDepartment(@CurrentActor() actor: Actor, @Param("id") id: string, @Body() dto: Partial<DepartmentDto>) {
    const before = await this.prisma.department.findUnique({ where: { id } });
    if (!before) throw notFound("Department not found.");
    const after = await this.prisma.department.update({ where: { id }, data: { name: dto.name, locationId: dto.locationId, active: dto.active } });
    await this.log(actor, "config.department_updated", "department", id, `Updated ${after.name}`, before, after);
    return after;
  }

  @RequireCapability(Capability.DASHBOARD_VIEW)
  @Get("categories")
  categories() {
    return this.prisma.parcelCategory.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], include: { _count: { select: { parcels: true } } } });
  }

  @RequireCapability(Capability.CONFIG_MANAGE)
  @Post("categories")
  async createCategory(@CurrentActor() actor: Actor, @Body() dto: CategoryDto) {
    const cat = await this.unique(this.prisma.parcelCategory.create({ data: dto }), "category");
    await this.log(actor, "config.category_created", "category", cat.id, `Created category ${cat.name}`);
    return cat;
  }

  @RequireCapability(Capability.CONFIG_MANAGE)
  @Patch("categories/:id")
  async updateCategory(@CurrentActor() actor: Actor, @Param("id") id: string, @Body() dto: Partial<CategoryDto>) {
    const before = await this.prisma.parcelCategory.findUnique({ where: { id } });
    if (!before) throw notFound("Category not found.");
    const after = await this.prisma.parcelCategory.update({ where: { id }, data: { name: dto.name, description: dto.description, sortOrder: dto.sortOrder, active: dto.active } });
    await this.log(actor, after.active ? "config.category_updated" : "config.category_archived", "category", id, `${after.active ? "Updated" : "Archived"} ${after.name}`, before, after);
    return after;
  }

  // ── Employees ──

  @RequireCapability(Capability.DASHBOARD_VIEW)
  @Get("employees")
  employees(@Query("q") q?: string, @Query("branchId") branchId?: string) {
    return this.prisma.employee.findMany({
      where: {
        branchId,
        ...(q ? { OR: [{ fullName: { contains: q, mode: "insensitive" } }, { employeeCode: { contains: q, mode: "insensitive" } }, { phone: { contains: q } }] } : {}),
      },
      include: {
        department: { select: { id: true, name: true } },
        branch: { select: { id: true, name: true, code: true } },
        user: { select: { id: true, email: true, active: true, lastLoginAt: true, roles: { select: { role: true, branchId: true } } } },
      },
      orderBy: { fullName: "asc" },
      take: 300,
    });
  }

  @RequireCapability(Capability.USERS_MANAGE)
  @Post("employees")
  async createEmployee(@CurrentActor() actor: Actor, @Body() dto: EmployeeDto) {
    const e = await this.unique(this.prisma.employee.create({ data: { ...dto, phone: dto.phone ? normalizePhone(dto.phone) : null } }), "employee");
    await this.log(actor, "directory.employee_created", "employee", e.id, `Added ${e.fullName} (${e.employeeCode})`);
    return e;
  }

  @RequireCapability(Capability.USERS_MANAGE)
  @Patch("employees/:id")
  async updateEmployee(@CurrentActor() actor: Actor, @Param("id") id: string, @Body() dto: Partial<EmployeeDto>) {
    const before = await this.prisma.employee.findUnique({ where: { id }, include: { user: true } });
    if (!before) throw notFound("Employee not found.");
    if (dto.employeeCode && dto.employeeCode !== before.employeeCode) throw badRequest("Employee IDs cannot change; they appear in custody records.", "CODE_LOCKED");
    const after = await this.prisma.employee.update({ where: { id }, data: { ...dto, phone: dto.phone ? normalizePhone(dto.phone) : undefined } });
    if (before.user && dto.status && dto.status !== EmployeeStatus.ACTIVE && dto.status !== EmployeeStatus.ON_LEAVE) {
      await this.revokeAll(before.user.id, `employee_${dto.status.toLowerCase()}`);
    }
    await this.log(actor, "directory.employee_updated", "employee", id, `Updated ${after.fullName}${dto.status ? ` → ${dto.status}` : ""}`, before, after);
    return after;
  }

  /**
   * CSV import from HR. Columns: employee_id, full_name, phone, email,
   * department_code, designation, branch_code, status, manager_employee_id.
   * Upserts by employee_id; rejects duplicates inside the file.
   */
  @RequireCapability(Capability.USERS_MANAGE)
  @HttpCode(200)
  @Post("employees/import")
  async importEmployees(@CurrentActor() actor: Actor, @Body() dto: EmployeeImportDto) {
    const rows = parseCsv(dto.csv);
    if (rows.length < 2) throw badRequest("The file has no employee rows.");
    const header = rows[0].map((h) => h.trim().toLowerCase());
    const missing = ["employee_id", "full_name", "branch_code"].filter((h) => !header.includes(h));
    if (missing.length) throw badRequest(`Missing column(s): ${missing.join(", ")}. Expected: ${IMPORT_HEADERS.join(", ")}.`, "IMPORT_HEADERS");
    const col = (row: string[], name: string) => (header.includes(name) ? (row[header.indexOf(name)] ?? "").trim() : "");
    const branches = new Map((await this.prisma.branch.findMany()).map((b) => [b.code, b]));
    const departments = await this.prisma.department.findMany();
    const seen = new Set<string>();
    const errors: { line: number; message: string }[] = [];
    let created = 0;
    let updated = 0;
    let valid = 0;
    const pendingManagers: { code: string; manager: string }[] = [];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const line = i + 1;
      const code = col(row, "employee_id").toUpperCase();
      if (!/^[A-Z]{2,5}-\d{3,6}$/.test(code)) {
        errors.push({ line, message: `Invalid employee_id "${code}"` });
        continue;
      }
      if (seen.has(code)) {
        errors.push({ line, message: `Duplicate employee_id ${code} in this file` });
        continue;
      }
      seen.add(code);
      const branch = branches.get(col(row, "branch_code").toUpperCase());
      if (!branch) {
        errors.push({ line, message: `Unknown branch_code "${col(row, "branch_code")}"` });
        continue;
      }
      const depCode = col(row, "department_code").toUpperCase();
      const department = depCode ? departments.find((d) => d.branchId === branch.id && d.code === depCode) : undefined;
      if (depCode && !department) {
        errors.push({ line, message: `Unknown department_code "${depCode}" for ${branch.code}` });
        continue;
      }
      const status = (col(row, "status") || "ACTIVE").toUpperCase();
      if (!Object.values(EmployeeStatus).includes(status as never)) {
        errors.push({ line, message: `Unknown status "${status}"` });
        continue;
      }
      const data = {
        fullName: col(row, "full_name"),
        phone: col(row, "phone") ? normalizePhone(col(row, "phone")) : null,
        email: col(row, "email") || null,
        designation: col(row, "designation") || null,
        branchId: branch.id,
        departmentId: department?.id ?? null,
        status,
      };
      if (!data.fullName) {
        errors.push({ line, message: "full_name is required" });
        continue;
      }
      if (col(row, "manager_employee_id")) pendingManagers.push({ code, manager: col(row, "manager_employee_id").toUpperCase() });
      valid++;
      if (dto.dryRun) continue;
      const existing = await this.prisma.employee.findUnique({ where: { employeeCode: code } });
      if (existing) {
        await this.prisma.employee.update({ where: { id: existing.id }, data });
        updated++;
      } else {
        await this.prisma.employee.create({ data: { ...data, employeeCode: code } });
        created++;
      }
    }
    if (!dto.dryRun) {
      for (const { code, manager } of pendingManagers) {
        const m = await this.prisma.employee.findUnique({ where: { employeeCode: manager } });
        if (m) await this.prisma.employee.update({ where: { employeeCode: code }, data: { managerId: m.id } });
        else errors.push({ line: 0, message: `Manager ${manager} for ${code} not found` });
      }
      await this.log(actor, "directory.employees_imported", "employee", "import", `Imported employees: ${created} created, ${updated} updated, ${errors.length} errors`);
    }
    return { dryRun: !!dto.dryRun, rows: rows.length - 1, created, updated, valid, errors };
  }

  // ── Users & roles ──

  @RequireCapability(Capability.USERS_MANAGE)
  @Get("users")
  async users(@Query("q") q?: string) {
    const rows = await this.prisma.user.findMany({
      where: q ? { OR: [{ displayName: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }, { employee: { employeeCode: { contains: q, mode: "insensitive" } } }] } : {},
      include: {
        roles: { include: { branch: { select: { id: true, name: true, code: true } } } },
        employee: { select: { employeeCode: true, designation: true, branch: { select: { name: true } }, department: { select: { name: true } }, status: true } },
        _count: { select: { sessions: { where: { revokedAt: null, expiresAt: { gt: new Date() } } } } },
      },
      orderBy: { displayName: "asc" },
    });
    return rows.map(({ passwordHash: _p, mfaSecret: _m, ...u }) => ({ ...u, mfaEnabled: !!u.mfaEnabledAt, activeSessions: u._count.sessions, roleLabels: u.roles.map((r) => ROLE_LABEL[r.role as RoleCode] ?? r.role) }));
  }

  @RequireCapability(Capability.USERS_MANAGE)
  @Post("users")
  async createUser(@CurrentActor() actor: Actor, @Body() dto: CreateUserDto) {
    const employee = await this.prisma.employee.findUnique({ where: { id: dto.employeeId }, include: { user: true } });
    if (!employee) throw notFound("Employee not found.");
    if (employee.user) throw conflict("DUPLICATE", `${employee.fullName} already has an account.`);
    if (!dto.roles.length) throw badRequest("Give the user at least one role.");
    const user = await this.unique(
      this.prisma.user.create({
        data: {
          email: dto.email.toLowerCase(),
          employeeId: employee.id,
          displayName: employee.fullName,
          passwordHash: await bcrypt.hash(dto.password, 10),
          roles: { create: dto.roles.map((r) => ({ role: r.role, branchId: r.branchId ?? null })) },
        },
      }),
      "user",
    );
    await this.log(actor, "users.created", "user", user.id, `Created account for ${employee.fullName}`, undefined, { roles: dto.roles });
    return { id: user.id };
  }

  @RequireCapability(Capability.USERS_MANAGE)
  @Put("users/:id/roles")
  async setRoles(@CurrentActor() actor: Actor, @Param("id") id: string, @Body() dto: SetRolesDto) {
    const user = await this.prisma.user.findUnique({ where: { id }, include: { roles: true } });
    if (!user) throw notFound("User not found.");
    if (actor.kind === "user" && actor.userId === id && !dto.roles.some((r) => r.role === RoleCode.SUPER_ADMIN) && user.roles.some((r) => r.role === RoleCode.SUPER_ADMIN)) {
      throw badRequest("You cannot remove your own Super Admin role.", "SELF_DEMOTION");
    }
    await this.prisma.$transaction([
      this.prisma.userRole.deleteMany({ where: { userId: id } }),
      this.prisma.userRole.createMany({ data: dto.roles.map((r) => ({ userId: id, role: r.role, branchId: r.branchId ?? null })), skipDuplicates: true }),
    ]);
    await this.log(actor, "users.roles_changed", "user", id, `Roles for ${user.displayName}: ${dto.roles.map((r) => r.role).join(", ")}`, { roles: user.roles.map((r) => ({ role: r.role, branchId: r.branchId })) }, { roles: dto.roles });
    return { ok: true };
  }

  private async revokeAll(userId: string, reason: string) {
    await this.prisma.userSession.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date(), revokedReason: reason } });
    await this.prisma.deviceToken.deleteMany({ where: { userId } });
  }

  @RequireCapability(Capability.USERS_MANAGE)
  @HttpCode(200)
  @Post("users/:id/deactivate")
  async deactivate(@CurrentActor() actor: Actor, @Param("id") id: string) {
    if (actor.kind === "user" && actor.userId === id) throw badRequest("You cannot deactivate your own account.");
    const user = await this.prisma.user.update({ where: { id }, data: { active: false } }).catch(() => null);
    if (!user) throw notFound("User not found.");
    await this.revokeAll(id, "deactivated");
    await this.log(actor, "users.deactivated", "user", id, `Deactivated ${user.displayName}; all sessions revoked`);
    return { ok: true };
  }

  @RequireCapability(Capability.USERS_MANAGE)
  @HttpCode(200)
  @Post("users/:id/activate")
  async activate(@CurrentActor() actor: Actor, @Param("id") id: string) {
    const user = await this.prisma.user.update({ where: { id }, data: { active: true, failedLoginCount: 0, lockedUntil: null } }).catch(() => null);
    if (!user) throw notFound("User not found.");
    await this.log(actor, "users.activated", "user", id, `Re-activated ${user.displayName}`);
    return { ok: true };
  }

  @RequireCapability(Capability.USERS_MANAGE)
  @HttpCode(200)
  @Post("users/:id/reset-password")
  async resetPassword(@CurrentActor() actor: Actor, @Param("id") id: string, @Body() dto: ResetPasswordDto) {
    const user = await this.prisma.user.update({ where: { id }, data: { passwordHash: await bcrypt.hash(dto.password, 10), failedLoginCount: 0, lockedUntil: null } }).catch(() => null);
    if (!user) throw notFound("User not found.");
    await this.revokeAll(id, "password_reset");
    await this.log(actor, "users.password_reset", "user", id, `Password reset for ${user.displayName}; sessions revoked`);
    return { ok: true };
  }

  @RequireCapability(Capability.USERS_MANAGE)
  @HttpCode(200)
  @Post("users/:id/revoke-sessions")
  async revokeSessions(@CurrentActor() actor: Actor, @Param("id") id: string) {
    await this.revokeAll(id, "revoked_by_admin");
    await this.log(actor, "users.sessions_revoked", "user", id, "All sessions revoked by administrator");
    return { ok: true };
  }

  // ── SLA policies ──

  @RequireCapability(Capability.DASHBOARD_VIEW)
  @Get("sla-policies")
  slaPolicies() {
    return this.prisma.slaPolicy.findMany({ orderBy: [{ stage: "asc" }, { thresholdMinutes: "asc" }], include: { _count: { select: { escalations: true } } } });
  }

  @RequireCapability(Capability.CONFIG_MANAGE)
  @Post("sla-policies")
  async createSla(@CurrentActor() actor: Actor, @Body() dto: SlaPolicyDto) {
    if (!dto.audience.length) throw badRequest("Choose who should be notified.");
    const p = await this.prisma.slaPolicy.create({ data: dto });
    await this.log(actor, "config.sla_created", "sla_policy", p.id, `Created SLA rule "${p.name}"`, undefined, dto);
    return p;
  }

  @RequireCapability(Capability.CONFIG_MANAGE)
  @Patch("sla-policies/:id")
  async updateSla(@CurrentActor() actor: Actor, @Param("id") id: string, @Body() dto: Partial<SlaPolicyDto>) {
    const before = await this.prisma.slaPolicy.findUnique({ where: { id } });
    if (!before) throw notFound("SLA rule not found.");
    const after = await this.prisma.slaPolicy.update({ where: { id }, data: dto });
    await this.log(actor, "config.sla_updated", "sla_policy", id, `Updated SLA rule "${after.name}"`, before, after);
    return after;
  }

  // ── Courier providers ──

  @RequireCapability(Capability.DASHBOARD_VIEW)
  @Get("courier-providers")
  providers() {
    return this.prisma.courierProvider.findMany({ orderBy: { name: "asc" } });
  }

  @RequireCapability(Capability.INTEGRATIONS_MANAGE)
  @Patch("courier-providers/:id")
  async updateProvider(@CurrentActor() actor: Actor, @Param("id") id: string, @Body() dto: CourierProviderDto) {
    const before = await this.prisma.courierProvider.findUnique({ where: { id } });
    if (!before) throw notFound("Courier provider not found.");
    for (const key of Object.keys(dto.config ?? {})) {
      if (/secret|token|key|password/i.test(key)) throw badRequest("Secrets belong in environment variables, not provider settings.", "SECRET_IN_CONFIG");
    }
    const after = await this.prisma.courierProvider.update({ where: { id }, data: { ...dto, config: (dto.config ?? (before.config as object)) as object } });
    await this.log(actor, "integrations.provider_updated", "courier_provider", id, `Updated ${after.name}`, before, after);
    return after;
  }
}
