import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, BellRing, CalendarCheck2, CalendarClock, CalendarX2, FileBadge, FileText, Hourglass, Loader2, Plus, RefreshCw, Search, X, type LucideIcon } from "lucide-react";
import { Capability, LICENCE_CATEGORY_LABEL, licenceCountdownLabel, type LicenceCategory } from "@abg-dispatch/shared";
import { api, qs } from "../../lib/api";
import { useCan } from "../../lib/auth";
import { toast } from "../../components/toast";
import { Empty, ErrorNote, Field, PageHeader, Spinner, cx } from "../../components/ui";
import { CountdownBadge, LicenceFormModal, RenewalBar, fmtDate, useLicenceOffices, useLicenceSummary } from "./components";
import type { AlertRun, Licence, LicenceRow } from "./types";

type Tab = "ALL" | "EXPIRING" | "DUE_SOON" | "EXPIRED" | "RENEWAL_IN_PROGRESS" | "VALID" | "RETIRED";
const FILTER_KEYS = ["state", "q", "branchId", "category"] as const;

const TONE_TEXT = { danger: "text-danger", pending: "text-pending", success: "text-success", active: "text-active", neutral: "text-navy" } as const;
const TONE_ICON_BG = { danger: "bg-danger-soft text-danger", pending: "bg-pending-soft text-pending", success: "bg-success-soft text-success", active: "bg-active-soft text-active", neutral: "bg-platinum-bright text-navy-500" } as const;

function Kpi({ label, value, hint, tone, icon: Icon, selected, onClick, className }: { label: string; value: number | string; hint: string; tone: keyof typeof TONE_TEXT; icon: LucideIcon; selected: boolean; onClick: () => void; className?: string }) {
  const zero = value === 0;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cx(
        "card flex items-start gap-3 px-4 py-3.5 text-left transition hover:border-line-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-active",
        selected && "border-navy ring-1 ring-navy",
        className,
      )}
    >
      <span className={cx("grid h-9 w-9 shrink-0 place-items-center rounded-xl", zero ? TONE_ICON_BG.neutral : TONE_ICON_BG[tone])}>
        <Icon className="h-[18px] w-[18px]" aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="block text-xs font-medium text-ink-muted">{label}</span>
        <span className={cx("tabular mt-0.5 block font-display text-2xl font-extrabold leading-tight", zero ? "text-navy" : TONE_TEXT[tone])}>{value}</span>
        <span className="block text-[11px] text-ink-subtle">{hint}</span>
      </span>
    </button>
  );
}

function OfficeLine({ r }: { r: LicenceRow }) {
  return (
    <>
      <p className="truncate text-ink">
        {r.branch.name} <span className="mono text-[11px] text-ink-subtle">{r.branch.code}</span>
      </p>
      <p className="truncate text-xs text-ink-muted" title={r.issuingAuthority}>
        {r.issuingAuthority}
      </p>
    </>
  );
}

export function LicencesPage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const canManage = useCan(Capability.LICENCE_MANAGE);
  const offices = useLicenceOffices();
  const [search, setSearch] = useState(params.get("q") ?? "");
  const [formOpen, setFormOpen] = useState(false);

  const filters = useMemo(() => Object.fromEntries(FILTER_KEYS.map((k) => [k, params.get(k) ?? ""]).filter(([, v]) => v)) as Record<string, string>, [params]);
  const tab = (filters.state ?? "ALL") as Tab;
  const set = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) (v ? next.set(k, v) : next.delete(k));
    setParams(next, { replace: true });
  };

  // The dashboard's "Add licence" quick action links here with ?new=1.
  const wantsNew = params.get("new") === "1";
  useEffect(() => {
    if (!wantsNew) return;
    if (canManage) setFormOpen(true);
    else set({ new: undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wantsNew, canManage]);
  const closeForm = () => {
    setFormOpen(false);
    if (wantsNew) set({ new: undefined });
  };

  const summary = useLicenceSummary(filters.branchId);
  const list = useInfiniteQuery({
    queryKey: ["licences", "list", filters],
    queryFn: ({ pageParam }) => api.get<{ items: LicenceRow[]; nextCursor: string | null }>(`/licences${qs({ ...filters, state: tab === "ALL" ? undefined : tab, cursor: pageParam, limit: 30 })}`),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    // Countdowns move at midnight; keep them honest on a wall display.
    refetchInterval: 10 * 60_000,
  });
  const rows = list.data?.pages.flatMap((p) => p.items) ?? [];
  const s = summary.data;

  const runAlerts = useMutation({
    mutationFn: () => api.post<AlertRun>("/admin/licences/run-alerts"),
    onSuccess: (run) => {
      if (run.alerted === 0) toast.success("No new alerts were due — everyone has already been told about each threshold reached.");
      else {
        const lines = run.alerts.slice(0, 4).map((a) => `• ${a.name}, ${a.branch} — ${licenceCountdownLabel(a.daysLeft).toLowerCase()} (${a.notified} notified)`);
        toast.success(`${run.alerted} expiry alert${run.alerted === 1 ? "" : "s"} sent.\n${lines.join("\n")}${run.alerts.length > 4 ? `\n…and ${run.alerts.length - 4} more` : ""}`);
      }
      void qc.invalidateQueries({ queryKey: ["licences"] });
      void qc.invalidateQueries({ queryKey: ["licence"] });
    },
    onError: toast.error,
  });

  const tabs: { value: Tab; label: string; count?: number }[] = [
    { value: "ALL", label: "All", count: s?.total },
    { value: "EXPIRING", label: "Expiring", count: s?.expiring },
    { value: "DUE_SOON", label: "Renewal due", count: s?.dueSoon },
    { value: "EXPIRED", label: "Expired", count: s?.expired },
    { value: "RENEWAL_IN_PROGRESS", label: "Renewal in progress", count: s?.renewalsInProgress },
    { value: "VALID", label: "Valid", count: s?.valid },
    ...((s?.retired ?? 0) > 0 || tab === "RETIRED" ? [{ value: "RETIRED" as Tab, label: "Retired", count: s?.retired }] : []),
  ];
  const pick = (t: Tab) => set({ state: t === "ALL" || t === tab ? undefined : t });
  const filterCount = ["branchId", "category"].filter((k) => filters[k]).length;

  const select = (key: string, label: string, options: { value: string; label: string }[]) => (
    <Field label={label} className="w-full sm:w-[200px]">
      {(id) => (
        <select id={id} className="input" value={filters[key] ?? ""} onChange={(e) => set({ [key]: e.target.value })}>
          <option value="">{key === "branchId" ? "All offices" : "All kinds"}</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}
    </Field>
  );

  const emptyCopy: Record<Tab, { title: string; hint: string }> = {
    ALL: { title: "No licences match", hint: "Try another office or kind, or clear the search." },
    EXPIRING: { title: "Nothing expires in the next 30 days", hint: "Licences within 30 days of expiry appear here." },
    DUE_SOON: { title: "No renewals are due", hint: "Licences inside their renewal window, but more than 30 days from expiry, appear here." },
    EXPIRED: { title: "No expired licences", hint: "Every licence in view is still in force." },
    RENEWAL_IN_PROGRESS: { title: "No renewals under way", hint: "Licences whose renewal has started appear here until they are marked renewed." },
    VALID: { title: "No licences outside their renewal window", hint: "Valid licences with time to spare appear here." },
    RETIRED: { title: "No retired licences", hint: "Licences the offices no longer need are kept here with their history." },
  };

  return (
    <div>
      <PageHeader
        overline="Governance"
        title="Regulatory licence register"
        subtitle="Every licence, permit and certificate the group's sites must hold — how long each has left, where its renewal stands, and the scanned copy."
        actions={
          canManage && (
            <>
              <button className="btn-secondary" onClick={() => runAlerts.mutate()} disabled={runAlerts.isPending} title="Send any expiry alerts that are due now">
                {runAlerts.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <BellRing className="h-4 w-4" />} Run alerts now
              </button>
              <button className="btn-primary" onClick={() => setFormOpen(true)}>
                <Plus className="h-4 w-4" /> Add licence
              </button>
            </>
          )
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <Kpi label="Expired" value={s?.expired ?? "—"} hint="Renew or stop the activity" tone="danger" icon={CalendarX2} selected={tab === "EXPIRED"} onClick={() => pick("EXPIRED")} />
        <Kpi label="Expiring ≤ 30 days" value={s?.expiring ?? "—"} hint="Office admins are alerted" tone="danger" icon={Hourglass} selected={tab === "EXPIRING"} onClick={() => pick("EXPIRING")} />
        <Kpi label="Renewal due" value={s?.dueSoon ?? "—"} hint="Inside the renewal window" tone="pending" icon={CalendarClock} selected={tab === "DUE_SOON"} onClick={() => pick("DUE_SOON")} />
        <Kpi label="Renewals in progress" value={s?.renewalsInProgress ?? "—"} hint="Started, not yet renewed" tone="active" icon={RefreshCw} selected={tab === "RENEWAL_IN_PROGRESS"} onClick={() => pick("RENEWAL_IN_PROGRESS")} />
        <Kpi label="Valid" value={s?.valid ?? "—"} hint="Time to spare" tone="success" icon={CalendarCheck2} selected={tab === "VALID"} onClick={() => pick("VALID")} className="col-span-2 md:col-span-1" />
      </div>

      {s?.nextExpiry && (
        <Link
          to={`/licences/${s.nextExpiry.id}`}
          className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl bg-hero px-5 py-3.5 text-sm text-platinum-bright shadow-card transition hover:brightness-110"
        >
          <span className="overline text-platinum-deep">Next to expire</span>
          <span className="min-w-0 font-semibold text-white">
            {s.nextExpiry.name} · {s.nextExpiry.branch.name}
          </span>
          <span className="tabular text-platinum">
            {licenceCountdownLabel(s.nextExpiry.daysLeft)} · {fmtDate(s.nextExpiry.expiresAt)}
          </span>
          <ArrowRight className="ml-auto h-4 w-4 text-platinum" aria-hidden />
        </Link>
      )}

      <div className="card mb-4 p-3">
        <div className="-mx-1 mb-3 flex gap-1 overflow-x-auto pb-1" role="tablist" aria-label="Licence state">
          {tabs.map((t) => (
            <button
              key={t.value}
              role="tab"
              aria-selected={tab === t.value}
              onClick={() => set({ state: t.value === "ALL" ? undefined : t.value })}
              className={cx("inline-flex h-9 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition", tab === t.value ? "bg-navy text-white" : "text-ink-muted hover:bg-surface hover:text-navy")}
            >
              {t.label}
              {t.count !== undefined && <span className={cx("tabular rounded-md px-1.5 text-[11px]", tab === t.value ? "bg-white/15" : "bg-platinum-bright text-navy-500")}>{t.count}</span>}
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
            <input className="input pl-9" placeholder="Licence name, number or authority…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search licences" />
          </form>
          {(offices.data?.length ?? 0) > 1 && select("branchId", "Office", (offices.data ?? []).map((o) => ({ value: o.id, label: o.name })))}
          {select("category", "Kind", Object.entries(LICENCE_CATEGORY_LABEL).map(([value, label]) => ({ value, label })))}
          {(filterCount > 0 || filters.q) && (
            <button
              className="btn-ghost h-10"
              onClick={() => {
                setParams(new URLSearchParams(filters.state ? { state: filters.state } : {}), { replace: true });
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
          <Spinner label="Loading the register" />
        ) : rows.length === 0 ? (
          <Empty icon={FileBadge} title={emptyCopy[tab].title} hint={filters.q || filterCount ? "Try another office or kind, or clear the search." : emptyCopy[tab].hint} />
        ) : (
          <>
            {/* Wide screens: a table. */}
            <table className="hidden w-full table-fixed text-left text-sm xl:table">
              <thead className="border-b border-line bg-surface/70 text-xs text-ink-muted">
                <tr>
                  <th className="w-[30%] px-4 py-3 font-semibold">Licence</th>
                  <th className="w-[22%] px-4 py-3 font-semibold">Office · authority</th>
                  <th className="w-[13%] px-4 py-3 font-semibold">Owner</th>
                  <th className="w-[16%] px-4 py-3 font-semibold">Expiry</th>
                  <th className="w-[19%] px-4 py-3 font-semibold">Renewal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((r) => (
                  <tr key={r.id} className="cursor-pointer transition hover:bg-surface/80" onClick={() => navigate(`/licences/${r.id}`)}>
                    <td className="px-4 py-3 align-top">
                      <a href={`/licences/${r.id}`} onClick={(e) => (e.preventDefault(), navigate(`/licences/${r.id}`))} className="flex items-center gap-1.5 font-medium text-ink hover:text-active hover:underline">
                        <span className="truncate" title={r.name}>
                          {r.name}
                        </span>
                        {r.hasDocument && <FileText className="h-3.5 w-3.5 shrink-0 text-navy-500" aria-label="Scanned copy on file" />}
                      </a>
                      <p className="mt-0.5 truncate text-xs text-ink-muted">
                        <span className="mono text-[11.5px] text-navy-500">{r.licenceNumber}</span> · {LICENCE_CATEGORY_LABEL[r.category as LicenceCategory] ?? r.category}
                      </p>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <OfficeLine r={r} />
                    </td>
                    <td className="truncate px-4 py-3 align-top text-ink">{r.owner?.name ?? <span className="text-ink-subtle">Not set</span>}</td>
                    <td className="px-4 py-3 align-top">
                      <div className="flex flex-col items-start gap-1">
                        <CountdownBadge daysLeft={r.daysLeft} state={r.state} active={r.active} size="sm" />
                        <span className="tabular text-[11px] text-ink-subtle">{fmtDate(r.expiresAt)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <RenewalBar stage={r.renewalStage} progress={r.renewalProgress} compact />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Phones and tablets: cards. */}
            <ul className="grid divide-y divide-line md:grid-cols-2 md:gap-px md:divide-y-0 md:bg-line xl:hidden">
              {rows.map((r) => (
                <li key={r.id} className="bg-white">
                  <Link to={`/licences/${r.id}`} className="block h-full px-4 py-4 transition hover:bg-surface/80">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="flex items-center gap-1.5 font-semibold text-ink">
                          <span className="truncate">{r.name}</span>
                          {r.hasDocument && <FileText className="h-3.5 w-3.5 shrink-0 text-navy-500" aria-label="Scanned copy on file" />}
                        </p>
                        <p className="mono truncate text-[11.5px] text-navy-500">{r.licenceNumber}</p>
                      </div>
                      <CountdownBadge daysLeft={r.daysLeft} state={r.state} active={r.active} size="sm" />
                    </div>
                    <div className="mt-2 min-w-0 text-sm">
                      <OfficeLine r={r} />
                    </div>
                    <div className="mt-3 flex items-end justify-between gap-4">
                      <RenewalBar stage={r.renewalStage} progress={r.renewalProgress} compact />
                      <span className="tabular shrink-0 text-[11px] text-ink-subtle">Expires {fmtDate(r.expiresAt)}</span>
                    </div>
                  </Link>
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
      <p className="mt-3 text-xs text-ink-subtle">
        Showing {rows.length} licence{rows.length === 1 ? "" : "s"}
        {list.hasNextPage ? " — more available" : ""}, soonest expiry first. Alerts go out 90, 60, 30, 15 and 7 days before expiry and on the day; from 30 days office admins are told, from 7 days head office and the MD. Dates are Asia/Dhaka.
      </p>

      {canManage && (
        <LicenceFormModal
          open={formOpen}
          onClose={closeForm}
          onSaved={(saved) => {
            closeForm();
            void qc.invalidateQueries({ queryKey: ["licences"] });
            const created = saved as Licence;
            toast.success(`${created.name} added to the register.`);
            navigate(`/licences/${created.id}`);
          }}
        />
      )}
    </div>
  );
}
