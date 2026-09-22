import { IsIn, IsInt, IsOptional, IsString, Min } from "class-validator";
import { ParkingZoneType } from "@bsc/shared";

export class CreateParkingZoneDto {
  @IsString()
  name!: string;

  @IsIn(Object.values(ParkingZoneType))
  type!: string;

  @IsOptional()
  @IsString()
  zoneId?: string;

  @IsInt()
  @Min(0)
  capacity!: number;
}
