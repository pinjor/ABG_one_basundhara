import { IsInt, IsString, Min } from "class-validator";

export class CreateLoungeDto {
  @IsString()
  name!: string;

  @IsString()
  zoneId!: string;

  @IsInt()
  @Min(0)
  capacity!: number;
}
