# Workflows

How each part of custody works end to end. Statuses and transitions are in
[state-machine.md](state-machine.md); who may do what is in
[permissions.md](permissions.md).

## 1. Booking

The sender (or someone booking on their behalf, recorded as such) fills four
short steps in the app: **what** (title, description, category, priority,
classification), **to whom** (employee, department, office or external
person), **how** (employee courier, external courier company, or guest
carrier — or decide later), **review**. Drafts are allowed.

On booking the API, in one transaction: allocates the tracking number
(`ABG-YYMMDD-OFFICE-SEQ5`), generates the opaque QR token and the sender's
6-digit handover PIN (hashed), writes `PARCEL_CREATED`, and notifies the
receiver immediately (acceptance tests 1–2). Create requests carry an
`Idempotency-Key`, so a double-tap books one parcel.

## 2. QR label

The label (printed from the portal or shown in the sender's app) encodes
`<PUBLIC_QR_BASE_URL>/q/<token>`. The token is random — it identifies a parcel
only to someone signed in with a relation to it.

Scanning (`POST /parcels/scan`) returns the parcel *and the suggested next
action for this person*: a courier at pickup gets "request handover", a
receiver gets "receive", a destination colleague gets "receive on behalf",
an unrelated user gets 404. The portal handles label URLs too: opening
`/q/<token>` or letting a desk scanner type the URL into the search box opens
the parcel.

The receiver's own view never includes the token. Receiving by QR therefore
proves the label was physically in hand.

## 3. Handover (custody start)

Custody moves from sender to courier only with a verified handover — one of:

| Method | How | Proof recorded |
|---|---|---|
| Sender approval in app | Courier scans → sender gets "approve handover to Karim Ahmed" → taps approve | sender's user, time, device |
| Sender's PIN | Sender reads the 6-digit PIN to the courier, who enters it | PIN verified (5 wrong attempts lock it) |
| Dispatch officer | Officer at the origin desk witnesses and confirms (portal or app) | officer, office, time |

The result is `HANDOVER_CONFIRMED` + `PICKED_UP` with server time, the courier
as custodian, and the method (acceptance test 4). External couriers are
handed over by dispatch; guest carriers verify their phone first.

## 4. Transit, checkpoints, arrival

Couriers mark *in transit*, add *checkpoints* (gate, hub) and *arrived*. The
destination desk can also mark arrival when a courier drops at reception.
Arrival immediately becomes **Pending Receipt** and the receiver is notified
"waiting for you at …" (acceptance test 6). The parcel is still
*unreceived* — the dashboard counts and ages these separately.

## 5. Receipt and proof

| Method | Who acts | Use when |
|---|---|---|
| In-app confirmation | Receiver | Receiver has the app and the parcel |
| QR confirmation | Receiver or colleague | Scanning the physical label proves possession |
| One-time code | Courier or desk enters the code SMS'd to the receiver | Receiver has no app / no data; or a non-employee recipient |
| Signature / photo | Captured by the courier, attached to the receipt | Additional evidence; stored as proof attachments |

**On behalf.** If the receiver is away, a colleague or the desk receives with
a reason (and optional relationship). The ledger stores the actual receiver,
their employee ID, method and reason separately from the intended receiver,
who is told straight away (acceptance test 13). Not allowed for highly
confidential parcels.

On `RECEIVED` the sender is told who received it and when (test 8), the
receipt appears on the parcel with its verification method, and the
chain-of-custody report shows every step (test 9).

## 6. Exceptions, holds, returns, cancellation

Anyone involved can record an exception (receiver unavailable, wrong
destination, damaged, seal broken, office closed…) with details, optionally
moving the parcel to *Exception* or *Delivery Failed*. Branch and head-office
admins can put a parcel *On Hold*. Operations resolve exceptions with a note,
and the parcel resumes from where it was (or a chosen valid status).

Returns go *Return Requested → Return In Transit → Returned*, confirmed by the
sender or the origin's dispatch officer. Cancelling is only possible before
custody starts.

## 7. Notifications

`src/notifications/notification.service.ts` maps each ledger event to
recipients and copy:

- **In-app** rows are written first, deduplicated per event and person
  (`dedupeKey`), with categories *Action required*, *Parcel update* and
  *System*. The mobile Alerts tab filters by them.
- **Push** via FCM HTTP v1 (service-account JSON from the environment) to every
  registered device; invalid tokens are pruned. Delivery attempts are recorded
  in `notification_deliveries`.
- **SMS** for guest carriers, external receivers and receipt codes, through a
  provider abstraction (`dev` logs only; `http` POSTs JSON to your gateway).
- **Lock-screen safe.** Highly confidential parcels are named only by tracking
  number in push and SMS text (test 18).
- **Preferences.** People can turn push or SMS off; the in-app channel cannot
  be switched off, because it is the custody record people act on.

## 8. SLA reminders and escalation

Policies (portal → *Offices & rules → SLA & escalation*) have a **stage**
(pickup, delivery, receipt, end-to-end), a **threshold** in minutes, optional
filters (priority, classification, carrier type, origin, destination,
category), an **audience** (carrier, sender, receiver, dispatch officer,
branch admin, head-office admin) and whether they **mark the parcel overdue**.

Every `SLA_INTERVAL_SECONDS` the engine finds parcels that have sat in a stage
longer than a policy allows and haven't triggered it yet. Each trigger is
stored once per parcel per policy (unique), appended to the ledger
(`SLA_REMINDER` or `SLA_ESCALATED`) and notified. Seeded defaults include
"receipt reminder after 1 h" and "receipt escalation to branch admin after
2 h" (test 14). Admins can extend a parcel's expected delivery with a reason.

## 9. External couriers

Every courier integration implements one interface
(`src/couriers/courier-adapter.ts`):

```ts
interface CourierProviderAdapter {
  normalizeStatus(raw: string): ExternalStatus | null;
  verifyWebhook(headers, rawBody, secret): boolean;
  processWebhook(payload, rawBody): NormalizedProviderEvent[];
  getTracking(provider, trackingNumber, credentials): Promise<TrackingSnapshot>;
  cancelShipment(provider, trackingNumber, credentials): Promise<void>;
}
```

Adapters exist for **Pathao, REDX, Steadfast**, a generic provider and
**manual** tracking. Adding a provider means a status table and payload
parsing — custody code never changes.

- **Webhooks** `POST /api/webhooks/couriers/:code` are verified against the
  raw body (HMAC-SHA256 header, or a bearer secret), timestamp-checked, and
  de-duplicated by `(provider, externalEventId)` — a repeated webhook is
  stored as a duplicate and ignored (test 19).
- **Normalisation** maps each provider's vocabulary to *pending, picked up,
  in transit, out for delivery, delivered, failed, on hold, returning,
  returned, cancelled*. "Delivered" by a courier puts a parcel for an ABG
  receiver into **Pending Receipt** — the ABG receiver still confirms. Only
  for an *external* receiver (outside ABG) is the courier's proof of delivery
  recorded as the receipt, with verification "external provider".
- **Manual mode** lets dispatch record the courier's status by hand. Each
  provider is feature-flagged (enabled / API polling / webhooks) in the portal;
  credentials and secrets stay in environment variables.

The provider, its tracking number, booking reference, rider and tracking link
live on the same ABG record (test 12).

## 10. Offline (mobile)

Pickup confirmation, transit, checkpoints, arrival, receipt and exceptions
work without signal (`apps/mobile/lib/core/offline_queue.dart`). Each action is
queued with a client UUID that doubles as its `Idempotency-Key` and the
phone's timestamp, shown as "waiting to sync", and replayed in order when the
connection returns. The server applies each once (test 15), records the
device time next to its own, and if the parcel moved on meanwhile the conflict
is shown to the user rather than silently dropped.

## 11. Corrections and audit

Nothing in the ledger is edited. An admin correction (`POST
/parcels/:id/corrections`) appends `CORRECTION_ADDED` that references the
original event and, for correctable fields (title, priority, expected
delivery, courier references…), records before → after (test 17).

The audit log (`audit_logs`, append-only) records administrative and security
events: sign-ins (privileged), failed and locked sign-ins, MFA changes,
session revocations, configuration and role changes with before/after,
exports and reports, guest sign-ins. The portal's *Audit log* filters by
action, object and date and shows the JSON diff.

## 12. Reports

Daily dispatch register, incoming and outgoing registers per office, pending
receipt (longest wait first), overdue, completed deliveries, exceptions,
monthly office summary, courier activity, and the per-parcel
**chain-of-custody** report. Each can be viewed, printed with the ABG header,
or downloaded as CSV (opens in Excel). Parcel lists export to CSV with the
current filters. All exports respect the viewer's scope and redaction.
