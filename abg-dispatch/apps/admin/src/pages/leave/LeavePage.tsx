import { useCallback, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarCheck2, CalendarClock, CalendarDays, ChevronLeft, ChevronRight, Hourglass, Loader2, Palmtree, Plus, Save, Search, Trash2, UserRound, X } from "lucide-react";
import { Capability, LEAVE_AWAITING_LABEL, LEAVE_TYPE_LABEL, LEAVE_TYPE_ORDER, LEAVE_TYPE_RULES, LeaveType, formatLeaveDays } from "@abg-dispatch/shared";
import { api, qs } from "../../lib/api";
import { useOffices } from "../../lib/lookups";
import { useCan } from "../../lib/auth";
import { dhakaDay } from "../../lib/format";
import { toast } from "../../components/toast";
import { Card, Empty, ErrorNote, Field, PageHeader, Spinner, cx } from "../../components/ui";
import { TabBar } from "../../components/StatusChip";
import { PersonPicker, type PickedPerson } from "../../components/PersonPicker";
import { Stat } from "../tours/parts";
import { ApplyLeaveModal } from "./ApplyLeaveModal";
import { LeaveCalendarGrid } from "./LeaveCalendarGrid";
import { BalanceCard, LeaveStatusBadge, LeaveTypeTag, OnLeaveTag, calendarDay, leaveDates } from "./parts";
import type { LeaveApprovalRow, LeaveBalance, LeaveCalendar, LeaveRow, LeaveSettings, LeaveSummary, Page, PersonBalances, PublicHoliday } from "./types";

type Tab = "MINE" | "AWAITING_ME" | "TEAM" | "ALL" | "HR";

interface DisplayRow {
  id: string;
  referenceNumber: string;
  type: string;
  startDate: string;
  endDate: string;
  halfDay: string | null;
  days: number;
  reason: string;
  status: string;
  awaiting: "HOD" | "HR" | null;
  onLeaveNow: boolean;
  who: string;
  whoSub: string;
  approver: string;
  awaitingMe: boolean;
}

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const fromRow = (r: LeaveRow, awaitingMe: Set<string>): DisplayRow => ({
  id: r.id,
  referenceNumber: r.referenceNumber,
  type: r.type,
  startDate: r.startDate,
  endDate: r.endDate,
  halfDay: r.halfDay,
  days: r.days,
  reason: r.reason,
  status: r.status,
  awaiting: r.awaiting,
  onLeaveNow: r.onLeaveNow,
  who: r.applicant.name,
  whoSub: [r.applicant.designation, r.branch.code].filter(Boolean).join(" · "),
  approver: r.approver.name,
  awaitingMe: awaitingMe.has(r.id),
});

const fromApproval = (r: LeaveApprovalRow): DisplayRow => ({
  id: r.id,
  referenceNumber: r.referenceNumber,
  type: r.type,
  startDate: r.startDate,
  endDate: r.endDate,
  halfDay: r.halfDay,
  days: r.days,
  reason: r.reason,
  status: r.status,
  awaiting: r.awaiting,
  onLeaveNow: false,
  who: r.applicant.name,
  whoSub: [r.applicant.designation, r.applicant.department].filter(Boolean).join(" · "),
  approver: "",
  awaitingMe: true,
});

function monthRange(month: string): { from: string; to: string } {
  const [y, m] = month.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { from: `${month}-01`, to: `${month}-${String(last).padStart(2, "0")}` };
}

function shiftMonth(month: string, n: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return d.toISOString().slice(0, 7);
}

const monthLabel = (month: string) => new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", month: "long", year: "numeric" }).format(new Date(`${month}-01T00:00:00Z`));

function CalendarPanel({ staff }: { staff: boolean }) {
  const today = dhakaDay();
  const [month, setMonth] = useState(today.slice(0, 7));
  const [branchId, setBranchId] = useState("");
  const branches = useOffices();
  const { from, to } = monthRange(month);
  const cal = useQuery({
    queryKey: ["leave", "calendar", staff, month, branchId],
    queryFn: () => api.get<LeaveCalendar>(staff ? `/admin/leave/calendar${qs({ from, to, branchId: branchId || undefined })}` : `/leave/team${qs({ from, to })}`),
  });
  return (
    <Card
      title={
        <span className="inline-flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-navy-500" aria-hidden /> {staff ? "Who is away" : "My team"} · {monthLabel(month)}
        </span>
      }
      action={
        <div className="flex items-center gap-1">
          <button className="btn-ghost h-8 px-2" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Previous month">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button className="btn-ghost h-8 px-2 text-xs" onClick={() => setMonth(today.slice(0, 7))}>
            Today
          </button>
          <button className="btn-ghost h-8 px-2" onClick={() => setMonth(shiftMonth(month, 1))} aria-label="Next month">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      }
    >
      {staff && (
        <Field label="Office" className="mb-4 w-full sm:w-[220px]">
          {(id) => (
            <select id={id} className="input" value={branchId} onChange={(e) => setBranchId(e.target.value)}>
              <option value="">All my offices</option>
              {(branches.data ?? []).map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}
        </Field>
      )}
      <ErrorNote error={cal.error} />
      {cal.isLoading ? (
        <Spinner label="Loading the calendar" />
      ) : !cal.data?.people.length ? (
        <Empty icon={CalendarCheck2} title="Nobody is on leave this month" hint={staff ? "Approved and pending leave in your offices shows here." : "Leave of the people who report to you shows here."} />
      ) : (
        <LeaveCalendarGrid data={cal.data} today={today} />
      )}
      {cal.data && cal.data.holidays.length > 0 && (
        <p className="mt-3 text-xs text-ink-subtle">
          Public holidays: {cal.data.holidays.map((h) => `${calendarDay(h.date)} — ${h.name}`).join(" · ")}
        </p>
      )}
    </Card>
  );
}

function HolidaysPanel() {
  const qc = useQueryClient();
  const settings = useQuery({ queryKey: ["leave", "calendar-settings"], queryFn: () => api.get<LeaveSettings>("/leave/calendar-settings") });
  const [draft, setDraft] = useState<{ weekendDays: number[]; holidays: PublicHoliday[] } | null>(null);
  const [newDate, setNewDate] = useState("");
  const [newName, setNewName] = useState("");
  const current = draft ?? (settings.data ? { weekendDays: settings.data.weekendDays, holidays: settings.data.holidays } : null);
  const save = useMutation({
    mutationFn: () => api.put<LeaveSettings>("/admin/leave/settings", current),
    onSuccess: () => {
      toast.success("Leave calendar saved.");
      setDraft(null);
      void qc.invalidateQueries({ queryKey: ["leave"] });
    },
  });
  if (!current) return <Spinner label="Loading the leave calendar" />;
  const year = dhakaDay().slice(0, 4);
  const toggleDay = (d: number) => setDraft({ ...current, weekendDays: current.weekendDays.includes(d) ? current.weekendDays.filter((x) => x !== d) : [...current.weekendDays, d].sort() });
  return (
    <Card
      title="Weekly and public holidays"
      action={
        <button className="btn-primary h-9" disabled={!draft || save.isPending} onClick={() => save.mutate()}>
          {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
        </button>
      }
    >
      <p className="label">Weekly holiday</p>
      <div className="flex flex-wrap gap-2">
        {WEEKDAYS.map((w, i) => (
          <button key={w} type="button" onClick={() => toggleDay(i)} aria-pressed={current.weekendDays.includes(i)} className={cx("h-9 rounded-lg border px-3 text-sm font-semibold", current.weekendDays.includes(i) ? "border-navy bg-navy text-white" : "border-line text-ink-muted hover:border-line-strong")}>
            {w.slice(0, 3)}
          </button>
        ))}
      </div>
      <p className="label mt-5">Public holidays</p>
      <ul className="divide-y divide-line rounded-xl border border-line">
        {current.holidays.map((h) => (
          <li key={h.date} className={cx("flex items-center gap-3 px-3 py-2", !h.date.startsWith(year) && "opacity-70")}>
            <span className="mono w-[96px] shrink-0 text-xs text-navy-500">{h.date}</span>
            <span className="min-w-0 flex-1 truncate text-sm text-ink">{h.name}</span>
            <button className="btn-ghost h-8 px-2 text-danger" onClick={() => setDraft({ ...current, holidays: current.holidays.filter((x) => x.date !== h.date) })} aria-label={`Remove ${h.name}`}>
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>
      <form
        className="mt-3 flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!newDate || newName.trim().length < 2) return;
          setDraft({ ...current, holidays: [...current.holidays.filter((h) => h.date !== newDate), { date: newDate, name: newName.trim() }].sort((a, b) => a.date.localeCompare(b.date)) });
          setNewDate("");
          setNewName("");
        }}
      >
        <Field label="Date" className="w-full sm:w-[170px]">
          {(id) => <input id={id} type="date" className="input" value={newDate} onChange={(e) => setNewDate(e.target.value)} />}
        </Field>
        <Field label="Holiday" className="min-w-0 flex-1">
          {(id) => <input id={id} className="input" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Shab-e-Barat" maxLength={80} />}
        </Field>
        <button className="btn-secondary h-10" type="submit" disabled={!newDate || newName.trim().length < 2}>
          <Plus className="h-4 w-4" /> Add
        </button>
      </form>
      {settings.data?.updatedBy && <p className="mt-3 text-xs text-ink-subtle">Last changed by {settings.data.updatedBy}.</p>}
      <ErrorNote error={save.error} />
    </Card>
  );
}

function EntitlementsPanel() {
  const qc = useQueryClient();
  const [person, setPerson] = useState<PickedPerson | null>(null);
  const year = Number(dhakaDay().slice(0, 4));
  const balances = useQuery({
    queryKey: ["leave", "balances", person?.userId, year],
    queryFn: () => api.get<PersonBalances>(`/admin/leave/balances${qs({ userId: person!.userId!, year })}`),
    enabled: !!person?.userId,
  });
  const [edit, setEdit] = useState<{ type: string; days: string; note: string } | null>(null);
  const save = useMutation({
    mutationFn: () => api.put<PersonBalances>("/admin/leave/entitlements", { userId: person!.userId, year, type: edit!.type, days: Number(edit!.days), note: edit!.note.trim() }),
    onSuccess: (next) => {
      qc.setQueryData(["leave", "balances", person?.userId, year], next);
      toast.success(`${LEAVE_TYPE_LABEL[edit!.type as LeaveType]} for ${next.person.name} set to ${edit!.days} days.`);
      setEdit(null);
    },
  });
  return (
    <Card title={`Entitlements ${year}`}>
      <p className="mb-3 text-sm text-ink-muted">Change one person's entitlement for the year — carried-forward earned leave, or a part-year joiner. Every change is in the audit log.</p>
      <PersonPicker label="Employee" value={person} onChange={(p) => (setPerson(p), setEdit(null))} needsAccount allowMe emptyText="Choose an employee" icon={UserRound} />
      <ErrorNote error={balances.error} />
      {balances.data && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead className="text-[11px] uppercase tracking-wide text-ink-muted">
              <tr>
                <th className="py-2 pr-3 font-semibold">Type</th>
                <th className="py-2 pr-3 text-right font-semibold">Entitled</th>
                <th className="py-2 pr-3 text-right font-semibold">Used</th>
                <th className="py-2 pr-3 text-right font-semibold">Pending</th>
                <th className="py-2 pr-3 text-right font-semibold">Left</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {balances.data.balances
                .filter((b) => b.entitled !== null)
                .map((b) => (
                  <tr key={b.type}>
                    <td className="py-2 pr-3">
                      <LeaveTypeTag type={b.type} />
                      {b.adjusted && <p className="mt-1 text-[11px] text-ink-subtle">{b.note}</p>}
                    </td>
                    <td className="tabular py-2 pr-3 text-right font-semibold">{b.entitled}</td>
                    <td className="tabular py-2 pr-3 text-right">{b.used}</td>
                    <td className="tabular py-2 pr-3 text-right">{b.pending}</td>
                    <td className="tabular py-2 pr-3 text-right font-semibold text-navy">{b.available}</td>
                    <td className="py-2 text-right">
                      <button className="btn-ghost h-8 px-2 text-xs" onClick={() => setEdit({ type: b.type, days: String(b.entitled), note: b.note ?? "" })}>
                        Change
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
      {edit && (
        <div className="mt-4 space-y-3 rounded-xl border border-line p-3">
          <p className="text-sm font-semibold text-navy">{LEAVE_TYPE_LABEL[edit.type as LeaveType]}: policy {LEAVE_TYPE_RULES[edit.type as LeaveType].annualDays} days</p>
          <div className="flex flex-wrap items-end gap-2">
            <Field label="Days" className="w-[110px]">
              {(id) => <input id={id} className="input tabular" inputMode="decimal" value={edit.days} onChange={(e) => setEdit({ ...edit, days: e.target.value })} />}
            </Field>
            <Field label="Why" className="min-w-0 flex-1">
              {(id) => <input id={id} className="input" value={edit.note} onChange={(e) => setEdit({ ...edit, note: e.target.value })} placeholder="e.g. 4 days carried forward from last year" />}
            </Field>
          </div>
          <div className="flex justify-end gap-2">
            <button className="btn-ghost" onClick={() => setEdit(null)}>
              Cancel
            </button>
            <button className="btn-primary" disabled={save.isPending || !(Number(edit.days) >= 0) || edit.days === "" || edit.note.trim().length < 3} onClick={() => save.mutate()}>
              {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Save
            </button>
          </div>
          <ErrorNote error={save.error} />
        </div>
      )}
    </Card>
  );
}

export function LeavePage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const canView = useCan(Capability.LEAVE_VIEW);
  const canManage = useCan(Capability.LEAVE_MANAGE);
  const [search, setSearch] = useState(params.get("q") ?? "");
  const q = params.get("q") ?? "";
  const typeFilter = params.get("type") ?? "";
  const tab = (params.get("tab") as Tab | null) ?? (q && canView ? "ALL" : "MINE");
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

  const balances = useQuery({ queryKey: ["leave", "balance"], queryFn: () => api.get<{ year: number; balances: LeaveBalance[] }>("/leave/balance") });
  const summary = useQuery({ queryKey: ["leave", "summary"], queryFn: () => api.get<LeaveSummary>("/admin/leave/summary"), enabled: canView, refetchInterval: 60_000 });
  const approvals = useQuery({ queryKey: ["leave", "approvals"], queryFn: () => api.get<Page<LeaveApprovalRow>>("/leave/approvals?limit=100"), refetchInterval: 60_000 });
  const awaitingIds = useMemo(() => new Set((approvals.data?.items ?? []).map((a) => a.id)), [approvals.data]);
  const list = useInfiniteQuery({
    queryKey: ["leave", "list", tab, q, typeFilter],
    queryFn: ({ pageParam }) =>
      tab === "MINE"
        ? api.get<Page<LeaveRow>>(`/leave/mine${qs({ state: "all", cursor: pageParam, limit: 30 })}`)
        : api.get<Page<LeaveRow>>(`/admin/leave${qs({ q: q || undefined, type: typeFilter || undefined, status: "ALL", cursor: pageParam, limit: 30 })}`),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: tab === "MINE" || (tab === "ALL" && canView),
  });

  const localFilter = (r: DisplayRow) => (!typeFilter || r.type === typeFilter) && (!q || [r.referenceNumber, r.who, r.reason].some((v) => v.toLowerCase().includes(q.toLowerCase())));
  const rows: DisplayRow[] =
    tab === "AWAITING_ME" ? (approvals.data?.items ?? []).map(fromApproval).filter(localFilter) : (list.data?.pages.flatMap((p) => p.items) ?? []).map((r) => fromRow(r, awaitingIds)).filter(tab === "MINE" ? localFilter : () => true);
  const loading = tab === "AWAITING_ME" ? approvals.isLoading : list.isLoading;
  const s = summary.data;
  const mainBalances = (balances.data?.balances ?? []).filter((b) => ([LeaveType.CASUAL, LeaveType.SICK, LeaveType.EARNED] as string[]).includes(b.type) || b.used > 0 || b.pending > 0);

  const tabs: { value: Tab; label: string; count?: number; urgent?: boolean }[] = [
    { value: "MINE", label: "My leave" },
    { value: "AWAITING_ME", label: "Awaiting me", count: approvals.data?.items.length, urgent: true },
    { value: "TEAM", label: canView ? "Leave calendar" : "Team calendar" },
    ...(canView ? [{ value: "ALL" as Tab, label: "All applications", count: s ? s.counts.PENDING_HOD + s.counts.PENDING_HR + s.counts.APPROVED + s.counts.REJECTED + s.counts.CANCELLED : undefined }] : []),
    ...(canManage ? [{ value: "HR" as Tab, label: "Holidays & entitlements" }] : []),
  ];

  return (
    <div>
      <PageHeader
        overline="Services"
        title="Leave"
        subtitle="Apply for leave, follow it through your head of department and HR, and see who is away."
        actions={
          <button className="btn-primary" onClick={() => set({ new: "1" })}>
            <Plus className="h-4 w-4" /> Apply for leave
          </button>
        }
      />

      {canView && (
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="On leave today" value={s?.onLeaveToday ?? "—"} icon={Palmtree} tone="active" hint={s ? (s.onLeave.length ? s.onLeave.map((p) => p.name).join(" · ") : "Everyone is in") : undefined} />
          <Stat label="Waiting for approval" value={s?.pendingApprovals ?? "—"} icon={Hourglass} tone={s?.pendingApprovals ? "pending" : undefined} hint={s ? `HOD ${s.pendingByStage.PENDING_HOD} · HR ${s.pendingByStage.PENDING_HR}` : undefined} />
          <Stat label="Starting this week" value={s?.startingThisWeek ?? "—"} icon={CalendarClock} hint="Approved leave in the next 7 days" />
          <Stat
            label={`Days approved ${s?.year ?? ""}`}
            value={s ? formatLeaveDays(Object.values(s.approvedDaysByType).reduce((a, b) => a + b, 0)).replace(/ days?/, "") : "—"}
            icon={CalendarCheck2}
            tone="success"
            hint={s ? LEAVE_TYPE_ORDER.filter((t) => s.approvedDaysByType[t]).map((t) => `${LEAVE_TYPE_LABEL[t].replace(" leave", "")} ${s.approvedDaysByType[t]}`).join(" · ") : undefined}
          />
        </div>
      )}

      {tab === "MINE" && (
        <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4 2xl:grid-cols-6">
          {balances.isLoading ? <Spinner label="Loading your balance" /> : mainBalances.map((b) => <BalanceCard key={b.type} b={b} />)}
        </div>
      )}

      <div className="card mb-4 p-3">
        <TabBar label="Leave" value={tab} items={tabs} onChange={(v) => set({ tab: v === "MINE" ? undefined : v })} />
        {(tab === "MINE" || tab === "AWAITING_ME" || tab === "ALL") && (
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <form
              className="relative w-full min-w-0 flex-1 sm:min-w-[240px]"
              onSubmit={(e) => {
                e.preventDefault();
                set({ q: search.trim() || undefined });
              }}
            >
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subtle" aria-hidden />
              <input className="input pl-9" placeholder="Reference, name or reason…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search leave" />
            </form>
            <Field label="Type" className="w-full sm:w-[190px]">
              {(id) => (
                <select id={id} className="input" value={typeFilter} onChange={(e) => set({ type: e.target.value || undefined })}>
                  <option value="">Any</option>
                  {LEAVE_TYPE_ORDER.map((t) => (
                    <option key={t} value={t}>
                      {LEAVE_TYPE_LABEL[t]}
                    </option>
                  ))}
                </select>
              )}
            </Field>
            {(q || typeFilter) && (
              <button className="btn-ghost h-10" onClick={() => (set({ q: undefined, type: undefined }), setSearch(""))}>
                <X className="h-4 w-4" /> Clear
              </button>
            )}
          </div>
        )}
      </div>

      {tab === "TEAM" && <CalendarPanel staff={canView} />}
      {tab === "HR" && canManage && (
        <div className="grid gap-4 xl:grid-cols-2">
          <HolidaysPanel />
          <EntitlementsPanel />
        </div>
      )}

      {(tab === "MINE" || tab === "AWAITING_ME" || tab === "ALL") && (
        <>
          <ErrorNote error={tab === "AWAITING_ME" ? approvals.error : list.error} />
          <div className="card overflow-hidden">
            {loading ? (
              <Spinner label="Loading leave" />
            ) : rows.length === 0 ? (
              <Empty
                icon={Palmtree}
                title={tab === "AWAITING_ME" ? "Nothing is waiting for you" : tab === "MINE" ? "You have not applied for leave yet" : "No applications match"}
                hint={tab === "AWAITING_ME" ? "Leave you need to approve — as head of department or HR — appears here." : tab === "MINE" ? "Use Apply for leave to send an application to your head of department." : "Try another search."}
              />
            ) : (
              <>
                <ul className="divide-y divide-line md:hidden">
                  {rows.map((r) => (
                    <li key={r.id}>
                      <button className="flex w-full items-start gap-3 px-4 py-3.5 text-left hover:bg-surface/80" onClick={() => navigate(`/leave/${r.id}`)}>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="mono text-[12px] text-navy-500">{r.referenceNumber}</span>
                            <LeaveTypeTag type={r.type} />
                            {r.onLeaveNow && <OnLeaveTag />}
                          </div>
                          <p className="mt-1 truncate text-sm font-semibold text-ink">{tab === "MINE" ? r.reason : r.who}</p>
                          <p className="truncate text-xs text-ink-muted">
                            {leaveDates(r.startDate, r.endDate)} · {formatLeaveDays(r.days)}
                          </p>
                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            <LeaveStatusBadge status={r.status} size="sm" />
                            {r.awaitingMe && <span className="rounded-md bg-pending px-1.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-white">Your decision</span>}
                          </div>
                        </div>
                        <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-ink-subtle" aria-hidden />
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[760px] text-left text-sm">
                    <thead className="border-b border-line bg-surface/70 text-[11px] uppercase tracking-wide text-ink-muted">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Ref / {tab === "MINE" ? "Reason" : "Employee"}</th>
                        <th className="px-4 py-3 font-semibold">Type</th>
                        <th className="px-4 py-3 font-semibold">Dates</th>
                        <th className="px-4 py-3 text-right font-semibold">Days</th>
                        <th className="px-4 py-3 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {rows.map((r) => (
                        <tr key={r.id} className="cursor-pointer transition hover:bg-surface/80" onClick={() => navigate(`/leave/${r.id}`)}>
                          <td className="px-4 py-3 align-top">
                            <div className="max-w-[300px]">
                              <Link to={`/leave/${r.id}`} onClick={(e) => e.stopPropagation()} className="mono text-[12.5px] text-navy hover:text-active hover:underline">
                                {r.referenceNumber}
                              </Link>
                              <p className="truncate font-medium text-ink">{tab === "MINE" ? r.reason : r.who}</p>
                              <p className="truncate text-xs text-ink-subtle">{tab === "MINE" ? `Approver: ${r.approver}` : r.whoSub}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3 align-top">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <LeaveTypeTag type={r.type} />
                              {r.onLeaveNow && <OnLeaveTag />}
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 align-top text-ink">
                            {leaveDates(r.startDate, r.endDate)}
                            {r.halfDay && <p className="text-xs text-ink-subtle">{r.halfDay === "FIRST_HALF" ? "Morning" : "Afternoon"}</p>}
                          </td>
                          <td className="tabular whitespace-nowrap px-4 py-3 text-right align-top font-semibold text-ink">{r.days}</td>
                          <td className="px-4 py-3 align-top">
                            <div className="flex flex-col items-start gap-1">
                              <LeaveStatusBadge status={r.status} size="sm" />
                              {r.awaiting && <span className="text-[11px] text-ink-subtle">{r.awaitingMe ? "Waiting for you" : `With ${LEAVE_AWAITING_LABEL[r.awaiting]}`}</span>}
                            </div>
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
        </>
      )}

      <ApplyLeaveModal open={newOpen} onClose={closeNew} />
    </div>
  );
}
