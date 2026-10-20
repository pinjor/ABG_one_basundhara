# Production security checklist

Tick every item before go-live. Items marked **(built in)** are already
enforced by the code and only need verifying; the rest are deployment
decisions.

## Secrets and configuration

- [ ] `NODE_ENV=production`. **(built in)** The API refuses to start with the
      development JWT secret, without `APP_ENCRYPTION_KEY` / `OTP_PEPPER`, with
      `EXPOSE_DEV_OTP=true`, or without `CORS_ORIGINS`.
- [ ] `JWT_SECRET` (48+ random bytes), `APP_ENCRYPTION_KEY` (32 bytes),
      `OTP_PEPPER` and the database password are unique per environment and
      come from a secret manager, never from the repository or an image.
- [ ] `EXPOSE_DEV_OTP=false`, `REQUIRE_ADMIN_MFA=true`.
- [ ] `CORS_ORIGINS` lists only the portal origin(s).
- [ ] Courier API tokens and webhook secrets are set per provider; the portal
      refuses secrets in provider settings. **(built in)**
- [ ] The mobile apps contain no secrets — only the API URL and the public
      Firebase client config. **(built in)**

## Network

- [ ] TLS 1.2+ everywhere; HTTP redirects to HTTPS at the edge. The API sends
      HSTS. **(built in)**
- [ ] PostgreSQL and the API's own port are not reachable from the internet;
      only the edge → portal/nginx → API path is.
- [ ] Rate limits are applied at the gateway too when running more than one
      API instance (the in-process limits — sign-in 10/min, guest codes
      5/min, … per IP — are per instance).
- [ ] The edge passes `X-Forwarded-For`; the API trusts exactly one proxy hop
      (`trust proxy = 1`) so audit IPs are real.
- [ ] Courier webhook endpoints are reachable only from providers' published
      IP ranges where they offer them.

## Identity and sessions

- [ ] Admins, auditors and super admins have enrolled TOTP (the portal forces
      enrolment before any administrative call). **(built in)**
- [ ] Super admin accounts are named people, few, and reviewed quarterly.
- [ ] Seeded demo accounts and the `Dispatch@2026` password do not exist in
      production — **do not run the seed script there**.
- [ ] Leavers: HR status `INACTIVE`/`TERMINATED` (or *Deactivate*) revokes all
      sessions and push tokens immediately. **(built in)** Connect the HR CSV
      import or an HRIS sync so this happens on the day.
- [ ] Session lifetimes fit policy (access 15 min, refresh 30 days, guest
      12 h by default). Password change and reset sign out other devices.
      **(built in)**
- [ ] Account lockout after 5 failed sign-ins for 15 minutes; handover PIN
      lockout after 5; OTP 5 attempts / 5 minutes, single use, hashed.
      **(built in)**

## Authorisation and data

- [ ] Object-level checks on every parcel read and action; unrelated users
      get 404. **(built in, tested)** Re-run `bun run test` against staging
      data shape before go-live.
- [ ] Role scopes are correct: dispatch officers and branch admins are scoped
      to their offices.
- [ ] Classification is taught to staff: *Highly confidential* hides the
      title from operations, push notifications and labels. **(built in)**
- [ ] The ledger, proofs and audit log are append-only at the database level.
      **(built in)** The application's database user should not own the
      tables in production, so the triggers cannot be dropped by the app.
- [ ] Attachments: type sniffed from content, 10 MB limit, stored outside the
      web root with random names, served only via authorised or short-lived
      signed links. **(built in)** Add antivirus scanning on the storage
      volume if documents come from outside the group.
- [ ] Directory phone numbers are masked for people without operations
      reach, and auditors see masked numbers and no employee codes in
      timelines. **(built in)**

## Portal and API hardening

- [ ] nginx sends CSP (`script-src 'self'`, no inline scripts, no third-party
      origins), `X-Frame-Options: DENY`, `nosniff`, referrer and permissions
      policies. **(built in)** Keep the CSP strict when customising.
- [ ] The portal keeps tokens in session storage (cleared when the tab
      closes) and never puts them in URLs; downloads use authorised fetches.
      **(built in)**
- [ ] Request bodies are validated with whitelisting (unknown fields
      rejected). **(built in)**
- [ ] Error responses never carry stack traces (server errors are logged,
      clients get `{ statusCode, code, message }`). **(built in)**
- [ ] Dependencies are scanned (e.g. `bun audit` / Dependabot) and base images
      rebuilt monthly.

## Monitoring and response

- [ ] Alert on: API health check failures, SLA engine not running
      (Integrations page shows the last run), notification delivery failures,
      courier webhook signature failures, spikes in `auth.login_failed` /
      `auth.account_locked`.
- [ ] Audit log reviewed monthly by the internal auditor: privileged sign-ins,
      role changes, corrections, exports.
- [ ] Backups (database + attachment storage) are encrypted, off-site, and a
      restore is tested quarterly.
- [ ] An incident runbook names who can revoke sessions, rotate
      `JWT_SECRET` (signs everyone out) and disable a courier integration.

## Mobile

- [ ] Release builds are signed; distributed through managed Play / Apple
      Business Manager or MDM.
- [ ] Tokens are stored in the platform keystore/keychain
      (`flutter_secure_storage`). **(built in)**
- [ ] The production API URL uses HTTPS (`--dart-define=API_BASE_URL=https://…`).
- [ ] Lock-screen notification text has been checked on a real device for a
      Highly Confidential parcel.
