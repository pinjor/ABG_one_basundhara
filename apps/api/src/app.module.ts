import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "./prisma/prisma.module";
import { AuditModule } from "./audit/audit.module";
import { AuthModule } from "./auth/auth.module";
import { ZonesModule } from "./zones/zones.module";
import { FacilitiesModule } from "./facilities/facilities.module";
import { DashboardModule } from "./dashboard/dashboard.module";
import { BookingsModule } from "./bookings/bookings.module";
import { MembersModule } from "./members/members.module";
import { GatesModule } from "./gates/gates.module";
import { VisitorsModule } from "./visitors/visitors.module";
import { VipGuestsModule } from "./vip-guests/vip-guests.module";
import { LoungesModule } from "./lounges/lounges.module";
import { OutletsModule } from "./outlets/outlets.module";
import { ParkingModule } from "./parking/parking.module";
import { FleetModule } from "./fleet/fleet.module";
import { SurfacesModule } from "./surfaces/surfaces.module";
import { EventsModule } from "./events/events.module";
import { OperationsModule } from "./operations/operations.module";
import { TicketingModule } from "./ticketing/ticketing.module";
import { DeskModule } from "./desk/desk.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuditModule,
    AuthModule,
    ZonesModule,
    FacilitiesModule,
    EventsModule,
    OperationsModule,
    BookingsModule,
    MembersModule,
    GatesModule,
    VisitorsModule,
    VipGuestsModule,
    LoungesModule,
    OutletsModule,
    ParkingModule,
    FleetModule,
    SurfacesModule,
    DashboardModule,
    TicketingModule,
    DeskModule,
  ],
})
export class AppModule {}
