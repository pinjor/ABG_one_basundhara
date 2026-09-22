import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { StatTile } from "../components/ui/StatTile";
import { StatusBadge } from "../components/ui/StatusBadge";
import { ModuleHeader } from "../components/layout/ModuleHeader";

interface DashboardSummary {
  zones: { total: number; totalCapacity: number; liveOccupancy: number };
  facilities: { total: number; byStatus: Record<string, number> };
  bookingsToday: number;
  activeMembers: number;
  gateEntriesToday: number;
  openServiceRequests: number;
}

interface AuditLogRow {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  createdAt: string;
  user: { name: string };
}

export function CommandCentre() {
  const { data: summary } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: async () => (await api.get<DashboardSummary>("/dashboard/summary")).data,
  });

  const { data: feed } = useQuery({
    queryKey: ["audit-recent"],
    queryFn: async () => (await api.get<AuditLogRow[]>("/audit-log/recent", { params: { take: 15 } })).data,
    refetchInterval: 15000,
  });

  const occupancyPct = summary && summary.zones.totalCapacity > 0
    ? Math.round((summary.zones.liveOccupancy / summary.zones.totalCapacity) * 100)
    : 0;

  return (
    <div>
      <ModuleHeader purpose="Complex-wide status across every operational module, scoped to what your role can act on." />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatTile label="Zones" value={summary?.zones.total ?? 0} tone="gold" />
        <StatTile label="Live Occupancy" value={occupancyPct} suffix="%" tone="teal" />
        <StatTile label="Facilities" value={summary?.facilities.total ?? 0} tone="blue" />
        <StatTile label="Bookings Today" value={summary?.bookingsToday ?? 0} />
        <StatTile label="Active Members" value={summary?.activeMembers ?? 0} />
        <StatTile label="Open Service Requests" value={summary?.openServiceRequests ?? 0} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-lg border border-border bg-surface p-4 lg:col-span-2">
          <h3 className="mb-3 font-display text-base font-semibold text-text">Facility status breakdown</h3>
          <div className="space-y-2">
            {summary && Object.entries(summary.facilities.byStatus).length > 0 ? (
              Object.entries(summary.facilities.byStatus).map(([status, count]) => {
                const pct = summary.facilities.total ? Math.round((count / summary.facilities.total) * 100) : 0;
                return (
                  <div key={status} className="flex items-center gap-3">
                    <div className="w-32 shrink-0">
                      <StatusBadge status={status} />
                    </div>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
                      <div className="h-full rounded-full bg-gold" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="w-10 shrink-0 text-right text-sm text-text-dim">{count}</div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-text-dim">No facility data yet.</p>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-surface p-4">
          <h3 className="mb-3 font-display text-base font-semibold text-text">Live activity</h3>
          <div className="space-y-3">
            {feed && feed.length > 0 ? (
              feed.map((row) => (
                <div key={row.id} className="border-b border-border-soft pb-2 text-sm last:border-0 last:pb-0">
                  <div className="text-text">
                    <span className="text-text-dim">{row.entityType}</span> · {row.action}
                  </div>
                  <div className="text-xs text-text-dimmer">
                    {row.user?.name ?? "System"} · {new Date(row.createdAt).toLocaleTimeString()}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-text-dim">No activity recorded yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
