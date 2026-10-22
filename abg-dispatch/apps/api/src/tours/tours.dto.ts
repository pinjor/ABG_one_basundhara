import { Transform } from "class-transformer";
import { ArrayMaxSize, IsArray, IsIn, IsInt, IsOptional, IsString, IsUUID, Length, Matches, Max, MaxLength, Min } from "class-validator";
import { TOUR_LIMITS, TourDecision, TourPurpose, TourStatus, TourType, TransportMode } from "@abg-dispatch/shared";

const L = TOUR_LIMITS;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const trim = ({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value);
const blankToUndefined = ({ value }: { value: unknown }) => (value === "" || value === null ? undefined : typeof value === "string" ? value.trim() : value);

/** POST /tours — an employee applies for an official tour. */
export class CreateTourDto {
  @IsIn(Object.values(TourType), { message: "Choose Local or Foreign" })
  type!: string;

  @IsIn(Object.values(TourPurpose), { message: "Choose the purpose of the tour" })
  purpose!: string;

  @Transform(trim)
  @IsString()
  @Length(L.titleMin, L.titleMax, { message: `Give the tour a short title (${L.titleMin}–${L.titleMax} characters)` })
  title!: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(L.descriptionMax)
  description?: string;

  @Transform(trim)
  @IsString()
  @Length(2, L.destinationMax, { message: "Say where you are going (city, site or plant)" })
  destination!: string;

  /** Required for overseas tours. */
  @IsOptional()
  @Transform(blankToUndefined)
  @IsString()
  @Length(2, L.countryMax, { message: "Give the destination country" })
  country?: string;

  @Matches(DATE, { message: "startDate must be a date like 2026-11-14" })
  startDate!: string;

  @Matches(DATE, { message: "endDate must be a date like 2026-11-18" })
  endDate!: string;

  @IsIn(Object.values(TransportMode), { message: "Choose how you will travel" })
  transportMode!: string;

  /** Names of colleagues travelling on the same request. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(L.maxCoTravellers, { message: `List at most ${L.maxCoTravellers} co-travellers` })
  @IsString({ each: true })
  @MaxLength(L.coTravellerNameMax, { each: true })
  coTravellers?: string[];

  /** Whole Taka. */
  @IsInt({ message: "The estimated budget must be a whole number of Taka" })
  @Min(0)
  @Max(L.maxBudget, { message: "The estimated budget is too large — check the amount" })
  estimatedBudget!: number;

  @IsOptional()
  @IsInt({ message: "The advance must be a whole number of Taka" })
  @Min(0)
  @Max(L.maxBudget)
  advanceRequested?: number;

  /** Required for overseas tours. */
  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.replace(/\s+/g, "").toUpperCase() || undefined : value))
  @IsString()
  @MaxLength(20)
  passportNumber?: string;

  @IsOptional()
  @Transform(blankToUndefined)
  @Matches(DATE, { message: "passportExpiry must be a date like 2029-03-31" })
  passportExpiry?: string;

  /** The head of department who approves first. Defaults to the traveller's line manager. */
  @IsOptional()
  @Transform(blankToUndefined)
  @IsUUID()
  approverEmployeeId?: string;
}

/** POST /tours/:id/decision — the server works out the stage from the status and the caller. */
export class TourDecisionDto {
  @IsIn(Object.values(TourDecision), { message: "decision must be APPROVE or REJECT" })
  decision!: string;

  /** Shown to the traveller. Required when rejecting. */
  @IsOptional()
  @IsString()
  @MaxLength(L.noteMax)
  note?: string;

  /** HR & Finance (vetting) or the MD / Chairman (sanction) may set the amount released. */
  @IsOptional()
  @IsInt({ message: "The sanctioned budget must be a whole number of Taka" })
  @Min(0)
  @Max(L.maxBudget)
  sanctionedBudget?: number;
}

export class TourNoteDto {
  @Transform(trim)
  @IsString()
  @Length(2, L.noteMax, { message: "Write a short note" })
  note!: string;
}

/** Cancelling needs a reason; starting and completing take an optional note. */
export class TourStepDto {
  @IsOptional()
  @IsString()
  @MaxLength(L.noteMax)
  note?: string;
}

export class TourSettingsDto {
  @IsInt({ message: "The annual travel budget must be a whole number of Taka" })
  @Min(0)
  @Max(10_000_000_000)
  annualTravelBudget!: number;
}

export class MyToursQuery {
  @IsOptional() @IsIn(["open", "closed", "all"]) state?: string;
  @IsOptional() @IsString() cursor?: string;
  @IsOptional() @Matches(/^\d{1,3}$/) limit?: string;
}

export class TourApprovalsQuery {
  @IsOptional() @IsString() cursor?: string;
  @IsOptional() @Matches(/^\d{1,3}$/) limit?: string;
}

const STATUS_FILTER = new RegExp(`^(ALL|OPEN|(${Object.values(TourStatus).join("|")})(,(${Object.values(TourStatus).join("|")}))*)$`);

export class AdminToursQuery {
  /** A status, several separated by commas, OPEN (awaiting a decision) or ALL. */
  @IsOptional() @Matches(STATUS_FILTER, { message: "status must be a tour status, a comma-separated list, OPEN or ALL" }) status?: string;
  @IsOptional() @IsIn(Object.values(TourType)) type?: string;
  @IsOptional() @IsUUID() branchId?: string;
  @IsOptional() @IsString() @MaxLength(100) q?: string;
  /** Travel dates overlapping this range (YYYY-MM-DD, either end optional). */
  @IsOptional() @Matches(DATE) dateFrom?: string;
  @IsOptional() @Matches(DATE) dateTo?: string;
  @IsOptional() @IsString() cursor?: string;
  @IsOptional() @Matches(/^\d{1,3}$/) limit?: string;
}

export class TourSummaryQuery {
  @IsOptional() @IsUUID() branchId?: string;
}
