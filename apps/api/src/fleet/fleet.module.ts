import { Module } from "@nestjs/common";
import { FleetService } from "./fleet.service";
import { FleetController } from "./fleet.controller";
import { TripsController } from "./trips.controller";

@Module({
  providers: [FleetService],
  controllers: [FleetController, TripsController],
  exports: [FleetService],
})
export class FleetModule {}
