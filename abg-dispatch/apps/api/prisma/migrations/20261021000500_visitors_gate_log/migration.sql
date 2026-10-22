-- Visitors: who checked a visitor in and out (name snapshots), where they were
-- checked in, who cancelled a pass and why, and when an unused pass lapsed.

-- AlterTable
ALTER TABLE "visits"
  ADD COLUMN "checkedInByName" TEXT,
  ADD COLUMN "checkInPoint" TEXT,
  ADD COLUMN "checkedOutByName" TEXT,
  ADD COLUMN "cancelledById" TEXT,
  ADD COLUMN "cancelledByName" TEXT,
  ADD COLUMN "cancelReason" TEXT,
  ADD COLUMN "expiredAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "visits_branchId_checkedInAt_idx" ON "visits"("branchId", "checkedInAt");

-- CreateIndex: the end-of-day sweep finds unused passes by status and day.
CREATE INDEX "visits_status_expectedAt_idx" ON "visits"("status", "expectedAt");

-- Every terminal state carries its time, and a visit cannot end before it began.
ALTER TABLE "visits"
  ADD CONSTRAINT visit_cancelled_has_time CHECK ("status" <> 'CANCELLED' OR "cancelledAt" IS NOT NULL),
  ADD CONSTRAINT visit_expired_has_time CHECK ("status" <> 'EXPIRED' OR "expiredAt" IS NOT NULL),
  ADD CONSTRAINT visit_out_after_in CHECK ("checkedOutAt" IS NULL OR ("checkedInAt" IS NOT NULL AND "checkedOutAt" >= "checkedInAt")),
  ADD CONSTRAINT visit_until_after_expected CHECK ("expectedUntil" IS NULL OR "expectedUntil" > "expectedAt");
