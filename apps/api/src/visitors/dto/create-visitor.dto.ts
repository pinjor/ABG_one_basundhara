import { IsBoolean, IsIn, IsOptional, IsString } from "class-validator";
import { VisitorCategory } from "@bsc/shared";

export class CreateVisitorDto {
  @IsString()
  name!: string;

  @IsString()
  host!: string;

  @IsString()
  purpose!: string;

  @IsIn(Object.values(VisitorCategory))
  category!: string;

  @IsOptional()
  @IsBoolean()
  escortRequired?: boolean;

  @IsOptional()
  @IsString()
  eventPackId?: string;
}
