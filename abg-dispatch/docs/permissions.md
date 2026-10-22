# Roles and permissions

Two layers, both enforced on the server for every request:

1. **Capability** — may this role do this *kind* of thing? (`@RequireCapability`)
2. **Relation** — how is this person related to *this* parcel? (`ParcelAccessService`)

Both must pass. The apps only show what `viewer.actions` lists, but nothing
relies on the UI hiding a button.

## Role → capability matrix

Generated from [`packages/shared/src/permissions.ts`](../packages/shared/src/permissions.ts).

| Capability | Emp | Snd | Rcv | Cour | Disp | BrAdm | HOAdm | Aud | Super |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| `parcel.create` | ● | ● |  |  | ● | ● | ● |  | ● |
| `parcel.view.own` | ● | ● | ● | ● | ● | ● | ● |  | ● |
| `parcel.view.branch` |  |  |  |  | ● | ● | ● |  | ● |
| `parcel.view.all` |  |  |  |  |  |  | ● | ● | ● |
| `courier.actions` |  |  |  | ● | ● |  |  |  | ● |
| `parcel.carrier.assign` |  |  |  |  | ● | ● | ● |  | ● |
| `parcel.handover.officer` |  |  |  |  | ● | ● | ● |  | ● |
| `parcel.receive.desk` |  |  |  |  | ● | ● | ● |  | ● |
| `parcel.exception.record` | ● | ● | ● | ● | ● | ● | ● |  | ● |
| `parcel.exception.resolve` |  |  |  |  | ● | ● | ● |  | ● |
| `parcel.hold` |  |  |  |  |  | ● | ● |  | ● |
| `parcel.cancel.any` |  |  |  |  |  | ● | ● |  | ● |
| `parcel.return.any` |  |  |  |  |  | ● | ● |  | ● |
| `parcel.correct` |  |  |  |  |  | ● | ● |  | ● |
| `parcel.notify.resend` |  |  |  |  | ● | ● | ● |  | ● |
| `parcel.sla.update` |  |  |  |  |  | ● | ● |  | ● |
| `parcel.external.update` |  |  |  |  | ● | ● | ● |  | ● |
| `dashboard.view` |  |  |  |  | ● | ● | ● | ● | ● |
| `analytics.view` |  |  |  |  |  | ● | ● | ● | ● |
| `reports.export` |  |  |  |  | ● | ● | ● | ● | ● |
| `audit.view` |  |  |  |  |  | ● | ● | ● | ● |
| `config.manage` |  |  |  |  |  |  |  |  | ● |
| `users.manage` |  |  |  |  |  |  |  |  | ● |
| `integrations.manage` |  |  |  |  |  |  |  |  | ● |
| `incident.report` | ● | ● | ● | ● | ● | ● | ● |  | ● |
| `incident.view` |  |  |  |  |  | ● | ● | ● | ● |
| `incident.manage` |  |  |  |  |  | ● | ● |  | ● |

Emp = Employee · Snd = Sender · Rcv = Receiver · Cour = Courier / Runner · Disp = Dispatch Officer · BrAdm = Branch Admin · HOAdm = Head Office Admin · Aud = Auditor · Super = Super Admin

Roles can be **branch-scoped** (`user_roles.branchId`): a dispatch officer or
branch admin for Factory A sees and operates on parcels that start or end at
Factory A only. Head office admins and auditors see every office. A user may
hold several roles; capabilities are the union.

The **Auditor** role is read-only by construction: every write route requires a
capability auditors do not have, and the guard refuses writes from a
read-only actor even where a route is otherwise open (`@AllowReadOnly` marks
the few personal routes, such as changing one's own password, that stay open).

## Relation to a parcel

| Relation | Who | Can see |
|---|---|---|
| `PARTY` | Sender, booker, intended receiver (employee, or anyone in the receiving department), actual receiver | Everything, including contents |
| `CARRIER` | The courier currently or previously assigned (employee or guest) | Routing and custody; contents per classification |
| `BRANCH_OPS` | Dispatch / branch admin whose scope covers origin or destination | Routing and custody; contents per classification |
| `HEAD_OFFICE` | Head office admin | All parcels; contents per classification |
| `AUDITOR` | Auditor | Everything, read-only; employee codes and phone numbers masked in timelines |
| `SUPER_ADMIN` | Super admin | Everything |
| `DESTINATION_COLLEAGUE` | An employee of the destination office who scanned the **physical label** of a parcel waiting for receipt | Just enough to receive it on the receiver's behalf |

Anyone else gets **404 Not Found** (not 403), so tracking numbers cannot be
probed. Guest carriers sign in with a phone code and can reach only parcels
they are assigned to; their session cannot browse the directory or lists.

Position-specific operations are checked against the right office, not just
the role: confirming a handover as dispatch officer requires reach over the
**origin**; desk arrival and receipt require reach over the **destination**;
confirming a return requires the origin.

## Classification and redaction

| Classification | Parties, auditors, super admins | Head office | Carriers, branch operations |
|---|---|---|---|
| Normal / Internal | Full | Full | Full |
| Confidential | Full | Full | **Title only** (description hidden, content attachments hidden) |
| Highly confidential | Full | **Redacted** | **Redacted** — title shown as "Highly confidential dispatch" |

Routing data (who, from where, to where, when, which courier) is always
visible to anyone with access — that is what operations needs. Delivery
evidence (proof of delivery, signature, courier receipt) stays visible to
operations at every level, because it photographs the sealed package, not its
contents.

Notifications follow the same rule: for highly confidential parcels the push
text names only the tracking number, so nothing sensitive appears on a lock
screen (acceptance test 18). Printed labels never show the title of
confidential parcels.

## Receipt rules

- Only the intended receiver (or someone in the receiving department) can
  **receive** in the app.
- **On behalf**: a colleague at the destination office, or a desk officer, may
  receive with a mandatory reason and optional relationship. The ledger records
  the actual receiver separately from the intended one, and the intended
  receiver is notified at once (acceptance test 13). Highly confidential
  parcels cannot be received on behalf.
- **QR confirmation** proves physical possession: the receiver's own view of
  the parcel never contains the QR token, so the only way to have it is to
  scan the label.
- **OTP**: a 6-digit code SMS'd to the receiver (or a named on-behalf
  recipient), hashed at rest, five attempts, five minutes.

## Incident & facility issues

Every signed-in employee role can **report** (`incident.report`). Branch
admins **view and manage** reports in their offices; head-office admins in
every office; auditors and the MD / Chairman (`EXECUTIVE`) **view** every
office and change nothing. **Confidential** reports (always including
misconduct) are visible to head office only — head-office admins, super
admins and the MD / Chairman. A branch admin or an auditor gets 404 for one,
and it never appears in their list, summary or notifications. Anonymous and
confidential reports hide the reporter from every handler (see
[workflows §13](workflows.md#13-incident--facility-issues)).

## Administrative actions

Corrections, holds, cancellations of in-custody parcels, SLA changes and
notification resends are capability-gated, reason-bearing, and written to both
the parcel ledger and the audit log. Configuration and user changes record
before/after values. Exports and report generation are audited too.
