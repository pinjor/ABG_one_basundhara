import { IsBoolean, IsDateString, IsIn, IsOptional, IsString } from "class-validator";
import { VIPClassification } from "@bsc/shared";

export class CreateVipGuestDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  designation?: string;

  @IsIn(Object.values(VIPClassification))
  classification!: string;

  @IsDateString()
  arrivalDatetime!: string;

  @IsOptional()
  @IsString()
  protocolOfficerId?: string;

  @IsOptional()
  @IsString()
  loungeAssignment?: string;

  @IsOptional()
  @IsString()
  seatAllocation?: string;

  @IsOptional()
  @IsString()
  mealPreference?: string;

  @IsOptional()
  @IsBoolean()
  privacyFlag?: boolean;

  @IsOptional()
  @IsString()
  eventPackId?: string;
}
