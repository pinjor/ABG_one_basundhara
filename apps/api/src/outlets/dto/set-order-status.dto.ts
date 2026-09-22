import { IsIn } from "class-validator";
import { OrderStatus } from "@bsc/shared";

export class SetOrderStatusDto {
  @IsIn(Object.values(OrderStatus))
  status!: string;
}
