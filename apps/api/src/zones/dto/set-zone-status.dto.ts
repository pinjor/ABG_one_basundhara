import { IsIn } from "class-validator";
import { ZoneStatus } from "@bsc/shared";

export class SetZoneStatusDto {
  @IsIn(Object.values(ZoneStatus))
  status!: string;
}
