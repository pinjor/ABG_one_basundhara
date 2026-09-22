import { IsIn, IsInt, IsNumber, IsOptional, IsString, Min } from "class-validator";
import { ZoneType, ZoneStatus } from "@bsc/shared";

export class CreateZoneDto {
  @IsString()
  name!: string;

  @IsIn(Object.values(ZoneType))
  type!: string;

  @IsOptional()
  @IsString()
  parentZoneId?: string;

  @IsOptional()
  @IsString()
  building?: string;

  @IsOptional()
  @IsString()
  floor?: string;

  @IsInt()
  @Min(0)
  capacity!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  liveOccupancy?: number;

  @IsOptional()
  @IsNumber()
  mapX?: number;

  @IsOptional()
  @IsNumber()
  mapY?: number;

  @IsOptional()
  @IsIn(Object.values(ZoneStatus))
  status?: string;
}
