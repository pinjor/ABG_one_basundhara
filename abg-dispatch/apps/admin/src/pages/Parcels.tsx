import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bookmark, BookmarkPlus, Download, Filter, Loader2, PackageSearch, Search, Trash2, X } from "lucide-react";
import { CARRIER_TYPE_LABEL, CLASSIFICATION_LABEL, Capability, PRIORITY_LABEL, StatusView } from "@abg-dispatch/shared";
import { api, download, qs } from "../lib/api";
import { useCan } from "../lib/auth";
import { daysAgo, dhakaDay, when } from "../lib/format";
import { useBranches, useCategories, useProviders } from "../lib/lookups";
import { ClassificationTag, Empty, ErrorNote, Field, Modal, OverdueTag, PageHeader, PriorityBadge, Spinner, StatusBadge, TrackingLink, cx } from "../components/ui";
import { toast } from "../components/toast";

export interface ParcelRow {
  id: string;
  trackingNumber: string;
  title: string;
  category: string;
  classification: string;
  priority: string;
  status: string;
  deliveryMethod: string;
  sender: { name: string; employeeCode: string | null };
  receiver: { name: string; employeeCode: string | null };
  origin: string;
  originCode: string;
  destination: string;
  destinationCode: string | null;
  carrier: { type: string; name: string; provider: string | null; externalTrackingNumber: string | null } | null;
  receivedBy: string | null;
  receivedOnBehalf: boolean;
  bookedAt: string | null;
  receivedAt: string | null;
  statusChangedAt: string;
  isOverdue: boolean;
  hasOpenException: boolean;
  createdAt: string;
}

const VIEWS: { value: string; label: string }[] = [
  { value: StatusView.ALL, label: "All" },
  { value: StatusView.BOOKED, label: "Booked" },
  { value: StatusView.AWAITING_PICKUP, label: "Awaiting pickup" },
  { value: StatusView.IN_ROUTE, label: "In route" },
  { value: StatusView.ARRIVED, label: "Arrived" },
  { value: StatusView.PENDING_RECEIPT, label: "Pending receipt" },
  { value: StatusView.RECEIVED, label: "Received" },
  { value: StatusView.EXCEPTIONS, label: "Exceptions" },
  { value: StatusView.OVERDUE, label: "Overdue" },
  { value: StatusView.RETURNS, label: "Returns" },
  { value: StatusView.CANCELLED, label: "Cancelled" },
  { value: StatusView.DRAFTS, label: "Drafts" },
];

/** Filters the URL may carry; also what a saved view stores. */
const FILTER_KEYS = ["view", "q", "status", "priority", "classification", "categoryId", "originBranchId", "destinationBranchId", "branchId", "carrierType", "courierProviderId", "overdue", "received", "dateFrom", "dateTo", "dateField"] as const;

const PRESETS = [
  { id: "today", label: "Today", from: () => dhakaDay(), to: () => dhakaDay() },
  { id: "7d", label: "Last 7 days", from: () => daysAgo(6), to: () => dhakaDay() },
  { id: "30d", label: "Last 30 days", from: () => daysAgo(29), to: () => dhakaDay() },
  { id: "month", label: "This month", from: () => `${dhakaDay().slice(0, 8)}01`, to: () => dhakaDay() },
];

interface SavedView {
  id: string;
  name: string;
  filters: Record<string, string>;
}

export function ParcelsPage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const canExport = useCan(Capability.REPORTS_EXPORT);
  const branches = useBranches();
  const categories = useCategories();
  const providers = useProviders();
  const [showFilters, setShowFilters] = useState(() => FILTER_KEYS.some((k) => !["view", "q"].includes(k) && params.get(k)));
  const [search, setSearch] = useState(params.get("q") ?? "");
  const [saveOpen, setSaveOpen] = useState(false);
  const [viewName, setViewName] = useState("");
  const [exporting, setExporting] = useState(false);

  const filters = useMemo(() => Object.fromEntries(FILTER_KEYS.map((k) => [k, params.get(k) ?? ""]).filter(([, v]) => v)) as Record<string, string>, [params]);
  const view = filters.view ?? StatusView.ALL;
  const set = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) (v ? next.set(k, v) : next.delete(k));
    setParams(next, { replace: true });
  };

  const list = useInfiniteQuery({
    queryKey: ["admin", "parcels", filters],
    queryFn: ({ pageParam }) => api.get<{ items: ParcelRow[]; nextCursor: string | null }>(`/admin/parcels${qs({ ...filters, cursor: pageParam, limit: 30 })}`),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
  const rows = list.data?.pages.flatMap((p) => p.items) ?? [];

  const views = useQuery({ queryKey: ["admin", "saved-views"], queryFn: () => api.get<SavedView[]>("/admin/saved-views") });
  const saveView = useMutation({
    mutationFn: () => api.post("/admin/saved-views", { name: viewName, filters }),
    onSuccess: () => {
      toast.success(`Saved view "${viewName}"`);
      setSaveOpen(false);
      setViewName("");
      void qc.invalidateQueries({ queryKey: ["admin", "saved-views"] });
    },
    onError: toast.error,
  });
  const deleteView = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/saved-views/${id}`),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["admin", "saved-views"] }),
    onError: toast.error,
  });

  const activePreset = PRESETS.find((p) => filters.dateFrom === p.from() && filters.dateTo === p.to())?.id;
  const filterCount = Object.keys(filters).filter((k) => !["view", "q"].includes(k)).length;

  const exportCsv = async () => {
    setExporting(true);
    try {
      await download(`/admin/parcels/export.csv${qs(filters)}`, `abg-dispatch-parcels-${dhakaDay()}.csv`);
    } catch (err) {
      toast.error(err);
    } finally {
      setExporting(false);
    }
  };

  const select = (key: string, label: string, options: { value: string; label: string }[]) => (
    <Field label={label}>
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
  const branchOptions = (branches.data ?? []).map((b) => ({ value: b.id, label: b.name }));

  return (
    <div>
      <PageHeader
        overline="Operations"
        title="Parcels"
        subtitle="Every parcel in your offices. Arrived and received are tracked separately."
        actions={
          <>
            <button className="btn-secondary" onClick={() => setSaveOpen(true)}>
              <BookmarkPlus className="h-4 w-4" /> Save view
            </button>
            {canExport && (
              <button className="btn-primary" onClick={exportCsv} disabled={exporting}>
                {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Export CSV
              </button>
            )}
          </>
        }
      />

      {!!views.data?.length && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="overline mr-1">Saved views</span>
          {views.data.map((v) => (
            <span key={v.id} className="group inline-flex items-center overflow-hidden rounded-full border border-line bg-white text-sm shadow-card">
              <button className="inline-flex items-center gap-1.5 py-1 pl-3 pr-2 font-medium text-navy hover:text-active" onClick={() => (setParams(new URLSearchParams(v.filters), { replace: true }), setSearch(v.filters.q ?? ""))}>
                <Bookmark className="h-3.5 w-3.5" /> {v.name}
              </button>
              <button className="py-1 pl-1 pr-2.5 text-ink-subtle hover:text-danger" onClick={() => deleteView.mutate(v.id)} aria-label={`Delete saved view ${v.name}`}>
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="card mb-4 p-3">
        <div className="mb-3">
          <div className="-mx-1 flex gap-1 overflow-x-auto pb-1" role="tablist" aria-label="Status views">
            {VIEWS.map((v) => (
              <button
                key={v.value}
                role="tab"
                aria-selected={view === v.value}
                onClick={() => set({ view: v.value === StatusView.ALL ? undefined : v.value, status: undefined })}
                className={cx("h-9 shrink-0 rounded-lg px-3 text-sm font-semibold transition", view === v.value && !filters.status ? "bg-navy text-white" : "text-ink-muted hover:bg-surface hover:text-navy")}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <form
            className="relative min-w-[240px] flex-1"
            onSubmit={(e) => {
              e.preventDefault();
              set({ q: search.trim() || undefined });
            }}
          >
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subtle" aria-hidden />
            <input className="input pl-9" placeholder="Tracking ID, title, sender, receiver, employee ID, courier tracking…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search" />
          </form>
          <div className="flex flex-wrap gap-1 rounded-xl bg-surface p-1" role="group" aria-label="Date range">
            {PRESETS.map((p) => (
              <button key={p.id} className={cx("h-8 rounded-lg px-2.5 text-[13px] font-semibold", activePreset === p.id ? "bg-white text-navy shadow-card" : "text-ink-muted hover:text-navy")} onClick={() => set(activePreset === p.id ? { dateFrom: undefined, dateTo: undefined } : { dateFrom: p.from(), dateTo: p.to() })}>
                {p.label}
              </button>
            ))}
          </div>
          <button className={cx("btn-secondary h-10", showFilters && "border-navy")} onClick={() => setShowFilters((v) => !v)} aria-expanded={showFilters}>
            <Filter className="h-4 w-4" /> Filters{filterCount ? ` (${filterCount})` : ""}
          </button>
          {(filterCount > 0 || filters.q) && (
            <button className="btn-ghost h-10" onClick={() => (setParams(new URLSearchParams(filters.view ? { view: filters.view } : {}), { replace: true }), setSearch(""))}>
              <X className="h-4 w-4" /> Clear
            </button>
          )}
        </div>
        {showFilters && (
          <div className="mt-3 grid grid-cols-1 gap-3 border-t border-line pt-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
            {select("originBranchId", "From office", branchOptions)}
            {select("destinationBranchId", "To office", branchOptions)}
            {select("priority", "Priority", Object.entries(PRIORITY_LABEL).map(([value, label]) => ({ value, label })))}
            {select("classification", "Classification", Object.entries(CLASSIFICATION_LABEL).map(([value, label]) => ({ value, label })))}
            {select("carrierType", "Carrier type", Object.entries(CARRIER_TYPE_LABEL).map(([value, label]) => ({ value, label })))}
            {select("courierProviderId", "Courier company", (providers.data ?? []).map((p) => ({ value: p.id, label: p.name })))}
            {select("categoryId", "Category", (categories.data ?? []).map((c) => ({ value: c.id, label: c.name })))}
            {select("overdue", "Overdue", [
              { value: "true", label: "Overdue only" },
              { value: "false", label: "Not overdue" },
            ])}
            {select("dateField", "Date applies to", [
              { value: "createdAt", label: "Booking date" },
              { value: "receivedAt", label: "Receipt date" },
            ])}
            <Field label="From date">{(id) => <input id={id} type="date" className="input" value={filters.dateFrom ?? ""} onChange={(e) => set({ dateFrom: e.target.value })} />}</Field>
            <Field label="To date">{(id) => <input id={id} type="date" className="input" value={filters.dateTo ?? ""} onChange={(e) => set({ dateTo: e.target.value })} />}</Field>
          </div>
        )}
      </div>

      <ErrorNote error={list.error} />
      <div className="card overflow-hidden">
        {list.isLoading ? (
          <Spinner />
        ) : rows.length === 0 ? (
          <Empty icon={PackageSearch} title="No parcels match" hint="Try a wider date range or clear some filters." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead className="border-b border-line bg-surface/70 text-xs text-ink-muted">
                <tr>
                  <th className="px-4 py-3 font-semibold">Tracking ID</th>
                  <th className="px-4 py-3 font-semibold">Parcel</th>
                  <th className="px-4 py-3 font-semibold">From → To</th>
                  <th className="px-4 py-3 font-semibold">Carrier</th>
                  <th className="px-4 py-3 font-semibold">Status · last change</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((p) => (
                  <tr key={p.id} className="cursor-pointer transition hover:bg-surface/80" onClick={() => navigate(`/parcels/${p.id}`)}>
                    <td className="whitespace-nowrap px-4 py-3 align-top" onClick={(e) => e.stopPropagation()}>
                      <TrackingLink id={p.id} tracking={p.trackingNumber} />
                      {p.priority !== "NORMAL" && (
                        <div className="mt-1 flex gap-1">
                          <PriorityBadge priority={p.priority} />
                        </div>
                      )}
                    </td>
                    <td className="max-w-[280px] px-4 py-3 align-top">
                      <p className="truncate font-medium text-ink" title={p.title}>
                        {p.title}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-ink-muted">
                        {p.category}
                        <ClassificationTag value={p.classification} />
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <p className="max-w-[240px] truncate text-ink">
                        {p.sender.name} <span className="mono text-[11px] text-ink-subtle">{p.originCode}</span>
                      </p>
                      <p className="max-w-[240px] truncate text-xs text-ink-muted" title={p.destination}>
                        → {p.receiver.name} <span className="mono text-[11px] text-ink-subtle">{p.destinationCode ?? "EXT"}</span>
                      </p>
                    </td>
                    <td className="px-4 py-3 align-top">
                      {p.carrier ? (
                        <>
                          <p className="text-ink">{p.carrier.provider ?? p.carrier.name}</p>
                          <p className="text-xs text-ink-muted">{p.carrier.externalTrackingNumber ?? CARRIER_TYPE_LABEL[p.carrier.type as keyof typeof CARRIER_TYPE_LABEL]}</p>
                        </>
                      ) : (
                        <span className="text-xs text-pending">Not assigned</span>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="flex flex-col items-start gap-1">
                        <StatusBadge status={p.status} size="sm" />
                        {p.isOverdue && <OverdueTag />}
                        {p.receivedOnBehalf && <span className="text-[11px] text-ink-muted">On behalf · {p.receivedBy}</span>}
                        <span className="whitespace-nowrap text-[11px] text-ink-subtle">{when(p.statusChangedAt)}</span>
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
        Showing {rows.length} parcel{rows.length === 1 ? "" : "s"}
        {list.hasNextPage ? " — more available" : ""}. Times are Asia/Dhaka.
      </p>

      <Modal
        open={saveOpen}
        onClose={() => setSaveOpen(false)}
        title="Save this view"
        subtitle="Keeps the current status tab, search and filters so you can return in one click."
        footer={
          <>
            <button className="btn-ghost" onClick={() => setSaveOpen(false)}>
              Cancel
            </button>
            <button className="btn-primary" disabled={viewName.trim().length < 2 || saveView.isPending} onClick={() => saveView.mutate()}>
              Save view
            </button>
          </>
        }
      >
        <Field label="Name">{(id) => <input id={id} className="input" placeholder="e.g. Factory A — pending receipt" value={viewName} onChange={(e) => setViewName(e.target.value)} maxLength={60} />}</Field>
        <p className="text-xs text-ink-muted">{Object.keys(filters).length ? Object.entries(filters).map(([k, v]) => `${k}: ${v}`).join(" · ") : "No filters — this saves the full list."}</p>
      </Modal>
    </div>
  );
}
