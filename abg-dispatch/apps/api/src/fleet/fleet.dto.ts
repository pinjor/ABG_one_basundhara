import { Transform, Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";
import {
  CarRequisitionStatus,
  DriverStatus,
  FLEET_LIMITS,
  GateScanDirection,
  TripType,
  VEHICLE_PREFERENCES,
  VehicleStatus,
  VehicleType,
} from "@abg-dispatch/shared";

const L = FLEET_LIMITS;
const trim = ({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value);
const blankToUndefined = ({ value }: { value: unknown }) => (value === "" ? undefined : typeof value === "string" ? value.trim() : value);
/** Bangladeshi mobile or land line, with or without +880; spaces and dashes are fine. */
const PHONE = /^[+\d][\d\s-]{6,19}$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

export class PassengerDto {
  @Transform(trim)
  @IsString()
  @Length(2, L.passengerNameMax, { message: "Give each passenger's name" })
  name!: string;

  @IsOptional()
  @Transform(blankToUndefined)
  @IsString()
  @Matches(PHONE, { message: "Passenger phone numbers must be digits, e.g. 01712345678" })
  phone?: string;
}

export class CreateCarRequisitionDto {
  @IsIn(Object.values(TripType), { message: "Choose the kind of trip" })
  tripType!: string;

  @Transform(trim)
  @IsString()
  @Length(L.purposeMin, L.purposeMax, { message: `Say what the car is for (${L.purposeMin}–${L.purposeMax} characters)` })
  purpose!: string;

  @Transform(trim)
  @IsString()
  @Length(2, L.placeMax, { message: "Say where the car should pick you up" })
  pickupLocation!: string;

  @Transform(trim)
  @IsString()
  @Length(2, L.placeMax, { message: "Say where the car is going" })
  dropLocation!: string;

  @IsISO8601({ strict: true }, { message: "Pickup time must be a date and time" })
  pickupAt!: string;

  @IsOptional()
  @Transform(blankToUndefined)
  @IsISO8601({ strict: true }, { message: "Return time must be a date and time" })
  returnAt?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(L.maxPassengers, { message: `At most ${L.maxPassengers} passengers` })
  @ValidateNested({ each: true })
  @Type(() => PassengerDto)
  passengers?: PassengerDto[];

  @Type(() => Number)
  @IsInt({ message: "Say how many people are travelling" })
  @Min(1, { message: "At least one person travels" })
  @Max(L.maxPassengers, { message: `A pool car carries at most ${L.maxPassengers} people` })
  passengerCount!: number;

  @IsOptional()
  @IsBoolean()
  urgent?: boolean;

  @IsOptional()
  @IsIn(VEHICLE_PREFERENCES, { message: "Choose a vehicle type or Any" })
  vehiclePreference?: string;

  /** Defaults to the requester's line manager / head of department. */
  @IsOptional()
  @Transform(blankToUndefined)
  @IsUUID("4", { message: "Choose the approver from the directory" })
  approverEmployeeId?: string;
}

export class CarDecisionDto {
  @IsIn(["APPROVE", "REJECT"], { message: "Decide APPROVE or REJECT" })
  decision!: "APPROVE" | "REJECT";

  @IsOptional()
  @IsString()
  @MaxLength(L.noteMax)
  note?: string;
}

export class AssignCarDto {
  @IsUUID("4", { message: "Choose a vehicle" })
  vehicleId!: string;

  @IsUUID("4", { message: "Choose a driver" })
  driverId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(L.noteMax)
  note?: string;
}

export class OdometerDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "Odometer reading must be whole kilometres" })
  @Min(0)
  @Max(L.odometerMaxKm)
  odometerKm?: number;
}

export class CancelCarDto {
  @IsOptional()
  @IsString()
  @MaxLength(L.noteMax)
  note?: string;
}

export class GateScanDto {
  @IsIn(Object.values(GateScanDirection), { message: "Record EXIT or RETURN" })
  direction!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "Odometer reading must be whole kilometres" })
  @Min(0)
  @Max(L.odometerMaxKm)
  odometerKm?: number;
}

export class CreateVehicleDto {
  @Transform(trim)
  @IsString()
  @Length(4, L.registrationMax, { message: "Give the registration number, e.g. Dhaka Metro-GA 27-4512" })
  registrationNumber!: string;

  @Transform(trim)
  @IsString()
  @Length(2, 40)
  make!: string;

  @Transform(trim)
  @IsString()
  @Length(1, 60)
  model!: string;

  @IsIn(Object.values(VehicleType), { message: "Choose the vehicle type" })
  type!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1, { message: "Passenger seats must be at least 1" })
  @Max(L.maxSeats)
  seats!: number;

  @IsOptional() @Transform(blankToUndefined) @IsString() @MaxLength(30) colour?: string;
  @IsOptional() @Transform(blankToUndefined) @IsString() @MaxLength(30) fuelType?: string;

  @IsUUID("4", { message: "Choose the office the vehicle belongs to" })
  branchId!: string;

  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(L.odometerMaxKm) odometerKm?: number;
  @IsOptional() @Matches(DAY, { message: "Next service must be a date (YYYY-MM-DD)" }) nextServiceAt?: string | null;
  @IsOptional() @Matches(DAY, { message: "Fitness expiry must be a date (YYYY-MM-DD)" }) fitnessExpiry?: string | null;
  @IsOptional() @Matches(DAY, { message: "Insurance expiry must be a date (YYYY-MM-DD)" }) insuranceExpiry?: string | null;
  @IsOptional() @IsString() @MaxLength(L.noteMax) notes?: string | null;
}

export class UpdateVehicleDto {
  @IsOptional() @Transform(trim) @IsString() @Length(4, L.registrationMax) registrationNumber?: string;
  @IsOptional() @Transform(trim) @IsString() @Length(2, 40) make?: string;
  @IsOptional() @Transform(trim) @IsString() @Length(1, 60) model?: string;
  @IsOptional() @IsIn(Object.values(VehicleType)) type?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(L.maxSeats) seats?: number;
  @IsOptional() @IsString() @MaxLength(30) colour?: string | null;
  @IsOptional() @IsString() @MaxLength(30) fuelType?: string | null;
  @IsOptional() @IsUUID("4") branchId?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(L.odometerMaxKm) odometerKm?: number;
  @IsOptional() @Matches(DAY) nextServiceAt?: string | null;
  @IsOptional() @Matches(DAY) fitnessExpiry?: string | null;
  @IsOptional() @Matches(DAY) insuranceExpiry?: string | null;
  @IsOptional() @IsString() @MaxLength(L.noteMax) notes?: string | null;

  /** On trip is set by trips themselves, never by hand. */
  @IsOptional()
  @IsIn([VehicleStatus.AVAILABLE, VehicleStatus.MAINTENANCE, VehicleStatus.INACTIVE], { message: "Status can be Available, In maintenance or Inactive" })
  status?: string;

  /** Required when sending a vehicle to maintenance or taking it out of service. */
  @IsOptional() @IsString() @MaxLength(L.noteMax) statusNote?: string | null;
}

export class CreateDriverDto {
  @Transform(trim)
  @IsString()
  @Length(2, 80, { message: "Give the driver's full name" })
  fullName!: string;

  @Transform(trim)
  @IsString()
  @Matches(PHONE, { message: "Give the driver's mobile number, e.g. 01712345678" })
  phone!: string;

  @Transform(trim)
  @IsString()
  @Length(3, 40, { message: "Give the driving licence number" })
  licenseNumber!: string;

  @IsOptional() @Matches(DAY, { message: "Licence expiry must be a date (YYYY-MM-DD)" }) licenseExpiry?: string | null;

  @IsUUID("4", { message: "Choose the driver's office" })
  branchId!: string;

  /** Link to the directory; if that person has an ABG ONE account, trips appear in their app. */
  @IsOptional() @Transform(blankToUndefined) @IsUUID("4") employeeId?: string | null;
}

export class UpdateDriverDto {
  @IsOptional() @Transform(trim) @IsString() @Length(2, 80) fullName?: string;
  @IsOptional() @Transform(trim) @IsString() @Matches(PHONE) phone?: string;
  @IsOptional() @Transform(trim) @IsString() @Length(3, 40) licenseNumber?: string;
  @IsOptional() @Matches(DAY) licenseExpiry?: string | null;
  @IsOptional() @IsUUID("4") branchId?: string;
  @IsOptional() @IsUUID("4") employeeId?: string | null;

  @IsOptional()
  @IsIn([DriverStatus.AVAILABLE, DriverStatus.OFF_DUTY], { message: "Status can be Available or Off duty" })
  status?: string;

  @IsOptional() @IsBoolean() active?: boolean;
}

export class MyCarRequisitionsQuery {
  @IsOptional() @IsIn(["open", "closed", "all"]) state?: string;
  @IsOptional() @IsString() cursor?: string;
  @IsOptional() @Matches(/^\d{1,3}$/) limit?: string;
}

export class MyTripsQuery {
  @IsOptional() @IsIn(["active", "done"]) state?: string;
  @IsOptional() @IsString() cursor?: string;
  @IsOptional() @Matches(/^\d{1,3}$/) limit?: string;
}

export class AdminCarRequisitionsQuery {
  @IsOptional() @IsIn([...Object.values(CarRequisitionStatus), "OPEN", "CLOSED", "ALL", "AWAITING_ME"]) status?: string;
  @IsOptional() @IsUUID() branchId?: string;
  @IsOptional() @IsIn(["true", "false"]) urgent?: string;
  @IsOptional() @IsString() @MaxLength(100) q?: string;
  @IsOptional() @Matches(DAY) dateFrom?: string;
  @IsOptional() @Matches(DAY) dateTo?: string;
  @IsOptional() @IsString() cursor?: string;
  @IsOptional() @Matches(/^\d{1,3}$/) limit?: string;
}

export class FleetRegisterQuery {
  @IsOptional() @IsUUID() branchId?: string;
  /** Work out availability for this requisition's time window and passengers (the assign dialog). */
  @IsOptional() @IsUUID() requisitionId?: string;
  @IsOptional() @IsIn(["true", "false"]) includeInactive?: string;
  @IsOptional() @IsString() @MaxLength(60) q?: string;
}
