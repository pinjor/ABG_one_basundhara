import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Camera, EyeOff, LayoutGrid, Loader2, LockKeyhole, Megaphone, Search, X, type LucideIcon } from "lucide-react";
import {
  INCIDENT_CATEGORY_LABEL,
  INCIDENT_CONFIDENTIAL_ROLES,
  INCIDENT_GROUPS,
  INCIDENT_GROUP_CATEGORIES,
  INCIDENT_GROUP_HINT,
  INCIDENT_GROUP_LABEL,
  INCIDENT_RESOLUTIONS,
  INCIDENT_RESOLUTION_LABEL,
  INCIDENT_SEVERITIES,
  INCIDENT_SEVERITY_LABEL,
  IncidentGroup,
  IncidentSeverity,
  isIncidentOpen,
  type IncidentCategory,
} from "@abg-dispatch/shared";
import { api, qs } from "../lib/api";
import { useAuth } from "../lib/auth";
import { ago, when } from "../lib/format";
import { useBranches, useIncidentSummary } from "../lib/lookups";
import type { IncidentRow, IncidentSummary } from "../lib/types";
import { ConfidentialBadge, Empty, ErrorNote, Field, INCIDENT_GROUP_ICON, IncidentGroupIcon, IncidentStatusBadge, PageHeader, ResolutionBadge, SeverityBadge, Spinner, Toggle, cx } from "../components/ui";

type StageView = "OPEN" | "REPORTED" | "ACKNOWLEDGED" | "UNDER_INVESTIGATION" | "CLOSED" | "ALL";

const FILTER_KEYS = ["status", "group", "q", "branchId", "category", "severity", "resolution", "confidential"] as const;

function Stat({ label, value, hint, tone, className }: { label: string; value: string | number; hint?: string; tone?: "pending" | "danger" | "success"; className?: string }) {
  return (
    <div className={cx("card px-4 py-3.5", tone === "danger" && "border-danger/30", className)}>
      <p className="text-xs font-medium text-ink-muted">{label}</p>
      <p className={cx("tabular mt-1 font-display text-2xl font-extrabold", tone === "danger" ? "text-danger" : tone === "pending" ? "text-pending" : tone === "success" ? "text-success" : "text-navy")}>{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-ink-subtle">{hint}</p>}
    </div>
  );
}

/** The four categories of the specification as large tabs, each with its icon and open count. */
function GroupTabs({ value, onChange, summary }: { value: string; onChange: (g: string) => void; summary?: IncidentSummary }) {
  const items: { value: string; label: string; hint: string; icon: LucideIcon; count?: number }[] = [
    { value: "", label: "All groups", hint: "Every report you can see", icon: LayoutGrid, count: summary?.open },
    ...INCIDENT_GROUPS.map((g) => ({ value: g, label: INCIDENT_GROUP_LABEL[g], hint: INCIDENT_GROUP_HINT[g], icon: INCIDENT_GROUP_ICON[g], count: summary?.byGroupOpen[g] })),
  ];
  return (
    <div className="-mx-1 mb-4 flex gap-2 overflow-x-auto px-1 pb-1 lg:grid lg:grid-cols-5 lg:overflow-visible" role="tablist" aria-label="Category">
      {items.map((t) => {
        const on = value === t.value;
        return (
          <button
            key={t.value || "ALL"}
            role="tab"
            aria-selected={on}
            title={t.hint}
            onClick={() => onChange(t.value)}
            className={cx(
              "flex min-w-[168px] shrink-0 items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition lg:min-w-0",
              on ? "border-navy bg-navy text-white shadow-card" : "border-line bg-white text-navy hover:border-line-strong hover:shadow-card",
            )}
          >
            <span className={cx("grid h-9 w-9 shrink-0 place-items-center rounded-lg", on ? "bg-white/15 text-white" : "bg-platinum-bright text-navy-500")}>
              <t.icon className="h-[18px] w-[18px]" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{t.label}</span>
              <span className={cx("block text-[11px]", on ? "text-platinum" : "text-ink-subtle")}>{t.count === undefined ? "—" : t.count === 0 ? "Nothing open" : `${t.count} open`}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function Reporter({ r }: { r: IncidentRow }) {
  if (r.reporterName) {
    return (
      <>
        <p className="text-ink">{r.reporterName}</p>
        {r.reporterCode && <p className="mono text-[11px] text-ink-subtle">{r.reporterCode}</p>}
      </>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-ink-muted">
      {r.confidential ? <LockKeyhole className="h-3.5 w-3.5" aria-hidden /> : <EyeOff className="h-3.5 w-3.5" aria-hidden />}
      {r.anonymous ? "Anonymous employee" : "Identity protected"}
    </span>
  );
}

function Thumb({ r, size = "h-12 w-12" }: { r: IncidentRow; size?: string }) {
  return (
    <div className={cx("relative shrink-0 overflow-hidden rounded-lg bg-platinum-bright", size)}>
      {r.thumbnailUrl ? <img src={r.thumbnailUrl} alt="" className="h-full w-full object-cover" loading="lazy" /> : <IncidentGroupIcon group={r.group} className="absolute inset-0 m-auto h-5 w-5 text-navy-500" />}
      {r.photoCount > 1 && (
        <span className="absolute bottom-0.5 right-0.5 inline-flex items-center gap-0.5 rounded bg-midnight/75 px-1 text-[10px] font-semibold text-white">
          <Camera className="h-2.5 w-2.5" aria-hidden />
          {r.photoCount}
        </span>
      )}
    </div>
  );
}

const urgentOpen = (r: IncidentRow) => r.severity === IncidentSeverity.CRITICAL && isIncidentOpen(r.status);

export function IncidentsPage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const branches = useBranches();
  const roles = useAuth((s) => s.profile?.roles ?? []);
  const seesConfidential = roles.some((r) => (INCIDENT_CONFIDENTIAL_ROLES as readonly string[]).includes(r));
  const [search, setSearch] = useState(params.get("q") ?? "");

  const filters = useMemo(() => Object.fromEntries(FILTER_KEYS.map((k) => [k, params.get(k) ?? ""]).filter(([, v]) => v)) as Record<string, string>, [params]);
  const view = (filters.status ?? "OPEN") as StageView;
  const group = filters.group ?? "";
  const set = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) (v ? next.set(k, v) : next.delete(k));
    setParams(next, { replace: true });
  };

  // Group tabs count across every group; the stage tabs and KPIs follow the selected group.
  const all = useIncidentSummary(filters.branchId);
  const scoped = useIncidentSummary(filters.branchId, !!group, group || undefined);
  const s = group ? scoped.data : all.data;

  const list = useInfiniteQuery({
    queryKey: ["admin", "incidents", filters],
    queryFn: ({ pageParam }) => api.get<{ items: IncidentRow[]; nextCursor: string | null }>(`/admin/incidents${qs({ ...filters, status: view, cursor: pageParam, limit: 30 })}`),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    // Thumbnails are short-lived signed links; refresh before they lapse.
    refetchInterval: 5 * 60_000,
  });
  const rows = list.data?.pages.flatMap((p) => p.items) ?? [];
  const tabs: { value: StageView; label: string; count?: number }[] = [
    { value: "OPEN", label: "Needs attention", count: s?.open },
    { value: "REPORTED", label: "Reported", count: s?.counts.REPORTED },
    { value: "ACKNOWLEDGED", label: "Acknowledged", count: s?.counts.ACKNOWLEDGED },
    { value: "UNDER_INVESTIGATION", label: "Under investigation", count: s?.counts.UNDER_INVESTIGATION },
    { value: "CLOSED", label: "Closed", count: s?.counts.CLOSED },
    { value: "ALL", label: "All" },
  ];
  const filterCount = ["branchId", "category", "severity", "resolution", "confidential"].filter((k) => filters[k]).length;
  const categories = group ? INCIDENT_GROUP_CATEGORIES[group as IncidentGroup] ?? [] : [];

  const select = (key: string, label: string, options: { value: string; label: string; group?: string }[], className = "w-full sm:w-[190px]") => {
    const groups = [...new Set(options.map((o) => o.group).filter(Boolean))] as string[];
    const option = (o: { value: string; label: string }) => (
      <option key={o.value} value={o.value}>
        {o.label}
      </option>
    );
    return (
      <Field label={label} className={className}>
        {(id) => (
          <select id={id} className="input" value={filters[key] ?? ""} onChange={(e) => set({ [key]: e.target.value })}>
            <option value="">Any</option>
            {groups.length
              ? groups.map((g) => (
                  <optgroup key={g} label={g}>
                    {options.filter((o) => o.group === g).map(option)}
                  </optgroup>
                ))
              : options.map(option)}
          </select>
        )}
      </Field>
    );
  };

  const categoryOptions = group
    ? categories.map((c) => ({ value: c, label: INCIDENT_CATEGORY_LABEL[c] }))
    : INCIDENT_GROUPS.flatMap((g) => INCIDENT_GROUP_CATEGORIES[g].map((c) => ({ value: c, label: INCIDENT_CATEGORY_LABEL[c], group: INCIDENT_GROUP_LABEL[g] })));
  const open = (r: IncidentRow) => navigate(`/incidents/${r.id}`);
  const groupLabel = group ? INCIDENT_GROUP_LABEL[group as IncidentGroup] : null;

  return (
    <div>
      <PageHeader
        overline="Operations"
        title="Incident & Facility Issues"
        subtitle="Safety, facility, security and IT problems employees report from the app, with photos. Acknowledge each one, investigate it and close it with a resolution — the reporter sees every stage."
      />

      <GroupTabs
        value={group}
        summary={all.data}
        onChange={(g) => set({ group: g || undefined, category: filters.category && g && !(INCIDENT_GROUP_CATEGORIES[g as IncidentGroup] as readonly string[]).includes(filters.category) ? undefined : filters.category })}
      />

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Stat label="Reported, not yet acknowledged" value={s?.counts.REPORTED ?? "—"} hint={s?.oldestReportedAt ? `Oldest since ${ago(s.oldestReportedAt)}` : "Nothing waiting"} tone={s?.counts.REPORTED ? "pending" : undefined} />
        <Stat label="Critical, open" value={s?.criticalOpen ?? "—"} hint={s?.criticalOpen ? "Act on these now" : "None open"} tone={s?.criticalOpen ? "danger" : undefined} />
        <Stat label="Critical or high, open" value={s?.urgentOpen ?? "—"} hint="Handle these first" tone={s?.urgentOpen ? "pending" : undefined} />
        <Stat label="Under investigation" value={s?.counts.UNDER_INVESTIGATION ?? "—"} hint="Being looked into or fixed" />
        <Stat label="Closed, last 30 days" value={s?.closedLast30Days ?? "—"} tone="success" />
        <Stat label="Average time to close" value={s?.avgHoursToClose != null ? `${s.avgHoursToClose} h` : "—"} hint="Report to Closed, last 30 days" />
      </div>

      <div className="card mb-4 p-3">
        <div className="-mx-1 mb-3 flex gap-1 overflow-x-auto pb-1" role="tablist" aria-label="Stage">
          {tabs.map((t) => (
            <button
              key={t.value}
              role="tab"
              aria-selected={view === t.value}
              onClick={() => set({ status: t.value === "OPEN" ? undefined : t.value, resolution: t.value === "CLOSED" || t.value === "ALL" ? filters.resolution : undefined })}
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
          {select("category", groupLabel ? `Sub-category · ${groupLabel}` : "Sub-category", categoryOptions, "w-full sm:w-[220px]")}
          {select("severity", "Severity", INCIDENT_SEVERITIES.map((v) => ({ value: v, label: INCIDENT_SEVERITY_LABEL[v] })), "w-full sm:w-[150px]")}
          {(view === "CLOSED" || view === "ALL") && select("resolution", "Resolution", INCIDENT_RESOLUTIONS.map((v) => ({ value: v, label: INCIDENT_RESOLUTION_LABEL[v] })), "w-full sm:w-[170px]")}
          {seesConfidential && (
            <label className="flex h-10 items-center gap-2.5 rounded-xl border border-line px-3 text-sm font-medium text-ink">
              <Toggle checked={filters.confidential === "true"} onChange={(v) => set({ confidential: v ? "true" : undefined })} label="Confidential reports only" />
              <LockKeyhole className="h-3.5 w-3.5 text-navy-500" aria-hidden /> Confidential only
            </label>
          )}
          {(filterCount > 0 || filters.q) && (
            <button
              className="btn-ghost h-10"
              onClick={() => {
                const keep = new URLSearchParams();
                if (filters.status) keep.set("status", filters.status);
                if (filters.group) keep.set("group", filters.group);
                setParams(keep, { replace: true });
                setSearch("");
              }}
            >
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
          <Empty
            icon={Megaphone}
            title={view === "OPEN" ? "Nothing needs attention" : "No reports match"}
            hint={view === "OPEN" ? `Every ${groupLabel ? `${groupLabel} ` : ""}report in your offices has been handled.` : "Try another tab or clear some filters."}
          />
        ) : (
          <>
            {/* Phones: one card per report. */}
            <ul className="divide-y divide-line md:hidden">
              {rows.map((r) => (
                <li key={r.id}>
                  <button className={cx("flex w-full gap-3 px-4 py-3.5 text-left transition hover:bg-surface/80", urgentOpen(r) && "bg-danger-soft/40")} onClick={() => open(r)}>
                    <Thumb r={r} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-ink">{r.title}</p>
                      <p className="mt-0.5 truncate text-xs text-ink-muted">
                        <span className="mono text-[11px] text-navy-500">{r.referenceNumber}</span> · {INCIDENT_CATEGORY_LABEL[r.category as IncidentCategory] ?? r.category}
                      </p>
                      <p className="truncate text-xs text-ink-subtle">{[r.branch.name, r.place].filter(Boolean).join(" · ")}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <SeverityBadge severity={r.severity} />
                        <IncidentStatusBadge status={r.status} size="sm" />
                        {r.resolution && <ResolutionBadge resolution={r.resolution} />}
                        {r.confidential && <ConfidentialBadge compact />}
                        <span className="ml-auto text-[11px] text-ink-subtle">{when(r.statusChangedAt)}</span>
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="border-b border-line bg-surface/70 text-xs text-ink-muted">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Report</th>
                    <th className="px-4 py-3 font-semibold">Category</th>
                    <th className="px-4 py-3 font-semibold">Where</th>
                    <th className="px-4 py-3 font-semibold">Reported by</th>
                    <th className="px-4 py-3 font-semibold">Severity</th>
                    <th className="px-4 py-3 font-semibold">Stage · last change</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {rows.map((r) => (
                    <tr key={r.id} className={cx("cursor-pointer transition hover:bg-surface/80", urgentOpen(r) && "bg-danger-soft/40")} onClick={() => open(r)}>
                      <td className={cx("max-w-[340px] px-4 py-3 align-top", urgentOpen(r) && "border-l-[3px] border-danger")}>
                        <div className="flex items-start gap-3">
                          <Thumb r={r} />
                          <div className="min-w-0">
                            <a href={`/incidents/${r.id}`} onClick={(e) => (e.preventDefault(), open(r))} className="block truncate font-medium text-ink hover:text-active hover:underline" title={r.title}>
                              {r.title}
                            </a>
                            <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-ink-muted">
                              <span className="mono text-[11.5px] text-navy-500">{r.referenceNumber}</span>
                              {r.confidential && <ConfidentialBadge compact />}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="max-w-[220px] px-4 py-3 align-top">
                        <p className="inline-flex items-center gap-1.5 font-medium text-ink">
                          <IncidentGroupIcon group={r.group} className="h-3.5 w-3.5 text-navy-500" />
                          {INCIDENT_GROUP_LABEL[r.group as IncidentGroup] ?? r.group}
                        </p>
                        <p className="text-xs text-ink-muted">{INCIDENT_CATEGORY_LABEL[r.category as IncidentCategory] ?? r.category}</p>
                      </td>
                      <td className="max-w-[240px] px-4 py-3 align-top">
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
                        <Reporter r={r} />
                      </td>
                      <td className="px-4 py-3 align-top">
                        <SeverityBadge severity={r.severity} />
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="flex flex-col items-start gap-1">
                          <IncidentStatusBadge status={r.status} size="sm" />
                          {r.resolution && <ResolutionBadge resolution={r.resolution} />}
                          <span className="whitespace-nowrap text-[11px] text-ink-subtle">{when(r.statusChangedAt)}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
      <p className="mt-3 text-xs text-ink-subtle">
        Showing {rows.length} report{rows.length === 1 ? "" : "s"}
        {list.hasNextPage ? " — more available" : ""}. Confidential reports (always including misconduct) are visible to head office only, and the reporter's identity is hidden from everyone handling them. Times are Asia/Dhaka.
      </p>
    </div>
  );
}
