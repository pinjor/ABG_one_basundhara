import { Transform } from "class-transformer";
import { IsBoolean, IsIn, IsOptional, IsString, IsUUID, Length, Matches, MaxLength } from "class-validator";
import { INCIDENT_LIMITS, IncidentCategory, IncidentGroup, IncidentResolution, IncidentSeverity, IncidentStatus } from "@abg-dispatch/shared";

const L = INCIDENT_LIMITS;
/** Multipart fields and query strings arrive as strings; empty means "not given". */
const blankToUndefined = ({ value }: { value: unknown }) => (value === "" || value === null ? undefined : value);
/** "true" / "1" / true → true; "false" / "0" / false → false; anything else is left for the validator. */
const toBoolean = ({ value }: { value: unknown }) => {
  if (value === true || value === "true" || value === "1") return true;
  if (value === false || value === "false" || value === "0") return false;
  return value === "" || value === null ? undefined : value;
};

/** Fields of the multipart report form (photos travel in the `photos` file field). */
export class ReportIncidentDto {
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @Length(L.titleMin, L.titleMax, { message: `Give a short title (${L.titleMin}–${L.titleMax} characters)` })
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(L.descriptionMax)
  description?: string;

  /** Optional: the group is derived from the sub-category; if sent, it must match. */
  @IsOptional()
  @Transform(blankToUndefined)
  @IsIn(Object.values(IncidentGroup), { message: "Choose one of the four groups" })
  group?: string;

  @IsIn(Object.values(IncidentCategory), { message: "Choose what kind of problem this is" })
  category!: string;

  @IsOptional()
  @Transform(blankToUndefined)
  @IsIn(Object.values(IncidentSeverity), { message: "Severity must be Critical, High, Medium or Low" })
  severity?: string;

  /** Defaults to the reporter's own office. */
  @IsOptional()
  @Transform(blankToUndefined)
  @IsUUID()
  branchId?: string;

  @IsOptional()
  @Transform(blankToUndefined)
  @IsUUID()
  locationId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(L.locationDetailMax)
  locationDetail?: string;

  /** Hide the reporter's identity from everyone handling the report. */
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  anonymous?: boolean;

  /** Head office only, reporter hidden. Always on for misconduct, whatever is sent. */
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  confidential?: boolean;
}

export class IncidentStatusDto {
  @IsIn(Object.values(IncidentStatus), { message: "Status must be ACKNOWLEDGED, UNDER_INVESTIGATION or CLOSED" })
  status!: string;

  /** Required when closing. */
  @IsOptional()
  @IsIn(Object.values(IncidentResolution), { message: "Resolution must be RESOLVED, NO_ACTION_NEEDED, DUPLICATE or REFERRED" })
  resolution?: string;

  /** Shown to the reporter. Required for every resolution except RESOLVED. */
  @IsOptional()
  @IsString()
  @MaxLength(L.noteMax)
  note?: string;
}

export class IncidentNoteDto {
  @IsString()
  @Length(2, L.noteMax, { message: "Write a short update for the reporter" })
  note!: string;
}

export class IncidentDetailsDto {
  @IsOptional()
  @IsIn(Object.values(IncidentGroup))
  group?: string;

  @IsOptional()
  @IsIn(Object.values(IncidentCategory))
  category?: string;

  @IsOptional()
  @IsIn(Object.values(IncidentSeverity))
  severity?: string;

  @IsOptional()
  @IsBoolean()
  confidential?: boolean;
}

export class MyIncidentsQuery {
  @IsOptional() @IsIn(["open", "closed", "all"]) state?: string;
  @IsOptional() @Transform(blankToUndefined) @IsIn(Object.values(IncidentStatus)) status?: string;
  @IsOptional() @IsString() cursor?: string;
  @IsOptional() @Matches(/^\d{1,3}$/) limit?: string;
}

export class AdminIncidentsQuery {
  @IsOptional() @Transform(blankToUndefined) @IsIn([...Object.values(IncidentStatus), "OPEN", "ALL"]) status?: string;
  @IsOptional() @Transform(blankToUndefined) @IsIn(Object.values(IncidentGroup)) group?: string;
  @IsOptional() @Transform(blankToUndefined) @IsUUID() branchId?: string;
  @IsOptional() @Transform(blankToUndefined) @IsIn(Object.values(IncidentCategory)) category?: string;
  @IsOptional() @Transform(blankToUndefined) @IsIn(Object.values(IncidentSeverity)) severity?: string;
  @IsOptional() @Transform(blankToUndefined) @IsIn(Object.values(IncidentResolution)) resolution?: string;
  /** "true": confidential reports only (head office); "false": leave them out. */
  @IsOptional() @Transform(blankToUndefined) @IsIn(["true", "false"]) confidential?: string;
  @IsOptional() @IsString() @MaxLength(100) q?: string;
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) dateFrom?: string;
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) dateTo?: string;
  @IsOptional() @IsString() cursor?: string;
  @IsOptional() @Matches(/^\d{1,3}$/) limit?: string;
}

export class IncidentSummaryQuery {
  @IsOptional() @Transform(blankToUndefined) @IsUUID() branchId?: string;
  /** Narrows every figure to one group (the portal's group tabs). */
  @IsOptional() @Transform(blankToUndefined) @IsIn(Object.values(IncidentGroup)) group?: string;
}

export class IncidentPhotoUploadDto {
  @IsOptional()
  @IsString()
  @MaxLength(L.noteMax)
  note?: string;
}
