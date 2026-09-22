import { IsDateString, IsOptional } from "class-validator";

export class RenewMemberDto {
  @IsOptional()
  @IsDateString()
  expiryDate?: string;
}
