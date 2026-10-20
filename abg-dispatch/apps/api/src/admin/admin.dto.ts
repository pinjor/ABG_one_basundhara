import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";
import {
  BranchType,
  CarrierType,
  Classification,
  EmployeeStatus,
  LocationType,
  Priority,
  RoleCode,
  SlaAudience,
  SlaStage,
  StatusView,
} from "@abg-dispatch/shared";
import { ListParcelsQuery } from "../parcels/dto/parcel.dto";

const PHONE = /^\+?[\d\s-]{10,16}$/;

export class AdminParcelsQuery extends ListParcelsQuery {
  @IsOptional() @IsUUID() originBranchId?: string;
  @IsOptional() @IsUUID() destinationBranchId?: string;
  @IsOptional() @IsUUID() departmentId?: string;
  @IsOptional() @IsUUID() senderEmployeeId?: string;
  @IsOptional() @IsUUID() receiverEmployeeId?: string;
  @IsOptional() @IsIn(Object.values(CarrierType)) carrierType?: string;
  @IsOptional() @IsUUID() carrierEmployeeId?: string;
  @IsOptional() @IsUUID() courierProviderId?: string;
  @IsOptional() @IsIn(Object.values(Classification)) classification?: string;
  @IsOptional() @IsIn(["true", "false"]) overdue?: string;
  @IsOptional() @IsIn(["true", "false"]) received?: string;
  @IsOptional() @IsIn(["createdAt", "receivedAt"]) dateField?: string;
}

export class SavedViewDto {
  @IsString() @Length(2, 60) name!: string;
  @IsObject() filters!: Record<string, string>;
}

export class AnalyticsQuery {
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) from?: string;
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) to?: string;
  @IsOptional() @IsUUID() branchId?: string;
}

export class ReportQuery extends AnalyticsQuery {
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) date?: string;
  @IsOptional() @Matches(/^\d{4}-\d{2}$/) month?: string;
  @IsOptional() @IsUUID() parcelId?: string;
  @IsOptional() @IsIn(["json", "csv"]) format?: string;
}

export class BranchDto {
  @IsString() @Length(2, 120) name!: string;
  @Matches(/^[A-Z0-9]{2,6}$/, { message: "code must be 2–6 capital letters or digits" }) code!: string;
  @IsIn(Object.values(BranchType)) type!: string;
  @IsOptional() @IsString() @MaxLength(300) address?: string;
  @IsOptional() @IsString() @MaxLength(80) city?: string;
  @IsOptional() @Matches(PHONE) phone?: string;
  @IsOptional() @IsBoolean() active?: boolean;
}

export class LocationDto {
  @IsUUID() branchId!: string;
  @IsOptional() @IsUUID() parentId?: string;
  @IsIn(Object.values(LocationType)) type!: string;
  @IsString() @Length(2, 120) name!: string;
  @IsOptional() @IsString() @MaxLength(30) code?: string;
  @IsOptional() @IsBoolean() active?: boolean;
}

export class DepartmentDto {
  @IsUUID() branchId!: string;
  @IsString() @Length(2, 120) name!: string;
  @Matches(/^[A-Z0-9-]{2,12}$/) code!: string;
  @IsOptional() @IsUUID() locationId?: string;
  @IsOptional() @IsBoolean() active?: boolean;
}

export class CategoryDto {
  @Matches(/^[A-Z0-9_]{2,40}$/) code!: string;
  @IsString() @Length(2, 80) name!: string;
  @IsOptional() @IsString() @MaxLength(300) description?: string;
  @IsOptional() @IsInt() @Min(0) @Max(999) sortOrder?: number;
  @IsOptional() @IsBoolean() active?: boolean;
}

export class EmployeeDto {
  @Matches(/^[A-Z]{2,5}-\d{3,6}$/, { message: "employeeCode must look like ABG-2041" }) employeeCode!: string;
  @IsString() @Length(2, 120) fullName!: string;
  @IsOptional() @Matches(PHONE) phone?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() @MaxLength(120) designation?: string;
  @IsUUID() branchId!: string;
  @IsOptional() @IsUUID() departmentId?: string;
  @IsOptional() @IsUUID() defaultLocationId?: string;
  @IsOptional() @IsUUID() managerId?: string;
  @IsOptional() @IsIn(Object.values(EmployeeStatus)) status?: string;
}

export class EmployeeImportDto {
  @IsString() @MinLength(10) csv!: string;
  @IsOptional() @IsBoolean() dryRun?: boolean;
}

export class RoleAssignment {
  @IsIn(Object.values(RoleCode)) role!: string;
  @IsOptional() @IsUUID() branchId?: string;
}

export class CreateUserDto {
  @IsUUID() employeeId!: string;
  @IsEmail() email!: string;
  @IsString() @MinLength(10) @MaxLength(200) password!: string;
  @IsArray() @ArrayMaxSize(10) @ValidateNested({ each: true }) @Type(() => RoleAssignment) roles!: RoleAssignment[];
}

export class SetRolesDto {
  @IsArray() @ArrayMaxSize(10) @ValidateNested({ each: true }) @Type(() => RoleAssignment) roles!: RoleAssignment[];
}

export class ResetPasswordDto {
  @IsString() @MinLength(10) @MaxLength(200) password!: string;
}

export class SlaPolicyDto {
  @IsString() @Length(3, 120) name!: string;
  @IsIn(Object.values(SlaStage)) stage!: string;
  @IsInt() @Min(0) @Max(60 * 24 * 14) thresholdMinutes!: number;
  @IsArray() @IsIn(Object.values(SlaAudience), { each: true }) audience!: string[];
  @IsOptional() @IsBoolean() marksOverdue?: boolean;
  @IsOptional() @IsBoolean() active?: boolean;
  @IsOptional() @IsIn(Object.values(Priority)) priority?: string | null;
  @IsOptional() @IsIn(Object.values(Classification)) classification?: string | null;
  @IsOptional() @IsUUID() categoryId?: string | null;
  @IsOptional() @IsUUID() originBranchId?: string | null;
  @IsOptional() @IsUUID() destinationBranchId?: string | null;
  @IsOptional() @IsIn(Object.values(CarrierType)) deliveryMethod?: string | null;
}

export class CourierProviderDto {
  @IsOptional() @IsString() @Length(2, 80) name?: string;
  @IsOptional() @IsBoolean() enabled?: boolean;
  @IsOptional() @IsBoolean() apiEnabled?: boolean;
  @IsOptional() @IsBoolean() webhookEnabled?: boolean;
  @IsOptional() @IsString() @MaxLength(300) trackingUrlTemplate?: string;
  @IsOptional() @IsObject() config?: Record<string, unknown>;
}

export class AuditQuery {
  @IsOptional() @IsString() @MaxLength(80) action?: string;
  @IsOptional() @IsString() @MaxLength(40) objectType?: string;
  @IsOptional() @IsString() @MaxLength(80) objectId?: string;
  @IsOptional() @IsUUID() actorUserId?: string;
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) dateFrom?: string;
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) dateTo?: string;
  @IsOptional() @IsString() cursor?: string;
  @IsOptional() @IsString() limit?: string;
}

export { StatusView };
