-- Workplace incident reports: reports, their append-only history, and photos.

-- CreateTable
CREATE TABLE "incidents" (
    "id" TEXT NOT NULL,
    "referenceNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'MEDIUM',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "branchId" TEXT NOT NULL,
    "locationId" TEXT,
    "locationDetail" TEXT,
    "reporterUserId" TEXT NOT NULL,
    "anonymous" BOOLEAN NOT NULL DEFAULT false,
    "statusNote" TEXT,
    "statusChangedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processingAt" TIMESTAMP(3),
    "doneAt" TIMESTAMP(3),
    "declinedAt" TIMESTAMP(3),
    "lastHandledById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incident_updates" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT,
    "note" TEXT,
    "actorUserId" TEXT,
    "actorName" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "incident_updates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incident_photos" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "uploadedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "incident_photos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "incidents_referenceNumber_key" ON "incidents"("referenceNumber");

-- CreateIndex
CREATE INDEX "incidents_branchId_status_idx" ON "incidents"("branchId", "status");

-- CreateIndex
CREATE INDEX "incidents_status_createdAt_idx" ON "incidents"("status", "createdAt");

-- CreateIndex
CREATE INDEX "incidents_reporterUserId_createdAt_idx" ON "incidents"("reporterUserId", "createdAt");

-- CreateIndex
CREATE INDEX "incident_updates_incidentId_createdAt_idx" ON "incident_updates"("incidentId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "incident_photos_storageKey_key" ON "incident_photos"("storageKey");

-- CreateIndex
CREATE INDEX "incident_photos_incidentId_idx" ON "incident_photos"("incidentId");

-- AddForeignKey
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_reporterUserId_fkey" FOREIGN KEY ("reporterUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_updates" ADD CONSTRAINT "incident_updates_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_photos" ADD CONSTRAINT "incident_photos_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ── Integrity ───────────────────────────────────────────────────────────────

-- An incident's history is evidence: it can be added to, never edited or deleted.
CREATE TRIGGER incident_updates_append_only
  BEFORE UPDATE OR DELETE ON "incident_updates"
  FOR EACH ROW EXECUTE FUNCTION abg_forbid_mutation();

ALTER TABLE "incidents" ADD CONSTRAINT incidents_status_check
  CHECK ("status" IN ('PENDING', 'PROCESSING', 'DONE', 'DECLINED'));
ALTER TABLE "incidents" ADD CONSTRAINT incidents_severity_check
  CHECK ("severity" IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT'));
ALTER TABLE "incidents" ADD CONSTRAINT incidents_category_check
  CHECK ("category" IN ('BUILDING_DAMAGE', 'CLEANLINESS', 'CAFETERIA_HYGIENE', 'WASHROOM', 'SAFETY_HAZARD', 'ELECTRICAL', 'SECURITY', 'MISCONDUCT', 'OTHER'));
-- A closed incident records when it was closed.
ALTER TABLE "incidents" ADD CONSTRAINT incidents_done_has_time
  CHECK ("status" <> 'DONE' OR "doneAt" IS NOT NULL);
ALTER TABLE "incidents" ADD CONSTRAINT incidents_declined_has_time
  CHECK ("status" <> 'DECLINED' OR "declinedAt" IS NOT NULL);
ALTER TABLE "incident_photos" ADD CONSTRAINT incident_photos_kind_check
  CHECK ("kind" IN ('REPORT', 'RESOLUTION'));

CREATE INDEX incidents_title_trgm ON "incidents" USING gin ("title" gin_trgm_ops);
