import { IsIn, IsOptional, IsString } from "class-validator";
import { FleetVehicleType } from "@bsc/shared";

export class CreateFleetVehicleDto {
  @IsIn(Object.values(FleetVehicleType))
  type!: string;

  @IsOptional()
  @IsString()
  driverName?: string;

  @IsOptional()
  @IsString()
  currentLocation?: string;
}
