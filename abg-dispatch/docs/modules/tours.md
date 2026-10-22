# Official Tour Requests

Employees apply for official business travel — **local** (within Bangladesh) or
**foreign** (overseas). Every request is approved by the traveller's head of
department and vetted by HR & Finance; overseas tours also need the Managing
Director's or Chairman's sanction before tickets, visa letters or a foreign
exchange advance can be released. The traveller then starts and completes the
tour. Every step is kept in an append-only history, approvals are audited, and
whoever has to act next is notified.

## Workflow

```
              ┌──────────── REJECT (reason) ──────────────┐
              │                                           ▼
PENDING_HOD ─► PENDING_VETTING ─► PENDING_SANCTION ─► APPROVED ─► ACTIVE ─► COMPLETED
 (named HOD)   (HR & Finance)     (MD / Chairman,      "Approved &   (traveller  (traveller or
                    │              FOREIGN only)        funds         starts)     tour admins)
                    └─ LOCAL ─────────────────────────► sanctioned"
                                                         │
  CANCEL (traveller, with reason) from any status before ACTIVE ──► CANCELLED
```

| Status | Label | Waiting for |
|---|---|---|
| `PENDING_HOD` | Pending HOD approval | The approver named on the request (`approverUserId`) |
| `PENDING_VETTING` | HR & Finance vetting | Anyone with `tour.vet` (role `HR_FINANCE`) |
| `PENDING_SANCTION` | MD / Chairman sanction | Anyone with `tour.sanction` (role `EXECUTIVE`); overseas only |
| `APPROVED` | Approved & funds sanctioned | The traveller to start the tour |
| `ACTIVE` | Tour active | The traveller (or a tour admin) to complete it |
| `COMPLETED`, `REJECTED`, `CANCELLED` | — | Final |

Rules (enforced by the API, several also by database CHECK constraints in
migration `20261021000300_tours_integrity`):

- **The approver** defaults to the traveller's line manager (`employee.managerId`).
  A different employee may be named; they must be active and able to sign in
  (`APPROVER_HAS_NO_ACCOUNT`), not read-only (`APPROVER_CANNOT_APPROVE`), and
  not the traveller (`APPROVER_SELF`). No manager and none named → `APPROVER_REQUIRED`.
- **Nobody decides their own request** (`OWN_REQUEST`).
- **Four eyes at vetting**: whoever approved as head of department cannot also
  vet the request (`SEPARATION_OF_DUTIES`), even if they are HR & Finance;
  another HR & Finance member does. (Executives may sanction a request they
  approved as HOD — they are the final authority, and the Chairman must be able
  to sanction the MD's own tour.)
- **Overseas tours cannot be approved without a sanction** — `sanctionedAt` is
  required for `APPROVED/ACTIVE/COMPLETED` foreign tours (CHECK constraint).
- **Sanctioned budget**: HR & Finance (vetting) and the MD / Chairman
  (sanction) may set `sanctionedBudget`; the HOD may not (`BUDGET_NOT_ALLOWED`).
  When a request reaches `APPROVED` without one, the estimate is sanctioned.
  Every change is a `BUDGET_CHANGED` history entry.
- **Rejecting and cancelling need a reason** (`REASON_REQUIRED`); the
  traveller (or the current handler, on cancel) is told it.
- **Starting**: only once `APPROVED`, from one day before the start date
  (`TOUR_TOO_EARLY` before that). An active tour cannot be cancelled — it is
  completed instead.
- **Passport**: overseas requests need the passport number and expiry. A
  passport that expires before the return date is refused (`PASSPORT_EXPIRED`);
  one that expires within six months of it is accepted but flagged
  (`passportAlert: true`, `passportNeedsRenewal` in shared).
- **Dates**: `YYYY-MM-DD`, start not in the past (Asia/Dhaka), end ≥ start, at
  most 90 days away and at most 365 days ahead.
- Concurrent decisions take a row lock; the loser gets `409 TOUR_STATE_CONFLICT`.
  Someone whose stage has already passed also gets `409`; someone whose stage
  has not come yet gets `403 NOT_YOUR_STAGE`.

Reference numbers: `ABG-TR-YYYY-NNN` (`formatTourNumber(dhakaYear(), nextSequence(tx, "TR", year))`).

## Roles

| Who | Capability / relation | Can |
|---|---|---|
| Every employee | `tour.request` | Apply; see, cancel, start, complete and add notes to their own requests |
| Head of department | named as approver | See the request; approve or reject the HOD stage |
| HR & Finance | `tour.vet`, `tour.view` (group-wide) | Vet: approve (and set the sanctioned budget) or reject; change the annual travel budget |
| MD / Chairman | `tour.sanction`, `tour.view` (group-wide) | Sanction overseas tours |
| Branch admins | `tour.view` (their offices) | See their offices' requests, complete active tours, add notes |
| Head office admins, super admins | `tour.view` (all offices) | Same, group-wide |
| Auditors | `tour.view` (read-only) | Read everything; never act |

Anyone else gets `404 TOUR_NOT_FOUND`. Passport numbers are shown in full only
to the traveller, HR & Finance and the MD / Chairman; others see `••••••263`.

## Endpoints (all under `/api`)

| Method & path | Who | Notes |
|---|---|---|
| `POST /tours` | `tour.request` | Body: `type`, `purpose`, `title`, `description?`, `destination`, `country` (FOREIGN), `startDate`, `endDate`, `transportMode`, `coTravellers?: string[]`, `estimatedBudget` (whole ৳), `advanceRequested?`, `passportNumber` + `passportExpiry` (FOREIGN), `approverEmployeeId?`. Send `Idempotency-Key`. Returns the item (201). Notifies the approver. |
| `GET /tours/mine?state=open\|closed\|all&cursor&limit` | `tour.request` | `{ items, nextCursor }`; open = not completed/rejected/cancelled |
| `GET /tours/approvals?cursor&limit` | signed-in user | What waits for the caller (see shape below) |
| `GET /tours/:id` | related people | The item (see below) |
| `POST /tours/:id/decision` | stage holder | `{ decision: "APPROVE"\|"REJECT", note?, sanctionedBudget? }` — the stage is worked out from the status and the caller |
| `POST /tours/:id/start` | traveller | `{ note? }` |
| `POST /tours/:id/complete` | traveller, tour admins | `{ note? }` — HR & Finance are asked to settle any advance |
| `POST /tours/:id/cancel` | traveller | `{ note }` (required) |
| `POST /tours/:id/notes` | anyone related (not auditors) | `{ note }` — the traveller is told; a traveller's note goes to the current handler |
| `GET /admin/tours` | `tour.view` | Filters: `status` (a status, comma list, `OPEN` = awaiting a decision, or `ALL`), `type`, `branchId`, `q` (reference, title, destination, country, traveller name / ID), `dateFrom` / `dateTo` (travel dates overlapping the range), keyset `cursor` |
| `GET /admin/tours/summary?branchId` | `tour.view` | KPI numbers (below) |
| `GET /admin/tours/settings` | `tour.view` | `{ annualTravelBudget, updatedAt, updatedBy }` |
| `PUT /admin/tours/settings` | `tour.vet` or `config.manage` | `{ annualTravelBudget }` — audited |

### Item (`GET /tours/:id` and every action's response)

All the request's fields (dates as `YYYY-MM-DD`), plus:

- `awaiting`: `"HOD" | "VETTING" | "SANCTION" | null`
- `passportAlert`: overseas, still live, passport valid < 6 months after return
- `traveller { name, employeeCode, designation, department, phone }`, `approver { name, designation, department }`, `branch`
- `pipeline`: `[{ key, label, state, at, by, note, waitingFor }]` — `SUBMITTED` then the stages of `tourPipeline(type)`; `state` is `done | current | upcoming | rejected | cancelled | skipped`
- `updates`: history `[{ type: SUBMITTED | STATUS_CHANGED | NOTE_ADDED | BUDGET_CHANGED, fromStatus, toStatus, note, actor, metadata, createdAt }]`
- `viewer { isTraveller, isApprover, isStaff, canDecide, blockedReason, startableFrom, actions }` — `actions` ⊆ `APPROVE, REJECT, START, COMPLETE, CANCEL, ADD_NOTE`

### Approvals row (`GET /tours/approvals`) — fixed shape

```json
{ "id": "…", "referenceNumber": "ABG-TR-2026-086", "title": "Compressor vendor audit & Gastech follow-up",
  "type": "FOREIGN", "destination": "Frankfurt, Germany", "startDate": "2026-11-14", "endDate": "2026-11-19",
  "estimatedBudget": 485000, "status": "PENDING_SANCTION", "awaiting": "SANCTION",
  "traveller": { "name": "Mehedi Hasan", "designation": "Procurement Officer", "department": "Procurement" },
  "createdAt": "2026-10-16T09:12:00.000Z" }
```

`destination` includes the country for overseas tours. Requests the caller
cannot decide (their own, or ones they approved as HOD at vetting) are left out.

### Summary (`GET /admin/tours/summary`)

```json
{
  "activeForeign": 2,
  "activeForeignCountries": ["Singapore", "United Arab Emirates"],
  "pendingApprovals": 5,
  "pendingByStage": { "PENDING_HOD": 3, "PENDING_VETTING": 1, "PENDING_SANCTION": 1 },
  "ytdSanctioned": 1247000,
  "annualBudget": 6500000,
  "utilisationPct": 19.2,
  "passportAlerts": 2,
  "upcomingThisMonth": 3,
  "year": 2026,
  "counts": { "PENDING_HOD": 3, "PENDING_VETTING": 1, "…": 0 }
}
```

- Within the caller's offices (`moduleScope(actor, [HR_FINANCE, EXECUTIVE])`), optionally one `branchId`.
- `ytdSanctioned`: sum of `sanctionedBudget` for approved, active or completed tours whose funds were sanctioned this Dhaka calendar year (local: `vettedAt`, foreign: `sanctionedAt`).
- `annualBudget`: `app_settings` key `tours.annualTravelBudget` (default ৳ 65,00,000), group-wide.
- `passportAlerts`: live overseas requests whose passport needs renewal.
- `upcomingThisMonth`: pending or approved tours starting between today and the end of this month.

## Notifications

`module: "tours"`, `route: "/tours/<id>"` (both apps open it on tap).

| When | Who | Category · title |
|---|---|---|
| Submitted | the named approver | ACTION_REQUIRED · "Tour request needs your approval" |
| HOD approved | traveller; HR & Finance (not the HOD) | "Approved by your head of department"; ACTION_REQUIRED · "Tour budget needs vetting" |
| Vetted (overseas) | traveller; MD / Chairman | "Vetted by HR & Finance"; ACTION_REQUIRED · "Overseas tour needs your sanction" |
| Approved | traveller; HR & Finance after a sanction | "Tour approved & funds sanctioned"; "Overseas tour sanctioned" (release the advance) |
| Rejected | traveller | "Tour request rejected" (with the reason) |
| Started / completed | the HOD; HR & Finance if there was an advance | "Tour started", "Tour completed", ACTION_REQUIRED · "Settle the tour advance" |
| Cancelled | whoever was handling it | "Tour request cancelled" |
| Note | traveller, or the current handler for a traveller's note | "Note on your tour request" / "Note from …" |

## Screens

**Admin portal** — `/tours` (`apps/admin/src/pages/tours`): header action *New
Tour Request* (modal form; `/tours?new=1` opens it), KPI cards (active overseas
tours with countries, pending approvals with "Needs vetting", YTD travel budget
with % utilised and an edit button for HR & Finance, passport expiry alerts),
tabs (All, Awaiting me, Pending approval, Approved, Active, Completed, Rejected /
Cancelled — people without `tour.view` get My requests and Awaiting me), search,
type / office / travel-date filters, the table (REF / TRAVELLER, TYPE &
DESTINATION, TRAVEL DATES, EST. BUDGET (৳), STATUS, ACTION) or cards below
768 px, and the *Foreign travel policy — MD / Chairman sanction requirement*
card. `/tours/:id`: status header, approval pipeline (who and when), passport
banner, trip details, co-travellers, budget (estimated, advance, sanctioned),
traveller, head of department, passport, history, and modal actions from
`viewer.actions`.

**Mobile** — `lib/modules/tours`: `ToursScreen` (`/tours`: my requests with
All / In progress / Closed chips and *Apply for a tour*; a *To approve* tab when
`/tours/approvals` has items), `TourFormScreen` (`/tours/new`: Local / Foreign,
purpose chips, title, destination, country, date-range picker, transport,
co-traveller chips, budget and advance in ৳, passport number and expiry with
the six-month warning, approver pre-filled from `profile.manager` with
directory search to change it, idempotent submit), `TourDetailScreen`
(`/tours/:id`: hero, passport banner, pipeline stepper, trip, budget,
co-travellers, people, passport, history, and an action bar / bottom sheets for
approve, vet, sanction, reject, start, complete, cancel and notes). Strings in
`tool/strings/tours.py` (English and Bangla).

## Demo data

`prisma/seed-modules/tours.ts` seeds twelve requests relative to today, numbered
`ABG-TR-<year>-079…090` (new requests continue from there): a completed
Shanghai factory acceptance test and a completed Rajshahi land-registry visit;
Farid Uddin at a Singapore LNG/LPG summit and Nazmul Karim at Dubai buyer
meetings (both active); Md. Rahim's Chattogram refinery & plant lease review
(approved & funds sanctioned); Mehedi Hasan's Frankfurt vendor audit awaiting the
MD / Chairman (passport flagged); Selim Reza's Mongla terminal depot visit with
HR & Finance; three waiting for their HOD (Imran Hossain's Chennai training —
passport flagged — for Tahmina Begum, Farhana Islam's Sylhet training for Sabina
Yasmin, Jamal Uddin's Bogura depot audit for Farid Uddin); a rejected Kuala
Lumpur course and a cancelled campus recruitment drive. The annual travel
budget is set to ৳ 65,00,000 and the waiting approvers have notifications.

## Tests

`apps/api/test/tours.test.ts` (full foreign pipeline with notifications, local
pipeline and the traveller's steps, HOD-only approval, stage permissions and
separation of duties, reasons, state conflicts and a concurrent-approval race,
visibility and branch scope, validation, idempotency, append-only history and
CHECK constraints, the approvals row shape, summary numbers and the budget
setting), `packages/shared/src/tours.test.ts`, `apps/mobile/test/tours_test.dart`.
