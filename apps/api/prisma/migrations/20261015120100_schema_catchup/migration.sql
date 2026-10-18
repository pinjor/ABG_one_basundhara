-- AlterTable
ALTER TABLE "access_log_entries" ADD COLUMN     "reason" TEXT;

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "detail" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "featureKey" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "eventPackId" TEXT;

-- AlterTable
ALTER TABLE "service_requests" ADD COLUMN     "eventPackId" TEXT;

-- AlterTable
ALTER TABLE "trips" ADD COLUMN     "eventPackId" TEXT;

-- AlterTable
ALTER TABLE "vip_guests" ADD COLUMN     "eventPackId" TEXT;

-- AlterTable
ALTER TABLE "visitors" ADD COLUMN     "eventPackId" TEXT;

-- CreateTable
CREATE TABLE "event_packs" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Planning',
    "expectedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_packs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ops_tasks" (
    "id" TEXT NOT NULL,
    "eventPackId" TEXT,
    "title" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Open',
    "priority" TEXT NOT NULL DEFAULT 'Normal',
    "dueAt" TIMESTAMP(3),
    "relatedType" TEXT,
    "relatedId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ops_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ops_incidents" (
    "id" TEXT NOT NULL,
    "eventPackId" TEXT,
    "title" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'Medium',
    "status" TEXT NOT NULL DEFAULT 'Open',
    "relatedType" TEXT,
    "relatedId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ops_incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credentials" (
    "id" TEXT NOT NULL,
    "holderRef" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "code" TEXT NOT NULL,
    "eventPackId" TEXT,
    "memberId" TEXT,
    "visitorId" TEXT,
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parking_reservations" (
    "id" TEXT NOT NULL,
    "eventPackId" TEXT NOT NULL,
    "parkingZoneId" TEXT NOT NULL,
    "plateNumber" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Reserved',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "parking_reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "href" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "match_events" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sport" TEXT NOT NULL,
    "venueName" TEXT NOT NULL,
    "venueNote" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "doorsAt" TIMESTAMP(3) NOT NULL,
    "salesStatus" TEXT NOT NULL DEFAULT 'ON_SALE',
    "vatRateBps" INTEGER NOT NULL DEFAULT 1500,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "match_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_sections" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rows" INTEGER NOT NULL,
    "seatsPerRow" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "event_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_categories" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priceBdt" DECIMAL(12,2) NOT NULL,
    "gateName" TEXT NOT NULL,

    CONSTRAINT "ticket_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_orders" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "buyerName" TEXT NOT NULL,
    "buyerMobile" TEXT NOT NULL,
    "buyerEmail" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "holdExpiresAt" TIMESTAMP(3) NOT NULL,
    "holdCeilingAt" TIMESTAMP(3) NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "vat" DECIMAL(12,2) NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,
    "termsAccepted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ticket_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_order_items" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "rowLabel" TEXT NOT NULL,
    "seatNumber" INTEGER NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "ticket_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seat_holds" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "rowLabel" TEXT NOT NULL,
    "seatNumber" INTEGER NOT NULL,
    "orderId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seat_holds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_payments" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "providerRef" TEXT,
    "sandbox" BOOLEAN NOT NULL DEFAULT true,
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ticket_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "issued_tickets" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "tokenPlain" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'VALID',
    "gateName" TEXT NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "issued_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refund_requests" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'REQUESTED',
    "decidedById" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refund_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "access_verifications" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "scanId" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "ticketId" TEXT,
    "gateId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "access_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "module_desk_records" (
    "id" TEXT NOT NULL,
    "moduleKey" TEXT NOT NULL,
    "featureKey" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "party" TEXT NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "amountBdt" DECIMAL(14,2),
    "details" JSONB NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "module_desk_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idempotency_records" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "statusCode" INTEGER NOT NULL,
    "body" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "idempotency_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "event_packs_bookingId_key" ON "event_packs"("bookingId");

-- CreateIndex
CREATE INDEX "ops_tasks_eventPackId_status_idx" ON "ops_tasks"("eventPackId", "status");

-- CreateIndex
CREATE INDEX "ops_incidents_eventPackId_status_idx" ON "ops_incidents"("eventPackId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "credentials_code_key" ON "credentials"("code");

-- CreateIndex
CREATE INDEX "credentials_holderRef_idx" ON "credentials"("holderRef");

-- CreateIndex
CREATE INDEX "credentials_eventPackId_idx" ON "credentials"("eventPackId");

-- CreateIndex
CREATE INDEX "parking_reservations_eventPackId_idx" ON "parking_reservations"("eventPackId");

-- CreateIndex
CREATE INDEX "match_events_startsAt_idx" ON "match_events"("startsAt");

-- CreateIndex
CREATE INDEX "event_sections_eventId_idx" ON "event_sections"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "ticket_categories_sectionId_key" ON "ticket_categories"("sectionId");

-- CreateIndex
CREATE INDEX "ticket_categories_eventId_idx" ON "ticket_categories"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "ticket_orders_reference_key" ON "ticket_orders"("reference");

-- CreateIndex
CREATE INDEX "ticket_orders_eventId_idx" ON "ticket_orders"("eventId");

-- CreateIndex
CREATE INDEX "ticket_orders_buyerMobile_idx" ON "ticket_orders"("buyerMobile");

-- CreateIndex
CREATE INDEX "ticket_orders_status_idx" ON "ticket_orders"("status");

-- CreateIndex
CREATE INDEX "ticket_order_items_orderId_idx" ON "ticket_order_items"("orderId");

-- CreateIndex
CREATE INDEX "ticket_order_items_sectionId_rowLabel_seatNumber_idx" ON "ticket_order_items"("sectionId", "rowLabel", "seatNumber");

-- CreateIndex
CREATE INDEX "seat_holds_orderId_idx" ON "seat_holds"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "seat_holds_eventId_sectionId_rowLabel_seatNumber_key" ON "seat_holds"("eventId", "sectionId", "rowLabel", "seatNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ticket_payments_orderId_key" ON "ticket_payments"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "issued_tickets_itemId_key" ON "issued_tickets"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "issued_tickets_tokenHash_key" ON "issued_tickets"("tokenHash");

-- CreateIndex
CREATE INDEX "issued_tickets_orderId_idx" ON "issued_tickets"("orderId");

-- CreateIndex
CREATE INDEX "refund_requests_orderId_idx" ON "refund_requests"("orderId");

-- CreateIndex
CREATE INDEX "refund_requests_status_idx" ON "refund_requests"("status");

-- CreateIndex
CREATE INDEX "access_verifications_createdAt_idx" ON "access_verifications"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "access_verifications_deviceId_scanId_key" ON "access_verifications"("deviceId", "scanId");

-- CreateIndex
CREATE UNIQUE INDEX "module_desk_records_reference_key" ON "module_desk_records"("reference");

-- CreateIndex
CREATE INDEX "module_desk_records_moduleKey_featureKey_idx" ON "module_desk_records"("moduleKey", "featureKey");

-- CreateIndex
CREATE UNIQUE INDEX "idempotency_records_key_key" ON "idempotency_records"("key");

-- CreateIndex
CREATE INDEX "orders_eventPackId_idx" ON "orders"("eventPackId");

-- CreateIndex
CREATE INDEX "service_requests_eventPackId_idx" ON "service_requests"("eventPackId");

-- CreateIndex
CREATE INDEX "trips_eventPackId_idx" ON "trips"("eventPackId");

-- CreateIndex
CREATE INDEX "vip_guests_eventPackId_idx" ON "vip_guests"("eventPackId");

-- CreateIndex
CREATE INDEX "visitors_eventPackId_idx" ON "visitors"("eventPackId");

-- AddForeignKey
ALTER TABLE "event_packs" ADD CONSTRAINT "event_packs_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ops_tasks" ADD CONSTRAINT "ops_tasks_eventPackId_fkey" FOREIGN KEY ("eventPackId") REFERENCES "event_packs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ops_incidents" ADD CONSTRAINT "ops_incidents_eventPackId_fkey" FOREIGN KEY ("eventPackId") REFERENCES "event_packs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credentials" ADD CONSTRAINT "credentials_eventPackId_fkey" FOREIGN KEY ("eventPackId") REFERENCES "event_packs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parking_reservations" ADD CONSTRAINT "parking_reservations_eventPackId_fkey" FOREIGN KEY ("eventPackId") REFERENCES "event_packs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parking_reservations" ADD CONSTRAINT "parking_reservations_parkingZoneId_fkey" FOREIGN KEY ("parkingZoneId") REFERENCES "parking_zones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitors" ADD CONSTRAINT "visitors_eventPackId_fkey" FOREIGN KEY ("eventPackId") REFERENCES "event_packs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vip_guests" ADD CONSTRAINT "vip_guests_eventPackId_fkey" FOREIGN KEY ("eventPackId") REFERENCES "event_packs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_eventPackId_fkey" FOREIGN KEY ("eventPackId") REFERENCES "event_packs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_eventPackId_fkey" FOREIGN KEY ("eventPackId") REFERENCES "event_packs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_eventPackId_fkey" FOREIGN KEY ("eventPackId") REFERENCES "event_packs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_sections" ADD CONSTRAINT "event_sections_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "match_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_categories" ADD CONSTRAINT "ticket_categories_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "match_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_categories" ADD CONSTRAINT "ticket_categories_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "event_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_orders" ADD CONSTRAINT "ticket_orders_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "match_events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_order_items" ADD CONSTRAINT "ticket_order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "ticket_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seat_holds" ADD CONSTRAINT "seat_holds_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "event_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seat_holds" ADD CONSTRAINT "seat_holds_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "ticket_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_payments" ADD CONSTRAINT "ticket_payments_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "ticket_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issued_tickets" ADD CONSTRAINT "issued_tickets_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "ticket_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issued_tickets" ADD CONSTRAINT "issued_tickets_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "ticket_order_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund_requests" ADD CONSTRAINT "refund_requests_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "ticket_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

