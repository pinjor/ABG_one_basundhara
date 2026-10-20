import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Camera, EyeOff, Loader2, Megaphone, Search, X } from "lucide-react";
import { INCIDENT_CATEGORY_LABEL, INCIDENT_SEVERITY_LABEL, type IncidentCategory } from "@abg-dispatch/shared";
import { api, qs } from "../lib/api";
import { ago, when } from "../lib/format";
import { useBranches, useIncidentSummary } from "../lib/lookups";
import type { IncidentRow } from "../lib/types";
import { Empty, ErrorNote, Field, IncidentStatusBadge, PageHeader, SeverityBadge, Spinner, cx } from "../components/ui";

type View = "OPEN" | "PENDING" | "PROCESSING" | "DONE" | "DECLINED" | "ALL";

const FILTER_KEYS = ["status", "q", "branchId", "category", "severity"] as const;

function Stat({ label, value, hint, tone, className }: { label: string; value: string | number; hint?: string; tone?: "pending" | "danger" | "success"; className?: string }) {
  return (
    <div className={cx("card px-4 py-3.5", className)}>
      <p className="text-xs font-medium text-ink-muted">{label}</p>
      <p className={cx("tabular mt-1 font-display text-2xl font-extrabold", tone === "danger" ? "text-danger" : tone === "pending" ? "text-pending" : tone === "success" ? "text-success" : "text-navy")}>{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-ink-subtle">{hint}</p>}
    </div>
  );
}

export function IncidentsPage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const branches = useBranches();
  const [search, setSearch] = useState(params.get("q") ?? "");

  const filters = useMemo(() => Object.fromEntries(FILTER_KEYS.map((k) => [k, params.get(k) ?? ""]).filter(([, v]) => v)) as Record<string, string>, [params]);
  const view = (filters.status ?? "OPEN") as View;
  const set = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) (v ? next.set(k, v) : next.delete(k));
    setParams(next, { replace: true });
  };

  const summary = useIncidentSummary(filters.branchId);
  const list = useInfiniteQuery({
    queryKey: ["admin", "incidents", filters],
    queryFn: ({ pageParam }) => api.get<{ items: IncidentRow[]; nextCursor: string | null }>(`/admin/incidents${qs({ ...filters, status: view, cursor: pageParam, limit: 30 })}`),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    // Thumbnails are short-lived signed links; refresh before they lapse.
    refetchInterval: 5 * 60_000,
  });
  const rows = list.data?.pages.flatMap((p) => p.items) ?? [];
  const s = summary.data;
  const tabs: { value: View; label: string; count?: number }[] = [
    { value: "OPEN", label: "Needs attention", count: s?.open },
    { value: "PENDING", label: "Pending", count: s?.counts.PENDING },
    { value: "PROCESSING", label: "Processing", count: s?.counts.PROCESSING },
    { value: "DONE", label: "Done", count: s?.counts.DONE },
    { value: "DECLINED", label: "Declined", count: s?.counts.DECLINED },
    { value: "ALL", label: "All" },
  ];
  const filterCount = ["branchId", "category", "severity"].filter((k) => filters[k]).length;

  const select = (key: string, label: string, options: { value: string; label: string }[]) => (
    <Field label={label} className="w-full sm:w-[190px]">
      {(id) => (
        <select id={id} className="input" value={filters[key] ?? ""} onChange={(e) => set({ [key]: e.target.value })}>
          <option value="">Any</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}
    </Field>
  );

  return (
    <div>
      <PageHeader overline="Operations" title="Incident reports" subtitle="Problems employees have reported with a photo — damage, hygiene, safety and more. Move each one to Processing and Done; the reporter sees every change." />

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <Stat label="Pending" value={s?.counts.PENDING ?? "—"} hint={s?.oldestPendingAt ? `Oldest waiting since ${ago(s.oldestPendingAt)}` : "Nothing waiting"} tone={s?.counts.PENDING ? "pending" : undefined} />
        <Stat label="Processing" value={s?.counts.PROCESSING ?? "—"} hint="Being fixed now" />
        <Stat label="Urgent or high, open" value={s?.urgentOpen ?? "—"} hint="Handle these first" tone={s?.urgentOpen ? "danger" : undefined} />
        <Stat label="Resolved, last 30 days" value={s?.doneLast30Days ?? "—"} tone="success" />
        <Stat label="Average time to resolve" value={s?.avgHoursToDone != null ? `${s.avgHoursToDone} h` : "—"} hint="Report to Done, last 30 days" className="col-span-2 md:col-span-1" />
      </div>

      <div className="card mb-4 p-3">
        <div className="-mx-1 mb-3 flex gap-1 overflow-x-auto pb-1" role="tablist" aria-label="Report status">
          {tabs.map((t) => (
            <button
              key={t.value}
              role="tab"
              aria-selected={view === t.value}
              onClick={() => set({ status: t.value === "OPEN" ? undefined : t.value })}
              className={cx("inline-flex h-9 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition", view === t.value ? "bg-navy text-white" : "text-ink-muted hover:bg-surface hover:text-navy")}
            >
              {t.label}
              {t.count !== undefined && <span className={cx("tabular rounded-md px-1.5 text-[11px]", view === t.value ? "bg-white/15" : "bg-platinum-bright text-navy-500")}>{t.count}</span>}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <form
            className="relative w-full min-w-[240px] flex-1 sm:w-auto"
            onSubmit={(e) => {
              e.preventDefault();
              set({ q: search.trim() || undefined });
            }}
          >
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subtle" aria-hidden />
            <input className="input pl-9" placeholder="Reference, title, place or reporter…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search reports" />
          </form>
          {select("branchId", "Office", (branches.data ?? []).map((b) => ({ value: b.id, label: b.name })))}
          {select("category", "Kind of problem", Object.entries(INCIDENT_CATEGORY_LABEL).map(([value, label]) => ({ value, label })))}
          {select("severity", "Urgency", Object.entries(INCIDENT_SEVERITY_LABEL).map(([value, label]) => ({ value, label })))}
          {(filterCount > 0 || filters.q) && (
            <button className="btn-ghost h-10" onClick={() => (setParams(new URLSearchParams(filters.status ? { status: filters.status } : {}), { replace: true }), setSearch(""))}>
              <X className="h-4 w-4" /> Clear
            </button>
          )}
        </div>
      </div>

      <ErrorNote error={list.error} />
      <div className="card overflow-hidden">
        {list.isLoading ? (
          <Spinner label="Loading reports" />
        ) : rows.length === 0 ? (
          <Empty icon={Megaphone} title={view === "OPEN" ? "Nothing needs attention" : "No reports match"} hint={view === "OPEN" ? "Every report in your offices has been handled." : "Try another tab or clear some filters."} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="border-b border-line bg-surface/70 text-xs text-ink-muted">
                <tr>
                  <th className="px-4 py-3 font-semibold">Report</th>
                  <th className="px-4 py-3 font-semibold">Where</th>
                  <th className="px-4 py-3 font-semibold">Reported by</th>
                  <th className="px-4 py-3 font-semibold">Urgency</th>
                  <th className="px-4 py-3 font-semibold">Status · last change</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((r) => (
                  <tr key={r.id} className="cursor-pointer transition hover:bg-surface/80" onClick={() => navigate(`/incidents/${r.id}`)}>
                    <td className="max-w-[380px] px-4 py-3 align-top">
                      <div className="flex items-start gap-3">
                        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-platinum-bright">
                          {r.thumbnailUrl ? <img src={r.thumbnailUrl} alt="" className="h-full w-full object-cover" loading="lazy" /> : <Megaphone className="m-3.5 h-5 w-5 text-navy-500" aria-hidden />}
                          {r.photoCount > 1 && (
                            <span className="absolute bottom-0.5 right-0.5 inline-flex items-center gap-0.5 rounded bg-midnight/75 px-1 text-[10px] font-semibold text-white">
                              <Camera className="h-2.5 w-2.5" aria-hidden />
                              {r.photoCount}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <a href={`/incidents/${r.id}`} onClick={(e) => (e.preventDefault(), navigate(`/incidents/${r.id}`))} className="block truncate font-medium text-ink hover:text-active hover:underline" title={r.title}>
                            {r.title}
                          </a>
                          <p className="mt-0.5 text-xs text-ink-muted">
                            <span className="mono text-[11.5px] text-navy-500">{r.referenceNumber}</span> · {INCIDENT_CATEGORY_LABEL[r.category as IncidentCategory] ?? r.category}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="max-w-[260px] px-4 py-3 align-top">
                      <p className="text-ink">
                        {r.branch.name} <span className="mono text-[11px] text-ink-subtle">{r.branch.code}</span>
                      </p>
                      {r.place && (
                        <p className="truncate text-xs text-ink-muted" title={r.place}>
                          {r.place}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top">
                      {r.anonymous ? (
                        <span className="inline-flex items-center gap-1.5 text-ink-muted">
                          <EyeOff className="h-3.5 w-3.5" aria-hidden /> Anonymous employee
                        </span>
                      ) : (
                        <>
                          <p className="text-ink">{r.reporterName}</p>
                          {r.reporterCode && <p className="mono text-[11px] text-ink-subtle">{r.reporterCode}</p>}
                        </>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <SeverityBadge severity={r.severity} />
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="flex flex-col items-start gap-1">
                        <IncidentStatusBadge status={r.status} size="sm" />
                        <span className="whitespace-nowrap text-[11px] text-ink-subtle">{when(r.statusChangedAt)}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {list.hasNextPage && (
          <div className="border-t border-line p-3 text-center">
            <button className="btn-secondary" onClick={() => list.fetchNextPage()} disabled={list.isFetchingNextPage}>
              {list.isFetchingNextPage && <Loader2 className="h-4 w-4 animate-spin" />} Load more
            </button>
          </div>
        )}
      </div>
      <p className="mt-3 text-xs text-ink-subtle">
        Showing {rows.length} report{rows.length === 1 ? "" : "s"}
        {list.hasNextPage ? " — more available" : ""}. Confidential misconduct reports are visible to head office only. Times are Asia/Dhaka.
      </p>
    </div>
  );
}
