import { Module } from "@nestjs/common";
import { LoungesService } from "./lounges.service";
import { LoungesController } from "./lounges.controller";
import { ServiceRequestsController } from "./service-requests.controller";

@Module({
  providers: [LoungesService],
  controllers: [LoungesController, ServiceRequestsController],
  exports: [LoungesService],
})
export class LoungesModule {}
