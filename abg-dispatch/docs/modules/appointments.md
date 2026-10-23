# Request for Appointment

Employees ask the Managing Director, the Chairman, a head of department or any
colleague for a meeting: what it is about, in person / video / phone, how long,
and a preferred and an alternative time. For the MD and the Chairman the
**executive office** (their PA) answers; anyone else answers for themselves.
The answer is *confirm* (at one of the times asked for, with the place),
*propose another time* (the requester accepts or cancels) or *decline* with a
reason. A host is never double-booked: confirmed meetings for one host cannot
overlap, in the service and in the database.

Menu position: **2 — Request for Appointment** (phone and portal).

## Workflow

```
           CONFIRM (host side)
PENDING ─────────────────────────────► CONFIRMED ──► COMPLETED ("Held")
   │  PROPOSE (host side, reason)        ▲   │  │      (host side, once it
   ▼                                     │   │  │       has taken place)
PROPOSED ── ACCEPT (requester) ──────────┘   │  └─ PROPOSE again: the meeting moves
   │                                         │
   ├── DECLINE (host side, reason) ──► DECLINED
   └── CANCEL (requester, reason; or host side once confirmed) ──► CANCELLED
```

| Status | Label | Waiting for |
|---|---|---|
| `PENDING` | Awaiting confirmation | The host, or the executive office for the MD and Chairman |
| `PROPOSED` | New time proposed | The requester to accept (or cancel) |
| `CONFIRMED` | Confirmed | The meeting; the host side may move or cancel it |
| `COMPLETED` | Held | Final |
| `DECLINED`, `CANCELLED` | — | Final |

Reference numbers: `ABG-AP-YYYY-NNN` (`formatAppointmentNumber`, sequence `AP` per year).

## Rules

- **Host side** = the person asked, plus — when the host has the `EXECUTIVE`
  role (MD, Chairman) — anyone with `appointment.manage` (role
  `EXECUTIVE_ASSISTANT`, "Executive Office / PA"). Everyone else gets
  `403 NOT_HOST`; requester-only steps give `403 NOT_REQUESTER`.
- **Times** (Asia/Dhaka): at least 15 minutes ahead (`TIME_IN_PAST`), at most
  90 days ahead (`TIME_TOO_FAR`), starting at 08:00 or later and ending by
  20:00 (`OUTSIDE_MEETING_HOURS`). The alternative may not equal the
  preferred time (`ALTERNATIVE_SAME`). Lengths: 15, 30, 45, 60, 90 or 120
  minutes. Nobody books themselves (`HOST_SELF`); the host must be active
  and able to sign in (`HOST_INVALID`).
- **No double booking**: confirming, proposing and accepting check the host's
  confirmed meetings (`409 APPOINTMENT_CLASH`, naming the clashing meeting),
  and the exclusion constraint `appointment_host_no_clash` (`btree_gist`,
  `tsrange` of start and length, `WHERE status = 'CONFIRMED'`) backs it up.
  The detail shows the host side any clash with the time on the table.
- **Confirming** without a time takes the preferred time; with `at` it must be
  one that passes the time rules. In-person meetings default the place to the
  host's office location.
- **Proposing, declining and cancelling need a reason** (`REASON_REQUIRED`).
  A proposed time that has passed cannot be accepted
  (`APPOINTMENT_TIME_PASSED`).
- **The host side declines a request rather than cancelling it**; it cancels
  only a confirmed meeting.
- **Held** only once the meeting time has passed (`APPOINTMENT_NOT_YET`); an
  optional outcome note is sent to the requester.
- Row locks on every step; a move that is no longer allowed is
  `409 APPOINTMENT_STATE_CONFLICT`. `appointment_updates` is append-only.

## Roles

| Who | Capability / relation | Can |
|---|---|---|
| Every employee | `appointment.request` | Ask for meetings; accept a proposed time; cancel their requests; add notes |
| The person asked | host | Confirm, propose, decline, move, cancel and mark held; see the requester's phone number |
| Executive office (PA) | `appointment.manage` | The host side for the MD and the Chairman; the executive diary |
| Auditors | read-only | Nothing here |

## API

| Method | Path | Notes |
|---|---|---|
| POST | `/appointments` | `{ hostUserId, subject, purpose, agenda?, mode, durationMinutes, preferredAt, alternativeAt?, attendees?, urgent? }`; `Idempotency-Key` |
| GET | `/appointments/hosts?q=` | Executives first, then heads of department; everyone else on search |
| GET | `/appointments/mine?state=open\|closed\|all` | My requests |
| GET | `/appointments/inbox` | Requests waiting for my side's answer (the phone's Approvals inbox reads it) |
| GET | `/appointments/desk?status&hostUserId&q` | Everything addressed to my side |
| GET | `/appointments/diary?from&to&hostUserId` | My side's meetings, at most 42 days |
| GET | `/appointments/summary` | `{ awaitingAnswer, awaitingRequester, confirmedToday, confirmedThisWeek, next, myOpenRequests, answersFor }` |
| GET | `/appointments/:id` | Detail with `clashes`, `updates`, `viewer { isRequester, isHost, isOffice, actions }` |
| POST | `/appointments/:id/confirm` | `{ at?, location?, note? }` |
| POST | `/appointments/:id/propose` | `{ at, location?, note }` |
| POST | `/appointments/:id/accept` | Requester |
| POST | `/appointments/:id/decline` | `{ note }` |
| POST | `/appointments/:id/cancel` | `{ note }` |
| POST | `/appointments/:id/complete` | `{ note? }` |
| POST | `/appointments/:id/notes` | `{ note }` |

Notifications open `/appointments/<id>`: the host side on a request (urgent
ones say so); the requester on confirm, propose, decline, cancel and the
held note; the host side when a proposal is accepted or the requester
cancels.

## Portal (`apps/admin/src/pages/appointments/`)

**Request for Appointment** in the sidebar: **Executive diary** / **My diary**
(the week, by host), **To answer**, **My requests**, and **All requests to the
MD & Chairman** / **All requests to me**. **Request a meeting** opens the form.
The detail shows the clash warning and the confirm / propose / decline /
accept / cancel / held buttons.

## Mobile (`apps/mobile/lib/modules/appointments/`)

- **Appointments** (`/appointments`): my requests (Open / Closed / All); the
  host side and the executive office also get **To answer** (with a count;
  the PA's cards name who was asked) and **Diary** (the next two weeks,
  confirmed and proposed). The executive office opens on *To answer*.
- **Request a meeting** (`/appointments/new`): who (executives first, with a
  search), subject, purpose, agenda, in person / video / phone, length,
  preferred and alternative times (checked against meeting hours as you
  pick), others joining, urgent.
- **Request** (`/appointments/<id>`): status, time, the clash warning for the
  host side, the *new time proposed* banner for the requester, the
  Requested → Answer → Meeting stepper, details, times asked for, people,
  history; buttons *Confirm* (choose preferred or alternative, place, note),
  *Propose a time* / *Move the meeting*, *Decline*, *Accept the time*,
  *Cancel*, *Mark as held*.
- Meeting requests also appear in the phone's **Approvals** inbox, where
  *Confirm* books the preferred time and *Decline* asks for a reason.

## Demo data

`apps/api/prisma/seed-modules/appointments.ts`: 12 requests
(`ABG-AP-2026-001`…`012`). Rumana Ahmed (`rumana.ahmed@abg.com.bd`, Executive
Office / PA) has two requests to answer for the MD, one urgent; Imran Hossain
has a proposed time to accept; there are confirmed meetings with the Chairman,
the MD and Farid Uddin.

## Tests

`apps/api/test/appointments.test.ts` (hosts order, executive office, clash
constraint, time rules, held, diary, append-only history) and
`apps/mobile/test/workplace_test.dart`.
