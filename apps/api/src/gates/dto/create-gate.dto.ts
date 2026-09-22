import { IsIn, IsString } from "class-validator";
import { GateType } from "@bsc/shared";

export class CreateGateDto {
  @IsString()
  name!: string;

  @IsString()
  zoneId!: string;

  @IsIn(Object.values(GateType))
  type!: string;
}
