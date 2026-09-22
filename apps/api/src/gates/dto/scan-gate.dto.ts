import { IsIn, IsOptional, IsString } from "class-validator";
import { AccessMethod } from "@bsc/shared";

export class ScanGateDto {
  @IsString()
  personRef!: string;

  @IsOptional()
  @IsString()
  credentialRef?: string;

  @IsIn(Object.values(AccessMethod))
  method!: string;
}
