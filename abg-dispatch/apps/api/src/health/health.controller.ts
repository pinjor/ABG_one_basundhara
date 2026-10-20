import { Controller, Get } from "@nestjs/common";
import { Public } from "../auth/decorators";
import { PrismaService } from "../common/prisma.service";

@Controller()
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  root() {
    return { name: "ABG Dispatch API", status: "ok" };
  }

  @Public()
  @Get("health")
  async health() {
    await this.prisma.$queryRaw`SELECT 1`;
    return { status: "ok", time: new Date().toISOString() };
  }
}
