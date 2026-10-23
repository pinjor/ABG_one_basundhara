import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { ArrowRight, CarFront, Flame, Gauge, Loader2, Navigation, Plus, Search, Users, Wrench, X } from "lucide-react";
import { Capability, TRIP_TYPE_LABEL, type TripType } from "@abg-dispatch/shared";
import { api, qs } from "../../lib/api";
import { useCan } from "../../lib/auth";
import { ago, when } from "../../lib/format";
import { Empty, ErrorNote, PageHeader, Spinner, Tabs, Toggle, cx } from "../../components/ui";
import type { ApprovalRow, CarRow, FleetSummary, Page } from "./types";
import { CarStatusBadge, Stat, UrgentTag } from "./ui";
import { NewRequisitionModal } from "./NewRequisitionModal";
import { DriversTab, VehiclesTab, useDirectoryBranches } from "./Register";

type Section = "requisitions" | "vehicles" | "drivers";
type View = "AWAITING_ME" | "OPEN" | "PENDING_HOD" | "PENDING_FLEET" | "ASSIGNED" | "IN_PROGRESS" | "COMPLETED" | "CLOSED" | "ALL" | "MINE";

export const useFleetSummary = (branchId?: string, enabled = true) =>
  useQuery({ queryKey: ["pool-car", "summary", branchId ?? ""], queryFn: () => api.get<FleetSummary>(`/admin/pool-car/summary${qs({ branchId })}`), refetchInterval: 60_000, enabled });

export function PoolCarPage() {
  const [params, setParams] = useSearchParams();
  const fleetView = useCan(Capability.FLEET_VIEW);
  const canRequest = useCan(Capability.FLEET_REQUEST);
  const branches = useDirectoryBranches();
  const branchId = params.get("branchId") ?? undefined;
  const section = ((fleetView && params.get("tab")) || "requisitions") as Section;
  const summary = useFleetSummary(branchId, fleetView);
  const s = summary.data;
  const newOpen = params.get("new") === "1";
  const set = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) (v ? next.set(k, v) : next.delete(k));
    setParams(next, { replace: true });
  };

  return (
    <div>
      <PageHeader
        overline="Facility & transport"
        title="Pool Car Requisition"
        subtitle="Request a car, approve your team's trips, and run the fleet: Pending HOD → Pending fleet manager → Assigned → In progress → Completed."
        actions={
          canRequest && (
            <button className="btn-primary" onClick={() => set({ new: "1" })}>
              <Plus className="h-4 w-4" /> New requisition
            </button>
          )
        }
      />

      {fleetView && (
        <div className="mb-5 grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 xl:grid-cols-4">
          <Stat icon={CarFront} label="Active Requisitions" value={s?.activeRequisitions ?? "—"} hint={s ? `${s.pendingHod} with HODs · ${s.pendingFleet} to assign · ${s.inProgress} on the road` : undefined} tone="active" />
          <Stat icon={Gauge} label="Pool Availability" value={s ? `${s.poolAvailabilityPct}%` : "—"} hint={s ? `${s.vehicles.available} of ${s.vehicles.total} cars free now · ${s.drivers.available} drivers free` : undefined} tone={s && s.poolAvailabilityPct < 30 ? "danger" : "success"} />
          <Stat icon={Navigation} label="Vehicles On-Trip" value={s?.vehicles.onTrip ?? "—"} hint={s ? `${s.tripsToday} trip${s.tripsToday === 1 ? "" : "s"} today · ${s.completedLast30Days} done in 30 days` : undefined} tone="active" />
          <Stat icon={Wrench} label="Fleet Maintenance" value={s?.vehicles.maintenance ?? "—"} hint={s ? (s.vehicles.documentsDue ? `${s.vehicles.documentsDue} with service or papers due` : "Service and papers up to date") : undefined} tone={s?.vehicles.maintenance || s?.vehicles.documentsDue ? "pending" : "success"} />
        </div>
      )}

      {fleetView && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <Tabs<Section>
            value={section}
            onChange={(v) => set({ tab: v === "requisitions" ? undefined : v })}
            items={[
              { value: "requisitions", label: "Requisitions", count: s?.activeRequisitions },
              { value: "vehicles", label: "Vehicles", count: s?.vehicles.total },
              { value: "drivers", label: "Drivers", count: s?.drivers.total },
            ]}
          />
          {(branches.data?.length ?? 0) > 1 && (
            <select className="input h-9 w-full sm:w-[220px]" aria-label="Office" value={branchId ?? ""} onChange={(e) => set({ branchId: e.target.value || undefined })}>
              <option value="">All my offices</option>
              {branches.data!.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {section === "vehicles" ? <VehiclesTab branchId={branchId} /> : section === "drivers" ? <DriversTab branchId={branchId} /> : fleetView ? <RequisitionsList summary={s} branchId={branchId} /> : <MyRequestsAndApprovals />}

      <NewRequisitionModal open={newOpen && canRequest} onClose={() => set({ new: undefined })} />
    </div>
  );
}

/** Fleet staff: every requisition in their offices, by status. */
function RequisitionsList({ summary, branchId }: { summary?: FleetSummary; branchId?: string }) {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const canManage = useCan(Capability.FLEET_MANAGE);
  // The fleet manager starts on their to-do list; everyone else on what is happening now.
  const view = (params.get("status") ?? (canManage ? "AWAITING_ME" : "OPEN")) as View;
  const q = params.get("q") ?? "";
  const urgent = params.get("urgent") === "true";
  const [search, setSearch] = useState(q);
  const set = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) (v ? next.set(k, v) : next.delete(k));
    setParams(next, { replace: true });
  };
  const filters = useMemo(() => ({ status: view === "MINE" ? undefined : view, branchId, q: q || undefined, urgent: urgent ? "true" : undefined }), [view, branchId, q, urgent]);
  const list = useInfiniteQuery({
    queryKey: ["pool-car", "list", view, filters],
    queryFn: ({ pageParam }) =>
      view === "MINE"
        ? api.get<Page<CarRow>>(`/pool-car/requisitions/mine${qs({ state: "all", cursor: pageParam, limit: 30 })}`)
        : api.get<Page<CarRow>>(`/admin/pool-car/requisitions${qs({ ...filters, cursor: pageParam, limit: 30 })}`),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    refetchInterval: 60_000,
  });
  let rows = list.data?.pages.flatMap((p) => p.items) ?? [];
  if (view === "MINE") rows = rows.filter((r) => (!urgent || r.urgent) && (!q || `${r.referenceNumber} ${r.purpose} ${r.dropLocation}`.toLowerCase().includes(q.toLowerCase())));
  const c = summary?.counts;
  const tabs: { value: View; label: string; count?: number }[] = [
    { value: "AWAITING_ME", label: "Awaiting me", count: summary?.awaitingMe },
    { value: "OPEN", label: "Active", count: summary?.activeRequisitions },
    { value: "PENDING_HOD", label: "Pending HOD", count: c?.PENDING_HOD },
    { value: "PENDING_FLEET", label: "Pending fleet manager", count: c?.PENDING_FLEET },
    { value: "ASSIGNED", label: "Assigned", count: c?.ASSIGNED },
    { value: "IN_PROGRESS", label: "In progress", count: c?.IN_PROGRESS },
    { value: "COMPLETED", label: "Completed", count: c?.COMPLETED },
    { value: "CLOSED", label: "Rejected & cancelled", count: c ? c.REJECTED + c.CANCELLED : undefined },
    { value: "ALL", label: "All" },
    { value: "MINE", label: "My requests" },
  ];

  return (
    <>
      <div className="card mb-4 p-3">
        <div className="-mx-1 mb-3 flex gap-1 overflow-x-auto pb-1" role="tablist" aria-label="Requisition status">
          {tabs.map((t) => (
            <button
              key={t.value}
              role="tab"
              aria-selected={view === t.value}
              onClick={() => set({ status: t.value })}
              className={cx("inline-flex h-9 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition", view === t.value ? "bg-navy text-white" : "text-ink-muted hover:bg-surface hover:text-navy")}
            >
              {t.label}
              {t.count !== undefined && <span className={cx("tabular rounded-md px-1.5 text-[11px]", view === t.value ? "bg-white/15" : t.value === "AWAITING_ME" && t.count ? "bg-pending-soft text-pending" : "bg-platinum-bright text-navy-500")}>{t.count}</span>}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <form
            className="relative w-full min-w-[220px] flex-1 sm:w-auto"
            onSubmit={(e) => {
              e.preventDefault();
              set({ q: search.trim() || undefined });
            }}
          >
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subtle" aria-hidden />
            <input className="input pl-9" placeholder="Reference, purpose, place, person, car or driver…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search requisitions" />
          </form>
          <label className={cx("inline-flex h-10 items-center gap-2 rounded-xl border px-3 text-sm font-semibold", urgent ? "border-danger/30 bg-danger-soft text-danger" : "border-line text-ink-muted")}>
            <Flame className="h-4 w-4" aria-hidden /> Urgent only
            <Toggle checked={urgent} onChange={(v) => set({ urgent: v ? "true" : undefined })} label="Show urgent requests only" />
          </label>
          {(q || urgent) && (
            <button className="btn-ghost h-10" onClick={() => (set({ q: undefined, urgent: undefined }), setSearch(""))}>
              <X className="h-4 w-4" /> Clear
            </button>
          )}
        </div>
      </div>

      <ErrorNote error={list.error} />
      <div className="card overflow-hidden">
        {list.isLoading ? (
          <Spinner label="Loading requisitions" />
        ) : rows.length === 0 ? (
          <Empty icon={CarFront} title={view === "AWAITING_ME" ? "Nothing is waiting for you" : "No requisitions match"} hint={view === "AWAITING_ME" ? (canManage ? "Every approved request has a car. New ones appear here." : "Requests that need your approval appear here.") : "Try another tab or clear the filters."} />
        ) : (
          <>
            <table className="hidden w-full text-left text-sm lg:table">
              <thead className="border-b border-line bg-surface/70 text-xs text-ink-muted">
                <tr>
                  <th className="px-4 py-3 font-semibold">Request</th>
                  <th className="px-4 py-3 font-semibold">Trip</th>
                  <th className="px-4 py-3 font-semibold">Pickup</th>
                  <th className="px-4 py-3 font-semibold">Requested by</th>
                  <th className="px-4 py-3 font-semibold">Car & driver</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((r) => (
                  <tr key={r.id} className={cx("cursor-pointer transition hover:bg-surface/80", r.awaitingMe && "bg-pending-soft/30")} onClick={() => navigate(`/pool-car/${r.id}`)}>
                    <td className="max-w-[300px] px-4 py-3 align-top">
                      <Link to={`/pool-car/${r.id}`} onClick={(e) => e.stopPropagation()} className="block truncate font-medium text-ink hover:text-active hover:underline" title={r.purpose}>
                        {r.purpose}
                      </Link>
                      <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-ink-muted">
                        <span className="mono text-[11.5px] text-navy-500">{r.referenceNumber}</span>
                        {r.urgent && <UrgentTag />}
                      </p>
                    </td>
                    <td className="max-w-[260px] px-4 py-3 align-top">
                      <p className="text-ink">{TRIP_TYPE_LABEL[r.tripType as TripType] ?? r.tripType}</p>
                      <p className="truncate text-xs text-ink-muted" title={`${r.pickupLocation} → ${r.dropLocation}`}>
                        → {r.dropLocation}
                      </p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 align-top">
                      <p className="tabular text-ink">{when(r.pickupAt)}</p>
                      <p className="text-xs text-ink-muted">
                        <Users className="mr-1 inline h-3 w-3" aria-hidden />
                        {r.passengerCount} {r.passengerCount === 1 ? "person" : "people"}
                      </p>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <p className="text-ink">{r.requester.name}</p>
                      <p className="text-xs text-ink-muted">{[r.requester.department, r.branch.code].filter(Boolean).join(" · ")}</p>
                    </td>
                    <td className="px-4 py-3 align-top">
                      {r.vehicle ? (
                        <>
                          <p className="mono text-[12.5px] text-navy">{r.vehicle.registrationNumber}</p>
                          <p className="text-xs text-ink-muted">
                            {r.vehicle.name} · {r.driver?.fullName}
                          </p>
                        </>
                      ) : (
                        <span className="text-xs text-ink-subtle">Not assigned yet</span>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="flex flex-col items-start gap-1">
                        <CarStatusBadge status={r.status} size="sm" />
                        <span className="whitespace-nowrap text-[11px] text-ink-subtle">{r.awaitingMe ? "Waiting for you" : ago(r.statusChangedAt)}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <ul className="divide-y divide-line lg:hidden">
              {rows.map((r) => (
                <li key={r.id}>
                  <RowCard r={r} />
                </li>
              ))}
            </ul>
          </>
        )}
        {list.hasNextPage && (
          <div className="border-t border-line p-3 text-center">
            <button className="btn-secondary" onClick={() => list.fetchNextPage()} disabled={list.isFetchingNextPage}>
              {list.isFetchingNextPage && <Loader2 className="h-4 w-4 animate-spin" />} Load more
            </button>
          </div>
        )}
      </div>
      <p className="mt-3 text-xs text-ink-subtle">Times are Asia/Dhaka. Rows tinted amber are waiting for you.</p>
    </>
  );
}

function RowCard({ r, note }: { r: { id: string; referenceNumber: string; purpose: string; status: string; urgent: boolean; pickupAt: string; dropLocation: string; passengerCount: number; tripType: string }; note?: string }) {
  return (
    <Link to={`/pool-car/${r.id}`} className="flex items-start gap-3 px-4 py-3.5 transition hover:bg-surface/80">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-platinum-bright text-navy-500">
        <CarFront className="h-5 w-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ink">{r.purpose}</p>
        <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-ink-muted">
          <span className="mono text-[11px] text-navy-500">{r.referenceNumber}</span>
          {r.urgent && <UrgentTag />}
        </p>
        <p className="mt-1 truncate text-xs text-ink-muted">
          {TRIP_TYPE_LABEL[r.tripType as TripType] ?? r.tripType} · {when(r.pickupAt)} → {r.dropLocation} · {r.passengerCount} {r.passengerCount === 1 ? "person" : "people"}
        </p>
        {note && <p className="mt-0.5 truncate text-xs text-ink-subtle">{note}</p>}
        <div className="mt-2">
          <CarStatusBadge status={r.status} size="sm" />
        </div>
      </div>
      <ArrowRight className="mt-3 h-4 w-4 shrink-0 text-ink-subtle" aria-hidden />
    </Link>
  );
}

/** Everyone else: their own requests, and the ones waiting for their approval as head of department. */
function MyRequestsAndApprovals() {
  const [tab, setTab] = useState<"mine" | "approvals">("mine");
  const approvals = useQuery({ queryKey: ["pool-car", "approvals"], queryFn: () => api.get<Page<ApprovalRow>>("/pool-car/approvals"), refetchInterval: 60_000 });
  const mine = useInfiniteQuery({
    queryKey: ["pool-car", "mine"],
    queryFn: ({ pageParam }) => api.get<Page<CarRow>>(`/pool-car/requisitions/mine${qs({ state: "all", cursor: pageParam, limit: 30 })}`),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    refetchInterval: 60_000,
  });
  const waiting = approvals.data?.items ?? [];
  const rows = mine.data?.pages.flatMap((p) => p.items) ?? [];
  const current = tab === "approvals" ? approvals : mine;

  return (
    <>
      <div className="mb-4">
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
            { value: "mine", label: "My requests", count: rows.length || undefined },
            { value: "approvals", label: "Awaiting me", count: waiting.length },
          ]}
        />
      </div>
      <ErrorNote error={current.error} />
      <div className="card overflow-hidden">
        {current.isLoading ? (
          <Spinner />
        ) : tab === "approvals" ? (
          waiting.length === 0 ? (
            <Empty icon={CarFront} title="Nothing to approve" hint="When someone in your team requests a pool car and names you as their head of department, it appears here." />
          ) : (
            <ul className="divide-y divide-line">
              {waiting.map((r) => (
                <li key={r.id}>
                  <RowCard r={{ ...r, purpose: r.title }} note={`${r.requester.name}${r.requester.designation ? ` · ${r.requester.designation}` : ""} · asked ${ago(r.createdAt)}`} />
                </li>
              ))}
            </ul>
          )
        ) : rows.length === 0 ? (
          <Empty icon={CarFront} title="No requests yet" hint="Use New requisition to ask for a pool car. You will see the driver and your gate pass here once it is assigned." />
        ) : (
          <ul className="divide-y divide-line">
            {rows.map((r) => (
              <li key={r.id}>
                <RowCard r={r} note={r.vehicle ? `${r.vehicle.name} · ${r.vehicle.registrationNumber} · ${r.driver?.fullName}` : `Approver: ${r.approverName}`} />
              </li>
            ))}
          </ul>
        )}
        {tab === "mine" && mine.hasNextPage && (
          <div className="border-t border-line p-3 text-center">
            <button className="btn-secondary" onClick={() => mine.fetchNextPage()} disabled={mine.isFetchingNextPage}>
              {mine.isFetchingNextPage && <Loader2 className="h-4 w-4 animate-spin" />} Load more
            </button>
          </div>
        )}
      </div>
    </>
  );
}
