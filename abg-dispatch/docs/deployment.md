# Deployment

## Requirements

| For | Needs |
|---|---|
| API & portal (development) | [Bun](https://bun.sh) 1.4+, PostgreSQL 16 |
| Containers | Docker 24+ with Compose v2 |
| Mobile | Flutter 3.24+ (tested on 3.47), Android SDK (minSdk 24) / Xcode 16 |

## Local development

```bash
cd abg-dispatch
bun install
bun run build:shared                 # compile packages/shared once (and after changing it)

# Database: any PostgreSQL 16. With Docker:
cp .env.docker.example .env          # fill in the secrets (any random values work locally)
docker compose up -d postgres        # 127.0.0.1:18434

cp apps/api/.env.example apps/api/.env
# set DATABASE_URL to match, e.g. postgresql://abg:<POSTGRES_PASSWORD>@localhost:18434/abg_dispatch?schema=public

bun run db:migrate                   # prisma migrate deploy (tables + ledger triggers)
bun run db:seed                      # demo data — see docs/seed-data.md

bun run dev                          # API on :18491 (watch) + portal on :18490 (Vite, proxies /api)
```

Open http://localhost:18490 and sign in as `arif.chowdhury@abg.com.bd` /
`Dispatch@2026`. In development, MFA is optional and one-time codes are shown
on screen (`EXPOSE_DEV_OTP=true`).

Mobile: see [apps/mobile/README.md](../apps/mobile/README.md). The Android
emulator reaches the host API at `10.0.2.2:18491` by default; pass
`--dart-define=API_BASE_URL=…` for anything else.

## Docker (API + portal + PostgreSQL)

```bash
cd abg-dispatch
cp .env.docker.example .env          # generate every secret (commands are in the file)
docker compose up -d --build
docker compose exec api bun prisma/seed.ts     # optional demo data
```

| Service | Image | Port | Notes |
|---|---|---|---|
| `postgres` | postgres:16-alpine | 127.0.0.1:18434 | Volume `abg_postgres` |
| `api` | `apps/api/Dockerfile` | 18491 | Runs `prisma migrate deploy` on start, then `node dist/main.js`. Non-root. Attachments on volume `abg_storage`. Health check on `/api/health`. |
| `admin` | `apps/admin/Dockerfile` | 18490 | nginx serving the portal and proxying `/api` (SSE unbuffered) with CSP and security headers |

The compose file defaults to **production mode**: secrets are required, admin
MFA is enforced on first sign-in, and one-time codes are not exposed. For a
throwaway demo you can set `NODE_ENV=development` and `EXPOSE_DEV_OTP=true` in
`.env`.

Build notes:

- Base images are build arguments (`NODE_BUILD_IMAGE`, `NODE_RUNTIME_IMAGE`,
  `NGINX_IMAGE`, `POSTGRES_IMAGE`), so a registry mirror can be used when
  Docker Hub is rate-limited.
- The images install no OS packages, so builds don't depend on apt/apk
  mirrors. Behind a TLS-inspecting proxy, set `EXTRA_CA_FILE=/path/to/ca.pem`
  in `.env`: the CA is passed to the build as a secret and never stored in
  an image.

## Production topology

```
Internet ──TLS──▶ load balancer / edge proxy ──▶ admin (nginx) ──▶ api ──▶ PostgreSQL (managed, private)
   mobile apps ──TLS──▶ same edge, /api ───────────────────────┘      └──▶ private volume or object storage
```

1. **TLS at the edge** (HSTS is already sent by the API). Expose only the
   portal origin and `/api`; keep PostgreSQL and the API port private.
2. **Database**: managed PostgreSQL 16 with automated backups and
   point-in-time recovery. The application user needs DML plus the migration
   step's DDL; you can run migrations with a separate, more privileged user.
3. **Storage**: mount a persistent, backed-up volume at `STORAGE_DIR`.
   Attachments are served only through the API with short-lived signed links.
4. **Secrets** from your secret manager into the API environment: `JWT_SECRET`,
   `APP_ENCRYPTION_KEY`, `OTP_PEPPER`, `DATABASE_URL`, FCM service account,
   SMS key, courier webhook secrets and API tokens. The API refuses to start in
   production with development defaults.
5. **One scheduler**: if you run several API instances, set
   `SLA_INTERVAL_SECONDS=0` on all but one (triggers are unique in the
   database, so overlap is harmless but wasteful), and move the rate limits
   to the gateway.
6. **Upgrades**: deploy the new image; it applies pending migrations before
   serving. Migrations are additive; the ledger is never rewritten.

## Configuration reference

Full list with comments: [`apps/api/.env.example`](../apps/api/.env.example)
(development) and [`.env.docker.example`](../.env.docker.example) (compose).

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection |
| `JWT_SECRET` | Token signing (32+ random characters) |
| `APP_ENCRYPTION_KEY` | 32 bytes base64 — encrypts TOTP secrets at rest |
| `OTP_PEPPER` | Keyed hash for one-time codes |
| `CORS_ORIGINS` | Portal origin(s) |
| `PUBLIC_QR_BASE_URL` | Base URL printed in QR labels (`…/q/<token>`) |
| `REQUIRE_ADMIN_MFA` | TOTP for branch/HO admins, auditors and super admins (default on in production) |
| `EXPOSE_DEV_OTP` | Development only — must be `false` in production |
| `STORAGE_DIR` | Private attachment storage |
| `SLA_INTERVAL_SECONDS` | SLA engine cadence (0 disables) |
| `ACCESS_TOKEN_TTL_SECONDS`, `REFRESH_TOKEN_TTL_DAYS`, `GUEST_SESSION_TTL_HOURS` | Session lifetimes |
| `FCM_PROJECT_ID`, `FCM_SERVICE_ACCOUNT_JSON` | Push notifications |
| `SMS_PROVIDER`, `SMS_HTTP_URL`, `SMS_API_KEY`, `SMS_SENDER_ID` | SMS gateway |
| `PATHAO_* / REDX_* / STEADFAST_* / GENERIC_COURIER_WEBHOOK_SECRET` | Courier webhook secrets and API tokens |

## Integrations

- **Push (FCM).** Create a Firebase project, add the Android and iOS apps,
  upload the APNs key, give the API a service account with the *Firebase
  Cloud Messaging API* role, and build the apps with the `FCM_*` defines
  (see the mobile README).
- **SMS.** Set `SMS_PROVIDER=http` and point `SMS_HTTP_URL` at your gateway;
  the API POSTs `{ to: "8801…", from: SMS_SENDER_ID, text }` with
  `Authorization: Bearer SMS_API_KEY`. Adapting to a specific Bangladeshi gateway is one small class
  in `src/notifications/sms.service.ts`.
- **Couriers.** In the portal (*Offices & rules → Courier companies*) enable a
  provider, then register `https://<your-domain>/api/webhooks/couriers/<CODE>`
  with the provider and set its secret in the environment. Integrations
  shows webhook health and the last 24 h of events.

## Mobile release

```bash
cd apps/mobile
flutter build appbundle --release --dart-define=API_BASE_URL=https://dispatch.abg.com.bd/api [FCM defines]
flutter build ipa --release       --dart-define=API_BASE_URL=https://dispatch.abg.com.bd/api [FCM defines]
```

Configure signing in `android/app/build.gradle.kts` and Xcode. Distribute
through managed Google Play / Apple Business Manager (or MDM) to employees;
guest carriers can use the same app with phone sign-in.

## Backups and retention

Back up PostgreSQL (daily full + WAL) and the storage volume together — the
ledger references attachments by key. The ledger and audit log are
append-only by design; archive rather than delete. Test a restore quarterly.
