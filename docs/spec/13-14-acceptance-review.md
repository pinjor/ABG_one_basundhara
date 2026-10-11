# 13. Acceptance, test catalogue, UAT exit checklist and P1 register

## 13.1 Acceptance gates (SRS §31.1), applied to TSA

| Gate | SRS exit criteria (quoted) | TSA evidence |
|---|---|---|
| Design Acceptance | "100 % of Must-priority FRs mapped and approved; no open critical design gaps" | §16 RTM: every SRS-MUST / SRS-MUST-INTERFACE row has a design element, API, entity, screen and test. Figures 25.1 / 28.1 / 29.1 are reconciled with ABG (CQ-24). |
| SIT | "≥ 98 % of test cases pass; zero open Critical/High defects" | All §13.4 tests executed; INT-01…INT-28 against sandboxes / simulators |
| UAT | "100 % of Must-priority use cases pass; zero open Critical defects; ≤ 5 open Medium defects with agreed remediation dates" | §13.3 UC flow matrix; §13.5 exit checklist |
| Critical (P1) Defect Closure | "Zero open P1 (Critical) defects of any kind … independently re-verified" | §13.6 P1 register (SEC-GOV-08) |
| Security & Penetration | "Zero unresolved Critical/High vulnerabilities per OWASP/CVSS … P1 … remediated and re-tested prior to go-live" | TC-SEC-05 closure report |
| Performance & Load | "All latency/throughput targets met at 120 % of projected peak load" | TC-PERF-01, TC-GAT-07, TC-WR-01 |
| Go-Live Readiness | "rollback plan tested; support desk operational" | Cutover runbook, TC-DR-01, training records |
| Warranty / Hypercare | "(minimum 60 days) … SLA targets … met for two consecutive full calendar months; zero new P1" | Monthly SLA reports (§32.3) |

## 13.2 Module acceptance and the 100-transaction run (SRS §31.2)

| SRS criterion | Test |
|---|---|
| e-Ticketing & Access: "100 consecutive test transactions across all ticket types complete with correct pricing, credential issuance, and successful gate entry; blacklist test entries are correctly denied every time." | TC-E2E-01, TC-BLK-01 |
| Finance & ERP: "Daily ticketing revenue reconciles to the General Ledger with zero variance across a 10-business-day test window." | TC-FIN-02 |
| Food, Beverage & Retail (TSA payment leg): "correct wallet payment, and revenue that reconciles to the vendor settlement record with zero duplicate or missing entries." | TC-FNB-01 |
| Cybersecurity: "MFA, SSO, and encryption controls verified; penetration test closure report accepted" | TC-SEC-02, TC-SEC-05 |

**Ticket types.** There are 8 sports (FR-TCK-003) + 4 free passes (FR-TCK-004) + 4 premium (FR-TCK-005) + 4 memberships (FR-TCK-006) = **20 types**. Five transactions per type gives 20 × 5 = **100**.

**Codes used in the matrix:**
- **Channels:** A = App, W = Web, K = Kiosk, B = Box office.
- **Modalities:** RQR = rotating QR, SQR = static / printed QR, RFID, NFC (wallet pass), FACE.
- **Payments:**
  - CARD (online card with 3DS);
  - IB (internet banking);
  - BKASH / NAGAD / ROCKET (MFS);
  - TOKEN (saved instrument);
  - POS (card-present);
  - CASH;
  - ZERO (free pass or approved COMP);
  - INVOICE (corporate AR).

| Type | Transactions (ID channel·modality·payment) |
|---|---|
| Football | T001 A·RQR·CARD; T002 W·NFC·BKASH; T003 K·SQR·POS; T004 B·SQR·CASH; T005 K·FACE·NAGAD |
| Futsal | T006 A·RQR·BKASH; T007 W·RQR·IB; T008 K·FACE·BKASH; T009 B·RFID·POS; T010 B·NFC·POS |
| Padel | T011 A·RQR·TOKEN; T012 W·NFC·CARD; T013 K·SQR·POS; T014 B·FACE·CASH; T015 K·SQR·ROCKET |
| Cricket | T016 A·FACE·CARD; T017 W·RQR·NAGAD; T018 K·SQR·NAGAD; T019 B·SQR·CASH; T020 K·RFID·POS |
| Tennis | T021 A·NFC·BKASH; T022 W·RQR·CARD; T023 K·FACE·POS; T024 B·RFID·CASH; T025 B·SQR·POS |
| Swimming | T026 A·RQR·NAGAD; T027 W·FACE·IB; T028 K·RFID·POS; T029 B·SQR·CASH; T030 A·NFC·TOKEN |
| Gym | T031 A·FACE·TOKEN; T032 W·RQR·ROCKET; T033 K·RFID·BKASH; T034 B·FACE·POS; T035 W·NFC·CARD |
| Academy | T036 A·RQR·CARD; T037 W·SQR·BKASH; T038 K·RFID·POS; T039 B·RFID·CASH; T040 A·NFC·NAGAD |
| Tourist Visit | T041 A·RQR·ZERO; T042 W·SQR·ZERO; T043 K·SQR·ZERO; T044 B·SQR·ZERO; T045 K·FACE·ZERO |
| Gallery Visit | T046 A·NFC·ZERO; T047 W·RQR·ZERO; T048 K·SQR·ZERO; T049 B·SQR·ZERO; T050 K·FACE·ZERO |
| Restaurant Access | T051 A·RQR·ZERO; T052 W·NFC·ZERO; T053 K·FACE·ZERO; T054 B·SQR·ZERO; T055 W·RQR·ZERO |
| Shopping Access | T056 A·RQR·ZERO; T057 W·RQR·ZERO; T058 K·SQR·ZERO; T059 B·RFID·ZERO; T060 B·SQR·ZERO |
| VIP | T061 A·FACE·CARD; T062 W·NFC·IB; T063 K·RFID·POS; T064 B·RFID·CASH; T065 A·RQR·BKASH |
| VVIP | T066 A·FACE·TOKEN; T067 W·RFID·INVOICE; T068 K·FACE·POS; T069 B·RFID·POS; T070 B·FACE·CASH |
| Corporate (premium) | T071 W·RQR·INVOICE; T072 A·NFC·INVOICE; T073 K·SQR·INVOICE; T074 B·RFID·INVOICE; T075 W·FACE·INVOICE |
| Media | T076 A·RQR·ZERO; T077 W·NFC·ZERO; T078 K·FACE·ZERO; T079 B·RFID·ZERO; T080 B·SQR·ZERO |
| Annual membership | T081 A·FACE·TOKEN; T082 W·NFC·CARD; T083 K·RFID·POS; T084 B·RFID·CASH; T085 A·RQR·BKASH |
| Family membership | T086 A·RQR·NAGAD; T087 W·FACE·CARD; T088 K·FACE·POS; T089 B·RFID·CASH; T090 A·NFC·ROCKET |
| Student membership | T091 A·RQR·BKASH; T092 W·RQR·IB; T093 K·SQR·BKASH; T094 B·RFID·CASH; T095 W·NFC·NAGAD |
| Corporate membership | T096 W·RFID·INVOICE; T097 W·FACE·INVOICE; T098 K·RFID·INVOICE; T099 B·RFID·INVOICE; T100 A·NFC·INVOICE |

**Coverage totals** (checked by script):

| Dimension | Breakdown | Total |
|---|---|---|
| Channels | A 25 + W 25 + K 25 + B 25 | 100 |
| Modalities | RQR 22 + SQR 20 + RFID 21 + NFC 16 + FACE 21 | 100 |
| Payments | CARD 9 + IB 4 + BKASH 10 + NAGAD 7 + ROCKET 3 + TOKEN 5 + POS 15 + CASH 11 + ZERO 25 + INVOICE 11 | 100 |

ZERO = 4 free-pass types × 5 = 20, plus 5 approved Media COMPs = 25.

**Special conditions within the run:**
- T036 is a group booking of 3 attendees, including a minor with a GUARDIAN_LINK.
- T086 is a family membership with 4 members.
- T005, T045 and T050 run with the edge in OFFLINE_CONTROLLED (WAN cut), then replay.
- T061 and T066 use face with an in-lane QR fallback injected once.
- The run is consecutive. Any failure restarts the count at T001 (SRS "consecutive").

**Blacklist sub-test:** 10 blacklisted identities, holding valid credentials, attempt entry across all five modalities (2 each). 10/10 must be denied, each with a SOC alert (TC-BLK-01).

**Evidence pack per transaction (stored under `UAT/E2E-01/Tnnn/`):**
- booking ID and status history;
- payment and provider references (or a zero-value / invoice reference);
- Mushak-6.3 serial or "no VAT line" proof `[LEGAL-VERIFY]`;
- ticket and credential IDs (owner type);
- notification receipts;
- gate `decisionId`, `scanId`, `latencyMs` and mode;
- turnstile video clip;
- trace ID (registration → GL);
- journal key from the next reconciliation batch;
- tester and witness signatures.

## 13.3 UC flow → PoC / UAT matrix

| UC / flow | PoC (§15.3) | UAT test |
|---|---|---|
| UC-TCK-01 main flow 1–8 | PoC-01, PoC-02, PoC-05, PoC-06, PoC-07 | TC-E2E-01, TC-CRD-01 |
| UC-TCK-01 3a payment failure / retry hold | PoC-03 | TC-INV-03, TC-INV-05 |
| UC-TCK-01 late capture (derived from 3a) | PoC-03 | TC-PAY-03, TC-PAY-04 |
| UC-TCK-01 7a blacklist | PoC-08 | TC-BLK-01 |
| UC-TCK-01 7b expired / mismatch | PoC-09 | TC-GAT-05 |
| UC-SEC-01 main flow 1–7 | PoC-08, PoC-09 | TC-SOC-01, TC-BLK-02 |
| UC-SEC-01 4a VIP override | PoC-10 | TC-OVR-03, TC-OVR-01 |
| UC-SEC-01 6a escalation | PoC-08 | TC-SOC-02 |
| UC-FNB-01 step 5 (TSA payment leg) | PoC-04 (MFS) | TC-FNB-01 |
| UC-INC-01 (Other module); TSA touchpoint: egress fail-safe | PoC-11 (WAN loss shows egress unaffected) | TC-SEC-06 |
| UC-BI-01 (Other module); TSA touchpoint: governed ticket marts | PoC-15 (trace to GL) | TC-DSH-01 |
| UC-VND-01 (Other module); TSA touchpoint: F&B payment legs | PoC-12 | TC-FNB-01 |
| UC-FAC-01 (Other module) | No TSA touchpoint | Owning module's acceptance |

## 13.4 Test catalogue (Given / When / Then)

**Type key:**
- **F** — functional;
- **I** — integration;
- **S** — security;
- **P** — performance;
- **R** — resilience;
- **A** — accessibility;
- **D** — data / finance.

| ID | Type | Given | When | Then | Traces |
|---|---|---|---|---|---|
| TC-REG-01 | F | A new visitor on App, Web, Kiosk and box office | They register with valid Bengali and Latin names, E.164 mobile, email, DOB and NID-10 / NID-17 / passport / birth-registration; and separately with an invalid value for each field | Valid input creates VISITOR + IDENTITY_DOCUMENT (encrypted + blind index) + CONSENT rows; each invalid field returns 422 VALIDATION_ERROR with a JSON pointer; the response shows the masked document only | FR-TCK-001 |
| TC-REG-02 | S | An existing visitor with mobile M and document D | Another registration uses D, or M + DOB + the same normalised name | Response identical in shape, status and timing (± 50 ms) to a fresh registration; duplicate case queued for staff; no existence disclosure | §29.2 |
| TC-REG-03 | F | A guardian and a 12-year-old | The guardian registers the minor and attempts face enrolment for the minor | GUARDIAN_LINK created with guardian consent; minor face enrolment blocked unless the policy toggle and guardian biometric consent are both present (CQ-21) | §29.3 |
| TC-REG-04 | S | A visitor requesting an OTP | 6 wrong codes; a resend within 60 s; 20 requests from one device | Lock after 5 attempts; resend refused with Retry-After; device rate limit → 429 RATE_LIMITED | TSA-IDN-003 |
| TC-CNS-01 | F | A visitor with marketing and biometric consent | They withdraw both in Profile; a new visitor registers with MARKETING `accepted:false` | CONSENT rows appended (refusal recorded); marketing stops ≤ 5 min; biometric deletion triggered; query layer excludes the visitor from marketing segments | §29.3 |
| TC-BIO-01 | S | A face-enrolment session | A printed photo, a screen replay and a mask are presented, plus a good live capture | Attacks rejected per vendor PAD evidence (ISO/IEC 30107-3); live capture enrolled with quality ≥ threshold; duplicate face → review queue; no raw image retained | FR-TCK-002 |
| TC-BIO-02 | F | A visitor who declines face enrolment | They buy a ticket and enter | Purchase and QR entry succeed at the same price and lane availability | A-10 |
| TC-BIO-03 | F | An enrolled visitor | They withdraw biometric consent | Vault template deleted with evidence; edge galleries purged ≤ 15 min; DELETION_LEDGER entry; face attempts return FACE_NO_MATCH and fall back | §29.3 |
| TC-BIO-04 | P | ≥ 1,000 consenting PoC participants across demographic groups | Each attempts face entry 3 times; impostor trials are run | FRR ≤ 1 % and FAR ≤ 0.1 % overall; per-group results per ISO/IEC 19795-10; disparity within the agreed limit | §30.1 |
| TC-CAT-01 | F | A Ticket Administrator | Creates a VIP product with price and tax, then tries to self-approve; a Finance Controller then approves | Self-approval refused; approval publishes a new PRICE_VERSION; audit confirmation captured | FR-TCK-005; §26.6 |
| TC-CAT-02 | D | A Tourist Visit free pass | 50 passes issued | Zero-value bookings (HOLD → CONFIRMED), no payment, no revenue journal, no VAT line; credentials work at permitted zones only | FR-TCK-004 |
| TC-INV-01 | P | A padel slot with 1 unit | 500 concurrent hold requests | Exactly one 201; 499 × 409 SLOT_UNAVAILABLE; DB constraint holds; availability correct within 5 s | FR-SPT-006 |
| TC-INV-02 | R | 1,000 holds expiring together; 3 sweeper instances | Sweepers run concurrently | Each hold expires once; inventory released once; no unit left HELD | TSA-INV-005 |
| TC-INV-03 | F | A hold created at T, expiring at T+10 min | Payment fails at T+9 min | Booking PAYMENT_FAILED_RETRY_HOLD; expiry T+19 min (= failure + 10 min); retry prompted; the absolute ceiling (T+30 min) is never exceeded | UC-TCK-01 3a |
| TC-INV-04 | F | An event with a seat map, accessible seats, kills and a 200-seat sponsor allocation | Public sale and allocation run concurrently | Killed seats never sold; accessible seats per release rule; allocation never exceeded; zone capacity never exceeded | FR-EVT-003 |
| TC-INV-05 | R | A booking AWAITING_PAYMENT whose hold reaches TTL with the provider still PENDING | The sweeper runs; capture arrives 2 min later; separately, capture never arrives | Provider queried before expiry; one 3-min grace applied (within the ceiling); capture inside grace → CONFIRMED; no capture → EXPIRED and units released | TSA-INV-007 |
| TC-PAY-01 | S | A pending payment | The provider sends the capture webhook 3 times, out of order, plus one forged copy | Exactly one confirmation, one ticket set, one journal leg; PROVIDER_EVENT dedupe; forged copy → 401 and alert | §27.3 |
| TC-PAY-02 | S | A failed payment at the provider | The browser returns to returnUri with `status=success` parameters | Booking stays AWAITING_PAYMENT / PAYMENT_FAILED_RETRY_HOLD; UI shows the server status | TSA-PAY-003 |
| TC-PAY-03 | F | A booking EXPIRED 2 min ago with inventory still free | A late capture arrives | Inventory re-acquired; booking CONFIRMED; tickets issued; RECONCILIATION_ITEM note | TSA-INV-008 |
| TC-PAY-04 | F | A booking EXPIRED and its inventory sold to someone else | A late capture arrives | Automatic REFUND (LATE_CAPTURE) to the original instrument; RECONCILIATION_ITEM LATE_CAPTURE_REFUND; customer notified; no oversell | TSA-INV-008 |
| TC-PAY-05 | I | The aggregator sandbox (card with 3DS 2.x, internet banking) | The §10.2 conformance cases run | All pass | §28.1 |
| TC-PAY-06 | I | The bKash sandbox | §10.2 cases | All pass | §28.1 |
| TC-PAY-07 | I | The Nagad sandbox | §10.2 cases | All pass | §28.1 |
| TC-PAY-08 | I | The Rocket path (direct or via aggregator) | §10.2 cases | All pass | §28.1 |
| TC-PAY-09 | S | A card-present POS terminal at the box office | A card sale and refund | No PAN in SSCOS logs, DB or memory dumps; terminal P2PE-listed; receipt masked | §33.1 PCI DSS |
| TC-PAY-10 | D | A box-office shift with 40 cash and 20 card sales | Shift close with a counted variance of BDT 500 | The cashier cannot sign off; Box-Office Supervisor signs off (SOD-04); Z-report; all sales reconcile | TSA-BOX-002 |
| TC-PAY-11 | S | A booking for BDT 2,000 | The client injects amount / price fields | Rejected (422, additionalProperties) or ignored; provider initiated with the server total only | TSA-INV-010 |
| TC-PAY-12 | D | The processor register with one PSP whose licence evidence has expired | The provider is enabled for go-live; the annual review job runs | Enablement blocked until valid evidence is uploaded and approved by the Finance Controller; annual reminder raised; audit event | TSA-PAY-007 |
| TC-PRM-01 | S | Promo "EARLY10" with a cap of 100 and 1 per identity | 1,000 guesses from one IP; the 101st use; a second use by the same visitor | Enumeration rate-limited; 101st refused (CAPACITY_EXCEEDED); second use refused; PROMOTION_REDEMPTION rows = 100 | TSA-PRM-001 |
| TC-RFD-01 | D | A confirmed booking (2 tickets, BDT 3,000) | A support agent raises a 1-ticket refund; a Finance Controller approves | One credential revoked (edge ≤ 15 s); provider refund with an idempotent key; credit note; GL reversal; ledger credit; notification; Σ refunds ≤ captured; raiser ≠ approver | §26.5 |
| TC-RFD-02 | D | An event with 5,000 tickets is cancelled | Bulk refund executes | Progress tracking; throttling; failures to the exception queue; every credential revoked | §29.1 |
| TC-RFD-03 | D | A captured payment | The provider reports a chargeback | Payment CHARGEBACK; credentials SUSPENDED; finance exception; outcome transitions | §28.1 |
| TC-MEM-01 | F | An annual membership with auto-billing | Renewal succeeds; next year it fails 3 times | Pre-debit notice `[LEGAL-VERIFY]`; ACTIVE; on failure GRACE → SUSPENDED (credential suspended) → EXPIRED | FR-TCK-006 |
| TC-MEM-02 | F | A family membership with 4 members | Issued | 4 MEMBERSHIP_MEMBER rows and 4 distinct credentials; each usable only by its member | FR-TCK-007 |
| TC-MEM-03 | F | A season ticket covering 10 fixtures | The holder enters fixture 3, then tries fixture 3 again without re-entry rights | Valid per fixture window; second entry DENY REENTRY_EXCEEDED | §26.3 |
| TC-ALC-01 | F | A corporate account with a 200-ticket pool | CSV of 200 names with 7 invalid rows; the reclaim deadline passes with 20 unassigned | 193 assigned, 7 row errors; 20 reclaimed; AR invoice posted; bulk issuance four-eyes | §26.2 |
| TC-ALC-02 | F | A sponsor entitlement of 300 tickets | Requests totalling 320 arrive concurrently | Exactly 300 issued; 20 rejected CAPACITY_EXCEEDED | US-13; FR-EVT-003 |
| TC-CRD-01 | F | Any confirmed booking with N attendees | Confirmation completes | N tickets and N credentials (one per attendee); unique token hashes; validity windows; SMS + email + push | FR-TCK-007 |
| TC-CRD-02 | S | A rotating-QR screenshot taken at T (period 15 s) | Presented at T + 90 s | DENY CREDENTIAL_REPLAYED / CREDENTIAL_INVALID; counted for the alert threshold | TSA-CRD-003 |
| TC-CRD-03 | F | A phone in airplane mode | Opens My Tickets | Rotating QR renders and verifies at the gate | TSA-CRD-005 |
| TC-CRD-04 | S | A printed static QR | Used once, then a photocopy presented | Second use DENY (anti-passback) | TSA-CRD-002 |
| TC-CRD-05 | I | An RFID card issued, then revoked | Revocation | Edge / reader reject ≤ 15 s online; UID-cloned card without crypto auth rejected | §28.1 |
| TC-CRD-06 | S | Any QR / NFC payload | Decoded | No name, mobile, NID or email; signature and `key_id` present | §33.3 |
| TC-CRD-07 | F | A visitor with a feature phone | Buys at the box office and receives the SMS link / printed ticket | Static QR renders from the link without the app; SMS contains only first name + booking reference; single use enforced | TSA-CRD-005 |
| TC-GAT-01 | F | Gate G with modalities {QR, NFC} | A face attempt at G; then the config is changed to {FACE, QR} by Access Admin with SOC Manager approval | Face not offered before the change; change audited and effective after edge sync | FR-ACC-005 |
| TC-GAT-02 | F | A face opt-in visitor with a valid ticket | Approaches a face lane | Match → entitlement → ALLOW ≤ 1.5 s; ACCESS_EVENT method FACE | FR-ACC-001; US-02 |
| TC-GAT-03 | R | The face engine slowed to 2 s responses | Visitors use the face lane | Fallback to QR prompt at ≤ 1 s; breaker trips at > 5 % errors in 60 s; cluster credential-only; SOC notified | TSA-GAT-004 |
| TC-GAT-04 | S | A visitor ticket for zone Z1 | Presented at restricted zone Z3; then a Player credential at Z3 | DENY ZONE_NOT_PERMITTED; Player ALLOW per ZONE_PERMISSION | FR-ACC-006 |
| TC-GAT-05 | F | A ticket for a 10:00 slot | Presented at 13:00, or at another facility | DENY OUTSIDE_VALIDITY / SLOT_MISMATCH; bn/en message directs to help desk / AI concierge | UC-TCK-01 7b |
| TC-GAT-06 | F | Products with NONE, N_REENTRIES = 1 and UNLIMITED_SAME_DAY | IN / OUT / IN sequences | Decisions follow policy; anti-passback on direction | TSA-GAT-003 |
| TC-GAT-07 | P | A gate cluster at 120 % design load and ≥ 50 req/s | 15 min sustained, mixed modalities, 5 % invalid credentials | P95 ≤ 1.5 s; P99 ≤ 3 s; mean ≤ 2 s; zero incorrect ALLOW; error < 0.1 % | §3.1; §27.3; §30.1 |
| TC-GAT-08 | F | A product with TIMED re-entry (exit + 30 min); an offline edge with soft anti-passback | The visitor exits and returns at +20 and +40 min; a supervisor un-scans a mistaken entry; the same credential is used at two offline edges | +20 ALLOW, +40 DENY REENTRY_EXCEEDED; un-scan requires reason + approval and is audited; replay flags OFFLINE_CONFLICT | TSA-GAT-003 |
| TC-BLK-01 | S | 10 blacklisted identities with valid credentials | They attempt entry (2 per modality), including at offline edges with fresh snapshots | 10/10 denied ≤ 1 s; SOC alert with camera reference each time; generic visitor message | FR-ACC-002; UC-TCK-01 7a |
| TC-BLK-02 | S | A WATCHLIST_UNKNOWN subject (template only, no visitor record) | Walks past a face-enabled lane | Watch-list alert to SOC with gate and camera reference; BLACKLIST_MATCH_LOG row | UC-SEC-01 trigger |
| TC-BLK-03 | S | A Security Administrator | Adds a blacklist entry and attempts to self-approve | Refused; a second approver activates; audit chain intact | §26.5 |
| TC-OVR-01 | F | A DENY with DEVICE_FAULT | A Security Operator overrides with reason and step-up | ALLOW recorded as OVERRIDDEN_ALLOW; OVERRIDE row with the original decision preserved; audit | FR-ACC-008 |
| TC-OVR-02 | S | A user without `access.override`, or a BLACKLISTED denial without SOC Manager approval | Attempts override | 403 FORBIDDEN; attempt logged | FR-ACC-008; SOD-05 |
| TC-OVR-03 | F | A recognised VIP without zone access | Presents at a VIP-lounge gate | SOC prompted for override with reason capture | UC-SEC-01 4a |
| TC-SOC-01 | I | An unauthorised attempt at a restricted door | Denied | Alert on SOC dashboard ≤ 5 s with camera reference; `POST /incidents` record; dispatch; outcome logged | UC-SEC-01; FR-SOC-005 |
| TC-SOC-02 | I | An alert with no field-team acknowledgement | 3 min pass | `POST /incidents/{id}/escalate` to the duty manager; logged | UC-SEC-01 6a |
| TC-STF-01 | I | An employee in HRM with zone roles | HRM sends a leaver event | Staff credentials revoked ≤ 15 min; online edges deny ≤ 60 s | §29.2; FR-ACC-006 |
| TC-LOG-01 | D | 24 h of mixed gate traffic | Logs inspected | Every ACCESS_EVENT has decisionId, scanId, subject_ref, gate, zone snapshot, method, direction, decision, reason, latency, policy version, mode; retention job keeps ≥ 12 months | FR-ACC-007 |
| TC-EDG-01 | R | An edge offline for 12 min (> MAX_STALE) | VVIP and standard visitors arrive | RESTRICTED: VVIP first entry denied → manual lane; standard allowed; SOC banner | TSA-EDG-002 |
| TC-EDG-02 | R | WAN cut for 45 min (> SRS 30 min) during ingress | WAN restored | Ordered replay; no duplicates (deviceId, scanId); OFFLINE_CONFLICT flagged; occupancy corrected | §28.2 |
| TC-NTF-01 | I | The SMS aggregator is down | 100 bookings confirmed | Bookings stay confirmed; SMS retried / failed over; email sent; delivery statuses tracked; Bengali UCS-2 segment budget respected | §28.1 |
| TC-CXP-01 | F | A logged-in visitor asking in Bengali "আমার টিকিট কোথায়?" | The concierge handles it | The visitor's own booking only; another visitor's booking is never retrievable | FR-CXP-001/004 |
| TC-CXP-02 | F | An unresolved query | Escalated | Human agent receives transcript and booking context ≤ 60 s | FR-CXP-003; US-14 |
| TC-FIN-01 | D | A business day with bookings, refunds, settlements and cash | The batch runs twice | Matched legs posted once (journal_key); unmatched → exception queue; batch report | FR-TCK-010 |
| TC-FIN-02 | D | 10 consecutive business days of test traffic | Daily reconciliation | Zero variance to GL each day; revenue per sport and cost centre correct | §31.2 |
| TC-FIN-03 | D | Two issuing points | 1,000 invoices with 1 rolled-back transaction and 3 refunds | Serials gap-free per point; credit notes reference invoices; Mushak-6.3 fields present `[LEGAL-VERIFY]` | FR-FIN-002 |
| TC-FIN-04 | D | A settlement line with an unknown reference | Reconciliation | Exception created; no plug / suspense entry | TSA-FIN-003 |
| TC-BOX-01 | R | Box-office WAN outage | Sales continue from a leased offline block | Sales limited to the block; terminal-signed credentials; synced on reconnect with no oversell | TSA-BOX-003 |
| TC-KSK-01 | F | The kiosk | Walk-in registration + purchase + print | Completed; session wiped after 90 s idle | FR-TCK-001; §26.3 |
| TC-KSK-02 | F | A member / season holder | Face or QR at the kiosk | Check-in recorded; generic message on deny | §26.3 |
| TC-KSK-03 | F | The kiosk | Wayfinding | "You are here" and directions in bn/en | §26.3 |
| TC-WR-01 | P | An on-sale with 30,000 users queued | Admission at R = 50/s | Randomised then FIFO; booking API rejects calls without a token (403 WAITING_ROOM_REQUIRED); token replay rejected; admission-to-hold ≥ 99 % | TSA-WR-001 |
| TC-WR-02 | S | A scripted bot farm | Hold-and-release abuse; > 6 tickets per identity | Rate limits and challenges; purchase limits enforced; accessible challenge alternative exists | TSA-WR-002 |
| TC-SEC-01 | S | User A's token | Read / modify User B's booking, visitor, credential, refund | 404 for every object; no leakage; subject taken from the token | OWASP A01; API1:2023 |
| TC-SEC-02 | S | Staff accounts and gate devices | Login without MFA; a privileged login with SMS OTP only; a device without a client certificate | Refused; privileged roles require phishing-resistant MFA; SSO via enterprise IdP works | §33.2 |
| TC-SEC-03 | S | Error and log pipelines | Inputs containing NID, OTP, tokens | Never present in logs, traces or problem details; canary scanner alerts | §27.1; §29.3 |
| TC-SEC-04 | S | The audit log | An administrator alters a record in the store | Hash-chain verification detects it; SIEM alert | §33.5 |
| TC-SEC-05 | S | A release candidate | Independent pen test, SAST / DAST / SCA | Zero unresolved Critical / High; P1 independently re-verified | §31.1; SEC-GOV-08 |
| TC-SEC-06 | S | Fault injection on the policy engine (exception, timeout, malformed token) | Verification | 200 DENY POLICY_ERROR, HOLD_CLOSED; never ALLOW; egress unaffected | OWASP A10 |
| TC-SEC-07 | S | A Customer Support Agent token | Requests a visitor, booking and payment; attempts PATCH with `role` / `status` fields | Masked PII only; no biometric, payment-credential or blacklist fields returned; mass-assignment rejected (422) | API3:2023; TSA-CXP-003 |
| TC-SEC-08 | S | A release pipeline | An unsigned image and an image without SLSA provenance are submitted for deploy; a deploy is attempted at T − 24 h before a Category A event | Admission rejects both images; SBOM present for the signed release; deploy blocked by the change freeze unless CAB emergency approval | TSA-CICD-003; TSA-CICD-011 |
| TC-PERF-01 | P | 24,000 concurrent sessions (20,000 × 1.2) | Browse / book / pay mix for 60 min | Read P95 ≤ 500 ms; hold P95 ≤ 800 ms; error < 0.5 %; no oversell | §3.1; §31.1 |
| TC-DR-01 | R | Production-like environment | Primary region failure simulated during a test event (DNS / API failover) | Tier 2 restored ≤ 4 h with data loss ≤ 15 min; edges continue OFFLINE_CONTROLLED; payment sweep; tax-serial continuity; deletion ledger replayed | §32.4 |
| TC-UX-01 | A | All visitor screens | Switch bn ↔ en mid-flow; Bengali digits on | State preserved; all strings translated; Bengali digits and lakh / crore grouping rendered | §26.6 |
| TC-UX-02 | A | All 35 TSA screens | Automated (axe) + manual screen-reader audit | WCAG 2.1 AA pass (floor) on every screen; 2.2 AA gaps reported; kiosk EN 301 549 checklist | §26.6 |
| TC-DSH-01 | D | A closed business day | Revenue dashboard vs GL | Totals equal; role-respecting drill-down; freshness ≤ 5 min intraday; KPI formulas per §9.6 | FR-CCC-003/005 |
| TC-DSH-02 | F | IN / OUT traffic at directional gates | Occupancy panel | Occupancy = IN − OUT per zone; estimates flagged for bi-directional lanes | FR-CCC-004 |
| TC-MIG-01 | D | A legacy export of profiles and memberships | 2 dry runs + final | Counts and hashes signed; duplicates resolved; consents migrated or re-consent queued; no legacy face images unless CQ-18 approved | §2.1 |
| TC-E2E-01 | F | The 100 transactions of §13.2 | Executed consecutively | 100/100 correct pricing, credential issuance and gate entry; evidence pack per transaction; 10/10 blacklist denials | §31.2 |
| TC-E2E-02 | F | One booking | Traced | A single trace spans registration → booking → payment → credential → gate → GL journal | TSA-API-009; §29.3 |
| TC-DSR-01 | F | A deletion request | Processed | PII removed / anonymised across TSA, edge, marts, backups (ledger) and subscribers (`visitor.deleted`); finance kept pseudonymised; restore replay verified | §29.3 |
| TC-FNB-01 | I | The F&B module | Calls `POST /payments` and `POST/GET /visitors/{id}/transactions` across 50 orders at 3 outlets | Same gateway; ledger shows one leg each; zero duplicates against vendor settlement | FR-FNB-005/006; UC-FNB-01 step 5 |
| TC-API-01 | F | Every state-changing POST / PATCH | Called without Idempotency-Key; reused with a different body; reused with the same body | 400 VALIDATION_ERROR; 409 IDEMPOTENCY_CONFLICT; replay with `Idempotent-Replayed: true` | §27.3 |
| TC-API-02 | S | A gate device | Sends VerifyAccess with: null `credentialToken`; both token fields; empty token; missing `scanId` / `deviceId` / `direction`; an extra `zoneId`; a certificate of another device | 422 for each schema violation; 401 for the certificate / deviceId mismatch; a valid but unauthorised credential returns 200 DENY; the zone is derived from `gateId` | TSA-GAT-007; §27.2 |
| TC-PRK-01 | I | A subscribed parking consumer | `booking.confirmed` emitted | Signed event received with booking and event IDs (roadmap consumer) | FR-PRK-003 |

**Count.** The catalogue contains **99** test cases:

| Group | Count | Group | Count |
|---|---|---|---|
| REG | 4 | CNS | 1 |
| BIO | 4 | CAT | 2 |
| INV | 5 | PAY | 12 |
| PRM | 1 | RFD | 3 |
| MEM | 3 | ALC | 2 |
| CRD | 7 | GAT | 8 |
| BLK | 3 | OVR | 3 |
| SOC | 2 | STF | 1 |
| LOG | 1 | EDG | 2 |
| NTF | 1 | CXP | 2 |
| FIN | 4 | BOX | 1 |
| KSK | 3 | WR | 2 |
| SEC | 8 | PERF | 1 |
| DR | 1 | UX | 2 |
| DSH | 2 | MIG | 1 |
| E2E | 2 | DSR | 1 |
| FNB | 1 | API | 2 |
| PRK | 1 | | |

Sum: 4+1+4+2+5+12+1+3+3+2+7+8+3+3+2+1+1+2+1+2+4+1+3+2+8+1+1+2+2+1+2+1+1+2+1 = **99** across 35 groups. The RTM generator re-counts the table rows.

## 13.5 UAT exit checklist

| # | Criterion | Evidence | Owner |
|---|---|---|---|
| U-01 | 100 % of Must use-case flows in §13.3 pass | Signed UAT scripts | ABG QA |
| U-02 | TC-E2E-01: 100 consecutive passes with evidence packs; 10/10 blacklist | `UAT/E2E-01/` | ABG QA + Security |
| U-03 | Zero open Critical; ≤ 5 open Medium with dated remediation | Defect report | Vendor PM |
| U-04 | P1 register empty, every P1 independently re-verified (§13.6) | Register export | ABG Security |
| U-05 | Pen test closed (zero Critical / High) | Closure letter | Independent tester |
| U-06 | Performance at 120 % passed (TC-PERF-01, TC-GAT-07, TC-WR-01) | Load report | Vendor + ABG IT |
| U-07 | Face: TC-BIO-04 met; DPIA approved; FRTE / PAD reports filed | Reports | Privacy Officer |
| U-08 | Finance: 10 business days zero variance (TC-FIN-02); Mushak samples approved `[LEGAL-VERIFY]` | Recon reports | Finance Controller |
| U-09 | Accessibility: TC-UX-02 on all 35 screens | Audit report | ABG QA |
| U-10 | DR test (TC-DR-01) and restore test evidenced; DR exercise plan scheduled ≥ 2×/year | DR report | ABG IT |
| U-11 | Runbooks approved (all 8 types, §15.1) and staff trained (gate, box office, SOC, support, finance) | Training records | Vendor |
| U-12 | PSP / MFS / SMS licences verified (TC-PAY-12) | Processor register | Finance Controller |
| U-13 | RTM: every FR / US / UC traced (§16) | RTM CSV | ABG PMO |
| U-14 | Legal tags resolved or accepted as risks by ABG Legal | Legal sign-off | ABG Legal |

## 13.6 P1 register (SEC-GOV-08)

One register spans SIT, UAT, pen test and load test. **No release, including go-live, proceeds with an open P1** (§33.7).

| Field | Content |
|---|---|
| P1-ID | P1-YYYY-NNN |
| Source | SIT / UAT / PEN / LOAD / PROD |
| Title, component, tier | — |
| P1 basis | System-down / data-integrity / security / life-safety / critical function failure (SRS §31.1 definition) |
| Detected (UTC), by | — |
| CVSS (security items) | v3.1 / v4.0 score [VERIFY-VERSION] |
| Root cause | — |
| Fix reference | Commit / release |
| Independent re-verification | Verifier (not the fixing team), date, evidence link |
| Status | OPEN → FIXED → RE-VERIFIED → CLOSED |
| Release impact | Releases blocked (G-P1) |

---

# 14. Review prompts and reviewer checklists

## 14.1 Review prompts

| # | Area | Prompt | Evidence |
|---|---|---|---|
| RP-01 | Inventory | How is double booking impossible under concurrency and across failover? | DDL, TC-INV-01 |
| RP-02 | Payments | Show PROVIDER_EVENT handling of duplicate / reordered / forged callbacks per provider. | Code, conformance |
| RP-03 | Payments | What happens if capture arrives after hold expiry? | §6.1, TC-PAY-03/04 |
| RP-04 | Gate | Decompose the 1.5 s P95 gate budget, including face. | Traces |
| RP-05 | Gate | What can an edge decide in OFFLINE_CONTROLLED, and what changes at MAX_STALE? | §11.3 |
| RP-06 | Blacklist | How is a blacklist check guaranteed on every attempt within 1 s, including offline? | TC-BLK-01 |
| RP-07 | Biometrics | Where are templates stored; how is deletion evidenced, including in backups? | DPIA, ledger |
| RP-08 | Biometrics | Provide ISO/IEC 30107-3, 19795-1, 19795-10 and NIST FRTE evidence. | Reports |
| RP-09 | Privacy | Map each PDPA 2026 obligation (B4) to a control, pending `[LEGAL-VERIFY]`. | Control matrix |
| RP-10 | PCI | Provide the PCI scope document per channel and SAQ type. | Scope doc, AoC |
| RP-11 | Finance | Show reconciliation flow, journal keys and exception handling without plug entries. | TC-FIN-* |
| RP-12 | Tax | Show Mushak-6.3 / credit-note samples and serial continuity across failover. | Samples |
| RP-13 | Security | Map OWASP Top 10:2025 (incl. A10) and API Top 10 2023 to controls and tests. | §8.5 |
| RP-14 | Supply chain | Provide SBOM, SLSA v1.2 provenance and signature verification for a release. | Artefacts |
| RP-15 | Accessibility | WCAG audits for booking and kiosk flows. | Audit |
| RP-16 | Capacity | Re-run §9.4 with measured lane throughput and ABG venue figures. | Model |
| RP-17 | DR | Demonstrate restore + deletion replay; show the 2×/year DR exercise plan. | Report |
| RP-18 | Integrations | For each §10.1 row: protocol, version, sandbox and security-review status. | Matrix |
| RP-19 | RTM | A response for every FR / US / UC using only the five SRS response values. | §16 CSV |
| RP-20 | P1 | Describe the P1 register and independent re-verification (SEC-GOV-08). | Process doc |

## 14.2 Reviewer checklists

Each item is pass / fail with an evidence link.

**1. Penetration tester**
- [ ] BOLA / BFLA / property-level authorisation on every E-xx endpoint (TC-SEC-01, TC-SEC-07)
- [ ] Webhook forgery and replay (TC-PAY-01)
- [ ] Rotating-QR replay, static-QR copy, RFID clone (TC-CRD-02/04/05)
- [ ] VerifyAccess schema abuse and device impersonation (TC-API-02)
- [ ] Waiting-room bypass and bot abuse (TC-WR-01/02)
- [ ] Mobile MASVS: storage, pinning, root detection
- [ ] Problem / log leakage (TC-SEC-03)

**2. Biometric assessor**
- [ ] PAD per ISO/IEC 30107-3 (TC-BIO-01)
- [ ] On-site scenario test per ISO/IEC 19795-1; demographics per 19795-10 (TC-BIO-04)
- [ ] NIST FRTE results for the exact algorithm version
- [ ] Threshold governance, four-eyes (TSA-BIO-005)
- [ ] Consent, minor rules, deletion evidence (TC-BIO-03, TC-REG-03)
- [ ] Fallback lane and covered-face SOP

**3. Architecture invariants**
- [ ] One authoritative verification handler; aliases share it (§7.5)
- [ ] Zone derived server-side; subject from token
- [ ] Exactly-one credential owner; one ticket per attendee (§5.4)
- [ ] Conditional-update inventory; no cache-only availability
- [ ] Outbox for every side effect; no dual writes
- [ ] Fail-closed entry; hardware fail-safe egress

**4. Data / privacy**
- [ ] Classification per table (§5.3); 8 classes applied
- [ ] Retention jobs and DELETION_LEDGER propagation, including backups (§5.5)
- [ ] Purpose register and data-flow map current (§8.10)
- [ ] DSR end to end (TC-DSR-01)
- [ ] No production PII in non-production; separate keys

**5. Payments / finance**
- [ ] Connector conformance per provider (TC-PAY-05…08)
- [ ] Late capture and 10-min retry hold from failure (TC-INV-03, TC-PAY-03/04)
- [ ] Refund four-eyes, original instrument, SLA (TC-RFD-01)
- [ ] Three-way + cash reconciliation; rerun-safe journals (TC-FIN-01/02)
- [ ] Gap-free tax serials; credit notes (TC-FIN-03)
- [ ] Licence register (TC-PAY-12); PCI scope (TC-PAY-09)

**6. Resilience**
- [ ] Edge OFFLINE_CONTROLLED / RESTRICTED behaviour (TC-EDG-01/02)
- [ ] Face breaker (TC-GAT-03); SMS failover (TC-NTF-01)
- [ ] DR failover and restore (TC-DR-01); DR exercise ≥ 2×/year planned
- [ ] Immutable, air-gapped backups with separate credentials

**7. CI/CD supply chain**
- [ ] Pipeline order per §12.1; SSDF mapping
- [ ] SBOM + signatures + SLSA v1.2 provenance verified at admission (TC-SEC-08)
- [ ] G-P1 and change-freeze gates enforced (TSA-CICD-005, -011)
- [ ] Secrets in vault; dependency pinning

**8. API / OAuth**
- [ ] Authorization Code + PKCE; token lifetimes (visitor ≤ 15 min, privileged ≤ 5 min)
- [ ] Sender-constrained tokens for devices and services
- [ ] Idempotency-Key enforcement (TC-API-01)
- [ ] RFC 9457 problems with the §7.3 codes; 200 DENY semantics
- [ ] Webhook signing (HMAC / JWS) and subscriber verification

**9. Gate operations**
- [ ] Lane mix and staffing per §9.4.2; accessible and manual lanes
- [ ] Override / un-scan with reason and approvals (TC-OVR-01/02, TC-GAT-08)
- [ ] Revocation-age banner and RESTRICTED-mode SOP
- [ ] Re-entry policies incl. TIMED (TC-GAT-06/08)
- [ ] Egress fail-safe drill with the fire system (no software dependency)
- [ ] Event-window SLO dashboard and burn-rate paging (§9.3)
