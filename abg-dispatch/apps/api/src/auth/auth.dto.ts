import { IsIn, IsOptional, IsString, Length, Matches, MaxLength, MinLength } from "class-validator";

export class LoginDto {
  /** Email address or employee ID (e.g. ABG-2041). */
  @IsString()
  @MaxLength(120)
  identifier!: string;

  @IsString()
  @MaxLength(200)
  password!: string;

  @IsOptional()
  @Matches(/^\d{6}$/, { message: "totp must be the 6-digit code from your authenticator app" })
  totp?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  deviceName?: string;

  @IsOptional()
  @IsIn(["android", "ios", "web", "other"])
  platform?: string;
}

export class RefreshDto {
  @IsString()
  @MaxLength(200)
  refreshToken!: string;
}

export class GuestOtpRequestDto {
  @IsString()
  @Matches(/^\+?[\d\s-]{10,16}$/, { message: "phone must be a valid mobile number" })
  phone!: string;
}

export class GuestOtpVerifyDto {
  @IsString()
  @Matches(/^\+?[\d\s-]{10,16}$/, { message: "phone must be a valid mobile number" })
  phone!: string;

  @Matches(/^\d{6}$/, { message: "code must be 6 digits" })
  code!: string;
}

export class MfaCodeDto {
  @Matches(/^\d{6}$/, { message: "code must be 6 digits" })
  code!: string;
}

export class ChangePasswordDto {
  @IsString()
  currentPassword!: string;

  @IsString()
  @MinLength(10, { message: "Use at least 10 characters" })
  @MaxLength(200)
  newPassword!: string;
}

export class RegisterDeviceDto {
  @IsString()
  @Length(20, 4096)
  token!: string;

  @IsIn(["android", "ios", "web"])
  platform!: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  appVersion?: string;
}

export class UpdateProfileDto {
  @IsOptional()
  @IsIn(["en", "bn"])
  locale?: string;
}
