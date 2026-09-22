import { IsIn, IsInt, IsString, Min } from "class-validator";
import { EquipmentCategory } from "@bsc/shared";

export class CreateEquipmentDto {
  @IsString()
  name!: string;

  @IsIn(Object.values(EquipmentCategory))
  category!: string;

  @IsInt()
  @Min(0)
  quantity!: number;
}
