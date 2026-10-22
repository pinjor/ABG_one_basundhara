import { Transform } from "class-transformer";
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, IsUUID, Length, Matches, Max, MaxLength, Min } from "class-validator";
import { LICENCE_LIMITS, LicenceCategory, LicenceFilter, RENEWAL_STAGES } from "@abg-dispatch/shared";

const L = LICENCE_LIMITS;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const DATE_MESSAGE = "Use a date written as YYYY-MM-DD";

const trim = ({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value);
/** Multipart fields arrive as strings; empty means "not given". */
const blankToUndefined = ({ value }: { value: unknown }) => (value === "" || value === null ? undefined : typeof value === "string" ? value.trim() : value);
/** Whole numbers sent either as JSON numbers or as multipart strings. */
const toInt = ({ value }: { value: unknown }) => {
  if (value === "" || value === null || value === undefined) return value === null ? null : undefined;
  if (typeof value === "number") return value;
  const n = Number(String(value).replace(/[,\s]/g, ""));
  return Number.isFinite(n) ? n : value;
};

export class CreateLicenceDto {
  @Transform(trim)
  @IsString()
  @Length(2, L.nameMax, { message: `Give the licence a name (2–${L.nameMax} characters)` })
  name!: string;

  @Transform(trim)
  @IsString()
  @Length(1, L.numberMax, { message: `Enter the licence number as printed (up to ${L.numberMax} characters)` })
  licenceNumber!: string;

  @IsIn(Object.values(LicenceCategory), { message: "Choose what kind of licence this is" })
  category!: string;

  @Transform(trim)
  @IsString()
  @Length(2, L.authorityMax, { message: `Name the issuing authority (2–${L.authorityMax} characters)` })
  issuingAuthority!: string;

  @IsUUID("4", { message: "Choose the office this licence covers" })
  branchId!: string;

  /** The person responsible for keeping it valid. */
  @IsOptional()
  @Transform(blankToUndefined)
  @IsUUID("4", { message: "Choose the owner from the list" })
  ownerUserId?: string;

  @IsOptional()
  @Transform(blankToUndefined)
  @Matches(DATE, { message: `Issue date: ${DATE_MESSAGE}` })
  issuedAt?: string;

  @Matches(DATE, { message: `Expiry date: ${DATE_MESSAGE}` })
  expiresAt!: string;

  @IsOptional()
  @Transform(toInt)
  @IsInt({ message: "Renewal window must be a whole number of days" })
  @Min(L.minLeadDays, { message: `Start renewals at least ${L.minLeadDays} days before expiry` })
  @Max(L.maxLeadDays, { message: `Renewal window can be at most ${L.maxLeadDays} days` })
  renewalLeadDays?: number;

  /** Taka, whole units. */
  @IsOptional()
  @Transform(toInt)
  @IsInt({ message: "Renewal fee must be whole taka" })
  @Min(0, { message: "Renewal fee cannot be negative" })
  @Max(L.feeMax, { message: "Renewal fee looks too large" })
  renewalFee?: number;

  @IsOptional()
  @IsString()
  @MaxLength(L.noteMax)
  notes?: string;
}

export class UpdateLicenceDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @Length(2, L.nameMax, { message: `Give the licence a name (2–${L.nameMax} characters)` })
  name?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @Length(1, L.numberMax, { message: `Enter the licence number as printed (up to ${L.numberMax} characters)` })
  licenceNumber?: string;

  @IsOptional()
  @IsIn(Object.values(LicenceCategory), { message: "Choose what kind of licence this is" })
  category?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @Length(2, L.authorityMax, { message: `Name the issuing authority (2–${L.authorityMax} characters)` })
  issuingAuthority?: string;

  @IsOptional()
  @IsUUID("4", { message: "Choose the office this licence covers" })
  branchId?: string;

  /** null clears the owner. */
  @IsOptional()
  @IsUUID("4", { message: "Choose the owner from the list" })
  ownerUserId?: string | null;

  /** null clears the issue date. */
  @IsOptional()
  @Matches(DATE, { message: `Issue date: ${DATE_MESSAGE}` })
  issuedAt?: string | null;

  @IsOptional()
  @Matches(DATE, { message: `Expiry date: ${DATE_MESSAGE}` })
  expiresAt?: string;

  @IsOptional()
  @Transform(toInt)
  @IsInt({ message: "Renewal window must be a whole number of days" })
  @Min(L.minLeadDays, { message: `Start renewals at least ${L.minLeadDays} days before expiry` })
  @Max(L.maxLeadDays, { message: `Renewal window can be at most ${L.maxLeadDays} days` })
  renewalLeadDays?: number;

  /** null clears the fee. */
  @IsOptional()
  @Transform(toInt)
  @IsInt({ message: "Renewal fee must be whole taka" })
  @Min(0, { message: "Renewal fee cannot be negative" })
  @Max(L.feeMax, { message: "Renewal fee looks too large" })
  renewalFee?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(L.noteMax)
  notes?: string | null;

  /** false retires the licence from the register (no longer required); it keeps its history. */
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class RenewalStageDto {
  @IsIn(RENEWAL_STAGES, { message: "Choose a renewal stage" })
  stage!: string;

  /** Required when moving the renewal back. */
  @IsOptional()
  @IsString()
  @MaxLength(L.noteMax)
  note?: string;
}

/** JSON, or multipart with an optional scanned copy of the new licence in `file`. */
export class RenewLicenceDto {
  @Transform(trim)
  @Matches(DATE, { message: `New expiry date: ${DATE_MESSAGE}` })
  newExpiresAt!: string;

  @IsOptional()
  @Transform(blankToUndefined)
  @Matches(DATE, { message: `Issue date: ${DATE_MESSAGE}` })
  issuedAt?: string;

  /** What the renewal cost, if it changed. */
  @IsOptional()
  @Transform(toInt)
  @IsInt({ message: "Renewal fee must be whole taka" })
  @Min(0, { message: "Renewal fee cannot be negative" })
  @Max(L.feeMax, { message: "Renewal fee looks too large" })
  renewalFee?: number;

  @IsOptional()
  @Transform(blankToUndefined)
  @IsString()
  @MaxLength(L.noteMax)
  note?: string;
}

export class LicenceNoteDto {
  @Transform(trim)
  @IsString()
  @Length(2, L.noteMax, { message: "Write a short note" })
  note!: string;
}

export class LicenceDocumentDto {
  @IsOptional()
  @Transform(blankToUndefined)
  @IsString()
  @MaxLength(L.noteMax)
  note?: string;
}

export class LicencesQuery {
  @IsOptional() @IsIn(Object.values(LicenceFilter)) state?: string;
  @IsOptional() @IsIn(Object.values(LicenceCategory)) category?: string;
  @IsOptional() @IsUUID() branchId?: string;
  @IsOptional() @IsString() @MaxLength(100) q?: string;
  @IsOptional() @IsString() @MaxLength(200) cursor?: string;
  @IsOptional() @Matches(/^\d{1,3}$/) limit?: string;
}

export class LicenceOwnersQuery {
  @IsOptional() @IsUUID() branchId?: string;
}
