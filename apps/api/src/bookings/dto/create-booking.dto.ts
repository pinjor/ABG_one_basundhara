import { IsDateString, IsIn, IsNumber, IsOptional, IsString, Matches, Min } from "class-validator";
import { BookingType } from "@bsc/shared";

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export class CreateBookingDto {
  @IsString()
  facilityId!: string;

  @IsString()
  customerName!: string;

  @IsOptional()
  @IsString()
  memberId?: string;

  @IsIn(Object.values(BookingType))
  type!: string;

  @IsDateString()
  date!: string;

  @Matches(TIME_PATTERN, { message: "timeSlotStart must be HH:mm" })
  timeSlotStart!: string;

  @Matches(TIME_PATTERN, { message: "timeSlotEnd must be HH:mm" })
  timeSlotEnd!: string;

  @IsNumber()
  @Min(0)
  amount!: number;
}
