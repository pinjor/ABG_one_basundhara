import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { DeskController } from "./desk.controller";
import { DeskService } from "./desk.service";

@Module({
  imports: [AuditModule],
  controllers: [DeskController],
  providers: [DeskService],
})
export class DeskModule {}
