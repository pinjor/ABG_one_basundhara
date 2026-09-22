import { IsIn } from "class-validator";
import { EquipmentStatus } from "@bsc/shared";

export class SetEquipmentStatusDto {
  @IsIn(Object.values(EquipmentStatus))
  status!: string;
}
