-- Incident & Facility Issue Management.
--
-- Reworks the incident reports of 20261020000300 into the client's module:
--   * four stages     PENDING / PROCESSING / DONE / DECLINED
--                     → REPORTED → ACKNOWLEDGED → UNDER_INVESTIGATION → CLOSED
--   * a resolution    on every closed report (RESOLVED, NO_ACTION_NEEDED,
--                     DUPLICATE, REFERRED)
--   * four groups     SAFETY_INDUSTRIAL, ADMIN_FACILITY, SECURITY, IT_TECHNICAL,
--                     stored next to the sub-category for filtering
--   * severities      CRITICAL, HIGH, MEDIUM, LOW (URGENT becomes CRITICAL)
--   * confidential    head office only; always true for misconduct
-- and moves every existing report and its history onto the new vocabulary.
-- The whole file runs in one transaction: it applies completely or not at all.

-- ── 1. New columns ──────────────────────────────────────────────────────────

ALTER TABLE "incidents"
  ADD COLUMN "group" TEXT,
  ADD COLUMN "confidential" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "resolution" TEXT,
  ADD COLUMN "acknowledgedAt" TIMESTAMP(3),
  ADD COLUMN "investigationStartedAt" TIMESTAMP(3),
  ADD COLUMN "closedAt" TIMESTAMP(3);

-- The old vocabulary's checks would reject the new values; they are replaced in step 5.
ALTER TABLE "incidents"
  DROP CONSTRAINT incidents_status_check,
  DROP CONSTRAINT incidents_severity_check,
  DROP CONSTRAINT incidents_category_check,
  DROP CONSTRAINT incidents_done_has_time,
  DROP CONSTRAINT incidents_declined_has_time;

-- ── 2. Existing reports ─────────────────────────────────────────────────────

-- Sub-categories that were renamed or narrowed.
UPDATE "incidents" SET "category" = 'ELECTRICAL_HAZARD' WHERE "category" = 'ELECTRICAL';
UPDATE "incidents" SET "category" = 'GATE_LOCK' WHERE "category" = 'SECURITY';

UPDATE "incidents" SET "severity" = 'CRITICAL' WHERE "severity" = 'URGENT';

UPDATE "incidents" SET
  "group" = CASE
    WHEN "category" IN ('FIRE_HAZARD', 'GAS_LEAK', 'CHEMICAL_SPILL', 'INJURY_NEAR_MISS', 'ELECTRICAL_HAZARD', 'MACHINERY_FAULT', 'PPE_VIOLATION', 'SAFETY_HAZARD') THEN 'SAFETY_INDUSTRIAL'
    WHEN "category" IN ('UNAUTHORISED_ACCESS', 'THEFT_LOSS', 'CCTV_FAULT', 'GATE_LOCK', 'MISCONDUCT') THEN 'SECURITY'
    WHEN "category" IN ('NETWORK_DOWN', 'COMPUTER_PRINTER', 'SOFTWARE_ACCESS', 'TELEPHONE', 'POWER_UPS') THEN 'IT_TECHNICAL'
    ELSE 'ADMIN_FACILITY'
  END,
  -- Misconduct was already head-office-only; it is now the "confidential" flag.
  "confidential" = ("category" = 'MISCONDUCT');

-- Stage timestamps. acknowledgedAt is the first time a handler acted on the
-- report (the old model had no separate acknowledgement step).
UPDATE "incidents" SET
  "acknowledgedAt" = CASE WHEN "status" <> 'PENDING' THEN COALESCE("processingAt", "doneAt", "declinedAt", "statusChangedAt") END,
  "investigationStartedAt" = CASE WHEN "status" = 'PROCESSING' THEN COALESCE("processingAt", "statusChangedAt") ELSE "processingAt" END,
  "closedAt" = CASE
    WHEN "status" = 'DONE' THEN COALESCE("doneAt", "statusChangedAt")
    WHEN "status" = 'DECLINED' THEN COALESCE("declinedAt", "statusChangedAt")
  END,
  "resolution" = CASE
    WHEN "status" = 'DONE' THEN 'RESOLVED'
    WHEN "status" = 'DECLINED' THEN 'NO_ACTION_NEEDED'
  END,
  "status" = CASE "status"
    WHEN 'PENDING' THEN 'REPORTED'
    WHEN 'PROCESSING' THEN 'UNDER_INVESTIGATION'
    WHEN 'DONE' THEN 'CLOSED'
    WHEN 'DECLINED' THEN 'CLOSED'
    ELSE "status"
  END;

-- The old per-outcome timestamps now live in investigationStartedAt / closedAt.
ALTER TABLE "incidents"
  DROP COLUMN "processingAt",
  DROP COLUMN "doneAt",
  DROP COLUMN "declinedAt";

ALTER TABLE "incidents" ALTER COLUMN "group" SET NOT NULL;
ALTER TABLE "incidents" ALTER COLUMN "status" SET DEFAULT 'REPORTED';

-- ── 3. Existing history ─────────────────────────────────────────────────────

-- incident_updates is append-only: the incident_updates_append_only trigger
-- (20261020000300) refuses every UPDATE and DELETE, so that a report's history
-- can be added to but never rewritten by the application or by hand. This
-- one-off vocabulary change is the single sanctioned exception: the stored
-- stage names must match the new ones, or the apps could not draw the history
-- and the stage tracker of every existing report. Only the status words and
-- the old codes inside DETAILS_CHANGED metadata are translated — no row is
-- added, removed, re-dated or re-attributed, and every note is kept as
-- written. The trigger is switched off for these statements only and back on
-- before the migration ends; DISABLE TRIGGER takes an exclusive lock on the
-- table, and the migration runs in a single transaction, so no other session
-- can write to the table while the guard is down. audit_logs is not touched:
-- it keeps its original wording as evidence of what was done at the time.
ALTER TABLE "incident_updates" DISABLE TRIGGER incident_updates_append_only;

UPDATE "incident_updates" SET
  "fromStatus" = CASE "fromStatus"
    WHEN 'PENDING' THEN 'REPORTED'
    WHEN 'PROCESSING' THEN 'UNDER_INVESTIGATION'
    WHEN 'DONE' THEN 'CLOSED'
    WHEN 'DECLINED' THEN 'CLOSED'
    ELSE "fromStatus"
  END,
  "toStatus" = CASE "toStatus"
    WHEN 'PENDING' THEN 'REPORTED'
    WHEN 'PROCESSING' THEN 'UNDER_INVESTIGATION'
    WHEN 'DONE' THEN 'CLOSED'
    WHEN 'DECLINED' THEN 'CLOSED'
    ELSE "toStatus"
  END,
  -- A close now always says how it was closed.
  "metadata" = CASE
    WHEN "type" = 'STATUS_CHANGED' AND "toStatus" = 'DONE' THEN "metadata" || '{"resolution": "RESOLVED"}'::jsonb
    WHEN "type" = 'STATUS_CHANGED' AND "toStatus" = 'DECLINED' THEN "metadata" || '{"resolution": "NO_ACTION_NEEDED"}'::jsonb
    ELSE "metadata"
  END
WHERE "fromStatus" IN ('PENDING', 'PROCESSING', 'DONE', 'DECLINED')
   OR "toStatus" IN ('PENDING', 'PROCESSING', 'DONE', 'DECLINED');

-- Severity and category edits recorded with the old codes.
UPDATE "incident_updates" SET "metadata" = jsonb_set("metadata", '{severity,before}', '"CRITICAL"')
WHERE "type" = 'DETAILS_CHANGED' AND "metadata" #>> '{severity,before}' = 'URGENT';
UPDATE "incident_updates" SET "metadata" = jsonb_set("metadata", '{severity,after}', '"CRITICAL"')
WHERE "type" = 'DETAILS_CHANGED' AND "metadata" #>> '{severity,after}' = 'URGENT';
UPDATE "incident_updates" SET "metadata" = jsonb_set("metadata", '{category,before}',
    CASE "metadata" #>> '{category,before}' WHEN 'ELECTRICAL' THEN '"ELECTRICAL_HAZARD"'::jsonb ELSE '"GATE_LOCK"'::jsonb END)
WHERE "type" = 'DETAILS_CHANGED' AND "metadata" #>> '{category,before}' IN ('ELECTRICAL', 'SECURITY');
UPDATE "incident_updates" SET "metadata" = jsonb_set("metadata", '{category,after}',
    CASE "metadata" #>> '{category,after}' WHEN 'ELECTRICAL' THEN '"ELECTRICAL_HAZARD"'::jsonb ELSE '"GATE_LOCK"'::jsonb END)
WHERE "type" = 'DETAILS_CHANGED' AND "metadata" #>> '{category,after}' IN ('ELECTRICAL', 'SECURITY');

ALTER TABLE "incident_updates" ENABLE TRIGGER incident_updates_append_only;

-- Inbox items keep the stage they were sent at, which the app uses for the icon.
UPDATE "notifications" SET "data" = jsonb_set("data", '{status}', to_jsonb(CASE "data" ->> 'status'
    WHEN 'PENDING' THEN 'REPORTED'
    WHEN 'PROCESSING' THEN 'UNDER_INVESTIGATION'
    ELSE 'CLOSED'
  END))
WHERE "data" ? 'incidentId' AND "data" ->> 'status' IN ('PENDING', 'PROCESSING', 'DONE', 'DECLINED');

-- ── 4. Index ────────────────────────────────────────────────────────────────

CREATE INDEX "incidents_group_status_idx" ON "incidents"("group", "status");

-- ── 5. Integrity ────────────────────────────────────────────────────────────

ALTER TABLE "incidents" ADD CONSTRAINT incidents_status_check
  CHECK ("status" IN ('REPORTED', 'ACKNOWLEDGED', 'UNDER_INVESTIGATION', 'CLOSED'));
ALTER TABLE "incidents" ADD CONSTRAINT incidents_severity_check
  CHECK ("severity" IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW'));
ALTER TABLE "incidents" ADD CONSTRAINT incidents_group_check
  CHECK ("group" IN ('SAFETY_INDUSTRIAL', 'ADMIN_FACILITY', 'SECURITY', 'IT_TECHNICAL'));
ALTER TABLE "incidents" ADD CONSTRAINT incidents_category_check
  CHECK ("category" IN (
    'FIRE_HAZARD', 'GAS_LEAK', 'CHEMICAL_SPILL', 'INJURY_NEAR_MISS', 'ELECTRICAL_HAZARD', 'MACHINERY_FAULT', 'PPE_VIOLATION', 'SAFETY_HAZARD',
    'BUILDING_DAMAGE', 'CLEANLINESS', 'CAFETERIA_HYGIENE', 'WASHROOM', 'WATER_SUPPLY', 'AC_VENTILATION', 'FURNITURE_FIXTURES', 'PEST_CONTROL', 'OTHER',
    'UNAUTHORISED_ACCESS', 'THEFT_LOSS', 'CCTV_FAULT', 'GATE_LOCK', 'MISCONDUCT',
    'NETWORK_DOWN', 'COMPUTER_PRINTER', 'SOFTWARE_ACCESS', 'TELEPHONE', 'POWER_UPS'));
-- The stored group is always the sub-category's group.
ALTER TABLE "incidents" ADD CONSTRAINT incidents_group_matches_category
  CHECK ("group" = CASE
    WHEN "category" IN ('FIRE_HAZARD', 'GAS_LEAK', 'CHEMICAL_SPILL', 'INJURY_NEAR_MISS', 'ELECTRICAL_HAZARD', 'MACHINERY_FAULT', 'PPE_VIOLATION', 'SAFETY_HAZARD') THEN 'SAFETY_INDUSTRIAL'
    WHEN "category" IN ('UNAUTHORISED_ACCESS', 'THEFT_LOSS', 'CCTV_FAULT', 'GATE_LOCK', 'MISCONDUCT') THEN 'SECURITY'
    WHEN "category" IN ('NETWORK_DOWN', 'COMPUTER_PRINTER', 'SOFTWARE_ACCESS', 'TELEPHONE', 'POWER_UPS') THEN 'IT_TECHNICAL'
    ELSE 'ADMIN_FACILITY'
  END);
ALTER TABLE "incidents" ADD CONSTRAINT incidents_resolution_check
  CHECK ("resolution" IS NULL OR "resolution" IN ('RESOLVED', 'NO_ACTION_NEEDED', 'DUPLICATE', 'REFERRED'));
-- A closed report says when and how it was closed; an open one has no resolution.
ALTER TABLE "incidents" ADD CONSTRAINT incidents_closed_has_resolution
  CHECK ("status" <> 'CLOSED' OR ("closedAt" IS NOT NULL AND "resolution" IS NOT NULL));
ALTER TABLE "incidents" ADD CONSTRAINT incidents_open_has_no_resolution
  CHECK ("status" = 'CLOSED' OR "resolution" IS NULL);
-- Each stage past Reported records when it was reached.
ALTER TABLE "incidents" ADD CONSTRAINT incidents_acknowledged_has_time
  CHECK ("status" = 'REPORTED' OR "acknowledgedAt" IS NOT NULL);
ALTER TABLE "incidents" ADD CONSTRAINT incidents_investigation_has_time
  CHECK ("status" <> 'UNDER_INVESTIGATION' OR "investigationStartedAt" IS NOT NULL);
-- Misconduct is always confidential.
ALTER TABLE "incidents" ADD CONSTRAINT incidents_misconduct_confidential
  CHECK ("category" <> 'MISCONDUCT' OR "confidential");
