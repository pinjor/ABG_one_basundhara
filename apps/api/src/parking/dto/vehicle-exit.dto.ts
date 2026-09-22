import { IsString } from "class-validator";

export class VehicleExitDto {
  @IsString()
  plateNumber!: string;
}
