# Demo data

`bun run db:seed` (or `bun prisma/seed.ts --reset` in `apps/api` to wipe and
reseed; reset is refused when `NODE_ENV=production`). In Docker:
`docker compose exec api bun prisma/seed.ts`.

Every account's password is **`Dispatch@2026`**. Seeded handover PINs are
**`246810`**. Sign in with the email or the employee ID.

## Offices

| Code | Office | City |
|---|---|---|
| HO | ABG Head Office — Plot 314/A, Block E, Bashundhara R/A | Dhaka |
| CO | ABG Corporate Office — Road 90, Gulshan-2 | Dhaka |
| FCA | Factory A — Kanchpur Industrial Area, Sonargaon | Narayanganj |
| FCB | Factory B — BSCIC Industrial Estate, Konabari | Gazipur |
| DHK | Dhaka Branch — Dilkusha C/A, Motijheel | Dhaka |
| WH | Central Warehouse — Tongi Industrial Area | Gazipur |

Each office has a location tree (building › floor › department / reception /
gate) and departments.

## People to try

| Person | ID | Office | Role | Good for |
|---|---|---|---|---|
| Md. Rahim | ABG-2041 | HO · Legal | Employee | Sender of the sample parcel (mobile) |
| Farhana Islam | ABG-7231 | FCA · Administration | Employee | Receiver of the sample parcel (mobile) |
| Karim Ahmed | ABG-4832 | HO · Dispatch | Courier / Runner | Pickup, transit, arrival, receipt code (mobile) |
| Shahin Ahmed | ABG-7310 | FCA · Administration | Employee | Receiving on Farhana's behalf |
| Tanvir Hasan | ABG-3550 | HO | Dispatch Officer (HO) | Assigning couriers, desk handovers (portal) |
| Kamrul Hasan | ABG-5205 | FCA | Dispatch Officer (FCA) | Front desk arrival and receipt |
| Sabina Yasmin | ABG-5120 | FCA | Branch Admin (FCA) | Office-scoped control room |
| Tahmina Begum | ABG-7455 | FCB | Branch Admin (FCB) | Office-scoped control room |
| Arif Chowdhury | ABG-1001 | HO | Head Office Admin | Group-wide control room, analytics, corrections |
| Mahmuda Akter | ABG-9002 | HO | Auditor | Read-only everything, audit log |
| System Administrator | ABG-0001 | HO | Super Admin | Configuration, people and roles, integrations |

Emails follow `firstname.lastname@abg.com.bd` (Rahim is `rahim@abg.com.bd`,
the super admin `admin@abg.com.bd`). Five directory-only employees have no
account, to try *Create account* in the portal.

**Guest carrier:** Abdul Malek, phone `01811223344`, assigned to
`Calibration Gauge Set`. In development the SMS code is shown on screen.

## Parcels

The sample from the brief:

| Tracking ID | Title | From → To | State |
|---|---|---|---|
| `ABG-YYMMDD-HO-00428` | Quarterly Supplier Agreement | Md. Rahim (HO Legal) → Farhana Islam (Factory A) | **Received** — full ledger: booked, Karim assigned, handover requested, approved by Rahim in app, picked up, in transit, Factory A gate checkpoint, arrived, pending receipt, received by Farhana in app |

(`YYMMDD` is the seeding date, Asia/Dhaka.) Around it, today's live board has
one of each situation:

- in transit with an employee courier, and with **Pathao** (external tracking number, rider)
- **pending receipt** for Rahim (Signed Factory Compliance Certificates, from Farhana)
- awaiting pickup with a **guest carrier** and with an employee courier
- booked with no courier yet; a draft
- a **critical, highly confidential** parcel left in pending receipt, reminded at 1 h and **escalated** at 2 h, now **overdue** (its title is redacted for operations)
- an **open exception**: the courier was refused at the Factory B gate (office closed)
- yesterday: one **received on behalf** (Shahin for Farhana), one **returned**, one **cancelled**

…plus 30 days of history (~110 parcels, ~1,000 ledger events) across all
offices, couriers and categories, so analytics and reports have real shape.
Notifications, SLA rules (pickup, delivery, receipt reminder at 1 h, receipt
escalation at 2 h, end-to-end at 8 h, priority-specific pickup reminders) and
four courier providers (Pathao, REDX, Steadfast and a generic "Other") are seeded too.

## Incident & facility issues

Fourteen reports across all four categories, so every stage, severity and
resolution is on screen:

| Office | Report | Category › sub-category | Severity | Reported by | Stage |
|---|---|---|---|---|---|
| FCA | Strong smell of gas near the boiler room | Safety & Industrial › Gas leak | **Critical** | Rafiq Islam | **Under Investigation** — boiler shut down, Titas Gas checking the line |
| FCA | Exposed wires at the production-floor switchboard | Safety & Industrial › Electrical hazard | High | Farhana Islam | **Reported** |
| FCA | Cafeteria serving counter not cleaned after lunch | Admin & Facility › Cafeteria hygiene | Medium | Anonymous (Shahin) | **Reported** |
| FCA | CCTV camera at the security gate is offline | Security › CCTV fault | Medium | Nurul Amin | Under Investigation — cut cable being replaced |
| FCA | Spare parts missing from the store-room cage (**confidential**) | Security › Theft or loss | High | Hidden (Kamrul Hasan) | Acknowledged by head office — Sabina cannot see it |
| HO | Water leaking from the ceiling near the Level 7 lift (photo) | Admin & Facility › Building damage | High | Md. Rahim | Under Investigation — plumber on the way |
| HO | Ceiling dripping by lift 2 | Admin & Facility › Building damage | Medium | Farid Uddin | Closed — **Duplicate** of the leak above |
| HO | Internet and LAN down on Level 4 | IT / Technical › Network down | High | Sadia Rahman | **Acknowledged** — IT checking the switch |
| HO | Wet floor at reception with no warning sign (photo) | Safety & Industrial › Other safety hazard | High | Nusrat Jahan | Closed — **Resolved** |
| HO | Supplier asking staff for cash to speed up deliveries (**misconduct**, always confidential) | Security › Misconduct | High | Anonymous (Mehedi Hasan) | Under Investigation — head office only |
| FCB | Crack spreading across the store-room wall (photo) | Admin & Facility › Building damage | Medium | Imran Hossain | **Reported** |
| CO | No water in the 2nd floor washroom | Admin & Facility › Water supply | Medium | Jamal Uddin | Closed — Resolved (all four stages) |
| DHK | Broken lock on the front-desk drawer | Security › Gate or lock | Low | Laila Rahman | Closed — **No action needed**, with the reason (straight from Reported) |
| WH | Stores office printer jams on every page | IT / Technical › Computer or printer | Low | Selim Reza | Closed — **Referred** to the printer vendor |

Each report's handler has the "new report" alert in their inbox (read once
someone acted on it) and each reporter has the latest stage update; the
confidential ones are marked sensitive.

Sign in as **Sabina Yasmin** to handle Factory A's reports (she cannot see the
confidential spare-parts report, although it is at her office), **Tahmina
Begum** for Factory B, **Arif Chowdhury**
for every office including the confidential reports, **md@abg.com.bd** (the
MD) to read everything without changing it, and **Farhana Islam** or **Md.
Rahim** on the phone to report one and follow it.
