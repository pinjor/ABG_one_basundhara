-- ABG ONE modules: official tours, pool cars and fleet, visitors, licences, notices.

-- CreateTable
CREATE TABLE "app_settings" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "app_settings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "tour_requests" (
    "id" TEXT NOT NULL,
    "referenceNumber" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "destination" TEXT NOT NULL,
    "country" TEXT,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "transportMode" TEXT NOT NULL,
    "travellerUserId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "departmentId" TEXT,
    "coTravellers" JSONB NOT NULL DEFAULT '[]',
    "estimatedBudget" INTEGER NOT NULL,
    "advanceRequested" INTEGER NOT NULL DEFAULT 0,
    "sanctionedBudget" INTEGER,
    "passportNumber" TEXT,
    "passportExpiry" DATE,
    "approverUserId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING_HOD',
    "statusNote" TEXT,
    "statusChangedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hodApprovedAt" TIMESTAMP(3),
    "vettedAt" TIMESTAMP(3),
    "sanctionedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tour_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tour_updates" (
    "id" TEXT NOT NULL,
    "tourId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT,
    "note" TEXT,
    "actorUserId" TEXT,
    "actorName" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tour_updates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicles" (
    "id" TEXT NOT NULL,
    "registrationNumber" TEXT NOT NULL,
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "seats" INTEGER NOT NULL,
    "colour" TEXT,
    "fuelType" TEXT,
    "branchId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "odometerKm" INTEGER NOT NULL DEFAULT 0,
    "nextServiceAt" DATE,
    "fitnessExpiry" DATE,
    "insuranceExpiry" DATE,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drivers" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "licenseNumber" TEXT NOT NULL,
    "licenseExpiry" DATE,
    "branchId" TEXT NOT NULL,
    "userId" TEXT,
    "employeeId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "drivers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "car_requisitions" (
    "id" TEXT NOT NULL,
    "referenceNumber" TEXT NOT NULL,
    "requesterUserId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "departmentId" TEXT,
    "tripType" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "pickupLocation" TEXT NOT NULL,
    "dropLocation" TEXT NOT NULL,
    "pickupAt" TIMESTAMP(3) NOT NULL,
    "returnAt" TIMESTAMP(3),
    "passengers" JSONB NOT NULL DEFAULT '[]',
    "passengerCount" INTEGER NOT NULL DEFAULT 1,
    "urgent" BOOLEAN NOT NULL DEFAULT false,
    "vehiclePreference" TEXT NOT NULL DEFAULT 'ANY',
    "approverUserId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING_HOD',
    "statusNote" TEXT,
    "statusChangedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vehicleId" TEXT,
    "driverId" TEXT,
    "gatePassToken" TEXT,
    "hodApprovedAt" TIMESTAMP(3),
    "assignedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "startOdometerKm" INTEGER,
    "endOdometerKm" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "car_requisitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "car_requisition_updates" (
    "id" TEXT NOT NULL,
    "requisitionId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT,
    "note" TEXT,
    "actorUserId" TEXT,
    "actorName" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "car_requisition_updates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visits" (
    "id" TEXT NOT NULL,
    "passNumber" TEXT NOT NULL,
    "visitorName" TEXT NOT NULL,
    "visitorPhone" TEXT NOT NULL,
    "company" TEXT,
    "idLast4" TEXT,
    "purpose" TEXT NOT NULL,
    "purposeDetail" TEXT,
    "partySize" INTEGER NOT NULL DEFAULT 1,
    "vehicleNumber" TEXT,
    "carrying" TEXT,
    "branchId" TEXT NOT NULL,
    "locationId" TEXT,
    "hostUserId" TEXT,
    "hostName" TEXT NOT NULL,
    "expectedAt" TIMESTAMP(3) NOT NULL,
    "expectedUntil" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'EXPECTED',
    "walkIn" BOOLEAN NOT NULL DEFAULT false,
    "badgeNumber" TEXT,
    "passToken" TEXT NOT NULL,
    "checkedInAt" TIMESTAMP(3),
    "checkedInById" TEXT,
    "checkedOutAt" TIMESTAMP(3),
    "checkedOutById" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "visits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "licences" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "licenceNumber" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "issuingAuthority" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "ownerUserId" TEXT,
    "issuedAt" DATE,
    "expiresAt" DATE NOT NULL,
    "renewalLeadDays" INTEGER NOT NULL DEFAULT 90,
    "renewalStage" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "renewalStartedAt" TIMESTAMP(3),
    "renewalFee" INTEGER,
    "documentKey" TEXT,
    "documentName" TEXT,
    "documentMime" TEXT,
    "documentSize" INTEGER,
    "lastAlertDays" INTEGER,
    "lastAlertAt" TIMESTAMP(3),
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "licences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "licence_events" (
    "id" TEXT NOT NULL,
    "licenceId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "note" TEXT,
    "actorUserId" TEXT,
    "actorName" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "licence_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notices" (
    "id" TEXT NOT NULL,
    "referenceNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'GENERAL',
    "urgent" BOOLEAN NOT NULL DEFAULT false,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "audience" TEXT NOT NULL DEFAULT 'ALL',
    "branchIds" JSONB NOT NULL DEFAULT '[]',
    "requiresAcknowledgement" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "authorUserId" TEXT NOT NULL,
    "signedBy" TEXT,
    "attachmentKey" TEXT,
    "attachmentName" TEXT,
    "attachmentMime" TEXT,
    "attachmentSize" INTEGER,
    "publishedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notice_receipts" (
    "id" TEXT NOT NULL,
    "noticeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledgedAt" TIMESTAMP(3),

    CONSTRAINT "notice_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tour_requests_referenceNumber_key" ON "tour_requests"("referenceNumber");

-- CreateIndex
CREATE INDEX "tour_requests_status_startDate_idx" ON "tour_requests"("status", "startDate");

-- CreateIndex
CREATE INDEX "tour_requests_travellerUserId_createdAt_idx" ON "tour_requests"("travellerUserId", "createdAt");

-- CreateIndex
CREATE INDEX "tour_requests_approverUserId_status_idx" ON "tour_requests"("approverUserId", "status");

-- CreateIndex
CREATE INDEX "tour_requests_branchId_status_idx" ON "tour_requests"("branchId", "status");

-- CreateIndex
CREATE INDEX "tour_updates_tourId_createdAt_idx" ON "tour_updates"("tourId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_registrationNumber_key" ON "vehicles"("registrationNumber");

-- CreateIndex
CREATE INDEX "vehicles_branchId_status_idx" ON "vehicles"("branchId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "drivers_userId_key" ON "drivers"("userId");

-- CreateIndex
CREATE INDEX "drivers_branchId_status_idx" ON "drivers"("branchId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "car_requisitions_referenceNumber_key" ON "car_requisitions"("referenceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "car_requisitions_gatePassToken_key" ON "car_requisitions"("gatePassToken");

-- CreateIndex
CREATE INDEX "car_requisitions_status_pickupAt_idx" ON "car_requisitions"("status", "pickupAt");

-- CreateIndex
CREATE INDEX "car_requisitions_requesterUserId_createdAt_idx" ON "car_requisitions"("requesterUserId", "createdAt");

-- CreateIndex
CREATE INDEX "car_requisitions_approverUserId_status_idx" ON "car_requisitions"("approverUserId", "status");

-- CreateIndex
CREATE INDEX "car_requisitions_branchId_status_idx" ON "car_requisitions"("branchId", "status");

-- CreateIndex
CREATE INDEX "car_requisitions_driverId_status_idx" ON "car_requisitions"("driverId", "status");

-- CreateIndex
CREATE INDEX "car_requisition_updates_requisitionId_createdAt_idx" ON "car_requisition_updates"("requisitionId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "visits_passNumber_key" ON "visits"("passNumber");

-- CreateIndex
CREATE UNIQUE INDEX "visits_passToken_key" ON "visits"("passToken");

-- CreateIndex
CREATE INDEX "visits_branchId_status_idx" ON "visits"("branchId", "status");

-- CreateIndex
CREATE INDEX "visits_branchId_expectedAt_idx" ON "visits"("branchId", "expectedAt");

-- CreateIndex
CREATE INDEX "visits_hostUserId_expectedAt_idx" ON "visits"("hostUserId", "expectedAt");

-- CreateIndex
CREATE INDEX "visits_visitorPhone_idx" ON "visits"("visitorPhone");

-- CreateIndex
CREATE INDEX "licences_expiresAt_idx" ON "licences"("expiresAt");

-- CreateIndex
CREATE INDEX "licences_branchId_expiresAt_idx" ON "licences"("branchId", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "licences_branchId_licenceNumber_key" ON "licences"("branchId", "licenceNumber");

-- CreateIndex
CREATE INDEX "licence_events_licenceId_createdAt_idx" ON "licence_events"("licenceId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "notices_referenceNumber_key" ON "notices"("referenceNumber");

-- CreateIndex
CREATE INDEX "notices_status_publishedAt_idx" ON "notices"("status", "publishedAt");

-- CreateIndex
CREATE INDEX "notice_receipts_userId_idx" ON "notice_receipts"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "notice_receipts_noticeId_userId_key" ON "notice_receipts"("noticeId", "userId");

-- AddForeignKey
ALTER TABLE "tour_requests" ADD CONSTRAINT "tour_requests_travellerUserId_fkey" FOREIGN KEY ("travellerUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tour_requests" ADD CONSTRAINT "tour_requests_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tour_requests" ADD CONSTRAINT "tour_requests_approverUserId_fkey" FOREIGN KEY ("approverUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tour_updates" ADD CONSTRAINT "tour_updates_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "tour_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "car_requisitions" ADD CONSTRAINT "car_requisitions_requesterUserId_fkey" FOREIGN KEY ("requesterUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "car_requisitions" ADD CONSTRAINT "car_requisitions_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "car_requisitions" ADD CONSTRAINT "car_requisitions_approverUserId_fkey" FOREIGN KEY ("approverUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "car_requisitions" ADD CONSTRAINT "car_requisitions_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "car_requisitions" ADD CONSTRAINT "car_requisitions_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "car_requisition_updates" ADD CONSTRAINT "car_requisition_updates_requisitionId_fkey" FOREIGN KEY ("requisitionId") REFERENCES "car_requisitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visits" ADD CONSTRAINT "visits_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visits" ADD CONSTRAINT "visits_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visits" ADD CONSTRAINT "visits_hostUserId_fkey" FOREIGN KEY ("hostUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "licences" ADD CONSTRAINT "licences_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "licences" ADD CONSTRAINT "licences_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "licence_events" ADD CONSTRAINT "licence_events_licenceId_fkey" FOREIGN KEY ("licenceId") REFERENCES "licences"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notices" ADD CONSTRAINT "notices_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notice_receipts" ADD CONSTRAINT "notice_receipts_noticeId_fkey" FOREIGN KEY ("noticeId") REFERENCES "notices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notice_receipts" ADD CONSTRAINT "notice_receipts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- ── Integrity ──

-- Histories are append-only, like the custody ledger.
CREATE TRIGGER tour_updates_append_only BEFORE UPDATE OR DELETE ON "tour_updates"
  FOR EACH ROW EXECUTE FUNCTION abg_forbid_mutation();
CREATE TRIGGER car_requisition_updates_append_only BEFORE UPDATE OR DELETE ON "car_requisition_updates"
  FOR EACH ROW EXECUTE FUNCTION abg_forbid_mutation();
CREATE TRIGGER licence_events_append_only BEFORE UPDATE OR DELETE ON "licence_events"
  FOR EACH ROW EXECUTE FUNCTION abg_forbid_mutation();

ALTER TABLE "tour_requests"
  ADD CONSTRAINT tour_type_check CHECK ("type" IN ('LOCAL', 'FOREIGN')),
  ADD CONSTRAINT tour_status_check CHECK ("status" IN ('PENDING_HOD', 'PENDING_VETTING', 'PENDING_SANCTION', 'APPROVED', 'ACTIVE', 'COMPLETED', 'REJECTED', 'CANCELLED')),
  ADD CONSTRAINT tour_dates_check CHECK ("endDate" >= "startDate"),
  ADD CONSTRAINT tour_budget_check CHECK ("estimatedBudget" >= 0 AND "advanceRequested" >= 0 AND ("sanctionedBudget" IS NULL OR "sanctionedBudget" >= 0)),
  -- Overseas tours cannot be approved without the MD / Chairman's sanction.
  ADD CONSTRAINT tour_foreign_sanction_check CHECK ("type" <> 'FOREIGN' OR "status" NOT IN ('APPROVED', 'ACTIVE', 'COMPLETED') OR "sanctionedAt" IS NOT NULL);

ALTER TABLE "vehicles"
  ADD CONSTRAINT vehicle_type_check CHECK ("type" IN ('SEDAN', 'SUV', 'MICROBUS', 'PICKUP', 'COASTER')),
  ADD CONSTRAINT vehicle_status_check CHECK ("status" IN ('AVAILABLE', 'ON_TRIP', 'MAINTENANCE', 'INACTIVE')),
  ADD CONSTRAINT vehicle_seats_check CHECK ("seats" > 0);

ALTER TABLE "drivers"
  ADD CONSTRAINT driver_status_check CHECK ("status" IN ('AVAILABLE', 'ON_TRIP', 'OFF_DUTY'));

ALTER TABLE "car_requisitions"
  ADD CONSTRAINT car_trip_type_check CHECK ("tripType" IN ('ONE_WAY', 'ROUND_TRIP', 'FULL_DAY', 'AIRPORT')),
  ADD CONSTRAINT car_status_check CHECK ("status" IN ('PENDING_HOD', 'PENDING_FLEET', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'REJECTED', 'CANCELLED')),
  ADD CONSTRAINT car_passengers_check CHECK ("passengerCount" BETWEEN 1 AND 14),
  -- A car cannot leave without a vehicle, a driver and a gate pass.
  ADD CONSTRAINT car_assigned_has_vehicle CHECK ("status" NOT IN ('ASSIGNED', 'IN_PROGRESS', 'COMPLETED') OR ("vehicleId" IS NOT NULL AND "driverId" IS NOT NULL AND "gatePassToken" IS NOT NULL));

ALTER TABLE "visits"
  ADD CONSTRAINT visit_status_check CHECK ("status" IN ('EXPECTED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED', 'EXPIRED')),
  ADD CONSTRAINT visit_purpose_check CHECK ("purpose" IN ('MEETING', 'INTERVIEW', 'VENDOR_SUPPLIER', 'CONTRACTOR', 'AUDIT_INSPECTION', 'GOVERNMENT_OFFICIAL', 'DELIVERY', 'PERSONAL', 'OTHER')),
  ADD CONSTRAINT visit_party_check CHECK ("partySize" BETWEEN 1 AND 20),
  ADD CONSTRAINT visit_checked_in_has_time CHECK ("status" NOT IN ('CHECKED_IN', 'CHECKED_OUT') OR "checkedInAt" IS NOT NULL),
  ADD CONSTRAINT visit_checked_out_has_time CHECK ("status" <> 'CHECKED_OUT' OR "checkedOutAt" IS NOT NULL),
  ADD CONSTRAINT visit_id_last4_check CHECK ("idLast4" IS NULL OR "idLast4" ~ '^[0-9A-Za-z]{4}$');

ALTER TABLE "licences"
  ADD CONSTRAINT licence_category_check CHECK ("category" IN ('TRADE', 'FACTORY', 'ENVIRONMENT', 'FIRE_SAFETY', 'ENERGY_REGULATORY', 'EXPLOSIVES', 'BOILER', 'IMPORT_EXPORT', 'STANDARDS', 'OTHER')),
  ADD CONSTRAINT licence_renewal_stage_check CHECK ("renewalStage" IN ('NOT_STARTED', 'DOCUMENTS_PREPARED', 'APPLICATION_SUBMITTED', 'INSPECTION_SCHEDULED', 'FEE_PAID', 'RENEWED')),
  ADD CONSTRAINT licence_lead_days_check CHECK ("renewalLeadDays" BETWEEN 7 AND 365);

ALTER TABLE "notices"
  ADD CONSTRAINT notice_channel_check CHECK ("channel" IN ('CHAIRMAN', 'MANAGING_DIRECTOR', 'HR', 'ADMINISTRATION', 'COMPLIANCE', 'IT')),
  ADD CONSTRAINT notice_category_check CHECK ("category" IN ('GENERAL', 'CIRCULAR', 'POLICY', 'HR', 'SAFETY', 'EVENT', 'HOLIDAY')),
  ADD CONSTRAINT notice_status_check CHECK ("status" IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
  ADD CONSTRAINT notice_audience_check CHECK ("audience" IN ('ALL', 'BRANCHES')),
  ADD CONSTRAINT notice_published_has_time CHECK ("status" = 'DRAFT' OR "publishedAt" IS NOT NULL);

-- Fast "contains" search.
CREATE INDEX tour_requests_title_trgm ON "tour_requests" USING gin ("title" gin_trgm_ops);
CREATE INDEX visits_visitor_name_trgm ON "visits" USING gin ("visitorName" gin_trgm_ops);
CREATE INDEX licences_name_trgm ON "licences" USING gin ("name" gin_trgm_ops);
CREATE INDEX notices_title_trgm ON "notices" USING gin ("title" gin_trgm_ops);
