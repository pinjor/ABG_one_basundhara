import { useCallback, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, Globe, Hourglass, Loader2, Pencil, Plane, Plus, Search, ShieldCheck, TriangleAlert, Wallet, X } from "lucide-react";
import { Capability, TOUR_AWAITING_LABEL, TOUR_LIMITS, TourType, formatTaka, formatTakaShort } from "@abg-dispatch/shared";
import { api, qs } from "../../lib/api";
import { useBranches } from "../../lib/lookups";
import { useCan } from "../../lib/auth";
import { toast } from "../../components/toast";
import { Empty, ErrorNote, Field, Modal, PageHeader, Spinner, cx } from "../../components/ui";
import { NewTourModal } from "./NewTourModal";
import { PassportTag, Stat, TourStatusBadge, TourTypeTag, place, travelDates } from "./parts";
import type { Page, TourApprovalRow, TourAwaiting, TourRow, TourSettings, TourSummary } from "./types";

type Tab = "ALL" | "MINE" | "AWAITING_ME" | "OPEN" | "APPROVED" | "ACTIVE" | "COMPLETED" | "ENDED";

/** One display row for the admin list, "my requests" and the approvals inbox. */
interface DisplayRow {
  id: string;
  referenceNumber: string;
  title: string;
  type: string;
  where: string;
  startDate: string;
  endDate: string;
  estimatedBudget: number;
  sanctionedBudget: number | null;
  status: string;
  awaiting: TourAwaiting | null;
  traveller: string;
  travellerSub: string;
  passportAlert: boolean;
  awaitingMe: boolean;
}

const STATUS_FOR_TAB: Partial<Record<Tab, string>> = { ALL: "ALL", OPEN: "OPEN", APPROVED: "APPROVED", ACTIVE: "ACTIVE", COMPLETED: "COMPLETED", ENDED: "REJECTED,CANCELLED" };
const FILTER_KEYS = ["q", "type", "branchId", "dateFrom", "dateTo"] as const;

function fromRow(r: TourRow, awaitingMe: Set<string>): DisplayRow {
  return {
    id: r.id,
    referenceNumber: r.referenceNumber,
    title: r.title,
    type: r.type,
    where: place(r.destination, r.country),
    startDate: r.startDate,
    endDate: r.endDate,
    estimatedBudget: r.estimatedBudget,
    sanctionedBudget: r.sanctionedBudget,
    status: r.status,
    awaiting: r.awaiting,
    traveller: r.traveller.name,
    travellerSub: [r.traveller.designation, r.branch.code].filter(Boolean).join(" · "),
    passportAlert: r.passportAlert,
    awaitingMe: awaitingMe.has(r.id),
  };
}

function fromApproval(r: TourApprovalRow): DisplayRow {
  return {
    id: r.id,
    referenceNumber: r.referenceNumber,
    title: r.title,
    type: r.type,
    where: r.destination,
    startDate: r.startDate,
    endDate: r.endDate,
    estimatedBudget: r.estimatedBudget,
    sanctionedBudget: null,
    status: r.status,
    awaiting: r.awaiting,
    traveller: r.traveller.name,
    travellerSub: [r.traveller.designation, r.traveller.department].filter(Boolean).join(" · "),
    passportAlert: false,
    awaitingMe: true,
  };
}

function BudgetModal({ open, current, onClose }: { open: boolean; current: number; onClose: () => void }) {
  const qc = useQueryClient();
  const [value, setValue] = useState(String(current));
  const amount = Number(value.replace(/[^\d]/g, "")) || 0;
  const onCloseRef = useRef(onClose);
  const save = useMutation({
    mutationFn: () => api.put<TourSettings>("/admin/tours/settings", { annualTravelBudget: amount }),
    onSuccess: (s) => {
      toast.success(`Annual travel budget set to ${formatTaka(s.annualTravelBudget)}.`);
      void qc.invalidateQueries({ queryKey: ["tours"] });
      onCloseRef.current();
    },
  });
  onCloseRef.current = () => {
    save.reset();
    onClose();
  };
  const close = useCallback(() => onCloseRef.current(), []);
  return (
    <Modal
      open={open}
      onClose={close}
      title="Annual travel budget"
      subtitle="The group-wide budget that sanctioned tours are measured against this year. The change is recorded in the audit log."
      footer={
        <>
          <button className="btn-ghost" onClick={close}>
            Cancel
          </button>
          <button className="btn-primary" disabled={save.isPending || amount <= 0 || amount === current} onClick={() => save.mutate()}>
            {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Save
          </button>
        </>
      }
    >
      <Field label="Budget (৳)" hint={amount ? formatTaka(amount) : undefined}>
        {(id) => <input id={id} className="input tabular" inputMode="numeric" value={value} onChange={(e) => setValue(e.target.value)} />}
      </Field>
      <ErrorNote error={save.error} />
    </Modal>
  );
}

function PolicyCard() {
  const rules = [
    ["Head of department", "Every tour is approved first by the traveller's head of department, named on the request."],
    ["HR & Finance vetting", "HR & Finance check the budget, per diem and advance, and may adjust the amount to be sanctioned."],
    ["MD / Chairman sanction", "Overseas tours need the Managing Director's or Chairman's sanction. No tickets, visa letters or foreign-exchange advance are released before it — the system will not mark an overseas tour approved without it."],
    ["Passport validity", `The passport must stay valid at least ${TOUR_LIMITS.passportValidityMonths} months beyond the return date; requests that fall short are flagged for renewal.`],
    ["Four eyes", "Nobody approves their own request, and whoever approves as head of department cannot also vet it."],
  ];
  return (
    <section className="card overflow-hidden">
      <header className="flex items-center gap-3 border-b border-line bg-hero px-5 py-4 text-white">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-platinum text-navy">
          <ShieldCheck className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 className="font-display text-[15px] font-bold">Foreign travel policy</h2>
          <p className="text-xs text-platinum">MD / Chairman sanction requirement</p>
        </div>
      </header>
      <ol className="divide-y divide-line">
        {rules.map(([title, text], i) => (
          <li key={title} className="flex gap-3 px-5 py-3.5">
            <span className="tabular grid h-6 w-6 shrink-0 place-items-center rounded-full bg-platinum-bright text-[11px] font-bold text-navy">{i + 1}</span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink">{title}</p>
              <p className="mt-0.5 text-[13px] leading-relaxed text-ink-muted">{text}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function ToursPage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const canView = useCan(Capability.TOUR_VIEW);
  const canVet = useCan(Capability.TOUR_VET);
  const canConfigure = useCan(Capability.CONFIG_MANAGE);
  const canSetBudget = canVet || canConfigure;
  const branches = useBranches();
  const [search, setSearch] = useState(params.get("q") ?? "");
  const [budgetOpen, setBudgetOpen] = useState(false);

  const filters = useMemo(() => Object.fromEntries(FILTER_KEYS.map((k) => [k, params.get(k) ?? ""]).filter(([, v]) => v)) as Record<string, string>, [params]);
  const tabParam = params.get("tab") as Tab | null;
  const tab: Tab = tabParam ?? (canView ? "ALL" : "MINE");
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

  const summary = useQuery({
    queryKey: ["tours", "summary", filters.branchId ?? ""],
    queryFn: () => api.get<TourSummary>(`/admin/tours/summary${qs({ branchId: filters.branchId })}`),
    enabled: canView,
    refetchInterval: 60_000,
  });
  const approvals = useQuery({
    queryKey: ["tours", "approvals"],
    queryFn: () => api.get<Page<TourApprovalRow>>("/tours/approvals?limit=100"),
    refetchInterval: 60_000,
  });
  const awaitingIds = useMemo(() => new Set((approvals.data?.items ?? []).map((a) => a.id)), [approvals.data]);
  const adminStatus = STATUS_FOR_TAB[tab];
  const list = useInfiniteQuery({
    queryKey: ["tours", "list", tab, filters],
    queryFn: ({ pageParam }) =>
      tab === "MINE"
        ? api.get<Page<TourRow>>(`/tours/mine${qs({ state: "all", cursor: pageParam, limit: 30 })}`)
        : api.get<Page<TourRow>>(`/admin/tours${qs({ ...filters, status: adminStatus, cursor: pageParam, limit: 30 })}`),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: tab !== "AWAITING_ME" && (tab === "MINE" || canView),
  });

  // The approvals inbox and "my requests" are filtered here; the admin list on the server.
  const localFilter = (r: DisplayRow) => {
    const q = filters.q?.toLowerCase();
    if (filters.type && r.type !== filters.type) return false;
    if (q && ![r.referenceNumber, r.title, r.where, r.traveller].some((v) => v.toLowerCase().includes(q))) return false;
    return true;
  };
  const rows: DisplayRow[] =
    tab === "AWAITING_ME"
      ? (approvals.data?.items ?? []).map(fromApproval).filter(localFilter)
      : (list.data?.pages.flatMap((p) => p.items) ?? []).map((r) => fromRow(r, awaitingIds)).filter(tab === "MINE" ? localFilter : () => true);
  const loading = tab === "AWAITING_ME" ? approvals.isLoading : list.isLoading;
  const error = tab === "AWAITING_ME" ? approvals.error : list.error;
  const s = summary.data;
  const c = s?.counts;
  const awaitingCount = approvals.data?.items.length;

  const tabs: { value: Tab; label: string; count?: number }[] = canView
    ? [
        { value: "ALL", label: "All" },
        { value: "AWAITING_ME", label: "Awaiting me", count: awaitingCount },
        { value: "OPEN", label: "Pending approval", count: s?.pendingApprovals },
        { value: "APPROVED", label: "Approved", count: c?.APPROVED },
        { value: "ACTIVE", label: "Active", count: c?.ACTIVE },
        { value: "COMPLETED", label: "Completed", count: c?.COMPLETED },
        { value: "ENDED", label: "Rejected / Cancelled", count: c ? c.REJECTED + c.CANCELLED : undefined },
      ]
    : [
        { value: "MINE", label: "My requests" },
        { value: "AWAITING_ME", label: "Awaiting me", count: awaitingCount },
      ];
  const serverFilters = canView && tab !== "AWAITING_ME" && tab !== "MINE";
  const filterCount = ["type", "branchId", "dateFrom", "dateTo"].filter((k) => filters[k]).length;
  const stage = s?.pendingByStage;

  return (
    <div>
      <PageHeader
        overline="Main console"
        title="Official Tour Requests"
        subtitle="Local and overseas business travel: head-of-department approval, HR & Finance vetting and, for overseas tours, the MD's or Chairman's sanction."
        actions={
          <button className="btn-primary" onClick={() => set({ new: "1" })}>
            <Plus className="h-4 w-4" /> New Tour Request
          </button>
        }
      />

      {canView && (
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="Active overseas tours" value={s?.activeForeign ?? "—"} icon={Globe} tone="active" hint={s ? (s.activeForeignCountries.length ? s.activeForeignCountries.join(" · ") : "Nobody abroad right now") : undefined} />
          <Stat
            label="Pending tour approvals"
            value={s?.pendingApprovals ?? "—"}
            icon={Hourglass}
            tone={s?.pendingApprovals ? "pending" : undefined}
            hint={stage ? `Needs vetting: ${stage.PENDING_VETTING} · HOD ${stage.PENDING_HOD} · Sanction ${stage.PENDING_SANCTION}` : undefined}
          />
          <Stat
            label={`YTD travel budget${s ? ` ${s.year}` : ""}`}
            value={s ? formatTakaShort(s.ytdSanctioned) : "—"}
            icon={Wallet}
            tone={s && s.utilisationPct >= 90 ? "danger" : "success"}
            hint={s ? `${s.utilisationPct}% utilised of ${formatTakaShort(s.annualBudget)}` : undefined}
            action={
              canSetBudget && s ? (
                <button className="btn-ghost h-8 px-2 text-xs" onClick={() => setBudgetOpen(true)} aria-label="Change the annual travel budget">
                  <Pencil className="h-3.5 w-3.5" /> Budget
                </button>
              ) : undefined
            }
          >
            {s && (
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-platinum-bright" role="progressbar" aria-valuenow={s.utilisationPct} aria-valuemin={0} aria-valuemax={100} aria-label="Travel budget utilised">
                <div className={cx("h-full rounded-full", s.utilisationPct >= 90 ? "bg-danger" : s.utilisationPct >= 70 ? "bg-pending" : "bg-success")} style={{ width: `${Math.min(100, s.utilisationPct)}%` }} />
              </div>
            )}
          </Stat>
          <Stat label="Passport expiry alert" value={s?.passportAlerts ?? "—"} icon={TriangleAlert} tone={s?.passportAlerts ? "danger" : "success"} hint="< 6 mos validity after return" />
        </div>
      )}

      <div className="grid gap-4 2xl:grid-cols-[1fr_340px]">
        <div className="min-w-0">
          <div className="card mb-4 p-3">
            <div className="-mx-1 mb-3 flex gap-1 overflow-x-auto pb-1" role="tablist" aria-label="Tour requests">
              {tabs.map((t) => (
                <button
                  key={t.value}
                  role="tab"
                  aria-selected={tab === t.value}
                  onClick={() => set({ tab: t.value === (canView ? "ALL" : "MINE") ? undefined : t.value })}
                  className={cx("inline-flex h-9 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition", tab === t.value ? "bg-navy text-white" : "text-ink-muted hover:bg-surface hover:text-navy")}
                >
                  {t.label}
                  {t.count !== undefined && (
                    <span className={cx("tabular rounded-md px-1.5 text-[11px]", tab === t.value ? "bg-white/15" : t.value === "AWAITING_ME" && t.count > 0 ? "bg-pending text-white" : "bg-platinum-bright text-navy-500")}>{t.count}</span>
                  )}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <form
                className="relative w-full min-w-0 flex-1 sm:min-w-[240px]"
                onSubmit={(e) => {
                  e.preventDefault();
                  set({ q: search.trim() || undefined });
                }}
              >
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subtle" aria-hidden />
                <input className="input pl-9" placeholder="Reference, title, destination or traveller…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search tour requests" />
              </form>
              <Field label="Type" className="w-[calc(50%-6px)] sm:w-[140px]">
                {(id) => (
                  <select id={id} className="input" value={filters.type ?? ""} onChange={(e) => set({ type: e.target.value || undefined })}>
                    <option value="">Any</option>
                    <option value={TourType.LOCAL}>Local</option>
                    <option value={TourType.FOREIGN}>Foreign</option>
                  </select>
                )}
              </Field>
              {serverFilters && (
                <>
                  <Field label="Office" className="w-[calc(50%-6px)] sm:w-[180px]">
                    {(id) => (
                      <select id={id} className="input" value={filters.branchId ?? ""} onChange={(e) => set({ branchId: e.target.value || undefined })}>
                        <option value="">Any</option>
                        {(branches.data ?? []).map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </Field>
                  <Field label="Travelling from" className="w-[calc(50%-6px)] sm:w-[160px]">
                    {(id) => <input id={id} type="date" className="input" value={filters.dateFrom ?? ""} onChange={(e) => set({ dateFrom: e.target.value || undefined })} />}
                  </Field>
                  <Field label="Travelling to" className="w-[calc(50%-6px)] sm:w-[160px]">
                    {(id) => <input id={id} type="date" className="input" value={filters.dateTo ?? ""} onChange={(e) => set({ dateTo: e.target.value || undefined })} />}
                  </Field>
                </>
              )}
              {(filterCount > 0 || filters.q) && (
                <button
                  className="btn-ghost h-10"
                  onClick={() => {
                    set({ q: undefined, type: undefined, branchId: undefined, dateFrom: undefined, dateTo: undefined });
                    setSearch("");
                  }}
                >
                  <X className="h-4 w-4" /> Clear
                </button>
              )}
            </div>
          </div>

          <ErrorNote error={error} />
          <div className="card overflow-hidden">
            {loading ? (
              <Spinner label="Loading tour requests" />
            ) : rows.length === 0 ? (
              <Empty
                icon={Plane}
                title={tab === "AWAITING_ME" ? "Nothing is waiting for you" : tab === "MINE" ? "You have no tour requests yet" : "No tour requests match"}
                hint={tab === "AWAITING_ME" ? "Requests you need to approve, vet or sanction appear here." : tab === "MINE" ? "Use New Tour Request to apply for a local or overseas tour." : "Try another tab or clear some filters."}
              />
            ) : (
              <>
                {/* Phones: cards. */}
                <ul className="divide-y divide-line md:hidden">
                  {rows.map((r) => (
                    <li key={r.id}>
                      <button className="flex w-full items-start gap-3 px-4 py-3.5 text-left hover:bg-surface/80" onClick={() => navigate(`/tours/${r.id}`)}>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="mono text-[12px] text-navy-500">{r.referenceNumber}</span>
                            <TourTypeTag type={r.type} />
                            {r.passportAlert && <PassportTag />}
                          </div>
                          <p className="mt-1 truncate text-sm font-semibold text-ink">{r.title}</p>
                          <p className="truncate text-xs text-ink-muted">
                            {r.traveller} · {r.where}
                          </p>
                          <p className="mt-0.5 text-xs text-ink-subtle">
                            {travelDates(r.startDate, r.endDate)} · <span className="tabular">{formatTaka(r.estimatedBudget)}</span>
                          </p>
                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            <TourStatusBadge status={r.status} size="sm" />
                            {r.awaitingMe && <span className="rounded-md bg-pending px-1.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-white">Your decision</span>}
                          </div>
                        </div>
                        <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-ink-subtle" aria-hidden />
                      </button>
                    </li>
                  ))}
                </ul>
                {/* Wider screens: the table. */}
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[860px] text-left text-sm">
                    <thead className="border-b border-line bg-surface/70 text-[11px] uppercase tracking-wide text-ink-muted">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Ref / Traveller</th>
                        <th className="px-4 py-3 font-semibold">Type &amp; destination</th>
                        <th className="px-4 py-3 font-semibold">Travel dates</th>
                        <th className="px-4 py-3 text-right font-semibold">Est. budget (৳)</th>
                        <th className="px-4 py-3 font-semibold">Status</th>
                        <th className="px-4 py-3 text-right font-semibold">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {rows.map((r) => (
                        <tr key={r.id} className="cursor-pointer transition hover:bg-surface/80" onClick={() => navigate(`/tours/${r.id}`)}>
                          <td className="max-w-[300px] px-4 py-3 align-top">
                            <p className="mono text-[12.5px] text-navy">{r.referenceNumber}</p>
                            <p className="truncate font-medium text-ink">{r.traveller}</p>
                            <p className="truncate text-xs text-ink-subtle">{r.travellerSub}</p>
                          </td>
                          <td className="max-w-[320px] px-4 py-3 align-top">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <TourTypeTag type={r.type} />
                              {r.passportAlert && <PassportTag />}
                            </div>
                            <p className="mt-1 truncate font-medium text-ink" title={r.where}>
                              {r.where}
                            </p>
                            <p className="truncate text-xs text-ink-muted" title={r.title}>
                              {r.title}
                            </p>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 align-top text-ink">{travelDates(r.startDate, r.endDate)}</td>
                          <td className="whitespace-nowrap px-4 py-3 text-right align-top">
                            <p className="tabular font-semibold text-ink">{formatTaka(r.estimatedBudget).replace("৳ ", "")}</p>
                            {r.sanctionedBudget !== null && r.sanctionedBudget !== r.estimatedBudget && <p className="tabular text-[11px] text-success">Sanctioned {formatTaka(r.sanctionedBudget)}</p>}
                          </td>
                          <td className="px-4 py-3 align-top">
                            <div className="flex flex-col items-start gap-1">
                              <TourStatusBadge status={r.status} size="sm" />
                              {r.awaiting && <span className="text-[11px] text-ink-subtle">{r.awaitingMe ? "Waiting for you" : `With ${TOUR_AWAITING_LABEL[r.awaiting]}`}</span>}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right align-top">
                            <button
                              className={cx(r.awaitingMe ? "btn-primary" : "btn-secondary", "h-8 px-3 text-xs")}
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/tours/${r.id}`);
                              }}
                            >
                              {r.awaitingMe ? "Review" : "Details"}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
            {tab !== "AWAITING_ME" && list.hasNextPage && (
              <div className="border-t border-line p-3 text-center">
                <button className="btn-secondary" onClick={() => list.fetchNextPage()} disabled={list.isFetchingNextPage}>
                  {list.isFetchingNextPage && <Loader2 className="h-4 w-4 animate-spin" />} Load more
                </button>
              </div>
            )}
          </div>
          <p className="mt-3 text-xs text-ink-subtle">
            Showing {rows.length} request{rows.length === 1 ? "" : "s"}
            {tab !== "AWAITING_ME" && list.hasNextPage ? " — more available" : ""}. Amounts in Taka; dates are travel dates.
          </p>
        </div>
        <PolicyCard />
      </div>

      <NewTourModal open={newOpen} onClose={closeNew} />
      {s && <BudgetModal key={`${budgetOpen}-${s.annualBudget}`} open={budgetOpen} current={s.annualBudget} onClose={() => setBudgetOpen(false)} />}
    </div>
  );
}
