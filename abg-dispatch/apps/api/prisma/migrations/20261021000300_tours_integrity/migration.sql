-- Official tours: the rules the API enforces, repeated in the database so no
-- script or manual fix can leave a request in an impossible state.

ALTER TABLE "tour_requests"
  -- Overseas tours always carry a destination country and the traveller's passport.
  ADD CONSTRAINT tour_foreign_details_check CHECK ("type" <> 'FOREIGN' OR ("country" IS NOT NULL AND "passportNumber" IS NOT NULL AND "passportExpiry" IS NOT NULL)),
  -- The advance is part of the budget, never more than it.
  ADD CONSTRAINT tour_advance_within_budget_check CHECK ("advanceRequested" <= "estimatedBudget"),
  -- The head of department can never be the traveller.
  ADD CONSTRAINT tour_approver_not_traveller_check CHECK ("approverUserId" <> "travellerUserId"),
  -- Past the HOD only once the HOD approved; approved only once vetted, with a sanctioned amount.
  ADD CONSTRAINT tour_hod_approved_check CHECK ("status" NOT IN ('PENDING_VETTING', 'PENDING_SANCTION', 'APPROVED', 'ACTIVE', 'COMPLETED') OR "hodApprovedAt" IS NOT NULL),
  ADD CONSTRAINT tour_vetted_check CHECK ("status" NOT IN ('PENDING_SANCTION', 'APPROVED', 'ACTIVE', 'COMPLETED') OR "vettedAt" IS NOT NULL),
  ADD CONSTRAINT tour_sanctioned_budget_check CHECK ("status" NOT IN ('APPROVED', 'ACTIVE', 'COMPLETED') OR "sanctionedBudget" IS NOT NULL),
  -- Local tours have no sanction stage.
  ADD CONSTRAINT tour_local_no_sanction_check CHECK ("type" <> 'LOCAL' OR ("status" <> 'PENDING_SANCTION' AND "sanctionedAt" IS NULL)),
  ADD CONSTRAINT tour_started_check CHECK ("status" NOT IN ('ACTIVE', 'COMPLETED') OR "startedAt" IS NOT NULL),
  ADD CONSTRAINT tour_completed_check CHECK ("status" <> 'COMPLETED' OR "completedAt" IS NOT NULL),
  ADD CONSTRAINT tour_rejected_check CHECK ("status" <> 'REJECTED' OR "rejectedAt" IS NOT NULL),
  ADD CONSTRAINT tour_cancelled_check CHECK ("status" <> 'CANCELLED' OR "cancelledAt" IS NOT NULL);
