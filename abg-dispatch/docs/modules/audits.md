# Audit

Compliance plans audits for each office — internal, regulatory, fire &
safety, buyer, ISO, financial / stock, environmental — records the findings
with a severity, gives each corrective action an owner and a due date, and
tracks every action until it is verified. Owners see their actions on the
phone and submit the fix; the audit lead verifies it or sends it back. Overdue
actions alert their owner and the lead once. An audit closes only when every
corrective action is verified — in the service and in the database.

Menu position: **5 — Audit** (phone and portal). Not to be confused with the
**Audit log** (who changed what in the system) under Insights in the portal.

## Workflow

```
           START                 COMPLETE FIELDWORK              CLOSE
PLANNED ─────────► IN_PROGRESS ───────────────────► FOLLOW_UP ──────────► CLOSED
   │                   │   (rating, score,             ("Actions open")   (every action
   │                   │    conclusion)                                     verified)
   │                   └── nothing left open ─────────────────────────────► CLOSED
   └─ CANCEL (reason; only while no finding is recorded) ──► CANCELLED

Finding:  OPEN ── SUBMIT (owner, response) ──► SUBMITTED ── VERIFY (lead) ──► VERIFIED
            ▲                                     │
            └──────────── REOPEN (lead, reason) ──┘
          OPEN ── VERIFY (lead, fixed on the spot) ──► VERIFIED
          Observation: NOTED from the start (no owner, no due date)
```

| Audit status | Label |
|---|---|
| `PLANNED` | Planned — fieldwork has not started; findings cannot be recorded yet |
| `IN_PROGRESS` | In progress — findings are recorded |
| `FOLLOW_UP` | Actions open — fieldwork reported, corrective actions outstanding |
| `CLOSED`, `CANCELLED` | Final |

| Severity | Default due | Meaning |
|---|---|---|
| Critical | 7 days | Risk to life, a licence or a buyer |
| Major | 30 days | |
| Minor | 60 days | |
| Observation | — | Noted for next time; no action |

Reference numbers: audits `ABG-AU-YYYY-NNN` (`formatAuditNumber`, sequence
`AU`), findings `F-01`, `F-02`… within the audit.

## Rules

- **Planning** (`POST /admin/audits`): one of the planner's offices
  (`BRANCH_INVALID`), real dates (`DATE_INVALID`, `END_BEFORE_START`), at most
  365 days ahead (`START_TOO_FAR`), fieldwork at most 30 days
  (`AUDIT_TOO_LONG`). The lead defaults to the planner; the office's admins
  are told.
- **Managing** an audit (start, findings, verify, reopen, reassign, finish,
  close, cancel) needs `audits.manage` for the office, or `audits.manage` and
  being the audit lead (`403 NOT_AUDIT_MANAGER`). Read-only roles change
  nothing.
- **Findings** only while `IN_PROGRESS` or `FOLLOW_UP`. Every finding except
  an observation needs an owner who can sign in (`OWNER_REQUIRED`); the due
  date defaults by severity and must be today or later, within 365 days
  (`DUE_IN_PAST`, `DUE_TOO_FAR`).
- **Only the owner submits the fix** (`403 NOT_OWNER`), with a response of at
  least 3 characters. Sending back needs a reason (`REASON_REQUIRED`).
- **Finishing fieldwork** records the rating (Satisfactory / Needs
  improvement / Unsatisfactory), an optional score 0–100 and the conclusion;
  with nothing open the audit closes straight away.
- **Closing** with any action still open is refused
  (`409 AUDIT_ACTIONS_OPEN`, listing them) and by the trigger
  `abg_audit_close_check()`. An audit with findings cannot be cancelled
  (`AUDIT_HAS_FINDINGS`).
- **Overdue**: an `OPEN` finding past its due date is overdue
  (`findingOverdue` in shared). `AuditAlertsService` runs on the
  background-checks interval and alerts the owner and the lead once per
  finding (`overdueNotifiedAt`).
- **Visibility**: the audit team, compliance (group-wide), the MD / Chairman
  (group-wide), office admins and auditors for their offices see the whole
  audit; an owner outside those sees only the findings they own
  (`viewer.partial`). Everyone else gets 404.
- `audit_updates` is append-only; planning, closing and cancelling are also
  in the system audit log.

## Roles

| Who | Capability | Can |
|---|---|---|
| Compliance officer | `audits.view`, `audits.manage` (group-wide) | Plan and run every audit |
| Head office admins | `audits.manage` | Plan and run audits for their offices |
| Office admins, MD / Chairman, auditors | `audits.view` | Read audits for their offices (MD / Chairman group-wide) |
| A finding's owner | owner | See their findings and submit the fix |

## API

| Method | Path | Who | Notes |
|---|---|---|---|
| POST | `/admin/audits` | `audits.manage` | `{ title, type, branchId, plannedStart, plannedEnd, scope?, externalBody?, team?, leadUserId? }` |
| GET | `/admin/audits?status&type&branchId&q` | `audits.view` | `status` = a status, a list, `OPEN` or `ALL` |
| GET | `/admin/audits/summary?branchId` | `audits.view` | `{ openAudits, inProgress, openActions, overdueActions, criticalOpen, awaitingVerification, openActionsByOffice, upcoming, ratingsThisYear, year, counts }` |
| GET | `/audits/actions/mine?state=open\|closed\|all` | signed in | My corrective actions with their audit, overdue first, and counts |
| GET | `/audits/:id` | see above | Findings (each with `actions`), counts, updates, `viewer { isLead, isStaff, canManage, ownsFindings, partial, actions }` |
| POST | `/audits/:id/start` · `/close` · `/cancel` · `/notes` | managers | `{ note }` where needed |
| POST | `/audits/:id/findings` | managers | `{ title, severity, detail?, clause?, area?, recommendation?, ownerUserId?, dueDate? }` |
| POST | `/audits/:id/complete-fieldwork` | managers | `{ rating, score?, conclusion }` |
| POST | `/audits/findings/:id/submit` | owner | `{ response }` |
| POST | `/audits/findings/:id/verify` · `/reopen` | managers | `{ note }` (required to reopen) |
| POST | `/audits/findings/:id/reassign` | managers | `{ ownerUserId, dueDate? }` |

Notifications open `/audits/<id>`: office admins (and the lead) when an
audit is planned, reported, closed or cancelled; the owner when a finding is
recorded for them, reassigned to them, verified or sent back; the lead when a
fix is submitted and when every action is verified ("close the audit"); owner
and lead when an action is overdue.

## Portal (`apps/admin/src/pages/audits/`)

**Audit** in the sidebar: tabs **Open**, **Planned**, **In progress**,
**Actions open**, **Closed**, **All** and **My actions** (people without
`audits.view` see only *My actions*), KPI cards (open audits, open and overdue
actions, critical, awaiting verification) and actions by office. **Plan an
audit** opens the form; the detail runs the whole audit.

## Mobile (`apps/mobile/lib/modules/audits/`)

- **Audit** (`/audits`): **My actions** — the corrective actions I own, with
  severity, due date and *Overdue since…* in red, a banner counting what is
  left; audit staff also get **Audits** (Open / Closed / All) for their
  offices.
- **Audit** (`/audits/<id>`, `?finding=` outlines that finding and shows it
  first): status, the Planned → Fieldwork → Corrective actions → Closed
  stepper, the result (rating, score, conclusion), counts, every finding with
  its owner, due date, response and buttons (*Submit my fix*, *Verify*, *Send
  back*, *Reassign*), the audit's details and history. Managers can *Start
  fieldwork*, *Add a finding* (on the spot, with severity, owner and due
  date), *Finish fieldwork*, *Close the audit* or *Cancel audit*.
- The home tile shows how many of my actions are open.

## Demo data

`apps/api/prisma/seed-modules/audits.ts`: 7 audits (`ABG-AU-2026-001`…`007`)
across offices and types: a buyer social-compliance audit of Factory B with
actions open and one overdue (owners Imran Hossain and Tahmina Begum), an ISO
45001 surveillance audit of Factory A in progress with a critical finding,
planned stock and environmental audits, and closed ones. Shirin Akhter
(compliance) leads them.

## Tests

`apps/api/test/audits.test.ts` (the whole flow, close guard, cancel guard,
office scope, read-only roles, summary, overdue alerts once, append-only
history) and `apps/mobile/test/workplace_test.dart`.
