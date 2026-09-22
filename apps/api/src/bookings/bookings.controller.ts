import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { Role } from "@bsc/shared";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { CurrentUser, RequestUser } from "../auth/current-user.decorator";
import { BookingsService } from "./bookings.service";
import { CreateBookingDto } from "./dto/create-booking.dto";
import { SetBookingStatusDto } from "./dto/set-booking-status.dto";
import { SetPaymentStatusDto } from "./dto/set-payment-status.dto";

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("bookings")
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Get()
  list(
    @Query("facilityId") facilityId?: string,
    @Query("status") status?: string,
    @Query("date") date?: string,
    @Query("search") search?: string,
  ) {
    return this.bookingsService.list({ facilityId, status, date, search });
  }

  @Get(":id")
  getOne(@Param("id") id: string) {
    return this.bookingsService.getOne(id);
  }

  @Get(":id/audit-log")
  auditTrail(@Param("id") id: string) {
    return this.bookingsService.auditTrail(id);
  }

  @Roles(Role.BOOKINGS_OFFICER)
  @Post()
  create(@Body() dto: CreateBookingDto, @CurrentUser() user: RequestUser) {
    return this.bookingsService.create(dto, user.id);
  }

  @Roles(Role.BOOKINGS_OFFICER)
  @Post(":id/status")
  setStatus(@Param("id") id: string, @Body() dto: SetBookingStatusDto, @CurrentUser() user: RequestUser) {
    return this.bookingsService.setStatus(id, dto.status, user.id);
  }

  @Roles(Role.BOOKINGS_OFFICER)
  @Post(":id/payment-status")
  setPaymentStatus(@Param("id") id: string, @Body() dto: SetPaymentStatusDto, @CurrentUser() user: RequestUser) {
    return this.bookingsService.setPaymentStatus(id, dto.paymentStatus, user.id);
  }
}
