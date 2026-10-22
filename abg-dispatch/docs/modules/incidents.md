# Incident & Facility Issue Management

> "Complete coverage across 4 categories (Safety & Industrial, Admin &
> Facility, Security, and IT/Technical), severity tags (Critical, High,
> Medium, Low), confidential report toggle, photo upload preview, and stage
> tracking (Reported ➔ Acknowledged ➔ Under Investigation ➔ Closed)."
> — client specification

Any employee reports a problem from the app with up to three photos; the
office's admins (head office only, for a confidential report) take it through
four stages, and the reporter follows every one. This module is the reference
implementation for ABG ONE modules (see [README](README.md)); the user-facing
walk-through is [workflows §13](../workflows.md#13-incident--facility-issues).

| Layer | Path |
|---|---|
| Vocabulary | `packages/shared/src/incidents.ts` |
| Database | `Incident`, `IncidentUpdate`, `IncidentPhoto` in `apps/api/prisma/schema.prisma`; migrations `20261020000300_incident_reports`, `20261021000200_incident_stages` |
| API | `apps/api/src/incidents/` |
| Demo data | `INCIDENTS` / `seedIncidents` in `apps/api/prisma/seed.ts` |
| API tests | `apps/api/test/incidents.test.ts` |
| Portal | `apps/admin/src/pages/Incidents.tsx`, `IncidentDetail.tsx`; badges in `components/ui.tsx` |
| Mobile | `lib/screens/report_incident_screen.dart`, `my_reports_screen.dart`, `incident_detail_screen.dart`; helpers in `lib/widgets/vocab.dart` |
| Mobile strings | `apps/mobile/tool/strings/incidents.py` (English and Bangla) |

## Stages

```
REPORTED ──▶ ACKNOWLEDGED ──▶ UNDER_INVESTIGATION ──▶ CLOSED
   │              │                     ▲                 │
   │              └───────▶ CLOSED      └──── reopen ─────┘
   ├────────────────────▶ UNDER_INVESTIGATION
   └────────────────────▶ CLOSED
```

| From | Allowed to |
|---|---|
| `REPORTED` | `ACKNOWLEDGED`, `UNDER_INVESTIGATION`, `CLOSED` |
| `ACKNOWLEDGED` | `UNDER_INVESTIGATION`, `CLOSED` |
| `UNDER_INVESTIGATION` | `CLOSED` |
| `CLOSED` | `UNDER_INVESTIGATION` (reopen) |

Open = `REPORTED`, `ACKNOWLEDGED`, `UNDER_INVESTIGATION` (`OPEN_INCIDENT_STATUSES`).
Nothing returns to Reported. Stage times on the incident:

| Column | Set when | Cleared |
|---|---|---|
| `acknowledgedAt` | a handler first moves it on from Reported (to any stage) | never |
| `investigationStartedAt` | it first goes Under Investigation (including a reopen of a report closed without investigation) | never |
| `closedAt`, `resolution` | it is closed | on reopen |

The database enforces: `CLOSED` has `closedAt` and `resolution`; an open
report has no resolution; anything past Reported has `acknowledgedAt`; Under
Investigation has `investigationStartedAt`.

### Resolutions

Closing always names a resolution. Every resolution other than **Resolved**
needs a note (≥ 3 characters) the reporter will read.

| Code | Label | Meaning |
|---|---|---|
| `RESOLVED` | Resolved | The problem has been fixed |
| `NO_ACTION_NEEDED` | No action needed | Checked; nothing needs to be done |
| `DUPLICATE` | Duplicate | Already reported; handled under another report |
| `REFERRED` | Referred | Passed to another authority or department |

## Groups and sub-categories

`group` is stored next to `category` for filtering and is always the
sub-category's group (`INCIDENT_CATEGORY_GROUP`; a CHECK constraint refuses a
mismatch).

| Group | Sub-categories |
|---|---|
| `SAFETY_INDUSTRIAL` Safety & Industrial | `FIRE_HAZARD`, `GAS_LEAK`, `CHEMICAL_SPILL`, `INJURY_NEAR_MISS`, `ELECTRICAL_HAZARD`, `MACHINERY_FAULT`, `PPE_VIOLATION`, `SAFETY_HAZARD` |
| `ADMIN_FACILITY` Admin & Facility | `BUILDING_DAMAGE`, `CLEANLINESS`, `CAFETERIA_HYGIENE`, `WASHROOM`, `WATER_SUPPLY`, `AC_VENTILATION`, `FURNITURE_FIXTURES`, `PEST_CONTROL`, `OTHER` |
| `SECURITY` Security | `UNAUTHORISED_ACCESS`, `THEFT_LOSS`, `CCTV_FAULT`, `GATE_LOCK`, `MISCONDUCT` |
| `IT_TECHNICAL` IT / Technical | `NETWORK_DOWN`, `COMPUTER_PRINTER`, `SOFTWARE_ACCESS`, `TELEPHONE`, `POWER_UPS` |

Labels and one-line hints: `INCIDENT_GROUP_LABEL` / `_HINT`,
`INCIDENT_CATEGORY_LABEL` / `_HINT`.

## Severities

| Code | Label | Tone | Icon (portal / app) |
|---|---|---|---|
| `CRITICAL` | Critical | danger (red) | siren / report |
| `HIGH` | High | pending (amber) | warning triangle |
| `MEDIUM` | Medium (default) | active (blue) | info circle |
| `LOW` | Low | neutral (grey) | down arrow |

Always shown as icon + label, never colour alone. Critical and High are the
"urgent" ones (`URGENT_INCIDENT_SEVERITIES`).

## Confidentiality and anonymity

| | Anonymous | Confidential |
|---|---|---|
| Reporter's name shown to handlers | no (*Anonymous employee*) | no (*Confidential reporter*) |
| Office's branch admins see it | yes | **no** (404, not listed, not counted, not notified) |
| Auditors see it | yes | **no** |
| Head-office admins, super admins, MD / Chairman (`EXECUTIVE`) | yes | yes |
| Lock-screen push | normal | generic ("You have a new report to review") |

- `MISCONDUCT` forces `confidential = true` (on create, on edit, and by a CHECK
  constraint); `confidential: false` for misconduct is `400 CONFIDENTIAL_REQUIRED`.
- Marking a report confidential (edit) hands it to head office: the office's
  admins lose it and head-office admins are told. Taking a report *out* of
  confidential sets `anonymous = true` so the reporter stays hidden, and tells
  the office's branch admins.
- The reporter's user id is never returned to handlers; history entries the
  reporter wrote (submission, problem photos) are shown under the hidden name,
  including entries written before the report became confidential. Admin
  search never matches a hidden reporter.

## Notifications

| Event | To | Title |
|---|---|---|
| New report | office's branch admins + head-office admins (head office only if confidential; super admins if nobody) | `Critical: Gas leak reported at Factory A` · `Urgent: …` (High) · `<Sub-category> reported at <office>` · `New confidential report at <office>` |
| Marked confidential | head-office admins | `New confidential report at <office>` |
| Shared back from confidential | office's branch admins | `<Sub-category> reported at <office>` |
| Each stage change | reporter | `Your report has been acknowledged` · `…is under investigation` · `…has been resolved` · `…was closed as a duplicate` · `…was referred onwards` · `…was closed — no action needed` · `…was reopened` |
| Admin note | reporter | `Update on your report` |

Notifications carry `data: { incidentId, referenceNumber, status }`; both apps
open `/incidents/<id>` on tap. Confidential ones are `sensitive`. A failed
notification never undoes the action.

## API

All under `/api`. Item responses include `viewer: { isReporter, isStaff, canManage, actions }`.

| Endpoint | Who | Notes |
|---|---|---|
| `POST /incidents` | `incident.report` | Multipart: `title`, `category`, optional `group` (must match; `400 CATEGORY_GROUP_MISMATCH`), `description`, `severity` (default `MEDIUM`), `branchId` (defaults to the reporter's office), `locationId`, `locationDetail`, `anonymous`, `confidential` (`"true"`/`"false"`), up to three `photos`. `Idempotency-Key` recommended. |
| `GET /incidents/mine?state=open\|closed\|all&status=&cursor=` | reporter | The caller's own reports; `status` narrows to one stage |
| `GET /incidents/:id` | reporter or staff in scope | Full report: `group`, `resolution`, `confidential`, stage times, photos (signed `url`s), `updates`, `stages`, `reporter` (`null` to handlers when hidden) |
| `POST /incidents/:id/status` | `incident.manage` | `{ status, resolution?, note? }`. `400 RESOLUTION_REQUIRED` (closing without one), `400 REASON_REQUIRED` (non-Resolved resolution without a note), `400 RESOLUTION_NOT_ALLOWED` (resolution on a non-close), `409 INCIDENT_STATE_CONFLICT` (move not allowed now) |
| `POST /incidents/:id/notes` | `incident.manage` | `{ note }` — message the reporter without changing the stage |
| `PATCH /incidents/:id` | `incident.manage` | `{ group?, category?, severity?, confidential? }` — `400 CATEGORY_REQUIRED` (new group without a sub-category in it), `CATEGORY_GROUP_MISMATCH`, `CONFIDENTIAL_REQUIRED`; may return `{ id, movedToHeadOffice: true }` |
| `POST /incidents/:id/photos` | manager (fix photo) or reporter while open | Multipart `photo`; at most three of each kind |
| `GET /incidents/:id/photos/:photoId/content` | reporter or staff in scope | Photo bytes with an auth header |
| `GET /incident-photos/:photoId/content?exp=&sig=` | public, signed | Ten-minute link used in `<img>` / `Image.network` |
| `GET /admin/incidents` | `incident.view` | `status` (`OPEN`, `ALL` or a stage), `group`, `branchId`, `category`, `severity`, `resolution`, `confidential` (`true`/`false`), `q`, `dateFrom`/`dateTo`, `cursor`, `limit` |
| `GET /admin/incidents/summary?branchId=&group=` | `incident.view` | See below |

Viewer actions: managers get `ACKNOWLEDGE` (Reported), `START_INVESTIGATION`
(Reported, Acknowledged), `CLOSE` (any open stage), `REOPEN` (Closed),
`ADD_NOTE`, `EDIT_DETAILS`, `ADD_RESOLUTION_PHOTO` (under three); the reporter
gets `ADD_PHOTO` while it is open and has fewer than three photos.

`stages` on an item is the tracker both apps draw:

```json
[
  { "status": "REPORTED",            "state": "done",    "at": "…", "by": "Farhana Islam" },
  { "status": "ACKNOWLEDGED",        "state": "done",    "at": "…", "by": "Sabina Yasmin" },
  { "status": "UNDER_INVESTIGATION", "state": "skipped", "at": null, "by": null },
  { "status": "CLOSED",              "state": "done",    "at": "…", "by": "Sabina Yasmin", "resolution": "DUPLICATE" }
]
```

`state` is `done`, `current`, `upcoming` or `skipped` (a stage passed over).

### Summary

`GET /admin/incidents/summary?branchId=<uuid>&group=<GROUP>` (both optional)
covers the reports the viewer may see — so a branch admin's figures exclude
confidential reports and other offices, while head office and the MD see
everything. The Executive Dashboard's "recent incident logs" read `recent`.

```json
{
  "counts": { "REPORTED": 5, "ACKNOWLEDGED": 2, "UNDER_INVESTIGATION": 4, "CLOSED": 5 },
  "open": 11,
  "criticalOpen": 1,
  "urgentOpen": 7,
  "byGroupOpen": { "SAFETY_INDUSTRIAL": 2, "ADMIN_FACILITY": 4, "SECURITY": 4, "IT_TECHNICAL": 1 },
  "oldestReportedAt": "2026-10-21T08:15:00.000Z",
  "closedLast30Days": 5,
  "avgHoursToClose": 11.4,
  "recent": [
    {
      "id": "…",
      "referenceNumber": "INC-261021-FCA-004",
      "title": "Exposed wires at the production-floor switchboard",
      "group": "SAFETY_INDUSTRIAL",
      "category": "ELECTRICAL_HAZARD",
      "severity": "HIGH",
      "status": "REPORTED",
      "confidential": false,
      "branch": { "name": "Factory A", "code": "FCA" },
      "createdAt": "2026-10-21T09:35:00.000Z"
    }
  ]
}
```

| Field | Meaning |
|---|---|
| `counts` | Reports per stage, always all four keys in stage order |
| `open` | Reported + Acknowledged + Under Investigation |
| `criticalOpen` | Open and Critical |
| `urgentOpen` | Open and Critical or High |
| `byGroupOpen` | Open reports per group, always all four keys |
| `oldestReportedAt` | Creation time of the oldest report still Reported (nobody has acknowledged it), or `null` |
| `closedLast30Days` | Closed in the last 30 days (any resolution) |
| `avgHoursToClose` | Mean hours from report to close over those, one decimal; `null` if none |
| `recent` | The latest six reports, newest first |

## Data

`incidents` — `group`, `category`, `severity`, `status`, `resolution`,
`confidential`, `anonymous`, `statusNote` (latest message to the reporter),
`statusChangedAt`, `acknowledgedAt`, `investigationStartedAt`, `closedAt`,
office, area, exact spot, reporter. CHECK constraints: stage, severity, group,
sub-category, group-matches-sub-category, resolution, closed-has-resolution,
open-has-no-resolution, acknowledged-has-time, investigation-has-time,
misconduct-is-confidential. Index `("group", "status")`.

`incident_updates` — `SUBMITTED`, `STATUS_CHANGED` (`fromStatus`, `toStatus`,
`metadata.resolution` on a close, `metadata.reopened`), `NOTE_ADDED`,
`PHOTO_ADDED`, `DETAILS_CHANGED` (`metadata` = `{ field: { before, after } }`).
Append-only by trigger.

`incident_photos` — `REPORT` or `RESOLUTION`; bytes in private storage.

## Migration

`20261021000200_incident_stages` moves existing data in one transaction:

| Before | After |
|---|---|
| `PENDING` | `REPORTED` |
| `PROCESSING` | `UNDER_INVESTIGATION`; `investigationStartedAt = processingAt` |
| `DONE` | `CLOSED`, resolution `RESOLVED`; `closedAt = doneAt` |
| `DECLINED` | `CLOSED`, resolution `NO_ACTION_NEEDED`; `closedAt = declinedAt` |
| severity `URGENT` | `CRITICAL` |
| category `ELECTRICAL` | `ELECTRICAL_HAZARD` |
| category `SECURITY` | `GATE_LOCK` |
| — | `group` from the sub-category; `confidential = (category = 'MISCONDUCT')`; `acknowledgedAt` = first handler action (`processingAt`, else `doneAt` / `declinedAt`) for anything past Pending |

`processingAt`, `doneAt` and `declinedAt` are dropped after their data is
copied. `incident_updates.fromStatus/toStatus` are rewritten to the new stage
names (closes gain `metadata.resolution`; old severity and category codes
inside `DETAILS_CHANGED` metadata are translated) with the append-only trigger
disabled for those statements only — the one sanctioned exception, explained
in the migration. Incident inbox items get the new stage name in
`data.status`. `audit_logs` keep their original wording as evidence. The mobile
app also maps the old stage names when it meets them.

## Demo data

Fourteen reports across all four groups, every stage and every resolution —
see [seed-data.md](../seed-data.md#incident--facility-issues).
