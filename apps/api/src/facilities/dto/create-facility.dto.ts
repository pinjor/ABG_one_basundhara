import { IsDateString, IsIn, IsInt, IsOptional, IsString, Min } from "class-validator";
import { FacilityType, FacilityStatus } from "@bsc/shared";

export class CreateFacilityDto {
  @IsString()
  name!: string;

  @IsString()
  zoneId!: string;

  @IsIn(Object.values(FacilityType))
  type!: string;

  @IsInt()
  @Min(0)
  capacity!: number;

  @IsOptional()
  @IsString()
  operatingHoursStart?: string;

  @IsOptional()
  @IsString()
  operatingHoursEnd?: string;

  @IsOptional()
  @IsIn(Object.values(FacilityStatus))
  status?: string;

  @IsOptional()
  @IsDateString()
  lastInspectionDate?: string;
}
