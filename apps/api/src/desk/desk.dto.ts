import { IsNumber, IsOptional, IsString, Matches, MaxLength, Min, MinLength } from "class-validator";

export class CreateDeskRecordDto {
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  featureKey!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  title!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  party!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  amountBdt?: number;

  /** Feature fields as a JSON object. Parsed in the service so nested keys survive whitelist. */
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  detailsJson?: string;
}

export class DeskActionDto {
  @IsString()
  @Matches(/^(CHECK_IN|CHECK_OUT|APPROVE|REJECT)$/)
  action!: "CHECK_IN" | "CHECK_OUT" | "APPROVE" | "REJECT";
}

export class SetDeskStatusDto {
  @IsString()
  @Matches(/^[A-Z_]+$/)
  status!: string;
}
