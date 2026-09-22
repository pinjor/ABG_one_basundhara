import { ArrayMinSize, IsArray, IsNumber, IsString, Min, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

class OrderItemDto {
  @IsString()
  name!: string;

  @IsNumber()
  @Min(1)
  qty!: number;
}

export class CreateOrderDto {
  @IsString()
  outletId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items!: OrderItemDto[];

  @IsNumber()
  @Min(0)
  amount!: number;
}
