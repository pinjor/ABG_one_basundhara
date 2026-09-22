import { IsIn } from "class-validator";
import { BookingStatus } from "@bsc/shared";

export class SetBookingStatusDto {
  @IsIn(Object.values(BookingStatus))
  status!: string;
}
