import { IsIn } from "class-validator";
import { FleetVehicleStatus } from "@bsc/shared";

export class SetFleetVehicleStatusDto {
  @IsIn(Object.values(FleetVehicleStatus))
  status!: string;
}
