import { Module } from "@nestjs/common";
import { VipGuestsService } from "./vip-guests.service";
import { VipGuestsController } from "./vip-guests.controller";

@Module({
  providers: [VipGuestsService],
  controllers: [VipGuestsController],
  exports: [VipGuestsService],
})
export class VipGuestsModule {}
