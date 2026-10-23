import { useCallback, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { CalendarClock, ChevronRight, ClipboardCheck, ClipboardList, Hourglass, Loader2, Plus, Search, ShieldAlert, X } from "lucide-react";
import { AUDIT_TYPE_LABEL, AuditType, Capability } from "@abg-dispatch/shared";
import { api, qs } from "../../lib/api";
import { useOffices } from "../../lib/lookups";
import { useCan } from "../../lib/auth";
import { Card, Empty, ErrorNote, Field, PageHeader, Spinner } from "../../components/ui";
import { TabBar } from "../../components/StatusChip";
import { Stat } from "../tours/parts";
import { AuditStatusBadge, AuditTypeTag, FindingStatusBadge, FindingsBar, OverdueTag, RatingBadge, SeverityTag, auditDates, calendarDay } from "./parts";
import { PlanAuditModal } from "./PlanAuditModal";
import type { AuditRow, AuditSummary, MyAction, Page } from "./types";

type Tab = "OPEN" | "PLANNED" | "IN_PROGRESS" | "FOLLOW_UP" | "CLOSED" | "ALL" | "MINE";

const STATUS_FOR_TAB: Partial<Record<Tab, string>> = { OPEN: "OPEN", PLANNED: "PLANNED", IN_PROGRESS: "IN_PROGRESS", FOLLOW_UP: "FOLLOW_UP", CLOSED: "CLOSED,CANCELLED", ALL: "ALL" };

function MyActions() {
  const navigate = useNavigate();
  const mine = useQuery({ queryKey: ["audits", "mine"], queryFn: () => api.get<{ items: MyAction[]; counts: { open: number; submitted: number; overdue: number } }>("/audits/actions/mine?state=all") });
  if (mine.isLoading) return <Spinner label="Loading your corrective actions" />;
  if (mine.error) return <ErrorNote error={mine.error} />;
  const items = mine.data?.items ?? [];
  if (!items.length)
    return (
      <div className="card">
        <Empty icon={ClipboardCheck} title="No corrective actions for you" hint="When an audit finding is assigned to you to fix, it appears here with its due date." />
      </div>
    );
  return (
    <div className="card overflow-hidden">
      <ul className="divide-y divide-line">
        {items.map((f) => (
          <li key={f.id}>
            <button className="flex w-full items-start gap-3 px-4 py-3.5 text-left hover:bg-surface/80 sm:px-5" onClick={() => navigate(`/audits/${f.audit.id}`)}>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="mono text-[12px] text-navy-500">
                    {f.audit.referenceNumber} · {f.number}
                  </span>
                  <SeverityTag severity={f.severity} />
                  {f.overdue && <OverdueTag />}
                </div>
                <p className="mt-1 text-sm font-semibold text-ink">{f.title}</p>
                <p className="truncate text-xs text-ink-muted">
                  {f.audit.title} · {f.audit.branch.name}
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <FindingStatusBadge status={f.status} />
                  {f.dueDate && <span className={f.overdue ? "text-xs font-semibold text-danger" : "text-xs text-ink-subtle"}>Due {calendarDay(f.dueDate)}</span>}
                </div>
              </div>
              <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-ink-subtle" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function AuditsPage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const canView = useCan(Capability.AUDITS_VIEW);
  const canManage = useCan(Capability.AUDITS_MANAGE);
  const branches = useOffices();
  const [search, setSearch] = useState(params.get("q") ?? "");
  const q = params.get("q") ?? "";
  const type = params.get("type") ?? "";
  const branchId = params.get("branchId") ?? "";
  // A reference search (from the header) looks across every audit, open or closed.
  const tab = (params.get("tab") as Tab | null) ?? (canView ? (q ? "ALL" : "OPEN") : "MINE");
  const set = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) (v ? next.set(k, v) : next.delete(k));
    setParams(next, { replace: true });
  };
  const newOpen = params.get("new") === "1";
  const closeNew = useCallback(() => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete("new");
        return next;
      },
      { replace: true },
    );
  }, [setParams]);

  const summary = useQuery({ queryKey: ["audits", "summary", branchId], queryFn: () => api.get<AuditSummary>(`/admin/audits/summary${qs({ branchId: branchId || undefined })}`), enabled: canView, refetchInterval: 60_000 });
  const mineCount = useQuery({ queryKey: ["audits", "mine", "count"], queryFn: () => api.get<{ counts: { open: number; submitted: number; overdue: number } }>("/audits/actions/mine") });
  const list = useInfiniteQuery({
    queryKey: ["audits", "list", tab, q, type, branchId],
    queryFn: ({ pageParam }) => api.get<Page<AuditRow>>(`/admin/audits${qs({ status: STATUS_FOR_TAB[tab], q: q || undefined, type: type || undefined, branchId: branchId || undefined, cursor: pageParam, limit: 30 })}`),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: canView && tab !== "MINE",
  });
  const s = summary.data;
  const c = s?.counts;
  const rows = list.data?.pages.flatMap((p) => p.items) ?? [];
  const myOpen = mineCount.data ? mineCount.data.counts.open + mineCount.data.counts.submitted : undefined;

  const tabs: { value: Tab; label: string; count?: number; urgent?: boolean }[] = canView
    ? [
        { value: "OPEN", label: "Open", count: s?.openAudits },
        { value: "PLANNED", label: "Planned", count: c?.PLANNED },
        { value: "IN_PROGRESS", label: "In progress", count: c?.IN_PROGRESS },
        { value: "FOLLOW_UP", label: "Actions open", count: c?.FOLLOW_UP },
        { value: "CLOSED", label: "Closed", count: c ? c.CLOSED + c.CANCELLED : undefined },
        { value: "ALL", label: "All" },
        { value: "MINE", label: "My actions", count: myOpen, urgent: true },
      ]
    : [{ value: "MINE", label: "My actions", count: myOpen, urgent: true }];

  return (
    <div>
      <PageHeader
        overline="Services"
        title="Audit"
        subtitle="Internal, regulatory, fire & safety, buyer and ISO audits: findings, corrective actions with owners and due dates, verified to closure."
        actions={
          canManage ? (
            <button className="btn-primary" onClick={() => set({ new: "1" })}>
              <Plus className="h-4 w-4" /> Plan an audit
            </button>
          ) : undefined
        }
      />

      {canView && (
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="Open audits" value={s?.openAudits ?? "—"} icon={ClipboardList} tone="active" hint={s ? `${s.inProgress} in fieldwork now · ${s.upcoming.length} in the next 30 days` : undefined} />
          <Stat label="Corrective actions open" value={s?.openActions ?? "—"} icon={Hourglass} tone={s?.openActions ? "pending" : "success"} hint={s ? `${s.awaitingVerification} fix${s.awaitingVerification === 1 ? "" : "es"} waiting for verification` : undefined} />
          <Stat label="Overdue actions" value={s?.overdueActions ?? "—"} icon={CalendarClock} tone={s?.overdueActions ? "danger" : "success"} hint="Past their due date" />
          <Stat label="Critical & major open" value={s?.criticalOpen ?? "—"} icon={ShieldAlert} tone={s?.criticalOpen ? "danger" : "success"} hint={s ? Object.entries(s.openActionsByOffice).map(([o, n]) => `${o} ${n}`).join(" · ") || "Nothing open" : undefined} />
        </div>
      )}

      <div className="grid gap-4 2xl:grid-cols-[1fr_340px]">
        <div className="min-w-0">
          <div className="card mb-4 p-3">
            <TabBar label="Audits" value={tab} items={tabs} onChange={(v) => set({ tab: v === (canView ? "OPEN" : "MINE") ? undefined : v })} />
            {tab !== "MINE" && (
              <div className="mt-3 flex flex-wrap items-end gap-3">
                <form
                  className="relative w-full min-w-0 flex-1 sm:min-w-[240px]"
                  onSubmit={(e) => {
                    e.preventDefault();
                    set({ q: search.trim() || undefined });
                  }}
                >
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subtle" aria-hidden />
                  <input className="input pl-9" placeholder="Reference, title or audit body…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search audits" />
                </form>
                <Field label="Type" className="w-[calc(50%-6px)] sm:w-[190px]">
                  {(id) => (
                    <select id={id} className="input" value={type} onChange={(e) => set({ type: e.target.value || undefined })}>
                      <option value="">Any</option>
                      {Object.values(AuditType).map((t) => (
                        <option key={t} value={t}>
                          {AUDIT_TYPE_LABEL[t]}
                        </option>
                      ))}
                    </select>
                  )}
                </Field>
                <Field label="Office" className="w-[calc(50%-6px)] sm:w-[180px]">
                  {(id) => (
                    <select id={id} className="input" value={branchId} onChange={(e) => set({ branchId: e.target.value || undefined })}>
                      <option value="">Any</option>
                      {(branches.data ?? []).map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  )}
                </Field>
                {(q || type || branchId) && (
                  <button className="btn-ghost h-10" onClick={() => (set({ q: undefined, type: undefined, branchId: undefined }), setSearch(""))}>
                    <X className="h-4 w-4" /> Clear
                  </button>
                )}
              </div>
            )}
          </div>

          {tab === "MINE" ? (
            <MyActions />
          ) : (
            <>
              <ErrorNote error={list.error} />
              <div className="card overflow-hidden">
                {list.isLoading ? (
                  <Spinner label="Loading audits" />
                ) : rows.length === 0 ? (
                  <Empty icon={ClipboardCheck} title="No audits match" hint="Try another tab or clear the filters." />
                ) : (
                  <>
                    <ul className="divide-y divide-line md:hidden">
                      {rows.map((r) => (
                        <li key={r.id}>
                          <button className="flex w-full items-start gap-3 px-4 py-3.5 text-left hover:bg-surface/80" onClick={() => navigate(`/audits/${r.id}`)}>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="mono text-[12px] text-navy-500">{r.referenceNumber}</span>
                                <AuditTypeTag type={r.type} />
                              </div>
                              <p className="mt-1 text-sm font-semibold text-ink">{r.title}</p>
                              <p className="truncate text-xs text-ink-muted">
                                {r.branch.name} · {auditDates(r.plannedStart, r.plannedEnd)}
                              </p>
                              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                <AuditStatusBadge status={r.status} size="sm" />
                                <RatingBadge rating={r.rating} />
                              </div>
                              <div className="mt-2">
                                <FindingsBar counts={r.counts} />
                              </div>
                            </div>
                            <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-ink-subtle" aria-hidden />
                          </button>
                        </li>
                      ))}
                    </ul>
                    <div className="hidden overflow-x-auto md:block">
                      <table className="w-full min-w-[820px] text-left text-sm">
                        <thead className="border-b border-line bg-surface/70 text-[11px] uppercase tracking-wide text-ink-muted">
                          <tr>
                            <th className="px-4 py-3 font-semibold">Ref / Audit</th>
                            <th className="px-4 py-3 font-semibold">Office &amp; dates</th>
                            <th className="px-4 py-3 font-semibold">Findings</th>
                            <th className="px-4 py-3 font-semibold">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-line">
                          {rows.map((r) => (
                            <tr key={r.id} className="cursor-pointer transition hover:bg-surface/80" onClick={() => navigate(`/audits/${r.id}`)}>
                              <td className="px-4 py-3 align-top">
                                <div className="max-w-[340px]">
                                  <Link to={`/audits/${r.id}`} onClick={(e) => e.stopPropagation()} className="mono text-[12.5px] text-navy hover:text-active hover:underline">
                                    {r.referenceNumber}
                                  </Link>
                                  <p className="truncate font-medium text-ink" title={r.title}>
                                    {r.title}
                                  </p>
                                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                    <AuditTypeTag type={r.type} />
                                    {r.externalBody && <span className="truncate text-xs text-ink-subtle">{r.externalBody}</span>}
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3 align-top">
                                <p className="font-medium text-ink">{r.branch.name}</p>
                                <p className="whitespace-nowrap text-xs text-ink-subtle">{auditDates(r.plannedStart, r.plannedEnd)}</p>
                                <p className="text-xs text-ink-subtle">Lead: {r.lead.name}</p>
                              </td>
                              <td className="px-4 py-3 align-top">
                                <FindingsBar counts={r.counts} />
                              </td>
                              <td className="px-4 py-3 align-top">
                                <div className="flex flex-col items-start gap-1">
                                  <AuditStatusBadge status={r.status} size="sm" />
                                  <RatingBadge rating={r.rating} />
                                  {r.score !== null && <span className="tabular text-[11px] text-ink-subtle">Score {r.score}/100</span>}
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
            </>
          )}
        </div>

        {canView && s && (
          <div className="space-y-4">
            <Card title="Coming up">
              {s.upcoming.length === 0 ? (
                <p className="text-sm text-ink-muted">No audits planned in the next 30 days.</p>
              ) : (
                <ul className="space-y-3">
                  {s.upcoming.map((u) => (
                    <li key={u.id}>
                      <Link to={`/audits/${u.id}`} className="block rounded-xl border border-line px-3 py-2.5 hover:bg-surface">
                        <p className="text-sm font-semibold text-ink">{u.title}</p>
                        <p className="text-xs text-ink-muted">
                          {auditDates(u.plannedStart, u.plannedEnd)} · {u.branch.code}
                          {u.externalBody ? ` · ${u.externalBody}` : ""}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
            <Card title={`Results ${s.year}`}>
              {Object.keys(s.ratingsThisYear).length === 0 ? (
                <p className="text-sm text-ink-muted">No audit has reported yet this year.</p>
              ) : (
                <ul className="space-y-2">
                  {Object.entries(s.ratingsThisYear).map(([rating, n]) => (
                    <li key={rating} className="flex items-center justify-between gap-3">
                      <RatingBadge rating={rating} />
                      <span className="tabular text-sm font-semibold text-navy">{n}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        )}
      </div>

      {canManage && <PlanAuditModal open={newOpen} onClose={closeNew} />}
    </div>
  );
}
