# Design system

Premium navy and platinum, taken from the Anvir Bashundhara Group mark: a
metallic silver "ABG" on deep midnight navy. The logo's own background colour
(`#071225`, sampled from the supplied file) is the brand field, so the logo sits
on splash, sign-in, headers, the portal sidebar, printed labels and report
headers with no visible edge.

Tokens are defined once in [`packages/shared/src/tokens.ts`](../packages/shared/src/tokens.ts)
and mirrored in `apps/mobile/lib/theme/tokens.dart` and `apps/admin/tailwind.config.js`.

## Colour

| Token | Hex | Use |
|---|---|---|
| midnight | `#071225` | Brand field: splash, sidebar, hero bands, label and report headers |
| navy | `#0C1727` | Primary text, primary buttons |
| deepNavy | `#142238` | Hover, hero gradient |
| navy700 / navy500 | `#1E2E48` / `#33466A` | Secondary surfaces on navy, muted icons |
| platinum | `#CAD0D8` | Active navigation, metallic accents, avatar |
| platinumBright | `#EEF1F5` | Soft fills, chips |
| platinumDeep | `#9AA4B2` | Secondary text on navy |
| silver | `#E7EBF0` | Dividers on light |
| surface | `#F7F9FC` | Page background |
| white | `#FFFFFF` | Cards |

A platinum gradient (`#F4F6F9 → #CAD0D8 → #E9EDF2 → #AEB6C2`) is used sparingly
for the one call-to-action card on the mobile home screen ("Send a parcel").

### Status colours (meaning only)

| Tone | Colour / soft | Statuses |
|---|---|---|
| Active | `#2F6FED` / `#E8F0FE` | Picked Up, In Transit, Return In Transit |
| Pending | `#B7791F` / `#FDF3E1` | Booked, Awaiting Pickup, Arrived, **Pending Receipt** |
| Success | `#1F8A5B` / `#E3F4EC` | Received |
| Danger | `#C93C3C` / `#FBE9E9` | On Hold, Exception, Delivery Failed, Return Requested, overdue |
| Neutral | `#6B7588` / `#EEF1F5` | Draft, Returned, Cancelled |

Status is **never colour alone**: every badge carries an icon and the shared
label (`STATUS_LABEL`), the same words on mobile, portal, notifications and
reports. Pending Receipt deliberately uses the *pending* tone, not success:
arrived is not received.

### Charts

Charts follow one mark specification: bars ≤ 24 px with a 4 px rounded data
end and square baseline, 2 px lines, ≥ 8 px markers with a white ring, hairline
gridlines, a single y-axis, values and labels in text colours (never the
series colour), a legend whenever there are two or more series, a hover
tooltip, and a hidden data table for screen readers. The categorical series
order is fixed — `#2a78d6`, `#eb6834`, `#1baf7a` — and was validated for
colour-vision deficiency and contrast; the third hue is below 3:1 against
white, so it is only used where its value is also printed. Status colours are
never reused as series colours.

## Typography

| Role | Face | Notes |
|---|---|---|
| Display / headings | Manrope 700–800 | Tight tracking for titles |
| Body / UI | Inter 400–700 | Numbers in tables use tabular figures |
| Bangla | Noto Sans Bengali | Bundled in the app |
| Tracking IDs | Inter semibold, tabular, letter-spaced | `ABG-261020-HO-00428` |

All fonts are bundled (no CDN). The mobile app clamps system text scaling at
135 % so layouts hold; the portal uses relative sizes throughout.

## Components

- **Status badge** (icon + label + tone), **priority badge** (only when not
  Normal; flame icon for Urgent/Critical), **classification tag** (lock; a navy
  shield tag for Highly Confidential), **overdue tag**.
- **Custody stepper** — Booked → Awaiting Pickup → Picked Up → In Transit →
  Arrived → Received, with times; the current step outlined, done steps filled.
- **Ledger timeline** — numbered events with actor, location, verification
  pill and "view proof"; corrections annotate, never replace.
- **KPI tile** — icon, value (sans, proportional figures), label, one-line
  hint; links to the matching filtered list.
- **Action list** — built from `viewer.actions`; custody actions as full-width
  buttons (first one primary), administration actions as a quieter list,
  destructive ones in red.
- **Sheets & dialogs** — every action that changes custody confirms what will
  happen ("Arrival is not receipt…") and asks for a reason where the ledger
  needs one.

## Accessibility

- Touch targets ≥ 48 px on mobile; focus outlines on every interactive element
  in the portal.
- Text and icons meet WCAG AA on their backgrounds; meaning is never
  conveyed by colour alone.
- Screen-reader labels on icon buttons, live regions for toasts, semantic
  tables, and data tables behind charts.
- Dates and times always in Asia/Dhaka with explicit formats; Bangla locale
  formats numbers and dates natively.

## Voice

Short, plain, specific. Say what happened and what to do next: *"Arrived at
Factory A reception — waiting for Farhana Islam to confirm receipt."* Errors
say why and how to fix: *"This parcel cannot be received because it has not
reached the destination."* One vocabulary everywhere — no synonyms for
statuses.
