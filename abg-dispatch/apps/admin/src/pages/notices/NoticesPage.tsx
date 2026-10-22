import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { BellRing, Clock3, Loader2, MailOpen, Megaphone, Newspaper, Paperclip, Plus, Search, Siren, Users, X } from "lucide-react";
import { Capability, NoticeAudience, NoticeStatus } from "@abg-dispatch/shared";
import { api, qs } from "../../lib/api";
import { ago, when } from "../../lib/format";
import { useAuth } from "../../lib/auth";
import { Empty, ErrorNote, PageHeader, Spinner, cx } from "../../components/ui";
import { AckCounter, CHANNEL_FILTERS, CHANNEL_ICON, CategoryTag, ChannelBadge, NoticeStatusBadge, PinnedTag, ReaderState, UrgentBadge } from "./parts";
import { NoticeFormModal } from "./NoticeForm";
import type { AdminNoticePage, AdminNoticeRow, Notice, NoticeRow, Page, UnreadCount } from "./types";

type View = "BOARD" | "PUBLISHED" | "DRAFT" | "ARCHIVED";

interface Summary {
  published: number;
  urgentActive: number;
  drafts: number;
  avgAcknowledgedPct: number | null;
}

function Stat({ label, value, hint, tone, icon: Icon }: { label: string; value: string | number; hint?: string; tone?: "danger" | "active" | "success" | "pending"; icon: typeof BellRing }) {
  const color = tone === "danger" ? "text-danger" : tone === "active" ? "text-active" : tone === "success" ? "text-success" : tone === "pending" ? "text-pending" : "text-navy";
  return (
    <div className="card flex items-start gap-3 px-4 py-3.5">
      <span className={cx("mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-platinum-bright", color)}>
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium text-ink-muted">{label}</p>
        <p className={cx("tabular font-display text-2xl font-extrabold leading-tight", color)}>{value}</p>
        {hint && <p className="text-[11px] text-ink-subtle">{hint}</p>}
      </div>
    </div>
  );
}

function audienceText(row: AdminNoticeRow): string {
  if (row.audience === NoticeAudience.ALL) return "Everyone";
  return row.branches.map((b) => b.code).join(", ") || "No offices";
}

/** One notice on the board. Urgent ones carry a strong red accent and badge. */
function NoticeCard({ row, admin }: { row: NoticeRow | AdminNoticeRow; admin?: boolean }) {
  const a = admin ? (row as AdminNoticeRow) : null;
  const unread = !admin && !row.read;
  const Icon = CHANNEL_ICON[row.channel as keyof typeof CHANNEL_ICON] ?? Megaphone;
  return (
    <Link
      to={`/notices/${row.id}`}
      className={cx(
        "card group relative block min-w-0 overflow-hidden transition hover:-translate-y-px hover:shadow-raised focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-active",
        row.urgent && "border-danger/35 bg-gradient-to-br from-danger-soft via-white to-white",
      )}
    >
      {row.urgent ? <span className="absolute inset-y-0 left-0 w-1.5 bg-danger" aria-hidden /> : row.pinned ? <span className="absolute inset-y-0 left-0 w-1 bg-pending" aria-hidden /> : null}
      <div className="flex h-full flex-col gap-3 py-4 pl-5 pr-4 sm:py-5 sm:pl-6 sm:pr-5">
        <div className="flex flex-wrap items-center gap-2">
          <ChannelBadge channel={row.channel} size="sm" />
          <CategoryTag category={row.category} />
          <span className="ml-auto flex flex-wrap items-center gap-1.5">
            {row.urgent && <UrgentBadge size="sm" />}
            {row.pinned && <PinnedTag />}
            {a && a.status !== NoticeStatus.PUBLISHED && <NoticeStatusBadge status={a.status} />}
            {a?.expired && a.status === NoticeStatus.PUBLISHED && (
              <span className="inline-flex items-center gap-1 rounded-md bg-neutral-soft px-1.5 py-0.5 text-[11px] font-semibold text-neutral">
                <Clock3 className="h-3 w-3" aria-hidden /> Expired
              </span>
            )}
          </span>
        </div>
        <div className="min-w-0">
          <h3 className={cx("flex items-start gap-2 break-words font-display text-[17px] leading-snug text-navy group-hover:text-active", unread ? "font-extrabold" : "font-bold")}>
            {unread && (
              <span className="mt-[7px] h-2.5 w-2.5 shrink-0 rounded-full bg-active ring-4 ring-active-soft" aria-hidden />
            )}
            <span className="line-clamp-2">{row.title}</span>
          </h3>
          <p className="mt-1.5 line-clamp-3 break-words text-sm leading-relaxed text-ink-muted">{row.excerpt}</p>
        </div>
        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-subtle">
          <span className="inline-flex min-w-0 items-center gap-1.5 font-medium text-ink">
            <Icon className="h-3.5 w-3.5 shrink-0 text-navy-500" aria-hidden />
            <span className="truncate">{row.signedBy ?? "—"}</span>
          </span>
          <span className="mono text-[11px] text-navy-500">{row.referenceNumber}</span>
          <span>{a && a.status === NoticeStatus.DRAFT ? `Edited ${ago(a.updatedAt)}` : when(row.publishedAt)}</span>
          {row.hasAttachment && (
            <span className="inline-flex items-center gap-1 text-ink-muted">
              <Paperclip className="h-3 w-3" aria-hidden /> PDF
            </span>
          )}
          {a && (
            <span className="inline-flex items-center gap-1 text-ink-muted">
              <Users className="h-3 w-3" aria-hidden /> {audienceText(a)}
            </span>
          )}
          {unread && <span className="font-semibold text-active">New</span>}
        </div>
        {a ? (
          a.status === NoticeStatus.DRAFT ? (
            <p className="rounded-lg bg-surface px-3 py-2 text-xs text-ink-muted">
              Not sent yet · will reach <span className="tabular font-semibold text-ink">{a.counters.audienceSize.toLocaleString("en")}</span> people when published
            </p>
          ) : (
            <div className="rounded-xl border border-line bg-white/80 px-3 py-2.5">
              <AckCounter counters={a.counters} requiresAcknowledgement={a.requiresAcknowledgement} compact />
            </div>
          )
        ) : (
          (row.acknowledged || row.awaitingAcknowledgement) && (
            <div>
              <ReaderState acknowledged={row.acknowledged} awaiting={row.awaitingAcknowledgement} />
            </div>
          )
        )}
      </div>
    </Link>
  );
}

export function NoticesPage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const profile = useAuth((s) => s.profile);
  const caps = new Set(profile?.capabilities ?? []);
  const canPublish = caps.has(Capability.NOTICE_PUBLISH);
  const manager = caps.has(Capability.NOTICE_MANAGE);

  const requested = params.get("view") as View | null;
  const view: View = canPublish ? (requested && ["BOARD", "PUBLISHED", "DRAFT", "ARCHIVED"].includes(requested) ? requested : "PUBLISHED") : "BOARD";
  const channel = params.get("channel") ?? "";
  const q = params.get("q") ?? "";
  const unreadOnly = view === "BOARD" && params.get("unread") === "1";
  const composing = canPublish && params.get("new") === "1";
  const [search, setSearch] = useState(q);
  useEffect(() => setSearch(q), [q]);

  const set = useCallback(
    (patch: Record<string, string | undefined>) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [k, v] of Object.entries(patch)) (v ? next.set(k, v) : next.delete(k));
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );
  const closeComposer = useCallback(() => set({ new: undefined }), [set]);

  const board = useInfiniteQuery({
    queryKey: ["notices", "board", { channel, q, unreadOnly }],
    queryFn: ({ pageParam }) => api.get<Page<NoticeRow>>(`/notices${qs({ channel, q, unread: unreadOnly ? "true" : undefined, cursor: pageParam, limit: 20 })}`),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: view === "BOARD",
  });
  const admin = useInfiniteQuery({
    queryKey: ["admin", "notices", { view, channel, q }],
    queryFn: ({ pageParam }) => api.get<AdminNoticePage>(`/admin/notices${qs({ status: view, channel, q, cursor: pageParam, limit: 20 })}`),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: canPublish && view !== "BOARD",
  });
  const counts = useQuery({
    queryKey: ["admin", "notices", "counts", { channel, q }],
    queryFn: () => api.get<AdminNoticePage>(`/admin/notices${qs({ channel, q, limit: 1 })}`).then((r) => r.counts),
    enabled: canPublish,
  });
  const unread = useQuery({ queryKey: ["notices", "unread-count"], queryFn: () => api.get<UnreadCount>("/notices/unread-count"), refetchInterval: 60_000 });
  const summary = useQuery({ queryKey: ["admin", "notices", "summary"], queryFn: () => api.get<Summary>("/admin/notices/summary"), enabled: canPublish });

  const active = view === "BOARD" ? board : admin;
  const rows: (NoticeRow | AdminNoticeRow)[] = view === "BOARD" ? (board.data?.pages.flatMap((p) => p.items) ?? []) : (admin.data?.pages.flatMap((p) => p.items) ?? []);
  const u = unread.data;
  const s = summary.data;
  const filtered = !!(channel || q || unreadOnly);

  const onSaved = (n: Notice) => {
    void qc.invalidateQueries({ queryKey: ["notices"] });
    void qc.invalidateQueries({ queryKey: ["admin", "notices"] });
    closeComposer();
    navigate(`/notices/${n.id}`);
  };

  const tabs: { value: View; label: string; count?: number }[] = [
    { value: "PUBLISHED", label: manager ? "Published" : "My published", count: counts.data?.PUBLISHED },
    { value: "DRAFT", label: "Drafts", count: counts.data?.DRAFT },
    { value: "ARCHIVED", label: "Archived", count: counts.data?.ARCHIVED },
    { value: "BOARD", label: "My board", count: u?.unread || undefined },
  ];

  return (
    <div>
      <PageHeader
        overline="Governance"
        title="Official Notice Board"
        subtitle="Circulars and messages from the Chairman, the Managing Director, HR, administration, compliance and IT. Urgent notices come first; acknowledge the ones that ask for it."
        actions={
          canPublish && (
            <button className="btn-primary" onClick={() => set({ new: "1" })}>
              <Plus className="h-4 w-4" /> Post a notice
            </button>
          )
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {canPublish ? (
          <>
            <Stat icon={Newspaper} label={manager ? "On the board now" : "Your notices on the board"} value={s?.published ?? "—"} />
            <Stat icon={Siren} label="Urgent and live" value={s?.urgentActive ?? "—"} tone={s?.urgentActive ? "danger" : undefined} />
            <Stat icon={MailOpen} label="Average acknowledged" value={s?.avgAcknowledgedPct != null ? `${s.avgAcknowledgedPct}%` : "—"} hint="Across live notices that ask for it" tone="success" />
            <Stat icon={Clock3} label="Drafts" value={s?.drafts ?? "—"} hint="Saved, not sent" tone={s?.drafts ? "pending" : undefined} />
          </>
        ) : (
          <>
            <Stat icon={BellRing} label="Unread" value={u?.unread ?? "—"} tone={u?.unread ? "active" : undefined} />
            <Stat icon={MailOpen} label="Waiting for your acknowledgement" value={u?.toAcknowledge ?? "—"} tone={u?.toAcknowledge ? "pending" : undefined} />
            <Stat icon={Siren} label="Urgent, unread" value={u?.urgentUnread ?? "—"} tone={u?.urgentUnread ? "danger" : undefined} />
            <Stat icon={Newspaper} label="On the board" value={board.data?.pages[0] ? `${rows.length}${board.hasNextPage ? "+" : ""}` : "—"} />
          </>
        )}
      </div>

      <div className="card mb-4 space-y-3 p-3">
        {canPublish && (
          <div className="-mx-1 flex gap-1 overflow-x-auto pb-1" role="tablist" aria-label="Notice status">
            {tabs.map((t) => (
              <button
                key={t.value}
                role="tab"
                aria-selected={view === t.value}
                onClick={() => set({ view: t.value === "PUBLISHED" ? undefined : t.value, unread: undefined })}
                className={cx("inline-flex h-9 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition", view === t.value ? "bg-navy text-white" : "text-ink-muted hover:bg-surface hover:text-navy")}
              >
                {t.label}
                {t.count !== undefined && <span className={cx("tabular rounded-md px-1.5 text-[11px]", view === t.value ? "bg-white/15" : "bg-platinum-bright text-navy-500")}>{t.count}</span>}
              </button>
            ))}
          </div>
        )}
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1" role="group" aria-label="Channel">
          {CHANNEL_FILTERS.map((c) => {
            const on = channel === c.value;
            const Icon = c.value ? CHANNEL_ICON[c.value as keyof typeof CHANNEL_ICON] : Megaphone;
            return (
              <button
                key={c.value || "all"}
                aria-pressed={on}
                onClick={() => set({ channel: c.value || undefined })}
                className={cx(
                  "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-semibold transition",
                  on ? "border-navy bg-navy text-white shadow-card" : "border-line-strong bg-white text-navy hover:border-navy/40 hover:bg-surface",
                )}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden /> {c.label}
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <form
            className="relative min-w-0 flex-1 basis-[220px]"
            onSubmit={(e) => {
              e.preventDefault();
              set({ q: search.trim() || undefined });
            }}
          >
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subtle" aria-hidden />
            <input className="input pl-9" placeholder="Search title, text, signatory or reference…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search notices" />
          </form>
          {view === "BOARD" && (
            <button
              aria-pressed={unreadOnly}
              onClick={() => set({ unread: unreadOnly ? undefined : "1" })}
              className={cx("inline-flex h-10 items-center gap-1.5 rounded-xl border px-3 text-sm font-semibold transition", unreadOnly ? "border-active bg-active-soft text-active" : "border-line-strong bg-white text-navy hover:bg-surface")}
            >
              <BellRing className="h-4 w-4" aria-hidden /> Unread only
            </button>
          )}
          {filtered && (
            <button className="btn-ghost h-10" onClick={() => (set({ channel: undefined, q: undefined, unread: undefined }), setSearch(""))}>
              <X className="h-4 w-4" /> Clear
            </button>
          )}
        </div>
      </div>

      <ErrorNote error={active.error} />
      {active.isLoading ? (
        <div className="card">
          <Spinner label="Loading notices" />
        </div>
      ) : rows.length === 0 ? (
        <div className="card">
          <Empty
            icon={Newspaper}
            title={filtered ? "No notices match" : view === "DRAFT" ? "No drafts" : view === "ARCHIVED" ? "Nothing archived" : "The board is clear"}
            hint={filtered ? "Try another channel or clear the search." : view === "BOARD" ? "New notices for you will appear here, with urgent ones first." : canPublish ? "Post a notice to reach everyone, or only chosen offices." : undefined}
          />
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {rows.map((r) => (
            <NoticeCard key={r.id} row={r} admin={view !== "BOARD"} />
          ))}
        </div>
      )}
      {active.hasNextPage && (
        <div className="mt-4 text-center">
          <button className="btn-secondary" onClick={() => active.fetchNextPage()} disabled={active.isFetchingNextPage}>
            {active.isFetchingNextPage && <Loader2 className="h-4 w-4 animate-spin" />} Load more
          </button>
        </div>
      )}
      <p className="mt-3 text-xs text-ink-subtle">
        {view === "BOARD"
          ? "Pinned notices first, then urgent, then the newest. Opening a notice marks it read."
          : manager
            ? "Every notice in the group, with how many people have read and acknowledged it."
            : "The notices you have posted, with how many people have read and acknowledged them."}{" "}
        Times are Asia/Dhaka.
      </p>

      {canPublish && <NoticeFormModal open={composing} onClose={closeComposer} onSaved={onSaved} />}
    </div>
  );
}
