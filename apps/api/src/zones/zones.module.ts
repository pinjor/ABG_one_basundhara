import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { ZonesService } from "./zones.service";
import { ZonesController } from "./zones.controller";

@Module({
  imports: [AuditModule],
  providers: [ZonesService],
  controllers: [ZonesController],
  exports: [ZonesService],
})
export class ZonesModule {}
