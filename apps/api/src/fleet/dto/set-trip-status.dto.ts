import { IsIn } from "class-validator";
import { TripStatus } from "@bsc/shared";

export class SetTripStatusDto {
  @IsIn(Object.values(TripStatus))
  status!: string;
}
