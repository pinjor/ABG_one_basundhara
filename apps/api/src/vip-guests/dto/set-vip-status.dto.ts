import { IsIn } from "class-validator";
import { VIPStatus } from "@bsc/shared";

export class SetVipStatusDto {
  @IsIn(Object.values(VIPStatus))
  status!: string;
}
