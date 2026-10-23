import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import {
  APPOINTMENT_LIMITS,
  APPOINTMENT_PURPOSE_LABEL,
  APPOINTMENT_STATUS_LABEL,
  AppointmentAction,
  AppointmentStatus,
  AppointmentUpdateType,
  CLOSED_APPOINTMENT_STATUSES,
  Capability,
  MEETING_MODE_LABEL,
  NotificationCategory,
  OPEN_APPOINTMENT_STATUSES,
  READ_ONLY_ROLES,
  RoleCode,
  appointmentWindow,
  canAppointmentTransition,
  formatAppointmentNumber,
  withinMeetingHours,
  type AppointmentPurpose,
  type MeetingMode,
} from "@abg-dispatch/shared";
import { PrismaService, type Tx } from "../common/prisma.service";
import type { UserActor } from "../common/actor";
import { badRequest, conflict, forbidden, notFound } from "../common/errors";
import { clampLimit, decodeCursor, encodeCursor } from "../common/pagination";
import { dhakaYear, nextSequence } from "../common/sequence";
import { dhakaDay, dhakaDayRange } from "../common/time";
import { NotificationService, type Draft } from "../notifications/notification.service";
import type { ConfirmAppointmentDto, CreateAppointmentDto, DeskQuery, DiaryQuery, HostsQuery, MyAppointmentsQuery, ProposeAppointmentDto } from "./appointments.dto";

export const APPOINTMENT_NOT_FOUND = "Appointment not found, or you do not have access to it.";
const STATE_CONFLICT = "APPOINTMENT_STATE_CONFLICT";
const MODULE = "appointments";
const MAX_DIARY_DAYS = 42;

const PERSON = {
  select: {
    id: true,
    displayName: true,
    active: true,
    roles: { select: { role: true } },
    employee: { select: { designation: true, phone: true, department: { select: { name: true } }, defaultLocation: { select: { name: true } }, branch: { select: { code: true, name: true } } } },
  },
} as const;

const INCLUDE = {
  requester: PERSON,
  host: PERSON,
  branch: { select: { id: true, name: true, code: true } },
  updates: { orderBy: [{ createdAt: "asc" as const }, { id: "asc" as const }] },
} satisfies Prisma.AppointmentInclude;

const ROW_INCLUDE = {
  requester: { select: { displayName: true, employee: { select: { designation: true, department: { select: { name: true } } } } } },
  host: { select: { id: true, displayName: true, employee: { select: { designation: true } } } },
  branch: { select: { id: true, name: true, code: true } },
} satisfies Prisma.AppointmentInclude;

type AppointmentFull = Prisma.AppointmentGetPayload<{ include: typeof INCLUDE }>;
type AppointmentRow = Prisma.AppointmentGetPayload<{ include: typeof ROW_INCLUDE }>;
type LockedRow = { status: string; hostUserId: string; durationMinutes: number; preferredAt: Date; scheduledAt: Date | null; referenceNumber: string };

interface Relation {
  isRequester: boolean;
  /** The person asked. */
  isHost: boolean;
  /** The executive office answering for the MD or the Chairman. */
  isOffice: boolean;
}

const when = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Dhaka", weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true });
/** "Mon 2 Nov, 11:00 am". */
export function meetingTime(d: Date): string {
  return when.format(d).replace(",", "");
}

function isReadOnly(actor: UserActor): boolean {
  return actor.roles.length > 0 && actor.roles.every((r) => READ_ONLY_ROLES.includes(r));
}

function violates(e: unknown, constraint: string): boolean {
  return e instanceof Error && e.message.includes(constraint);
}

const isExecutive = (u: { roles: { role: string }[] }) => u.roles.some((r) => r.role === RoleCode.EXECUTIVE);

/**
 * Requests for appointment. An employee asks the MD, the Chairman or a head
 * of department for a meeting; the person asked — or the executive office for
 * the MD and the Chairman — confirms it, proposes another time or declines. A
 * host is never in two confirmed meetings at once (checked here, and by the
 * database). Every step is history, and the other side is told.
 */
@Injectable()
export class AppointmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationService,
  ) {}

  // ── Access ──

  private relation(actor: UserActor, a: { requesterUserId: string; hostUserId: string; host: { roles: { role: string }[] } }): Relation {
    return {
      isRequester: a.requesterUserId === actor.userId,
      isHost: a.hostUserId === actor.userId,
      isOffice: actor.capabilities.has(Capability.APPOINTMENT_MANAGE) && isExecutive(a.host) && a.hostUserId !== actor.userId,
    };
  }

  private async load(actor: UserActor, id: string): Promise<{ appt: AppointmentFull; rel: Relation }> {
    const appt = await this.prisma.appointment.findUnique({ where: { id }, include: INCLUDE });
    if (!appt) throw notFound(APPOINTMENT_NOT_FOUND, "APPOINTMENT_NOT_FOUND");
    const rel = this.relation(actor, appt);
    if (!rel.isRequester && !rel.isHost && !rel.isOffice) throw notFound(APPOINTMENT_NOT_FOUND, "APPOINTMENT_NOT_FOUND");
    return { appt, rel };
  }

  /** Appointments the caller answers for: as the person asked, or (executive office) for the MD and the Chairman. */
  private async deskWhere(actor: UserActor, hostUserId?: string): Promise<Prisma.AppointmentWhereInput> {
    const sides: Prisma.AppointmentWhereInput[] = [{ hostUserId: actor.userId }];
    if (actor.capabilities.has(Capability.APPOINTMENT_MANAGE)) sides.push({ host: { roles: { some: { role: RoleCode.EXECUTIVE } } } });
    return { AND: [{ OR: sides }, hostUserId ? { hostUserId } : {}] };
  }

  /** People one can ask for a meeting: the MD and the Chairman first, then heads of department, then everyone else who can sign in. */
  async hosts(actor: UserActor, q: HostsQuery) {
    const text = q.q?.trim();
    const users = await this.prisma.user.findMany({
      where: {
        active: true,
        id: { not: actor.userId },
        employee: { status: "ACTIVE" },
        roles: { none: { role: { in: [...READ_ONLY_ROLES] } } },
        ...(text
          ? {
              OR: [
                { displayName: { contains: text, mode: "insensitive" } },
                { employee: { designation: { contains: text, mode: "insensitive" } } },
                { employee: { department: { name: { contains: text, mode: "insensitive" } } } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        displayName: true,
        roles: { select: { role: true } },
        employee: { select: { designation: true, department: { select: { name: true } }, branch: { select: { code: true } }, _count: { select: { reports: true } } } },
      },
      take: 200,
    });
    const rank = (u: (typeof users)[number]) => (isExecutive(u) ? 0 : (u.employee?._count.reports ?? 0) > 0 ? 1 : 2);
    const rows = users
      .filter((u) => text || rank(u) < 2)
      .sort((a, b) => rank(a) - rank(b) || a.displayName.localeCompare(b.displayName))
      .slice(0, 30);
    return {
      items: rows.map((u) => ({
        userId: u.id,
        name: u.displayName,
        designation: u.employee?.designation ?? null,
        department: u.employee?.department?.name ?? null,
        office: u.employee?.branch.code ?? null,
        executive: isExecutive(u),
        headOfDepartment: (u.employee?._count.reports ?? 0) > 0,
      })),
    };
  }

  // ── Asking ──

  private checkTime(at: Date, durationMinutes: number, label: string, now = new Date()) {
    const L = APPOINTMENT_LIMITS;
    if (Number.isNaN(at.getTime())) throw badRequest(`Enter a real date and time for the ${label}.`, "TIME_INVALID");
    if (at.getTime() < now.getTime() + L.minLeadMinutes * 60_000) throw badRequest(`The ${label} must be at least ${L.minLeadMinutes} minutes from now.`, "TIME_IN_PAST");
    if (at.getTime() > now.getTime() + L.maxLeadDays * 86_400_000) throw badRequest(`Meetings can be asked for at most ${L.maxLeadDays} days ahead.`, "TIME_TOO_FAR");
    if (!withinMeetingHours(at, durationMinutes)) {
      throw badRequest(`Meetings are between ${L.dayStartHour}:00 and ${L.dayEndHour}:00 (Dhaka time) — the ${label} falls outside them.`, "OUTSIDE_MEETING_HOURS");
    }
  }

  async create(actor: UserActor, dto: CreateAppointmentDto) {
    if (!actor.employeeId || !actor.branchId) throw badRequest("Only employees with a staff record can ask for appointments.", "EMPLOYEE_REQUIRED");
    if (dto.hostUserId === actor.userId) throw badRequest("You cannot book a meeting with yourself.", "HOST_SELF");
    const host = await this.prisma.user.findUnique({ where: { id: dto.hostUserId }, select: { id: true, displayName: true, active: true, roles: { select: { role: true } }, employee: { select: { status: true } } } });
    if (!host || !host.active || host.employee?.status !== "ACTIVE") throw badRequest("Choose an active colleague who can sign in to ABG ONE.", "HOST_INVALID");
    if (host.roles.length && host.roles.every((r) => READ_ONLY_ROLES.includes(r.role as RoleCode))) throw badRequest(`${host.displayName} does not take appointments through ABG ONE.`, "HOST_INVALID");

    const preferred = new Date(dto.preferredAt);
    this.checkTime(preferred, dto.durationMinutes, "preferred time");
    let alternative: Date | null = null;
    if (dto.alternativeAt) {
      alternative = new Date(dto.alternativeAt);
      this.checkTime(alternative, dto.durationMinutes, "alternative time");
      if (alternative.getTime() === preferred.getTime()) throw badRequest("The alternative time is the same as the preferred one — choose a different time or leave it empty.", "ALTERNATIVE_SAME");
    }
    const attendees: string[] = [];
    for (const raw of dto.attendees ?? []) {
      const name = raw.replace(/\s+/g, " ").trim();
      if (name.length >= 2 && !attendees.some((a) => a.toLowerCase() === name.toLowerCase())) attendees.push(name);
    }

    const now = new Date();
    const appt = await this.prisma.$transaction(async (tx) => {
      const year = dhakaYear(now);
      const referenceNumber = formatAppointmentNumber(year, await nextSequence(tx, "AP", String(year)));
      const created = await tx.appointment.create({
        data: {
          referenceNumber,
          subject: dto.subject.trim(),
          purpose: dto.purpose,
          agenda: dto.agenda?.trim() ?? "",
          mode: dto.mode,
          durationMinutes: dto.durationMinutes,
          preferredAt: preferred,
          alternativeAt: alternative,
          attendees,
          urgent: !!dto.urgent,
          requesterUserId: actor.userId,
          hostUserId: host.id,
          branchId: actor.branchId!,
          status: AppointmentStatus.PENDING,
          statusChangedAt: now,
        },
      });
      await tx.appointmentUpdate.create({
        data: { appointmentId: created.id, type: AppointmentUpdateType.SUBMITTED, toStatus: AppointmentStatus.PENDING, actorUserId: actor.userId, actorName: actor.displayName, metadata: { host: host.displayName, preferredAt: preferred.toISOString() }, createdAt: now },
      });
      return created;
    });

    await this.deliver(
      appt,
      `appointment:${appt.id}:submitted`,
      "APPOINTMENT_REQUESTED",
      await this.hostSide(host.id, isExecutive(host)),
      NotificationCategory.ACTION_REQUIRED,
      `${dto.urgent ? "Urgent appointment" : "Appointment"} request${isExecutive(host) ? ` for ${host.displayName}` : ""}`,
      `${actor.displayName} · ${appt.subject} — ${meetingTime(preferred)}, ${dto.durationMinutes} min, ${MEETING_MODE_LABEL[dto.mode as MeetingMode].toLowerCase()}. ${appt.referenceNumber}`,
    );
    return this.get(actor, appt.id);
  }

  /** The person asked, plus — for the MD and the Chairman — the executive office. */
  private async hostSide(hostUserId: string, executive: boolean): Promise<string[]> {
    const office = executive ? await this.notifications.usersWithRoles([RoleCode.EXECUTIVE_ASSISTANT]) : [];
    return [hostUserId, ...office];
  }

  // ── Reading ──

  async get(actor: UserActor, id: string) {
    const { appt, rel } = await this.load(actor, id);
    const clashes = rel.isHost || rel.isOffice ? await this.clashesFor(appt) : [];
    return this.serialize(actor, appt, rel, clashes);
  }

  async mine(actor: UserActor, q: MyAppointmentsQuery) {
    const where: Prisma.AppointmentWhereInput[] = [{ requesterUserId: actor.userId }];
    if (q.state === "open") where.push({ status: { in: [...OPEN_APPOINTMENT_STATUSES] } });
    if (q.state === "closed") where.push({ status: { in: [...CLOSED_APPOINTMENT_STATUSES] } });
    return this.page(where, q.cursor, q.limit, (r) => this.serializeRow(r));
  }

  /** Requests waiting for the caller's side to answer. */
  async inbox(actor: UserActor, q: { cursor?: string; limit?: string }) {
    if (isReadOnly(actor)) return { items: [], nextCursor: null };
    const where: Prisma.AppointmentWhereInput[] = [await this.deskWhere(actor), { status: AppointmentStatus.PENDING }, { requesterUserId: { not: actor.userId } }];
    return this.page(where, q.cursor, q.limit, (r) => this.serializeRow(r), 50);
  }

  async desk(actor: UserActor, q: DeskQuery) {
    const where: Prisma.AppointmentWhereInput[] = [await this.deskWhere(actor, q.hostUserId)];
    if (q.status === "OPEN") where.push({ status: { in: [...OPEN_APPOINTMENT_STATUSES] } });
    else if (q.status && q.status !== "ALL") where.push({ status: { in: q.status.split(",") } });
    const text = q.q?.trim();
    if (text) {
      where.push({
        OR: [
          { referenceNumber: { contains: text, mode: "insensitive" } },
          { subject: { contains: text, mode: "insensitive" } },
          { requester: { displayName: { contains: text, mode: "insensitive" } } },
        ],
      });
    }
    return this.page(where, q.cursor, q.limit, (r) => this.serializeRow(r));
  }

  /** Confirmed, proposed and pending meetings in a date range: the host's diary (or, for the executive office, the MD's and the Chairman's). */
  async diary(actor: UserActor, q: DiaryQuery) {
    const from = dhakaDayRange(q.from).gte;
    const to = dhakaDayRange(q.to).lt;
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to <= from) throw badRequest("Choose a real date range.", "DATE_INVALID");
    if ((to.getTime() - from.getTime()) / 86_400_000 > MAX_DIARY_DAYS) throw badRequest(`Show at most ${MAX_DIARY_DAYS} days at a time.`, "RANGE_TOO_LONG");
    const rows = await this.prisma.appointment.findMany({
      where: {
        AND: [
          await this.deskWhere(actor, q.hostUserId),
          {
            OR: [
              { status: { in: [AppointmentStatus.CONFIRMED, AppointmentStatus.PROPOSED, AppointmentStatus.COMPLETED] }, scheduledAt: { gte: from, lt: to } },
              { status: AppointmentStatus.PENDING, preferredAt: { gte: from, lt: to } },
            ],
          },
        ],
      },
      include: ROW_INCLUDE,
      orderBy: [{ scheduledAt: "asc" }, { preferredAt: "asc" }],
    });
    const hosts = new Map<string, { userId: string; name: string; designation: string | null }>();
    for (const r of rows) hosts.set(r.host.id, { userId: r.host.id, name: r.host.displayName, designation: r.host.employee?.designation ?? null });
    return { from: q.from, to: q.to, hosts: [...hosts.values()], items: rows.map((r) => this.serializeRow(r)) };
  }

  /** Counts for the caller's side: requests to answer, today's and this week's meetings, the next one. */
  async summary(actor: UserActor) {
    const desk = await this.deskWhere(actor);
    const today = dhakaDay(new Date());
    const dayRange = dhakaDayRange(today);
    const weekEnd = new Date(dayRange.gte.getTime() + 7 * 86_400_000);
    const now = new Date();
    const [pending, proposed, todayCount, weekCount, next, mineOpen] = await Promise.all([
      this.prisma.appointment.count({ where: { AND: [desk, { status: AppointmentStatus.PENDING }] } }),
      this.prisma.appointment.count({ where: { AND: [desk, { status: AppointmentStatus.PROPOSED }] } }),
      this.prisma.appointment.count({ where: { AND: [desk, { status: AppointmentStatus.CONFIRMED, scheduledAt: { gte: dayRange.gte, lt: dayRange.lt } }] } }),
      this.prisma.appointment.count({ where: { AND: [desk, { status: AppointmentStatus.CONFIRMED, scheduledAt: { gte: dayRange.gte, lt: weekEnd } }] } }),
      this.prisma.appointment.findFirst({ where: { AND: [desk, { status: AppointmentStatus.CONFIRMED, scheduledAt: { gte: now } }] }, include: ROW_INCLUDE, orderBy: { scheduledAt: "asc" } }),
      this.prisma.appointment.count({ where: { requesterUserId: actor.userId, status: { in: [...OPEN_APPOINTMENT_STATUSES] } } }),
    ]);
    return {
      awaitingAnswer: pending,
      awaitingRequester: proposed,
      confirmedToday: todayCount,
      confirmedThisWeek: weekCount,
      next: next ? this.serializeRow(next) : null,
      myOpenRequests: mineOpen,
      answersFor: actor.capabilities.has(Capability.APPOINTMENT_MANAGE) ? "EXECUTIVES" : "SELF",
    };
  }

  private async page<T>(where: Prisma.AppointmentWhereInput[], cursorRaw: string | undefined, limitRaw: string | undefined, map: (r: AppointmentRow) => T, fallback = 25) {
    const limit = clampLimit(limitRaw, fallback, 100);
    const cursor = decodeCursor(cursorRaw);
    if (cursor) where.push({ OR: [{ createdAt: { lt: cursor.createdAt } }, { createdAt: cursor.createdAt, id: { lt: cursor.id } }] });
    const rows = await this.prisma.appointment.findMany({ where: { AND: where }, include: ROW_INCLUDE, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: limit + 1 });
    const items = rows.slice(0, limit);
    return {
      items: items.map(map),
      nextCursor: rows.length > limit ? encodeCursor(items[items.length - 1].createdAt, items[items.length - 1].id) : null,
    };
  }

  /** The host's other confirmed meetings overlapping a time, for the clash warning. */
  private async clashesAt(hostUserId: string, at: Date, durationMinutes: number, exceptId: string, db: Tx | PrismaService = this.prisma) {
    const w = appointmentWindow(at, durationMinutes);
    const rows = await db.appointment.findMany({
      where: { hostUserId, status: AppointmentStatus.CONFIRMED, id: { not: exceptId }, scheduledAt: { lt: w.end, gte: new Date(w.start.getTime() - 4 * 3_600_000) } },
      select: { id: true, referenceNumber: true, subject: true, scheduledAt: true, durationMinutes: true, requester: { select: { displayName: true } } },
    });
    return rows.filter((r) => appointmentWindow(r.scheduledAt!, r.durationMinutes).end > w.start);
  }

  private async clashesFor(a: AppointmentFull) {
    if (!OPEN_APPOINTMENT_STATUSES.includes(a.status as AppointmentStatus)) return [];
    const at = a.status === AppointmentStatus.PENDING ? a.preferredAt : a.scheduledAt;
    if (!at) return [];
    return (await this.clashesAt(a.hostUserId, at, a.durationMinutes, a.id)).map((c) => ({ id: c.id, referenceNumber: c.referenceNumber, subject: c.subject, scheduledAt: c.scheduledAt, with: c.requester.displayName }));
  }

  // ── Answering ──

  /** Lock the row and check the move; the host side, the requester or either, as `who` says. */
  private async step(
    actor: UserActor,
    id: string,
    to: AppointmentStatus,
    who: "host" | "requester" | "either",
    write: (tx: Tx, row: LockedRow, ctx: { now: Date; appt: AppointmentFull }) => Promise<Prisma.AppointmentUpdateInput>,
    update: { type: string; note: string | null; metadata?: Record<string, unknown> },
  ) {
    const { appt, rel } = await this.load(actor, id);
    if (isReadOnly(actor)) throw forbidden("Auditors have read-only access.", "READ_ONLY");
    const hostSide = rel.isHost || rel.isOffice;
    if (who === "host" && !hostSide) throw forbidden(`Only ${appt.host.displayName} or their office can do that.`, "NOT_HOST");
    if (who === "requester" && !rel.isRequester) throw forbidden("Only the person who asked for the meeting can do that.", "NOT_REQUESTER");
    if (who === "either" && !hostSide && !rel.isRequester) throw forbidden("You are not part of this meeting.", "FORBIDDEN");
    const now = new Date();
    try {
      await this.prisma.$transaction(async (tx: Tx) => {
        const [row] = await tx.$queryRaw<LockedRow[]>`
          SELECT "status", "hostUserId", "durationMinutes", "preferredAt", "scheduledAt", "referenceNumber" FROM "appointments" WHERE "id" = ${id} FOR UPDATE`;
        if (!canAppointmentTransition(row.status, to) && !(to === AppointmentStatus.PROPOSED && row.status === AppointmentStatus.PROPOSED)) {
          throw conflict(STATE_CONFLICT, `This appointment is ${APPOINTMENT_STATUS_LABEL[row.status as AppointmentStatus].toLowerCase()}; it cannot become ${APPOINTMENT_STATUS_LABEL[to].toLowerCase()}.`);
        }
        const data = await write(tx, row, { now, appt });
        await tx.appointment.update({ where: { id }, data: { ...data, status: to, statusChangedAt: now, respondedByName: hostSide ? actor.displayName : undefined } });
        await tx.appointmentUpdate.create({
          data: { appointmentId: id, type: update.type, fromStatus: row.status, toStatus: to, note: update.note, actorUserId: actor.userId, actorName: actor.displayName, metadata: (update.metadata ?? {}) as Prisma.InputJsonValue, createdAt: now },
        });
      });
    } catch (e) {
      if (violates(e, "appointment_host_no_clash")) throw conflict("APPOINTMENT_CLASH", `${appt.host.displayName} already has a confirmed meeting at that time.`);
      throw e;
    }
    return { appt, rel, now };
  }

  private async assertNoClash(tx: Tx, hostUserId: string, at: Date, durationMinutes: number, id: string, hostName: string) {
    const clashes = await this.clashesAt(hostUserId, at, durationMinutes, id, tx);
    if (clashes.length) {
      const c = clashes[0];
      throw conflict("APPOINTMENT_CLASH", `${hostName} already has a confirmed meeting then: ${c.subject} with ${c.requester.displayName} at ${meetingTime(c.scheduledAt!)}. Choose another time.`, { clashWith: c.referenceNumber });
    }
  }

  async confirm(actor: UserActor, id: string, dto: ConfirmAppointmentDto) {
    const { appt: before } = await this.load(actor, id);
    const at = dto.at ? new Date(dto.at) : before.preferredAt;
    if (dto.at) this.checkTime(at, before.durationMinutes, "meeting time");
    const location = dto.location?.trim() || (before.mode === "IN_PERSON" ? (before.host.employee?.defaultLocation?.name ?? null) : null);
    const note = dto.note?.trim() || null;
    const { appt, now } = await this.step(
      actor,
      id,
      AppointmentStatus.CONFIRMED,
      "host",
      async (tx, row, ctx) => {
        if (row.status !== AppointmentStatus.PENDING) throw conflict(STATE_CONFLICT, row.status === AppointmentStatus.PROPOSED ? "A new time was proposed; the requester has to accept it." : "This appointment is not waiting for an answer.");
        await this.assertNoClash(tx, row.hostUserId, at, row.durationMinutes, id, before.host.displayName);
        return { scheduledAt: at, location, statusNote: note, confirmedAt: ctx.now };
      },
      { type: AppointmentUpdateType.STATUS_CHANGED, note, metadata: { scheduledAt: at.toISOString(), location } },
    );
    await this.deliver(
      appt,
      `appointment:${id}:confirmed:${now.getTime()}`,
      "APPOINTMENT_CONFIRMED",
      [appt.requesterUserId],
      NotificationCategory.PARCEL_UPDATE,
      "Meeting confirmed",
      `${appt.subject} with ${appt.host.displayName} — ${meetingTime(at)}${location ? ` · ${location}` : ""}. ${appt.referenceNumber}`,
    );
    return this.get(actor, id);
  }

  async propose(actor: UserActor, id: string, dto: ProposeAppointmentDto) {
    const { appt: before } = await this.load(actor, id);
    const at = new Date(dto.at);
    this.checkTime(at, before.durationMinutes, "new time");
    const note = dto.note?.trim() || null;
    if (!note || note.length < APPOINTMENT_LIMITS.reasonMin) throw badRequest("Tell the requester why another time is proposed.", "REASON_REQUIRED");
    const location = dto.location?.trim() || before.location || (before.mode === "IN_PERSON" ? (before.host.employee?.defaultLocation?.name ?? null) : null);
    const { appt, now } = await this.step(
      actor,
      id,
      AppointmentStatus.PROPOSED,
      "host",
      async (tx, row) => {
        if (row.scheduledAt && row.scheduledAt.getTime() === at.getTime() && row.status !== AppointmentStatus.PENDING) throw badRequest("That is the time already on the table — choose a different one.", "TIME_UNCHANGED");
        await this.assertNoClash(tx, row.hostUserId, at, row.durationMinutes, id, before.host.displayName);
        return { scheduledAt: at, location, statusNote: note };
      },
      { type: AppointmentUpdateType.TIME_PROPOSED, note, metadata: { scheduledAt: at.toISOString(), previous: before.scheduledAt?.toISOString() ?? null, location } },
    );
    await this.deliver(
      appt,
      `appointment:${id}:proposed:${now.getTime()}`,
      "APPOINTMENT_PROPOSED",
      [appt.requesterUserId],
      NotificationCategory.ACTION_REQUIRED,
      before.status === AppointmentStatus.CONFIRMED ? "Your meeting has been moved" : "A new time is proposed",
      `${appt.subject} with ${appt.host.displayName} — ${meetingTime(at)}? ${note} ${appt.referenceNumber}`,
    );
    return this.get(actor, id);
  }

  async accept(actor: UserActor, id: string) {
    const { appt, now } = await this.step(
      actor,
      id,
      AppointmentStatus.CONFIRMED,
      "requester",
      async (tx, row, ctx) => {
        if (row.status !== AppointmentStatus.PROPOSED) throw conflict(STATE_CONFLICT, "There is no proposed time to accept.");
        if (row.scheduledAt!.getTime() < ctx.now.getTime()) throw conflict("APPOINTMENT_TIME_PASSED", "The proposed time has passed. Ask for a new appointment.");
        await this.assertNoClash(tx, row.hostUserId, row.scheduledAt!, row.durationMinutes, id, ctx.appt.host.displayName);
        return { confirmedAt: ctx.now };
      },
      { type: AppointmentUpdateType.STATUS_CHANGED, note: null },
    );
    const fresh = await this.prisma.appointment.findUniqueOrThrow({ where: { id }, select: { scheduledAt: true } });
    await this.deliver(
      appt,
      `appointment:${id}:accepted:${now.getTime()}`,
      "APPOINTMENT_CONFIRMED",
      await this.hostSide(appt.hostUserId, isExecutive(appt.host)),
      NotificationCategory.PARCEL_UPDATE,
      "Proposed time accepted",
      `${appt.requester.displayName} accepted ${meetingTime(fresh.scheduledAt!)} for ${appt.subject}. ${appt.referenceNumber}`,
    );
    return this.get(actor, id);
  }

  async decline(actor: UserActor, id: string, noteRaw?: string) {
    const note = noteRaw?.trim() || null;
    if (!note || note.length < APPOINTMENT_LIMITS.reasonMin) throw badRequest("Tell the requester why the meeting is declined.", "REASON_REQUIRED");
    const { appt, now } = await this.step(actor, id, AppointmentStatus.DECLINED, "host", async (_tx, _row, ctx) => ({ statusNote: note, declinedAt: ctx.now }), { type: AppointmentUpdateType.STATUS_CHANGED, note });
    await this.deliver(appt, `appointment:${id}:declined:${now.getTime()}`, "APPOINTMENT_DECLINED", [appt.requesterUserId], NotificationCategory.PARCEL_UPDATE, "Appointment declined", `${appt.subject} with ${appt.host.displayName} — ${note}. ${appt.referenceNumber}`);
    return this.get(actor, id);
  }

  async cancel(actor: UserActor, id: string, noteRaw?: string) {
    const note = noteRaw?.trim() || null;
    if (!note || note.length < APPOINTMENT_LIMITS.reasonMin) throw badRequest("Say why the meeting is cancelled, so the other side knows.", "REASON_REQUIRED");
    const { appt: before, rel } = await this.load(actor, id);
    if (!rel.isRequester && before.status !== AppointmentStatus.CONFIRMED) {
      throw conflict(STATE_CONFLICT, "Only a confirmed meeting is cancelled by the host side; decline a request instead.");
    }
    const { appt, now } = await this.step(actor, id, AppointmentStatus.CANCELLED, "either", async (_tx, _row, ctx) => ({ statusNote: note, cancelledAt: ctx.now }), { type: AppointmentUpdateType.STATUS_CHANGED, note });
    const recipients = rel.isRequester ? await this.hostSide(appt.hostUserId, isExecutive(appt.host)) : [appt.requesterUserId];
    await this.deliver(
      appt,
      `appointment:${id}:cancelled:${now.getTime()}`,
      "APPOINTMENT_CANCELLED",
      recipients.filter((u) => u !== actor.userId),
      NotificationCategory.PARCEL_UPDATE,
      "Meeting cancelled",
      `${appt.subject} (${appt.requester.displayName} with ${appt.host.displayName}) — ${note}. ${appt.referenceNumber}`,
    );
    return this.get(actor, id);
  }

  async complete(actor: UserActor, id: string, noteRaw?: string) {
    const note = noteRaw?.trim() || null;
    const { appt, now } = await this.step(
      actor,
      id,
      AppointmentStatus.COMPLETED,
      "host",
      async (_tx, row, ctx) => {
        if (row.scheduledAt && row.scheduledAt.getTime() > ctx.now.getTime()) throw conflict("APPOINTMENT_NOT_YET", `This meeting is at ${meetingTime(row.scheduledAt)}; mark it held once it has taken place.`);
        return { completedAt: ctx.now, statusNote: note };
      },
      { type: AppointmentUpdateType.STATUS_CHANGED, note },
    );
    if (note) {
      await this.deliver(appt, `appointment:${id}:completed:${now.getTime()}`, "APPOINTMENT_COMPLETED", [appt.requesterUserId], NotificationCategory.PARCEL_UPDATE, "Meeting notes", `${appt.subject} with ${appt.host.displayName}: ${note}. ${appt.referenceNumber}`);
    }
    return this.get(actor, id);
  }

  async addNote(actor: UserActor, id: string, noteRaw: string) {
    const { appt, rel } = await this.load(actor, id);
    if (isReadOnly(actor)) throw forbidden("Auditors have read-only access.", "READ_ONLY");
    const note = noteRaw.trim();
    const now = new Date();
    await this.prisma.appointmentUpdate.create({ data: { appointmentId: id, type: AppointmentUpdateType.NOTE_ADDED, note, actorUserId: actor.userId, actorName: actor.displayName, createdAt: now } });
    const recipients = rel.isRequester ? await this.hostSide(appt.hostUserId, isExecutive(appt.host)) : [appt.requesterUserId, appt.hostUserId];
    await this.deliver(
      appt,
      `appointment:${id}:note:${now.getTime()}`,
      "APPOINTMENT_NOTE",
      recipients.filter((u) => u !== actor.userId),
      NotificationCategory.PARCEL_UPDATE,
      `Note from ${actor.displayName}`,
      `${appt.referenceNumber} · ${appt.subject}: ${note}`,
    );
    return this.get(actor, id);
  }

  private async deliver(a: { id: string; referenceNumber: string; status: string }, dedupeBase: string, eventType: string, userIds: string[], category: string, title: string, body: string) {
    const drafts: Draft[] = [...new Set(userIds)].map((userId) => ({ userId, category, title, body }));
    if (!drafts.length) return;
    const fresh = await this.prisma.appointment.findUnique({ where: { id: a.id }, select: { status: true } });
    await this.notifications.deliverModule({ module: MODULE, id: a.id, reference: a.referenceNumber, route: `/appointments/${a.id}`, status: fresh?.status ?? a.status }, dedupeBase, eventType, drafts);
  }

  // ── Shapes ──

  private actionsFor(actor: UserActor, a: AppointmentFull, rel: Relation): string[] {
    if (isReadOnly(actor)) return [];
    const host = rel.isHost || rel.isOffice;
    const out: string[] = [];
    const s = a.status as AppointmentStatus;
    if (host && s === AppointmentStatus.PENDING) out.push(AppointmentAction.CONFIRM, AppointmentAction.PROPOSE, AppointmentAction.DECLINE);
    if (host && s === AppointmentStatus.PROPOSED) out.push(AppointmentAction.PROPOSE, AppointmentAction.DECLINE);
    if (host && s === AppointmentStatus.CONFIRMED) {
      out.push(AppointmentAction.PROPOSE);
      if (a.scheduledAt && a.scheduledAt.getTime() <= Date.now()) out.push(AppointmentAction.COMPLETE);
      out.push(AppointmentAction.CANCEL);
    }
    if (rel.isRequester && s === AppointmentStatus.PROPOSED) out.push(AppointmentAction.ACCEPT);
    if (rel.isRequester && OPEN_APPOINTMENT_STATUSES.includes(s)) out.push(AppointmentAction.CANCEL);
    if (OPEN_APPOINTMENT_STATUSES.includes(s) || s === AppointmentStatus.COMPLETED) out.push(AppointmentAction.ADD_NOTE);
    return [...new Set(out)];
  }

  private serialize(actor: UserActor, a: AppointmentFull, rel: Relation, clashes: unknown[]) {
    const person = (u: AppointmentFull["host"]) => ({
      userId: u.id,
      name: u.displayName,
      designation: u.employee?.designation ?? null,
      department: u.employee?.department?.name ?? null,
      office: u.employee?.branch.code ?? null,
      executive: isExecutive(u),
    });
    return {
      id: a.id,
      referenceNumber: a.referenceNumber,
      subject: a.subject,
      purpose: a.purpose,
      purposeLabel: APPOINTMENT_PURPOSE_LABEL[a.purpose as AppointmentPurpose],
      agenda: a.agenda,
      mode: a.mode,
      durationMinutes: a.durationMinutes,
      preferredAt: a.preferredAt,
      alternativeAt: a.alternativeAt,
      scheduledAt: a.scheduledAt,
      endsAt: a.scheduledAt ? appointmentWindow(a.scheduledAt, a.durationMinutes).end : null,
      location: a.location,
      attendees: Array.isArray(a.attendees) ? (a.attendees as unknown[]).map(String) : [],
      urgent: a.urgent,
      status: a.status,
      statusNote: a.statusNote,
      statusChangedAt: a.statusChangedAt,
      respondedByName: a.respondedByName,
      confirmedAt: a.confirmedAt,
      completedAt: a.completedAt,
      declinedAt: a.declinedAt,
      cancelledAt: a.cancelledAt,
      createdAt: a.createdAt,
      branch: a.branch,
      requester: { ...person(a.requester), phone: rel.isHost || rel.isOffice ? (a.requester.employee?.phone ?? null) : null },
      host: person(a.host),
      clashes,
      updates: a.updates.map((u) => ({ id: u.id, type: u.type, fromStatus: u.fromStatus, toStatus: u.toStatus, note: u.note, actor: u.actorName, metadata: u.metadata, createdAt: u.createdAt })),
      viewer: {
        isRequester: rel.isRequester,
        isHost: rel.isHost,
        isOffice: rel.isOffice,
        actions: this.actionsFor(actor, a, rel),
      },
    };
  }

  private serializeRow(r: AppointmentRow) {
    return {
      id: r.id,
      referenceNumber: r.referenceNumber,
      subject: r.subject,
      purpose: r.purpose,
      mode: r.mode,
      durationMinutes: r.durationMinutes,
      preferredAt: r.preferredAt,
      alternativeAt: r.alternativeAt,
      scheduledAt: r.scheduledAt,
      location: r.location,
      urgent: r.urgent,
      status: r.status,
      statusNote: r.statusNote,
      statusChangedAt: r.statusChangedAt,
      createdAt: r.createdAt,
      requester: { name: r.requester.displayName, designation: r.requester.employee?.designation ?? null, department: r.requester.employee?.department?.name ?? null },
      host: { userId: r.host.id, name: r.host.displayName, designation: r.host.employee?.designation ?? null },
      branch: r.branch,
    };
  }
}

