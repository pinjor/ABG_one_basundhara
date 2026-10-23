import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, CalendarClock, Car, IdCard, Loader2, LogIn, LogOut, ScanLine, Search, Timer, UserPlus, UsersRound, X, type LucideIcon } from "lucide-react";
import { Capability, VISIT_PURPOSE_LABEL, VISIT_PURPOSE_ORDER, extractGatePass, normalizeVisitorPassNumber, type VisitPurpose } from "@abg-dispatch/shared";
import { api, qs } from "../../lib/api";
import { dhakaDay, when } from "../../lib/format";
import { useCan } from "../../lib/auth";
import { BarList, GroupedColumns } from "../../components/charts";
import { Card, Empty, ErrorNote, Field, PageHeader, Pill, Spinner, Tabs, cx } from "../../components/ui";
import { toast } from "../../components/toast";
import { OverstayTag, PurposeIcon, VisitFormModal, VisitStatusBadge, purposeLabel, relativeTo, stay, timeOf, useOffices, useVisitSummary, windowLabel } from "./parts";
import type { GatePassView, Page, Visit, VisitAction, VisitRow } from "./types";

type Tab = "onsite" | "expected" | "out" | "all";
const TAB_STATUS: Record<Tab, string> = { onsite: "CHECKED_IN", expected: "EXPECTED", out: "CHECKED_OUT", all: "ALL" };
const FILTER_KEYS = ["tab", "q", "purpose", "branchId", "date"] as const;

/** `?new=1` opens "Pre-register visitor" and `?walkin=1` "Register walk-in" (the Executive Dashboard links here); closing clears it. */
function useFormParam(canWalkIn: boolean) {
  const [params, setParams] = useSearchParams();
  const mode = params.get("new") === "1" ? "invite" : params.get("walkin") === "1" && canWalkIn ? "walkin" : null;
  const set = (m: "invite" | "walkin" | null) => {
    const next = new URLSearchParams(params);
    next.delete("new");
    next.delete("walkin");
    if (m) next.set(m === "invite" ? "new" : "walkin", "1");
    setParams(next, { replace: true });
  };
  return { mode, open: (m: "invite" | "walkin") => set(m), close: () => set(null) } as const;
}

/** Hosts without gate access see their own visitors; security, the front desk and admins see the live board. */
export function VisitorsPage() {
  const canView = useCan(Capability.VISITOR_VIEW);
  return canView ? <VisitorBoard /> : <MyVisitors />;
}

// ── The live board ──

function useTicker(ms: number) {
  const [, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
}

function Kpi({ icon: Icon, label, value, hint, onClick, active }: { icon: LucideIcon; label: string; value: number | string; hint: string; onClick?: () => void; active?: boolean }) {
  const body = (
    <>
      <span className={cx("grid h-9 w-9 place-items-center rounded-xl", active ? "bg-navy text-white" : "bg-active-soft text-active")}>
        <Icon className="h-[18px] w-[18px]" aria-hidden />
      </span>
      <span className="mt-3 block font-display text-[28px] font-extrabold leading-none text-navy tabular">{value}</span>
      <span className="mt-1.5 block text-[13px] font-semibold text-ink">{label}</span>
      <span className="block text-[11px] text-ink-subtle">{hint}</span>
    </>
  );
  const cls = cx("card block w-full p-4 text-left transition", onClick && "hover:-translate-y-0.5 hover:shadow-raised focus-visible:outline focus-visible:outline-2 focus-visible:outline-active", active && "ring-2 ring-navy/80");
  return onClick ? (
    <button type="button" className={cls} onClick={onClick} aria-pressed={active}>
      {body}
    </button>
  ) : (
    <div className={cls}>{body}</div>
  );
}

function VerifyPass() {
  const navigate = useNavigate();
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const go = async () => {
    const v = value.trim();
    if (!v) return;
    const pass = extractGatePass(v);
    if (pass?.kind === "VISITOR") return navigate(`/visitors/pass/${pass.token}`);
    const number = normalizeVisitorPassNumber(v);
    if (!number) return toast.error(new Error("Scan the QR or type a pass number like VP-261021-FCA-012."));
    setBusy(true);
    try {
      const found = await api.get<GatePassView>(`/visitors/passes/by-number/${encodeURIComponent(number)}`);
      if (found.token) navigate(`/visitors/pass/${found.token}`);
    } catch (err) {
      toast.error(err);
    } finally {
      setBusy(false);
    }
  };
  return (
    <form
      className="card flex flex-col gap-2 p-3 sm:flex-row sm:items-center"
      onSubmit={(e) => {
        e.preventDefault();
        void go();
      }}
    >
      <div className="relative flex-1">
        <ScanLine className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subtle" aria-hidden />
        <input className="input pl-9" value={value} onChange={(e) => setValue(e.target.value)} placeholder="Scan a visitor's QR, or type the pass number (VP-…)" aria-label="Verify a gate pass" />
      </div>
      <button className="btn-secondary" disabled={busy || !value.trim()}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <BadgeCheck className="h-4 w-4" />} Verify pass
      </button>
    </form>
  );
}

function shortArea(path: string | null): string | null {
  if (!path) return null;
  const parts = path.split(" › ");
  return parts[parts.length - 1] ?? path;
}

function TimeInfo({ row }: { row: VisitRow }) {
  const line = (a: string, b?: string | null) => (
    <span className="block text-right">
      <span className="tabular block whitespace-nowrap text-[13px] font-semibold text-ink">{a}</span>
      {b && <span className="tabular block whitespace-nowrap text-[11px] text-ink-subtle">{b}</span>}
    </span>
  );
  switch (row.status) {
    case "CHECKED_IN":
      return line(`In ${timeOf(row.checkedInAt!)}`, `${stay(row.onSiteMinutes)} on site`);
    case "EXPECTED":
      return line(windowLabel(row.expectedAt, row.expectedUntil), relativeTo(row.expectedAt));
    case "CHECKED_OUT":
      return line(`${timeOf(row.checkedInAt!)} → ${timeOf(row.checkedOutAt!)}`, stay(row.onSiteMinutes));
    case "CANCELLED":
      return line("Cancelled", row.cancelledAt ? when(row.cancelledAt) : null);
    default:
      return line(`Expected ${timeOf(row.expectedAt)}`, "Did not arrive");
  }
}

export function VisitRowItem({ row, onAct, pending }: { row: VisitRow; onAct?: (row: VisitRow, action: VisitAction) => void; pending?: boolean }) {
  const canIn = row.actions.includes("CHECK_IN");
  const canOut = row.actions.includes("CHECK_OUT");
  return (
    <li className="group flex flex-col gap-3 px-4 py-3.5 transition hover:bg-surface/70 sm:flex-row sm:items-center sm:gap-4">
      <Link to={`/visitors/${row.id}`} className="flex min-w-0 flex-1 items-start gap-3 focus-visible:outline-none">
        <span className="relative grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-platinum-bright text-navy-500">
          <PurposeIcon purpose={row.purpose} className="h-5 w-5" />
          {row.partySize > 1 && <span className="absolute -right-1.5 -top-1.5 rounded-full bg-navy px-1.5 text-[10px] font-bold leading-4 text-white ring-2 ring-white">+{row.partySize - 1}</span>}
        </span>
        <span className="min-w-0">
          <span className="flex flex-wrap items-baseline gap-x-2">
            <span className="truncate font-semibold text-ink group-hover:text-active group-focus-visible:underline">{row.visitorName}</span>
            {row.company && <span className="truncate text-[13px] text-ink-muted">{row.company}</span>}
          </span>
          <span className="mt-0.5 block text-xs text-ink-muted">
            <span className="mono text-[11.5px] text-navy-500">{row.passNumber}</span> · {purposeLabel(row.purpose)} · Host {row.hostName}
            {shortArea(row.location) ? ` · ${shortArea(row.location)}` : ""}
          </span>
          <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <VisitStatusBadge status={row.status} size="sm" />
            {row.walkIn && <Pill tone="neutral">Walk-in</Pill>}
            {row.overstay && <OverstayTag />}
            {row.badgeNumber && (
              <span className="inline-flex items-center gap-1 rounded-md bg-platinum-bright px-1.5 py-0.5 text-[11px] font-semibold text-navy-500">
                <IdCard className="h-3 w-3" aria-hidden /> {row.badgeNumber}
              </span>
            )}
            {row.vehicleNumber && (
              <span className="inline-flex items-center gap-1 rounded-md bg-platinum-bright px-1.5 py-0.5 text-[11px] font-semibold text-navy-500">
                <Car className="h-3 w-3" aria-hidden /> {row.vehicleNumber}
              </span>
            )}
          </span>
        </span>
      </Link>
      <div className="flex items-center justify-between gap-4 pl-14 sm:justify-end sm:pl-0">
        <TimeInfo row={row} />
        {onAct && (canIn || canOut) && (
          <button
            className={cx(canIn ? "btn-primary" : "btn-secondary", "h-9 min-w-[118px] px-3")}
            disabled={pending}
            onClick={() => onAct(row, canIn ? "CHECK_IN" : "CHECK_OUT")}
            aria-label={`${canIn ? "Check in" : "Check out"} ${row.visitorName}`}
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : canIn ? <LogIn className="h-4 w-4" /> : <LogOut className="h-4 w-4" />}
            {canIn ? "Check in" : "Check out"}
          </button>
        )}
      </div>
    </li>
  );
}

const dayTick = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", timeZone: "UTC" });

function VisitorBoard() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const canManage = useCan(Capability.VISITOR_MANAGE);
  const canInvite = useCan(Capability.VISITOR_INVITE);
  const canVerify = useCan(Capability.GATE_VERIFY);
  const form = useFormParam(canManage);
  const offices = useOffices();
  const [search, setSearch] = useState(params.get("q") ?? "");
  useTicker(5_000);

  const filters = useMemo(() => Object.fromEntries(FILTER_KEYS.map((k) => [k, params.get(k) ?? ""]).filter(([, v]) => v)) as Record<string, string>, [params]);
  const tab = (filters.tab ?? "onsite") as Tab;
  const today = dhakaDay();
  const day = filters.date ?? today;
  const set = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) (v ? next.set(k, v) : next.delete(k));
    setParams(next, { replace: true });
  };

  const summary = useVisitSummary(filters.branchId);
  const query = { status: TAB_STATUS[tab], branchId: filters.branchId, purpose: filters.purpose, q: filters.q, date: day === today ? undefined : day };
  const list = useInfiniteQuery({
    queryKey: ["admin", "visitors", "list", query],
    queryFn: ({ pageParam }) => api.get<Page<VisitRow>>(`/admin/visitors${qs({ ...query, cursor: pageParam, limit: 50 })}`),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    refetchInterval: 30_000,
  });
  const rows = list.data?.pages.flatMap((p) => p.items) ?? [];
  const s = summary.data;

  const [pendingId, setPendingId] = useState<string | null>(null);
  const act = useMutation({
    mutationFn: ({ row, action }: { row: VisitRow; action: VisitAction }) => api.post<Visit>(`/visitors/${row.id}/${action === "CHECK_IN" ? "check-in" : "check-out"}`, {}),
    onMutate: ({ row }) => setPendingId(row.id),
    onSuccess: (v, { action }) => {
      const host = v.host.userId ? `${v.host.name} has been told.` : `Let ${v.host.name} know.`;
      toast.success(action === "CHECK_IN" ? `${v.visitorName} checked in. ${host}` : `${v.visitorName} checked out after ${stay(v.onSiteMinutes)}.`);
    },
    onError: toast.error,
    onSettled: () => {
      setPendingId(null);
      void qc.invalidateQueries({ queryKey: ["admin", "visitors"] });
    },
  });

  const officeOptions = offices.mine;
  const officeName = officeOptions.find((b) => b.id === filters.branchId)?.name ?? (officeOptions.length === 1 ? officeOptions[0].name : offices.orgWide ? "All offices" : "Your offices");
  const purposeData = s
    ? VISIT_PURPOSE_ORDER.map((p) => ({ label: VISIT_PURPOSE_LABEL[p], value: s.byPurposeToday[p] ?? 0 }))
        .filter((d) => d.value > 0)
        .sort((a, b) => b.value - a.value)
    : [];
  const labelToPurpose = Object.fromEntries(Object.entries(VISIT_PURPOSE_LABEL).map(([k, v]) => [v, k])) as Record<string, VisitPurpose>;
  const updated = summary.dataUpdatedAt ? Math.max(0, Math.round((Date.now() - summary.dataUpdatedAt) / 1000)) : null;
  const filtered = !!(filters.q || filters.purpose || (filters.date && filters.date !== today));

  return (
    <div>
      <PageHeader
        overline="Facilities"
        title="Factory Visitor Management"
        subtitle="Who is on site right now, who is expected, and every gate pass — checked in and out at the gate, with the host told at each step."
        actions={
          <>
            {officeOptions.length > 1 || offices.orgWide ? (
              <select className="input h-10 w-auto min-w-[170px]" value={filters.branchId ?? ""} onChange={(e) => set({ branchId: e.target.value || undefined })} aria-label="Office">
                <option value="">{offices.orgWide ? "All offices" : "All my offices"}</option>
                {officeOptions.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            ) : null}
            {canInvite && (
              <button className="btn-secondary" onClick={() => form.open("invite")}>
                <CalendarClock className="h-4 w-4" /> Pre-register visitor
              </button>
            )}
            {canManage && (
              <button className="btn-primary" onClick={() => form.open("walkin")}>
                <UserPlus className="h-4 w-4" /> Register walk-in
              </button>
            )}
          </>
        }
      />

      <div className="mb-4 grid gap-3 lg:grid-cols-[minmax(280px,1fr)_2fr]">
        <section className="relative overflow-hidden rounded-2xl bg-hero p-6 text-white shadow-raised" aria-live="polite">
          <svg className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 opacity-[0.12]" viewBox="0 0 200 200" aria-hidden>
            <circle cx="100" cy="100" r="96" fill="none" stroke="#CAD0D8" strokeWidth="1.5" />
            <circle cx="100" cy="100" r="70" fill="none" stroke="#CAD0D8" strokeWidth="1.5" />
            <circle cx="100" cy="100" r="44" fill="none" stroke="#CAD0D8" strokeWidth="1.5" />
          </svg>
          <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-platinum">
            <span className="relative flex h-2.5 w-2.5" aria-hidden>
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-success" />
            </span>
            Live · On site now
          </p>
          <p className="mt-3 font-display text-[64px] font-extrabold leading-none tracking-tight tabular">{s?.onSiteNow ?? "—"}</p>
          <p className="mt-2 text-sm text-platinum">
            {s ? `${s.peopleOnSite} ${s.peopleOnSite === 1 ? "person" : "people"} on site` : "Counting…"} · {officeName}
          </p>
          {s && s.overstaying > 0 && (
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-2 py-1 text-xs font-semibold text-pending-soft">
              <Timer className="h-3.5 w-3.5" aria-hidden /> {s.overstaying} past their expected time
            </p>
          )}
          {s?.longestOnSite && (
            <Link to={`/visitors/${s.longestOnSite.id}`} className="mt-4 block rounded-xl border border-white/10 bg-white/[0.06] px-3.5 py-2.5 transition hover:bg-white/10">
              <span className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-platinum-deep">Longest on site</span>
              <span className="mt-0.5 block truncate text-sm font-semibold text-white">{s.longestOnSite.visitorName}</span>
              <span className="block text-xs text-platinum">
                Since {timeOf(s.longestOnSite.since)}
                {dhakaDay(new Date(s.longestOnSite.since)) !== today ? " yesterday or earlier" : ""} · {stay(Math.round((Date.now() - new Date(s.longestOnSite.since).getTime()) / 60_000))}
              </span>
            </Link>
          )}
          <p className="mt-4 text-[11px] text-platinum-deep">{updated === null ? "Loading…" : `Updated ${updated < 5 ? "just now" : `${updated} s ago`} · refreshes every 30 s`}</p>
        </section>

        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <Kpi icon={CalendarClock} label="Expected today" value={s?.expectedToday ?? "—"} hint="Still to arrive" onClick={() => set({ tab: "expected", date: undefined })} active={tab === "expected"} />
          <Kpi icon={LogOut} label="Checked out today" value={s?.checkedOutToday ?? "—"} hint="Left the site" onClick={() => set({ tab: "out", date: undefined })} active={tab === "out"} />
          <Kpi icon={UserPlus} label="Walk-ins" value={s?.walkInsToday ?? "—"} hint="Registered at the gate today" />
          <Kpi icon={UsersRound} label="Visits today" value={s?.visitsToday ?? "—"} hint="Checked in today" onClick={() => set({ tab: "all", date: undefined })} active={tab === "all"} />
          {canVerify && (
            <div className="col-span-2 xl:col-span-4">
              <VerifyPass />
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0">
          <div className="card mb-3 p-3">
            <div className="mb-3">
              <Tabs<Tab>
                value={tab}
                onChange={(t) => set({ tab: t === "onsite" ? undefined : t })}
                items={[
                  { value: "onsite", label: "On site", count: day === today ? s?.onSiteNow : undefined },
                  { value: "expected", label: "Expected", count: day === today ? s?.expectedToday : undefined },
                  { value: "out", label: "Checked out", count: day === today ? s?.checkedOutToday : undefined },
                  { value: "all", label: "All" },
                ]}
              />
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <form
                className="relative w-full min-w-0 flex-1 sm:min-w-[220px]"
                onSubmit={(e) => {
                  e.preventDefault();
                  set({ q: search.trim() || undefined });
                }}
              >
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subtle" aria-hidden />
                <input className="input pl-9" placeholder="Name, company, pass, phone, host or vehicle…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search visitors" />
              </form>
              <Field label="Purpose" className="w-full sm:w-[180px]">
                {(id) => (
                  <select id={id} className="input" value={filters.purpose ?? ""} onChange={(e) => set({ purpose: e.target.value || undefined })}>
                    <option value="">Any purpose</option>
                    {VISIT_PURPOSE_ORDER.map((p) => (
                      <option key={p} value={p}>
                        {VISIT_PURPOSE_LABEL[p]}
                      </option>
                    ))}
                  </select>
                )}
              </Field>
              <Field label="Day" className="w-full sm:w-[160px]">
                {(id) => <input id={id} type="date" className="input" value={day} onChange={(e) => set({ date: e.target.value && e.target.value !== today ? e.target.value : undefined })} />}
              </Field>
              {filtered && (
                <button
                  className="btn-ghost h-10"
                  onClick={() => {
                    set({ q: undefined, purpose: undefined, date: undefined });
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
              <Spinner label="Loading visitors" />
            ) : rows.length === 0 ? (
              <Empty
                icon={IdCard}
                title={filtered ? "No visitors match" : tab === "onsite" ? "Nobody is on site" : tab === "expected" ? "Nobody else is expected" : tab === "out" ? "Nobody has checked out yet" : "No visitors on this day"}
                hint={filtered ? "Try another day, purpose or search." : tab === "expected" ? "Pre-registered visitors appear here until they arrive." : "Visitors appear here as they are checked in at the gate."}
              />
            ) : (
              <ul className="divide-y divide-line">
                {rows.map((r) => (
                  <VisitRowItem key={r.id} row={r} onAct={canManage ? (row, action) => act.mutate({ row, action }) : undefined} pending={pendingId === r.id} />
                ))}
              </ul>
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
            {rows.length} visitor{rows.length === 1 ? "" : "s"}
            {list.hasNextPage ? " — more available" : ""} · {day === today ? "today" : day} · Times are Asia/Dhaka. Unused passes expire at the end of their day.
          </p>
        </div>

        <div className="min-w-0 space-y-4">
          <Card title="Today's visitors by purpose" action={<span className="text-xs text-ink-subtle">Checked in today</span>}>
            {summary.isLoading ? (
              <Spinner />
            ) : (
              <BarList
                data={purposeData}
                caption="Visitors checked in today, by purpose"
                detail={s ? `${s.visitsToday} checked in so far · ${s.expectedToday} more expected today. Select a bar to filter.` : undefined}
                onSelect={(label) => set({ purpose: labelToPurpose[label], tab: "all", date: undefined })}
              />
            )}
          </Card>
          <Card title="Last 7 days" action={<span className="text-xs text-ink-subtle">Visitors checked in per day</span>}>
            {s ? <GroupedColumns data={s.last7Days} category="day" series={[{ key: "visits", label: "Visits" }]} caption="Visitors checked in per day, last 7 days" formatCategory={(d) => dayTick.format(new Date(`${String(d)}T12:00:00Z`))} height={200} /> : <Spinner />}
          </Card>
        </div>
      </div>

      <VisitFormModal
        mode={form.mode ?? "invite"}
        open={!!form.mode}
        onClose={form.close}
        onCreated={(v) => {
          void qc.invalidateQueries({ queryKey: ["admin", "visitors"] });
          if (v.walkIn) {
            form.close();
            toast.success(`${v.visitorName} is checked in with pass ${v.passNumber}. ${v.host.userId ? `${v.host.name} has been told.` : `Let ${v.host.name} know.`}`);
          } else {
            toast.success(`Gate pass ${v.passNumber} created — ${v.visitorName} has been sent the pass number by SMS.`);
            navigate(`/visitors/${v.id}`);
          }
        }}
      />
    </div>
  );
}

// ── A host's own visitors ──

function MyVisitors() {
  const navigate = useNavigate();
  const canInvite = useCan(Capability.VISITOR_INVITE);
  const form = useFormParam(false);
  const [scope, setScope] = useState<"upcoming" | "past">("upcoming");
  const list = useInfiniteQuery({
    queryKey: ["visitors", "mine", scope],
    queryFn: ({ pageParam }) => api.get<Page<VisitRow>>(`/visitors/mine${qs({ scope, cursor: pageParam, limit: 30 })}`),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: canInvite,
    refetchInterval: 60_000,
  });
  const rows = list.data?.pages.flatMap((p) => p.items) ?? [];
  return (
    <div>
      <PageHeader
        overline="Facilities"
        title="My visitors"
        subtitle="Pre-register the people coming to see you. They get a gate pass number by SMS, and you are told when they arrive and leave."
        actions={
          canInvite && (
            <button className="btn-primary" onClick={() => form.open("invite")}>
              <CalendarClock className="h-4 w-4" /> Pre-register visitor
            </button>
          )
        }
      />
      <div className="card mb-3 p-3">
        <Tabs
          value={scope}
          onChange={setScope}
          items={[
            { value: "upcoming", label: "Upcoming & on site" },
            { value: "past", label: "Past" },
          ]}
        />
      </div>
      <ErrorNote error={list.error} />
      <div className="card overflow-hidden">
        {!canInvite ? (
          <Empty icon={IdCard} title="Visitors are not part of your role" hint="Ask an administrator if you need to host visitors." />
        ) : list.isLoading ? (
          <Spinner label="Loading your visitors" />
        ) : rows.length === 0 ? (
          <Empty icon={IdCard} title={scope === "upcoming" ? "No visitors coming" : "No past visitors"} hint={scope === "upcoming" ? "Pre-register a visitor and their gate pass appears here." : "Visitors you hosted appear here."} />
        ) : (
          <ul className="divide-y divide-line">
            {rows.map((r) => (
              <VisitRowItem key={r.id} row={r} />
            ))}
          </ul>
        )}
        {list.hasNextPage && (
          <div className="border-t border-line p-3 text-center">
            <button className="btn-secondary" onClick={() => list.fetchNextPage()} disabled={list.isFetchingNextPage}>
              Load more
            </button>
          </div>
        )}
      </div>
      <VisitFormModal
        mode="invite"
        open={form.mode === "invite"}
        onClose={form.close}
        onCreated={(v) => {
          toast.success(`Gate pass ${v.passNumber} created — ${v.visitorName} has been sent the pass number by SMS.`);
          navigate(`/visitors/${v.id}`);
        }}
      />
    </div>
  );
}
