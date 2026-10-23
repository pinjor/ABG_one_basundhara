-- Pool cars: why a vehicle is out of service, and the trip rules the API already enforces, held by the database too.

-- AlterTable
ALTER TABLE "vehicles" ADD COLUMN "statusNote" TEXT,
ADD COLUMN "statusChangedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "car_requisitions_vehicleId_status_idx" ON "car_requisitions"("vehicleId", "status");

ALTER TABLE "vehicles"
  ADD CONSTRAINT vehicle_odometer_check CHECK ("odometerKm" >= 0);

ALTER TABLE "car_requisitions"
  ADD CONSTRAINT car_vehicle_preference_check CHECK ("vehiclePreference" IN ('ANY', 'SEDAN', 'SUV', 'MICROBUS', 'PICKUP', 'COASTER')),
  -- A car comes back after it leaves.
  ADD CONSTRAINT car_return_after_pickup CHECK ("returnAt" IS NULL OR "returnAt" > "pickupAt"),
  -- Odometer readings only go forward.
  ADD CONSTRAINT car_odometer_check CHECK ("startOdometerKm" IS NULL OR "endOdometerKm" IS NULL OR "endOdometerKm" >= "startOdometerKm"),
  -- A trip in progress or finished has a start time; a finished one an end time.
  ADD CONSTRAINT car_started_has_time CHECK ("status" NOT IN ('IN_PROGRESS', 'COMPLETED') OR "startedAt" IS NOT NULL),
  ADD CONSTRAINT car_completed_has_time CHECK ("status" <> 'COMPLETED' OR "completedAt" IS NOT NULL);
