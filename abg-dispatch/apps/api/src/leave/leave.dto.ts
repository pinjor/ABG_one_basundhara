import { Transform, Type } from "class-transformer";
import { ArrayMaxSize, IsArray, IsIn, IsInt, IsNumber, IsOptional, IsString, IsUUID, Length, Matches, Max, MaxLength, Min, ValidateNested } from "class-validator";
import { HalfDaySession, LEAVE_LIMITS, LeaveDecision, LeaveStatus, LeaveType } from "@abg-dispatch/shared";

const L = LEAVE_LIMITS;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const trim = ({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value);
const blankToUndefined = ({ value }: { value: unknown }) => (value === "" || value === null ? undefined : typeof value === "string" ? value.trim() : value);

/** POST /leave — an employee applies for leave. */
export class ApplyLeaveDto {
  @IsIn(Object.values(LeaveType), { message: "Choose the type of leave" })
  type!: string;

  @Matches(DATE, { message: "startDate must be a date like 2026-11-14" })
  startDate!: string;

  @Matches(DATE, { message: "endDate must be a date like 2026-11-16" })
  endDate!: string;

  /** Half a day; only for a one-day application. */
  @IsOptional()
  @Transform(blankToUndefined)
  @IsIn(Object.values(HalfDaySession), { message: "halfDay must be FIRST_HALF or SECOND_HALF" })
  halfDay?: string;

  @Transform(trim)
  @IsString()
  @Length(L.reasonMin, L.reasonMax, { message: `Say briefly why you need the leave (${L.reasonMin}–${L.reasonMax} characters)` })
  reason!: string;

  @IsOptional()
  @Transform(blankToUndefined)
  @IsString()
  @MaxLength(L.addressMax)
  addressDuringLeave?: string;

  @IsOptional()
  @Transform(blankToUndefined)
  @IsString()
  @MaxLength(20)
  contactPhone?: string;

  /** The colleague who covers the work. */
  @IsOptional()
  @Transform(blankToUndefined)
  @IsUUID()
  relieverEmployeeId?: string;

  /** The head of department who approves first. Defaults to the applicant's line manager. */
  @IsOptional()
  @Transform(blankToUndefined)
  @IsUUID()
  approverEmployeeId?: string;
}

export class LeaveDecisionDto {
  @IsIn(Object.values(LeaveDecision), { message: "decision must be APPROVE or REJECT" })
  decision!: string;

  /** Shown to the applicant. Required when rejecting. */
  @IsOptional()
  @IsString()
  @MaxLength(L.noteMax)
  note?: string;
}

export class LeaveNoteDto {
  @Transform(trim)
  @IsString()
  @Length(2, L.noteMax, { message: "Write a short note" })
  note!: string;
}

export class LeaveCancelDto {
  @IsOptional()
  @IsString()
  @MaxLength(L.noteMax)
  note?: string;
}

export class MyLeaveQuery {
  @IsOptional() @IsIn(["open", "closed", "all"]) state?: string;
  @IsOptional() @Matches(/^\d{4}$/) year?: string;
  @IsOptional() @IsString() cursor?: string;
  @IsOptional() @Matches(/^\d{1,3}$/) limit?: string;
}

export class LeaveYearQuery {
  @IsOptional() @Matches(/^\d{4}$/) year?: string;
}

export class LeaveApprovalsQuery {
  @IsOptional() @IsString() cursor?: string;
  @IsOptional() @Matches(/^\d{1,3}$/) limit?: string;
}

export class LeaveCalendarQuery {
  @Matches(DATE, { message: "from must be a date like 2026-11-01" }) from!: string;
  @Matches(DATE, { message: "to must be a date like 2026-11-30" }) to!: string;
  @IsOptional() @IsUUID() branchId?: string;
  @IsOptional() @IsUUID() departmentId?: string;
}

const STATUS_FILTER = new RegExp(`^(ALL|OPEN|(${Object.values(LeaveStatus).join("|")})(,(${Object.values(LeaveStatus).join("|")}))*)$`);

export class AdminLeaveQuery {
  /** A status, several separated by commas, OPEN (awaiting a decision) or ALL. */
  @IsOptional() @Matches(STATUS_FILTER, { message: "status must be a leave status, a comma-separated list, OPEN or ALL" }) status?: string;
  @IsOptional() @IsIn(Object.values(LeaveType)) type?: string;
  @IsOptional() @IsUUID() branchId?: string;
  @IsOptional() @IsString() @MaxLength(100) q?: string;
  /** Leave overlapping this range (YYYY-MM-DD, either end optional). */
  @IsOptional() @Matches(DATE) dateFrom?: string;
  @IsOptional() @Matches(DATE) dateTo?: string;
  @IsOptional() @IsString() cursor?: string;
  @IsOptional() @Matches(/^\d{1,3}$/) limit?: string;
}

export class LeaveSummaryQuery {
  @IsOptional() @IsUUID() branchId?: string;
}

export class BalancesQuery {
  @IsUUID() userId!: string;
  @IsOptional() @Matches(/^\d{4}$/) year?: string;
}

export class EntitlementDto {
  @IsUUID() userId!: string;
  @IsInt() @Min(2020) @Max(2100) year!: number;
  @IsIn(Object.values(LeaveType).filter((t) => t !== LeaveType.UNPAID), { message: "Choose a leave type that keeps a balance" }) type!: string;

  @IsNumber({}, { message: "days must be a number" })
  @Min(0)
  @Max(L.maxEntitlementDays)
  days!: number;

  @Transform(trim)
  @IsString()
  @Length(3, 300, { message: "Say why this entitlement differs from the policy (carried forward, joined mid-year…)" })
  note!: string;
}

export class HolidayDto {
  @Matches(DATE, { message: "Each holiday needs a date like 2026-12-16" }) date!: string;
  @Transform(trim) @IsString() @Length(2, 80) name!: string;
}

export class LeaveSettingsDto {
  /** 0 = Sunday … 6 = Saturday. */
  @IsArray()
  @ArrayMaxSize(3, { message: "At most three weekly holidays" })
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  weekendDays!: number[];

  @IsArray()
  @ArrayMaxSize(60)
  @ValidateNested({ each: true })
  @Type(() => HolidayDto)
  holidays!: HolidayDto[];
}
