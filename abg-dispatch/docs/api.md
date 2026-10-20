# API reference

Base URL `/api` (e.g. `https://dispatch.abg.com.bd/api`). JSON over HTTPS.

## Conventions

| Topic | Rule |
|---|---|
| Auth | `Authorization: Bearer <accessToken>`. Access tokens last 15 minutes; refresh with `POST /auth/refresh` (refresh tokens rotate — an old one stops working). Guest carriers get a single 12-hour token. |
| Errors | `{ "statusCode": 409, "code": "ALREADY_RECEIVED", "message": "Received by Farhana Islam at 9:34 AM…", "details": {…} }`. `code` is stable; `message` is written for people. |
| Not found | A parcel you have no relation to returns `404 PARCEL_NOT_FOUND`, same as one that doesn't exist. |
| Idempotency | Custody actions and `POST /parcels` accept `Idempotency-Key: <uuid>`. A replay returns the original result and records nothing new. |
| Device context | Custody actions accept `locationId`, `latitude`, `longitude`, `deviceTimestamp`, `notes`. Server time is the official time. |
| Paging | Lists return `{ items, nextCursor }`; pass `cursor` and `limit` (≤ 100). |
| Dates | ISO-8601 UTC in and out. Date filters (`dateFrom`, `dateTo`, `date`, `month`) are Asia/Dhaka calendar days. |
| Rate limits | Sign-in 10/min, refresh 30/min, password change 5/min, MFA enable 10/min, guest code request 5/min and verify 10/min — per IP. |

Every parcel response includes `viewer.relation` and `viewer.actions` — the
actions this user may take next. Build buttons from it.

## Auth — `/auth`

| Method & path | Purpose |
|---|---|
| `POST /auth/login` | `{ identifier (email or employee ID), password, totp?, platform?, deviceName? }` → tokens, `mfaEnrollmentRequired`, profile. `401 MFA_REQUIRED` asks for `totp`. Five failures lock the account for 15 minutes. |
| `POST /auth/refresh` | `{ refreshToken }` → new pair |
| `POST /auth/logout` | Revoke this session |
| `GET /auth/me` · `PATCH /auth/me` | Profile, roles, capabilities, scopes · set `locale` (`en`/`bn`) |
| `POST /auth/password` | Change password (signs out other devices) |
| `GET /auth/sessions` · `DELETE /auth/sessions/:id` | Where I'm signed in · sign one out |
| `POST /auth/mfa/setup` · `POST /auth/mfa/enable` | Start TOTP enrolment (secret + otpauth URI) · confirm with a code (returns fresh tokens carrying the MFA claim) |
| `POST /auth/guest/request-code` · `POST /auth/guest/verify` | Guest carrier phone sign-in (same reply whether or not the number exists) |
| `POST /auth/devices` · `DELETE /auth/devices/:token` | Register / remove an FCM token |

## Parcels — `/parcels`

| Method & path | Who | Purpose |
|---|---|---|
| `GET /parcels` | any | My parcels: `box` (INCOMING, OUTGOING, ASSIGNED, ACTIVE, COMPLETED, ALL), `view`, `q`, `status`, `priority`, `categoryId`, `branchId`, `dateFrom/To` |
| `GET /parcels/summary` | any | Home-screen counts |
| `POST /parcels` | `parcel.create` | Book (or `saveAsDraft`). Receiver: employee, department, office or external. Optional carrier. |
| `GET /parcels/:id` · `GET /parcels/by-tracking/:tn` | related | Parcel, redacted for the viewer |
| `GET /parcels/:id/timeline` | related | Ledger events, attachments, notes, exceptions |
| `POST /parcels/scan` | any | `{ payload }` (label URL or token) → parcel + `suggestedAction` |
| `POST /parcels/:id/book` | sender | Book a draft |
| `POST /parcels/:id/carrier` | sender (before pickup), operations | Assign or reassign: `INTERNAL_EMPLOYEE` + `employeeId`, `EXTERNAL_COURIER` + `external{providerId, trackingNumber, …}`, `GUEST_PERSON` + `guest{fullName, phone, …}`; `reason` when reassigning |
| `POST /parcels/:id/accept` | courier | Accept the assignment |
| `POST /parcels/:id/handover/request` | courier | Ask the sender to approve (after scanning) |
| `POST /parcels/:id/handover/confirm` | sender / courier with PIN / origin dispatch | `{ method: SENDER_APP \| SENDER_PIN \| DISPATCH_OFFICER, pin? }` → Picked Up |
| `POST /parcels/:id/in-transit` · `/checkpoint` | courier, dispatch (external) | Transit, checkpoint `{ label }` |
| `POST /parcels/:id/arrive` | courier, destination desk | → Pending Receipt |
| `POST /parcels/:id/receipt-code` | courier, desk | SMS a one-time code to the receiver or a named on-behalf recipient |
| `POST /parcels/:id/receive` | receiver, colleague with label, courier/desk with code | `{ method: APP_CONFIRMATION \| QR_CONFIRMATION \| OTP, qrPayload?, code?, onBehalf?{reason, relationship}, signatureAttachmentId?, photoAttachmentId? }` |
| `POST /parcels/:id/exceptions` | parties, carrier, operations | `{ code, details, setStatus? }` |
| `POST /parcels/:id/exceptions/:exceptionId/resolve` | `parcel.exception.resolve` | `{ resolution, resumeStatus? }` |
| `POST /parcels/:id/cancel` · `/return` | sender (before custody), admins | `{ reason }` |
| `POST /parcels/:id/return/start` · `/return/complete` | courier · sender or origin dispatch | Return leg |
| `POST /parcels/:id/comments` | related | Note for everyone on the parcel |
| `POST /parcels/:id/corrections` | `parcel.correct` | `{ reason, eventId?, field?, value? }` — appends, never edits |
| `POST /parcels/:id/sla` | `parcel.sla.update` | `{ expectedDeliveryAt \| null, reason? }` |
| `POST /parcels/:id/notifications/resend` | `parcel.notify.resend` | `{ audience: SENDER \| RECEIVER \| CARRIER }` |
| `POST /parcels/:id/external-status` | `parcel.external.update` | Manual courier status `{ rawStatus, normalized?, note?, recipientName? }` |
| `POST /parcels/:id/external-sync` | `parcel.external.update` | Poll the provider's tracking API now |

## Attachments

| Method & path | Purpose |
|---|---|
| `POST /parcels/:id/attachments` | Multipart `file` + `kind` (COVER_PHOTO, DISPATCH_CHALLAN, SUPPORTING_DOCUMENT, COURIER_RECEIPT, PROOF_OF_DELIVERY, SIGNATURE, OTHER). JPEG/PNG/WebP/PDF, sniffed from content, ≤ 10 MB. |
| `GET /parcels/:id/attachments/:attachmentId/link` | Short-lived signed URL for `<img>` / download |
| `GET /parcels/:id/attachments/:attachmentId/content` | Authorised download |

## Directory — `/directory` (signed-in employees)

`GET employees?q=&branchId=&departmentId=` · `branches` · `locations?branchId=` ·
`departments` · `categories` · `courier-providers`. Phone numbers are masked
unless the viewer has operations reach.

## Notifications — `/notifications`

`GET /notifications?category=&cursor=` · `GET /unread-count` · `POST /:id/read` ·
`POST /read-all` · `GET|PUT /preferences` (`{ channel: PUSH \| SMS \| EMAIL, enabled }`; in-app is always on).

## Control centre — `/admin`

| Method & path | Capability | Purpose |
|---|---|---|
| `GET /admin/dashboard?branchId=` | dashboard.view | KPIs, pending-receipt ageing, today by hour, attention list, recent custody events |
| `GET /admin/stream` | dashboard.view | Server-sent events: `event: parcel` on every change in the viewer's offices; `ping` every 25 s |
| `GET /admin/parcels` | dashboard.view | All filters of `/parcels` plus `originBranchId`, `destinationBranchId`, `departmentId`, `senderEmployeeId`, `receiverEmployeeId`, `carrierType`, `carrierEmployeeId`, `courierProviderId`, `classification`, `overdue`, `received`, `dateField` (createdAt \| receivedAt) |
| `GET /admin/parcels/export.csv` | reports.export | Same filters, CSV (audited) |
| `GET/POST/DELETE /admin/saved-views` | dashboard.view | Personal saved filters |
| `GET /admin/analytics?from=&to=&branchId=` | analytics.view | Totals and rates, stage durations (incl. P90 wait at destination), daily volume, by office/department/category/route, slowest routes, courier performance |
| `GET /admin/reports/:type` | reports.export | `daily-register`, `incoming`, `outgoing`, `pending-receipt`, `overdue`, `completed`, `exceptions`, `monthly-branch`, `courier-activity`, `chain-of-custody`; `format=csv` for a file |
| `GET /admin/audit-logs` | audit.view | `action`, `objectType`, `objectId`, `actorUserId`, `dateFrom/To`, cursor |
| `GET /admin/integrations` | dashboard.view | Health of PostgreSQL, storage, FCM, SMS, SLA engine and each courier |
| `POST /admin/sla/run` | config.manage | Run the SLA check now |
| `GET/POST/PATCH /admin/branches` · `locations` · `departments` · `categories` · `sla-policies` | dashboard.view to read, config.manage to change | Reference data (office and department codes cannot change once used) |
| `GET/PATCH /admin/courier-providers` | dashboard.view · integrations.manage | Provider flags; secrets refused here |
| `GET/POST/PATCH /admin/employees` · `POST /admin/employees/import` | dashboard.view · users.manage | Directory; CSV import with `dryRun` |
| `GET/POST /admin/users` · `PUT /admin/users/:id/roles` · `POST /admin/users/:id/{deactivate,activate,reset-password,revoke-sessions}` | users.manage | Accounts and roles |

## Webhooks

`POST /webhooks/couriers/:code` (`PATHAO`, `REDX`, `STEADFAST`, `OTHER`) —
public, authenticated by signature: HMAC-SHA256 of the raw body in the
provider's signature header (or `x-abg-signature`), or `Authorization: Bearer
<secret>`. Deliveries outside the time window are rejected; repeats are
recorded as duplicates and ignored.

## Health

`GET /api/health` → `{ status: "ok", time }` (no auth; used by container health checks).
