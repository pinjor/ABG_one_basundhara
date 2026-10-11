# BSSC Black & Gold UI — Design System, IA and Requirements Mapping

Version 1.0 · October 2026 · Applies to `apps/web` (React 18 + Vite + Tailwind 3) and the ticketing API in `apps/api`.

Functional source of truth: Bashundhara-SSCOS URS/SRS v2.0 (`docs/source/srs-full.txt`) and the TSA specification in `docs/spec/`. The reference screenshot governs **visual language only**. Nothing in it is treated as a requirement unless the SRS also requires it.

---

## A. Reference image analysis

| Aspect | Observation | Design decision |
|---|---|---|
| Canvas | Near-black (#07090A–#0B0F10) with a faint teal cast in the panels; no pure grey. | `background.primary #080B0C`, panels `#111A1B`, nested `#182324`. |
| Gold | Two golds: a saturated championship gold on icons, bars and active nav (~#D5A32B), and a brighter highlight on titles and sparkline peaks (~#F4C45B). Dark text sits on the gold active-nav pill. | `brand.gold` for actions and data, `brand.goldBright` for active highlights only, `#080B0C` text on gold fills. |
| Hero | A night stadium photograph across the top band, with the title ("BEHAVIOR ANALYTICS") in bold uppercase gold and a white sentence-case subtitle. A right-aligned brand lock-up ("BASHUNDHARA SPORTS CITY / A CITY OF POSSIBILITIES"). | `PageHero` component: photo + left-to-right dark gradient, title in Rajdhani 700 uppercase gold, subtitle Inter white. Photo never sits behind tables or forms. |
| Sidebar | ~200 px, logo at top, icon + label rows, active row is a solid gold pill with dark text, inactive rows are white-grey with gold icons. Athlete silhouette and "PEOPLE BUILD CHAMPIONS" at the foot. | Collapsible 248 px / 72 px rail; active = gold fill + dark text; group labels; footer motto. Silhouette replaced by a subtle stadium-light gradient (no licensed artwork available). |
| Header | Slim row: search pill (left), date chip, bell with red count badge, avatar, name and role, chevron. | `TopBar`: breadcrumb + title, search, context chip, language switch, notifications, profile menu. |
| KPI row | Six equal cards: square gold icon tile, large white number (Rajdhani-like), label, green trend arrow and %, a gold sparkline at bottom right. 1 px low-contrast border, ~8 px radius. | `KPIStatCard`: icon tile, value, label, delta with arrow **and** sign (not colour alone), optional sparkline, period caption. |
| Panels | Title top-left in white semibold, optional control chip top-right ("All Zones", "View All"). Dense content, 12–16 px padding. | `ChartPanel` / `Panel` with title, caption, actions slot, and a table toggle. |
| Charts | Gold bars with vertical gradient, gold donut segments in graduated gold shades, thin grey gridlines, labels in grey, values in white on top of bars. Heatmap uses a rainbow ramp (avoided: not accessible, and not an SRS requirement here). Sankey uses gold/teal/blue ribbons. | SVG charts: gold primary series, teal and muted blue secondary; graduated gold for parts-of-whole; every chart has a data-table alternative. |
| Lists | Thumbnail + title + status text in red/amber/white + count + chevron. Ranked list with numbered gold squares and gold progress bars. | `ActivityTimeline`, ranked `BarList`; status always carries a text label. |
| Buttons | Quick actions: outlined gold, icon + label, dark fill. | Secondary button = dark surface, gold border, gold text. Primary = metallic gold fill with dark text. |
| Typography | Condensed geometric display for titles and numbers; neutral sans for body. Uppercase titles with tracking. | Rajdhani (display, numbers), Inter (UI and body), Barlow Condensed (promo banners only), Noto Sans Bengali fallback. |
| Spacing | 12–16 px gutters, consistent 8 px radius, compact density. | 4 px base scale; admin density "compact", customer density "comfortable". |

Elements of the screenshot **not** carried over as features: visitor heatmap, dwell-time and "AI Insights" analytics. They describe the Behaviour Analytics module, which has no data source in this repository. Showing them would be decorative fake analytics.

---

## B. Design system

### B.1 Tokens

Defined once in `apps/web/src/styles/tokens.css` (CSS custom properties), mirrored in `packages/shared/src/tokens.ts` for non-CSS use, and exposed to Tailwind in `apps/web/tailwind.config.js`.

| Token | Dark (primary) | Light (operator consoles, SRS §26.6) | Use |
|---|---|---|---|
| `--bg-primary` | #080B0C | #F4F2EC | App canvas |
| `--bg-secondary` | #0E1415 | #FFFFFF | Sidebar, header |
| `--surface-primary` | #111A1B | #FFFFFF | Cards |
| `--surface-secondary` | #182324 | #F1EEE6 | Nested panels, inputs |
| `--surface-elevated` | #202A2A | #FFFFFF | Menus, dialogs |
| `--brand-gold` | #D5A32B | #8A6410 | Primary actions, data series |
| `--brand-gold-bright` | #F4C45B | #6E4F0B | Active highlights |
| `--brand-gold-muted` | #A97C21 | #A97C21 | Secondary accents (non-text in light) |
| `--border-subtle` | #293532 | #DDD8CC | Dividers |
| `--border-gold` | #70551F | #C9A75A | Premium panel borders (decorative) |
| `--border-strong` | #5E6B68 | #8C8676 | Form-control borders (≥ 3:1) |
| `--text-primary` | #F7F5EE | #14181A | Main text |
| `--text-secondary` | #A9B3B0 | #4D5653 | Supporting text |
| `--text-on-gold` | #080B0C | #FFFFFF | Text on gold fills |
| `--status-success` | #43C77B | #1D7A45 | Success |
| `--status-warning` | #F3B64A | #8A5A00 | Warning |
| `--status-danger` | #F06464 | #B42318 | Failure |
| `--status-info` | #4E9AC8 | #1F5F8B | Information |
| `--data-teal` | #27AFA9 | #137C77 | Analytics series 2 |
| `--data-blue` | #4E9AC8 | #1F5F8B | Analytics series 3 |

Legacy variable names used by existing pages (`--navbar-bg`, `--primary-gold`, …) are aliased to these tokens, so every existing module adopts the palette without code changes.

### B.2 Contrast checks (WCAG 2.2 AA)

Relative-luminance ratios, computed with the WCAG formula.

| Pair | Ratio | Requirement | Result |
|---|---|---|---|
| text.primary #F7F5EE on bg #080B0C | 18.10 : 1 | 4.5 : 1 | Pass |
| text.secondary #A9B3B0 on surface #111A1B | 8.22 : 1 | 4.5 : 1 | Pass |
| text.secondary #A9B3B0 on surface.secondary #182324 | 7.48 : 1 | 4.5 : 1 | Pass |
| brand.gold #D5A32B on bg #080B0C | 8.56 : 1 | 4.5 : 1 | Pass |
| brand.gold #D5A32B on surface.secondary #182324 | 6.98 : 1 | 4.5 : 1 | Pass |
| text-on-gold #080B0C on brand.gold | 8.56 : 1 | 4.5 : 1 | Pass |
| goldMuted #A97C21 on bg #080B0C | 5.26 : 1 | 4.5 : 1 | Pass (text allowed) |
| border.strong #5E6B68 on surface #111A1B | 3.18 : 1 | 3 : 1 (UI components) | Pass |
| border.gold #70551F on surface #111A1B | 2.53 : 1 | — | Decorative only; never the sole boundary of a control |
| status.success / warning / danger / info on surface #111A1B | 8.16 / 9.77 / 5.65 / 5.71 : 1 | 4.5 : 1 | Pass |
| data.teal #27AFA9 on surface #111A1B | 6.56 : 1 | 3 : 1 (graphics) | Pass |
| Light: gold #8A6410 on #FFFFFF; white on #8A6410 | 5.37 : 1 | 4.5 : 1 | Pass |
| Light: text.secondary #4D5653 on #FFFFFF / #F1EEE6 | 7.58 / 6.54 : 1 | 4.5 : 1 | Pass |
| Light: border.strong #8C8676 on #FFFFFF | 3.63 : 1 | 3 : 1 | Pass |
| Light: success / warning / danger / info on #FFFFFF | 5.35 / 5.93 / 6.57 / 6.84 : 1 | 4.5 : 1 | Pass |

Ratios computed with the WCAG 2.x relative-luminance formula.

Forbidden pairs: gold text on gold fills; `goldMuted` or `border.gold` text on black; status shown by colour alone.

### B.3 Typography scale

| Role | Font | Size / line | Weight | Notes |
|---|---|---|---|---|
| Display XL (hero) | Rajdhani | 40/44 (mobile 30/34) | 700 | Uppercase, tracking 0.02em |
| Display L (page title) | Rajdhani | 28/32 | 700 | Uppercase |
| Display M (panel title) | Inter | 15/20 | 600 | Sentence case |
| Metric | Rajdhani | 30/32 | 700 | `tabular-nums` |
| Body | Inter | 14/20 (customer 16/24) | 400 | |
| Label | Inter | 12/16 | 500 | |
| Overline | Inter | 11/14 | 600 | Uppercase, tracking 0.14em |
| Promo banner | Barlow Condensed | 22–48 | 700 | Banners only, never instructions |

Bengali: `"Noto Sans Bengali"` is appended to every stack, so Bengali glyphs never fall back to a system font. Currency is shown as `৳ 1,800.00` (en) or `৳ ১,৮০০.০০` (bn, Bengali digits). Lakh/crore grouping is applied with `Intl.NumberFormat("en-IN")` / `("bn-BD")`.

### B.4 Spacing, radius, elevation, motion

- Spacing: 4 px base (4, 8, 12, 16, 20, 24, 32, 40, 56).
- Radius: 6 (controls), 10 (cards), 16 (customer hero cards), full (pills).
- Elevation: border + one shadow level; no stacked glows.
- Motion: 150–250 ms ease-out on colour, border and transform. Charts fade in once. Everything is disabled under `prefers-reduced-motion`. The gold-foil shimmer is removed from critical controls.

### B.5 Breakpoints

| Name | Min width | Target |
|---|---|---|
| xs | 360 | Phones (customer flow designed here first) |
| sm | 640 | Large phones |
| md | 768 | Tablets |
| lg | 1024 | Laptops (admin minimum) |
| xl | 1280 | Desktop |
| 2xl | 1536 | Large monitors |
| wall | 2200 | Stadium operations displays (§26.6 video-wall) |

### B.6 Iconography

One inline-SVG icon set (`components/ui/Icon.tsx`), 24 px grid, 1.7 px stroke, round caps. Icons are `aria-hidden`; every icon-only button has an accessible name.

### B.7 Accessibility rules

1. WCAG 2.2 AA target, 2.1 AA contract floor (SRS §26.6), on every screen.
2. Visible focus ring: 2 px `--brand-gold-bright` outline with 2 px offset, never removed.
3. Touch targets ≥ 44 × 44 px on customer and gate screens, ≥ 32 px (with spacing to 44) on admin.
4. Every chart has a "View as table" toggle exposing the same data.
5. Seat, ticket and payment states use text and shape, not colour alone.
6. Live regions announce hold-timer milestones, payment outcomes and scan decisions.
7. Forms: visible labels, `aria-invalid`, error text linked with `aria-describedby`, and focus moved to the first error.

---

## C. Information architecture

Navigation is generated from `packages/shared/src/nav.ts` and filtered by `canAccessModule()`. The server enforces the same rules (`RolesGuard`); hiding a link is never treated as authorisation.

### C.1 Customer (public web, mobile-first) — `/tickets/*`

```
Home (landing) ─ Events & matches ─ Event details ─ Seats & categories ─ Your details ─ Checkout
                                                                                         ├─ Payment processing
                                                                                         ├─ Payment success → Ticket confirmation → Digital ticket (QR)
                                                                                         └─ Payment failure → Retry (within hold)
My bookings ─ Booking / ticket details ─ Cancellation request
Help & support
Language: English / বাংলা (persisted)
```

### C.2 Administrator (SUPER_ADMIN)

Ticketing: Overview · Events & matches · Orders & bookings · Payments & refunds · Entry validation · Reports. Plus every existing operations module (Command, Venue & Play, Access & Guests, Hospitality & Retail, Logistics) and the audit log.

### C.3 Event manager (TICKET_ADMINISTRATOR, new role)

Ticketing: Overview · Events & matches · Orders & bookings · Reports. Creates events, sets categories and prices (confirmation step + audit log), opens and closes sales.

### C.4 Finance team (FINANCE_CONTROLLER, new role)

Ticketing: Overview · Payments & refunds · Reports. Approves refunds. Cannot edit events or prices (segregation of duties, spec SOD-01/03).

### C.5 Gate operator (GATE_SECURITY_OFFICER)

Entry validation (full-screen scanner), then the existing Gates and Visitors modules.

### C.6 Read-only executive

Every overview and report; all write actions are hidden in the UI and rejected by the API.

---

## D. Screen inventory (Phase 1)

States key: **L** loading skeleton · **E** empty · **X** error · **O** offline · **D** denied (no permission).

| ID | Screen | Route | Role | States | Key interactions |
|---|---|---|---|---|---|
| CUS-01 | Landing | `/tickets` | Public | L, X | Hero, featured events, how-it-works, CTA |
| CUS-02 | Events & matches + search / filters | `/tickets/events` | Public | L, E, X | Text search, sport filter, date filter |
| CUS-03 | Event details + venue information | `/tickets/events/:id` | Public | L, X, sold out, sales closed | Category price list, venue facts, Book |
| CUS-04 | Seat map + category selection | `/tickets/events/:id/seats` | Public | L, X, seat taken (409) | Section tabs, seat grid, list alternative, selection summary, max per order |
| CUS-05 | Your details | same page, step 2 | Public | validation errors | Name, mobile (BD format), email |
| CUS-06 | Booking summary + secure checkout | `/tickets/orders/:ref/checkout` | Order holder | hold countdown, expired, retry-hold | Itemised price, VAT line, method, terms, Pay |
| CUS-07 | Payment processing | same, overlay | Order holder | in progress | Polls server status; never trusts the browser |
| CUS-08 | Payment success → confirmation | `/tickets/orders/:ref` | Order holder | CONFIRMED | Tickets list, add to device |
| CUS-09 | Payment failure | `/tickets/orders/:ref/checkout` | Order holder | PAYMENT_FAILED_RETRY_HOLD, EXPIRED | Retry within hold, start again |
| CUS-10 | Digital ticket + QR | `/tickets/orders/:ref/tickets/:id` | Order holder | VALID, USED, REVOKED, REFUNDED | High-contrast QR, seat, gate, brightness hint |
| CUS-11 | My bookings | `/tickets/my` | Public (device + lookup) | E, X | Bookings on this device, find by reference + mobile |
| CUS-12 | Cancellation request | in CUS-08 | Order holder | requested, approved, rejected | Reason, confirmation dialog |
| CUS-13 | Help & support | `/tickets/help` | Public | — | FAQ, contact channels (placeholder numbers flagged) |
| OPS-01 | Ticketing overview | `/ticketing` | Admin, TA, FC, EXEC | L, E, X | KPIs, sales/revenue/channel/payment charts, recent orders |
| OPS-02 | Events & matches | `/ticketing/events` | Admin, TA | L, E, X | Create event (sections, categories, prices), open/close sales |
| OPS-03 | Orders & bookings | `/ticketing/orders` | Admin, TA, FC, EXEC | L, E, X | Search, status filter, order detail drawer |
| OPS-04 | Payments & refunds | `/ticketing/payments` | Admin, FC, EXEC | L, E, X | Payment ledger, refund queue, approve / reject with confirmation |
| OPS-05 | Entry validation | `/ticketing/scan` | Admin, Gate | ready, scanning, valid, used, wrong event/gate, invalid/revoked, expired, network unavailable, manual review | Camera scan (BarcodeDetector) or manual token entry |
| OPS-06 | Reports | `/ticketing/reports` | Admin, TA, FC, EXEC | L, E, X | Occupancy, section utilisation, check-in vs no-show, scans over time, CSV export |

---

## E. Design-to-requirements mapping

| Design element | SRS / spec source | Notes |
|---|---|---|
| Bengali / English switch on all visitor screens | SRS §26.6 bullet 1 | `useI18n()` store, persisted; Bengali strings marked for linguistic review |
| WCAG 2.1 AA floor, 2.2 AA target | SRS §26.6 bullet 2; spec D-02 | Rules B.7 |
| Dark **and** light operator consoles | SRS §26.6 bullet 3 | Light token set B.1; toggle in profile menu |
| Desktop, tablet, video-wall layouts | SRS §26.6 bullet 4 | Breakpoint `wall` |
| Audit-logged confirmation for pricing / access / financial changes | SRS §26.6 bullet 5 | `ConfirmationDialog` + `AuditLog` row on event pricing, sales status and refund decisions |
| Booking & slot selection, real-time availability, price display | SRS §26.1 "Booking & Slot Selection" | Seat map polls availability; server is authoritative |
| Payment method selection, order summary, receipt | SRS §26.1 "Payment & Checkout" | Promo-code entry deferred (OD-06) |
| My Tickets / Wallet (QR credential, booking history) | SRS §26.1 "My Tickets / Wallet" | CUS-10, CUS-11 |
| Public landing with event calendar | SRS §26.2 "Public Landing Page" | CUS-01, CUS-02 |
| Ticket type setup, pricing rules, refund approval | SRS §26.5 "Ticketing & Pricing Admin" | OPS-02, OPS-04 |
| Revenue dashboard: ticket sales, trend charts | SRS §26.4 "Revenue Dashboard" | OPS-01, OPS-06 (target vs actual deferred: no targets source, OD-09) |
| 10-minute hold, retry hold measured from the failure | SRS UC-TCK-01 3a; spec §6.1 | Server-side; UI shows server `holdExpiresAt` |
| One authoritative verification endpoint, denials return 200 DENY | Spec §7.5, D-16 | `POST /api/access/verifications` |
| QR payload carries no PII | Spec TC-CRD-06 | Signed opaque token only |
| Never display an unverified booking as confirmed | Prompt §9; spec TSA-PAY-003 | UI renders only server order status |

---

## F. Open decisions (business rules and integrations not defined)

| ID | Decision needed | Default used in this build | Owner |
|---|---|---|---|
| OD-01 | Customer accounts (sign-up, OTP, NID capture per FR-TCK-001) | Guest checkout with name / mobile / email; bookings remembered on the device; lookup by reference + mobile | Product Owner, Privacy Officer |
| OD-02 | Approved payment providers (spec CQ-01) | **Sandbox provider only**, labelled on every payment screen; disabled unless `TICKETING_SANDBOX_PAYMENTS=true` | Finance Controller |
| OD-03 | VAT rate per ticket category and VAT on free passes (spec CQ-06, `[LEGAL-VERIFY]`) | Rate stored per event (seeded 15 % from the B4 baseline) and displayed as "pending Finance/Legal confirmation" | Finance Controller, ABG Legal |
| OD-04 | Service / convenience fee | None (0). No fee is invented | Finance Controller |
| OD-05 | Refund and cancellation policy (spec CQ-08; FR-TCK-008 is Roadmap) | Customer may *request* cancellation before the event starts; a Finance Controller approves; refund executed in sandbox | Product Owner, Finance |
| OD-06 | Promo codes (spec D-06) | Not built in this UI phase | Product Owner |
| OD-07 | Offline gate validation (spec §11.3) | Not enabled. The scanner shows "Network unavailable — manual review" and never decides offline | CISO, Security Manager |
| OD-08 | Licensed BSSC venue photography and athlete artwork | Labelled placeholder imagery (`/public/media/placeholder-*`) | Marketing |
| OD-09 | Revenue targets for "target vs actual" (SRS §26.4) | Not shown; no target data source | Finance Controller |
| OD-10 | Bengali copy review | Machine-authored Bengali strings, flagged for review | Product Owner |
| OD-11 | New roles TICKET_ADMINISTRATOR and FINANCE_CONTROLLER | Added with demo accounts; final role catalogue per spec §4.1 | CISO |
| OD-12 | Support phone, email and hours | Shown as "to be confirmed" | Customer Experience |
| OD-13 | Maximum tickets per order (spec CQ-20) | 6 per order, enforced server-side | Product Owner |
