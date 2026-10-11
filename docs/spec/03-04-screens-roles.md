# 3. Screen inventory

SRS §26 screens are listed in SRS order with a disposition:
- **Comply** — SRS screen, built by TSA.
- **Comply (partial)** — TSA builds the ticketing panels of a shared screen.
- **DERIVED** — not in §26 but needed by an SRS requirement.
- **Other module** — listed so that no §26 row is dropped.

**General rules for every screen (SRS §26.6 + B6):**
- **Language:** bn/en runtime switch on all visitor screens (TC-UX-01).
- **Numbers:** Bengali digits and lakh/crore grouping are configurable for display. Storage is ISO 8601 with Latin digits, and inputs accept both digit sets.
- **Accessibility:** WCAG 2.2 AA is the target and WCAG 2.1 AA the contract floor (D-02), on **all** screens including admin, operator and kiosk. Kiosks also meet the EN 301 549 clauses for speech output, tactile keypad and reach range [VERIFY-VERSION].
- **Operator consoles:** dark and light modes.
- **Layouts:** desktop, tablet and video-wall.
- **Confirmation:** every change to access rights, pricing or financial data needs an audit-logged confirmation step.
- **States:** every data screen defines loading, empty, error (retry + correlation ID) and offline states.
- **PII:** masked by default; a "reveal" is role-gated and writes an AUDIT_EVENT.

## 3.1 Visitor Mobile App (iOS / Android) — SRS §26.1

| Screen ID | Screen | Disposition | Key content and actions | Validation / states | Linked |
|---|---|---|---|---|---|
| SCR-APP-01 | Onboarding & Registration | Comply | Sign-up; NID/passport capture; face enrolment (opt-in, liveness); consents incl. `accepted:false`; guardian link for minors | TSA-IDN-002 rules; OTP; neutral duplicate response; camera guidance with voice prompts; manual entry alternative to MRZ scan | FR-TCK-001, FR-TCK-002 |
| SCR-APP-02 | Home / Discover | Comply | Featured sports, events, promotions; quick-book | Carousel pause control | FR-TCK-003 |
| SCR-APP-03 | Booking & Slot Selection | Comply | Calendar, sport/facility filter, real-time availability incl. maintenance/blocked, price | Hold countdown (screen-reader announcements at 2 min and 30 s); conflict → refresh | FR-SPT-001, FR-SPT-006 |
| SCR-APP-04 | Seat map | DERIVED (FR-EVT-003) | Sections, accessible / companion / obstructed seats, best-available | Non-visual list alternative | FR-EVT-003 |
| SCR-APP-05 | Payment & Checkout | Comply | Method (card, internet banking, bKash / Nagad / Rocket, saved token), promo code, order summary, receipt | Server totals only; hold-expiry warning | FR-TCK-003; §26.1 |
| SCR-APP-06 | Payment result | DERIVED (UC-TCK-01 3a) | Pending / success / failed (retry within the retained 10-min hold) / late-capture outcome | Never shows "success" before server confirmation; ARIA live region | UC-TCK-01 3a |
| SCR-APP-07 | My Tickets / Wallet | Comply | Rotating QR (offline), RFID/NFC status, membership card, booking history, **transaction ledger** (TSA + F&B), add-to-wallet | Revoked / suspended states; large-QR mode; text booking reference | FR-TCK-007; FR-FNB-005 |
| SCR-APP-08 | Membership | DERIVED (part of §26.1 "membership card") | Plan, members, renewal, mandate, dunning status | Mandate consent | FR-TCK-006 |
| SCR-APP-09 | Attendee assignment | DERIVED (FR-TCK-007) | Name / reassign attendees before cut-off | Cut-off enforcement | FR-TCK-007 |
| SCR-APP-10 | Notifications | Comply | Confirmations, payment retry, refunds, renewals, credential revoked, safety alerts | — | §26.1 |
| SCR-APP-11 | AI Concierge Chat | Comply | Text chat, quick actions, human handoff with context | Handoff ≤ 60 s | FR-CXP-001/003/004 |
| SCR-APP-12 | Profile & Settings | Comply | Personal data, payment methods, privacy controls, consent history, DSR start, wearable linkage placeholder | Re-authentication for sensitive changes | FR-TCK-001; §29.3 |
| SCR-APP-13 | Waiting-room queue page | DERIVED (TSA-WR-001) | Position, estimated wait, admission; low-bandwidth bn/en | Token expiry handling | §3.1 |
| SCR-APP-14 | Digital Twin / Navigation | Other module | — | — | FR-DGT-001 |
| SCR-APP-15 | Food & Beverage / Retail Ordering | Other module (consumes TSA identity, payments, ledger) | — | — | FR-FNB-001…005 (Must) |

## 3.2 Web Portal (Public & Corporate) — SRS §26.2

| Screen ID | Screen | Disposition | Key content | Linked |
|---|---|---|---|---|
| SCR-WEB-01 | Public Landing Page | Comply | Facilities, event calendar, membership plans | FR-TCK-003, FR-TCK-006 |
| SCR-WEB-02 | Booking Engine | Comply | Same capability as SCR-APP-03…07 for desktop / kiosk-scale | FR-TCK-001…007 |
| SCR-WEB-03 | Corporate Portal | Comply | Corporate memberships, bulk allocation (CSV), reclaim, consumption report, invoices | FR-TCK-005, FR-TCK-006, FR-FIN-001 |
| SCR-WEB-04 | Sponsor Portal | Comply (partial: entitlement status; ROI reports Other module) | Package / entitlement status, attendee naming | FR-EVT-003; FR-EVT-004 (Other) |
| SCR-WEB-05 | Vendor / Partner Portal | Other module | — | FR-VND-001/002 |

## 3.3 Self-Service Kiosk — SRS §26.3

| Screen ID | Screen | Disposition | Key content | Linked |
|---|---|---|---|---|
| SCR-KSK-01 | Walk-in registration | DERIVED (FR-TCK-001 requires Kiosk; D-12) | Minimal registration, OTP, optional face | FR-TCK-001 |
| SCR-KSK-02 | Walk-in Ticket Purchase | Comply | Sport/event select → pay (card-present / MFS QR) → print / QR issue | FR-TCK-003, FR-TCK-007 |
| SCR-KSK-03 | Membership Check-in | Comply | Face / QR scan for members and season-ticket holders | FR-TCK-006; §26.3 |
| SCR-KSK-04 | Wayfinding | Comply | "You are here" static map and text directions | §26.3 |

## 3.4 Command & Control Center — SRS §26.4

| Screen ID | Screen | Disposition | TSA content | Linked |
|---|---|---|---|---|
| SCR-CCC-01 | Security Dashboard | Comply (partial) | Gate status tiles, access-alert feed, entry flow | FR-CCC-001; UC-SEC-01 |
| SCR-CCC-02 | Revenue Dashboard | Comply (partial) | Ticket sales and revenue by sport / event / channel / payment method, target vs actual, drill-down | FR-CCC-003; FR-CCC-005 |
| SCR-CCC-03 | Executive Dashboard | Comply (partial) | Occupancy feed; ticket revenue KPI; predicted gate wait (BI-owned) | FR-CCC-004; FR-BI-004 |
| SCR-CCC-04 | Facility Dashboard | Other module | — | FR-CCC-002 |
| SCR-CCC-05 | Incident Console | Other module (receives access incidents) | — | FR-INC-* |
| SCR-CCC-06 | Sustainability Dashboard | Other module | — | FR-BMS-005 |
| SCR-CCC-07 | Video Wall Layout Manager | Other module | — | FR-SOC-001 |
| SCR-SEC-01 | Gate / Access console with override dialog | DERIVED (FR-ACC-008) | Live lane decisions, manual check, override (reason + step-up), supervisor un-scan, edge mode and revocation-age banner, breaker state | FR-ACC-005, FR-ACC-008 |

## 3.5 Back-Office / Admin Consoles — SRS §26.5

| Screen ID | Screen | Disposition | Content | Linked |
|---|---|---|---|---|
| SCR-BO-01 | Ticketing & Pricing Admin | Comply | Products, prices, tax codes, promos, **refund approval queue** | FR-TCK-003…006; §26.5 |
| SCR-BO-02 | Inventory / seat-map & holds / kills | DERIVED (FR-SPT-006, FR-EVT-003) | Seat maps, pools, kills, holds, COMP | FR-SPT-006 |
| SCR-BO-03 | Access & Zone Permission Admin | Comply | Role-to-zone, gate modality, devices, blacklist / watch-list (four-eyes), override audit log | FR-ACC-002/005/006/008 |
| SCR-BO-04 | Booking / Customer search (masked) | DERIVED (FR-CXP-003) | Lookup, resend, reissue, merge request | FR-CXP-003 |
| SCR-BO-05 | Finance reconciliation & exceptions | DERIVED (FR-TCK-010; ERP console is Other) | Batches, matched / exception items, reruns, journal export status | FR-TCK-010 |
| SCR-BO-06 | Box-office shift / drawer | DERIVED (FR-TCK-010) | Float, counts, variance sign-off, voids / reprints, leased offline blocks | FR-TCK-010 |
| SCR-BO-07 | Corporate / sponsor allocation admin | DERIVED (FR-EVT-003) | Accounts, pools, entitlements, reclaim, invoicing | FR-EVT-003 |
| SCR-BO-08 | System Administration | Comply | Users, roles, audit logs, **API clients**, integration-health monitor, AI model (face threshold) configuration | §26.5; §33.2 |
| SCR-BO-09 | Privacy & DSR console | DERIVED (§29.3; PDPA 2026 `[LEGAL-VERIFY]`) | DSR intake, verification, export, deletion propagation, deletion ledger | §29.3 |
| SCR-BOX-01 | Box-office POS sale | DERIVED (FR-TCK-001 assisted channel) | Assisted registration, sale, cash / card-present, print | FR-TCK-001, FR-TCK-003 |
| — | HRM & Payroll Console | Other module | — | FR-HRM-* |
| — | Finance & ERP Console | Other module | — | FR-FIN-* |
| — | Procurement Console | Other module | — | FR-PRC-* |
| — | Vendor & Sponsor Admin | Other module | — | FR-VND-*, FR-EVT-002 |
| — | Food & Retail Outlet Admin | Other module | — | FR-FNB-007 |
| — | Maintenance & Work Order Console | Other module | — | FR-FAC-* |

**Screen count:**

| Group | Screens | Count |
|---|---|---|
| SRS screens built (Comply) or partly built by TSA | APP 01, 02, 03, 05, 07, 10, 11, 12; WEB 01–04; KSK 02–04; CCC 01–03; BO 01, 03, 08 | 8 + 4 + 3 + 3 + 3 = **21** |
| DERIVED screens | APP 04, 06, 08, 09, 13; KSK 01; SEC 01; BO 02, 04, 05, 06, 07, 09; BOX 01 | **14** |
| **Total TSA screens** | | 21 + 14 = **35** |
| Other-module screens (listed, not built) | APP 14, 15; WEB 05; CCC 04–07; 6 back-office consoles | 2 + 1 + 4 + 6 = **13** |

---

# 4. Role and access-subject model

## 4.1 Roles (B7)

Every role is least-privilege and deny-by-default, and is enforced in both UI and API (SRS §33.2).

**MFA levels:**
- **L1** — OTP or passkey.
- **L2** — enterprise SSO + MFA (NIST SP 800-63B-4 AAL2).
- **L3** — L2 with a phishing-resistant authenticator (FIDO2 / passkey), required for privileged roles.

**Masking levels:**
- **M0** — none.
- **M1** — partial (name + last 4 of mobile).
- **M2** — full masking.

| # | Role | Permitted actions | Explicit restrictions | Masking | MFA | Four-eyes duties |
|---|---|---|---|---|---|---|
| R-01 | Visitor | Own profile, bookings, payments, tickets, consents, DSR | Only own data (subject from token) | M0 own | L1 | — |
| R-02 | Member | As Visitor, plus membership, family members, mandates | Own membership only | M0 own | L1 | — |
| R-03 | Guardian | Act for linked minors | Cannot enrol a minor's face unless policy allows (CQ-21) | M0 linked | L1 | — |
| R-04 | Corporate Booker | Account pool allocation, CSV naming, reclaim, invoices | Own account; no pricing | M1 attendees | L2 | Maker for bulk issuance |
| R-05 | Sponsor User | View entitlements, name attendees | Own package | M1 | L2 | — |
| R-06 | Ticketing Agent / Box-Office Cashier | Assisted registration, sale, print, raise refund | No approvals; no drawer variance sign-off | M1 | L2 | Maker (refund, void) |
| R-07 | Box-Office Supervisor | Shift / float, drawer variance, void / reprint approval | Cannot approve own shift | M1 | L2 | Checker (variance, void) |
| R-08 | Ticket Administrator | Products, prices (draft), promos, refund approval ≤ L1 | Cannot approve own price; no GL mapping | M2 | L3 | Maker (price); checker (refund ≤ L1) |
| R-09 | Inventory Manager | Seat maps, pools, kills, holds, COMP | No pricing | M2 | L2 | Maker (bulk kills / COMP) |
| R-10 | Access Administrator | Zones, gates, devices, zone permissions | No blacklist; no overrides | M2 | L3 | Maker (zone / gate change) |
| R-11 | Security Operator (override) | Live gate console, overrides, un-scan, alert acknowledgement | Blacklist-denial override needs SOC Manager | M1 | L2 + step-up | Maker (blacklist override) |
| R-12 | Security Administrator (blacklist) | Blacklist / watch-list create / remove, face thresholds (with SYS) | Cannot approve own entry; cannot delete audit | M1 | L3 | Maker / checker (distinct users) |
| R-13 | SOC Manager | Approve blacklist overrides, escalations, gate / zone change approval | — | M1 | L3 | Checker |
| R-14 | Finance Analyst | Reconciliation review, exception triage, journal export | No approvals; no GL mapping change | M2 | L2 | Maker (exception resolution) |
| R-15 | Finance Controller (approvals) | Approve refunds > L1, price/tax and GL mapping, exceptions, corporate credit | Cannot approve own items | M2 | L3 | Checker |
| R-16 | Customer Support Agent | Masked lookup, resend, reissue, raise refund, merge request | No biometrics, payment credentials or blacklist detail | M1 | L2 | Maker (refund, merge) |
| R-17 | Privacy Officer / CDO function | DSR, consent records, deletion ledger, merge approval, PII reveal approval | No business transactions | M0 with audit | L3 | Checker (merge, reveal) |
| R-18 | System Administrator | Users, roles, API clients, configuration | No business data by default; break-glass ≤ 4 h, ticketed | M2 | L3 + PAM | Maker (role grant) |
| R-19 | Auditor (read-only) | Audit events, reports | Time-bound grant; no write | M1 | L3 | — |
| R-20 | Gate Device (machine) | `access:verify`, edge sync, event replay | Bound to device certificate and gate | — | mTLS | — |
| R-21 | Kiosk Device (machine) | Registration, sale and check-in on behalf of an on-screen session | Bound to kiosk certificate; session wiped on idle | — | mTLS | — |
| R-22 | Integration Service (machine) | Narrow scopes per client (F&B payments, ERP export, CCC KPI, HRM events, SOC alerts) | Scope-limited; no wildcard | — | Client credentials + mTLS | — |
| (ext.) | Executive | Dashboards (CCC-owned role) | Read-only aggregates | M2 | L2 | — |

## 4.2 Access subjects (B5.12)

| Subject type | Master | Credential source | Default zones |
|---|---|---|---|
| VISITOR | TSA VISITOR | TICKET | Product zones |
| MEMBER | TSA VISITOR + MEMBERSHIP_MEMBER | MEMBERSHIP_MEMBER | Plan zones |
| SEASON_HOLDER | TSA VISITOR + SEASON_ENTITLEMENT | SEASON_ENTITLEMENT | Fixture zones |
| EMPLOYEE | HRM (reference) | Staff ACCESS_SUBJECT | Role / department zones |
| PLAYER, COACH | Sports module roster (reference) | Staff ACCESS_SUBJECT | Team / academy zones per schedule |
| VENDOR_STAFF | Vendor master (reference) | Staff ACCESS_SUBJECT | Outlet / service zones |
| VIP_GUEST, MEDIA | TSA VISITOR | TICKET (premium) | Category zones (approval required) |
| WATCHLIST_UNKNOWN | TSA (biometric only) | None | None — match always DENY + alert |

## 4.3 RBAC matrix

C = create, R = read, U = update, A = approve, X = execute, M = masked read, — = none. The role numbers are from §4.1. Object-level, property-level and function-level checks apply on every API call (§7.1).

| Permission | R01–03 | R04 | R05 | R06 | R07 | R08 | R09 | R10 | R11 | R12 | R13 | R14 | R15 | R16 | R17 | R18 | R19 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| visitor.self | CRU | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — |
| visitor.search | — | — | — | M | M | — | — | — | M | M | M | M | M | M | R | — | M |
| visitor.reveal_pii | — | — | — | — | — | — | — | — | — | — | X | — | — | — | A | — | — |
| visitor.merge | — | — | — | — | — | — | — | — | — | — | — | — | — | C | A | — | — |
| booking.create | C own | C acct | C pool | C | C | — | — | — | — | — | — | — | — | — | — | — | — |
| catalogue.price | — | — | — | — | — | CU | — | — | — | — | — | — | A | — | — | — | R |
| gl_mapping | — | — | — | — | — | — | — | — | — | — | — | — | CU + A (other FCO) | — | — | — | R |
| promo.manage | — | — | — | — | — | CU | — | — | — | — | — | — | A | — | — | — | R |
| inventory.manage | — | — | — | — | — | — | CU | — | — | — | — | — | — | — | — | — | R |
| allocation.manage | — | CU own | R | — | — | CU | — | — | — | — | — | — | A (bulk) | — | — | — | R |
| refund.raise | — | — | — | C | C | C | — | — | — | — | — | — | C | C | — | — | — |
| refund.approve | — | — | — | — | — | A ≤ L1 | — | — | — | — | — | — | A | — | — | — | R |
| shift.drawer | — | — | — | CU own | A | — | — | — | — | — | — | R | — | — | — | — | R |
| zone_gate_device | — | — | — | — | — | — | — | CU | — | — | A | — | — | — | — | — | R |
| access.override | — | — | — | — | — | — | — | — | X | — | A (blacklist) | — | — | — | — | — | R |
| access.unscan | — | — | — | — | — | — | — | — | X | — | A | — | — | — | — | — | R |
| blacklist.manage | — | — | — | — | — | — | — | — | — | C / A | A | — | — | — | — | — | R |
| face.thresholds | — | — | — | — | — | — | — | — | — | C | A | — | — | — | — | CU (with R12) | R |
| recon.run / exceptions | — | — | — | — | — | — | — | — | — | — | — | X / C | A | — | — | — | R |
| journal.export | — | — | — | — | — | — | — | — | — | — | — | X | A | — | — | — | R |
| dsr.process | C | — | — | — | — | — | — | — | — | — | — | — | — | — | X | — | R |
| users.roles / api_clients | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | CU | R |
| audit.read | — | — | — | — | — | — | — | — | — | R (security) | R | R (finance) | R | — | R (privacy) | R (system) | R |
| audit.delete | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — |

`audit.delete` is granted to **no role**. Audit storage is WORM (§8.5).

## 4.4 Four-eyes and segregation-of-duties rules

| Rule | Constraint | Source |
|---|---|---|
| SOD-01 | No single user can change a price, change its GL mapping **and** approve a reconciliation exception. Price is made by R-08 and approved by R-15. GL mapping is made by one R-15 and approved by a different R-15. Exception approval is by an R-15 who was not the GL mapping maker. | B7 |
| SOD-02 | No one can blacklist a person **and** delete the audit evidence. Audit is not deletable by any role. The blacklist maker ≠ checker. | B7; §33.5 |
| SOD-03 | Refund raiser ≠ approver. Refunds above L1 (default BDT 10,000, configurable) need R-15. | §26.5 |
| SOD-04 | A cashier cannot sign off their own drawer variance or void. | DERIVED (FR-TCK-010) |
| SOD-05 | A blacklist-denial override needs R-13 confirmation. | FR-ACC-008 |
| SOD-06 | Visitor merge and PII reveal need R-17 approval. | §29.2; §29.3 |
| SOD-07 | Production zone / gate / device changes: R-10 maker, R-13 checker. | §26.6 |
| SOD-08 | Privileged access is reviewed at least quarterly. Break-glass use is reviewed within 1 business day. | §33.2 |
