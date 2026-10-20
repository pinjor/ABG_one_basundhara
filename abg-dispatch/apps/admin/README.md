# ABG Dispatch — admin control centre

The web portal for dispatch officers, office and head-office administrators,
auditors and super admins. React 18 + Vite + Tailwind, data via react-query,
served in production by nginx with a strict Content-Security-Policy.

![Control room](../../docs/screenshots/portal-02-control-room.png)

## What's in it

| Page | For | Highlights |
|---|---|---|
| **Control room** | everyone in the portal | Live custody feed (server-sent events), *arrived but not received* hero figure, KPI tiles that open the matching list, needs-attention list (overdue, open exceptions), pending-receipt ageing, today by hour |
| **Parcels** | operations | Status views (In route, Pending receipt, Exceptions, Overdue…), search across tracking ID / title / people / employee ID / courier reference, filters (offices, priority, classification, carrier type, courier company, category, overdue, date range on booking or receipt), saved views, CSV export |
| **Parcel detail** | operations | Custody stepper, proof of receipt (incl. on behalf), the append-only ledger with verification and proof, notes, exceptions with resolve, attachments via signed links, people and places, courier details, and the actions your role may take: assign / reassign courier, confirm desk handover, transit, checkpoint, mark arrived, receive with the receiver's code, receive on behalf, courier status, return, hold, exception, expected delivery, resend notification, correction, cancel |
| **QR label** | operations | 100 × 150 mm printable label; confidential titles never printed |
| **Analytics** | admins, auditors | Rates, time per stage (incl. P90 wait at destination), daily volume, by office / route / department / category, slowest routes, courier performance |
| **Reports** | operations, auditors | Daily register, incoming/outgoing registers, pending receipt, overdue, completed, exceptions, monthly office summary, courier activity, chain of custody — view, print, CSV |
| **Audit log** | admins, auditors | Every administrative and security event with before/after JSON |
| **Offices & rules** | read: operations · edit: super admin | Offices, locations, departments, categories, SLA & escalation rules (run now), courier companies |
| **People & access** | read: operations · edit: super admin | Employee directory, HR CSV import with dry run, accounts, roles with office scope, reset password, sign out everywhere, deactivate |
| **Integrations** | operations | Health of database, storage, push, SMS, SLA engine and each courier's webhooks |
| **My security** | everyone | Two-factor setup (QR + key), password change, active sessions |

Navigation and buttons follow the signed-in user's capabilities and each
parcel's `viewer.actions`; the API enforces the same rules regardless.
Labels opened in the browser (`/q/<token>`) and label URLs typed by a desk
scanner into the search box open the parcel directly.

## Run

```bash
# from abg-dispatch/, with the API running on :18491
bun run build:shared
cd apps/admin && bun run dev        # http://localhost:18490, proxies /api
```

Point the dev proxy elsewhere with `VITE_API_PROXY_TARGET=https://…`. The
demo-account helper on the sign-in page shows only in development (or with
`VITE_DEMO_HINTS=true`).

## Build

```bash
bun run build      # tsc -b && vite build → dist/
```

The production image (`Dockerfile`, `nginx.conf`) serves `dist/` and proxies
`/api` to the API container, with SSE unbuffered for the live feed. Assets are
never inlined as `data:` URIs so the CSP can stay `'self'`-only.

## Design

Midnight-navy sidebar carrying the ABG mark, platinum active states, white
cards on a cool surface. Statuses always pair colour with icon and label.
Charts use a validated colour-blind-safe series palette with legends, hover
tooltips and screen-reader tables. Every time is shown in Asia/Dhaka. See
[docs/design-system.md](../../docs/design-system.md).
