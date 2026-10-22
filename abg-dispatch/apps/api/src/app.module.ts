import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { JwtModule } from "@nestjs/jwt";
import { APP_CONFIG, loadConfig } from "./common/config";
import { PrismaModule } from "./common/prisma.service";
import { AuditModule } from "./audit/audit.service";
import { RealtimeModule } from "./realtime/realtime.service";
import { AuthGuard } from "./auth/auth.guard";
import { ActorLoaderService } from "./auth/actor-loader.service";
import { AuthService } from "./auth/auth.service";
import { OtpService } from "./auth/otp.service";
import { AuthController } from "./auth/auth.controller";
import { RateLimitGuard } from "./common/rate-limit";
import { SmsService } from "./notifications/sms.service";
import { PushService } from "./notifications/push.service";
import { NotificationService } from "./notifications/notification.service";
import { NotificationsController } from "./notifications/notifications.controller";
import { DirectoryController } from "./directory/directory.controller";
import { ParcelAccessService } from "./parcels/parcel-access.service";
import { LedgerService } from "./parcels/ledger.service";
import { TrackingNumberService } from "./parcels/tracking-number.service";
import { ParcelQueryService } from "./parcels/parcel-query.service";
import { ParcelWorkflowService } from "./parcels/parcel-workflow.service";
import { ParcelsController } from "./parcels/parcels.controller";
import { StorageService } from "./attachments/storage.service";
import { AttachmentsController } from "./attachments/attachments.controller";
import { CouriersService } from "./couriers/couriers.service";
import { CouriersController } from "./couriers/couriers.controller";
import { SlaService } from "./sla/sla.service";
import { AnalyticsService } from "./admin/analytics.service";
import { ReportsService } from "./admin/reports.service";
import { AdminParcelsController } from "./admin/admin-parcels.controller";
import { AdminInsightsController } from "./admin/admin-insights.controller";
import { AdminConfigController } from "./admin/admin-config.controller";
import { HealthController } from "./health/health.controller";
import { IncidentsController } from "./incidents/incidents.controller";
import { IncidentsService } from "./incidents/incidents.service";
import { ToursController } from "./tours/tours.controller";
import { ToursService } from "./tours/tours.service";
import { FleetController } from "./fleet/fleet.controller";
import { FleetService } from "./fleet/fleet.service";
import { VisitorsController } from "./visitors/visitors.controller";
import { VisitorsService } from "./visitors/visitors.service";
import { LicencesController } from "./licences/licences.controller";
import { LicencesService } from "./licences/licences.service";
import { LicenceAlertsService } from "./licences/licence-alerts.service";
import { NoticesController } from "./notices/notices.controller";
import { NoticesService } from "./notices/notices.service";

@Module({
  imports: [PrismaModule, AuditModule, RealtimeModule, JwtModule.register({})],
  controllers: [
    HealthController,
    AuthController,
    DirectoryController,
    ParcelsController,
    AttachmentsController,
    NotificationsController,
    CouriersController,
    AdminParcelsController,
    AdminInsightsController,
    AdminConfigController,
    IncidentsController,
    ToursController,
    FleetController,
    VisitorsController,
    LicencesController,
    NoticesController,
  ],
  providers: [
    IncidentsService,
    ToursService,
    FleetService,
    VisitorsService,
    LicencesService,
    LicenceAlertsService,
    NoticesService,
    { provide: APP_CONFIG, useFactory: loadConfig },
    { provide: APP_GUARD, useClass: AuthGuard },
    RateLimitGuard,
    ActorLoaderService,
    AuthService,
    OtpService,
    SmsService,
    PushService,
    NotificationService,
    ParcelAccessService,
    LedgerService,
    TrackingNumberService,
    ParcelQueryService,
    ParcelWorkflowService,
    StorageService,
    CouriersService,
    SlaService,
    AnalyticsService,
    ReportsService,
  ],
})
export class AppModule {}
