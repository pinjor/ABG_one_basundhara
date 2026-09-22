import { IsDateString, IsIn, IsNumber, IsOptional, IsString, Max, Min } from "class-validator";
import { SurfaceType, SurfaceCondition } from "@bsc/shared";

export class CreateSurfaceDto {
  @IsString()
  facilityId!: string;

  @IsIn(Object.values(SurfaceType))
  surfaceType!: string;

  @IsOptional()
  @IsIn(Object.values(SurfaceCondition))
  condition?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  moisturePercent?: number;

  @IsOptional()
  @IsDateString()
  lastInspection?: string;

  @IsOptional()
  @IsDateString()
  nextMaintenance?: string;
}
