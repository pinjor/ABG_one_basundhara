# ABG Dispatch — mobile app (Flutter)

The employee, courier and guest-carrier app for ABG Dispatch. One codebase for
**Android** and **iOS** (and a web build used for previews).

## What it does

| Who | What they get |
|---|---|
| Employee | Book a parcel in four short steps, see incoming/outgoing parcels, confirm handovers, receive parcels (in-app, by scanning the label, or on someone's behalf), notifications |
| Courier / runner | Assigned parcels, scan-to-pickup, sender PIN entry, start transit, checkpoints, mark arrived, receiver code + signature, photo evidence |
| Guest carrier | Phone + SMS code sign-in that shows **only** their own assignments |
| Every employee | The **services menu** on Home, in the group's agreed order — Notice board · Request for Appointment · Incident record · Regulatory Affairs · Audit · Office parcel · Visitor Management · Leave apply · Pool car request — then tours, approvals, scanning (the first eight on screen, the rest behind *See more*; services a role lacks are left out). Module code lives in `lib/modules/<module>/`; see [docs/modules](../../docs/modules/README.md) |
| Employees, heads of department, HR, the executive office | **Leave apply** (balances, apply, HOD → HR approval), **Request for Appointment** (ask the MD / Chairman or a head of department; the PA or the host confirms, proposes or declines), **Audit** (my corrective actions; audit staff record findings and verify fixes) — and one **Approvals** inbox for leave, meetings, pool cars and tours |
| Any employee | **Report an incident** (Home and Profile): kind of problem, title, up to three photos from the camera or gallery, office / area / exact spot, urgency, optionally anonymous. **My reports** shows each report's status (Pending · Processing · Done · Declined), a progress bar, the admin's latest message, photos of the fix and the full history; every change arrives as a notification that opens the report |

Every custody button comes from the server's `viewer.actions` list, so the app
only ever offers what the API will accept; the server re-checks everything.

## Design

Premium navy and platinum, taken from the Anvir Bashundhara Group mark. The
logo's own background colour (`#071225`) is the brand field, so the supplied
logo sits on splash, sign-in and every header without a visible edge.
Tokens live in `lib/theme/tokens.dart` (mirrors `packages/shared/src/tokens.ts`).
Statuses always pair colour with an icon and a label. Touch targets are 48 px
or larger, and text scales with the system setting (clamped at 135%).

Fonts (Inter, Manrope, Noto Sans Bengali) are bundled, so nothing loads from a CDN.

## Run

```bash
flutter pub get
# Android emulator talks to the host API at 10.0.2.2:18491 by default
flutter run
# Any other API:
flutter run --dart-define=API_BASE_URL=https://dispatch-api.abg.com.bd/api
```

Demo accounts (password `Dispatch@2026`): `rahim@abg.com.bd` (sender/receiver),
`farhana.islam@abg.com.bd` (receiver, Factory A), `ABG-4832` Karim Ahmed (runner),
`tanvir.hasan@abg.com.bd` (dispatch officer). Guest carrier: phone `01811223344`;
in development the SMS code is shown on screen. Seeded parcels use handover PIN
`246810`.

### Web preview

```bash
flutter build web --no-web-resources-cdn
bun ../../scripts/serve-mobile-web.ts      # http://localhost:18495, proxies /api
```

## Release builds

```bash
flutter build apk --release --dart-define=API_BASE_URL=…   # or appbundle
flutter build ipa --release --dart-define=API_BASE_URL=…
```

Set your signing config in `android/app/build.gradle.kts` and Xcode before
publishing. Android `minSdk` is 24 (Firebase Messaging and the camera scanner).

### Push notifications (FCM)

Push stays off until the organisation's Firebase project is supplied:

```bash
--dart-define=FCM_API_KEY=… --dart-define=FCM_APP_ID=… \
--dart-define=FCM_SENDER_ID=… --dart-define=FCM_PROJECT_ID=…
```

For iOS, also upload the APNs key in the Firebase console and enable the Push
Notifications capability in Xcode. The API needs `FCM_SERVICE_ACCOUNT_JSON`.
Highly confidential parcels never show their title on the lock screen.

## Offline

Pickup confirmation, transit, checkpoints, arrival, receipt and exceptions work
without signal. Each is stored with an idempotency key and the phone's
timestamp, shown as "waiting to sync", and replayed when the connection
returns. The server's clock remains the official time, and a replay that conflicts
with what happened meanwhile is shown to the user instead of being dropped
(`lib/core/offline_queue.dart`).

## Languages

English and Bangla. Edit `tool/generate_arb.py` (one table for both languages),
then run:

```bash
python3 tool/generate_arb.py lib/l10n && flutter gen-l10n
```

## Checks

```bash
flutter analyze
flutter test
```
