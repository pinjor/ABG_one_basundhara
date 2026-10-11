# 2. Feature catalogue

Every row uses a stable ID, a normative keyword, a classification label and a source, and links to tests in §13.

**Actor codes** (roles defined in §4):

| Code | Role | Code | Role |
|---|---|---|---|
| VIS | Visitor | MEM | Member |
| GRD | Guardian | CBK | Corporate Booker |
| SPU | Sponsor User | BOC | Box-Office Cashier |
| BOS | Box-Office Supervisor | TAD | Ticket Administrator |
| INV | Inventory Manager | ACA | Access Administrator |
| SOP | Security Operator | SAD | Security Administrator |
| SOM | SOC Manager | FAN | Finance Analyst |
| FCO | Finance Controller | CSA | Customer Support Agent |
| PRV | Privacy Officer / CDO | SYS | System Administrator |
| AUD | Auditor | EXE | Executive (CCC-owned dashboard viewer, §4.1) |

## 2.1 Identity, registration and consent (B5.1)

| ID | Requirement | Class | Source | Actors | Rules / validation | Tests |
|---|---|---|---|---|---|---|
| TSA-IDN-001 | The system SHALL allow registration via Web, iOS, Android and Kiosk, and assisted registration at the help desk or box office. | SRS-MUST | FR-TCK-001 | VIS, BOC, CSA | Same validation on every channel; assisted channel records the staff ID. | TC-REG-01, TC-KSK-01 |
| TSA-IDN-002 | Registration SHALL capture: full name (2–200 chars, Bengali and Latin Unicode, NFC-normalised); DOB (valid date, not in the future); identity document (type NID / PASSPORT / BIRTH_REGISTRATION for minors `[LEGAL-VERIFY: acceptable document types for minors]`, plus number); mobile (E.164); email (RFC 5322 addr-spec, validated); preferred language (`bn-BD` / `en`); consents. | SRS-MUST | FR-TCK-001 | VIS | Each field failure → `422 VALIDATION_ERROR` with JSON pointer. NID syntax 10 or 17 digits; passport ICAO 9303 field rules; the document number is envelope-encrypted with a keyed blind index (§5). | TC-REG-01 |
| TSA-IDN-003 | The system SHALL verify mobile by OTP and email by link or OTP before the first purchase. | DERIVED-MANDATORY | Parent FR-TCK-001; rationale: contactability and account-takeover defence (§33.5) | VIS | OTP 6 digits, TTL 5 min, 5 attempts, resend cool-down 60 s, per-number and per-device rate limit. | TC-REG-04 |
| TSA-IDN-004 | A single visitor master SHALL be kept. Duplicates SHALL be detected deterministically (blind-indexed document, mobile, email) and probabilistically (normalised name + DOB). Responses SHALL be neutral and SHALL NOT reveal whether an identity exists. | SRS-SHALL | §29.2 single master record; de-duplication matching | VIS, CSA, PRV | Merge by a raiser (CSA) and an approver (PRV); merge history kept. | TC-REG-02 |
| TSA-IDN-005 | Minors (< 18 `[LEGAL-VERIFY: PDPA 2026 child definition]`) SHALL require a GUARDIAN_LINK and recorded guardian consent. Face enrolment SHALL be off by default for minors. | DERIVED-MANDATORY | Parent §29.3 consent; PDPA 2026 children's data (B4) | GRD, BOC | Guardian must be an adult verified visitor. | TC-REG-03 |
| TSA-IDN-006 | CONSENT records SHALL capture purpose, notice version, lawful basis, channel, language, accepted (true/false), granted_at and withdrawn_at. Consent SHALL be enforced at the query layer. | SRS-SHALL | §29.3 "Consent capture and withdrawal … recorded and enforced at the query layer"; §26.1 | VIS, PRV | `accepted:false` is a valid recorded answer. Marketing is unbundled from Terms. Withdrawal is effective ≤ 5 min across services. | TC-CNS-01 |
| TSA-IDN-007 | Profile & Privacy SHALL let a visitor view and edit data, see consent history, withdraw consent and start data-subject requests (access, correction, removal, portability, information). | DERIVED-MANDATORY | Parent §26.1 Profile & Settings "privacy controls"; PDPA 2026 rights (B4) | VIS, PRV | DSR identity verification; deadlines `[LEGAL-VERIFY]`. | TC-DSR-01 |
| TSA-IDN-008 | Withdrawal of biometric consent SHALL disable FACE for that subject, purge the template, and write a DELETION_LEDGER entry. | SRS-SHALL | §29.3 | VIS, PRV | Edge galleries purged ≤ 15 min while online. | TC-BIO-03 |
| TSA-IDN-009 | Employees, vendor staff, players and coaches SHALL NOT self-register. They SHALL be ACCESS_SUBJECTs referencing HRM, Vendor or Sports masters. | SRS-MUST-INTERFACE | §29.2; FR-ACC-006; FR-HRM-001 | — | Joiner / mover / leaver within SLA (TSA-ZON-004). | TC-STF-01 |
| TSA-IDN-010 | Visitor sign-in SHALL use OIDC Authorization Code + PKCE with OTP or passkeys. No implicit flow. | DERIVED-MANDATORY | Parent §27.1 OAuth 2.0/OIDC | VIS | Tokens per §7.1. | TC-SEC-02 |

## 2.2 Face enrolment and biometrics (B5.2)

| ID | Requirement | Class | Source | Actors | Rules / validation | Tests |
|---|---|---|---|---|---|---|
| TSA-BIO-001 | The system SHALL support face enrolment in the app (remote, with liveness / PAD per ISO/IEC 30107-3), at kiosks, at the help desk and at the point of ticket issuance. It SHALL support optional additional biometric capture where hardware exists. | SRS-MUST | FR-TCK-002; §26.1 face enrolment | VIS, BOC, CSA | Enrolment only after explicit biometric CONSENT. | TC-BIO-01 |
| TSA-BIO-002 | Enrolment SHALL apply quality checks and de-duplication against the enrolled population. | DERIVED-MANDATORY | Parent FR-ACC-001; rationale: one subject per template prevents credential sharing | — | Duplicate face → staff review queue, not automatic merge. | TC-BIO-01 |
| TSA-BIO-003 | Templates SHALL be non-reversible and stored in a separate biometric vault, referenced by surrogate ID (BIOMETRIC_PROFILE). Raw images SHALL be transient unless an approved purpose requires retention. | SRS-SHALL | §29.3 | — | No raw images in TSA databases, logs or backups. | TC-BIO-03 |
| TSA-BIO-004 | Face SHALL be opt-in ("express lane"). Refusing face SHALL NOT block purchase or entry. A non-biometric lane SHALL exist at every gate cluster. | DERIVED-MANDATORY | Parent A-10; PDPA 2026 explicit consent for sensitive data (B4) | VIS | Same price and service either way. | TC-BIO-02 |
| TSA-BIO-005 | Match thresholds SHALL be governed centrally (SYS + SAD, four-eyes) and SHALL NOT be editable by gate operators. KPI: FRR ≤ 1 %, FAR ≤ 0.1 % (§30.1). | SRS-SHALL | §30.1 | SAD | Threshold change audited (AUDIT_EVENT). | TC-BIO-04 |
| TSA-BIO-006 | Demographic performance testing on a representative Bangladeshi population (ISO/IEC 19795-10) SHALL complete before go-live. Vendor NIST FRTE results SHALL be supplied. | DERIVED-MANDATORY | Parent §30.1 FRR/FAR; rationale: fairness and acceptance evidence | — | Disparity limits agreed at Design Acceptance. | TC-BIO-04 |

## 2.3 Catalogue and products (B5.3)

| ID | Requirement | Class | Source | Actors | Rules / validation | Tests |
|---|---|---|---|---|---|---|
| TSA-CAT-001 | TICKET_PRODUCT types SHALL include SPORT_TICKET (Football, Futsal, Padel, Cricket, Tennis, Swimming, Gym, Academy), FREE_PASS (Tourist Visit, Gallery Visit, Restaurant Access, Shopping Access), PREMIUM (VIP, VVIP, Corporate, Media), MEMBERSHIP (Annual, Family, Student, Corporate), SEASON_TICKET and EVENT_TICKET. | SRS-MUST | FR-TCK-003, FR-TCK-004, FR-TCK-005, FR-TCK-006; §26.3 season | TAD | — | TC-CAT-01, TC-E2E-01 |
| TSA-CAT-002 | Product fields SHALL include: code, name_bn, name_en, category, sport, facility/resource, inventory type, base price, currency, tax code, cost centre, GL mapping, sale window, entry-validity window, capacity, zone rules, re-entry policy, attendee identity requirement (NONE / NAME_ONLY / ID_DOCUMENT / FACE), purchase limits, minor rule, status. | DERIVED-MANDATORY | Parent FR-TCK-005 "distinct pricing and access rules"; FR-TCK-010 cost-centre posting | TAD | Price ≥ 0. Every product maps product → facility → sport → cost centre → GL account (validation at publish). | TC-CAT-01 |
| TSA-CAT-003 | Free passes SHALL be explicitly zero-value and SHALL never create revenue. | SRS-MUST | FR-TCK-004 | TAD | No payment step; no revenue journal; no VAT line `[LEGAL-VERIFY]`. | TC-CAT-02 |
| TSA-CAT-004 | Price, tax and access changes SHALL require an audit-logged confirmation step, and production price / GL / access changes SHALL require four-eyes approval. | SRS-SHALL | §26.6 | TAD, FCO, ACA | Published as a new PRICE_VERSION; bookings keep the version used. | TC-CAT-01 |

## 2.4 Inventory, availability and booking (B5.4)

| ID | Requirement | Class | Source | Actors | Rules / validation | Tests |
|---|---|---|---|---|---|---|
| TSA-INV-001 | Inventory types SHALL be RESERVED_SEAT (seat map with accessible / companion / obstructed flags), GA_POOL (capacity count) and TIMED_SLOT (exclusive court / ground / lane / session). | DERIVED-MANDATORY | Parent FR-SPT-001, FR-EVT-003 | INV | — | TC-INV-04 |
| TSA-INV-002 | Unit states SHALL be AVAILABLE, HELD, SOLD, KILLED(reason), ALLOCATED (corporate / sponsor / hold-back) and COMP. | DERIVED-MANDATORY | Parent FR-SPT-006 | INV | Transitions per §6.6. | TC-INV-04 |
| TSA-INV-003 | A real-time availability calendar SHALL show maintenance / blocked states. Availability at hold time SHALL be authoritative (never cache-only). | SRS-MUST | FR-SPT-001 | VIS | Discovery cache ≤ 5 s stale. | TC-INV-01 |
| TSA-INV-004 | Exclusive resources SHALL never be double-booked: atomic conditional update plus unique constraint; a race SHALL have exactly one winner. | SRS-MUST | FR-SPT-006 | — | §5.4 integrity rules. | TC-INV-01 |
| TSA-INV-005 | A checkout hold SHALL have a configurable server-authoritative TTL (default 10 min), an idempotent sweeper and a UI countdown. | DERIVED-MANDATORY | Parent UC-TCK-01 3a | VIS | — | TC-INV-02 |
| TSA-INV-006 | On payment failure, the slot SHALL be retained **10 minutes from the failure event** for retry (new expiry = failure_time + 10 min), under an absolute ceiling (default 30 min from hold creation). | SRS-SHALL | UC-TCK-01 3a "system retains slot hold for 10 minutes and prompts retry" | VIS | Failure at minute 9 → expiry at minute 19. | TC-INV-03 |
| TSA-INV-007 | Before expiring a hold that has a PENDING payment, the system SHALL query the provider and MAY extend the hold by a bounded grace period (default 3 min, once). | DERIVED-MANDATORY | Parent UC-TCK-01 3a; rationale: avoid releasing paid inventory | — | Grace counts toward the absolute ceiling. | TC-INV-05 |
| TSA-INV-008 | **Late capture** (captured after hold expiry): the system SHALL re-acquire the inventory if still free. Otherwise it SHALL auto-refund and create a LATE_CAPTURE_REFUND reconciliation item. | DERIVED-MANDATORY | Parent UC-TCK-01 3a; §28.1 refund API | — | — | TC-PAY-03, TC-PAY-04 |
| TSA-INV-009 | Group bookings SHALL support 1..N attendees per booking, with deferred attendee naming until a configurable cut-off, and **one TICKET and one CREDENTIAL per attendee**. | DERIVED-MANDATORY | Parent FR-TCK-007 | VIS, CBK | Default naming cut-off: 2 h before start. | TC-CRD-01, TC-ALC-01 |
| TSA-INV-010 | The server SHALL recompute all totals. Client-supplied prices / amounts SHALL never be trusted. | DERIVED-MANDATORY | Parent §33.1 OWASP; FR-TCK-010 | — | No price field exists in request schemas (§7.6). | TC-PAY-11 |

## 2.5 Memberships and season tickets (B5.5)

| ID | Requirement | Class | Source | Actors | Rules / validation | Tests |
|---|---|---|---|---|---|---|
| TSA-MEM-001 | The system SHALL support MEMBERSHIP_PLANs: Annual; Family (primary holder + linked MEMBERSHIP_MEMBERs, each with own credential); Student (eligibility proof); Corporate (account + named members, seat counts). | SRS-MUST | FR-TCK-006; FR-TCK-007 | MEM, CBK | Student proof reviewed, then purged (§5.5). | TC-MEM-01, TC-MEM-02 |
| TSA-MEM-002 | Lifecycle SHALL be PENDING → ACTIVE → GRACE → SUSPENDED → EXPIRED. Renewal SHALL extend entitlement only after successful payment or approved zero-value. | SRS-MUST | FR-TCK-006 | — | §6.5. | TC-MEM-01 |
| TSA-MEM-003 | Auto-billing SHALL use provider tokens (card tokens, bKash tokenised agreement `[VENDOR-DOC-REQUIRED]`) with dunning retries and notifications. No raw card data SHALL be stored. | SRS-MUST | FR-TCK-006 "renewal and auto-billing"; §33.1 PCI DSS | MEM, FCO | Mandate consent recorded; pre-debit notice `[LEGAL-VERIFY]`. | TC-MEM-01 |
| TSA-MEM-004 | The membership card SHALL be shown in the app. Kiosks and gates SHALL support membership / season check-in by face or QR. | SRS-SHALL | §26.1 My Tickets / Wallet; §26.3 Membership Check-in | MEM | — | TC-KSK-02 |
| TSA-MEM-005 | SEASON_ENTITLEMENT SHALL cover multiple events with per-event validity windows and a reserved seat per fixture. | SRS-SHALL | §1.3; §26.3 | MEM | — | TC-MEM-03 |
| TSA-MEM-006 | KPI: membership renewal ≥ 75 % (§30.2). | SRS-SHALL | §30.2 | FCO | KPI catalogue §9.6. | TC-DSH-01 |

## 2.6 Premium, corporate and sponsor allocations (B5.6)

| ID | Requirement | Class | Source | Actors | Rules / validation | Tests |
|---|---|---|---|---|---|---|
| TSA-ALC-001 | Premium categories SHALL be bound to specific zones / entrances / seats and time windows. | SRS-MUST | FR-TCK-005 | TAD, ACA | — | TC-GAT-04 |
| TSA-ALC-002 | The corporate lifecycle SHALL be: allocate pool → bulk-name attendees (CSV upload with row errors) → issue credentials → reclaim unassigned at cut-off → consumption report → invoice and AR posting. Bulk issuance SHALL be four-eyes. | SRS-SHALL | §26.2 Corporate Portal "bulk ticket allocation, invoicing"; FR-FIN-001 AR | CBK, TAD, FCO | — | TC-ALC-01 |
| TSA-ALC-003 | SPONSOR_ENTITLEMENT SHALL draw from an ALLOCATION_POOL per event. Issuance SHALL never exceed the pool, and consumption SHALL reconcile to the entitlement. | SRS-MUST | FR-EVT-003; US-13 | SPU, TAD | Conditional update guard (§5.4). | TC-ALC-02 |
| TSA-ALC-004 | The Corporate portal SHALL provide membership management, bulk allocation and invoicing. The Sponsor portal SHALL provide package / entitlement status. | SRS-SHALL | §26.2 | CBK, SPU | — | TC-ALC-01 |

## 2.7 Payments and checkout (B5.7)

| ID | Requirement | Class | Source | Actors | Rules / validation | Tests |
|---|---|---|---|---|---|---|
| TSA-PAY-001 | Channels SHALL include: online cards via a licensed aggregator; internet banking; MFS (bKash, Nagad, Rocket) direct or via aggregator; saved tokens; kiosk card / QR payment; box-office cash; and card-present POS. | SRS-SHALL | §28.1 Payment Gateways / Banking; UC-TCK-01 step 4 | VIS, BOC | Only licensed PSPs / PSOs (B4 `[LEGAL-VERIFY]`). | TC-PAY-05 … TC-PAY-10 |
| TSA-PAY-002 | Every provider connector SHALL implement: initiate; server-side validate / query; signed IPN / callback verification; search by provider transaction ID; refund; refund status; settlement-file ingestion. A pending-payment poller SHALL run. | SRS-SHALL | §28.1 "Payment initiation, callback/webhook confirmation, refund API, settlement file reconciliation" | — | Provider details `[VENDOR-DOC-REQUIRED]`. | TC-PAY-05 … TC-PAY-08 |
| TSA-PAY-003 | Checkout SHALL be hosted or tokenised so card data never touches SSCOS (PCI scope minimisation). A browser redirect SHALL never be treated as proof of payment. | SRS-SHALL | §33.1 PCI DSS | — | — | TC-PAY-02, TC-PAY-09 |
| TSA-PAY-004 | Duplicated, delayed or reordered callbacks SHALL have exactly-once business effect (idempotency + PROVIDER_EVENT dedupe on provider event ID). | SRS-SHALL | §27.3 Idempotency | — | — | TC-PAY-01 |
| TSA-PAY-005 | Checkout SHALL show the order summary, a promo code field and a receipt. | SRS-SHALL | §26.1 Payment & Checkout | VIS | — | TC-E2E-01 |
| TSA-PAY-006 | Card-not-present transactions SHALL use two-factor authentication via EMV 3-D Secure 2.x where the provider supports it. | DERIVED-MANDATORY | Parent §28.1; Bangladesh Bank CNP rule (B4) `[LEGAL-VERIFY]` | — | `[VENDOR-DOC-REQUIRED: aggregator 3DS version]` | TC-PAY-05 |
| TSA-PAY-007 | Provider licences SHALL be verified at contract, at go-live and annually. | DERIVED-MANDATORY | Parent PSS Act 2024 (B4) `[LEGAL-VERIFY]` | FCO | Evidence filed in the processor register. | TC-PAY-12 |
| TSA-PAY-008 | Shared payment orchestration, saved-instrument service and per-person TRANSACTION_LEDGER SHALL be exposed to Food & Beverage. Stored value is OUT-OF-SCOPE unless ABG confirms (A-13). | SRS-MUST-INTERFACE | FR-FNB-005 (Must); FR-FNB-006 (Must) | — | If stored value is confirmed: e-money / PSP licensing `[LEGAL-VERIFY]`. | TC-FNB-01 |
| TSA-PAY-009 | KPI: online booking conversion ≥ 60 % of started bookings (§30.2). | SRS-SHALL | §30.2 | — | §9.6. | TC-DSH-01 |

## 2.8 Refunds, reversals and chargebacks (B5.8)

| ID | Requirement | Class | Source | Actors | Rules / validation | Tests |
|---|---|---|---|---|---|---|
| TSA-RFD-001 | Operator-initiated refunds SHALL follow an approval workflow (§26.5 refund approval). | DERIVED-MANDATORY | Parent §26.5; §29.1 Refund; §28.1 refund API | CSA, TAD, FCO | Raiser ≠ approver; amount ≤ captured − refunded. | TC-RFD-01 |
| TSA-RFD-002 | Event or venue cancellation SHALL trigger a bulk refund with progress tracking and an exception queue. | DERIVED-MANDATORY | Parent §29.1 Refund | TAD, FCO | Provider rate limits `[VENDOR-DOC-REQUIRED]`. | TC-RFD-02 |
| TSA-RFD-003 | Chargebacks SHALL be ingested into CHARGEBACK. Linked credentials SHALL be suspended. | DERIVED-MANDATORY | Parent §28.1 settlement reconciliation | FCO | — | TC-RFD-03 |
| TSA-RFD-004 | Refunds SHALL go to the original instrument, within a configurable SLA (default ≤ 3 days `[LEGAL-VERIFY: Bangladesh Bank 2023 refund timeline]`). | DERIVED-MANDATORY | Parent B4 refund rules | — | — | TC-RFD-01 |
| TSA-RFD-005 | Refund side effects (single saga): credential revoked; inventory released if before the event; GL reversal; VAT credit note; customer notification; reconciliation item. | DERIVED-MANDATORY | Parent §26.5; FR-TCK-010 | — | — | TC-RFD-01 |
| TSA-RFD-006 | Customer self-service cancellation / transfer / resale SHALL be ROADMAP. | OUT-OF-SCOPE / ROADMAP | FR-TCK-008 (Should) | — | `TRANSFERRED` reserved. | — |

## 2.9 Promotions (minimal)

| ID | Requirement | Class | Source | Actors | Rules / validation | Tests |
|---|---|---|---|---|---|---|
| TSA-PRM-001 | PROMOTIONs SHALL support fixed-amount and percentage discounts with validity window, product scope, eligibility, total cap and per-identity cap. Every redemption SHALL be recorded in PROMOTION_REDEMPTION. | DERIVED-MANDATORY | Parent §26.1 promo code entry; §26.5 promo configuration; §29.1 Promotion | TAD, VIS | Server-side validation only; enumeration rate-limited; no stacking by default. | TC-PRM-01 |
| TSA-PRM-002 | Early-bird / off-peak / bundle / dynamic pricing SHALL be ROADMAP. | OUT-OF-SCOPE / ROADMAP | FR-TCK-009 (Should) | — | — | — |

## 2.10 Credentials (B5.9)

| ID | Requirement | Class | Source | Actors | Rules / validation | Tests |
|---|---|---|---|---|---|---|
| TSA-CRD-001 | One unique CREDENTIAL SHALL exist per ticket / attendee or membership member, with a **polymorphic owner** (exactly one of TICKET, MEMBERSHIP_MEMBER, SEASON_ENTITLEMENT, staff ACCESS_SUBJECT) and a configurable validity window. | SRS-MUST | FR-TCK-007 | — | DB CHECK "exactly one owner" (§5.4). | TC-CRD-01 |
| TSA-CRD-002 | Types SHALL be: ROTATING_QR (default in app); STATIC_QR (print / kiosk / box office; single use with hard anti-passback); NFC (Apple Wallet / Google Wallet passes where readers are certified; the Apple NFC entitlement lead time is on the critical path); RFID card. | SRS-MUST | FR-TCK-007; §28.1 RFID/NFC | — | — | TC-CRD-01, TC-CRD-04, TC-CRD-05 |
| TSA-CRD-003 | ROTATING_QR SHALL be an opaque per-entitlement token plus an RFC 6238 TOTP with a per-entitlement secret: period 5–30 s (default 15 s), ±1 step tolerance. | DERIVED-MANDATORY | Parent FR-TCK-007; rationale: screenshot replay defence | VIS | — | TC-CRD-02 |
| TSA-CRD-004 | Credentials SHALL carry signed claims (Ed25519 or ECDSA P-256) over {entitlement, event/slot, zone, validity, key_id}, with key rotation per season and on compromise. QR SHALL never contain NID, passport, name or biometric data. | DERIVED-MANDATORY | Parent FR-TCK-007; §33.3 | — | Signature verified offline at the edge. | TC-CRD-06 |
| TSA-CRD-005 | The encrypted ticket and TOTP secret SHALL be stored on the device so the credential renders with zero connectivity. A static fallback (SMS link or print) SHALL exist for feature phones. | DERIVED-MANDATORY | Parent §26.1 My Tickets / Wallet | VIS | — | TC-CRD-03, TC-CRD-07 |
| TSA-CRD-006 | Credential lifecycle (issue, suspend, revoke) SHALL be synced to RFID / NFC devices. | SRS-SHALL | §28.1 RFID / NFC | — | UID-only cards not accepted; cryptographic card authentication `[VENDOR-DOC-REQUIRED]`. | TC-CRD-05 |
| TSA-CRD-007 | Adding a WRISTBAND credential type SHALL need no schema change. | DERIVED-MANDATORY | Parent FR-TCK-011 (Roadmap) | — | Enum value only. | — |

## 2.11 Gate access decisions (B5.10)

| ID | Requirement | Class | Source | Actors | Rules / validation | Tests |
|---|---|---|---|---|---|---|
| TSA-GAT-001 | Gate configuration SHALL include allowed modalities (Face / QR / RFID / NFC), zone, direction, re-entry policy and offline risk class. | SRS-MUST | FR-ACC-005 | ACA | Audit-logged confirmation (§26.6). | TC-GAT-01 |
| TSA-GAT-002 | ALLOW SHALL require all of: valid credential / identity, within the entitlement time window, zone permission (deny by default), blacklist / watch-list clear, re-entry / anti-passback policy satisfied, and not revoked. | SRS-MUST | UC-TCK-01 step 7; FR-ACC-002; FR-ACC-006 | — | First failing check sets the reason code (§7.6.5). | TC-GAT-02, TC-GAT-04, TC-BLK-01 |
| TSA-GAT-003 | Re-entry policies SHALL be NONE, UNLIMITED_SAME_DAY, N_REENTRIES and TIMED. Anti-passback SHALL be hard online; offline it SHALL be hard or soft by risk class, reconciled on reconnect. A supervisor "un-scan" SHALL require a reason and be audited. | DERIVED-MANDATORY | Parent FR-ACC-006; FR-ACC-007 | SOP | — | TC-GAT-06, TC-GAT-08 |
| TSA-GAT-004 | Face mode SHALL be 1:N against the event-scoped gallery of opted-in subjects with valid entitlements. On no-match, timeout or face latency > 1 s, the lane SHALL fall back in-lane to QR/NFC. A circuit breaker SHALL switch the cluster to credential-only mode and alert the command centre. A supervised manual ID check (including female staff for covered faces) SHALL exist. | DERIVED-MANDATORY | Parent FR-ACC-001; §3.1 ≤ 1.5 s | SOP | Breaker default: > 5 % face errors in 60 s. | TC-GAT-02, TC-GAT-03 |
| TSA-GAT-005 | Latency: P95 ≤ 1.5 s scan-to-release; blacklist decision + alert ≤ 1 s; average gate transaction ≤ 2 s (KPI). | SRS-SHALL | §3.1; §27.3; FR-ACC-002; §30.1 | — | Measurement §9.5. | TC-GAT-07 |
| TSA-GAT-006 | The visitor SHALL receive a generic denial message that never reveals blacklist status. Expired or mismatched visitors SHALL be directed to the help desk / AI concierge. | SRS-SHALL | UC-TCK-01 7b | VIS | bn/en display message. | TC-GAT-05 |
| TSA-GAT-007 | Gates, readers, controllers, kiosks and POS SHALL be registered DEVICEs with certificates. Verification requests SHALL be mTLS-authenticated, and the zone SHALL be derived server-side from the gate. | DERIVED-MANDATORY | Parent §33.4 hardened devices; §27.1 | ACA | Device cert ↔ `deviceId` mismatch → 401. | TC-API-02, TC-SEC-02 |

## 2.12 Blacklist and watch-list (B5.11)

| ID | Requirement | Class | Source | Actors | Rules / validation | Tests |
|---|---|---|---|---|---|---|
| TSA-BLK-001 | Every access attempt SHALL be checked against the blacklist / watch-list, and matches denied / flagged within 1 s. | SRS-MUST | FR-ACC-002 | — | Edge-local snapshot. | TC-BLK-01 |
| TSA-BLK-002 | Subjects SHALL include registered persons and **unregistered watch-list faces** (ACCESS_SUBJECT type WATCHLIST_UNKNOWN, no visitor FK). | SRS-MUST | FR-ACC-002; UC-SEC-01 trigger | SAD | Lawful basis recorded `[LEGAL-VERIFY]`. | TC-BLK-02 |
| TSA-BLK-003 | BLACKLIST_ENTRY fields SHALL include: reason, severity, source / reference, effective from / until, created by, approval. | SRS-SHALL | §26.5 blacklist management | SAD | — | TC-BLK-03 |
| TSA-BLK-004 | A match SHALL deny and raise a SOC alert with gate, zone, camera reference and snapshot reference. BLACKLIST_MATCH_LOG SHALL record it. | SRS-MUST-INTERFACE | UC-SEC-01 step 5; FR-SOC-005 | SOP, SOM | — | TC-SOC-01 |
| TSA-BLK-005 | Blacklist management SHALL be restricted to Security roles with MFA, fully audited, and four-eyes for creation and removal. | SRS-SHALL | §26.5; §33.2 | SAD, SOM | — | TC-BLK-03 |

## 2.13 Zone permissions and non-visitor subjects (B5.12)

| ID | Requirement | Class | Source | Actors | Rules / validation | Tests |
|---|---|---|---|---|---|---|
| TSA-ZON-001 | ACCESS_SUBJECT types SHALL be VISITOR, MEMBER, SEASON_HOLDER, EMPLOYEE (HRM ref), PLAYER, COACH, VENDOR_STAFF (vendor master ref), VIP_GUEST, MEDIA and WATCHLIST_UNKNOWN. | SRS-MUST | FR-ACC-006 | ACA | — | TC-GAT-04 |
| TSA-ZON-002 | ZONE_PERMISSION rules SHALL combine subject role, ticket / membership category, schedule and modality, with deny by default. | SRS-MUST | FR-ACC-006 | ACA | Four-eyes on production change. | TC-GAT-04 |
| TSA-ZON-003 | Players and coaches SHALL come from Sports module rosters (FR-SPT-002/003). Employees SHALL come from HRM. Vendor staff SHALL come from the Vendor master. | SRS-MUST-INTERFACE | §29.2; FR-ACC-006 | — | — | TC-STF-01 |
| TSA-ZON-004 | HRM joiner / mover / leaver events SHALL change or revoke access within SLA (default: leaver ≤ 15 min central; ≤ 60 s to online edges). | DERIVED-MANDATORY | Parent FR-ACC-006; §33.2 least privilege | — | — | TC-STF-01 |

## 2.14 Access log, override and SOC interface (B5.13)

| ID | Requirement | Class | Source | Actors | Rules / validation | Tests |
|---|---|---|---|---|---|---|
| TSA-LOG-001 | Every grant / deny SHALL log: decision ID, scan ID, subject ref, credential ref, gate, zone snapshot, method, direction, result, reason code, latency, override ref and timestamps. Retention SHALL be ≥ 12 months, then pseudonymise / purge. The log SHALL be tamper-evident. | SRS-MUST | FR-ACC-007; §29.3; §33.5 | — | — | TC-LOG-01, TC-SEC-04 |
| TSA-OVR-001 | Manual override SHALL record operator identity, reason code + mandatory justification and step-up; the original decision SHALL be preserved. Overriding a BLACKLISTED denial SHALL need SOC Manager approval. | SRS-MUST | FR-ACC-008 | SOP, SOM | — | TC-OVR-01, TC-OVR-02 |
| TSA-OVR-002 | For a VIP without zone access, the system SHALL prompt SOC for override. | SRS-SHALL | UC-SEC-01 4a | SOP | — | TC-OVR-03 |
| TSA-SOC-001 | The outbound SOC alert contract SHALL carry: alert ID, type, gate, zone, camera reference, subject ref (role-masked), timestamp. It SHALL support incident creation (`POST /incidents`). | SRS-MUST-INTERFACE | UC-SEC-01 5–7; FR-SOC-005; §27.2 `/incidents` | SOM | — | TC-SOC-01 |
| TSA-SOC-002 | If no field team acknowledges within SLA (default 3 min, aligned to §30.1 dispatch ≤ 3 min), the system SHALL escalate to the duty manager via `POST /incidents/{id}/escalate`. | SRS-MUST-INTERFACE | UC-SEC-01 6a; §27.2 | SOM | — | TC-SOC-02 |
| TSA-SOC-003 | Direction SHALL be mandatory on entry / exit events, which SHALL feed real-time occupancy to dashboards. | SRS-MUST-INTERFACE | FR-CCC-004 | — | Bi-directional lanes without a direction sensor flagged "estimated". | TC-DSH-02 |

## 2.15 Notifications (B5.14)

| ID | Requirement | Class | Source | Actors | Rules / validation | Tests |
|---|---|---|---|---|---|---|
| TSA-NTF-001 | SMS, email and push (FCM / APNs) SHALL be sent for: registration, booking confirmation, ticket issued, payment failed / retry, refund, membership renewal / dunning, credential revoked. | SRS-SHALL | UC-TCK-01 step 5; §28.1 | VIS | — | TC-NTF-01 |
| TSA-NTF-002 | Templates SHALL be in bn/en, with UCS-2 Bengali SMS segment budgeting. Messages SHALL contain no NID / passport or reusable credential secrets. | DERIVED-MANDATORY | Parent §26.6; §29.3 | — | Bengali UCS-2: 70 chars per single segment, 67 per concatenated segment. | TC-NTF-01 |
| TSA-NTF-003 | Delivery SHALL use an async outbox with retries and delivery-status callbacks. Messaging failure SHALL never roll back a valid ticket. | DERIVED-MANDATORY | Parent §28.1 delivery-status callback | — | — | TC-NTF-01 |
| TSA-NTF-004 | The app SHALL have a Notifications screen. Booking reminders SHALL be ROADMAP (FR-SPT-005). | SRS-SHALL | §26.1 | VIS | — | TC-NTF-01 |

## 2.16 Concierge and support (B5.15)

| ID | Requirement | Class | Source | Actors | Rules / validation | Tests |
|---|---|---|---|---|---|---|
| TSA-CXP-001 | The AI concierge SHALL provide ticket support in bn/en, using personal booking data only after authentication. | SRS-MUST | FR-CXP-001; FR-CXP-004 | VIS | Tool calls scoped to the token subject. | TC-CXP-01 |
| TSA-CXP-002 | Human handoff SHALL include full conversation and booking context. KPIs: FCR ≥ 70 %, handoff ≤ 60 s (§30.3). | SRS-MUST | FR-CXP-003; §30.3 | CSA | — | TC-CXP-02 |
| TSA-CXP-003 | Support agents SHALL see masked PII, and SHALL have no access to biometric templates, payment credentials or blacklist details. | DERIVED-MANDATORY | Parent §33.2 least privilege | CSA | Property-level authorisation. | TC-SEC-07 |

## 2.17 Finance, tax and reconciliation (B5.16)

| ID | Requirement | Class | Source | Actors | Rules / validation | Tests |
|---|---|---|---|---|---|---|
| TSA-FIN-001 | The daily automated batch SHALL do three-way reconciliation — ticket subledger ↔ provider settlement (cards / MFS) ↔ GL — plus cash drawers as a fourth source. | SRS-MUST | FR-TCK-010 | FAN, FCO | — | TC-FIN-01 |
| TSA-FIN-002 | Per business date the batch SHALL report: counts, gross, discounts, tax, net, fees, zero-value passes separately, membership revenue, and splits by sport / facility / cost centre / channel. It SHALL cover captures, refunds, chargebacks and late captures. | SRS-SHALL | UC-TCK-01 postcondition "revenue is recorded against the correct sport and cost center" | FAN | — | TC-FIN-02 |
| TSA-FIN-003 | Each batch SHALL have a unique batch ID and journal keys. Reruns SHALL never double-post. Unmatched items SHALL go to an exception queue. Plug entries to force zero SHALL never be created. | DERIVED-MANDATORY | Parent §31.2 zero variance | FCO | — | TC-FIN-01, TC-FIN-04 |
| TSA-FIN-004 | Corporate invoiced sales SHALL post to AR. | SRS-MUST-INTERFACE | FR-FIN-001 | FCO | — | TC-ALC-01 |
| TSA-FIN-005 | Mushak-6.3 SHALL be issued at time of supply with a gap-free serial; credit notes on refund (form number `[LEGAL-VERIFY]`); data supplied for the monthly Mushak-9.1 return `[LEGAL-VERIFY]`. | SRS-MUST-INTERFACE | FR-FIN-002 | FCO | — | TC-FIN-03 |
| TSA-FIN-006 | KPI: 100 % match to GL within 24 h (§30.2). Acceptance: zero variance over 10 business days (§31.2). | SRS-SHALL | §30.2; §31.2 | FCO | — | TC-FIN-02 |

## 2.18 Box office and kiosk (B5.17)

| ID | Requirement | Class | Source | Actors | Rules / validation | Tests |
|---|---|---|---|---|---|---|
| TSA-BOX-001 | The kiosk SHALL support walk-in registration, ticket purchase (sport / event → pay → print / QR), membership / season check-in and wayfinding with "you are here". | SRS-SHALL | §26.3; FR-TCK-001 | VIS | Idle 90 s → session wipe. | TC-KSK-01, TC-KSK-02, TC-KSK-03 |
| TSA-BOX-002 | The box office SHALL support shifts, opening float, cash-drawer variance with supervisor sign-off, and voids / reprints with approval. | DERIVED-MANDATORY | Parent FR-TCK-010 (all revenue reconciles) | BOC, BOS | Cashier ≠ approver. | TC-PAY-10 |
| TSA-BOX-003 | Offline box office SHALL sell only from a leased inventory block, with terminal-signed credentials. | DERIVED-MANDATORY | Parent FR-SPT-006; §3.1 local failover | BOC | No oversell on reconnect. | TC-BOX-01 |

## 2.19 On-sale fairness and abuse controls (B5.18)

| ID | Requirement | Class | Source | Actors | Rules / validation | Tests |
|---|---|---|---|---|---|---|
| TSA-WR-001 | The virtual waiting room SHALL be isolated from core services, with: pre-queue; randomisation at sale start, then FIFO; a live-adjustable admission rate; signed single-use admission tokens; and a bn/en low-bandwidth queue page. The edge SHALL reject hold / payment calls without a token. | DERIVED-MANDATORY | Parent §3.1 20,000 concurrent sessions; §31.1 120 % | VIS, TAD | — | TC-WR-01 |
| TSA-WR-002 | Purchase limits per verified identity, payment instrument and device; bot detection; rate limits; credential-stuffing protection; optional ballot mode. | DERIVED-MANDATORY | Parent §33.4 WAF / DDoS; §33.5 credential stuffing | — | Accessible challenge alternative. | TC-WR-02 |

## 2.20 Dashboards and reporting (B5.19)

| ID | Requirement | Class | Source | Actors | Rules / validation | Tests |
|---|---|---|---|---|---|---|
| TSA-DSH-001 | The Revenue dashboard SHALL show ticket sales and revenue by sport / event / channel / payment method, target vs actual, trend charts, and drill-down to transaction. | SRS-MUST-INTERFACE | FR-CCC-003; FR-CCC-005; §26.4 | FCO, EXE | Role-based drill-down. | TC-DSH-01 |
| TSA-DSH-002 | Security dashboard panels SHALL show gate status, access alerts and visitor flow. | SRS-MUST-INTERFACE | FR-CCC-001 | SOM | — | TC-SOC-01 |
| TSA-DSH-003 | Executive dashboard feeds SHALL provide occupancy and revenue. | SRS-MUST-INTERFACE | FR-CCC-004 | EXE | — | TC-DSH-02 |
| TSA-DSH-004 | Refresh SHALL be ≤ 5 min from curated marts, never OLTP. Lineage SHALL trace from figure to source record. The AI Copilot SHALL read only governed, permission-tagged marts. | SRS-SHALL | §29.4; §29.3; FR-BI-002/003 | — | — | TC-DSH-01, TC-E2E-02 |

## 2.21 Data migration (B5.20)

| ID | Requirement | Class | Source | Actors | Rules / validation | Tests |
|---|---|---|---|---|---|---|
| TSA-MIG-001 | Existing visitor and membership records SHALL be migrated with mapping, cleansing and dedupe into the single master. Migration SHALL include: consent evidence (or a re-consent flow); membership validity and billing tokens (re-tokenised where needed); credential re-issue; face templates only if lawfully obtained and vendor-compatible; a reconciliation report and sign-off. | SRS-SHALL | §2.1 | PRV, FCO | Two dry runs + final (CQ-18). | TC-MIG-01 |
