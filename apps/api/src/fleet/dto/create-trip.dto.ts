import { IsOptional, IsString } from "class-validator";

export class CreateTripDto {
  @IsOptional()
  @IsString()
  vehicleId?: string;

  @IsString()
  passengerRef!: string;

  @IsString()
  fromLocation!: string;

  @IsString()
  toLocation!: string;
}
