import { useCallback, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { CalendarCheck2, CalendarClock, CalendarDays, ChevronLeft, ChevronRight, Crown, Hourglass, Inbox, Loader2, Plus, Search, Send, X } from "lucide-react";
import { APPOINTMENT_LIMITS, APPOINTMENT_PURPOSE_LABEL, Capability, type AppointmentPurpose } from "@abg-dispatch/shared";
import { api, qs } from "../../lib/api";
import { useAuth, useCan } from "../../lib/auth";
import { dhakaDay } from "../../lib/format";
import { Card, Empty, ErrorNote, PageHeader, Spinner, cx } from "../../components/ui";
import { TabBar } from "../../components/StatusChip";
import { Stat } from "../tours/parts";
import { AppointmentStatusBadge, ModeTag, PlaceLine, UrgentTag, appointmentTone, dhakaHm, dhakaIso, meetingWhen } from "./parts";
import { RequestAppointmentModal } from "./RequestAppointmentModal";
import type { AppointmentRow, AppointmentSummary, Diary, Page } from "./types";

type Tab = "DIARY" | "INBOX" | "MINE" | "DESK";

const DAY_MS = 86_400_000;
const HOUR_FROM = APPOINTMENT_LIMITS.dayStartHour;
const HOUR_TO = APPOINTMENT_LIMITS.dayEndHour;
const ROW = 44; // px per hour
const shift = (d: string, n: number) => new Date(Date.parse(`${d}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);
const dayHead = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short" });

const TONE_BLOCK: Record<string, string> = {
  pending: "border-pending/40 bg-pending-soft text-pending",
  active: "border-active/40 bg-active-soft text-navy",
  success: "border-success/40 bg-success-soft text-success",
  danger: "border-danger/40 bg-danger-soft text-danger",
  neutral: "border-line bg-surface text-ink-muted",
};

/** The meeting's time on the table: confirmed or proposed, else what was asked for. */
const slotOf = (r: AppointmentRow) => r.scheduledAt ?? r.preferredAt;

function WeekDiary({ hostUserId }: { hostUserId?: string }) {
  const navigate = useNavigate();
  const today = dhakaDay();
  // Weeks run Saturday to Friday, as in Bangladesh offices; on the Friday holiday the diary opens on the coming week.
  const weekStart = (d: string) => {
    const weekday = new Date(`${d}T00:00:00Z`).getUTCDay();
    return weekday === 5 ? shift(d, 1) : shift(d, -((weekday + 1) % 7));
  };
  const [from, setFrom] = useState(weekStart(today));
  const to = shift(from, 6);
  const diary = useQuery({ queryKey: ["appointments", "diary", from, hostUserId ?? ""], queryFn: () => api.get<Diary>(`/appointments/diary${qs({ from, to, hostUserId })}`) });
  const days = Array.from({ length: 7 }, (_, i) => shift(from, i));
  const items = diary.data?.items ?? [];
  const multiHost = (diary.data?.hosts.length ?? 0) > 1;
  return (
    <Card
      title={
        <span className="inline-flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-navy-500" aria-hidden /> Week of {dayHead.format(new Date(`${from}T00:00:00Z`))}
        </span>
      }
      action={
        <div className="flex items-center gap-1">
          <button className="btn-ghost h-8 px-2" onClick={() => setFrom(shift(from, -7))} aria-label="Previous week">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button className="btn-ghost h-8 px-2 text-xs" onClick={() => setFrom(weekStart(today))}>
            This week
          </button>
          <button className="btn-ghost h-8 px-2" onClick={() => setFrom(shift(from, 7))} aria-label="Next week">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      }
      padded={false}
    >
      <ErrorNote error={diary.error} />
      {diary.isLoading ? (
        <Spinner label="Loading the diary" />
      ) : (
        <>
          {/* Wide screens: the week as a time grid. */}
          <div className="hidden overflow-x-auto md:block">
            <div className="grid min-w-[860px]" style={{ gridTemplateColumns: `56px repeat(7, minmax(0, 1fr))` }}>
              <div className="border-b border-line" />
              {days.map((d) => (
                <div key={d} className={cx("border-b border-l border-line px-2 py-2 text-center text-xs font-semibold", d === today ? "bg-active-soft text-active" : new Date(`${d}T00:00:00Z`).getUTCDay() === 5 ? "bg-surface text-ink-subtle" : "text-ink-muted")}>
                  {dayHead.format(new Date(`${d}T00:00:00Z`))}
                </div>
              ))}
              <div className="relative" style={{ height: (HOUR_TO - HOUR_FROM) * ROW }}>
                {Array.from({ length: HOUR_TO - HOUR_FROM }, (_, i) => (
                  <span key={i} className="tabular absolute right-2 -translate-y-1/2 text-[10.5px] text-ink-subtle" style={{ top: i * ROW }}>
                    {i === 0 ? "" : `${((HOUR_FROM + i + 11) % 12) + 1}${HOUR_FROM + i < 12 ? "am" : "pm"}`}
                  </span>
                ))}
              </div>
              {days.map((d) => (
                <div key={d} className={cx("relative border-l border-line", new Date(`${d}T00:00:00Z`).getUTCDay() === 5 && "bg-surface/60")} style={{ height: (HOUR_TO - HOUR_FROM) * ROW }}>
                  {Array.from({ length: HOUR_TO - HOUR_FROM }, (_, i) => (
                    <span key={i} className="absolute inset-x-0 border-t border-line/70" style={{ top: i * ROW }} aria-hidden />
                  ))}
                  {items
                    .filter((r) => dhakaIso(slotOf(r)) === d)
                    .map((r) => {
                      const [h, m] = dhakaHm(slotOf(r)).split(":").map(Number);
                      const top = (h - HOUR_FROM + m / 60) * ROW;
                      const height = Math.max(22, (r.durationMinutes / 60) * ROW - 2);
                      return (
                        <button
                          key={r.id}
                          onClick={() => navigate(`/appointments/${r.id}`)}
                          title={`${r.subject} — ${r.requester.name}`}
                          className={cx("absolute inset-x-1 overflow-hidden rounded-md border px-1.5 py-1 text-left text-[11px] leading-tight shadow-sm transition hover:brightness-95", TONE_BLOCK[appointmentTone(r.status)], r.status === "PENDING" && "border-dashed")}
                          style={{ top, height }}
                        >
                          <span className="block truncate font-semibold">
                            {dhakaHm(slotOf(r))} {r.subject}
                          </span>
                          {height > 30 && (
                            <span className="block truncate opacity-80">
                              {r.requester.name}
                              {multiHost ? ` → ${r.host.name.split(" ")[0]}` : ""}
                            </span>
                          )}
                        </button>
                      );
                    })}
                </div>
              ))}
            </div>
          </div>
          {/* Phones: the week as an agenda. */}
          <ul className="divide-y divide-line md:hidden">
            {days.map((d) => {
              const dayItems = items.filter((r) => dhakaIso(slotOf(r)) === d).sort((a, b) => slotOf(a).localeCompare(slotOf(b)));
              return (
                <li key={d} className="px-4 py-3">
                  <p className={cx("text-xs font-bold uppercase tracking-wide", d === today ? "text-active" : "text-ink-muted")}>{dayHead.format(new Date(`${d}T00:00:00Z`))}</p>
                  {dayItems.length === 0 ? (
                    <p className="mt-1 text-xs text-ink-subtle">No meetings</p>
                  ) : (
                    <ul className="mt-2 space-y-2">
                      {dayItems.map((r) => (
                        <li key={r.id}>
                          <button onClick={() => navigate(`/appointments/${r.id}`)} className={cx("w-full rounded-lg border px-3 py-2 text-left", TONE_BLOCK[appointmentTone(r.status)], r.status === "PENDING" && "border-dashed")}>
                            <span className="block text-sm font-semibold">
                              {dhakaHm(slotOf(r))} · {r.subject}
                            </span>
                            <span className="block text-xs opacity-80">
                              {r.requester.name}
                              {multiHost ? ` with ${r.host.name}` : ""}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
          <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-line px-4 py-2.5 text-xs text-ink-muted">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-[3px] border border-active/40 bg-active-soft" aria-hidden /> Confirmed
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-[3px] border border-dashed border-pending/40 bg-pending-soft" aria-hidden /> Requested (preferred time)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-[3px] border border-pending/40 bg-pending-soft" aria-hidden /> New time proposed
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-[3px] border border-success/40 bg-success-soft" aria-hidden /> Held
            </span>
          </div>
        </>
      )}
    </Card>
  );
}

export function AppointmentsPage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const office = useCan(Capability.APPOINTMENT_MANAGE);
  const isExecutive = useAuth((s) => s.profile?.roles.includes("EXECUTIVE") ?? false);
  const deskByDefault = office || isExecutive;
  const q = params.get("q") ?? "";
  const tab = (params.get("tab") as Tab | null) ?? (q ? (deskByDefault ? "DESK" : "MINE") : deskByDefault ? "DIARY" : "MINE");
  const [search, setSearch] = useState(q);
  const hostFilter = params.get("host") ?? "";
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

  const summary = useQuery({ queryKey: ["appointments", "summary"], queryFn: () => api.get<AppointmentSummary>("/appointments/summary"), refetchInterval: 60_000 });
  const inbox = useQuery({ queryKey: ["appointments", "inbox"], queryFn: () => api.get<Page<AppointmentRow>>("/appointments/inbox?limit=100"), refetchInterval: 60_000 });
  const diaryHosts = useQuery({ queryKey: ["appointments", "diary", "hosts"], queryFn: () => api.get<Diary>(`/appointments/diary${qs({ from: dhakaDay(), to: dhakaDay(new Date(Date.now() + 40 * DAY_MS)) })}`), enabled: office });
  const list = useInfiniteQuery({
    queryKey: ["appointments", "list", tab, q],
    queryFn: ({ pageParam }) =>
      tab === "MINE"
        ? api.get<Page<AppointmentRow>>(`/appointments/mine${qs({ state: "all", cursor: pageParam, limit: 30 })}`)
        : api.get<Page<AppointmentRow>>(`/appointments/desk${qs({ status: "ALL", q: q || undefined, cursor: pageParam, limit: 30 })}`),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: tab === "MINE" || tab === "DESK",
  });
  const rows = useMemo(() => {
    const base = tab === "INBOX" ? (inbox.data?.items ?? []) : (list.data?.pages.flatMap((p) => p.items) ?? []);
    const text = q.toLowerCase();
    return base.filter((r) => !text || tab === "DESK" || [r.referenceNumber, r.subject, r.host.name, r.requester.name].some((v) => v.toLowerCase().includes(text)));
  }, [tab, inbox.data, list.data, q]);
  const s = summary.data;
  const loading = tab === "INBOX" ? inbox.isLoading : list.isLoading;

  const tabs: { value: Tab; label: string; count?: number; urgent?: boolean }[] = [
    { value: "DIARY", label: office ? "Executive diary" : "My diary" },
    { value: "INBOX", label: "To answer", count: inbox.data?.items.length, urgent: true },
    { value: "MINE", label: "My requests", count: s?.myOpenRequests },
    { value: "DESK", label: office ? "All requests to the MD & Chairman" : "All requests to me" },
  ];

  return (
    <div>
      <PageHeader
        overline="Services"
        title="Request for Appointment"
        subtitle="Meetings with the MD, the Chairman and heads of department: asked, confirmed or moved, and kept in one diary."
        actions={
          <button className="btn-primary" onClick={() => set({ new: "1" })}>
            <Plus className="h-4 w-4" /> Request a meeting
          </button>
        }
      />

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label={office ? "Requests to the executives" : "Requests to answer"} value={s?.awaitingAnswer ?? "—"} icon={Inbox} tone={s?.awaitingAnswer ? "pending" : undefined} hint={s ? (s.awaitingRequester ? `${s.awaitingRequester} new time${s.awaitingRequester === 1 ? "" : "s"} waiting for the requester` : "Nothing proposed") : undefined} />
        <Stat label="Confirmed today" value={s?.confirmedToday ?? "—"} icon={CalendarCheck2} tone="active" hint={s?.next ? `Next: ${meetingWhen(s.next.scheduledAt)}` : "No meetings ahead"} />
        <Stat label="This week" value={s?.confirmedThisWeek ?? "—"} icon={CalendarClock} hint="Confirmed meetings, next 7 days" />
        <Stat label="My open requests" value={s?.myOpenRequests ?? "—"} icon={Send} hint="Meetings I asked for" />
      </div>

      {s?.next && (
        <Link to={`/appointments/${s.next.id}`} className="card mb-4 flex flex-wrap items-center gap-4 bg-hero px-5 py-4 text-white hover:brightness-110">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/10">
            <CalendarClock className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#8DB8FF]">Next meeting</p>
            <p className="truncate font-display text-lg font-bold">{s.next.subject}</p>
            <p className="truncate text-sm text-platinum">
              {meetingWhen(s.next.scheduledAt, s.next.durationMinutes)} · {s.next.requester.name}
              {office ? ` with ${s.next.host.name}` : ""}
              {s.next.location ? ` · ${s.next.location}` : ""}
            </p>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-platinum" aria-hidden />
        </Link>
      )}

      <div className="card mb-4 p-3">
        <TabBar label="Appointments" value={tab} items={tabs} onChange={(v) => set({ tab: v === (deskByDefault ? "DIARY" : "MINE") ? undefined : v })} />
        {tab === "DIARY" && office && (diaryHosts.data?.hosts.length ?? 0) > 1 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {[{ userId: "", name: "Both" }, ...(diaryHosts.data?.hosts ?? [])].map((h) => (
              <button key={h.userId || "all"} onClick={() => set({ host: h.userId || undefined })} className={cx("inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-sm font-semibold", hostFilter === h.userId ? "border-navy bg-navy text-white" : "border-line-strong bg-white text-navy hover:bg-surface")}>
                {h.userId && <Crown className="h-3.5 w-3.5" aria-hidden />} {h.name}
              </button>
            ))}
          </div>
        )}
        {tab !== "DIARY" && (
          <form
            className="relative mt-3"
            onSubmit={(e) => {
              e.preventDefault();
              set({ q: search.trim() || undefined });
            }}
          >
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subtle" aria-hidden />
            <input className="input pl-9" placeholder="Reference, subject or person…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search appointments" />
            {q && (
              <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-ink-subtle hover:text-ink" onClick={() => (set({ q: undefined }), setSearch(""))} aria-label="Clear search">
                <X className="h-4 w-4" />
              </button>
            )}
          </form>
        )}
      </div>

      {tab === "DIARY" ? (
        <WeekDiary hostUserId={hostFilter || undefined} />
      ) : (
        <>
          <ErrorNote error={tab === "INBOX" ? inbox.error : list.error} />
          <div className="card overflow-hidden">
            {loading ? (
              <Spinner label="Loading appointments" />
            ) : rows.length === 0 ? (
              <Empty
                icon={tab === "INBOX" ? Hourglass : CalendarDays}
                title={tab === "INBOX" ? "Nothing to answer" : tab === "MINE" ? "You have not asked for a meeting yet" : "No requests yet"}
                hint={tab === "INBOX" ? "New requests for a meeting appear here." : tab === "MINE" ? "Use Request a meeting to ask the MD, the Chairman or a head of department." : undefined}
              />
            ) : (
              <ul className="divide-y divide-line">
                {rows.map((r) => (
                  <li key={r.id}>
                    <button className="flex w-full items-start gap-4 px-4 py-3.5 text-left hover:bg-surface/80 sm:px-5" onClick={() => navigate(`/appointments/${r.id}`)}>
                      <div className="hidden w-[132px] shrink-0 sm:block">
                        <p className="text-sm font-semibold text-navy">{meetingWhen(slotOf(r)).split(" · ")[0]}</p>
                        <p className="tabular text-xs text-ink-muted">
                          {meetingWhen(slotOf(r), r.durationMinutes).split(" · ")[1]}
                        </p>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="mono text-[12px] text-navy-500">{r.referenceNumber}</span>
                          <ModeTag mode={r.mode} />
                          {r.urgent && <UrgentTag />}
                        </div>
                        <p className="mt-1 truncate text-sm font-semibold text-ink">{r.subject}</p>
                        <p className="truncate text-xs text-ink-muted">
                          {tab === "MINE" ? `With ${r.host.name}` : `${r.requester.name}${r.requester.designation ? ` · ${r.requester.designation}` : ""}${office ? ` → ${r.host.name}` : ""}`} · {APPOINTMENT_PURPOSE_LABEL[r.purpose as AppointmentPurpose]}
                        </p>
                        <p className="mt-0.5 text-xs text-ink-subtle sm:hidden">{meetingWhen(slotOf(r), r.durationMinutes)}</p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-2">
                          <AppointmentStatusBadge status={r.status} size="sm" />
                          <PlaceLine location={r.location} />
                        </div>
                      </div>
                      <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-ink-subtle" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {tab !== "INBOX" && list.hasNextPage && (
              <div className="border-t border-line p-3 text-center">
                <button className="btn-secondary" onClick={() => list.fetchNextPage()} disabled={list.isFetchingNextPage}>
                  {list.isFetchingNextPage && <Loader2 className="h-4 w-4 animate-spin" />} Load more
                </button>
              </div>
            )}
          </div>
        </>
      )}

      <RequestAppointmentModal open={newOpen} onClose={closeNew} />
    </div>
  );
}
