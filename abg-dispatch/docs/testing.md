# Tests

```bash
# from abg-dispatch/
bun run test                         # shared domain + API (needs PostgreSQL)
cd apps/mobile && flutter analyze && flutter test
cd apps/admin && bun run typecheck   # tsc -b
```

The API tests boot the real NestJS app in-process against a dedicated
database (`TEST_DATABASE_URL`, default
`postgresql://abg:abg_dev_password@localhost:5432/abg_dispatch_test`), apply
the migrations, reset and seed it, and call the HTTP API exactly as the apps
do. PostgreSQL triggers are part of what is tested.

| Suite | File | Count |
|---|---|---|
| Shared domain (state machine, permissions, tracking numbers, redaction) | `packages/shared/src/domain.test.ts` | 23 |
| Mandatory acceptance tests | `apps/api/test/acceptance.test.ts` | 20 |
| Authorisation, integrity and courier mapping | `apps/api/test/authorization.test.ts` | 20 |
| Incident & facility issues (reporting with photos, group from sub-category, Critical/Urgent alerts, signed photo links, the four-stage flow, resolutions and their notes, reopen, anonymity, confidential routing and visibility, misconduct, handing to and from head office, detail edits, group/stage/severity/resolution/confidential filters, scope, image checks, idempotency, append-only history and database checks, summary) | `apps/api/test/incidents.test.ts` | 18 |
| Mobile (status tones and icons, status chips, Bangla labels, parcel card, timeline, viewer actions, incident stage chip, severity tags, groups and sub-categories in both languages, incident parsing, stage tracker, history wording) | `apps/mobile/test/widget_test.dart` | 13 |

## The 20 acceptance tests

| # | Requirement | Test name |
|---|---|---|
| 1 | Booking creates a unique tracking ID and QR | An employee books a parcel with title and description; a unique tracking ID and QR are created |
| 2 | Receiver notified on booking | Farhana is notified immediately after booking |
| 3 | Courier actions restricted | Only Karim (or authorised operations) can process courier actions |
| 4 | Verified pickup with actors and server time | Karim scans the QR at pickup, Rahim confirms, and the exact actors and server time are recorded |
| 5 | Admin In Route view | The parcel appears in the administrator's In Route view |
| 6 | Arrival ≠ receipt | Reaching the destination makes it PENDING_RECEIPT — never RECEIVED automatically |
| 7 | Receipt with proof | Farhana accepts with a one-time code; who, ID, date, time and proof are recorded |
| 8 | Sender told who received | Rahim is told the parcel was delivered and by whom |
| 9 | Complete, immutable timeline | The admin sees it under Received with a complete, immutable timeline |
| 10 | Object-level authorisation | An employee with no relation to the parcel is refused by the backend |
| 11 | Guest carrier isolation | A guest carrier verifies their phone and can reach only their own assignment |
| 12 | External courier in the same record | An external courier's provider and tracking number live in the same ABG record |
| 13 | Received on behalf | When the receiver is away, an assistant receives on her behalf and is recorded separately |
| 14 | SLA reminder then escalation | A parcel left in Pending Receipt past its SLA reminds the receiver, then escalates to the branch admin |
| 15 | Offline sync exactly once | A pickup captured offline syncs exactly once when the connection returns |
| 16 | No duplicate receipt | A double-tapped Receive creates exactly one RECEIVED event |
| 17 | Corrections keep the original | An admin correction keeps the original event and logs the change |
| 18 | Lock-screen safe | A Highly Confidential parcel's notification reveals nothing on the lock screen |
| 19 | Webhook replay ignored | A repeated courier webhook is ignored the second time |
| 20 | Precise filtering | Filtering In Route + Factory A destination + today returns exactly the right parcels |

## Authorisation and integrity tests

Branch scoping; confidential redaction for couriers and branch operations;
receivers never get the QR token; auditors read everything and change
nothing; employees cannot reach admin endpoints; branch dispatch can confirm
handovers only in their own branch; clients cannot set a status; receiving
before arrival is refused with a reason; in-custody parcels cannot be
cancelled; wrong handover PINs lock after five attempts; deactivated users'
sessions stop at once; wrong passwords lock the account; refresh tokens
rotate; **the list filter and per-parcel check agree for every seeded user**;
the PostgreSQL transition table equals the shared state machine; invalid
status changes are rejected even by direct SQL; `RECEIVED` requires receiver,
time and verification; proofs and audit entries cannot be altered; event
sequences are gap-free; each provider's vocabulary maps onto ABG statuses.

## Incident & facility issue tests

An employee reports with a photo and only that office's admins and head
office are told, titled *Urgent:* or *Critical:* by severity; the group comes
from the sub-category and a mismatch (or the old vocabulary) is refused;
photos open only for people involved or through an unforged, unexpired signed
link; Reported → Acknowledged → Under Investigation → Closed notifies the
reporter at each stage, the history and the stage tracker read back with who
and when, and the viewer's actions follow the stage; closing needs a
resolution and every resolution but Resolved needs a note, a close straight
from Reported skips the investigation; stages only move forward, and a closed
report reopens into Under Investigation with its resolution cleared; an
anonymous report never reveals the reporter to handlers — not in the report,
the list, search or notifications — while staying with the office; a
confidential report reaches head office only (not the office's admins, not
auditors), hides the reporter even from head office, is readable but not
changeable by the MD, and its reporter updates stay off the lock screen;
misconduct is always confidential; marking a report confidential hands it to
head office and taking it back out keeps the reporter hidden; group,
sub-category and severity edits are kept in the history; the admin list
filters by group, stage, severity, resolution and confidentiality; unrelated
employees and other offices' admins get 404, auditors read but cannot change;
non-images and a fourth photo are refused; a repeated `Idempotency-Key` files
once; the history cannot be changed, and the database refuses a closed report
without a resolution or a mismatched group, even by direct SQL; the summary's
shape, stage and group counts, Critical and urgent counts, recent log and
scope (office, group, head office, MD, auditor) are checked against the list.

## UI verification

The mobile app (web build) and the admin portal were driven with Playwright
against the running API — signing in, booking through the four-step form,
receiving through the app, scanning, guest sign-in, Bangla, and in the portal
assigning a courier, confirming a desk handover and resolving an exception —
and checked at phone width for overflow. The Docker stack was brought up in
production mode and verified: migrations applied, seeding, admin MFA
enrolment enforced, TOTP sign-in, live feed through nginx, and no
Content-Security-Policy violations.

Incident reports were driven the same way: Farhana reported a dirty floor
with a photo on the phone, Sabina (Factory A branch admin) saw it in the
portal, moved it to Processing and Done with messages and a fix photo, and
Farhana's app showed each status, the admin's note and the alerts; Arif saw
the confidential misconduct report that Sabina cannot.
