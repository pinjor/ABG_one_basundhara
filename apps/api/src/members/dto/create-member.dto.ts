import { IsDateString, IsEmail, IsIn, IsOptional, IsString } from "class-validator";
import { MembershipTier } from "@bsc/shared";

export class CreateMemberDto {
  @IsString()
  name!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsIn(Object.values(MembershipTier))
  tier!: string;

  @IsDateString()
  expiryDate!: string;

  @IsOptional()
  @IsString()
  lockerId?: string;

  @IsOptional()
  @IsString()
  billingCycle?: string;
}
