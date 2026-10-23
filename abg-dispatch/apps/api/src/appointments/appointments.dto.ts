import { Transform } from "class-transformer";
import { ArrayMaxSize, IsArray, IsBoolean, IsIn, IsISO8601, IsOptional, IsString, IsUUID, Length, Matches, MaxLength } from "class-validator";
import { APPOINTMENT_DURATIONS, APPOINTMENT_LIMITS, AppointmentPurpose, AppointmentStatus, MeetingMode } from "@abg-dispatch/shared";

const L = APPOINTMENT_LIMITS;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const trim = ({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value);
const blankToUndefined = ({ value }: { value: unknown }) => (value === "" || value === null ? undefined : typeof value === "string" ? value.trim() : value);

/** POST /appointments — ask for a meeting. */
export class CreateAppointmentDto {
  /** The person asked: the MD, the Chairman or a head of department. */
  @IsUUID("4", { message: "Choose who you would like to meet" })
  hostUserId!: string;

  @Transform(trim)
  @IsString()
  @Length(L.subjectMin, L.subjectMax, { message: `Give the meeting a short subject (${L.subjectMin}–${L.subjectMax} characters)` })
  subject!: string;

  @IsIn(Object.values(AppointmentPurpose), { message: "Choose what the meeting is about" })
  purpose!: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(L.agendaMax)
  agenda?: string;

  @IsIn(Object.values(MeetingMode), { message: "Choose in person, video or phone" })
  mode!: string;

  @Transform(({ value }) => (typeof value === "string" ? Number(value) : value))
  @IsIn([...APPOINTMENT_DURATIONS], { message: `Choose a length of ${APPOINTMENT_DURATIONS.join(", ")} minutes` })
  durationMinutes!: number;

  @IsISO8601({ strict: true }, { message: "preferredAt must be a date and time, e.g. 2026-11-02T11:00:00+06:00" })
  preferredAt!: string;

  @IsOptional()
  @Transform(blankToUndefined)
  @IsISO8601({ strict: true }, { message: "alternativeAt must be a date and time" })
  alternativeAt?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(L.maxAttendees, { message: `List at most ${L.maxAttendees} colleagues joining you` })
  @IsString({ each: true })
  @MaxLength(L.attendeeNameMax, { each: true })
  attendees?: string[];

  @IsOptional()
  @IsBoolean()
  urgent?: boolean;
}

/** Confirm at the preferred time (default), the alternative, or another time. */
export class ConfirmAppointmentDto {
  @IsOptional()
  @Transform(blankToUndefined)
  @IsISO8601({ strict: true }, { message: "at must be a date and time" })
  at?: string;

  @IsOptional()
  @Transform(blankToUndefined)
  @IsString()
  @MaxLength(L.locationMax)
  location?: string;

  @IsOptional()
  @IsString()
  @MaxLength(L.noteMax)
  note?: string;
}

export class ProposeAppointmentDto {
  @IsISO8601({ strict: true }, { message: "Choose the new date and time" })
  at!: string;

  @IsOptional()
  @Transform(blankToUndefined)
  @IsString()
  @MaxLength(L.locationMax)
  location?: string;

  @IsOptional()
  @IsString()
  @MaxLength(L.noteMax)
  note?: string;
}

/** Declining and cancelling say why; completing takes an optional note. */
export class AppointmentReasonDto {
  @IsOptional()
  @IsString()
  @MaxLength(L.noteMax)
  note?: string;
}

export class AppointmentNoteDto {
  @Transform(trim)
  @IsString()
  @Length(2, L.noteMax, { message: "Write a short note" })
  note!: string;
}

export class HostsQuery {
  @IsOptional() @IsString() @MaxLength(80) q?: string;
}

export class MyAppointmentsQuery {
  @IsOptional() @IsIn(["open", "closed", "all"]) state?: string;
  @IsOptional() @IsString() cursor?: string;
  @IsOptional() @Matches(/^\d{1,3}$/) limit?: string;
}

const STATUS_FILTER = new RegExp(`^(ALL|OPEN|(${Object.values(AppointmentStatus).join("|")})(,(${Object.values(AppointmentStatus).join("|")}))*)$`);

/** The host side's list: everything asked of the caller (or, for the executive office, of the MD and the Chairman). */
export class DeskQuery {
  @IsOptional() @Matches(STATUS_FILTER, { message: "status must be an appointment status, a comma-separated list, OPEN or ALL" }) status?: string;
  @IsOptional() @IsUUID() hostUserId?: string;
  @IsOptional() @IsString() @MaxLength(100) q?: string;
  @IsOptional() @IsString() cursor?: string;
  @IsOptional() @Matches(/^\d{1,3}$/) limit?: string;
}

export class DiaryQuery {
  @Matches(DATE, { message: "from must be a date like 2026-11-02" }) from!: string;
  @Matches(DATE, { message: "to must be a date like 2026-11-08" }) to!: string;
  @IsOptional() @IsUUID() hostUserId?: string;
}
