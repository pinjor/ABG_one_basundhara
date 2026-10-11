# 7. API specification

## 7.1 Standards (SRS §27.1, §27.3)

| ID | Requirement | Class | Source |
|---|---|---|---|
| TSA-API-001 | All APIs SHALL be RESTful JSON over HTTPS. The binding floor is TLS 1.2; TLS 1.3 is the default for SSCOS-controlled endpoints (D-01). | SRS-SHALL | §27.1 |
| TSA-API-002 | APIs SHALL be versioned under `/api/v1/…`. Deprecation notice SHALL be ≥ 12 months, with `Deprecation` / `Sunset` headers on deprecated operations. | SRS-SHALL | §27.1; §27.3 |
| TSA-API-003 | AuthN/Z SHALL use OAuth 2.0 / OIDC (RFC 9700 BCP). Requirements: (a) **Visitors:** Authorization Code + PKCE (S256); access token ≤ **15 min**; rotating refresh tokens with reuse detection. (b) **Privileged staff** (L3 roles, §4.1): access token ≤ **5 min**; step-up for overrides, reveals and approvals. (c) **Other staff:** ≤ 15 min. (d) **Devices and service clients:** client credentials with sender-constrained tokens (mTLS RFC 8705 or DPoP RFC 9449); token ≤ 5 min. Implicit and password grants are forbidden. | SRS-SHALL | §27.1; §33.2; B10 |
| TSA-API-004 | Every API SHALL be described in OpenAPI 3.1 (3.x binding, D-03) and published to the developer portal. Schemas use JSON Schema 2020-12. | SRS-SHALL | §27.1 |
| TSA-API-005 | Every state-changing `POST` / `PATCH` SHALL **require** `Idempotency-Key` (1–64 chars, UUID recommended). A missing key returns `400 VALIDATION_ERROR` (pointer `/headers/Idempotency-Key`). Semantics are in §7.2. | SRS-SHALL | §27.3 |
| TSA-API-006 | Errors SHALL use RFC 9457 `application/problem+json` with `code` from §7.3, `title` / `detail` localised via `Accept-Language` (bn-BD / en), and `correlationId`. Problems SHALL NOT contain PII, tokens or stack traces. | SRS-SHALL | §27.3 |
| TSA-API-007 | Rate limits and quotas SHALL apply per client application and per identity. `429 RATE_LIMITED` includes `Retry-After` and `RateLimit-*` headers. | SRS-SHALL | §27.1 |
| TSA-API-008 | Sensitive calls (access control, financial, PII) SHALL be logged with caller identity, timestamp and payload hash. | SRS-SHALL | §27.1 |
| TSA-API-009 | Request headers: `X-Correlation-ID` (generated if absent, echoed on the response); W3C `traceparent` / `tracestate` propagated end to end, from registration to GL; `Accept-Language`. | DERIVED-MANDATORY | Parent §29.3 lineage; §27.3 |
| TSA-API-010 | A sandbox / UAT environment with synthetic data SHALL be available. | SRS-SHALL | §27.3; §28.2 |
| TSA-API-011 | Authorisation SHALL be checked at **object level** (API1:2023), **property level** (API3:2023 — response filtering and mass-assignment allow-lists) and **function level** (API5:2023). The acting subject SHALL be taken **from the token, never from the request body**. | DERIVED-MANDATORY | Parent §33.2 RBAC at API layer; OWASP API Top 10 2023 |
| TSA-API-012 | Event-driven integration SHALL use signed webhooks (HMAC-SHA256 or JWS) and a message broker for high-volume access events. | SRS-SHALL | §27.1 |
| TSA-API-013 | A credential **denial is a business decision**, not an error. Verification returns `200` with `decision: "DENY"` (D-16). `4xx` is reserved for malformed or unauthenticated requests. | DERIVED-MANDATORY | Parent §27.2 `/access/verify`; D-16 |

## 7.2 Idempotency semantics

| Case | Behaviour |
|---|---|
| First request with key K | Process. Store (client_id, K, payload SHA-256, status, body) in the same transaction as the business change. |
| Same K, same payload, still processing | `409 IDEMPOTENCY_CONFLICT`, `Retry-After: 1`. |
| Same K, same payload, completed | Replay the stored status and body with `Idempotent-Replayed: true`. |
| Same K, different payload | `409 IDEMPOTENCY_CONFLICT` (detail: key reused with different payload). |
| Retention | 24 h. For `/access/verifications`, 15 min; edge replay is also deduplicated by `(deviceId, scanId)`. |
| Provider webhooks | Deduplicated on `(provider, provider_event_id)` (PROVIDER_EVENT); no client key. |

## 7.3 Error catalogue

| Code | HTTP | When |
|---|---|---|
| VALIDATION_ERROR | 400 / 422 | 400 for malformed syntax or missing header; 422 for semantic field failures. `errors[]` carries JSON pointers. |
| UNAUTHENTICATED | 401 | Missing / invalid token or device certificate; certificate ↔ `deviceId` mismatch |
| FORBIDDEN | 403 | Function-level denial. Object-level denials return `404 NOT_FOUND` so existence is not revealed. |
| NOT_FOUND | 404 | — |
| SLOT_UNAVAILABLE | 409 | Unit / slot no longer available (race lost, killed, maintenance) |
| CAPACITY_EXCEEDED | 409 | Pool, allocation, purchase limit or zone capacity exceeded |
| IDEMPOTENCY_CONFLICT | 409 | §7.2 |
| INVALID_STATE_TRANSITION | 409 | Guarded transition refused (§6) |
| BOOKING_EXPIRED | 410 | Hold / retry hold elapsed |
| PAYMENT_DECLINED | 402 | Provider declined (no provider internals leaked) |
| WAITING_ROOM_REQUIRED | 403 | Gated sale without a valid admission token |
| RATE_LIMITED | 429 | — |
| PROVIDER_UNAVAILABLE | 503 | PSP / MFS / SMS breaker open; `Retry-After` |
| INTEGRATION_TIMEOUT | 504 | Downstream timeout. Payment state is then resolved by the poller, never assumed. |

## 7.4 Endpoint catalogue

All paths are prefixed with `/api/v1`. **Idem** = Idempotency-Key required. Server P95 targets exclude network. For gates, the end-to-end SLO is in §9.

**Auth abbreviations:**
- **own** — a visitor acting on their own objects; the subject comes from the token.
- **dev** — gate / kiosk device, mTLS.
- **svc** — integration service client.
- Role codes are from §4.1.

| # | Method & path | Purpose | Auth | Idem | P95 | SRS |
|---|---|---|---|---|---|---|
| E-01 | `POST /visitors` | Register a visitor with consents (§7.6.1) | public + verified OTP session; R-06 / R-16 / kiosk for assisted | Yes | 500 ms | §27.2 `/visitors`; FR-TCK-001 |
| E-02 | `GET /visitors/{id}`, `PATCH /visitors/{id}` | Read (masked) / update profile | own; staff masked | PATCH yes | 500 ms | §27.2 |
| E-03 | `POST /visitors/{id}/consents` | Record consent grant / refusal / withdrawal | own | Yes | 500 ms | §29.3 |
| E-04 | `POST /visitors/{id}/guardian-links` | Link a minor to a guardian | own (guardian); R-06 | Yes | 500 ms | TSA-IDN-005 |
| E-05 | `POST /visitors/{id}/face-enrolments`, `DELETE /visitors/{id}/face-enrolments` | Start enrolment (vendor liveness session) / withdraw and purge | own + BIOMETRIC consent; R-17 | POST yes | 1 s | FR-TCK-002; §29.3 |
| E-06 | `POST /otp/challenges`, `POST /otp/verifications` | Mobile / email OTP | public | Yes | 500 ms | TSA-IDN-003 |
| E-07 | `POST /dsr-requests`, `GET /dsr-requests/{id}` | Data-subject request | own; R-17 | Yes | 500 ms | §29.3 |
| E-08 | `GET /products`, `GET /events`, `GET /availability?resourceId=&date=` | Catalogue and availability (cache ≤ 5 s) | public | — | 500 ms | FR-SPT-001 |
| E-09 | `GET /seat-maps/{eventId}` | Seat map + availability | public | — | 500 ms | FR-EVT-003 |
| E-10 | `POST /waiting-rooms/{saleId}/sessions`, `GET /waiting-rooms/{saleId}/sessions/{id}` | Join queue / poll position and admission token | public | Yes | 300 ms | TSA-WR-001 |
| E-11 | `POST /bookings` (alias `POST /tickets`, D-08) | Create booking and acquire holds atomically (§7.6.2) | own / R-04 / R-05 / R-06 / kiosk + admission token for gated sales | Yes | 800 ms | §27.2 `/tickets`; FR-SPT-006 |
| E-12 | `GET /bookings/{id}` | Booking, holds, tickets | own; staff | — | 500 ms | — |
| E-13 | `POST /bookings/{id}/attendees` | Name / reassign attendees before cut-off | own; R-04 | Yes | 500 ms | FR-TCK-007 |
| E-14 | `POST /bookings/{id}/cancellation` | Cancel HOLD / AWAITING_PAYMENT booking; release holds | own; R-06 | Yes | 500 ms | §6.1 |
| E-15 | `POST /promotions/validations` | Validate a promo against a booking (server-computed discount) | own | Yes | 500 ms | TSA-PRM-001 |
| E-16 | `POST /payments` | Initiate payment for a booking, membership or F&B order (§7.6.3) | own; R-06; svc F&B | Yes | 1.5 s | §28.1; FR-FNB-005 |
| E-17 | `GET /payments/{id}`, `POST /payments/{id}/status-queries` | Read status / force a provider query (poller and support) | own; R-14; system | POST yes | 500 ms / 2 s | §28.1 |
| E-18 | `POST /payment-webhooks/{provider}` | Provider callbacks: signature verified, stored in PROVIDER_EVENT, processed async | provider signature (+ mTLS / IP allow-list where offered) `[VENDOR-DOC-REQUIRED]` | Provider event ID | 300 ms ack | §28.1 |
| E-19 | `POST /refunds`, `POST /refunds/{id}/approval`, `GET /refunds/{id}` | Raise / approve (four-eyes) / track | R-06, R-08, R-15, R-16 | Yes | 800 ms | §26.5 |
| E-20 | `POST /memberships`, `POST /memberships/{id}/renewals`, `POST /memberships/{id}/members` | Purchase, renew, add a family / corporate member | own; R-04 | Yes | 800 ms | FR-TCK-006 |
| E-21 | `GET /visitors/{id}/wallet` | Tickets, memberships, credentials, ledger summary | own | — | 500 ms | §26.1 |
| E-22 | `GET /tickets/{id}/credential` | Credential render bundle: encrypted token + TOTP seed wrapped to the device key | own + app attestation | — | 500 ms | TSA-CRD-003/005 |
| E-23 | `POST /tickets/{id}/credential/reissue` | Revoke and reissue (lost phone / card) | own; R-06; R-16 | Yes | 800 ms | §28.1 lifecycle |
| E-24 | `POST /tickets/controlled-issuance` | Zero-value / COMP / VIP issuance with approval | R-08 (+ R-15 checker) | Yes | 800 ms | FR-TCK-004/005 |
| E-25 | `POST /allocation-pools`, `POST /allocation-pools/{id}/assignments` (CSV, async > 500 rows), `POST /allocation-pools/{id}/reclaim` | Corporate / sponsor allocation | R-04, R-05, R-08 | Yes | 2 s | FR-EVT-003 |
| E-26 | **`POST /access/verifications`** | **Authoritative verification** (§7.6.4) | dev + `access:verify` | Yes (15 min) | Server ≤ 300 ms; end-to-end per §9 | §27.2; FR-ACC-001/002/005/006 |
| E-27 | `POST /tickets/{id}/checkin` | **Alias** of E-26 (D-07) | dev | Yes | same | §27.2 |
| E-28 | `POST /access/verify` | **Alias** of E-26 (D-07) | dev | Yes | same | §27.2 |
| E-29 | `POST /access/overrides` | Override with reason + step-up (§7.6.6) | R-11 (+ R-13 for BLACKLISTED) | Yes | 800 ms | FR-ACC-008 |
| E-30 | `POST /access/unscans` | Supervisor un-scan | R-11 + R-13 approval | Yes | 800 ms | TSA-GAT-003 |
| E-31 | `GET /access/events?gateId=&from=&to=` | Access-log query (masked) | R-11, R-13, R-19 | — | 2 s | FR-ACC-007 |
| E-32 | `GET/POST /blacklist`, `POST /blacklist/{id}/approval`, `POST /blacklist/{id}/removal` | Blacklist maker-checker | R-12, R-13 | Yes | 500 ms | §27.2 `/blacklist` |
| E-33 | `GET/POST/PATCH /zones`, `/gates`, `/devices`, `/zone-permissions` | Admin with four-eyes on production change | R-10 (+ R-13) | Yes | 500 ms | FR-ACC-005/006 |
| E-34 | `GET /edge/revocations?since=` | Revocation delta feed (ordered sequence) | edge mTLS | — | 300 ms | TSA-CRD-006 |
| E-35 | `GET /edge/snapshots/{type}?since=` | Entitlements, blacklist, gallery, policy, keys (signed snapshots) | edge mTLS | — | 1 s | §3.1 |
| E-36 | `POST /edge/access-events:batch` | Ordered replay; dedupe on `(deviceId, scanId)` | edge mTLS | `edgeNodeId` + `edgeSeq` | 2 s / 1,000 | §28.2 |
| E-37 | `POST /box-office/shifts`, `POST /box-office/shifts/{id}/drawers/{drawerId}/counts`, `POST /box-office/shifts/{id}/close` | Shift, float, drawer count, variance sign-off | R-06, R-07 | Yes | 500 ms | TSA-BOX-002 |
| E-38 | `POST /reconciliation/batches`, `GET /reconciliation/batches/{id}`, `POST /reconciliation/items/{id}/resolution` | Daily batch / exceptions | R-14, R-15, scheduler | Yes | async | FR-TCK-010 |
| E-39 | `GET /finance/vouchers?businessDate=` | Journal vouchers for ERP pull (or push via INT-ERP) | svc ERP; R-14 | — | 2 s | FR-TCK-010; §28.1 ERP |
| E-40 | `GET /tax-documents/{id}`, `POST /tax-documents/{id}/credit-notes` | Mushak-6.3 retrieve / credit note `[LEGAL-VERIFY]` | own; R-15 | POST yes | 800 ms | FR-FIN-002 |
| E-41 | `GET /dashboards/kpi?dashboard=revenue\|security\|executive` | KPI feed to CCC | svc CCC | — | 500 ms | §27.2 `/dashboards/kpi` |
| E-42 | `POST /incidents` (outbound call to the Incident module), `POST /incidents/{id}/escalate` | Create / escalate an access incident | system (svc) | Yes | 1 s | §27.2; UC-SEC-01 |
| E-43 | `GET /visitors/{id}/notifications`, `POST /notifications/delivery-receipts/{provider}` | Visitor inbox / SMS–email delivery callbacks | own; provider signature | Provider ID | 300 ms | §28.1 |
| E-44 | `GET /audit-events?objectType=&from=&to=` | Audit query (role-scoped) | R-19 and scoped readers | — | 2 s | §33.5 |
| E-45 | `POST /webhooks/subscribe`, `DELETE /webhooks/subscriptions/{id}` | Subscribe to TSA events | svc | Yes | 500 ms | §27.2 |
| E-46 | `GET /visitors/{id}/transactions` | Consolidated ledger (TSA + F&B) | own; svc F&B (read-own-orders scope) | — | 500 ms | FR-FNB-005 |
| E-47 | `POST /visitors/{id}/transactions` | F&B ledger leg append (deduplicated on source_ref) | svc F&B | Yes | 500 ms | FR-FNB-005 |

## 7.5 Verification aliases

`POST /tickets/{id}/checkin` and `POST /access/verify` SHALL map to the same handler as `POST /access/verifications`. They are documented with `x-alias-of: verifyAccess`, and share rate limits, idempotency, audit and SLO.

For `/tickets/{id}/checkin`:
- The server resolves `{id}` to the ticket's ACTIVE credential.
- If the body also carries `credentialToken`, both must resolve to the same credential. Otherwise the server returns `200 DENY` with `CREDENTIAL_INVALID`, so the gate stays closed and no oracle is exposed.

## 7.6 Schemas (JSON Schema 2020-12) and examples

### 7.6.1 CreateVisitor

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://api.sscos.example/schemas/v1/CreateVisitorRequest.json",
  "type": "object",
  "required": ["fullName", "dateOfBirth", "identityDocument", "mobile", "email", "preferredLanguage", "consents", "otpSessionId"],
  "properties": {
    "fullName": { "type": "string", "minLength": 2, "maxLength": 200 },
    "fullNameBn": { "type": "string", "maxLength": 200 },
    "dateOfBirth": { "type": "string", "format": "date" },
    "identityDocument": {
      "type": "object",
      "required": ["type", "number"],
      "properties": {
        "type": { "enum": ["NID", "PASSPORT", "BIRTH_REGISTRATION"] },
        "number": { "type": "string", "minLength": 6, "maxLength": 20, "pattern": "^[A-Z0-9]+$" },
        "country": { "type": "string", "pattern": "^[A-Z]{2}$", "default": "BD" }
      },
      "additionalProperties": false
    },
    "mobile": { "type": "string", "pattern": "^\\+[1-9][0-9]{7,14}$" },
    "email": { "type": "string", "format": "email", "maxLength": 254 },
    "preferredLanguage": { "enum": ["bn-BD", "en"] },
    "otpSessionId": { "type": "string", "minLength": 1 },
    "consents": {
      "type": "array",
      "minItems": 1,
      "items": {
        "type": "object",
        "required": ["purpose", "noticeVersion", "accepted"],
        "properties": {
          "purpose": { "enum": ["TERMS", "PRIVACY_NOTICE", "MARKETING", "BIOMETRIC_ENTRY", "ANALYTICS"] },
          "noticeVersion": { "type": "string", "minLength": 1 },
          "accepted": { "type": "boolean" }
        },
        "additionalProperties": false
      }
    },
    "guardian": {
      "type": "object",
      "description": "Required when the subject is a minor (age < 18 [LEGAL-VERIFY]); validated server-side from dateOfBirth.",
      "required": ["guardianVisitorId", "relationship", "guardianConsentAccepted"],
      "properties": {
        "guardianVisitorId": { "type": "string", "format": "uuid" },
        "relationship": { "enum": ["PARENT", "LEGAL_GUARDIAN"] },
        "guardianConsentAccepted": { "const": true }
      },
      "additionalProperties": false
    }
  },
  "additionalProperties": false
}
```

The NID pattern (10 or 17 digits) is enforced semantically, giving `422` with pointer `/identityDocument/number`. `TERMS` and `PRIVACY_NOTICE` must be `accepted: true`. Every other purpose MAY be `false`, and that answer is recorded.

Example request:

```json
{
  "fullName": "Rahim Uddin",
  "fullNameBn": "রহিম উদ্দিন",
  "dateOfBirth": "1994-03-12",
  "identityDocument": { "type": "NID", "number": "1234567890" },
  "mobile": "+8801711000000",
  "email": "rahim@example.com",
  "preferredLanguage": "bn-BD",
  "otpSessionId": "otp_7f2c",
  "consents": [
    { "purpose": "TERMS", "noticeVersion": "2026-10", "accepted": true },
    { "purpose": "PRIVACY_NOTICE", "noticeVersion": "2026-10", "accepted": true },
    { "purpose": "MARKETING", "noticeVersion": "2026-10", "accepted": false },
    { "purpose": "BIOMETRIC_ENTRY", "noticeVersion": "2026-10", "accepted": true }
  ]
}
```

Response `201`. Identity data is always masked:

```json
{
  "id": "0192f3a4-5b6c-7d8e-9f00-112233445566",
  "fullName": "Rahim Uddin",
  "identityDocument": { "type": "NID", "numberMasked": "******7890" },
  "mobileMasked": "+880171****000",
  "emailMasked": "r***@example.com",
  "status": "ACTIVE",
  "faceEnrolment": { "eligible": true, "status": "NOT_ENROLLED" }
}
```

Duplicates return the **same** `201`-shaped acknowledgement with `status: "PENDING_REVIEW"` and the same timing. Existence is never disclosed (TC-REG-02).

### 7.6.2 CreateBooking

The subject comes from the token, so the request has **no** `visitorId`. It also has no price fields (TSA-INV-010).

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://api.sscos.example/schemas/v1/CreateBookingRequest.json",
  "type": "object",
  "required": ["channel", "items"],
  "properties": {
    "channel": { "enum": ["APP", "WEB", "KIOSK", "BOX_OFFICE", "CORPORATE"] },
    "corporateAccountId": { "type": "string", "format": "uuid" },
    "waitingRoomToken": { "type": "string", "minLength": 1, "maxLength": 1024 },
    "promoCode": { "type": "string", "pattern": "^[A-Z0-9-]{4,20}$" },
    "items": {
      "type": "array",
      "minItems": 1,
      "maxItems": 20,
      "items": {
        "type": "object",
        "required": ["productId", "quantity"],
        "properties": {
          "productId": { "type": "string", "format": "uuid" },
          "slotId": { "type": "string", "format": "uuid" },
          "seatIds": { "type": "array", "items": { "type": "string", "format": "uuid" }, "maxItems": 20, "uniqueItems": true },
          "quantity": { "type": "integer", "minimum": 1, "maximum": 20 },
          "attendees": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "visitorId": { "type": "string", "format": "uuid" },
                "namePlaceholder": { "type": "string", "maxLength": 200 }
              },
              "additionalProperties": false
            }
          }
        },
        "additionalProperties": false
      }
    }
  },
  "additionalProperties": false
}
```

Server rules:
- `corporateAccountId` is accepted only if the token holds R-04 for that account.
- If `seatIds` is present, its length must equal `quantity`.
- If `attendees` is present, it must have ≤ `quantity` entries. The remainder are named later, up to the cut-off.

Example request:

```json
{ "channel": "APP", "items": [ { "productId": "0192…a1", "slotId": "0192…b2", "quantity": 2 } ], "promoCode": "EARLY10" }
```

Response `201`:

```json
{
  "id": "0192…c3",
  "status": "HOLD",
  "holdExpiresAt": "2026-10-11T10:10:00Z",
  "items": [ { "productId": "0192…a1", "slotId": "0192…b2", "quantity": 2, "unitAmount": "1000.00" } ],
  "totals": { "subtotal": "2000.00", "discount": "200.00", "tax": "270.00", "total": "2070.00", "currency": "BDT" }
}
```

The totals show the arithmetic: 2,000 − 200 = 1,800; tax 15 % of 1,800 = 270; 1,800 + 270 = 2,070. This is an **illustration only**: the tax code and rate come from TAX_CODE `[LEGAL-VERIFY: 15 % standard; sports organiser rate]`.

Errors: `409 SLOT_UNAVAILABLE`, `409 CAPACITY_EXCEEDED`, `403 WAITING_ROOM_REQUIRED`, `422 VALIDATION_ERROR`.

### 7.6.3 CreatePayment

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://api.sscos.example/schemas/v1/CreatePaymentRequest.json",
  "type": "object",
  "required": ["payableType", "payableId", "provider", "method", "interaction"],
  "properties": {
    "payableType": { "enum": ["BOOKING", "MEMBERSHIP", "FNB_ORDER"] },
    "payableId": { "type": "string", "minLength": 1 },
    "provider": { "type": "string", "description": "Connector code, e.g. AGGREGATOR_1, BKASH, NAGAD, ROCKET, POS, CASH" },
    "method": { "enum": ["CARD", "MFS", "INTERNET_BANKING", "SAVED_INSTRUMENT", "CARD_PRESENT", "CASH"] },
    "instrumentId": { "type": "string", "format": "uuid" },
    "interaction": { "enum": ["REDIRECT", "SDK", "TERMINAL", "CASH_DRAWER"] },
    "returnUri": { "type": "string", "format": "uri" },
    "saveInstrument": { "type": "boolean", "default": false }
  },
  "allOf": [
    { "if": { "properties": { "interaction": { "const": "REDIRECT" } } }, "then": { "required": ["returnUri"] } },
    { "if": { "properties": { "method": { "const": "SAVED_INSTRUMENT" } } }, "then": { "required": ["instrumentId"] } },
    { "if": { "properties": { "method": { "const": "CASH" } } }, "then": { "properties": { "interaction": { "const": "CASH_DRAWER" } } } }
  ],
  "additionalProperties": false
}
```

Server rules:
- `returnUri` must match the client's registered redirect allow-list.
- The amount is always the server-side payable total.

Response `201`:

```json
{ "paymentId": "0192…d4", "status": "INITIATED", "action": { "type": "REDIRECT", "url": "https://sandbox.provider.example/…" }, "expiresAt": "2026-10-11T10:10:00Z" }
```

The return page SHALL poll `GET /payments/{id}` and SHALL NOT trust query parameters (TC-PAY-02).

### 7.6.4 VerifyAccess (authoritative)

The zone is **derived server-side** from `gateId`. A client-supplied zone is not accepted.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://api.sscos.example/schemas/v1/VerifyAccessRequest.json",
  "title": "VerifyAccessRequest",
  "type": "object",
  "required": ["gateId", "deviceId", "scanId", "direction", "presentedAt", "method"],
  "properties": {
    "gateId": { "type": "string", "format": "uuid" },
    "deviceId": { "type": "string", "format": "uuid" },
    "scanId": { "type": "string", "minLength": 8, "maxLength": 64 },
    "direction": { "enum": ["IN", "OUT"] },
    "presentedAt": { "type": "string", "format": "date-time" },
    "method": { "enum": ["QR", "RFID", "NFC", "FACE"] },
    "credentialToken": { "type": "string", "minLength": 1, "maxLength": 1024 },
    "faceProbeReference": { "type": "string", "minLength": 1, "maxLength": 128 },
    "edgeMode": { "enum": ["ONLINE", "OFFLINE_CONTROLLED_REPLAY"], "default": "ONLINE" }
  },
  "oneOf": [
    {
      "required": ["credentialToken"],
      "properties": { "credentialToken": { "type": "string", "minLength": 1 }, "method": { "enum": ["QR", "RFID", "NFC"] } },
      "not": { "required": ["faceProbeReference"] }
    },
    {
      "required": ["faceProbeReference"],
      "properties": { "faceProbeReference": { "type": "string", "minLength": 1 }, "method": { "const": "FACE" } },
      "not": { "required": ["credentialToken"] }
    }
  ],
  "additionalProperties": false
}
```

Notes:
- Because both token properties are typed `string`, `null` fails validation (`422`). Empty strings fail `minLength`.
- The mTLS certificate must belong to `deviceId`, and `deviceId` must belong to `gateId`. Otherwise the server returns `401 UNAUTHENTICATED` (TC-API-02).

Example request:

```json
{ "gateId": "0192…g1", "deviceId": "0192…r7", "scanId": "scn-20261011-000123", "direction": "IN", "presentedAt": "2026-10-11T17:01:02.120Z", "method": "QR", "credentialToken": "v1.k3.eyJ…" }
```

### 7.6.5 Decision response (always 200 for a decision)

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://api.sscos.example/schemas/v1/AccessDecision.json",
  "type": "object",
  "required": ["decision", "reasonCode", "gateCommand", "decisionId", "latencyMs", "policyVersion", "evaluatedAt", "displayMessage"],
  "properties": {
    "decision": { "enum": ["ALLOW", "DENY"] },
    "reasonCode": {
      "enum": ["OK", "CREDENTIAL_INVALID", "CREDENTIAL_REPLAYED", "CREDENTIAL_REVOKED", "CREDENTIAL_SUSPENDED", "OUTSIDE_VALIDITY", "SLOT_MISMATCH", "ZONE_NOT_PERMITTED", "BLACKLISTED", "REENTRY_EXCEEDED", "CAPACITY_REACHED", "FACE_NO_MATCH", "RESTRICTED_MODE", "POLICY_ERROR", "OVERRIDDEN_ALLOW"]
    },
    "gateCommand": { "enum": ["OPEN", "HOLD_CLOSED", "OPEN_EXIT_ONLY"] },
    "decisionId": { "type": "string", "format": "uuid" },
    "latencyMs": { "type": "integer", "minimum": 0 },
    "policyVersion": { "type": "string" },
    "evaluatedAt": { "type": "string", "format": "date-time" },
    "displayMessage": {
      "type": "object",
      "required": ["bn", "en"],
      "properties": { "bn": { "type": "string" }, "en": { "type": "string" } },
      "description": "Generic; BLACKLISTED is shown as 'Please see staff'."
    },
    "operatorHint": { "type": "string", "description": "Masked; operator consoles only." },
    "alertId": { "type": "string", "format": "uuid" }
  },
  "additionalProperties": false
}
```

Example DENY (`200`):

```json
{ "decision": "DENY", "reasonCode": "ZONE_NOT_PERMITTED", "gateCommand": "HOLD_CLOSED", "decisionId": "0192…e5", "latencyMs": 212, "policyVersion": "zp-2026-10-03", "evaluatedAt": "2026-10-11T17:01:02.332Z", "displayMessage": { "bn": "অনুগ্রহ করে হেল্প ডেস্কে যোগাযোগ করুন", "en": "Please visit the help desk" } }
```

`POLICY_ERROR` (exception or timeout in the policy engine) always yields DENY / HOLD_CLOSED. Egress is hardware fail-safe (OWASP A10, TC-SEC-06).

### 7.6.6 Refund and override

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://api.sscos.example/schemas/v1/RefundRequest.json",
  "type": "object",
  "required": ["paymentId", "amount", "reasonCode"],
  "properties": {
    "paymentId": { "type": "string", "format": "uuid" },
    "ticketIds": { "type": "array", "items": { "type": "string", "format": "uuid" } },
    "amount": { "type": "string", "pattern": "^[0-9]{1,12}\\.[0-9]{2}$" },
    "reasonCode": { "enum": ["EVENT_CANCELLED", "CUSTOMER_REQUEST_POLICY", "DUPLICATE_CHARGE", "LATE_CAPTURE", "SERVICE_FAILURE", "OTHER"] },
    "reasonText": { "type": "string", "maxLength": 500 }
  },
  "if": { "properties": { "reasonCode": { "const": "OTHER" } } },
  "then": { "required": ["reasonText"] },
  "additionalProperties": false
}
```

The server enforces amount ≤ captured − refunded. The currency comes from the payment.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://api.sscos.example/schemas/v1/OverrideRequest.json",
  "type": "object",
  "required": ["decisionId", "newDecision", "reasonCode", "justification", "stepUpToken"],
  "properties": {
    "decisionId": { "type": "string", "format": "uuid" },
    "newDecision": { "enum": ["ALLOW", "DENY"] },
    "reasonCode": { "enum": ["VIP_UNREGISTERED_ZONE", "DEVICE_FAULT", "MEDICAL", "STAFF_ESCORT", "SECURITY_HOLD", "OTHER"] },
    "justification": { "type": "string", "minLength": 10, "maxLength": 1000 },
    "stepUpToken": { "type": "string", "minLength": 1 },
    "supervisorApprovalId": { "type": "string", "format": "uuid" }
  },
  "additionalProperties": false
}
```

If the original reason was `BLACKLISTED`, `supervisorApprovalId` from an R-13 SOC Manager is required. Otherwise the server returns `403 FORBIDDEN` (SOD-05).

### 7.6.7 Problem

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://api.sscos.example/schemas/v1/Problem.json",
  "type": "object",
  "required": ["type", "title", "status", "code", "correlationId"],
  "properties": {
    "type": { "type": "string", "format": "uri" },
    "title": { "type": "string" },
    "status": { "type": "integer", "minimum": 400, "maximum": 599 },
    "detail": { "type": "string" },
    "code": { "enum": ["VALIDATION_ERROR", "UNAUTHENTICATED", "FORBIDDEN", "NOT_FOUND", "SLOT_UNAVAILABLE", "CAPACITY_EXCEEDED", "IDEMPOTENCY_CONFLICT", "INVALID_STATE_TRANSITION", "BOOKING_EXPIRED", "PAYMENT_DECLINED", "WAITING_ROOM_REQUIRED", "RATE_LIMITED", "PROVIDER_UNAVAILABLE", "INTEGRATION_TIMEOUT"] },
    "correlationId": { "type": "string" },
    "errors": { "type": "array", "items": { "type": "object", "required": ["pointer", "code"], "properties": { "pointer": { "type": "string" }, "code": { "type": "string" }, "message": { "type": "string" } } } }
  }
}
```

## 7.7 Webhooks and events

**Inbound (providers):**
- The raw body signature is verified per the provider spec `[VENDOR-DOC-REQUIRED]`.
- The timestamp must be within ±5 min.
- The event is stored in PROVIDER_EVENT before acknowledgement, then processed asynchronously.
- Unsigned or invalid events → `401` + security alert (TC-PAY-01).

**Outbound (subscribers):**
- The envelope is CloudEvents-compatible: `{ id, type, time, source: "tsa", subject, dataschema, data }` [VERIFY-VERSION].
- Each event is signed with `HMAC-SHA256` (`Signature` header with a timestamp) or JWS detached (per subscriber).
- Delivery is at least once with exponential retry for 24 h; consumers dedupe on `id`.
- Payloads carry no PII; persons are identified by `subjectRef`.

| Event | Consumers |
|---|---|
| `booking.confirmed`, `booking.cancelled`, `booking.expired` | Notifications, CCC, BI, Parking (roadmap FR-PRK-003) |
| `payment.captured`, `payment.refunded`, `payment.late_capture` | Finance ERP, BI, F&B (own orders) |
| `credential.issued` / `.suspended` / `.revoked` | Edge, RFID/NFC lifecycle (§28.1) |
| `access.decision` | CCC occupancy, BI |
| `access.alert.raised` | SOC, Incident module (`POST /incidents`) |
| `access.override.recorded` | SOC, audit |
| `reconciliation.batch.completed` | Finance |
| `visitor.deleted`, `consent.withdrawn` | All subscribers (deletion propagation) |
| `membership.state_changed` | CCC, BI, Notifications |
