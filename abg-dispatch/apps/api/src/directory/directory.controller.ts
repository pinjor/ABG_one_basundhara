import { Controller, Get, Query } from "@nestjs/common";
import { IsOptional, IsString, IsUUID, MaxLength } from "class-validator";
import { Capability, maskPhone } from "@abg-dispatch/shared";
import { PrismaService } from "../common/prisma.service";
import { CurrentActor, type Actor } from "../common/actor";
import { forbidden } from "../common/errors";

class SearchQuery {
  @IsOptional() @IsString() @MaxLength(80) q?: string;
  @IsOptional() @IsUUID() branchId?: string;
  @IsOptional() @IsUUID() departmentId?: string;
}

/**
 * Reference data for pickers: people, places, categories, couriers. Employees
 * see masked phone numbers for colleagues; operations roles see the full number.
 */
@Controller("directory")
export class DirectoryController {
  constructor(private readonly prisma: PrismaService) {}

  private user(actor: Actor) {
    if (actor.kind !== "user") throw forbidden("Guest carriers cannot browse the directory.", "GUEST_RESTRICTED");
    return actor;
  }

  @Get("employees")
  async employees(@CurrentActor() actor: Actor, @Query() q: SearchQuery) {
    const me = this.user(actor);
    const fullPhones = me.capabilities.has(Capability.PARCEL_VIEW_BRANCH) || me.capabilities.has(Capability.PARCEL_VIEW_ALL);
    const text = q.q?.trim();
    const rows = await this.prisma.employee.findMany({
      where: {
        status: "ACTIVE",
        branchId: q.branchId,
        departmentId: q.departmentId,
        ...(text
          ? {
              OR: [
                { fullName: { contains: text, mode: "insensitive" } },
                { employeeCode: { contains: text, mode: "insensitive" } },
                { phone: { contains: text.replace(/\D/g, "") || text } },
                { designation: { contains: text, mode: "insensitive" } },
                { department: { name: { contains: text, mode: "insensitive" } } },
                { branch: { name: { contains: text, mode: "insensitive" } } },
              ],
            }
          : {}),
      },
      include: {
        department: { select: { id: true, name: true } },
        branch: { select: { id: true, name: true, code: true } },
        defaultLocation: { select: { id: true, name: true, path: true } },
        user: { select: { id: true, active: true } },
      },
      orderBy: { fullName: "asc" },
      take: 25,
    });
    return rows.map((e) => ({
      id: e.id,
      employeeCode: e.employeeCode,
      fullName: e.fullName,
      designation: e.designation,
      phone: fullPhones ? e.phone : maskPhone(e.phone),
      photoUrl: e.photoUrl,
      department: e.department,
      branch: e.branch,
      defaultLocation: e.defaultLocation,
      isMe: e.id === me.employeeId,
      /** Can sign in, so can approve requests and receive notifications. */
      hasAccount: !!e.user?.active,
      /** Their account, when they can sign in (audit action owners, appointment hosts are users). */
      userId: e.user?.active ? e.user.id : null,
    }));
  }

  @Get("branches")
  async branches(@CurrentActor() actor: Actor) {
    this.user(actor);
    return this.prisma.branch.findMany({ where: { active: true }, select: { id: true, name: true, code: true, type: true, city: true }, orderBy: { name: "asc" } });
  }

  @Get("locations")
  async locations(@CurrentActor() actor: Actor, @Query() q: SearchQuery) {
    this.user(actor);
    return this.prisma.location.findMany({
      where: { active: true, branchId: q.branchId, ...(q.q ? { path: { contains: q.q, mode: "insensitive" } } : {}) },
      select: { id: true, name: true, path: true, type: true, branchId: true, parentId: true },
      orderBy: { path: "asc" },
      take: 200,
    });
  }

  @Get("departments")
  async departments(@CurrentActor() actor: Actor, @Query() q: SearchQuery) {
    this.user(actor);
    return this.prisma.department.findMany({
      where: { active: true, branchId: q.branchId },
      select: { id: true, name: true, code: true, branchId: true, branch: { select: { name: true, code: true } }, locationId: true },
      orderBy: [{ branch: { name: "asc" } }, { name: "asc" }],
    });
  }

  @Get("categories")
  async categories(@CurrentActor() actor: Actor) {
    this.user(actor);
    return this.prisma.parcelCategory.findMany({ where: { active: true }, select: { id: true, code: true, name: true, description: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
  }

  @Get("courier-providers")
  async providers(@CurrentActor() actor: Actor) {
    this.user(actor);
    return this.prisma.courierProvider.findMany({ where: { enabled: true }, select: { id: true, code: true, name: true, apiEnabled: true }, orderBy: { name: "asc" } });
  }
}
