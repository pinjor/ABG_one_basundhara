import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  Equals,
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";

export class SeatPickDto {
  @IsString()
  sectionId!: string;

  @IsString()
  @Matches(/^[A-Z]{1,2}$/)
  rowLabel!: string;

  @IsInt()
  @Min(1)
  @Max(80)
  seatNumber!: number;
}

export class CreateTicketOrderDto {
  @IsString()
  eventId!: string;

  @IsString()
  @MinLength(2)
  buyerName!: string;

  @Matches(/^01[3-9]\d{8}$/, { message: "buyerMobile must be a Bangladesh mobile number" })
  buyerMobile!: string;

  @IsEmail()
  buyerEmail!: string;

  @Equals(true, { message: "termsAccepted must be true" })
  termsAccepted!: boolean;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(6)
  @ValidateNested({ each: true })
  @Type(() => SeatPickDto)
  seats!: SeatPickDto[];
}

export class PayTicketOrderDto {
  @Matches(/^01[3-9]\d{8}$/)
  buyerMobile!: string;

  @IsIn(["CARD", "BKASH", "NAGAD"])
  method!: string;

  /** Honoured only while sandbox payments are enabled. Never a live decline switch. */
  @IsOptional()
  @IsBoolean()
  simulateFailure?: boolean;
}

export class CancelTicketOrderDto {
  @Matches(/^01[3-9]\d{8}$/)
  buyerMobile!: string;

  @IsString()
  @MinLength(3)
  reason!: string;
}

export class SectionInputDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsInt()
  @Min(1)
  @Max(30)
  rows!: number;

  @IsInt()
  @Min(1)
  @Max(40)
  seatsPerRow!: number;

  @IsNumber()
  @Min(0)
  priceBdt!: number;

  @IsString()
  @MinLength(2)
  gateName!: string;
}

export class CreateMatchEventDto {
  @IsString()
  @MinLength(3)
  title!: string;

  @IsString()
  sport!: string;

  @IsString()
  venueName!: string;

  @IsOptional()
  @IsString()
  venueNote?: string;

  @IsString()
  startsAt!: string;

  @IsString()
  doorsAt!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(3000)
  vatRateBps?: number;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(12)
  @ValidateNested({ each: true })
  @Type(() => SectionInputDto)
  sections!: SectionInputDto[];
}

export class SetSalesStatusDto {
  @IsIn(["ON_SALE", "CLOSED"])
  salesStatus!: string;
}

export class DecideRefundDto {
  @IsIn(["APPROVED", "REJECTED"])
  decision!: string;
}

export class VerifyAccessDto {
  @IsString()
  @MinLength(8)
  credentialToken!: string;

  @IsString()
  @MinLength(4)
  scanId!: string;

  @IsString()
  @MinLength(4)
  deviceId!: string;

  @IsIn(["IN", "OUT"])
  direction!: "IN" | "OUT";

  @IsOptional()
  @IsString()
  gateId?: string;
}
