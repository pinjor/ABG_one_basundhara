# Regulatory licence register

Every licence, permit and certificate the group's sites must hold: trade
licences, the factory licence, environmental clearance, fire licences, the
BERC LPG marketing licence, LPG storage (Department of Explosives), boiler
certificates, IRC / ERC and BSTI certification. For each one the register
shows how long it has left (an **expiry countdown badge**), where its renewal
stands (a **renewal progress bar**), the **scanned copy**, and its full
history. As expiry approaches it **escalates automatically**: first to the
owner and the compliance team, then the office's admins, then head office and
the MD / Chairman.

## Who can do what

| Role | Sees | Can change |
|---|---|---|
| Compliance officer (`COMPLIANCE_OFFICER`) | every office | everything (`licence.manage`) |
| Head office admin, super admin | every office | everything (`licence.manage`) |
| MD / Chairman (`EXECUTIVE`), auditor | every office | nothing (read-only) |
| Branch admin | their own offices | nothing |
| Everyone else | — (`403`) | — |

Office scope is `moduleScope(actor, [COMPLIANCE_OFFICER, EXECUTIVE])`. A
licence outside the viewer's offices is a `404 LICENCE_NOT_FOUND`, never a
`403`. Responses carry `viewer.actions`: `EDIT`, `ADVANCE_RENEWAL`,
`MARK_RENEWED`, `UPLOAD_DOCUMENT`, `ADD_NOTE` (managers only; renewal actions
only while the licence is in use).

A licence's **owner** must be someone who can open it (a compliance officer,
the office's branch admin, head office or leadership; never an auditor), so
every alert they receive leads somewhere. `GET /licences/owners?branchId=`
lists the eligible people.

## States and countdowns

All dates are calendar dates (`YYYY-MM-DD`); countdowns are whole
Asia/Dhaka days (`daysUntil` in `packages/shared/src/licences.ts`), so
"Expires today" means the same on the portal, the phone and in the engine.

| State | Rule | Tone |
|---|---|---|
| `EXPIRED` | expiry date has passed | danger |
| `EXPIRING` | 0–30 days left | danger |
| `DUE_SOON` ("Renewal due") | inside the licence's renewal window (`renewalLeadDays`, 7–365, default 90) but more than 30 days left | pending |
| `VALID` | more than `max(30, renewalLeadDays)` days left | success |

The badge reads "12 days left", "1 day left", "Expires today", "Expired 5
days ago" (shared `licenceCountdownLabel`), always with an icon. Filters add
`RENEWAL_IN_PROGRESS` (stage after Not started and before Renewed) and
`RETIRED` (licences no longer required, `active = false`; hidden from every
other tab, the summary counts and the alerts, history kept).

## Renewal

`NOT_STARTED → DOCUMENTS_PREPARED → APPLICATION_SUBMITTED →
INSPECTION_SCHEDULED → FEE_PAID → RENEWED`. The progress bar is 0–100
(`renewalProgress`), drawn as five segments.

- `POST /licences/:id/renewal { stage, note? }` moves forward (stages may be
  skipped — not every licence needs an inspection) or back with a reason
  (`400 REASON_REQUIRED`). Same stage → `409 LICENCE_STATE_CONFLICT`.
  `RENEWED` is refused here (`400 USE_MARK_RENEWED`). Row-locked.
- `POST /licences/:id/renew { newExpiresAt, issuedAt?, renewalFee?, note? }`
  (JSON, or multipart with the new certificate in `file`) records the
  renewal: the new expiry must be in the future and after the current one
  (`EXPIRY_NOT_FUTURE`, `EXPIRY_NOT_LATER`); the issue date defaults to
  today. The stage goes back to Not started, the alert ladder resets, a
  `RENEWED` event (and `DOCUMENT_UPLOADED` with a file) is written, and
  everyone who was alerted about the old expiry is told it is renewed.

## Escalation alerts

`LicenceAlertsService` (`apps/api/src/licences/licence-alerts.service.ts`)
runs on the background-checks schedule (`SLA_INTERVAL_SECONDS`, default 60 s;
`0` turns the timer off, as in tests) and on demand with
`POST /admin/licences/run-alerts` (`licence.manage`). Each run is one indexed
query over in-use licences within 90 days of expiry that have not had their
final alert.

For each licence it finds the threshold reached in `LICENCE_ALERT_DAYS`
(90, 60, 30, 15, 7, 0). The 90- and 60-day alerts only fire once the licence
is inside its renewal window; from 30 days every threshold applies. If that
threshold is nearer expiry than `lastAlertDays`, it sends **one** alert:

| Threshold | Recipients |
|---|---|
| 90, 60 | owner + compliance officers |
| 30, 15 | + the office's branch admins |
| 7, 0 (and expired) | + head office admins + MD and Chairman (`EXECUTIVE`) |

With nobody to tell, super admins are told. Notifications are
`ACTION_REQUIRED`, event type `LICENCE_EXPIRY_ALERT`, `data.route =
/licences/<id>`; titles read "Factory licence expires in 15 days", "Fire
licence expires today", "Fire licence has expired"; the body names the
office, number, authority, expiry date and renewal stage. An `ESCALATED`
event records the threshold, days left, level and the names notified.

**Never twice:** the threshold is re-checked and `lastAlertDays` /
`lastAlertAt` written under a row lock, and each notification's dedupe key is
`licence:<id>:alert:<expiry date>:<threshold>:<user>`. A run that finds
nothing new sends nothing. Recording a renewal, or editing the expiry date,
clears `lastAlertDays`, so the ladder starts again for the new date.

## Scanned copy

`POST /licences/:id/document` — multipart `file`, PDF / JPEG / PNG / WebP
judged by content (`sniffMime`; `400 DOCUMENT_TYPE`), at most 15 MB
(`400 DOCUMENT_TOO_LARGE`). Stored in private storage; replacing keeps the
history (`DOCUMENT_UPLOADED`, `replaced: true`).

Responses carry `documentUrl`, a signed link valid for 10 minutes:
`/api/licence-documents/:id/content?exp=…&sig=…` (HMAC-SHA256 with the JWT
secret over the licence id, the stored file key and the expiry, so a link
stops working the moment the scan is replaced). It is served with the right
`Content-Type`, `Content-Disposition: inline`, `nosniff`, and
`X-Frame-Options: SAMEORIGIN` / `frame-ancestors 'self'` so the portal can
show PDFs in its own preview frame and nobody else can frame them. Forged →
`401 LINK_INVALID`; expired → `401 LINK_EXPIRED`. Clients with a token can
also use `GET /licences/:id/document/content`.

## API

| Method | Path | Capability | Notes |
|---|---|---|---|
| GET | `/licences` | `licence.view` | `state` (`VALID`, `DUE_SOON`, `EXPIRING`, `EXPIRED`, `RENEWAL_IN_PROGRESS`, `RETIRED`), `category`, `branchId`, `q` (name, number, authority), `cursor`, `limit`; soonest expiry first; `{ items, nextCursor }` |
| GET | `/licences/offices` | `licence.view` | offices the viewer can filter by |
| GET | `/licences/owners?branchId=` | `licence.manage` | people who can own a licence there |
| POST | `/licences` | `licence.manage` | create; `Idempotency-Key`; `409 LICENCE_NUMBER_TAKEN` per office |
| GET | `/licences/:id` | `licence.view` | detail with `history`, `document`, `documentUrl`, `alerts`, `viewer.actions` |
| PATCH | `/licences/:id` | `licence.manage` | any field; `null` clears owner / issue date / fee / notes; `active: false` retires |
| POST | `/licences/:id/renewal` | `licence.manage` | move the renewal stage |
| POST | `/licences/:id/renew` | `licence.manage` | mark renewed (JSON or multipart) |
| POST | `/licences/:id/document` | `licence.manage` | upload / replace the scan |
| GET | `/licences/:id/document/content` | `licence.view` | the scan, with an auth header |
| GET | `/licence-documents/:id/content` | public, signed | the scan, for `<iframe>`, `<img>` and phones |
| POST | `/licences/:id/notes` | `licence.manage` | `{ note }` → `NOTE_ADDED` |
| GET | `/admin/licences/summary?branchId` | `licence.view` | see below |
| POST | `/admin/licences/run-alerts` | `licence.manage` | `{ ranAt, checked, alerted, alerts[] }` |

List rows: `{ id, name, licenceNumber, category, issuingAuthority, branch,
owner, expiresAt, daysLeft, state, renewalLeadDays, renewalStage,
renewalProgress, hasDocument, active }`.

Summary (in-use licences in the viewer's offices):

```json
{
  "total": 16, "valid": 8, "dueSoon": 3, "expiring": 3, "expired": 2,
  "renewalsInProgress": 3, "retired": 0,
  "nextExpiry": { "id": "…", "name": "Trade licence", "branch": { "id": "…", "name": "Dhaka Branch", "code": "DHK" }, "expiresAt": "2026-10-27", "daysLeft": 5 },
  "byCategory": { "TRADE": 5, "FACTORY": 1, "ENVIRONMENT": 2, "FIRE_SAFETY": 2, "…": 0 }
}
```

`nextExpiry` is the soonest licence not yet expired (or `null`);
`byCategory` lists every category, zeros included.

Every change is audited (`licence.created`, `licence.updated` with
before/after, `licence.renewal_stage_changed`, `licence.renewed`,
`licence.document_uploaded`, `licence.note_added`, `licence.alerts_run`).
`licence_events` is append-only: a database trigger refuses UPDATE and
DELETE, even from SQL.

## Admin portal

`/licences` (`apps/admin/src/pages/licences/`): KPI tiles (Expired,
Expiring ≤ 30 days, Renewal due, Renewals in progress, Valid — each opens its
tab), a "Next to expire" strip, filter tabs with counts (All, Expiring,
Renewal due, Expired, Renewal in progress, Valid, and Retired when there are
any), office and kind filters and search, and the register — a table on wide
screens, cards on phones and tablets — with the countdown badge and the
segmented renewal bar on every row. Managers get **Run alerts now** and
**Add licence** (`/licences?new=1` opens the form directly; the parameter is
cleared on close).

`/licences/:id`: a navy countdown hero (ring showing how much of the
renewal window is left), the renewal stepper with **Advance stage** and
**Mark renewed** (new expiry, issue date, fee, optional new scan) dialogs,
the scanned-copy card and **preview modal** (PDF in a same-origin `<iframe>`,
images inline, "Open in new tab", upload / replace), details, the alert
ladder for the current expiry date (sent / next / upcoming, with audience),
notes, and the history including every escalation. Works at 390 px.

The portal's nginx serves `/api/licence-documents/` with
`frame-ancestors 'self'` instead of the site-wide `DENY` so the preview can
frame the scan, and accepts request bodies up to 16 MB.

## Mobile (read-only)

`/licences` and `/licences/:id` (`apps/mobile/lib/modules/licences/`), for
people with `licence.view`: a navy summary (expired, ≤ 30 days, renewal due,
valid, next to expire), state chips with counts, cards with the countdown
badge, office, authority and renewal bar; the detail screen has the countdown
ring, renewal stepper, details, history and **View scanned copy** — images
open in a zoomable in-app viewer, PDFs open in the phone's viewer through
`url_launcher` with the signed link resolved against the API base
(`apiUrl`); a fresh link is fetched each time. All strings are in English and
Bangla (`tool/strings/licences.py`).

## Demo data

`seedLicences` adds 16 licences across all six offices, dated relative to
today: 2 expired (Factory B fire licence, Factory A boiler certificate),
3 expiring within 30 days (Factory A factory licence — application
submitted; Factory B environmental clearance — inspection scheduled; Dhaka
Branch trade licence), 3 due soon (warehouse LPG storage, head office IRC,
Factory B trade licence) and 8 valid (trade licences for DNCC / NCC / GCC,
BERC LPG marketing, ERC, Factory A fire, BSTI, Factory A environmental
clearance). Owners are Shirin Akhter (head office, corporate office, Dhaka
Branch), Sabina Yasmin (Factory A), Tahmina Begum (Factory B) and Arif
Chowdhury (warehouse). Five carry a generated scan (three PDFs, two PNGs).
Every alert already due is on record — `lastAlertDays`, `ESCALATED` history
and inbox items for the latest alerts — so the engine's first run sends
nothing new.

## Tests

`apps/api/test/licences.test.ts` (15) covers listing order and fields, every
filter tab, search and pagination, the summary, create / edit by managers
only with validation and audit, state calculation, renewal moves and Mark
renewed, document type checks and signed links (valid, forged, expired,
replaced), alert thresholds and recipients, no duplicates and the reset after
renewal, office scope, `403` for employees, read-only auditors and MD,
retiring, and append-only history. `packages/shared/src/licences.test.ts`
covers the calendar, states, labels and alert rules;
`apps/mobile/test/licences_test.dart` the badges (English and Bangla), the
renewal bar, parsing, and both screens against a mock API.
