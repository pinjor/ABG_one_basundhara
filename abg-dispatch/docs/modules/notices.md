# Official Notice Board

The executive broadcast channel of ABG ONE. The Chairman, the Managing
Director, HR, administration, compliance and IT publish notices on their own
channels; everyone they are addressed to is told at once, reads them on the
board (urgent ones highlighted and first), opens the attached PDF, and — when
asked — taps **I have read and understood**, so the sender sees exactly who
has read and acknowledged what.

| Layer | Where |
|---|---|
| Domain vocabulary | `packages/shared/src/notices.ts` (+ `notices.test.ts`) |
| Database | `Notice`, `NoticeReceipt` in `apps/api/prisma/schema.prisma` (migration `20261021000100_abg_one_modules`; no further migration needed) |
| API | `apps/api/src/notices/` — `notices.controller.ts`, `notices.service.ts`, `notices.dto.ts` |
| Demo data | `apps/api/prisma/seed-modules/notices.ts` (`seedNotices`, plus `buildNoticePdf`) |
| API tests | `apps/api/test/notices.test.ts` |
| Admin portal | `apps/admin/src/pages/notices/` — `NoticesPage` (`/notices`), `NoticeDetailPage` (`/notices/:id`) |
| Mobile | `apps/mobile/lib/modules/notices/notices.dart` — `NoticesScreen` (`/notices`), `NoticeDetailScreen` (`/notices/:id`) |
| Mobile strings | `apps/mobile/tool/strings/notices.py` (keys prefixed `nb`) |
| Mobile tests | `apps/mobile/test/notices_test.dart` |

## Vocabulary

- **Channel** — who the notice is from: `CHAIRMAN`, `MANAGING_DIRECTOR`, `HR`,
  `ADMINISTRATION`, `COMPLIANCE`, `IT`.
- **Category** — `GENERAL`, `CIRCULAR`, `POLICY`, `HR`, `SAFETY`, `EVENT`, `HOLIDAY`.
- **Status** — `DRAFT` → `PUBLISHED` → `ARCHIVED`. Drafts can also be discarded.
- **Audience** — `ALL` (everyone in the group) or `BRANCHES` (people whose
  home office is in `branchIds`). The author is never part of their own
  audience: they are not notified, not counted and never "pending".
- **Reference** — `ABG-NB-YYYY-NNN` from `nextSequence(tx, "NB", year)`
  (Dhaka year), assigned when the notice is first saved, draft or not.
- **Urgent** — red highlight everywhere (accent bar, solid badge with an
  icon), sorted straight after pinned notices, `Urgent notice:` push title.
- **Pinned** — stays at the top of the board.
- **Acknowledgement** — when `requiresAcknowledgement` is on, readers confirm
  they have read and understood it. Opening a notice always records a read.

## Who may do what

| Capability | Roles | Gives |
|---|---|---|
| `notice.read` | every employee role and auditors | the board, opening and acknowledging notices addressed to them |
| `notice.publish` | EXECUTIVE, HR_FINANCE, COMPLIANCE_OFFICER, BRANCH_ADMIN, HEAD_OFFICE_ADMIN | posting on their channels, changing their own notices, their receipts report |
| `notice.manage` | EXECUTIVE, HEAD_OFFICE_ADMIN (and super admin) | seeing, changing and archiving every notice, every receipts report |

Channel rules (`NOTICE_CHANNEL_ROLES`, `noticeChannelsFor`; super admin may
use every channel):

| Channel | Roles |
|---|---|
| Chairman, Managing Director | EXECUTIVE only |
| Human Resources | HR_FINANCE, HEAD_OFFICE_ADMIN |
| Administration | HEAD_OFFICE_ADMIN, BRANCH_ADMIN |
| Compliance | COMPLIANCE_OFFICER, HEAD_OFFICE_ADMIN |
| IT | HEAD_OFFICE_ADMIN |

A person whose only route to a channel is an office-scoped role (branch
admin, `noticeChannelIsOfficeOnly`) must address `BRANCHES` and only offices
in their `scopedBranchIds`. Breaking a channel rule is `403
NOTICE_CHANNEL_FORBIDDEN`; an audience rule `403 NOTICE_AUDIENCE_FORBIDDEN`.
The rules are checked on create, on every draft edit and again on publish
(against whoever publishes).

Visibility: a reader sees a notice only when it is `PUBLISHED` and addressed
to them; the author and `notice.manage` holders see it in any state. Anything
else is `404 NOTICE_NOT_FOUND`, so ids cannot be probed. An expired notice
leaves the board and lists but stays readable from a link (it can no longer be
acknowledged); an archived one is gone for readers.

## API (`/api`)

### Reading — `notice.read`

| Endpoint | Notes |
|---|---|
| `GET /notices?category&channel&q&unread=true&cursor&limit` | The board: published, not expired, addressed to the caller. Order: pinned, urgent, newest (keyset cursor over all four). Rows: `{ id, referenceNumber, title, excerpt (≤ 180 chars), channel, category, urgent, pinned, signedBy, publishedAt, expiresAt, hasAttachment, requiresAcknowledgement, read, acknowledged, awaitingAcknowledgement, isAuthor }`. `limit` defaults to 20 (max 50) — `?limit=5` feeds the home banner carousel and the dashboard's announcements. |
| `GET /notices/unread-count` | `{ unread, toAcknowledge, urgentUnread }` over the live board (own notices excluded). |
| `GET /notices/:id` | Full notice; **marks it read** for audience members and clears their notification for it. Adds `body`, `audience`, `branches[]`, `author`, `status`, `expired`, `attachment { name, mimeType, sizeBytes, url }`, `attachmentUrl`, the caller's `receipt`, `counters` (author and managers only, else `null`) and `viewer { isAuthor, canManage, inAudience, actions }`. |
| `POST /notices/:id/acknowledge` | Idempotent (the first time is kept). `409 NOTICE_ACK_NOT_REQUIRED`, `NOTICE_ACK_NOT_NEEDED` (author), `NOTICE_EXPIRED`. Auditors may acknowledge. |

`viewer.actions`: `ACKNOWLEDGE`, `EDIT`, `PUBLISH`, `ARCHIVE`, `DISCARD`,
`REPLACE_ATTACHMENT`, `VIEW_RECEIPTS` (`NoticeAction` in shared).

### Publishing — `notice.publish`

| Endpoint | Notes |
|---|---|
| `POST /notices` | Multipart (or JSON when there is no file): `title`, `body`, `channel`, `category`, `urgent`, `pinned`, `audience`, `branchIds` (repeated field, JSON array or comma list), `requiresAcknowledgement` (default true), `signedBy` (default "Name, designation"), `expiresAt`, `publish`, and an optional `attachment` PDF ≤ 15 MB, judged by content (`NOTICE_ATTACHMENT_TYPE`, `NOTICE_ATTACHMENT_TOO_LARGE`). `Idempotency-Key` honoured. 201 with the full notice, `DRAFT` or `PUBLISHED`. |
| `PATCH /notices/:id` | Author or manager. Drafts: every field, plus `removeAttachment`. Published: only `pinned`, `urgent`, `expiresAt` (null clears it); any other change is `409 NOTICE_STATE_CONFLICT` with `details.fields`. Archived: 409. |
| `POST /notices/:id/publish` | Drafts only (409 otherwise); re-checks channel, audience and expiry; notifies the audience. |
| `POST /notices/:id/archive` | Published only; takes it off the board and unpins it. |
| `DELETE /notices/:id` | Discard a draft. |
| `POST /notices/:id/attachment` | Drafts only: replace the PDF (multipart `attachment`). Old signed links stop working. |
| `GET /admin/notices?status=PUBLISHED\|DRAFT\|ARCHIVED\|ALL&channel&category&q&cursor&limit` | Own notices (`scope: "MINE"`), every notice for managers (`"ALL"`). Rows add `status, audience, branches, author, createdAt, updatedAt, archivedAt, expired, counters { audienceSize, readCount, acknowledgedCount, acknowledgedPct, readPct }`; the response adds `counts` per status. |
| `GET /admin/notices/:id/receipts?state=acknowledged\|read\|pending&q&cursor&limit` | Author or manager (404 otherwise). People with `name, employeeCode, designation, department, office, readAt, acknowledgedAt`. `pending` = audience members who have not acknowledged (or, when no acknowledgement is asked, not opened) — alphabetical; the other states newest first. `counts { audience, acknowledged, read, pending }`; `read` means opened but not acknowledged. |

### Dashboard summary — `GET /admin/notices/summary` (`notice.read`)

```json
{
  "published": 9,
  "urgentActive": 2,
  "drafts": 1,
  "avgAcknowledgedPct": 64,
  "latest": [
    { "id": "…", "referenceNumber": "ABG-NB-2026-012", "title": "…", "channel": "MANAGING_DIRECTOR",
      "category": "CIRCULAR", "urgent": true, "pinned": false, "publishedAt": "…",
      "requiresAcknowledgement": true, "acknowledgedPct": 41, "readPct": 77 }
  ]
}
```

`published` and `urgentActive` count live notices (published, not expired);
`avgAcknowledgedPct` averages the live notices that ask for acknowledgement
(`null` when there are none); `latest` is the five most recent live notices.
Scope: managers see every notice, other publishers their own, everyone else
what is addressed to them (`drafts` is then 0).

### Attachments

The PDF is served only through a ten-minute HMAC link issued with the notice:
`GET /api/notice-attachments/:id/content?exp&sig` (public route). The
signature covers the notice id, the stored file key and the expiry, so
replacing a draft's PDF retires old links. Responses are `application/pdf`,
`Content-Disposition: inline`, `nosniff`, and may be framed by the portal
only (`Content-Security-Policy: frame-ancestors 'self'` plus `CORS_ORIGINS`;
no `X-Frame-Options`). Expired links are `401 LINK_EXPIRED`, forged ones
`401 LINK_INVALID`. In production the portal's nginx serves
`/api/notice-attachments/` with `X-Frame-Options: SAMEORIGIN` and
`frame-ancestors 'self'` (every other path keeps `DENY`), and accepts
uploads up to 16 MB.

### Notifications and audit

Publishing notifies every active person in the audience (author excluded)
through `NotificationService.deliverModule` — in-app row first, then push —
with `data.route = /notices/<id>`. Title: `Urgent notice: <title>` or
`New notice: <title>`; body: channel and the opening of the text, plus
"Please read and acknowledge." Category `ACTION_REQUIRED` when acknowledgement
is required, otherwise the "Updates" category. A failed notification never
undoes the publish. The audit log records `notice.published`,
`notice.archived`, `notice.updated` (changes after publishing) and
`notice.discarded`.

## Admin portal

- **Notice board** (`/notices`): channel chips (All, Chairman, Managing
  Director, Human Resources, Administration, Compliance, IT), search, and for
  publishers status tabs (Published / Drafts / Archived / My board) with
  counts. Cards show the channel and signatory, category, a pinned marker,
  the **urgent highlight** (red accent bar, tinted card, solid badge with an
  icon) and, for publishers, the **acknowledgement counter** ("184 / 240
  acknowledged" with a progress bar; "opened" when no acknowledgement is
  asked). Readers see an unread dot and their acknowledgement state.
  Figures at the top: live notices, urgent, average acknowledged and drafts
  (publishers) or unread / to acknowledge / urgent unread (readers).
- **Post a notice**: title, text with a live letterhead preview, channel
  limited to the user's channels, category, urgent, pin, acknowledgement,
  audience (everyone or chosen offices; branch admins only their own),
  signatory, expiry (Asia/Dhaka) and a PDF (checked to be a PDF before
  upload). Save draft or Publish. `/notices?new=1` (the Executive
  Dashboard's quick action) opens it for publishers; closing clears the
  parameter.
- **Notice** (`/notices/:id`): the notice as a letter on an ABG letterhead,
  red urgent band, signature block, the PDF with **Preview** (full-height
  modal with a frame, download and open in a new tab; a fresh signed link
  every time) and Download; "I have read and understood" with a confirmation
  step; acknowledgement counter; details; and the **receipts report** with
  Acknowledged / Read / Pending tabs, counts, search and paging. Publish,
  edit (draft: everything; published: pin, urgency, expiry), archive and
  discard follow `viewer.actions`. Works at 390 px.

## Mobile

- **NoticesScreen** (`/notices`): navy header with the unread and
  waiting-for-acknowledgement counts (tap to show unread only), channel
  chips, cards with the urgent badge and red accent, pinned marker, unread
  dot and "New", category, PDF marker and acknowledgement state; pull to
  refresh and infinite scroll.
- **NoticeDetailScreen** (`/notices/:id`): letterhead header, urgent band,
  channel and category, title, audience and expiry, the text in paragraphs,
  signature, the PDF (opened in the phone's PDF viewer through
  `url_launcher`, external application, with a freshly signed link) and the
  **I have read and understood** button with a confirmation dialog and a
  confirmed state afterwards.

All strings are in English and Bangla (`tool/strings/notices.py`).

## Demo data

`seedNotices` writes nine notices with realistic receipts (deterministic, so
every reseed looks the same):

| Notice | Channel | Notes |
|---|---|---|
| A message from the Chairman: one group, one standard | Chairman | pinned, everyone, acknowledgement |
| Foreign travel requires MD / Chairman sanction | Managing Director | policy, everyone, acknowledgement, PDF circular |
| Durga Puja and Victory Day holidays | HR | holiday, PDF schedule, expires mid-December |
| Safety circular: LPG cylinder handling at Factory A and Factory B | Administration | **urgent**, Factory A + B only, acknowledgement |
| Two-factor sign-in becomes mandatory for administrators | IT | everyone, expires in a month |
| Factory A canteen: new opening hours | Administration (Sabina Yasmin) | Factory A only |
| Reminder: licence display and fire-drill records | Compliance | everyone, acknowledgement |
| Winter uniform and blanket distribution | HR | draft |
| Annual Sports Day 2026: registrations open | HR | archived |

The PDFs are generated in code (`buildNoticePdf`: A4, letterhead, wrapped
text, page numbers). Demo personas: Md. Rahim (head office) has the Chairman's
message acknowledged, the MD circular read but not acknowledged, and the IT
and compliance notices unread; Farhana Islam (Factory A) has the urgent LPG
circular and the canteen notice waiting; Imran Hossain (Factory B) has
acknowledged the LPG circular. The Chairman's, MD's, LPG and canteen notices
also sit in people's notification inboxes.

## Tests

`apps/api/test/notices.test.ts` (15): seeded board; publish → audience
notified (route, urgent title, author excluded) → read on open → acknowledge
(idempotent, auditors too) → counters; receipts report with acknowledged /
read / pending, search and paging; branch audience visibility (404 for other
offices); channel and audience rules; drafts invisible until published, once;
edit rules after publishing; archive; PDF only, signed link valid / forged /
expired, replacing a draft's PDF; unread counts; board order and paging;
publisher vs manager lists; summary numbers; Idempotency-Key.
`packages/shared/src/notices.test.ts` covers the channel rules and text
helpers; `apps/mobile/test/notices_test.dart` the models, cards (urgent,
unread, Bangla) and the detail's acknowledgement states.
