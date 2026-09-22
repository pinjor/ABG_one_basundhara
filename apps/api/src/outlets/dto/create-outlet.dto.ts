import { IsIn, IsString } from "class-validator";
import { OutletType } from "@bsc/shared";

export class CreateOutletDto {
  @IsString()
  name!: string;

  @IsIn(Object.values(OutletType))
  type!: string;

  @IsString()
  zoneId!: string;
}
