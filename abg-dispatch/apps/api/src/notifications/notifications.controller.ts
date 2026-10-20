import { Body, Controller, Get, HttpCode, Param, Post, Put, Query } from "@nestjs/common";
import { IsBoolean, IsIn, IsOptional, IsString } from "class-validator";
import { NotificationCategory, NotificationChannel } from "@abg-dispatch/shared";
import { PrismaService } from "../common/prisma.service";
import { AllowReadOnly } from "../auth/decorators";
import { CurrentActor, type Actor } from "../common/actor";
import { clampLimit, decodeCursor, encodeCursor } from "../common/pagination";
import { forbidden, notFound } from "../common/errors";

class ListNotificationsQuery {
  @IsOptional() @IsIn(Object.values(NotificationCategory)) category?: string;
  @IsOptional() @IsIn(["true", "false"]) unreadOnly?: string;
  @IsOptional() @IsString() cursor?: string;
  @IsOptional() @IsString() limit?: string;
}

class PreferenceDto {
  @IsIn(Object.values(NotificationChannel)) channel!: string;
  @IsBoolean() enabled!: boolean;
}

/** The in-app notification centre. Guests receive SMS instead and have no inbox. */
@Controller("notifications")
export class NotificationsController {
  constructor(private readonly prisma: PrismaService) {}

  private userId(actor: Actor): string {
    if (actor.kind !== "user") throw forbidden("Guest carriers receive updates by SMS.", "GUEST_RESTRICTED");
    return actor.userId;
  }

  @Get()
  async list(@CurrentActor() actor: Actor, @Query() q: ListNotificationsQuery) {
    const userId = this.userId(actor);
    const limit = clampLimit(q.limit, 30, 100);
    const cursor = decodeCursor(q.cursor);
    const rows = await this.prisma.notification.findMany({
      where: {
        userId,
        category: q.category,
        readAt: q.unreadOnly === "true" ? null : undefined,
        ...(cursor ? { OR: [{ createdAt: { lt: cursor.createdAt } }, { createdAt: cursor.createdAt, id: { lt: cursor.id } }] } : {}),
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
    });
    const items = rows.slice(0, limit);
    return {
      items: items.map((n) => ({ id: n.id, parcelId: n.parcelId, eventType: n.eventType, category: n.category, title: n.title, body: n.body, sensitive: n.sensitive, read: !!n.readAt, createdAt: n.createdAt, data: n.data })),
      nextCursor: rows.length > limit ? encodeCursor(items[items.length - 1].createdAt, items[items.length - 1].id) : null,
    };
  }

  @Get("unread-count")
  async unread(@CurrentActor() actor: Actor) {
    const userId = this.userId(actor);
    const grouped = await this.prisma.notification.groupBy({ by: ["category"], where: { userId, readAt: null }, _count: { _all: true } });
    const byCategory = Object.fromEntries(grouped.map((g) => [g.category, g._count._all]));
    return { total: grouped.reduce((s, g) => s + g._count._all, 0), byCategory };
  }

  @AllowReadOnly()
  @HttpCode(200)
  @Post(":id/read")
  async read(@CurrentActor() actor: Actor, @Param("id") id: string) {
    const userId = this.userId(actor);
    const n = await this.prisma.notification.findUnique({ where: { id } });
    if (!n || n.userId !== userId) throw notFound("Notification not found.");
    await this.prisma.notification.update({ where: { id }, data: { readAt: n.readAt ?? new Date() } });
    return { ok: true };
  }

  @AllowReadOnly()
  @HttpCode(200)
  @Post("read-all")
  async readAll(@CurrentActor() actor: Actor, @Body() body: { category?: string }) {
    const userId = this.userId(actor);
    const result = await this.prisma.notification.updateMany({ where: { userId, readAt: null, category: body?.category }, data: { readAt: new Date() } });
    return { updated: result.count };
  }

  @Get("preferences")
  async preferences(@CurrentActor() actor: Actor) {
    const userId = this.userId(actor);
    const rows = await this.prisma.notificationPreference.findMany({ where: { userId } });
    const map = Object.fromEntries(rows.map((r) => [r.channel, r.enabled]));
    return Object.values(NotificationChannel).map((channel) => ({ channel, enabled: map[channel] ?? true, locked: channel === NotificationChannel.IN_APP }));
  }

  @AllowReadOnly()
  @Put("preferences")
  async setPreference(@CurrentActor() actor: Actor, @Body() dto: PreferenceDto) {
    const userId = this.userId(actor);
    if (dto.channel === NotificationChannel.IN_APP && !dto.enabled) throw forbidden("In-app notifications cannot be turned off; they are the custody record you act on.");
    await this.prisma.notificationPreference.upsert({
      where: { userId_channel: { userId, channel: dto.channel } },
      create: { userId, channel: dto.channel, enabled: dto.enabled },
      update: { enabled: dto.enabled },
    });
    return this.preferences(actor);
  }
}
