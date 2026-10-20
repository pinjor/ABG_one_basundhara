import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CARRIER_TYPE_LABEL } from "@abg-dispatch/shared";
import { api, qs } from "../lib/api";
import { useAuth } from "../lib/auth";
import { daysAgo, dhakaDay, minutes } from "../lib/format";
import { useBranches } from "../lib/lookups";
import { Card, ErrorNote, PageHeader, Spinner, cx } from "../components/ui";
import { BarList, LineChart, StageBar } from "../components/charts";

interface Group {
  label: string;
  count: number;
  avgMinutes: number | null;
}
interface Overview {
  range: { from: string; to: string };
  totals: { parcels: number; received: number; onTimeRate: number | null; overdueRate: number | null; exceptionRate: number | null; returnRate: number | null };
  durations: { bookingToPickup: number | null; pickupToArrival: number | null; arrivalToReceipt: number | null; arrivalToReceiptP90: number | null; endToEnd: number | null };
  byDay: { day: string; booked: number; received: number }[];
  byBranch: Group[];
  byDepartment: Group[];
  byCategory: Group[];
  byRoute: Group[];
  delayedRoutes: { route: string; parcels: number; avgMinutes: number | null; avgWaitMinutes: number | null }[];
  carriers: { name: string; type: string; assignments: number; completed: number; avgCustodyMinutes: number | null }[];
  providers: { name: string; parcels: number }[];
  deliveryMethods: { method: string; parcels: number }[];
}

const RANGES = [
  { id: "7", label: "7 days", days: 7 },
  { id: "30", label: "30 days", days: 30 },
  { id: "90", label: "90 days", days: 90 },
];

const pct = (v: number | null) => (v === null ? "—" : `${v}%`);
const dayLabel = (v: unknown) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${String(v)}T00:00:00Z`));

function Stat({ label, value, note, emphasis }: { label: string; value: string; note?: string; emphasis?: "good" | "bad" }) {
  return (
    <div className="card p-4">
      <p className="text-[13px] font-medium text-ink-muted">{label}</p>
      <p className={cx("mt-1.5 text-[26px] font-semibold leading-none tracking-tight", emphasis === "bad" ? "text-danger" : "text-navy")}>{value}</p>
      {note && <p className="mt-1.5 text-[11px] text-ink-subtle">{note}</p>}
    </div>
  );
}

export function AnalyticsPage() {
  const profile = useAuth((s) => s.profile)!;
  const branches = useBranches();
  const [range, setRange] = useState("30");
  const [custom, setCustom] = useState({ from: daysAgo(29), to: dhakaDay() });
  const [branchId, setBranchId] = useState("");
  const days = RANGES.find((r) => r.id === range)?.days;
  const from = days ? daysAgo(days - 1) : custom.from;
  const to = days ? dhakaDay() : custom.to;

  const q = useQuery({ queryKey: ["admin", "analytics", from, to, branchId], queryFn: () => api.get<Overview>(`/admin/analytics${qs({ from, to, branchId })}`) });
  const d = q.data;
  const scoped = profile.scopedBranchIds.length ? branches.data?.filter((b) => profile.scopedBranchIds.includes(b.id)) : branches.data;
  const group = (rows: Group[]) => rows.map((r) => ({ label: r.label, value: r.count, detail: `Avg end-to-end ${minutes(r.avgMinutes)}` }));

  return (
    <div className="space-y-6">
      <PageHeader overline="Insight" title="Analytics" subtitle="Volumes, speed and reliability of internal dispatch. Each stage is measured separately, so waiting at the destination is visible on its own." />

      <div className="card no-print flex flex-wrap items-end gap-3 p-3">
        <div className="flex gap-1 rounded-xl bg-surface p-1" role="group" aria-label="Period">
          {[...RANGES, { id: "custom", label: "Custom", days: 0 }].map((r) => (
            <button key={r.id} className={cx("h-8 rounded-lg px-3 text-[13px] font-semibold", range === r.id ? "bg-white text-navy shadow-card" : "text-ink-muted hover:text-navy")} onClick={() => setRange(r.id)}>
              {r.label}
            </button>
          ))}
        </div>
        {range === "custom" && (
          <>
            <input type="date" className="input h-10 w-auto" value={custom.from} max={custom.to} onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))} aria-label="From" />
            <input type="date" className="input h-10 w-auto" value={custom.to} min={custom.from} onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))} aria-label="To" />
          </>
        )}
        <select className="input h-10 w-auto min-w-[200px]" value={branchId} onChange={(e) => setBranchId(e.target.value)} aria-label="Office">
          <option value="">{profile.scopedBranchIds.length ? "All my offices" : "All offices"}</option>
          {scoped?.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        {d && <span className="ml-auto text-xs text-ink-subtle">{d.range.from} → {d.range.to} · Asia/Dhaka</span>}
      </div>

      <ErrorNote error={q.error} />
      {!d ? (
        <Spinner />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <Stat label="Parcels booked" value={d.totals.parcels.toLocaleString()} />
            <Stat label="Received" value={d.totals.received.toLocaleString()} note={d.totals.parcels ? `${Math.round((d.totals.received / d.totals.parcels) * 100)}% of booked` : undefined} />
            <Stat label="Received on time" value={pct(d.totals.onTimeRate)} note="Of received, never overdue" />
            <Stat label="Went overdue" value={pct(d.totals.overdueRate)} emphasis={(d.totals.overdueRate ?? 0) > 10 ? "bad" : undefined} />
            <Stat label="Had an exception" value={pct(d.totals.exceptionRate)} />
            <Stat label="Returned" value={pct(d.totals.returnRate)} />
          </div>

          <Card title="Where the time goes">
            <div className="grid gap-6 lg:grid-cols-[1fr_auto]">
              <div>
                <StageBar
                  stages={[
                    { label: "Booking → pickup", minutes: d.durations.bookingToPickup },
                    { label: "Pickup → arrival", minutes: d.durations.pickupToArrival },
                    { label: "Arrival → receipt", minutes: d.durations.arrivalToReceipt },
                  ]}
                />
                <p className="mt-3 text-xs text-ink-muted">Average minutes per stage for parcels booked in this period. Arrival → receipt is time a parcel sat at the destination before someone confirmed it.</p>
              </div>
              <dl className="grid grid-cols-2 gap-x-8 gap-y-3 lg:w-[300px]">
                <div>
                  <dt className="text-xs text-ink-muted">Average end to end</dt>
                  <dd className="text-xl font-semibold text-navy">{minutes(d.durations.endToEnd)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-muted">Slowest 10% wait at destination</dt>
                  <dd className="text-xl font-semibold text-navy">{minutes(d.durations.arrivalToReceiptP90)}</dd>
                </div>
              </dl>
            </div>
          </Card>

          <Card title="Daily volume">
            <LineChart
              data={d.byDay}
              x="day"
              formatX={dayLabel}
              series={[
                { key: "booked", label: "Booked" },
                { key: "received", label: "Received" },
              ]}
              caption="Parcels booked and received per day"
            />
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card title="Parcels by sending office">
              <BarList data={group(d.byBranch)} caption="Parcels by sending office" detail="Hover a bar for average end-to-end time." />
            </Card>
            <Card title="Busiest routes">
              <BarList data={group(d.byRoute)} caption="Parcels by route" detail="Office codes: origin → destination." />
            </Card>
            <Card title="Parcels by sending department">
              <BarList data={group(d.byDepartment)} caption="Parcels by sending department" />
            </Card>
            <Card title="Parcels by category">
              <BarList data={group(d.byCategory)} caption="Parcels by category" />
            </Card>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
            <Card title="Couriers and runners" padded={false}>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-line bg-surface/70 text-xs text-ink-muted">
                    <tr>
                      <th className="px-5 py-2.5 font-semibold">Carrier</th>
                      <th className="px-3 py-2.5 font-semibold">Type</th>
                      <th className="px-3 py-2.5 text-right font-semibold">Assigned</th>
                      <th className="px-3 py-2.5 text-right font-semibold">Completed</th>
                      <th className="px-5 py-2.5 text-right font-semibold">Avg custody</th>
                    </tr>
                  </thead>
                  <tbody className="tabular divide-y divide-line">
                    {d.carriers.map((c) => (
                      <tr key={c.name + c.type}>
                        <td className="px-5 py-2.5 font-medium text-ink">{c.name}</td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-ink-muted">{CARRIER_TYPE_LABEL[c.type as keyof typeof CARRIER_TYPE_LABEL] ?? c.type}</td>
                        <td className="px-3 py-2.5 text-right">{c.assignments}</td>
                        <td className="px-3 py-2.5 text-right">{c.completed}</td>
                        <td className="px-5 py-2.5 text-right">{minutes(c.avgCustodyMinutes)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
            <div className="space-y-6">
              <Card title="Slowest routes">
                {d.delayedRoutes.length === 0 ? (
                  <p className="text-sm text-ink-muted">Not enough received parcels yet.</p>
                ) : (
                  <ul className="divide-y divide-line">
                    {d.delayedRoutes.map((r) => (
                      <li key={r.route} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-ink">{r.route}</span>
                          <span className="text-xs text-ink-muted">
                            {r.parcels} parcels · waited {minutes(r.avgWaitMinutes)} at destination
                          </span>
                        </span>
                        <span className="tabular shrink-0 text-sm font-semibold text-navy">{minutes(r.avgMinutes)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
              <Card title="External courier companies">
                <BarList data={d.providers.map((p) => ({ label: p.name, value: p.parcels }))} caption="Parcels per courier company" />
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
