import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { AuthService } from "./auth.service";
import { AllowGuest, AllowReadOnly, Public } from "./decorators";
import { CurrentActor, type Actor, type UserActor } from "../common/actor";
import { RateLimit, RateLimitGuard } from "../common/rate-limit";
import { forbidden } from "../common/errors";
import {
  ChangePasswordDto,
  GuestOtpRequestDto,
  GuestOtpVerifyDto,
  LoginDto,
  MfaCodeDto,
  RefreshDto,
  RegisterDeviceDto,
  UpdateProfileDto,
} from "./auth.dto";

function client(req: Request) {
  return { ip: req.ip, userAgent: req.headers["user-agent"] };
}

function asUser(actor: Actor): UserActor {
  if (actor.kind !== "user") throw forbidden("Guest carriers cannot use this feature.", "GUEST_RESTRICTED");
  return actor;
}

@UseGuards(RateLimitGuard)
@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @RateLimit(10, 60)
  @HttpCode(200)
  @Post("login")
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.auth.login(dto, client(req));
  }

  @Public()
  @RateLimit(30, 60)
  @HttpCode(200)
  @Post("refresh")
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @AllowGuest()
  @AllowReadOnly()
  @HttpCode(200)
  @Post("logout")
  logout(@CurrentActor() actor: Actor) {
    return this.auth.logout(actor);
  }

  @AllowGuest()
  @Get("me")
  me(@CurrentActor() actor: Actor) {
    if (actor.kind === "guest") {
      return { kind: "guest", guest: { id: actor.guestCarrierId, fullName: actor.displayName, phone: actor.phone } };
    }
    return this.auth.profile(actor);
  }

  @AllowReadOnly()
  @Patch("me")
  updateMe(@CurrentActor() actor: Actor, @Body() dto: UpdateProfileDto) {
    return this.auth.updateProfile(asUser(actor), dto.locale);
  }

  @AllowReadOnly()
  @RateLimit(5, 60)
  @HttpCode(200)
  @Post("password")
  changePassword(@CurrentActor() actor: Actor, @Body() dto: ChangePasswordDto) {
    return this.auth.changePassword(asUser(actor), dto.currentPassword, dto.newPassword);
  }

  @Get("sessions")
  sessions(@CurrentActor() actor: Actor) {
    return this.auth.listSessions(asUser(actor));
  }

  @AllowReadOnly()
  @Delete("sessions/:id")
  revokeSession(@CurrentActor() actor: Actor, @Param("id") id: string) {
    return this.auth.revokeSession(asUser(actor), id);
  }

  @AllowReadOnly()
  @HttpCode(200)
  @Post("mfa/setup")
  mfaSetup(@CurrentActor() actor: Actor) {
    return this.auth.mfaSetup(asUser(actor));
  }

  @AllowReadOnly()
  @RateLimit(10, 60)
  @HttpCode(200)
  @Post("mfa/enable")
  mfaEnable(@CurrentActor() actor: Actor, @Body() dto: MfaCodeDto) {
    return this.auth.mfaEnable(asUser(actor), dto.code);
  }

  @Public()
  @RateLimit(5, 60)
  @HttpCode(200)
  @Post("guest/request-code")
  guestRequest(@Body() dto: GuestOtpRequestDto, @Req() req: Request) {
    return this.auth.guestRequestOtp(dto.phone, client(req));
  }

  @Public()
  @RateLimit(10, 60)
  @HttpCode(200)
  @Post("guest/verify")
  guestVerify(@Body() dto: GuestOtpVerifyDto, @Req() req: Request) {
    return this.auth.guestVerifyOtp(dto.phone, dto.code, client(req));
  }

  @AllowReadOnly()
  @HttpCode(200)
  @Post("devices")
  registerDevice(@CurrentActor() actor: Actor, @Body() dto: RegisterDeviceDto) {
    return this.auth.registerDevice(asUser(actor), dto.token, dto.platform, dto.appVersion);
  }

  @AllowReadOnly()
  @Delete("devices/:token")
  unregisterDevice(@CurrentActor() actor: Actor, @Param("token") token: string) {
    return this.auth.unregisterDevice(asUser(actor), token);
  }
}
