import { IsString } from "class-validator";

export class CreateServiceRequestDto {
  @IsString()
  loungeId!: string;

  @IsString()
  partyRef!: string;

  @IsString()
  item!: string;
}
