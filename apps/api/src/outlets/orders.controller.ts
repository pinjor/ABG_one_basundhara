import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { Role } from "@bsc/shared";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { CurrentUser, type RequestUser } from "../auth/current-user.decorator";
import { OutletsService } from "./outlets.service";
import { CreateOrderDto } from "./dto/create-order.dto";
import { SetOrderStatusDto } from "./dto/set-order-status.dto";

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("orders")
export class OrdersController {
  constructor(private readonly outletsService: OutletsService) {}

  @Get()
  list(@Query("outletId") outletId?: string, @Query("status") status?: string) {
    return this.outletsService.listOrders({ outletId, status });
  }

  @Roles(Role.HOSPITALITY_LEAD)
  @Post()
  create(@Body() dto: CreateOrderDto, @CurrentUser() user: RequestUser) {
    return this.outletsService.createOrder(dto, user.id);
  }

  @Roles(Role.HOSPITALITY_LEAD)
  @Post(":id/status")
  setStatus(@Param("id") id: string, @Body() dto: SetOrderStatusDto, @CurrentUser() user: RequestUser) {
    return this.outletsService.setOrderStatus(id, dto.status, user.id);
  }
}
