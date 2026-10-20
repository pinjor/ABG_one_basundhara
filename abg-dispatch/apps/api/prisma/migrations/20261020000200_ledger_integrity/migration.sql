-- Ledger integrity: database-level guarantees that hold even if application code has a bug.

-- 1. Append-only ledger. History is corrected with CORRECTION_ADDED events, never edited.
CREATE OR REPLACE FUNCTION abg_forbid_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION '% is append-only; record a correction event instead', TG_TABLE_NAME
    USING ERRCODE = 'restrict_violation';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER parcel_events_append_only
  BEFORE UPDATE OR DELETE ON "parcel_events"
  FOR EACH ROW EXECUTE FUNCTION abg_forbid_mutation();

CREATE TRIGGER parcel_proofs_append_only
  BEFORE UPDATE OR DELETE ON "parcel_proofs"
  FOR EACH ROW EXECUTE FUNCTION abg_forbid_mutation();

CREATE TRIGGER audit_logs_append_only
  BEFORE UPDATE OR DELETE ON "audit_logs"
  FOR EACH ROW EXECUTE FUNCTION abg_forbid_mutation();

-- 2. Closed vocabularies.
ALTER TABLE "parcels" ADD CONSTRAINT parcels_status_check CHECK ("status" IN (
  'DRAFT', 'BOOKED', 'AWAITING_PICKUP', 'PICKED_UP', 'IN_TRANSIT', 'ARRIVED_AT_DESTINATION',
  'PENDING_RECEIPT', 'RECEIVED', 'ON_HOLD', 'DELIVERY_EXCEPTION', 'DELIVERY_FAILED',
  'RETURN_REQUESTED', 'RETURN_IN_TRANSIT', 'RETURNED', 'CANCELLED'));
ALTER TABLE "parcels" ADD CONSTRAINT parcels_priority_check CHECK ("priority" IN ('NORMAL', 'PRIORITY', 'URGENT', 'CRITICAL'));
ALTER TABLE "parcels" ADD CONSTRAINT parcels_classification_check CHECK ("classification" IN ('NORMAL', 'INTERNAL', 'CONFIDENTIAL', 'HIGHLY_CONFIDENTIAL'));
ALTER TABLE "parcels" ADD CONSTRAINT parcels_delivery_method_check CHECK ("deliveryMethod" IN ('INTERNAL_EMPLOYEE', 'EXTERNAL_COURIER', 'GUEST_PERSON'));
ALTER TABLE "parcels" ADD CONSTRAINT parcels_receiver_type_check CHECK ("receiverType" IN ('EMPLOYEE', 'DEPARTMENT', 'BRANCH', 'EXTERNAL'));
-- A RECEIVED parcel must say who received it and when.
ALTER TABLE "parcels" ADD CONSTRAINT parcels_received_has_receiver CHECK (
  "status" <> 'RECEIVED' OR ("receivedAt" IS NOT NULL AND "actualReceiverName" IS NOT NULL AND "receiptVerification" IS NOT NULL));
ALTER TABLE "carrier_assignments" ADD CONSTRAINT carrier_assignments_type_check CHECK ("carrierType" IN ('INTERNAL_EMPLOYEE', 'EXTERNAL_COURIER', 'GUEST_PERSON'));

-- 3. Status transitions, mirrored from packages/shared/src/stateMachine.ts.
--    test/integrity.test.ts fails if the two ever drift apart.
CREATE TABLE "parcel_status_transitions" (
  "fromStatus" TEXT NOT NULL,
  "toStatus"   TEXT NOT NULL,
  PRIMARY KEY ("fromStatus", "toStatus")
);

INSERT INTO "parcel_status_transitions" ("fromStatus", "toStatus") VALUES
  ('DRAFT', 'BOOKED'),
  ('DRAFT', 'CANCELLED'),
  ('BOOKED', 'AWAITING_PICKUP'),
  ('BOOKED', 'ON_HOLD'),
  ('BOOKED', 'CANCELLED'),
  ('AWAITING_PICKUP', 'PICKED_UP'),
  ('AWAITING_PICKUP', 'BOOKED'),
  ('AWAITING_PICKUP', 'ON_HOLD'),
  ('AWAITING_PICKUP', 'CANCELLED'),
  ('PICKED_UP', 'IN_TRANSIT'),
  ('PICKED_UP', 'DELIVERY_EXCEPTION'),
  ('PICKED_UP', 'ON_HOLD'),
  ('PICKED_UP', 'RETURN_REQUESTED'),
  ('IN_TRANSIT', 'ARRIVED_AT_DESTINATION'),
  ('IN_TRANSIT', 'DELIVERY_EXCEPTION'),
  ('IN_TRANSIT', 'ON_HOLD'),
  ('IN_TRANSIT', 'RETURN_REQUESTED'),
  ('ARRIVED_AT_DESTINATION', 'PENDING_RECEIPT'),
  ('ARRIVED_AT_DESTINATION', 'DELIVERY_EXCEPTION'),
  ('PENDING_RECEIPT', 'RECEIVED'),
  ('PENDING_RECEIPT', 'DELIVERY_EXCEPTION'),
  ('PENDING_RECEIPT', 'DELIVERY_FAILED'),
  ('PENDING_RECEIPT', 'ON_HOLD'),
  ('PENDING_RECEIPT', 'RETURN_REQUESTED'),
  ('ON_HOLD', 'BOOKED'),
  ('ON_HOLD', 'AWAITING_PICKUP'),
  ('ON_HOLD', 'PICKED_UP'),
  ('ON_HOLD', 'IN_TRANSIT'),
  ('ON_HOLD', 'PENDING_RECEIPT'),
  ('ON_HOLD', 'RETURN_REQUESTED'),
  ('ON_HOLD', 'CANCELLED'),
  ('DELIVERY_EXCEPTION', 'PICKED_UP'),
  ('DELIVERY_EXCEPTION', 'IN_TRANSIT'),
  ('DELIVERY_EXCEPTION', 'ARRIVED_AT_DESTINATION'),
  ('DELIVERY_EXCEPTION', 'PENDING_RECEIPT'),
  ('DELIVERY_EXCEPTION', 'DELIVERY_FAILED'),
  ('DELIVERY_EXCEPTION', 'ON_HOLD'),
  ('DELIVERY_EXCEPTION', 'RETURN_REQUESTED'),
  ('DELIVERY_EXCEPTION', 'RETURN_IN_TRANSIT'),
  ('DELIVERY_FAILED', 'IN_TRANSIT'),
  ('DELIVERY_FAILED', 'PENDING_RECEIPT'),
  ('DELIVERY_FAILED', 'RETURN_REQUESTED'),
  ('RETURN_REQUESTED', 'RETURN_IN_TRANSIT'),
  ('RETURN_REQUESTED', 'DELIVERY_EXCEPTION'),
  ('RETURN_IN_TRANSIT', 'RETURNED'),
  ('RETURN_IN_TRANSIT', 'DELIVERY_EXCEPTION');

CREATE OR REPLACE FUNCTION abg_check_status_transition() RETURNS trigger AS $$
BEGIN
  IF NEW."status" IS DISTINCT FROM OLD."status" AND NOT EXISTS (
    SELECT 1 FROM "parcel_status_transitions"
    WHERE "fromStatus" = OLD."status" AND "toStatus" = NEW."status"
  ) THEN
    RAISE EXCEPTION 'Invalid parcel status transition % -> %', OLD."status", NEW."status"
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER parcels_status_transition
  BEFORE UPDATE OF "status" ON "parcels"
  FOR EACH ROW EXECUTE FUNCTION abg_check_status_transition();

-- 4. Fast search on title / description / tracking number.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX parcels_title_trgm ON "parcels" USING gin ("title" gin_trgm_ops);
CREATE INDEX parcels_tracking_trgm ON "parcels" USING gin ("trackingNumber" gin_trgm_ops);
CREATE INDEX employees_name_trgm ON "employees" USING gin ("fullName" gin_trgm_ops);
