import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards, UseInterceptors } from "@nestjs/common";
import { Capability } from "@abg-dispatch/shared";
import { RequireCapability } from "../auth/decorators";
import { CurrentActor, type Actor } from "../common/actor";
import { IdempotencyInterceptor } from "../common/idempotency.interceptor";
import { RateLimit, RateLimitGuard } from "../common/rate-limit";
import { asUser } from "../admin/admin-scope";
import {
  AdminCarRequisitionsQuery,
  AssignCarDto,
  CancelCarDto,
  CarDecisionDto,
  CreateCarRequisitionDto,
  CreateDriverDto,
  CreateVehicleDto,
  FleetRegisterQuery,
  GateScanDto,
  MyCarRequisitionsQuery,
  MyTripsQuery,
  OdometerDto,
  UpdateDriverDto,
  UpdateVehicleDto,
} from "./fleet.dto";
import { FleetService } from "./fleet.service";

const Id = new ParseUUIDPipe({ version: "4", errorHttpStatusCode: 404 });

/** Pool car requisitions and the fleet register. */
@Controller()
@UseGuards(RateLimitGuard)
@UseInterceptors(IdempotencyInterceptor)
export class FleetController {
  constructor(private readonly service: FleetService) {}

  // ── Requests ──

  @RequireCapability(Capability.FLEET_REQUEST)
  @RateLimit(20, 60)
  @Post("pool-car/requisitions")
  create(@CurrentActor() actor: Actor, @Body() dto: CreateCarRequisitionDto) {
    return this.service.create(asUser(actor), dto);
  }

  @RequireCapability(Capability.FLEET_REQUEST)
  @Get("pool-car/requisitions/mine")
  mine(@CurrentActor() actor: Actor, @Query() q: MyCarRequisitionsQuery) {
    return this.service.mine(asUser(actor), q);
  }

  /** Requests waiting for my decision as the named approver (head of department). */
  @Get("pool-car/approvals")
  approvals(@CurrentActor() actor: Actor) {
    return this.service.approvals(asUser(actor));
  }

  /** A driver's own trips: `active` (assigned and on the road) or `done`. */
  @RequireCapability(Capability.FLEET_DRIVE)
  @Get("pool-car/trips/mine")
  trips(@CurrentActor() actor: Actor, @Query() q: MyTripsQuery) {
    return this.service.trips(asUser(actor), q);
  }

  /** The requester, the approver, the assigned driver, or fleet staff for its office. Everyone else gets 404. */
  @Get("pool-car/requisitions/:id")
  get(@CurrentActor() actor: Actor, @Param("id", Id) id: string) {
    return this.service.get(asUser(actor), id);
  }

  /** The HOD step (only the named approver); the fleet manager may also reject at Pending fleet manager. */
  @HttpCode(200)
  @Post("pool-car/requisitions/:id/decision")
  decide(@CurrentActor() actor: Actor, @Param("id", Id) id: string, @Body() dto: CarDecisionDto) {
    return this.service.decide(asUser(actor), id, dto.decision, dto.note);
  }

  @RequireCapability(Capability.FLEET_MANAGE)
  @HttpCode(200)
  @Post("pool-car/requisitions/:id/assign")
  assign(@CurrentActor() actor: Actor, @Param("id", Id) id: string, @Body() dto: AssignCarDto) {
    return this.service.assign(asUser(actor), id, dto);
  }

  /** The assigned driver or the fleet manager. Security starts trips by scanning the gate pass instead. */
  @HttpCode(200)
  @Post("pool-car/requisitions/:id/start")
  start(@CurrentActor() actor: Actor, @Param("id", Id) id: string, @Body() dto: OdometerDto) {
    return this.service.start(asUser(actor), id, dto.odometerKm);
  }

  @HttpCode(200)
  @Post("pool-car/requisitions/:id/complete")
  complete(@CurrentActor() actor: Actor, @Param("id", Id) id: string, @Body() dto: OdometerDto) {
    return this.service.complete(asUser(actor), id, dto.odometerKm);
  }

  /** The requester, until the car has left. */
  @HttpCode(200)
  @Post("pool-car/requisitions/:id/cancel")
  cancel(@CurrentActor() actor: Actor, @Param("id", Id) id: string, @Body() dto: CancelCarDto) {
    return this.service.cancel(asUser(actor), id, dto.note);
  }

  // ── Gate passes ──

  @RequireCapability(Capability.GATE_VERIFY)
  @Get("pool-car/passes/:token")
  pass(@CurrentActor() actor: Actor, @Param("token") token: string) {
    return this.service.pass(asUser(actor), token);
  }

  @RequireCapability(Capability.GATE_VERIFY)
  @RateLimit(60, 60)
  @HttpCode(200)
  @Post("pool-car/passes/:token/scan")
  scan(@CurrentActor() actor: Actor, @Param("token") token: string, @Body() dto: GateScanDto) {
    return this.service.scan(asUser(actor), token, dto.direction, dto.odometerKm);
  }

  // ── Fleet register ──

  /** With `requisitionId`, each vehicle says whether it is free for that trip (the assign dialog). */
  @RequireCapability(Capability.FLEET_VIEW)
  @Get("pool-car/vehicles")
  vehicles(@CurrentActor() actor: Actor, @Query() q: FleetRegisterQuery) {
    return this.service.vehicles(asUser(actor), q);
  }

  @RequireCapability(Capability.FLEET_MANAGE)
  @Post("pool-car/vehicles")
  createVehicle(@CurrentActor() actor: Actor, @Body() dto: CreateVehicleDto) {
    return this.service.createVehicle(asUser(actor), dto);
  }

  @RequireCapability(Capability.FLEET_MANAGE)
  @Patch("pool-car/vehicles/:id")
  updateVehicle(@CurrentActor() actor: Actor, @Param("id", Id) id: string, @Body() dto: UpdateVehicleDto) {
    return this.service.updateVehicle(asUser(actor), id, dto);
  }

  @RequireCapability(Capability.FLEET_VIEW)
  @Get("pool-car/drivers")
  drivers(@CurrentActor() actor: Actor, @Query() q: FleetRegisterQuery) {
    return this.service.drivers(asUser(actor), q);
  }

  @RequireCapability(Capability.FLEET_MANAGE)
  @Post("pool-car/drivers")
  createDriver(@CurrentActor() actor: Actor, @Body() dto: CreateDriverDto) {
    return this.service.createDriver(asUser(actor), dto);
  }

  @RequireCapability(Capability.FLEET_MANAGE)
  @Patch("pool-car/drivers/:id")
  updateDriver(@CurrentActor() actor: Actor, @Param("id", Id) id: string, @Body() dto: UpdateDriverDto) {
    return this.service.updateDriver(asUser(actor), id, dto);
  }

  // ── Admin ──

  @RequireCapability(Capability.FLEET_VIEW)
  @Get("admin/pool-car/requisitions")
  list(@CurrentActor() actor: Actor, @Query() q: AdminCarRequisitionsQuery) {
    return this.service.list(asUser(actor), q);
  }

  @RequireCapability(Capability.FLEET_VIEW)
  @Get("admin/pool-car/summary")
  summary(@CurrentActor() actor: Actor, @Query("branchId") branchId?: string) {
    return this.service.summary(asUser(actor), branchId || undefined);
  }
}
