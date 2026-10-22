import { Transform } from "class-transformer";
import { ArrayMaxSize, IsArray, IsBoolean, IsIn, IsISO8601, IsOptional, IsString, IsUUID, Length, Matches, MaxLength, ValidateIf } from "class-validator";
import { NOTICE_LIMITS, NOTICE_TEXT_LIMITS, NoticeAudience, NoticeCategory, NoticeChannel, NoticeReceiptState, NoticeStatus } from "@abg-dispatch/shared";

const L = NOTICE_LIMITS;
const T = NOTICE_TEXT_LIMITS;

/** Multipart fields arrive as strings; JSON bodies as real values. Both are accepted. */
const trim = ({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value);
const blankToUndefined = ({ value }: { value: unknown }) => (value === "" || value === null ? undefined : value);
const toBool = ({ value }: { value: unknown }) => {
  if (value === undefined || value === null || value === "") return undefined;
  if (value === true || value === "true" || value === "1" || value === "on") return true;
  if (value === false || value === "false" || value === "0" || value === "off") return false;
  return value;
};
/** Office ids as an array, a JSON array string, repeated multipart fields or "a,b". */
const toIdList = ({ value }: { value: unknown }) => {
  if (value === undefined || value === null || value === "") return undefined;
  const parts = (v: unknown): unknown[] => {
    if (Array.isArray(v)) return v.flatMap(parts);
    if (typeof v !== "string") return [v];
    const t = v.trim();
    if (t.startsWith("[")) {
      try {
        const parsed: unknown = JSON.parse(t);
        return Array.isArray(parsed) ? parsed : [t];
      } catch {
        return [t];
      }
    }
    return t.split(",").map((s) => s.trim()).filter(Boolean);
  };
  return parts(value);
};
/** Keeps paragraphs: trims the ends and normalises line breaks. */
const tidyBody = ({ value }: { value: unknown }) => (typeof value === "string" ? value.replace(/\r\n?/g, "\n").trim() : value);

/** Fields of the multipart "post a notice" form (the PDF travels in the `attachment` file field). */
export class CreateNoticeDto {
  @Transform(trim)
  @IsString()
  @Length(L.titleMin, L.titleMax, { message: `Give the notice a title (${L.titleMin}–${L.titleMax} characters)` })
  title!: string;

  @Transform(tidyBody)
  @IsString()
  @Length(T.bodyMin, L.bodyMax, { message: `Write the notice (${T.bodyMin}–${L.bodyMax.toLocaleString("en")} characters)` })
  body!: string;

  @IsIn(Object.values(NoticeChannel), { message: "Choose who the notice is from" })
  channel!: string;

  @IsOptional()
  @IsIn(Object.values(NoticeCategory), { message: "Choose a category" })
  category?: string;

  @IsOptional()
  @Transform(toBool)
  @IsBoolean()
  urgent?: boolean;

  @IsOptional()
  @Transform(toBool)
  @IsBoolean()
  pinned?: boolean;

  @IsOptional()
  @IsIn(Object.values(NoticeAudience), { message: "Choose who should receive the notice" })
  audience?: string;

  @IsOptional()
  @Transform(toIdList)
  @IsArray()
  @ArrayMaxSize(T.maxBranches)
  @IsUUID("4", { each: true, message: "Choose offices from the list" })
  branchIds?: string[];

  @IsOptional()
  @Transform(toBool)
  @IsBoolean()
  requiresAcknowledgement?: boolean;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(T.signedByMax)
  signedBy?: string;

  @IsOptional()
  @Transform(blankToUndefined)
  @IsISO8601({ strict: true }, { message: "Give the expiry as a date and time" })
  expiresAt?: string;

  /** true publishes at once; otherwise the notice is saved as a draft. */
  @IsOptional()
  @Transform(toBool)
  @IsBoolean()
  publish?: boolean;
}

/**
 * Changes to a notice. Drafts accept every field; once published only
 * `pinned`, `urgent` and `expiresAt` may change.
 */
export class UpdateNoticeDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @Length(L.titleMin, L.titleMax, { message: `Give the notice a title (${L.titleMin}–${L.titleMax} characters)` })
  title?: string;

  @IsOptional()
  @Transform(tidyBody)
  @IsString()
  @Length(T.bodyMin, L.bodyMax, { message: `Write the notice (${T.bodyMin}–${L.bodyMax.toLocaleString("en")} characters)` })
  body?: string;

  @IsOptional()
  @IsIn(Object.values(NoticeChannel))
  channel?: string;

  @IsOptional()
  @IsIn(Object.values(NoticeCategory))
  category?: string;

  @IsOptional()
  @Transform(toBool)
  @IsBoolean()
  urgent?: boolean;

  @IsOptional()
  @Transform(toBool)
  @IsBoolean()
  pinned?: boolean;

  @IsOptional()
  @IsIn(Object.values(NoticeAudience))
  audience?: string;

  @IsOptional()
  @Transform(toIdList)
  @IsArray()
  @ArrayMaxSize(T.maxBranches)
  @IsUUID("4", { each: true, message: "Choose offices from the list" })
  branchIds?: string[];

  @IsOptional()
  @Transform(toBool)
  @IsBoolean()
  requiresAcknowledgement?: boolean;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(T.signedByMax)
  signedBy?: string;

  /** An ISO date-time, or null to remove the expiry. */
  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsISO8601({ strict: true }, { message: "Give the expiry as a date and time" })
  expiresAt?: string | null;

  /** Drafts only: drop the attached PDF. */
  @IsOptional()
  @Transform(toBool)
  @IsBoolean()
  removeAttachment?: boolean;
}

export class NoticesQuery {
  @IsOptional() @IsIn(Object.values(NoticeCategory)) category?: string;
  @IsOptional() @IsIn(Object.values(NoticeChannel)) channel?: string;
  @IsOptional() @IsString() @MaxLength(100) q?: string;
  @IsOptional() @IsIn(["true", "false"]) unread?: string;
  @IsOptional() @IsString() @MaxLength(400) cursor?: string;
  @IsOptional() @Matches(/^\d{1,3}$/) limit?: string;
}

export class AdminNoticesQuery {
  @IsOptional() @IsIn([...Object.values(NoticeStatus), "ALL"]) status?: string;
  @IsOptional() @IsIn(Object.values(NoticeChannel)) channel?: string;
  @IsOptional() @IsIn(Object.values(NoticeCategory)) category?: string;
  @IsOptional() @IsString() @MaxLength(100) q?: string;
  @IsOptional() @IsString() @MaxLength(400) cursor?: string;
  @IsOptional() @Matches(/^\d{1,3}$/) limit?: string;
}

export class NoticeReceiptsQuery {
  @IsOptional() @IsIn(Object.values(NoticeReceiptState)) state?: string;
  @IsOptional() @IsString() @MaxLength(100) q?: string;
  @IsOptional() @IsString() @MaxLength(400) cursor?: string;
  @IsOptional() @Matches(/^\d{1,3}$/) limit?: string;
}
