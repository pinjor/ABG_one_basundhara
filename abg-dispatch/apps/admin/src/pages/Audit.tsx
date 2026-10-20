import { Fragment, useState } from "react";
import { Link } from "react-router-dom";
import { useInfiniteQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, Loader2, ScrollText, ShieldAlert } from "lucide-react";
import { api, qs } from "../lib/api";
import { stamp } from "../lib/format";
import { Card, Empty, ErrorNote, Field, PageHeader, Spinner, cx } from "../components/ui";

interface Entry {
  id: string;
  actorType: string;
  actorName: string;
  action: string;
  objectType: string;
  objectId: string;
  summary: string;
  before: unknown;
  after: unknown;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
}

const OBJECT_TYPES = ["parcel", "user", "employee", "branch", "location", "department", "category", "sla_policy", "courier_provider", "report", "export", "security", "guest_carrier"];

function Json({ value }: { value: unknown }) {
  if (value === null || value === undefined) return <span className="text-ink-subtle">—</span>;
  return <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-surface p-3 text-[11px] leading-relaxed text-ink">{JSON.stringify(value, null, 2)}</pre>;
}

export function AuditPage() {
  const [filters, setFilters] = useState({ action: "", objectType: "", dateFrom: "", dateTo: "" });
  const [applied, setApplied] = useState(filters);
  const [open, setOpen] = useState<string | null>(null);
  const log = useInfiniteQuery({
    queryKey: ["admin", "audit", applied],
    queryFn: ({ pageParam }) => api.get<{ items: Entry[]; nextCursor: string | null }>(`/admin/audit-logs${qs({ ...applied, cursor: pageParam, limit: 50 })}`),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (l) => l.nextCursor ?? undefined,
  });
  const rows = log.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <div className="space-y-6">
      <PageHeader overline="Insight" title="Audit log" subtitle="Every administrative change, export, sign-in and security event. Entries cannot be edited or deleted — the database rejects it." />
      <form
        className="card no-print flex flex-wrap items-end gap-3 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          setApplied(filters);
        }}
      >
        <Field label="Action contains">{(id) => <input id={id} className="input w-56" placeholder="e.g. correction, login, export" value={filters.action} onChange={(e) => setFilters({ ...filters, action: e.target.value })} />}</Field>
        <Field label="Object">
          {(id) => (
            <select id={id} className="input w-48" value={filters.objectType} onChange={(e) => setFilters({ ...filters, objectType: e.target.value })}>
              <option value="">Any</option>
              {OBJECT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field label="From">{(id) => <input id={id} type="date" className="input w-44" value={filters.dateFrom} onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })} />}</Field>
        <Field label="To">{(id) => <input id={id} type="date" className="input w-44" value={filters.dateTo} onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })} />}</Field>
        <button className="btn-primary">Apply</button>
      </form>

      <ErrorNote error={log.error} />
      <Card padded={false}>
        {log.isLoading ? (
          <Spinner />
        ) : rows.length === 0 ? (
          <Empty icon={ScrollText} title="No entries" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="border-b border-line bg-surface/70 text-xs text-ink-muted">
                <tr>
                  <th className="w-8 px-3 py-2.5" />
                  <th className="px-3 py-2.5 font-semibold">When</th>
                  <th className="px-3 py-2.5 font-semibold">Who</th>
                  <th className="px-3 py-2.5 font-semibold">Action</th>
                  <th className="px-3 py-2.5 font-semibold">Summary</th>
                  <th className="px-3 py-2.5 font-semibold">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((r) => {
                  const security = r.action.startsWith("auth.") || r.objectType === "security";
                  const expanded = open === r.id;
                  return (
                    <Fragment key={r.id}>
                      <tr className="cursor-pointer hover:bg-surface/80" onClick={() => setOpen(expanded ? null : r.id)}>
                        <td className="px-3 py-2.5 text-ink-subtle">{expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-xs text-ink-muted">{stamp(r.createdAt)}</td>
                        <td className="px-3 py-2.5">
                          <p className="text-ink">{r.actorName}</p>
                          <p className="text-[11px] text-ink-subtle">{r.actorType.toLowerCase()}</p>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className={cx("mono inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px]", security ? "bg-pending-soft text-pending" : "bg-platinum-bright text-navy-500")}>
                            {security && <ShieldAlert className="h-3 w-3" />}
                            {r.action}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-ink">
                          {r.summary}
                          {r.objectType === "parcel" && (
                            <Link to={`/parcels/${r.objectId}`} className="ml-2 text-xs font-semibold text-active hover:underline" onClick={(e) => e.stopPropagation()}>
                              Open parcel
                            </Link>
                          )}
                        </td>
                        <td className="tabular whitespace-nowrap px-3 py-2.5 text-xs text-ink-muted">{r.ip ?? "—"}</td>
                      </tr>
                      {expanded && (
                        <tr className="bg-white">
                          <td />
                          <td colSpan={5} className="px-3 pb-4">
                            <div className="grid gap-3 md:grid-cols-2">
                              <div>
                                <p className="overline mb-1">Before</p>
                                <Json value={r.before} />
                              </div>
                              <div>
                                <p className="overline mb-1">After</p>
                                <Json value={r.after} />
                              </div>
                            </div>
                            <p className="mt-2 text-[11px] text-ink-subtle">
                              {r.objectType} · {r.objectId}
                              {r.userAgent ? ` · ${r.userAgent.slice(0, 120)}` : ""}
                            </p>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {log.hasNextPage && (
          <div className="border-t border-line p-3 text-center">
            <button className="btn-secondary" onClick={() => log.fetchNextPage()} disabled={log.isFetchingNextPage}>
              {log.isFetchingNextPage && <Loader2 className="h-4 w-4 animate-spin" />} Load older entries
            </button>
          </div>
        )}
      </Card>
    </div>
  );
}
