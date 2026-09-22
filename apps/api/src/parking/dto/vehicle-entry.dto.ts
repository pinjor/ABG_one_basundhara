import { IsIn, IsOptional, IsString } from "class-validator";
import { ParkingZoneType } from "@bsc/shared";

export class VehicleEntryDto {
  @IsString()
  plateNumber!: string;

  @IsOptional()
  @IsString()
  vehicleRef?: string;

  @IsIn(Object.values(ParkingZoneType))
  type!: string;
}
