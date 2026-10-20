import { Type } from "class-transformer";
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  MaxLength,
  ValidateIf,
  ValidateNested,
} from "class-validator";
import {
  CarrierType,
  Classification,
  ExceptionCode,
  ExternalStatus,
  ParcelStatus,
  Priority,
  ReceiverType,
  StatusView,
} from "@abg-dispatch/shared";

const PHONE = /^\+?[\d\s-]{10,16}$/;

export class GuestCarrierInput {
  @IsString()
  @Length(2, 120)
  fullName!: string;

  @Matches(PHONE, { message: "phone must be a valid mobile number" })
  phone!: string;

  @IsOptional() @IsString() @MaxLength(120) company?: string;
  @IsOptional() @IsString() @MaxLength(40) idType?: string;
  @IsOptional() @IsString() @MaxLength(60) idReference?: string;
  @IsOptional() @IsString() @MaxLength(40) vehicleNumber?: string;
  @IsOptional() @IsString() @MaxLength(500) notes?: string;
}

export class ExternalCourierInput {
  @IsUUID()
  providerId!: string;

  @IsOptional() @IsString() @MaxLength(80) trackingNumber?: string;
  @IsOptional() @IsString() @MaxLength(80) bookingReference?: string;
  @IsOptional() @IsString() @MaxLength(120) riderName?: string;
  @IsOptional() @Matches(PHONE, { message: "riderPhone must be a valid mobile number" }) riderPhone?: string;
  @IsOptional() @IsString() @MaxLength(80) pickupReference?: string;
  @IsOptional() @IsString() @MaxLength(500) trackingUrl?: string;
  @IsOptional() @IsDateString() expectedDeliveryAt?: string;
  @IsOptional() @IsString() @MaxLength(500) notes?: string;
}

export class CarrierInput {
  @IsIn(Object.values(CarrierType))
  type!: CarrierType;

  @ValidateIf((o: CarrierInput) => o.type === CarrierType.INTERNAL_EMPLOYEE)
  @IsUUID()
  employeeId?: string;

  @ValidateIf((o: CarrierInput) => o.type === CarrierType.GUEST_PERSON)
  @ValidateNested()
  @Type(() => GuestCarrierInput)
  guest?: GuestCarrierInput;

  @ValidateIf((o: CarrierInput) => o.type === CarrierType.EXTERNAL_COURIER)
  @ValidateNested()
  @Type(() => ExternalCourierInput)
  external?: ExternalCourierInput;
}

export class ExternalReceiverInput {
  @IsString() @Length(2, 120) name!: string;
  @Matches(PHONE, { message: "phone must be a valid mobile number" }) phone!: string;
  @IsOptional() @IsString() @MaxLength(160) organization?: string;
  @IsString() @Length(5, 500) address!: string;
}

export class CreateParcelDto {
  @IsString()
  @Length(3, 140, { message: "Title must be 3–140 characters" })
  title!: string;

  @IsString()
  @Length(3, 2000, { message: "Description must be 3–2000 characters" })
  description!: string;

  @IsUUID()
  categoryId!: string;

  @IsIn(Object.values(Classification))
  classification!: Classification;

  @IsIn(Object.values(Priority))
  priority!: Priority;

  @IsIn(Object.values(CarrierType))
  deliveryMethod!: CarrierType;

  /** Send on behalf of another employee. Defaults to the signed-in employee. */
  @IsOptional() @IsUUID() senderEmployeeId?: string;
  @IsOptional() @IsUUID() originLocationId?: string;

  @IsIn(Object.values(ReceiverType))
  receiverType!: ReceiverType;

  @ValidateIf((o: CreateParcelDto) => o.receiverType === ReceiverType.EMPLOYEE)
  @IsUUID()
  receiverEmployeeId?: string;

  @ValidateIf((o: CreateParcelDto) => o.receiverType === ReceiverType.DEPARTMENT)
  @IsUUID()
  receiverDepartmentId?: string;

  @ValidateIf((o: CreateParcelDto) => o.receiverType === ReceiverType.BRANCH || o.destinationBranchId !== undefined)
  @IsUUID()
  destinationBranchId?: string;

  @IsOptional() @IsUUID() destinationLocationId?: string;

  @ValidateIf((o: CreateParcelDto) => o.receiverType === ReceiverType.EXTERNAL)
  @ValidateNested()
  @Type(() => ExternalReceiverInput)
  externalReceiver?: ExternalReceiverInput;

  @IsOptional() @IsDateString() expectedDeliveryAt?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => CarrierInput)
  carrier?: CarrierInput;

  @IsOptional() @IsBoolean() saveAsDraft?: boolean;
}

/** Where and when an action happened, as reported by the device. */
export class ActionContextDto {
  @IsOptional() @IsUUID() locationId?: string;
  @IsOptional() @IsLatitude() latitude?: number;
  @IsOptional() @IsLongitude() longitude?: number;
  @IsOptional() @IsDateString() deviceTimestamp?: string;
  @IsOptional() @IsString() @MaxLength(1000) notes?: string;
}

export class AssignCarrierDto extends CarrierInput {
  @IsOptional() @IsString() @Length(3, 500) reason?: string;
}

export class ConfirmHandoverDto extends ActionContextDto {
  @IsIn(["SENDER_APP", "SENDER_PIN", "DISPATCH_OFFICER"])
  method!: "SENDER_APP" | "SENDER_PIN" | "DISPATCH_OFFICER";

  @ValidateIf((o: ConfirmHandoverDto) => o.method === "SENDER_PIN")
  @Matches(/^\d{6}$/, { message: "pin must be the sender's 6-digit handover PIN" })
  pin?: string;
}

export class CheckpointDto extends ActionContextDto {
  @IsOptional() @IsString() @MaxLength(120) label?: string;
}

export class OnBehalfInput {
  @IsString()
  @Length(3, 300, { message: "Give a reason (3–300 characters) for receiving on someone's behalf" })
  reason!: string;

  @IsOptional() @IsString() @MaxLength(120) relationship?: string;
}

export class RequestReceiptCodeDto {
  /** For department receivers or an on-behalf employee. Defaults to the intended receiver. */
  @IsOptional() @IsUUID() recipientEmployeeId?: string;
  /** A non-employee accepting on the receiver's behalf (e.g. a reception guard). */
  @IsOptional() @IsString() @Length(2, 120) recipientName?: string;
  @IsOptional() @Matches(PHONE, { message: "recipientPhone must be a valid mobile number" }) recipientPhone?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => OnBehalfInput)
  onBehalf?: OnBehalfInput;
}

export class ReceiveDto extends ActionContextDto {
  @IsIn(["APP_CONFIRMATION", "QR_CONFIRMATION", "OTP"])
  method!: "APP_CONFIRMATION" | "QR_CONFIRMATION" | "OTP";

  @ValidateIf((o: ReceiveDto) => o.method === "QR_CONFIRMATION")
  @IsString()
  @MaxLength(300)
  qrPayload?: string;

  @ValidateIf((o: ReceiveDto) => o.method === "OTP")
  @Matches(/^\d{6}$/, { message: "code must be 6 digits" })
  code?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => OnBehalfInput)
  onBehalf?: OnBehalfInput;

  @IsOptional() @IsUUID() signatureAttachmentId?: string;
  @IsOptional() @IsUUID() photoAttachmentId?: string;
}

export class RecordExceptionDto extends ActionContextDto {
  @IsIn(Object.values(ExceptionCode))
  code!: ExceptionCode;

  @IsString()
  @Length(3, 1000, { message: "Describe the exception (3–1000 characters)" })
  details!: string;

  @IsOptional()
  @IsIn([ParcelStatus.DELIVERY_EXCEPTION, ParcelStatus.ON_HOLD, ParcelStatus.DELIVERY_FAILED])
  setStatus?: ParcelStatus;
}

export class ResolveExceptionDto {
  @IsString() @Length(3, 1000) resolution!: string;
  @IsOptional() @IsIn(Object.values(ParcelStatus)) resumeStatus?: ParcelStatus;
}

export class ReasonDto extends ActionContextDto {
  @IsString()
  @Length(3, 500, { message: "Give a reason (3–500 characters)" })
  reason!: string;
}

export class CompleteReturnDto extends ActionContextDto {
  @IsIn(["SENDER_APP", "DISPATCH_OFFICER"])
  method!: "SENDER_APP" | "DISPATCH_OFFICER";
}

export class CommentDto {
  @IsString() @Length(1, 2000) body!: string;
}

export const CORRECTABLE_FIELDS = [
  "title",
  "description",
  "priority",
  "categoryId",
  "expectedDeliveryAt",
  "originLocationId",
  "destinationLocationId",
  "externalTrackingNumber",
  "externalBookingReference",
  "riderName",
  "riderPhone",
] as const;
export type CorrectableField = (typeof CORRECTABLE_FIELDS)[number];

export class CorrectionDto {
  @IsString() @Length(5, 1000, { message: "Explain the correction (5–1000 characters)" }) reason!: string;
  /** The ledger entry being corrected or annotated. */
  @IsOptional() @IsUUID() eventId?: string;
  @IsOptional() @IsIn(CORRECTABLE_FIELDS as unknown as string[]) field?: CorrectableField;
  @ValidateIf((o: CorrectionDto) => o.field !== undefined) @IsString() @MaxLength(2000) value?: string;
}

export class UpdateSlaDto {
  @ValidateIf((o: UpdateSlaDto) => o.expectedDeliveryAt !== null)
  @IsDateString()
  expectedDeliveryAt!: string | null;

  @IsOptional() @IsString() @MaxLength(500) reason?: string;
}

export class ResendNotificationDto {
  @IsIn(["SENDER", "RECEIVER", "CARRIER"])
  audience!: "SENDER" | "RECEIVER" | "CARRIER";
}

export class ExternalStatusDto {
  @IsString() @Length(1, 80) rawStatus!: string;
  @IsOptional() @IsIn(Object.values(ExternalStatus)) normalized?: ExternalStatus;
  @IsOptional() @IsString() @MaxLength(500) note?: string;
  @IsOptional() @IsDateString() occurredAt?: string;
  @IsOptional() @IsString() @MaxLength(120) recipientName?: string;
}

export class ScanDto {
  @IsString() @Length(4, 300) payload!: string;
}

export class ListParcelsQuery {
  @IsOptional() @IsIn(["INCOMING", "OUTGOING", "ASSIGNED", "COMPLETED", "ACTIVE", "ALL"]) box?: string;
  @IsOptional() @IsIn(Object.values(StatusView)) view?: StatusView;
  @IsOptional() @IsString() @MaxLength(100) q?: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsIn(Object.values(Priority)) priority?: string;
  @IsOptional() @IsUUID() categoryId?: string;
  @IsOptional() @IsUUID() branchId?: string;
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) dateFrom?: string;
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) dateTo?: string;
  @IsOptional() @IsString() cursor?: string;
  @IsOptional() @Matches(/^\d{1,3}$/) limit?: string;
}
