import { Module } from "@nestjs/common";
import { OutletsService } from "./outlets.service";
import { OutletsController } from "./outlets.controller";
import { OrdersController } from "./orders.controller";

@Module({
  providers: [OutletsService],
  controllers: [OutletsController, OrdersController],
  exports: [OutletsService],
})
export class OutletsModule {}
