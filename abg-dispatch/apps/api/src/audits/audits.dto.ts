import { Transform } from "class-transformer";
import { ArrayMaxSize, IsArray, IsIn, IsInt, IsOptional, IsString, IsUUID, Length, Matches, Max, MaxLength, Min } from "class-validator";
import { AUDIT_LIMITS, AuditRating, AuditStatus, AuditType, FindingSeverity } from "@abg-dispatch/shared";

const L = AUDIT_LIMITS;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const trim = ({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value);
const blankToUndefined = ({ value }: { value: unknown }) => (value === "" || value === null ? undefined : typeof value === "string" ? value.trim() : value);

/** POST /admin/audits — plan an audit. */
export class CreateAuditDto {
  @Transform(trim)
  @IsString()
  @Length(L.titleMin, L.titleMax, { message: `Give the audit a short title (${L.titleMin}–${L.titleMax} characters)` })
  title!: string;

  @IsIn(Object.values(AuditType), { message: "Choose the type of audit" })
  type!: string;

  @IsUUID("4", { message: "Choose the office being audited" })
  branchId!: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(L.scopeMax)
  scope?: string;

  /** The outside body or firm, e.g. "Bureau Veritas". */
  @IsOptional()
  @Transform(blankToUndefined)
  @IsString()
  @MaxLength(L.bodyMax)
  externalBody?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(L.teamMax, { message: `List at most ${L.teamMax} auditors` })
  @IsString({ each: true })
  @MaxLength(L.teamNameMax, { each: true })
  team?: string[];

  /** Who runs it for the group; defaults to the caller. Must be able to manage audits. */
  @IsOptional()
  @Transform(blankToUndefined)
  @IsUUID()
  leadUserId?: string;

  @Matches(DATE, { message: "plannedStart must be a date like 2026-11-09" })
  plannedStart!: string;

  @Matches(DATE, { message: "plannedEnd must be a date like 2026-11-10" })
  plannedEnd!: string;
}

/** POST /audits/:id/findings — what the auditors found. */
export class CreateFindingDto {
  @Transform(trim)
  @IsString()
  @Length(L.findingTitleMin, L.findingTitleMax, { message: `Describe the finding in a line (${L.findingTitleMin}–${L.findingTitleMax} characters)` })
  title!: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(L.findingDetailMax)
  detail?: string;

  @IsIn(Object.values(FindingSeverity), { message: "Choose Critical, Major, Minor or Observation" })
  severity!: string;

  @IsOptional()
  @Transform(blankToUndefined)
  @IsString()
  @MaxLength(L.clauseMax)
  clause?: string;

  @IsOptional()
  @Transform(blankToUndefined)
  @IsString()
  @MaxLength(L.clauseMax)
  area?: string;

  @IsOptional()
  @Transform(blankToUndefined)
  @IsString()
  @MaxLength(L.findingDetailMax)
  recommendation?: string;

  /** Who fixes it. Required unless the finding is an observation. */
  @IsOptional()
  @Transform(blankToUndefined)
  @IsUUID()
  ownerUserId?: string;

  /** Defaults by severity (7, 30 or 60 days). */
  @IsOptional()
  @Transform(blankToUndefined)
  @Matches(DATE, { message: "dueDate must be a date like 2026-12-01" })
  dueDate?: string;
}

export class CompleteFieldworkDto {
  @IsIn(Object.values(AuditRating), { message: "Choose the overall result" })
  rating!: string;

  @IsOptional()
  @IsInt({ message: "The score is a whole number from 0 to 100" })
  @Min(0)
  @Max(100)
  score?: number;

  @Transform(trim)
  @IsString()
  @Length(3, L.findingDetailMax, { message: "Write the auditors' conclusion in a sentence or two" })
  conclusion!: string;
}

export class SubmitFindingDto {
  @Transform(trim)
  @IsString()
  @Length(L.reasonMin, L.findingDetailMax, { message: "Say what was done to fix it" })
  response!: string;
}

export class ReassignFindingDto {
  @IsUUID("4", { message: "Choose who fixes it" })
  ownerUserId!: string;

  @IsOptional()
  @Transform(blankToUndefined)
  @Matches(DATE, { message: "dueDate must be a date like 2026-12-01" })
  dueDate?: string;
}

export class AuditReasonDto {
  @IsOptional()
  @IsString()
  @MaxLength(L.noteMax)
  note?: string;
}

export class AuditNoteDto {
  @Transform(trim)
  @IsString()
  @Length(2, L.noteMax, { message: "Write a short note" })
  note!: string;
}

const STATUS_FILTER = new RegExp(`^(ALL|OPEN|(${Object.values(AuditStatus).join("|")})(,(${Object.values(AuditStatus).join("|")}))*)$`);

export class AdminAuditsQuery {
  @IsOptional() @Matches(STATUS_FILTER, { message: "status must be an audit status, a comma-separated list, OPEN or ALL" }) status?: string;
  @IsOptional() @IsIn(Object.values(AuditType)) type?: string;
  @IsOptional() @IsUUID() branchId?: string;
  @IsOptional() @IsString() @MaxLength(100) q?: string;
  @IsOptional() @IsString() cursor?: string;
  @IsOptional() @Matches(/^\d{1,3}$/) limit?: string;
}

export class AuditSummaryQuery {
  @IsOptional() @IsUUID() branchId?: string;
}

export class MyActionsQuery {
  @IsOptional() @IsIn(["open", "closed", "all"]) state?: string;
}
