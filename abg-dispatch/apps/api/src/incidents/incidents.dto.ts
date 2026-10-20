import { Transform } from "class-transformer";
import { IsBoolean, IsIn, IsOptional, IsString, IsUUID, Length, Matches, MaxLength } from "class-validator";
import { INCIDENT_LIMITS, IncidentCategory, IncidentSeverity, IncidentStatus } from "@abg-dispatch/shared";

const L = INCIDENT_LIMITS;
/** Multipart fields arrive as strings; empty means "not given". */
const blankToUndefined = ({ value }: { value: unknown }) => (value === "" || value === null ? undefined : value);

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

  @IsIn(Object.values(IncidentCategory), { message: "Choose what kind of problem this is" })
  category!: string;

  @IsOptional()
  @IsIn(Object.values(IncidentSeverity))
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
  @Transform(({ value }) => value === true || value === "true" || value === "1")
  @IsBoolean()
  anonymous?: boolean;
}

export class IncidentStatusDto {
  @IsIn(Object.values(IncidentStatus))
  status!: string;

  /** Shown to the reporter. Required when declining. */
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
  @IsIn(Object.values(IncidentSeverity))
  severity?: string;

  @IsOptional()
  @IsIn(Object.values(IncidentCategory))
  category?: string;
}

export class MyIncidentsQuery {
  @IsOptional() @IsIn(["open", "closed", "all"]) state?: string;
  @IsOptional() @IsString() cursor?: string;
  @IsOptional() @Matches(/^\d{1,3}$/) limit?: string;
}

export class AdminIncidentsQuery {
  @IsOptional() @IsIn([...Object.values(IncidentStatus), "OPEN", "ALL"]) status?: string;
  @IsOptional() @IsUUID() branchId?: string;
  @IsOptional() @IsIn(Object.values(IncidentCategory)) category?: string;
  @IsOptional() @IsIn(Object.values(IncidentSeverity)) severity?: string;
  @IsOptional() @IsString() @MaxLength(100) q?: string;
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) dateFrom?: string;
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) dateTo?: string;
  @IsOptional() @IsString() cursor?: string;
  @IsOptional() @Matches(/^\d{1,3}$/) limit?: string;
}

export class IncidentPhotoUploadDto {
  @IsOptional()
  @IsString()
  @MaxLength(L.noteMax)
  note?: string;
}
