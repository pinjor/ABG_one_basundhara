# ABG ONE modules — how a module is built

ABG ONE grew out of ABG Dispatch (parcels). Each further module — official
tours, pool cars, visitors, licences, notices, incidents — follows the same
shape across the API, the admin portal and the mobile app, so they feel like
one product and can be maintained the same way. The incident reports module
(`apps/api/src/incidents`, `apps/admin/src/pages/Incident*.tsx`,
`apps/mobile/lib/screens/*incident*`) is the reference implementation.

## Files a module owns

| Layer | Path |
|---|---|
| Domain vocabulary | `packages/shared/src/<module>.ts` — statuses, transitions, labels, tones, limits, reference-number format |
| Database | its models in `apps/api/prisma/schema.prisma`; migrations in `apps/api/prisma/migrations` |
| API | `apps/api/src/<module>/` — `<module>.service.ts`, `<module>.controller.ts`, `<module>.dto.ts` (registered in `app.module.ts`) |
| Demo data | `apps/api/prisma/seed-modules/<module>.ts` (`seed<Module>(ctx)`, called from `seed.ts`) |
| API tests | `apps/api/test/<module>.test.ts` |
| Admin portal | `apps/admin/src/pages/<module>/` — `index.tsx` exports the pages `App.tsx` routes to |
| Mobile | `apps/mobile/lib/modules/<module>/` — `<module>.dart` exports the screens `router.dart` routes to |
| Mobile strings | `apps/mobile/tool/strings/<module>.py` (English and Bangla, both required) |
| Mobile tests | `apps/mobile/test/<module>_test.dart` |
| Documentation | `docs/modules/<module>.md` |

## API conventions

- **Authorisation in two layers.** A capability on the route
  (`@RequireCapability(Capability.X)` from `auth/decorators`) and an
  object-level check in the service. Anything the caller may not see is a
  404 with the module's not-found message, never a 403, so ids cannot be
  probed. Office scope: `moduleScope(actor, orgWideRoles)` from
  `admin/admin-scope.ts` (null = every office).
- **Actor.** `@CurrentActor() actor: Actor`, then `asUser(actor)` (guests are
  refused). `UserActor` has `userId`, `displayName`, `employeeId`,
  `branchId`, `departmentId`, `roles`, `capabilities`, `scopedBranchIds`.
- **Status changes** follow the transition table in shared, take a row lock
  (`SELECT … FOR UPDATE` inside `prisma.$transaction`), and return `409` with
  a `<MODULE>_STATE_CONFLICT` code when the move is no longer allowed.
- **History** goes to the module's append-only table (a database trigger
  refuses UPDATE/DELETE) with an actor-name snapshot; administrative changes
  also go to the audit log (`AuditService.record`).
- **Reference numbers** come from `nextSequence(tx, key, period)` in
  `common/sequence.ts` (row-locked counter) and the formatter in shared.
- **Notifications** use `NotificationService.deliverModule({ module, id,
  reference, route, status? }, dedupeBase, eventType, drafts, { sensitive? })`.
  `route` is the mobile path that opens the item (`/pool-car/<id>`); both apps
  open it on tap. Find recipients with `usersWithRoles(roles, branchIds?)`.
  A notification failure never undoes the action.
- **Responses** for one item include `viewer: { actions: string[] }` — the
  actions this caller may take now. The apps show only those buttons; the API
  re-checks everything.
- **Lists** use keyset pagination (`common/pagination.ts`):
  `{ items, nextCursor }`.
- **Files** (scans, PDFs, photos) are sniffed by content (`sniffMime`), capped
  in size, stored with `StorageService.put`, and served either with an auth
  header or through a short-lived HMAC-signed link (`hmacSha256` with the JWT
  secret, as `incidents` does for photos).
- **Admin summary** for the Executive Dashboard: `GET /admin/<module>/summary`
  returning small counts (see each module's doc).
- **Errors** use `common/errors.ts` (`badRequest`, `conflict`, `forbidden`,
  `notFound`) with a stable code and a sentence a person can act on.
- Creating endpoints accept an `Idempotency-Key` header
  (`@UseInterceptors(IdempotencyInterceptor)` on the controller).

## Portal conventions

React + react-query + Tailwind. Use `components/ui` (`PageHeader`, `Card`,
`Modal`, `Field`, `Tabs`, `Pill`, `KeyValue`, `Spinner`, `Empty`,
`ErrorNote`), `lib/api` (`api`, `qs`, `upload`, `newKey`), `lib/format`
(`when`, `stamp`, `ago` — always Asia/Dhaka), `components/toast`, and the
`card`, `input`, `label`, `btn-primary|secondary|ghost|danger`, `mono`,
`tabular` classes. Status is never colour alone: badges carry an icon and the
shared label. Pages work at 390 px wide with no horizontal scroll.

## Mobile conventions

Flutter + provider + go_router. Get the HTTP client with
`context.read<ApiClient>()` and the signed-in profile with
`context.read<SessionController>().profile` (`profile.can('<capability>')`).
Use `widgets/common.dart` (`SectionCard`, `SectionTitle`, `ToneBadge`,
`EmptyState`, `ErrorPanel`, `SkeletonCard`, `InfoRow`, `showSnack`,
`errorText`, `confirmDialog`), `theme/tokens.dart` (`AbgColors`, `AbgText`,
`AbgSpace`, `AbgRadii`) and `core/formatting.dart`. Every visible string comes
from `L.of(context)`; add strings to `tool/strings/<module>.py` and run
`python3 tool/generate_arb.py lib/l10n && flutter gen-l10n`. Touch targets
are 48 px or larger; `flutter analyze` must be clean.

## Checks

```bash
bun run test                                   # from abg-dispatch/: shared + API
cd apps/admin && bun run typecheck && bun run build
cd apps/mobile && flutter analyze && flutter test
```
