import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertOctagon,
  ArrowUpRight,
  CircleDashed,
  Clock3,
  Inbox,
  MapPin,
  Megaphone,
  PackageCheck,
  PackagePlus,
  Radio,
  RotateCcw,
  Truck,
  UserCheck,
  type LucideIcon,
} from "lucide-react";
import { Capability } from "@abg-dispatch/shared";
import { api, qs, subscribeLive } from "../lib/api";
import { useAuth, useCan } from "../lib/auth";
import { ago, dhakaDay, when } from "../lib/format";
import { Card, Empty, ErrorNote, MoreLink, OverdueTag, PriorityBadge, Spinner, StatusBadge, cx } from "../components/ui";
import { Columns, GroupedColumns } from "../components/charts";
import { useIncidentSummary } from "../lib/lookups";

interface Dashboard {
  kpis: Record<"bookedToday" | "booked" | "awaitingPickup" | "inRoute" | "arrived" | "pendingReceipt" | "receivedToday" | "onBehalfToday" | "overdue" | "exceptions" | "returnsOpen" | "returnedToday", number>;
  pendingAging: { label: string; count: number }[];
  hourly: { hour: number; booked: number; received: number }[];
  recent: { id: string; parcelId: string; trackingNumber: string; title: string; priority: string; eventType: string; label: string; actor: string; location: string | null; at: string }[];
  attention: { id: string; trackingNumber: string; title: string; status: string; priority: string; isOverdue: boolean; hasOpenException: boolean; origin: string; destination: string; since: string; carrier: string | null }[];
  generatedAt: string;
}

const EVENT_ICON: Record<string, LucideIcon> = {
  PARCEL_CREATED: PackagePlus,
  PICKED_UP: Truck,
  ARRIVED_AT_DESTINATION: MapPin,
  RECEIVED: PackageCheck,
  EXCEPTION_RECORDED: AlertOctagon,
  DELIVERY_FAILED: AlertOctagon,
  SLA_ESCALATED: Clock3,
  CARRIER_REASSIGNED: Truck,
  RETURN_REQUESTED: RotateCcw,
};

const hourLabel = (h: unknown) => {
  const n = Number(h);
  return n === 12 ? "12p" : n > 12 ? `${n - 12}p` : `${n}a`;
};

function greeting(): string {
  const h = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Dhaka", hour: "numeric", hour12: false }).format(new Date()));
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

/** Workplace incident reports waiting for this office, so they are seen on landing. */
function IncidentStrip({ branchId }: { branchId: string }) {
  const canView = useCan(Capability.INCIDENT_VIEW);
  const summary = useIncidentSummary(branchId || undefined, canView);
  const s = summary.data;
  if (!canView || !s || s.open === 0) return null;
  return (
    <Link to={`/incidents${qs({ branchId })}`} className="card flex flex-wrap items-center gap-4 px-5 py-3.5 transition hover:shadow-raised">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-pending-soft text-pending">
        <Megaphone className="h-5 w-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-navy">
          {s.counts.PENDING} incident report{s.counts.PENDING === 1 ? "" : "s"} waiting · {s.counts.PROCESSING} being fixed
        </p>
        <p className="text-xs text-ink-muted">
          {s.urgentOpen ? `${s.urgentOpen} marked high or urgent. ` : ""}
          {s.oldestPendingAt ? `Oldest waiting since ${ago(s.oldestPendingAt)}.` : "Nothing new waiting."}
        </p>
      </div>
      <span className="inline-flex items-center gap-1 text-sm font-semibold text-active">
        Review reports <ArrowUpRight className="h-4 w-4" aria-hidden />
      </span>
    </Link>
  );
}

function Kpi({ label, value, icon: Icon, to, tone = "default", hint }: { label: string; value: number; icon: LucideIcon; to: string; tone?: "default" | "danger" | "pending"; hint?: string }) {
  return (
    <Link
      to={to}
      className={cx(
        "group card relative flex items-center gap-4 p-4 transition hover:-translate-y-0.5 hover:shadow-raised focus-visible:outline focus-visible:outline-2 focus-visible:outline-active",
        tone === "danger" && value > 0 && "border-danger/30",
      )}
    >
      <span className={cx("grid h-11 w-11 shrink-0 place-items-center rounded-xl", tone === "danger" && value > 0 ? "bg-danger-soft text-danger" : tone === "pending" ? "bg-pending-soft text-pending" : "bg-platinum-bright text-navy-500")}>
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className={cx("text-[28px] font-semibold leading-none tracking-tight", tone === "danger" && value > 0 ? "text-danger" : "text-navy")}>{value.toLocaleString()}</p>
        <p className="mt-1.5 truncate text-[13px] font-medium text-ink-muted">{label}</p>
        <p className="truncate text-[11px] text-ink-subtle">{hint ?? "\u00a0"}</p>
      </div>
      <ArrowUpRight className="absolute right-3 top-3 h-4 w-4 text-ink-subtle opacity-0 transition group-hover:opacity-100" aria-hidden />
    </Link>
  );
}

export function DashboardPage() {
  const profile = useAuth((s) => s.profile)!;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [branchId, setBranchId] = useState("");
  const [live, setLive] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const timer = useRef<number>();

  const branches = useQuery({ queryKey: ["admin", "branches"], queryFn: () => api.get<{ id: string; name: string; code: string }[]>("/admin/branches") });
  const scoped = profile.scopedBranchIds.length ? branches.data?.filter((b) => profile.scopedBranchIds.includes(b.id)) : branches.data;
  const dash = useQuery({ queryKey: ["admin", "dashboard", branchId], queryFn: () => api.get<Dashboard>(`/admin/dashboard${qs({ branchId })}`), refetchInterval: 60_000 });

  useEffect(
    () =>
      subscribeLive(
        (e) => {
          setFlash(e.trackingNumber);
          window.clearTimeout(timer.current);
          // Coalesce bursts of events into one refresh.
          timer.current = window.setTimeout(() => {
            void qc.invalidateQueries({ queryKey: ["admin", "dashboard"] });
            setFlash(null);
          }, 800);
        },
        setLive,
      ),
    [qc],
  );

  const k = dash.data?.kpis;
  const today = dhakaDay();
  const firstName = profile.employee?.fullName.split(" ").find((p) => !p.endsWith(".")) ?? profile.displayName;
  const waitingLongest = dash.data?.pendingAging.slice().reverse().find((b) => b.count > 0)?.label;
  const awaitingReceipt = k ? k.pendingReceipt : 0;
  const view = (v: string, extra: Record<string, string> = {}) => `/parcels${qs({ view: v, branchId, ...extra })}`;

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-2xl bg-hero px-6 py-6 text-platinum shadow-raised sm:px-8">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(202,208,216,0.14),transparent_65%)]" />
        <div className="relative flex flex-wrap items-start justify-between gap-6">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-platinum-deep">Control room · {new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Dhaka", weekday: "long", day: "numeric", month: "long" }).format(new Date())}</p>
            <h1 className="mt-2 font-display text-[28px] font-extrabold tracking-tight text-platinum-bright">
              {greeting()}, {firstName}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
              <span className={cx("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold", live ? "bg-success/20 text-[#7EE0B0]" : "bg-white/10 text-platinum-deep")}>
                <Radio className={cx("h-3.5 w-3.5", live && "animate-pulse")} aria-hidden /> {live ? "Live" : "Reconnecting…"}
              </span>
              {flash && <span className="mono text-xs text-platinum">Update: {flash}</span>}
              {dash.data && <span className="text-xs text-platinum-deep">Refreshed {when(dash.data.generatedAt)}</span>}
            </div>
          </div>
          <div className="flex flex-wrap items-end gap-6">
            <Link to={view("PENDING_RECEIPT")} className="group rounded-xl border border-white/10 bg-white/[0.05] px-5 py-4 transition hover:bg-white/[0.08]">
              <p className="text-xs font-semibold text-platinum-deep">Arrived, not yet received</p>
              <p className="mt-1 text-[52px] font-semibold leading-none tracking-tight text-platinum-bright">{awaitingReceipt}</p>
              <p className="mt-1.5 text-xs text-platinum-deep">{waitingLongest ? `Longest wait ${waitingLongest}` : "Nothing waiting"}</p>
            </Link>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-platinum-deep">Office</span>
              <select className="h-10 rounded-xl border border-white/15 bg-white/10 px-3 text-sm text-platinum-bright focus:outline-none focus:ring-2 focus:ring-platinum/30" value={branchId} onChange={(e) => setBranchId(e.target.value)}>
                <option value="" className="text-ink">
                  {profile.scopedBranchIds.length ? "All my offices" : "All offices"}
                </option>
                {scoped?.map((b) => (
                  <option key={b.id} value={b.id} className="text-ink">
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </section>

      <IncidentStrip branchId={branchId} />

      <ErrorNote error={dash.error} />
      {!k ? (
        <Spinner />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Kpi label="Booked today" value={k.bookedToday} icon={PackagePlus} to={`/parcels${qs({ dateFrom: today, dateTo: today, branchId })}`} hint="New parcels since midnight" />
            <Kpi label="Awaiting pickup" value={k.awaitingPickup + k.booked} icon={CircleDashed} to={`/parcels${qs({ status: "BOOKED,AWAITING_PICKUP", branchId })}`} tone="pending" hint={`${k.booked} without a courier yet`} />
            <Kpi label="In route" value={k.inRoute} icon={Truck} to={view("IN_ROUTE")} hint="With a courier now" />
            <Kpi label="Received today" value={k.receivedToday} icon={PackageCheck} to={`/parcels${qs({ view: "RECEIVED", dateField: "receivedAt", dateFrom: today, dateTo: today, branchId })}`} hint="Confirmed by the receiver" />
            <Kpi label="Received on behalf" value={k.onBehalfToday} icon={UserCheck} to={`/parcels${qs({ view: "RECEIVED", dateField: "receivedAt", dateFrom: today, dateTo: today, branchId })}`} tone="pending" hint="Today, by someone else for the receiver" />
            <Kpi label="Overdue" value={k.overdue} icon={Clock3} to={view("OVERDUE")} tone="danger" hint="Past their SLA" />
            <Kpi label="Exceptions" value={k.exceptions} icon={AlertOctagon} to={view("EXCEPTIONS")} tone="danger" hint="On hold, failed or flagged" />
            <Kpi label="Returns open" value={k.returnsOpen} icon={RotateCcw} to={`/parcels${qs({ status: "RETURN_REQUESTED,RETURN_IN_TRANSIT", branchId })}`} hint={`${k.returnedToday} returned today`} />
          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            <Card className="xl:col-span-2" title="Needs attention" action={<MoreLink to={view("OVERDUE")}>All overdue</MoreLink>} padded={false}>
              {dash.data!.attention.length === 0 ? (
                <Empty icon={PackageCheck} title="Nothing needs attention" hint="No overdue parcels and no open exceptions in your offices." />
              ) : (
                <ul className="divide-y divide-line">
                  {dash.data!.attention.map((p) => (
                    <li key={p.id}>
                      <button onClick={() => navigate(`/parcels/${p.id}`)} className="grid w-full grid-cols-1 gap-2 px-5 py-3.5 text-left transition hover:bg-surface sm:grid-cols-[1fr_auto] sm:items-center">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="mono text-[13px] text-navy">{p.trackingNumber}</span>
                            <PriorityBadge priority={p.priority} />
                            {p.isOverdue && <OverdueTag />}
                            {p.hasOpenException && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-danger">
                                <AlertOctagon className="h-3 w-3" /> Open exception
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 truncate text-sm font-medium text-ink">{p.title}</p>
                          <p className="mt-0.5 text-xs text-ink-muted">
                            {p.origin} → {p.destination}
                            {p.carrier ? ` · ${p.carrier}` : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 sm:flex-col sm:items-end sm:gap-1">
                          <StatusBadge status={p.status} size="sm" />
                          <span className="text-xs text-ink-subtle">since {ago(p.since)}</span>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card title="Pending receipt — time waiting" action={<MoreLink to={view("PENDING_RECEIPT")}>Open list</MoreLink>}>
              <p className="-mt-1 mb-2 text-xs text-ink-muted">Parcels that arrived but nobody has confirmed receipt, by how long they have waited.</p>
              <Columns data={dash.data!.pendingAging.map((b) => ({ label: b.label, value: b.count }))} caption="Pending receipt by time waiting" onSelect={() => navigate(view("PENDING_RECEIPT"))} />
            </Card>
          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            <Card className="xl:col-span-2" title="Today by hour">
              <GroupedColumns
                data={dash.data!.hourly}
                category="hour"
                formatCategory={hourLabel}
                series={[
                  { key: "booked", label: "Booked" },
                  { key: "received", label: "Received" },
                ]}
                caption="Parcels booked and received today, by hour (Asia/Dhaka)"
              />
            </Card>

            <Card title="Live activity" action={<span className="text-xs text-ink-subtle">Custody events</span>} padded={false}>
              {dash.data!.recent.length === 0 ? (
                <Empty title="No activity yet today" />
              ) : (
                <ol className="max-h-[300px] divide-y divide-line overflow-y-auto">
                  {dash.data!.recent.map((e) => {
                    const Icon = EVENT_ICON[e.eventType] ?? Inbox;
                    const bad = ["EXCEPTION_RECORDED", "DELIVERY_FAILED", "SLA_ESCALATED"].includes(e.eventType);
                    return (
                      <li key={e.id}>
                        <Link to={`/parcels/${e.parcelId}`} className="flex gap-3 px-5 py-3 hover:bg-surface">
                          <span className={cx("mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full", bad ? "bg-danger-soft text-danger" : e.eventType === "RECEIVED" ? "bg-success-soft text-success" : "bg-platinum-bright text-navy-500")}>
                            <Icon className="h-3.5 w-3.5" aria-hidden />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13px] font-semibold text-ink">{e.label}</p>
                            <p className="truncate text-xs text-ink-muted">
                              <span className="mono whitespace-nowrap text-[11px] font-medium text-navy-500">{e.trackingNumber}</span> · {e.actor}
                              {e.location ? ` · ${e.location}` : ""}
                            </p>
                          </div>
                          <span className="shrink-0 text-[11px] text-ink-subtle">{when(e.at)}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ol>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
