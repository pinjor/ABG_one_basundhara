# Pool Car Requisition & Fleet Management

An employee asks for a pool car, their head of department approves it, the
fleet manager assigns a vehicle and a driver, and the car leaves and comes
back through the gate on a QR gate pass that security scans.

```
Pending HOD ──approve──▶ Pending fleet manager ──assign──▶ Assigned ──exit scan / start──▶ In progress ──return scan / complete──▶ Completed
     │                         │                            │
     └─reject (HOD)            └─reject (fleet manager)     └─reassign (new gate pass)
     └─cancel (requester)      └─cancel (requester)         └─cancel (requester)
```

| Layer | Where |
|---|---|
| Vocabulary | `packages/shared/src/fleet.ts` — statuses, `CAR_REQUISITION_TRANSITIONS`, `CAR_REQUISITION_PIPELINE`, labels and tones, `CarRequisitionAction`, `GateScanDirection`, `carTripWindow`, `gatePassValidity`, `fleetDateState`, `formatCarRequisitionNumber` |
| Database | `Vehicle`, `Driver`, `CarRequisition`, `CarRequisitionUpdate` (append-only); migration `20261021000400_fleet_register_and_trip_checks` adds the vehicle status note and the trip CHECKs |
| API | `apps/api/src/fleet/` (`fleet.service.ts`, `fleet.controller.ts`, `fleet.dto.ts`) |
| Demo data | `apps/api/prisma/seed-modules/fleet.ts` |
| Tests | `apps/api/test/fleet.test.ts`, `apps/mobile/test/fleet_test.dart` |
| Portal | `apps/admin/src/pages/fleet/` — `/pool-car`, `/pool-car/:id`, `/pool-car/pass/:token` |
| Mobile | `apps/mobile/lib/modules/fleet/` — `/pool-car`, `/pool-car/new`, `/pool-car/:id`, `/pool-car/pass/:token`; strings in `tool/strings/fleet.py` (`pc*` keys) |

## Who does what

| Person | Capability / relation | Can |
|---|---|---|
| Any employee | `fleet.request` | request a car, see and cancel their own requests (until the car leaves), see the driver and their gate pass |
| Head of department | named as the request's `approverUserId` (defaults to the requester's line manager) | approve or reject at **Pending HOD** — nobody else can, not even admins |
| Fleet manager (`FLEET_MANAGER`) | `fleet.view` + `fleet.manage`, every office | assign / reassign, reject at **Pending fleet manager**, start and complete trips, keep the vehicle and driver register, verify gate passes |
| Driver (`DRIVER`) | `fleet.drive`, and being the assigned driver | see their own trips (`/pool-car/trips/mine`), start and complete them |
| Security, front-desk dispatch officers | `gate.verify` | verify any pass; record exit/return only for their own office's cars |
| Branch / head office admins, auditors | `fleet.view` within their office scope | read requisitions, the register and the summary (auditors never change anything) |

Anyone else gets **404** for a requisition (`CAR_REQUISITION_NOT_FOUND`), so ids
cannot be probed. Office scope is `moduleScope(actor, [FLEET_MANAGER])`; a
requisition is in an office's scope when the requester's office or the
assigned vehicle's office is.

The **gate pass** (`gatePass.payload` = `<PUBLIC_QR_BASE_URL>/g/c/<token>`,
token = 24 random bytes, base64url) is returned only to the requester, the
assigned driver and the fleet manager, and only while the trip is Assigned or
In progress. Every assignment — including a reassignment — issues a new token,
so a copy held by a previous driver stops working.

## Rules the API enforces

- **Times.** Pickup may not be in the past (10-minute grace for "right now"),
  at most 120 days ahead. Round trips and full days need `returnAt`; the
  return must be after pickup and within 7 days.
- **Approver.** `approverEmployeeId`, or the requester's manager. Errors:
  `APPROVER_REQUIRED` (no manager on record), `APPROVER_HAS_NO_ACCOUNT`
  (cannot sign in), `APPROVER_SELF`.
- **Reference number.** `PC-YYMMDD-OFFICE-NNN` from
  `nextSequence(tx, "PC:<office>", day)`, e.g. `PC-261021-HO-004`.
- **Assignment** (409s): `VEHICLE_UNAVAILABLE` (maintenance / inactive),
  `VEHICLE_TOO_SMALL` (seats are passenger seats, not counting the driver),
  `DRIVER_UNAVAILABLE` (off duty / left the pool), `VEHICLE_BOOKED` /
  `DRIVER_BOOKED` (another Assigned or In-progress trip overlaps the window),
  `ASSIGNMENT_UNCHANGED`, `TRIP_TIME_PASSED`. The vehicle and driver rows are
  locked (`FOR UPDATE`) during the check, so two concurrent bookings of the
  same car cannot both succeed.
- **Booking window.** `pickupAt` → `returnAt`, or a default length per trip
  type (one way 3 h, round trip 4 h, full day 10 h, airport 4 h). A trip still
  on the road holds its car until it is completed.
- **Start / complete.** The vehicle and driver go **On trip**, then back to
  **Available**. Odometer readings are optional but may never go backwards
  (`ODOMETER_BEHIND`); the vehicle's odometer advances on completion. A car
  in maintenance or still out on another trip cannot start
  (`VEHICLE_UNAVAILABLE`, `VEHICLE_ON_TRIP`, `DRIVER_ON_TRIP`).
- **Gate pass validity.** From 6 h before the pickup day (Asia/Dhaka) to 6 h
  after the trip's last day. Exit is allowed only while valid
  (`GATE_PASS_NOT_YET_VALID`, `GATE_PASS_EXPIRED`); return is always allowed
  for a car that is out. A second scan is `GATE_ALREADY_SCANNED`; a forged or
  replaced token is `404 GATE_PASS_INVALID`; another office's guard gets
  `403 GATE_OUT_OF_SCOPE` (they can still verify it).
- **Register.** Registration numbers are unique (case-insensitive,
  `VEHICLE_DUPLICATE`). Maintenance or out-of-service needs a `statusNote`
  (`STATUS_NOTE_REQUIRED`) and is refused while the vehicle is out
  (`VEHICLE_ON_TRIP`) or booked (`VEHICLE_HAS_BOOKINGS`); the same goes for a
  driver going off duty (`DRIVER_HAS_BOOKINGS`). "On trip" is never set by
  hand. Linking a driver to a directory entry with an account puts their
  trips in their app (`DRIVER_ACCOUNT_LINKED` if already linked).
- **History** (`car_requisition_updates`) is append-only — a database trigger
  refuses UPDATE and DELETE. Types: `SUBMITTED`, `STATUS_CHANGED`, `ASSIGNED`,
  `REASSIGNED`, `GATE_SCANNED` (`metadata.direction` EXIT / RETURN). Staff
  actions are also written to the audit log (`fleet.*`).
- **Database CHECKs.** Assigned / In progress / Completed need a vehicle, a
  driver and a gate pass token; 1–14 passengers; return after pickup;
  odometer end ≥ start; started and completed trips carry their timestamps.

## API

All under `/api`. Creating endpoints accept `Idempotency-Key`.

| Method & path | Who | Notes |
|---|---|---|
| `POST /pool-car/requisitions` | `fleet.request` | `{ tripType, purpose, pickupLocation, dropLocation, pickupAt, returnAt?, passengers: [{ name, phone? }], passengerCount, urgent?, vehiclePreference?, approverEmployeeId? }` → 201 item. Notifies the approver ("Urgent: …" when urgent). |
| `GET /pool-car/requisitions/mine?state=open\|closed\|all&cursor` | `fleet.request` | `{ items, nextCursor }` |
| `GET /pool-car/requisitions/:id` | related or staff | item |
| `GET /pool-car/approvals` | anyone | `{ items: [{ id, referenceNumber, title, tripType, pickupAt, returnAt, pickupLocation, dropLocation, passengerCount, urgent, status, awaiting: "HOD", requester: { name, designation, department }, createdAt }], nextCursor: null }` — urgent first, then by pickup |
| `POST /pool-car/requisitions/:id/decision` | approver (HOD step); fleet manager may `REJECT` at Pending fleet manager | `{ decision: "APPROVE" \| "REJECT", note? }` — reject needs a note (`REASON_REQUIRED`) |
| `POST /pool-car/requisitions/:id/assign` | `fleet.manage` | `{ vehicleId, driverId, note? }` — from Pending fleet manager, or Assigned (reassign) |
| `POST /pool-car/requisitions/:id/start` | assigned driver, fleet manager | `{ odometerKm? }` |
| `POST /pool-car/requisitions/:id/complete` | assigned driver, fleet manager | `{ odometerKm? }` |
| `POST /pool-car/requisitions/:id/cancel` | requester, before the car leaves | `{ note? }` |
| `GET /pool-car/trips/mine?state=active\|done` | `fleet.drive` | the driver's trips (active: by pickup time) |
| `GET /pool-car/passes/:token` | `gate.verify` | `{ state: VALID\|OUT\|USED\|CANCELLED\|EXPIRED\|NOT_YET_VALID, valid, message, allowed: ["EXIT"]\|["RETURN"]\|[], scanHere, scanNote, validFrom, validUntil, requisition, vehicle, driver, passengers, scans }` |
| `POST /pool-car/passes/:token/scan` | `gate.verify`, own office | `{ direction: "EXIT" \| "RETURN", odometerKm? }` → the pass view |
| `GET /pool-car/vehicles?branchId&requisitionId&includeInactive&q` | `fleet.view` | register; with `requisitionId` each vehicle carries `availability { available, code, reason, conflict, matchesPreference }` for that trip |
| `POST /pool-car/vehicles`, `PATCH /pool-car/vehicles/:id` | `fleet.manage` | registration, make, model, type, seats, colour, fuel, office, odometer, `nextServiceAt` / `fitnessExpiry` / `insuranceExpiry` (YYYY-MM-DD), notes; PATCH also `status` (AVAILABLE / MAINTENANCE / INACTIVE) + `statusNote` |
| `GET /pool-car/drivers?…` | `fleet.view` | same `availability` shape |
| `POST /pool-car/drivers`, `PATCH /pool-car/drivers/:id` | `fleet.manage` | name, phone, licence, licence expiry, office, `employeeId` (links the app account); PATCH also `status` (AVAILABLE / OFF_DUTY), `active` |
| `GET /admin/pool-car/requisitions` | `fleet.view` | filters `status` (a status, `OPEN`, `CLOSED`, `ALL`, `AWAITING_ME`), `branchId`, `urgent`, `q` (reference, purpose, places, requester, plate, driver), `dateFrom`/`dateTo` (pickup day), `cursor`, `limit` |
| `GET /admin/pool-car/summary?branchId` | `fleet.view` | see below |

Every item carries `viewer: { isRequester, isApprover, isDriver, isStaff,
canManage, actions }` where `actions` ⊆ `APPROVE, REJECT, ASSIGN, REASSIGN,
START, COMPLETE, CANCEL`, and `pipeline: { steps: [{ status, label, at, state:
DONE|CURRENT|UPCOMING|HALTED }], outcome: { status, label, at, note } | null }`.

### Summary (Executive Dashboard KPIs)

```json
{
  "activeRequisitions": 6, "pendingHod": 2, "pendingFleet": 2, "assigned": 1, "inProgress": 1,
  "awaitingMe": 2, "tripsToday": 2, "completedLast30Days": 5,
  "counts": { "PENDING_HOD": 2, "...": 0 },
  "vehicles": { "total": 7, "available": 5, "onTrip": 1, "maintenance": 1, "inactive": 0, "documentsDue": 4 },
  "poolAvailabilityPct": 71,
  "drivers": { "total": 5, "available": 4, "onTrip": 1, "offDuty": 0 }
}
```

KPI cards: **Active Requisitions** = `activeRequisitions`; **Pool
Availability** = `poolAvailabilityPct` (available ÷ vehicles in service);
**Vehicles On-Trip** = `vehicles.onTrip`; **Fleet Maintenance** =
`vehicles.maintenance` (+ `documentsDue`: service, fitness or insurance due
within 30 days or overdue).

## Notifications

Module `fleet`, route `/pool-car/<id>` (both apps open it on tap).

| Event | Who |
|---|---|
| `CAR_REQUESTED` | approver — "Pool car request to approve" (urgent: "Urgent: …") |
| `CAR_APPROVED` | requester; fleet managers — "Assign a pool car" |
| `CAR_REJECTED` | requester, with the reason |
| `CAR_ASSIGNED` / `CAR_REASSIGNED` | requester (car, plate, driver name and phone); the driver if they have an account; a replaced driver |
| `CAR_TRIP_STARTED` | requester — "Your car has left the gate" (gate scan) or "Your trip has started" |
| `CAR_TRIP_COMPLETED` | requester, with the distance |
| `CAR_CANCELLED` | approver (if still with them), fleet managers, the assigned driver |

## Screens

**Portal** — `/pool-car`: KPI cards; tabs Requisitions (status sub-tabs incl.
*Awaiting me* and *My requests*, search, urgent filter, office filter, table on
desktop / cards at 390 px), Vehicles (cards with status pills; service,
fitness and insurance dates amber when due, red when overdue; add/edit modal
with status + maintenance note) and Drivers (licence expiry highlighted, call
button, directory link, duty). People without `fleet.view` see *My requests*
and *Awaiting me*. *New requisition* opens a modal (also via
`/pool-car?new=1`, which the Executive Dashboard quick action uses; closing it
clears the parameter). `/pool-car/:id`: pipeline stepper, trip, passengers,
car & driver with a call button, the QR gate pass (download PNG / print),
approve / reject / assign / reassign (vehicle and driver pickers showing
availability and seats) / start / complete with odometer / cancel, and the
history. `/pool-car/pass/:token` (a desk scanner reading a pass): a big
valid / not-valid banner with the plate and driver, and *Record exit* /
*Record return*.

**Mobile** — `PoolCarScreen`: *My requests* with All / Active / Closed chips
and a *Request a car* button; *To approve* when `/pool-car/approvals` has
items; *My trips* for drivers with Start / Complete. `CarRequestFormScreen`:
trip type tiles, places, Dhaka-time date and time pickers, passengers,
people count, vehicle preference, urgent switch, approver prefilled from
`profile.manager` with a directory search to change it.
`CarRequisitionDetailScreen`: stepper, actions from `viewer.actions` (the
fleet manager also gets an assign sheet), the car & driver card with a Call
button, a full-screen QR gate pass, trip details and history.
`VehiclePassScreen(token)`: the verdict banner, Exit / Return, trip,
passengers and the gate record.

## Demo data

Seven vehicles — HO: Toyota Premio (`Dhaka Metro-GA 27-4512`, on a trip now),
Toyota Noah (`Dhaka Metro-CHA 15-2234`), Toyota Hiace (service overdue),
Mitsubishi Pajero Sport (in maintenance), Toyota Land Cruiser Prado;
Factory A: Toyota Axio (fitness overdue), Isuzu D-Max pickup. Five drivers —
Abul Kalam, Mizanur Rahman, Sohel Rana (all with app accounts), Delwar
Hossain (licence due soon) and Shahidul Islam.

Thirteen requisitions across every state: Nusrat Jahan's trip to Bangladesh
Bank **in progress** (exit scanned by Rezaul Karim); Md. Rahim's airport
pickup **assigned** for today (Noah + Abul Kalam, live gate pass); Sadia
Rahman's **urgent** request **pending HOD** with Farid Uddin; Farhana Islam's
supplier visit pending HOD with Sabina Yasmin; two **pending the fleet
manager**; five **completed** trips over the last three weeks; one
**rejected** and one **cancelled**. The `PC:<office>` sequences continue from
the seeded numbers, and Farid, Sabina, Jahangir, Rahim, Abul Kalam, Nusrat
and Jamal have matching notifications.

Try it: sign in as `jahangir.alam@abg.com.bd` (fleet manager),
`farid.uddin@abg.com.bd` (HOD), `rahim@abg.com.bd` (requester with a live
pass), `abul.kalam@abg.com.bd` (driver) or `rezaul.karim@abg.com.bd`
(security) — password `Dispatch@2026`.
