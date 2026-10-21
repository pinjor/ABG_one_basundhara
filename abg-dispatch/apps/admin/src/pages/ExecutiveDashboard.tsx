import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CarFront,
  ClipboardCheck,
  FileBadge,
  Globe2,
  History,
  IdCard,
  ListChecks,
  Megaphone,
  Newspaper,
  Package,
  Plane,
  Radio,
  ShieldAlert,
  TriangleAlert,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import {
  Capability,
  INCIDENT_SEVERITY_LABEL,
  INCIDENT_STATUS_LABEL,
  INCIDENT_STATUS_TONE,
  NOTICE_CHANNEL_LABEL,
  TOUR_STATUS_LABEL,
  TOUR_STATUS_TONE,
  type IncidentSeverity,
  type IncidentStatus,
  type NoticeChannel,
  type StatusTone,
  type TourStatus,
} from "@abg-dispatch/shared";
import { api } from "../lib/api";
import { useAuth, useCan } from "../lib/auth";
import { ago, when } from "../lib/format";
import { Card, Empty, Pill, cx } from "../components/ui";
import { Columns } from "../components/charts";

// Summary shapes from each module's GET /admin/<module>/summary (see docs/modules/*.md).
interface ToursSummary {
  activeForeign: number;
  activeForeignCountries: string[];
  pendingApprovals: number;
  pendingByStage: Record<string, number>;
  ytdSanctioned: number;
  annualBudget: number;
  utilisationPct: number;
  passportAlerts: number;
  upcomingThisMonth?: number;
}
interface FleetSummary {
  activeRequisitions: number;
  pendingHod: number;
  pendingFleet: number;
  tripsToday: number;
  vehicles: { total: number; available: number; onTrip: number; maintenance: number };
  poolAvailabilityPct: number;
}
interface VisitorsSummary {
  onSiteNow: number;
  expectedToday: number;
  visitsToday: number;
  last7Days: { day: string; visits: number }[];
}
interface LicencesSummary {
  total: number;
  expiring: number;
  expired: number;
  dueSoon: number;
  renewalsInProgress: number;
  nextExpiry: { id: string; name: string; daysLeft: number } | null;
}
interface IncidentsSummary {
  open: number;
  criticalOpen?: number;
  urgentOpen?: number;
  recent?: { id: string; referenceNumber: string; title: string; severity: string; status: string; confidential?: boolean; branch: { name: string; code: string }; createdAt: string }[];
}
interface ParcelDashboard {
  kpis: { inRoute: number; pendingReceipt: number; overdue: number; bookedToday: number; receivedToday: number };
}
interface NoticeRow {
  id: string;
  title: string;
  channel: string;
  urgent: boolean;
  pinned: boolean;
  publishedAt: string;
  excerpt?: string;
}
// Rows of GET /admin/tours: read defensively so a missing field never breaks the dashboard.
interface TourRow {
  id: string;
  referenceNumber: string;
  title?: string;
  type: string;
  destination: string;
  country?: string | null;
  startDate: string;
  endDate: string;
  estimatedBudget: number;
  status: string;
  traveller?: { name: string } | null;
  travellerName?: string;
}

/** Taka in lakh / crore, the way finance teams in Bangladesh read budgets. */
function taka(n: number): string {
  if (n >= 10_000_000) return `৳ ${(n / 10_000_000).toFixed(n >= 100_000_000 ? 0 : 1)}Cr`;
  if (n >= 100_000) return `৳ ${(n / 100_000).toFixed(1)}L`;
  return `৳ ${new Intl.NumberFormat("en-IN").format(n)}`;
}

const day = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Dhaka", day: "numeric", month: "short" });
const weekday = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Dhaka", weekday: "short" });

function useSummary<T>(key: string, path: string, enabled: boolean) {
  return useQuery({ queryKey: ["exec", key], queryFn: () => api.get<T>(path), enabled, refetchInterval: 60_000, retry: false });
}

const TONE_TEXT: Record<StatusTone, string> = {
  active: "bg-active-soft text-active",
  pending: "bg-pending-soft text-pending",
  success: "bg-success-soft text-success",
  danger: "bg-danger-soft text-danger",
  neutral: "bg-neutral-soft text-neutral",
};

function Kpi({ label, value, icon: Icon, iconTone, note, noteTone = "success", detail, to }: { label: string; value: string | number; icon: LucideIcon; iconTone: string; note?: string; noteTone?: "success" | "pending" | "danger" | "active"; detail?: string; to?: string }) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[12.5px] font-semibold uppercase leading-snug tracking-[0.06em] text-ink-muted">{label}</p>
        <span className={cx("grid h-11 w-11 shrink-0 place-items-center rounded-xl", iconTone)}>
          <Icon className="h-5 w-5" aria-hidden />
        </span>
      </div>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-2">
        <p className="tabular font-display text-[30px] font-extrabold leading-none text-navy">{value}</p>
        {note && (
          <span
            className={cx(
              "rounded-lg px-2 py-0.5 text-[12.5px] font-semibold",
              noteTone === "success" && "text-success",
              noteTone === "pending" && "bg-pending-soft text-pending ring-1 ring-pending/20",
              noteTone === "danger" && "bg-danger-soft text-danger ring-1 ring-danger/20",
              noteTone === "active" && "text-active",
            )}
          >
            {note}
          </span>
        )}
      </div>
      {detail && <p className="mt-2 truncate text-[13px] text-ink-subtle">{detail}</p>}
    </>
  );
  return to ? (
    <Link to={to} className="card block p-5 transition hover:-translate-y-0.5 hover:shadow-raised">
      {body}
    </Link>
  ) : (
    <div className="card p-5">{body}</div>
  );
}

function ModuleTile({ icon: Icon, tone, title, line, to }: { icon: LucideIcon; tone: string; title: string; line: string; to: string }) {
  return (
    <Link to={to} className="rounded-xl border border-line p-4 transition hover:border-line-strong hover:bg-surface">
      <Icon className={cx("h-5 w-5", tone)} aria-hidden />
      <p className="mt-3 font-semibold text-navy">{title}</p>
      <p className="mt-0.5 text-xs text-ink-muted">{line}</p>
    </Link>
  );
}

export function ExecutiveDashboardPage() {
  const profile = useAuth((s) => s.profile)!;
  const navigate = useNavigate();
  const canTours = useCan(Capability.TOUR_VIEW);
  const canTourRequest = useCan(Capability.TOUR_REQUEST);
  const canFleet = useCan(Capability.FLEET_VIEW);
  const canVisitors = useCan(Capability.VISITOR_VIEW);
  const canLicences = useCan(Capability.LICENCE_VIEW);
  const canIncidents = useCan(Capability.INCIDENT_VIEW);
  const canNotices = useCan(Capability.NOTICE_READ);
  const canParcels = useCan(Capability.DASHBOARD_VIEW);

  const tours = useSummary<ToursSummary>("tours", "/admin/tours/summary", canTours);
  const tourRows = useSummary<{ items: TourRow[] }>("tour-rows", "/admin/tours?limit=5", canTours);
  const fleet = useSummary<FleetSummary>("fleet", "/admin/pool-car/summary", canFleet);
  const visitors = useSummary<VisitorsSummary>("visitors", "/admin/visitors/summary", canVisitors);
  const licences = useSummary<LicencesSummary>("licences", "/admin/licences/summary", canLicences);
  const incidents = useSummary<IncidentsSummary>("incidents", "/admin/incidents/summary", canIncidents);
  const notices = useSummary<{ items: NoticeRow[] }>("notices", "/notices?limit=4", canNotices);
  const parcels = useSummary<ParcelDashboard>("parcels", "/admin/dashboard", canParcels);

  const t = tours.data;
  const f = fleet.data;
  const v = visitors.data;
  const lc = licences.data;
  const inc = incidents.data;
  const pk = parcels.data?.kpis;
  const firstName = profile.displayName.replace(/^Md\.\s*/, "");
  const org = profile.employee?.branch.name ?? "Anvir Bashundhara Group";

  // Up to eight headline figures: travel first (as the brief's dashboard), then each module.
  const kpis = [
    t && {
      key: "foreign",
      label: "Active overseas tours",
      value: t.activeForeign,
      icon: Globe2,
      iconTone: "bg-active-soft text-active",
      note: t.activeForeignCountries.length ? `↑ ${t.activeForeignCountries.slice(0, 3).join(", ")}` : undefined,
      noteTone: "success" as const,
      detail: t.upcomingThisMonth !== undefined ? `${t.upcomingThisMonth} more starting this month` : "Travelling now",
      to: "/tours?status=ACTIVE",
    },
    t && {
      key: "pending-tours",
      label: "Pending tour approvals",
      value: t.pendingApprovals,
      icon: History,
      iconTone: "bg-pending-soft text-pending",
      note: t.pendingApprovals ? "Needs vetting" : undefined,
      noteTone: "pending" as const,
      detail: `HOD ${t.pendingByStage.PENDING_HOD ?? 0} · HR & Finance ${t.pendingByStage.PENDING_VETTING ?? 0} · MD/Chairman ${t.pendingByStage.PENDING_SANCTION ?? 0}`,
      to: "/tours?tab=pending",
    },
    t && {
      key: "budget",
      label: "YTD travel budget",
      value: taka(t.ytdSanctioned),
      icon: Wallet,
      iconTone: "bg-success-soft text-success",
      note: `${Math.round(t.utilisationPct)}% utilised`,
      noteTone: (t.utilisationPct > 90 ? "danger" : "success") as "danger" | "success",
      detail: `Of ${taka(t.annualBudget)} annual TA/DA & flights`,
      to: "/tours",
    },
    t && {
      key: "passport",
      label: "Passport expiry alert",
      value: t.passportAlerts,
      icon: ShieldAlert,
      iconTone: "bg-danger-soft text-danger",
      note: t.passportAlerts ? "< 6 mos expiry" : undefined,
      noteTone: "danger" as const,
      detail: "Action required before foreign booking",
      to: "/tours?passport=1",
    },
    f && {
      key: "fleet",
      label: "Pool availability",
      value: `${Math.round(f.poolAvailabilityPct)}%`,
      icon: CarFront,
      iconTone: "bg-[#E2F3F3] text-[#0E8A8A]",
      note: `${f.vehicles.onTrip} on trip`,
      noteTone: "active" as const,
      detail: `${f.activeRequisitions} active requisitions · ${f.vehicles.maintenance} in maintenance`,
      to: "/pool-car",
    },
    v && {
      key: "visitors",
      label: "Visitors on site",
      value: v.onSiteNow,
      icon: IdCard,
      iconTone: "bg-pending-soft text-pending",
      note: `${v.expectedToday} expected`,
      noteTone: "active" as const,
      detail: `${v.visitsToday} gate passes today`,
      to: "/visitors",
    },
    inc && {
      key: "incidents",
      label: "Open incidents",
      value: inc.open,
      icon: TriangleAlert,
      iconTone: "bg-danger-soft text-danger",
      note: inc.criticalOpen ? `${inc.criticalOpen} critical` : inc.urgentOpen ? `${inc.urgentOpen} urgent` : undefined,
      noteTone: "danger" as const,
      detail: "Safety, facility, security and IT issues",
      to: "/incidents",
    },
    lc && {
      key: "licences",
      label: "Licences expiring",
      value: lc.expiring + lc.expired,
      icon: FileBadge,
      iconTone: "bg-[#ECEDFB] text-[#4B4FC4]",
      note: lc.expired ? `${lc.expired} expired` : lc.renewalsInProgress ? `${lc.renewalsInProgress} renewing` : undefined,
      noteTone: (lc.expired ? "danger" : "pending") as "danger" | "pending",
      detail: lc.nextExpiry ? `Next: ${lc.nextExpiry.name} · ${lc.nextExpiry.daysLeft} days` : "All licences in date",
      to: "/licences",
    },
    pk && {
      key: "parcels",
      label: "Parcels in route",
      value: pk.inRoute,
      icon: Package,
      iconTone: "bg-platinum-bright text-navy-500",
      note: pk.overdue ? `${pk.overdue} overdue` : undefined,
      noteTone: "danger" as const,
      detail: `${pk.pendingReceipt} awaiting receipt · ${pk.receivedToday} received today`,
      to: "/parcels/control-room",
    },
  ]
    .filter((k): k is NonNullable<typeof k> => !!k)
    .slice(0, 8);

  const tiles = [
    canFleet && f && { icon: CarFront, tone: "text-active", title: "Pool Car", line: `${f.pendingHod + f.pendingFleet} pending requisitions`, to: "/pool-car" },
    canVisitors && v && { icon: ClipboardCheck, tone: "text-success", title: "Visitors", line: `${v.visitsToday} gate passes today`, to: "/visitors" },
    canLicences && lc && { icon: FileBadge, tone: "text-pending", title: "Licences", line: `${lc.renewalsInProgress + lc.dueSoon} renewal${lc.renewalsInProgress + lc.dueSoon === 1 ? "" : "s"} pending`, to: "/licences" },
    canParcels && pk && { icon: Package, tone: "text-[#4B4FC4]", title: "Parcels", line: `${pk.inRoute} in transit`, to: "/parcels" },
    canIncidents && inc && { icon: TriangleAlert, tone: "text-danger", title: "Incidents", line: `${inc.open} open`, to: "/incidents" },
    canNotices && { icon: Newspaper, tone: "text-navy-500", title: "Notice board", line: "Circulars & announcements", to: "/notices" },
  ].filter(Boolean) as { icon: LucideIcon; tone: string; title: string; line: string; to: string }[];

  const rows = tourRows.data?.items ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-[26px] font-extrabold tracking-tight text-navy">Executive Dashboard</h1>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-success-soft px-3 py-1 text-[13px] font-semibold text-success ring-1 ring-inset ring-success/20">
          <span className="h-2 w-2 animate-pulse rounded-full bg-success" aria-hidden /> Live network
        </span>
      </div>

      <section className="relative overflow-hidden rounded-[22px] bg-gradient-to-br from-[#0B1E3A] via-[#0E2C52] to-[#0B1A31] px-6 py-8 text-white shadow-raised sm:px-9 sm:py-9">
        <Plane className="pointer-events-none absolute -right-6 top-6 hidden h-56 w-56 -rotate-12 text-white/[0.07] md:block" aria-hidden />
        <div className="pointer-events-none absolute bottom-8 right-10 hidden h-6 w-72 rounded-full bg-white/[0.06] md:block" aria-hidden />
        <span className="inline-flex items-center gap-2 rounded-full border border-[#2F6FED]/40 bg-[#2F6FED]/15 px-3.5 py-1.5 text-[13px] font-semibold text-[#BFD4FF]">
          <Building2 className="h-4 w-4" aria-hidden /> {org === "Anvir Bashundhara Group" ? org : `Anvir Bashundhara Group · ${org}`}
        </span>
        <h2 className="mt-4 font-display text-[30px] font-extrabold leading-tight tracking-tight sm:text-[38px]">Welcome, {firstName}</h2>
        <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-platinum sm:text-base">
          Manage official tours, pool cars, visitors, regulatory licences, notices, incidents and dispatch from one unified portal.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          {canTourRequest && (
            <button className="btn h-11 bg-[#1D9BF0] px-5 text-white shadow-raised hover:brightness-110" onClick={() => navigate("/tours?new=1")}>
              <Plane className="h-4 w-4" /> Apply for Tour (Local/Foreign)
            </button>
          )}
          <button className="btn h-11 border border-white/15 bg-white/[0.06] px-5 text-white hover:bg-white/[0.12]" onClick={() => navigate("/tours?tab=pending")}>
            <ListChecks className="h-4 w-4" /> View Tour Approval Pipeline
          </button>
        </div>
      </section>

      {kpis.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map(({ key, ...k }) => (
            <Kpi key={key} {...k} />
          ))}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_400px]">
        <div className="min-w-0 space-y-6">
          {canTours && (
            <Card
              title={
                <span className="inline-flex items-center gap-2">
                  <Plane className="h-5 w-5 text-active" aria-hidden /> Recent Official Tour Requisitions
                </span>
              }
              action={
                <Link to="/tours" className="inline-flex items-center gap-1 text-sm font-semibold text-active hover:underline">
                  View all tour logs <ArrowRight className="h-4 w-4" />
                </Link>
              }
              padded={false}
            >
              {rows.length === 0 ? (
                <Empty icon={Plane} title={tourRows.isLoading ? "Loading tour requests…" : "No tour requests yet"} />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-left text-sm">
                    <thead className="bg-surface/70 text-[11.5px] font-bold uppercase tracking-wide text-ink-muted">
                      <tr>
                        <th className="px-5 py-3">Ref / traveller</th>
                        <th className="px-4 py-3">Type & destination</th>
                        <th className="px-4 py-3">Travel dates</th>
                        <th className="px-4 py-3">Est. budget</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-5 py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {rows.map((r) => {
                        const tone = TOUR_STATUS_TONE[r.status as TourStatus] ?? "neutral";
                        return (
                          <tr key={r.id} className="align-top">
                            <td className="px-5 py-4">
                              <p className="mono font-semibold text-navy">{r.referenceNumber}</p>
                              <p className="text-ink-muted">{r.traveller?.name ?? r.travellerName ?? ""}</p>
                            </td>
                            <td className="px-4 py-4">
                              <span className={cx("inline-block rounded-md px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide", r.type === "FOREIGN" ? "bg-[#ECEDFB] text-[#4B4FC4]" : "bg-platinum-bright text-navy-500")}>{r.type === "FOREIGN" ? "Foreign" : "Local"}</span>
                              <p className="mt-1 text-ink">{[r.destination, r.country].filter(Boolean).join(", ")}</p>
                            </td>
                            <td className="whitespace-nowrap px-4 py-4 text-ink-muted">
                              {day.format(new Date(r.startDate))} – {day.format(new Date(r.endDate))}
                            </td>
                            <td className="tabular whitespace-nowrap px-4 py-4 text-ink">৳ {new Intl.NumberFormat("en-IN").format(r.estimatedBudget)}</td>
                            <td className="px-4 py-4">
                              <span className={cx("inline-block rounded-md px-2 py-1 text-xs font-semibold", TONE_TEXT[tone])}>{TOUR_STATUS_LABEL[r.status as TourStatus] ?? r.status}</span>
                            </td>
                            <td className="px-5 py-4 text-right">
                              <Link to={`/tours/${r.id}`} className="font-semibold text-active hover:underline">
                                Details
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}

          {canVisitors && v && v.last7Days.length > 0 && (
            <Card title="Visitors at the gates — last 7 days" action={<span className="text-xs text-ink-subtle">Gate passes per day</span>}>
              <Columns
                data={v.last7Days.map((d) => ({ label: weekday.format(new Date(`${d.day}T06:00:00Z`)), value: d.visits }))}
                caption="Visitors per day for the last seven days"
                unit="visitors"
                height={200}
              />
            </Card>
          )}

          {canIncidents && inc?.recent && (
            <Card
              title={
                <span className="inline-flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-danger" aria-hidden /> Recent incident logs
                </span>
              }
              action={
                <Link to="/incidents" className="inline-flex items-center gap-1 text-sm font-semibold text-active hover:underline">
                  All incidents <ArrowRight className="h-4 w-4" />
                </Link>
              }
              padded={false}
            >
              {inc.recent.length === 0 ? (
                <Empty icon={TriangleAlert} title="No incidents reported" />
              ) : (
                <ul className="divide-y divide-line">
                  {inc.recent.map((r) => (
                    <li key={r.id}>
                      <Link to={`/incidents/${r.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3.5 transition hover:bg-surface">
                        <span className="mono w-40 shrink-0 text-[12.5px] text-navy-500">{r.referenceNumber}</span>
                        <span className="min-w-0 flex-1 truncate font-medium text-ink">{r.title}</span>
                        <span className={cx("rounded-md px-1.5 py-0.5 text-[11px] font-bold uppercase", r.severity === "CRITICAL" ? "bg-danger text-white" : r.severity === "HIGH" ? "bg-pending-soft text-pending" : "bg-platinum-bright text-navy-500")}>
                          {INCIDENT_SEVERITY_LABEL[r.severity as IncidentSeverity] ?? r.severity}
                        </span>
                        <Pill tone={INCIDENT_STATUS_TONE[r.status as IncidentStatus] ?? "neutral"}>{INCIDENT_STATUS_LABEL[r.status as IncidentStatus] ?? r.status}</Pill>
                        <span className="w-28 shrink-0 text-right text-xs text-ink-subtle">
                          {r.branch.code} · {ago(r.createdAt)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}
        </div>

        <div className="space-y-6">
          {tiles.length > 0 && (
            <Card title="Other operational modules">
              <div className="grid grid-cols-2 gap-3">
                {tiles.slice(0, 6).map((tile) => (
                  <ModuleTile key={tile.title} {...tile} />
                ))}
              </div>
            </Card>
          )}

          {canNotices && (
            <Card
              title={
                <span className="inline-flex items-center gap-2">
                  <Megaphone className="h-5 w-5 text-navy-500" aria-hidden /> Announcements
                </span>
              }
              action={
                <Link to="/notices" className="text-sm font-semibold text-active hover:underline">
                  Notice board
                </Link>
              }
              padded={false}
            >
              {!notices.data?.items.length ? (
                <Empty icon={Newspaper} title={notices.isLoading ? "Loading…" : "No announcements"} />
              ) : (
                <ul className="divide-y divide-line">
                  {notices.data.items.map((n) => (
                    <li key={n.id}>
                      <Link to={`/notices/${n.id}`} className={cx("block px-5 py-3.5 transition hover:bg-surface", n.urgent && "border-l-4 border-danger")}>
                        <div className="flex items-center gap-2 text-[11.5px] font-semibold uppercase tracking-wide">
                          {n.urgent && <span className="rounded bg-danger px-1.5 py-0.5 text-white">Urgent</span>}
                          <span className="text-navy-500">{NOTICE_CHANNEL_LABEL[n.channel as NoticeChannel] ?? n.channel}</span>
                          <span className="ml-auto font-medium normal-case tracking-normal text-ink-subtle">{when(n.publishedAt)}</span>
                        </div>
                        <p className="mt-1 font-semibold text-ink">{n.title}</p>
                        {n.excerpt && <p className="mt-0.5 line-clamp-2 text-xs text-ink-muted">{n.excerpt}</p>}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}

          <section className="rounded-2xl bg-gradient-to-br from-[#302B8C] to-[#25226E] p-6 text-white shadow-raised">
            <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-[#C7C3FF]">Foreign travel policy</p>
            <h3 className="mt-2 font-display text-lg font-extrabold">MD / Chairman sanction requirement</h3>
            <p className="mt-3 text-sm leading-relaxed text-[#E4E2FF]">
              All overseas official tours (conferences, technical inspections, vendor audits) need the Managing Director's or Chairman's approval before tickets or foreign-exchange allowance can be released by Finance.
            </p>
            {canParcels && (
              <Link to="/parcels/control-room" className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-white/90 hover:text-white">
                <Radio className="h-4 w-4" /> Parcel control room
              </Link>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
