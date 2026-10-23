-- ABG ONE: Request for appointment, Audits, Leave.
-- Tables first (as Prisma would create them), then the rules the API
-- enforces, repeated in the database so no script or manual fix can leave a
-- record in an impossible state.

-- CreateTable
CREATE TABLE "appointments" (
    "id" TEXT NOT NULL,
    "referenceNumber" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "agenda" TEXT NOT NULL DEFAULT '',
    "mode" TEXT NOT NULL DEFAULT 'IN_PERSON',
    "durationMinutes" INTEGER NOT NULL,
    "preferredAt" TIMESTAMP(3) NOT NULL,
    "alternativeAt" TIMESTAMP(3),
    "scheduledAt" TIMESTAMP(3),
    "location" TEXT,
    "attendees" JSONB NOT NULL DEFAULT '[]',
    "urgent" BOOLEAN NOT NULL DEFAULT false,
    "requesterUserId" TEXT NOT NULL,
    "hostUserId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "statusNote" TEXT,
    "statusChangedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedByName" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "declinedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointment_updates" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT,
    "note" TEXT,
    "actorUserId" TEXT,
    "actorName" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "appointment_updates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audits" (
    "id" TEXT NOT NULL,
    "referenceNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT '',
    "branchId" TEXT NOT NULL,
    "externalBody" TEXT,
    "team" JSONB NOT NULL DEFAULT '[]',
    "leadUserId" TEXT NOT NULL,
    "plannedStart" DATE NOT NULL,
    "plannedEnd" DATE NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "rating" TEXT,
    "score" INTEGER,
    "conclusion" TEXT,
    "statusNote" TEXT,
    "statusChangedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "fieldworkCompletedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdByName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "audits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_findings" (
    "id" TEXT NOT NULL,
    "auditId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "number" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "detail" TEXT NOT NULL DEFAULT '',
    "clause" TEXT,
    "area" TEXT,
    "severity" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "recommendation" TEXT,
    "ownerUserId" TEXT,
    "dueDate" DATE,
    "response" TEXT,
    "submittedAt" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "verifiedByName" TEXT,
    "overdueNotifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "audit_findings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_updates" (
    "id" TEXT NOT NULL,
    "auditId" TEXT NOT NULL,
    "findingId" TEXT,
    "type" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT,
    "note" TEXT,
    "actorUserId" TEXT,
    "actorName" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_updates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_requests" (
    "id" TEXT NOT NULL,
    "referenceNumber" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "halfDay" TEXT,
    "days" DOUBLE PRECISION NOT NULL,
    "year" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "addressDuringLeave" TEXT,
    "contactPhone" TEXT,
    "applicantUserId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "departmentId" TEXT,
    "approverUserId" TEXT NOT NULL,
    "relieverEmployeeId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING_HOD',
    "statusNote" TEXT,
    "statusChangedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hodApprovedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leave_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_updates" (
    "id" TEXT NOT NULL,
    "leaveId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT,
    "note" TEXT,
    "actorUserId" TEXT,
    "actorName" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leave_updates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_entitlements" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "days" DOUBLE PRECISION NOT NULL,
    "note" TEXT,
    "updatedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leave_entitlements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "appointments_referenceNumber_key" ON "appointments"("referenceNumber");

-- CreateIndex
CREATE INDEX "appointments_hostUserId_status_scheduledAt_idx" ON "appointments"("hostUserId", "status", "scheduledAt");

-- CreateIndex
CREATE INDEX "appointments_requesterUserId_createdAt_idx" ON "appointments"("requesterUserId", "createdAt");

-- CreateIndex
CREATE INDEX "appointments_status_scheduledAt_idx" ON "appointments"("status", "scheduledAt");

-- CreateIndex
CREATE INDEX "appointment_updates_appointmentId_createdAt_idx" ON "appointment_updates"("appointmentId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "audits_referenceNumber_key" ON "audits"("referenceNumber");

-- CreateIndex
CREATE INDEX "audits_branchId_status_idx" ON "audits"("branchId", "status");

-- CreateIndex
CREATE INDEX "audits_status_plannedStart_idx" ON "audits"("status", "plannedStart");

-- CreateIndex
CREATE INDEX "audits_leadUserId_idx" ON "audits"("leadUserId");

-- CreateIndex
CREATE INDEX "audit_findings_ownerUserId_status_idx" ON "audit_findings"("ownerUserId", "status");

-- CreateIndex
CREATE INDEX "audit_findings_status_dueDate_idx" ON "audit_findings"("status", "dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "audit_findings_auditId_sequence_key" ON "audit_findings"("auditId", "sequence");

-- CreateIndex
CREATE INDEX "audit_updates_auditId_createdAt_idx" ON "audit_updates"("auditId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "leave_requests_referenceNumber_key" ON "leave_requests"("referenceNumber");

-- CreateIndex
CREATE INDEX "leave_requests_applicantUserId_startDate_idx" ON "leave_requests"("applicantUserId", "startDate");

-- CreateIndex
CREATE INDEX "leave_requests_approverUserId_status_idx" ON "leave_requests"("approverUserId", "status");

-- CreateIndex
CREATE INDEX "leave_requests_status_startDate_idx" ON "leave_requests"("status", "startDate");

-- CreateIndex
CREATE INDEX "leave_requests_branchId_status_idx" ON "leave_requests"("branchId", "status");

-- CreateIndex
CREATE INDEX "leave_updates_leaveId_createdAt_idx" ON "leave_updates"("leaveId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "leave_entitlements_userId_year_type_key" ON "leave_entitlements"("userId", "year", "type");

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_requesterUserId_fkey" FOREIGN KEY ("requesterUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_hostUserId_fkey" FOREIGN KEY ("hostUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_updates" ADD CONSTRAINT "appointment_updates_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audits" ADD CONSTRAINT "audits_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audits" ADD CONSTRAINT "audits_leadUserId_fkey" FOREIGN KEY ("leadUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_findings" ADD CONSTRAINT "audit_findings_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "audits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_findings" ADD CONSTRAINT "audit_findings_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_updates" ADD CONSTRAINT "audit_updates_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "audits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_applicantUserId_fkey" FOREIGN KEY ("applicantUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_approverUserId_fkey" FOREIGN KEY ("approverUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_relieverEmployeeId_fkey" FOREIGN KEY ("relieverEmployeeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_updates" ADD CONSTRAINT "leave_updates_leaveId_fkey" FOREIGN KEY ("leaveId") REFERENCES "leave_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_entitlements" ADD CONSTRAINT "leave_entitlements_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- ── Integrity ───────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- History is append-only.
CREATE TRIGGER appointment_updates_append_only BEFORE UPDATE OR DELETE ON "appointment_updates"
  FOR EACH ROW EXECUTE FUNCTION abg_forbid_mutation();
CREATE TRIGGER audit_updates_append_only BEFORE UPDATE OR DELETE ON "audit_updates"
  FOR EACH ROW EXECUTE FUNCTION abg_forbid_mutation();
CREATE TRIGGER leave_updates_append_only BEFORE UPDATE OR DELETE ON "leave_updates"
  FOR EACH ROW EXECUTE FUNCTION abg_forbid_mutation();

-- Appointments.
ALTER TABLE "appointments"
  ADD CONSTRAINT appointment_status_check CHECK ("status" IN ('PENDING', 'PROPOSED', 'CONFIRMED', 'COMPLETED', 'DECLINED', 'CANCELLED')),
  ADD CONSTRAINT appointment_purpose_check CHECK ("purpose" IN ('BUSINESS_REVIEW', 'APPROVAL', 'PROJECT_UPDATE', 'PROPOSAL', 'PERSONAL', 'COURTESY', 'OTHER')),
  ADD CONSTRAINT appointment_mode_check CHECK ("mode" IN ('IN_PERSON', 'VIDEO', 'PHONE')),
  ADD CONSTRAINT appointment_duration_check CHECK ("durationMinutes" IN (15, 30, 45, 60, 90, 120)),
  -- Nobody books a meeting with themselves.
  ADD CONSTRAINT appointment_host_not_requester_check CHECK ("hostUserId" <> "requesterUserId"),
  -- A proposed, confirmed or held meeting has a time; confirmed and held ones were confirmed.
  ADD CONSTRAINT appointment_scheduled_check CHECK ("status" NOT IN ('PROPOSED', 'CONFIRMED', 'COMPLETED') OR "scheduledAt" IS NOT NULL),
  ADD CONSTRAINT appointment_confirmed_check CHECK ("status" NOT IN ('CONFIRMED', 'COMPLETED') OR "confirmedAt" IS NOT NULL),
  ADD CONSTRAINT appointment_completed_check CHECK ("status" <> 'COMPLETED' OR "completedAt" IS NOT NULL),
  ADD CONSTRAINT appointment_declined_check CHECK ("status" <> 'DECLINED' OR "declinedAt" IS NOT NULL),
  ADD CONSTRAINT appointment_cancelled_check CHECK ("status" <> 'CANCELLED' OR "cancelledAt" IS NOT NULL),
  -- One host is never in two confirmed meetings at once.
  ADD CONSTRAINT appointment_host_no_clash EXCLUDE USING gist (
    "hostUserId" WITH =,
    tsrange("scheduledAt", "scheduledAt" + make_interval(mins => "durationMinutes")) WITH &&
  ) WHERE ("status" = 'CONFIRMED');

-- Audits.
ALTER TABLE "audits"
  ADD CONSTRAINT audit_type_check CHECK ("type" IN ('INTERNAL', 'COMPLIANCE', 'SAFETY', 'BUYER', 'ISO', 'FINANCIAL', 'ENVIRONMENT')),
  ADD CONSTRAINT audit_status_check CHECK ("status" IN ('PLANNED', 'IN_PROGRESS', 'FOLLOW_UP', 'CLOSED', 'CANCELLED')),
  ADD CONSTRAINT audit_rating_check CHECK ("rating" IS NULL OR "rating" IN ('SATISFACTORY', 'NEEDS_IMPROVEMENT', 'UNSATISFACTORY')),
  ADD CONSTRAINT audit_score_check CHECK ("score" IS NULL OR "score" BETWEEN 0 AND 100),
  ADD CONSTRAINT audit_dates_check CHECK ("plannedEnd" >= "plannedStart"),
  ADD CONSTRAINT audit_started_check CHECK ("status" NOT IN ('IN_PROGRESS', 'FOLLOW_UP', 'CLOSED') OR "startedAt" IS NOT NULL),
  -- Past fieldwork only with the result recorded.
  ADD CONSTRAINT audit_fieldwork_check CHECK ("status" NOT IN ('FOLLOW_UP', 'CLOSED') OR ("fieldworkCompletedAt" IS NOT NULL AND "rating" IS NOT NULL)),
  ADD CONSTRAINT audit_closed_check CHECK ("status" <> 'CLOSED' OR "closedAt" IS NOT NULL),
  ADD CONSTRAINT audit_cancelled_check CHECK ("status" <> 'CANCELLED' OR "cancelledAt" IS NOT NULL);

ALTER TABLE "audit_findings"
  ADD CONSTRAINT audit_finding_severity_check CHECK ("severity" IN ('CRITICAL', 'MAJOR', 'MINOR', 'OBSERVATION')),
  ADD CONSTRAINT audit_finding_status_check CHECK ("status" IN ('OPEN', 'SUBMITTED', 'VERIFIED', 'NOTED')),
  -- Observations are noted; everything else owes a corrective action, with an owner and a due date.
  ADD CONSTRAINT audit_finding_observation_check CHECK (("severity" = 'OBSERVATION') = ("status" = 'NOTED')),
  ADD CONSTRAINT audit_finding_owner_check CHECK ("severity" = 'OBSERVATION' OR ("ownerUserId" IS NOT NULL AND "dueDate" IS NOT NULL)),
  ADD CONSTRAINT audit_finding_submitted_check CHECK ("status" <> 'SUBMITTED' OR ("submittedAt" IS NOT NULL AND "response" IS NOT NULL)),
  ADD CONSTRAINT audit_finding_verified_check CHECK ("status" <> 'VERIFIED' OR "verifiedAt" IS NOT NULL);

-- An audit closes only once every corrective action is verified.
CREATE OR REPLACE FUNCTION abg_audit_close_check() RETURNS trigger AS $$
BEGIN
  IF NEW."status" = 'CLOSED' AND EXISTS (
    SELECT 1 FROM "audit_findings" f WHERE f."auditId" = NEW."id" AND f."status" IN ('OPEN', 'SUBMITTED')
  ) THEN
    RAISE EXCEPTION 'audit % still has open corrective actions', NEW."referenceNumber" USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER audits_close_check BEFORE UPDATE OF "status" ON "audits"
  FOR EACH ROW EXECUTE FUNCTION abg_audit_close_check();

-- Leave.
ALTER TABLE "leave_requests"
  ADD CONSTRAINT leave_type_check CHECK ("type" IN ('CASUAL', 'SICK', 'EARNED', 'MATERNITY', 'PATERNITY', 'UNPAID')),
  ADD CONSTRAINT leave_status_check CHECK ("status" IN ('PENDING_HOD', 'PENDING_HR', 'APPROVED', 'REJECTED', 'CANCELLED')),
  ADD CONSTRAINT leave_half_day_check CHECK ("halfDay" IS NULL OR ("halfDay" IN ('FIRST_HALF', 'SECOND_HALF') AND "startDate" = "endDate" AND "days" = 0.5)),
  ADD CONSTRAINT leave_dates_check CHECK ("endDate" >= "startDate"),
  -- Whole or half days, never nothing.
  ADD CONSTRAINT leave_days_check CHECK ("days" > 0 AND "days" * 2 = floor("days" * 2)),
  ADD CONSTRAINT leave_year_check CHECK ("year" = EXTRACT(YEAR FROM "startDate")),
  ADD CONSTRAINT leave_approver_not_applicant_check CHECK ("approverUserId" <> "applicantUserId"),
  ADD CONSTRAINT leave_hod_approved_check CHECK ("status" NOT IN ('PENDING_HR', 'APPROVED') OR "hodApprovedAt" IS NOT NULL),
  ADD CONSTRAINT leave_approved_check CHECK ("status" <> 'APPROVED' OR "approvedAt" IS NOT NULL),
  ADD CONSTRAINT leave_rejected_check CHECK ("status" <> 'REJECTED' OR "rejectedAt" IS NOT NULL),
  ADD CONSTRAINT leave_cancelled_check CHECK ("status" <> 'CANCELLED' OR "cancelledAt" IS NOT NULL),
  -- Nobody holds two live applications for the same day.
  ADD CONSTRAINT leave_no_overlap EXCLUDE USING gist (
    "applicantUserId" WITH =,
    daterange("startDate", "endDate", '[]') WITH &&
  ) WHERE ("status" IN ('PENDING_HOD', 'PENDING_HR', 'APPROVED'));

ALTER TABLE "leave_entitlements"
  ADD CONSTRAINT leave_entitlement_type_check CHECK ("type" IN ('CASUAL', 'SICK', 'EARNED', 'MATERNITY', 'PATERNITY')),
  ADD CONSTRAINT leave_entitlement_days_check CHECK ("days" >= 0 AND "days" <= 365 AND "days" * 2 = floor("days" * 2));

-- Search.
CREATE INDEX appointments_subject_trgm ON "appointments" USING gin ("subject" gin_trgm_ops);
CREATE INDEX audits_title_trgm ON "audits" USING gin ("title" gin_trgm_ops);
