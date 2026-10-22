import { Transform, Type } from "class-transformer";
import { IsDate, IsIn, IsInt, IsOptional, IsString, IsUUID, Length, Matches, Max, MaxLength, Min } from "class-validator";
import { BD_MOBILE_PATTERN, ID_LAST4_PATTERN, VISITOR_LIMITS, VisitPurpose, VisitStatus, normalizeBdMobile } from "@abg-dispatch/shared";

const L = VISITOR_LIMITS;
const trim = ({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value);
/** Empty strings from forms mean "not given". */
const trimOrUndefined = ({ value }: { value: unknown }) => {
  if (value === null || value === undefined) return undefined;
  if (typeof value !== "string") return value;
  const t = value.trim();
  return t === "" ? undefined : t;
};

/** What a host fills in to pre-register a visitor. */
export class InviteVisitorDto {
  @Transform(trim)
  @IsString()
  @Length(L.nameMin, L.nameMax, { message: `Enter the visitor's name (${L.nameMin}–${L.nameMax} characters)` })
  visitorName!: string;

  /** Normalised to 01XXXXXXXXX before validation; +880 and spaces are fine. */
  @Transform(({ value }) => (typeof value === "string" ? normalizeBdMobile(value) : value))
  @IsString()
  @Matches(BD_MOBILE_PATTERN, { message: "Enter a Bangladeshi mobile number, e.g. 01711 223344" })
  visitorPhone!: string;

  @IsOptional()
  @Transform(trimOrUndefined)
  @IsString()
  @MaxLength(L.companyMax)
  company?: string;

  /** Last four characters of the visitor's NID, passport or driving licence — never the whole number. */
  @IsOptional()
  @Transform(trimOrUndefined)
  @IsString()
  @Matches(ID_LAST4_PATTERN, { message: "Enter only the last 4 digits of the visitor's ID — never the full number" })
  idLast4?: string;

  @IsIn(Object.values(VisitPurpose), { message: "Choose the purpose of the visit" })
  purpose!: string;

  @IsOptional()
  @Transform(trimOrUndefined)
  @IsString()
  @MaxLength(L.purposeDetailMax)
  purposeDetail?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "Party size must be a whole number" })
  @Min(1, { message: "Party size must be at least 1" })
  @Max(L.maxPartySize, { message: `At most ${L.maxPartySize} people can share one pass` })
  partySize?: number;

  @IsOptional()
  @Transform(trimOrUndefined)
  @IsString()
  @MaxLength(L.vehicleMax)
  vehicleNumber?: string;

  /** Laptop, tools, samples — what the gate should expect to see going in and out. */
  @IsOptional()
  @Transform(trimOrUndefined)
  @IsString()
  @MaxLength(L.carryingMax)
  carrying?: string;

  /** Defaults to the host's own office. */
  @IsOptional()
  @Transform(trimOrUndefined)
  @IsUUID()
  branchId?: string;

  /** The area of the office being visited (Administration Block, Quality Lab …). */
  @IsOptional()
  @Transform(trimOrUndefined)
  @IsUUID()
  locationId?: string;

  @Type(() => Date)
  @IsDate({ message: "Give the date and time the visitor is expected" })
  expectedAt!: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  expectedUntil?: Date;

  @IsOptional()
  @Transform(trimOrUndefined)
  @IsString()
  @MaxLength(L.noteMax)
  notes?: string;
}

/** The gate registers someone who arrived without a pass; they are checked in at once. */
export class WalkInDto {
  @Transform(trim)
  @IsString()
  @Length(L.nameMin, L.nameMax, { message: `Enter the visitor's name (${L.nameMin}–${L.nameMax} characters)` })
  visitorName!: string;

  @Transform(({ value }) => (typeof value === "string" ? normalizeBdMobile(value) : value))
  @IsString()
  @Matches(BD_MOBILE_PATTERN, { message: "Enter a Bangladeshi mobile number, e.g. 01711 223344" })
  visitorPhone!: string;

  @IsOptional()
  @Transform(trimOrUndefined)
  @IsString()
  @MaxLength(L.companyMax)
  company?: string;

  @IsOptional()
  @Transform(trimOrUndefined)
  @IsString()
  @Matches(ID_LAST4_PATTERN, { message: "Enter only the last 4 digits of the visitor's ID — never the full number" })
  idLast4?: string;

  @IsIn(Object.values(VisitPurpose), { message: "Choose the purpose of the visit" })
  purpose!: string;

  @IsOptional()
  @Transform(trimOrUndefined)
  @IsString()
  @MaxLength(L.purposeDetailMax)
  purposeDetail?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "Party size must be a whole number" })
  @Min(1, { message: "Party size must be at least 1" })
  @Max(L.maxPartySize, { message: `At most ${L.maxPartySize} people can share one pass` })
  partySize?: number;

  @IsOptional()
  @Transform(trimOrUndefined)
  @IsString()
  @MaxLength(L.vehicleMax)
  vehicleNumber?: string;

  @IsOptional()
  @Transform(trimOrUndefined)
  @IsString()
  @MaxLength(L.carryingMax)
  carrying?: string;

  /** Defaults to the officer's own office; must be one they cover. */
  @IsOptional()
  @Transform(trimOrUndefined)
  @IsUUID()
  branchId?: string;

  @IsOptional()
  @Transform(trimOrUndefined)
  @IsUUID()
  locationId?: string;

  /** Expected end of the visit, if the visitor says. */
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  expectedUntil?: Date;

  @IsOptional()
  @Transform(trimOrUndefined)
  @IsString()
  @MaxLength(L.noteMax)
  notes?: string;

  /** The employee being visited, from the directory. */
  @IsOptional()
  @Transform(trimOrUndefined)
  @IsUUID()
  hostEmployeeId?: string;

  /** Only when the person being visited is not in the directory. */
  @IsOptional()
  @Transform(trimOrUndefined)
  @IsString()
  @Length(L.nameMin, L.nameMax, { message: `Enter the host's name (${L.nameMin}–${L.nameMax} characters)` })
  hostName?: string;

  @IsOptional()
  @Transform(trimOrUndefined)
  @IsString()
  @Matches(/^[A-Za-z0-9-]{1,20}$/, { message: "Badge numbers are letters, digits and dashes (up to 20)" })
  badgeNumber?: string;
}

export class CheckInDto {
  @IsOptional()
  @Transform(trimOrUndefined)
  @IsString()
  @Matches(/^[A-Za-z0-9-]{1,20}$/, { message: "Badge numbers are letters, digits and dashes (up to 20)" })
  badgeNumber?: string;
}

export class CancelVisitDto {
  @IsOptional()
  @Transform(trimOrUndefined)
  @IsString()
  @MaxLength(L.noteMax)
  reason?: string;
}

export class MyVisitsQuery {
  @IsOptional() @IsIn(["upcoming", "past"]) scope?: string;
  @IsOptional() @IsString() cursor?: string;
  @IsOptional() @Matches(/^\d{1,3}$/) limit?: string;
}

export class AdminVisitsQuery {
  @IsOptional() @IsIn([...Object.values(VisitStatus), "ALL"]) status?: string;
  @IsOptional() @IsUUID() branchId?: string;
  @IsOptional() @IsIn(Object.values(VisitPurpose)) purpose?: string;
  /** A Dhaka calendar day; defaults to today. */
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: "date must be YYYY-MM-DD" }) date?: string;
  @IsOptional() @IsString() @MaxLength(100) q?: string;
  @IsOptional() @IsString() cursor?: string;
  @IsOptional() @Matches(/^\d{1,3}$/) limit?: string;
}

export class VisitSummaryQuery {
  @IsOptional() @IsUUID() branchId?: string;
}
