# Factory Visitor Management

A host pre-registers a visitor, the visitor is texted a one-day **gate pass**
number, and the host (or the visitor) shows a QR pass at the gate. Security
and the front desk scan the pass, check the visitor in and out, or register a
**walk-in** on the spot. The host is told when their visitor arrives and
leaves. The portal and the app show a live **on-site counter**, today's board,
and a breakdown of visitors by purpose.

| Layer | Path |
|---|---|
| Domain | `packages/shared/src/visitors.ts` — purposes, statuses, transitions, labels, tones, pass warnings, limits, BD mobile and pass-number helpers |
| Database | `Visit` in `schema.prisma`; migrations `20261021000100_abg_one_modules` (table, checks) and `20261021000500_visitors_gate_log` (who checked in/out, check-in point, cancellation, expiry time, indexes, more checks) |
| API | `apps/api/src/visitors/` (`visitors.service.ts`, `visitors.controller.ts`, `visitors.dto.ts`) |
| Demo data | `apps/api/prisma/seed-modules/visitors.ts` |
| API tests | `apps/api/test/visitors.test.ts` |
| Portal | `apps/admin/src/pages/visitors/` — `VisitorsPage` (`/visitors`), `VisitDetailPage` (`/visitors/:id`), `VisitorPassPage` (`/visitors/pass/:token`) |
| Mobile | `apps/mobile/lib/modules/visitors/` — `VisitorsScreen`, `VisitorFormScreen`, `VisitDetailScreen`, `VisitorPassScreen` |
| Strings | `apps/mobile/tool/strings/visitors.py` (English and Bangla) |
| Mobile tests | `apps/mobile/test/visitors_test.dart` |

## Lifecycle

```
                 check-in            check-out
 EXPECTED ───────────────▶ CHECKED_IN ─────────▶ CHECKED_OUT
    │  │                     ▲
    │  └─ cancel ─▶ CANCELLED │ walk-in (registered at the gate, checked in at once)
    └── end of its Dhaka day ─▶ EXPIRED ("Did not arrive")
```

- A pass is valid for **one Asia/Dhaka day** — the day it is expected. It
  cannot be used on a later day (`VISIT_WRONG_DAY`); unused passes become
  `EXPIRED` once that day ends, stamped with the midnight they lapsed.
  Expiry runs lazily on every read (one indexed `UPDATE`) and in a light sweep
  on the SLA engine's clock (`SLA_INTERVAL_SECONDS`; `0` disables it, as the
  tests do).
- Check-in, check-out and cancel take a row lock and return
  `409 VISIT_STATE_CONFLICT` when the move is no longer allowed (two guards
  scanning the same pass: one wins).
- Pass numbers are `VP-<visit day YYMMDD>-<office code>-NNN`
  (`formatVisitorPassNumber`, counter `VP:<code>` per day via `nextSequence`).
  The QR holds `<PUBLIC_QR_BASE_URL>/g/v/<token>`: a random 192-bit token,
  separate from the number, that tells a finder nothing.

## Who can do what

| Capability | Who | What |
|---|---|---|
| `visitor.invite` | every employee | pre-register visitors they host; see and cancel their own |
| `visitor.view` | security, front-desk dispatch officers, branch / head-office admins, auditors | see their offices' visits, board and summary |
| `visitor.manage` | security, front desk, branch / head-office admins | check in / out, register walk-ins, cancel |
| `gate.verify` | the same people + the fleet manager | verify scanned or typed passes |

Office scope is `moduleScope(actor)` (null = every office for super admins,
head-office admins and auditors). A visit is visible to its **host** and to
visitor staff whose offices include it; everyone else gets
`404 VISIT_NOT_FOUND`. Auditors see a masked visitor phone and no QR pass.

**Scanned passes work at any gate**: a Factory A guard scanning a head-office
pass sees a blocking `WRONG_OFFICE` verdict (visitor name, office and host
only — no phone, ID digits, vehicle or token) and cannot check them in
(`403 WRONG_OFFICE`). **Typed pass numbers** are readable and sequential, so a
lookup by number searches only the verifier's own offices.

## Privacy

- Only the **last four** characters of an ID document are stored (`idLast4`,
  DTO pattern plus a database `CHECK`); a full NID number is refused with a
  message and never written anywhere (not the visit, the audit log, nor the
  idempotency record).
- Visitor phones must be Bangladeshi mobiles (`01[3-9]XXXXXXXX`); `+880`,
  spaces and dashes are normalised.
- SMS to visitors (pass number on pre-registration and walk-in, notice on
  cancellation) go through `SmsService`; in development they are recorded,
  not sent.

## API (under `/api`)

| Method & path | Capability | Notes |
|---|---|---|
| `POST /visitors` | `visitor.invite` | Idempotency-Key. `visitorName, visitorPhone, company?, idLast4?, purpose, purposeDetail?, partySize, vehicleNumber?, carrying?, branchId? (default: host's office), locationId?, expectedAt (not in the past; ≤ 60 days ahead), expectedUntil? (same day), notes?` → `EXPECTED`, host = caller; SMS to the visitor |
| `POST /visitors/walk-in` | `visitor.manage` | Same fields + `hostEmployeeId` or `hostName` (host not in the directory), `badgeNumber?`; office must be in scope → `CHECKED_IN`, `walkIn: true`; host told "Your visitor X is at the gate" |
| `GET /visitors/mine?scope=upcoming\|past` | `visitor.invite` | the caller's visits as host (upcoming = expected or on site, soonest first) |
| `GET /visitors/:id` | host or `visitor.view` in scope | full visit + `viewer.actions` (`CHECK_IN`, `CHECK_OUT`, `CANCEL`) + `pass {token, payload}` for the host and gate staff |
| `POST /visitors/:id/check-in` `{ badgeNumber? }` | `visitor.manage` in scope | host told "X has arrived" with the gate (e.g. *Factory A › Security Gate*) |
| `POST /visitors/:id/check-out` | `visitor.manage` in scope | host told "X has left" with the time on site |
| `POST /visitors/:id/cancel` `{ reason? }` | host, or `visitor.manage` in scope | only while `EXPECTED`; visitor texted; host told when someone else cancels |
| `GET /visitors/passes/:token` | `gate.verify` | the pass: visitor, host, purpose, office/area, window, status, `valid`, `allowed: ["CHECK_IN"]\|["CHECK_OUT"]\|[]`, `warnings: [{code, message, blocking}]` |
| `GET /visitors/passes/by-number/:passNumber` | `gate.verify` | forgiving input (`vp 261021 fca 12`); own offices only |
| `POST /visitors/passes/:token/check-in\|check-out` | `visitor.manage` | as above, returns the pass view |
| `GET /admin/visitors` | `visitor.view` | `status` (`EXPECTED`, `CHECKED_IN`, `CHECKED_OUT`, `CANCELLED`, `EXPIRED`, `ALL`), `branchId`, `purpose`, `date` (Dhaka day, default today — expected, arrived or left that day; today also includes everyone still on site), `q` (name, company, pass, phone, host, vehicle, badge), `cursor`, `limit`. Rows carry `actions` for the quick toggles. Order: expected — soonest first; on site — longest first; checked out — latest first; otherwise newest first |
| `GET /admin/visitors/summary?branchId` | `visitor.view` | see below |

Pass warnings: `WRONG_OFFICE`, `WRONG_DAY`, `CANCELLED`, `EXPIRED`,
`ALREADY_OUT` (blocking); `EARLY` (more than an hour before the expected
time), `OVERSTAY` (on site past the expected end) are for the guard's
attention.

### Summary

```json
{
  "onSiteNow": 4, "peopleOnSite": 7, "overstaying": 0,
  "expectedToday": 5, "checkedOutToday": 4, "walkInsToday": 2, "visitsToday": 8,
  "byPurposeToday": { "VENDOR_SUPPLIER": 1, "CONTRACTOR": 1, "DELIVERY": 2, "AUDIT_INSPECTION": 3, "INTERVIEW": 1, "MEETING": 0, "GOVERNMENT_OFFICIAL": 0, "PERSONAL": 0, "OTHER": 0 },
  "last7Days": [{ "day": "2026-10-16", "visits": 14 }, "… 7 days, today last"],
  "longestOnSite": { "id": "…", "visitorName": "Engr. Alamgir Kabir", "since": "2026-10-21T03:12:00.000Z" },
  "asOf": "…"
}
```

A **visit** here is a visitor who came in (checked in today, walk-ins
included): `visitsToday`, `byPurposeToday` and the last bar of `last7Days`
count the same thing. `expectedToday` are those still to arrive today;
`onSiteNow` counts everyone checked in and not yet out, whenever they arrived
(the safety head-count), and `peopleOnSite` adds up party sizes.

## Notifications

`NotificationService.deliverModule({ module: "visitors", id, reference: passNumber, route: "/visitors/<id>" })`,
host only, never the person acting: `VISITOR_AT_GATE` (walk-in),
`VISITOR_ARRIVED`, `VISITOR_LEFT`, `VISIT_CANCELLED`. Staff actions (walk-in,
check-in, check-out, cancellation by the gate) are written to the audit log.

## Portal

- **Visitors** (`/visitors`): a navy hero with the live **On site now**
  counter (people, past-their-time, longest on site; refreshes every 30 s),
  KPI tiles (Expected today, Checked out today, Walk-ins, Visits today), an
  office selector, a pass verifier (scan or type), tabs *On site / Expected /
  Checked out / All* with search, purpose and day filters, rows with one-click
  **Check in / Check out** toggles, and two charts: today's visitors by purpose
  (`BarList`, click to filter) and the last 7 days (`GroupedColumns`).
  *Register walk-in* and *Pre-register visitor* open modals; `?new=1` and
  `?walkin=1` open them directly (Executive Dashboard quick actions) and the
  parameter is cleared on close. People without `visitor.view` see **My
  visitors** instead.
- **Visit** (`/visitors/:id`): the digital gate pass card (QR from `qrcode`,
  pass number, visitor, host, office/area, time, party, vehicle, carrying)
  with **Print** (A5, pass only) and **Download** (PNG for WhatsApp/email),
  the Expected → On site → Checked out timeline (or cancelled / did not
  arrive) with who and where, and the actions the API allows.
- **Scanned pass** (`/visitors/pass/:token`, opened when a desk scanner types
  a `/g/v/…` URL): a big green / blue / red verdict, the ID digits to compare,
  and one Check in (with badge) or Check out button.

## Mobile

- **Visitors**: *My visitors* (upcoming / past) with *Invite a visitor*; for
  gate staff a **Gate** tab (opens first for security guards) with the live
  on-site hero (auto-refresh every 30 s), Scan pass, Walk-in, pass-number
  lookup, and on-site / expected lists with one-tap check-in/out.
- **Invite / walk-in form** (`/visitors/new`; the Gate tab opens it in walk-in
  mode with a directory host picker and badge number). One idempotency key per
  form.
- **Visit**: the gate pass card with QR (`qr_flutter`), tap to copy the number,
  *Send by SMS* (falls back to copying), timeline, details, Cancel / Check in /
  Check out.
- **Scanned pass** (`/visitors/pass/:token`, from the scanner): verdict, ID
  digits to compare, badge field and one action.

## Demo data

Today at Factory A and head office: four on site (a boiler contractor in for
3 h 24 m, a DIFE inspector, a walk-in courier, a Bureau Veritas auditor), five
still expected (Akij Packaging pre-registered by Farhana Islam, the Fire
Service inspection, an interview, BRAC Bank, Abul Khair Steel), four checked
out, a cancelled pass, passes for the next two days, and the hosts'
notifications. Six days of history with 10–20 visits a day (Fridays are
contractor-heavy maintenance days) across vendors, contractors, deliveries,
audits and inspections (DIFE, Fire Service, BSTI, buyers' auditors),
interviews, meetings and government officials, with walk-ins, the odd
cancellation and no-shows. Sign in as Nurul Amin (Factory A gate), Rezaul
Karim (head-office reception), Kamrul Hasan (Factory A front desk), Sabina
Yasmin or Farhana Islam — password `Dispatch@2026`.
