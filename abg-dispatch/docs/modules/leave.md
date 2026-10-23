# Leave apply

Employees apply for leave from the phone or the portal. Their head of
department approves first, then HR; the days come off the year's balance.
Pending days are held against the balance, so the same days can never be
spent twice. Every step is kept in an append-only history, HR's decisions are
audited, and whoever has to act next is notified — including the colleague
named to cover the work once the leave is approved.

Menu position: **8 — Leave apply** (phone and portal).

## Workflow

```
             APPROVE (HOD)          APPROVE (HR)
PENDING_HOD ───────────────► PENDING_HR ───────────► APPROVED
     │                            │                      │
     └── REJECT (reason) ─────────┴──► REJECTED          │
                                                         │
CANCEL (applicant, with reason) from PENDING_HOD, PENDING_HR,
or APPROVED before the first day; HR may cancel APPROVED leave ──► CANCELLED
```

| Status | Label | Waiting for |
|---|---|---|
| `PENDING_HOD` | Pending HOD approval | The head of department named on the application (`approverUserId`) |
| `PENDING_HR` | Pending HR approval | Anyone with `leave.manage` (role `HR_FINANCE`) |
| `APPROVED` | Approved | — (the days are taken) |
| `REJECTED`, `CANCELLED` | — | Final; the days return to the balance |

Reference numbers: `ABG-LV-YYYY-NNN` (`formatLeaveNumber`, sequence `LV` per year).

## Leave types (`LEAVE_TYPE_RULES` in `packages/shared/src/leave.ts`)

| Type | Days a year | Counted in | Half day | Earliest start | Most in one application |
|---|---|---|---|---|---|
| Casual | 10 | working days | yes | 7 days back | 3 |
| Sick | 14 | working days | yes | 7 days back | — |
| Earned | 18 | working days | no | 3 days' notice | — |
| Maternity | 112 | calendar days | no | today | 112 |
| Paternity | 5 | working days | no | 3 days back | 5 |
| Leave without pay | no balance | working days | no | 3 days' notice | 30 |

- **Working days** skip the weekly holiday (Friday by default, setting
  `leave.weekendDays`, 0 = Sunday … 6 = Saturday) and the public holidays in
  setting `leave.holidays`. `countLeaveDays()` in shared does the counting and
  the phone mirrors it (`countLeaveDays` in `leave_models.dart`), so the
  form shows the same number the API will charge. A half day is ½.
- **Entitlements** default to the table above; HR can set a person's
  entitlement for a year (`PUT /admin/leave/entitlements`, kept in
  `leave_entitlements`, audited). Leave that runs into the next year is
  charged to the year it starts in.
- **Balance** = entitled − approved − pending. An application larger than the
  balance is refused (`INSUFFICIENT_BALANCE`, with `available` and
  `requested` in `details`).

## Rules (enforced by the API; several also by the database)

- **One application at a time per person** (advisory lock), and **no
  overlapping leave**: two open or approved applications by one person can
  never share a day — checked in the service and by the exclusion constraint
  `leave_no_overlap` (`btree_gist`) → `409 LEAVE_OVERLAP`.
- **Dates**: real calendar dates (`DATE_INVALID`), end ≥ start
  (`END_BEFORE_START`), at most 180 days ahead (`START_TOO_FAR`), and the
  type's earliest start (`NOTICE_TOO_SHORT` / `START_TOO_EARLY`). Dates that
  are all holidays → `NO_WORKING_DAYS`; too long for the type →
  `TOO_MANY_DAYS`.
- **Half days** only for casual and sick leave (`HALF_DAY_NOT_ALLOWED`) and
  only on a one-day application (`HALF_DAY_RANGE`).
- **The approver** defaults to the applicant's line manager. Another employee
  may be named; they must be active, able to sign in
  (`APPROVER_HAS_NO_ACCOUNT`), not read-only (`APPROVER_CANNOT_APPROVE`), and
  not the applicant (`APPROVER_SELF`). No manager and none named →
  `APPROVER_REQUIRED`.
- **The reliever** (who covers the work) is optional, must be an active
  colleague and not the applicant (`RELIEVER_SELF`, `RELIEVER_INVALID`); they
  can read the application and are told once it is approved.
- **Nobody decides their own leave** (`OWN_REQUEST`). **Four eyes at HR**:
  whoever approved as head of department cannot also give the HR approval
  (`SEPARATION_OF_DUTIES`) — another HR member does.
- **Rejecting and cancelling need a reason** (`REASON_REQUIRED`).
- **Cancelling**: the applicant may cancel while pending, or approved leave
  before its first day (`LEAVE_STARTED` after that — HR changes it). HR may
  cancel approved leave (audited); a pending application is rejected instead.
- Decisions take a row lock; someone whose stage has passed gets
  `409 LEAVE_STATE_CONFLICT`, someone whose stage has not come yet
  `403 NOT_YOUR_STAGE`.
- `leave_updates` is append-only (trigger `abg_forbid_mutation`).

## Roles

| Who | Capability / relation | Can |
|---|---|---|
| Every employee | `leave.apply` | Apply; see their balance and applications; cancel; add notes |
| Head of department | named as approver | Approve or reject the HOD stage; see their direct reports who are away (`/leave/team`) |
| HR | `leave.manage` (role `HR_FINANCE`) | Approve or reject the HR stage; cancel approved leave; set entitlements, the weekly holiday and public holidays; see every application |
| Office admins, MD / Chairman, auditors | `leave.view` | Read applications and the leave calendar for their offices (MD / Chairman group-wide); auditors never act |
| The reliever | named on the application | Read it |

## API

| Method | Path | Who | Notes |
|---|---|---|---|
| POST | `/leave` | `leave.apply` | `{ type, startDate, endDate, halfDay?, reason, addressDuringLeave?, contactPhone?, relieverEmployeeId?, approverEmployeeId? }`; send `Idempotency-Key` |
| GET | `/leave/mine?state=open\|closed\|all&year=` | `leave.apply` | Keyset pages |
| GET | `/leave/balance?year=` | `leave.apply` | `{ year, balances: [{ type, entitled, used, pending, available, adjusted, note }] }` |
| GET | `/leave/calendar-settings` | signed in | `{ weekendDays, holidays: [{ date, name }], updatedAt, updatedBy }` |
| GET | `/leave/approvals` | signed in | What waits for the caller as HOD or HR (the phone's Approvals inbox reads it) |
| GET | `/leave/team?from&to` | signed in | The caller's direct reports away between two dates |
| GET | `/leave/:id` | related people | Detail with `pipeline`, `balance`, `updates`, `viewer { isApplicant, isApprover, isHr, isReliever, canDecide, blockedReason, actions }` |
| POST | `/leave/:id/decision` | HOD / HR | `{ decision: APPROVE\|REJECT, note? }` (note required to reject) |
| POST | `/leave/:id/cancel` | applicant / HR | `{ note }` |
| POST | `/leave/:id/notes` | related people | `{ note }` |
| GET | `/admin/leave`, `/admin/leave/summary`, `/admin/leave/calendar`, `/admin/leave/balances?userId=` | `leave.view` | Portal lists, KPI counts, the office calendar, one person's balances |
| PUT | `/admin/leave/entitlements` | `leave.manage` | `{ userId, year, type, days, note }` (note required — it is audited) |
| PUT | `/admin/leave/settings` | `leave.manage` | `{ weekendDays, holidays }` |

Notifications open `/leave/<id>`: the HOD on submit; the applicant at each
decision; HR when the HOD approves (minus the HOD and the applicant); the HOD
and the reliever on final approval; the handlers on cancel and on notes.

## Portal (`apps/admin/src/pages/leave/`)

**Leave apply** in the sidebar, with tabs **My leave** (balance cards and my
applications), **Awaiting me** (heads of department and HR), **Team calendar**
/ **Leave calendar** (who is away, month by month), **All applications**
(office staff and HR) and, for HR, **Holidays & entitlements** (the weekly
holiday, public holidays and one person's entitlement for a year). **Apply**
opens the form: the type with what is left, dates with the working-day count,
half day, reason, reliever and approver.

## Mobile (`apps/mobile/lib/modules/leave/`)

- **Leave** (`/leave`): the year's balance per type, *On leave today*, my
  applications (Open / Closed / All); heads of department and HR get a
  **To approve** tab with who in their team is away in the next 30 days.
- **Apply for leave** (`/leave/new`, `?type=` preselects): types with what is
  left, half-day switch where allowed, the day count explaining weekly and
  public holidays, the balance afterwards, reason, approver (line manager by
  default), reliever, address and phone while away.
- **Application** (`/leave/<id>`): the Applied → HOD → HR → Approved stepper,
  details, people, the balance for that type, history, and the buttons the
  caller may use (*Send to HR* / *Approve*, *Reject*, *Cancel leave*, note).
- Leave applications also appear in the phone's **Approvals** inbox.

## Demo data

`apps/api/prisma/seed-modules/leave.ts`: 16 applications
(`ABG-LV-2026-001`…`016`) in every status, Bangladesh public holidays for
2026–27, and an HR-adjusted earned-leave entitlement for Md. Rahim. Farid Uddin
(Executive Director) has applications waiting as head of department; Sadia
Rahman (HR) has the HR stage.

## Tests

`apps/api/test/leave.test.ts` (balances, overlap constraint, separation of
duties, cancellation rules, notifications), `packages/shared/src/workplace.test.ts`
(day counting) and `apps/mobile/test/workplace_test.dart`.
