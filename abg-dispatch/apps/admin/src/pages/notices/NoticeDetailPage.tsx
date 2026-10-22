import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, ArrowLeft, BadgeCheck, CalendarClock, Download, Eye, FileText, Hourglass, Loader2, MailOpen, PenLine, Search, Send, Siren, Trash2, UserRound, Users, X } from "lucide-react";
import { NOTICE_CHANNEL_LABEL, NoticeAction, NoticeAudience, NoticeReceiptState, NoticeStatus, type NoticeChannel } from "@abg-dispatch/shared";
import { api, qs } from "../../lib/api";
import { stamp, when } from "../../lib/format";
import { Card, Empty, ErrorNote, KeyValue, Modal, Spinner, cx } from "../../components/ui";
import { toast } from "../../components/toast";
import { AckCounter, CategoryTag, ChannelBadge, NoticeBody, NoticeStatusBadge, PinnedTag, UrgentBadge, fileSize } from "./parts";
import { NoticeFormModal } from "./NoticeForm";
import { PdfPreviewModal } from "./PdfPreview";
import type { Notice, ReceiptPage } from "./types";

type Confirm = "PUBLISH" | "ARCHIVE" | "DISCARD" | "ACKNOWLEDGE";

function audienceLabel(n: Notice): string {
  return n.audience === NoticeAudience.ALL ? "Everyone in the group" : n.branches.map((b) => b.name).join(", ") || "No offices";
}

/** The notice as a letter: letterhead, title, text, signature and the attached PDF. */
function Letterhead({ notice: n, onPreview, previewing }: { notice: Notice; onPreview: () => void; previewing: boolean }) {
  const [signer, ...rest] = (n.signedBy ?? n.author.name).split(",");
  return (
    <article className={cx("card overflow-hidden", n.urgent && "border-danger/40")} aria-labelledby="notice-title">
      <header className="flex flex-wrap items-center justify-between gap-4 bg-hero px-5 py-4 sm:px-8">
        <img src="/brand/abg-logo-light.png" alt="Anvir Bashundhara Group" className="h-10 w-auto sm:h-12" />
        <div className="text-right">
          <p className="mono text-[13px] text-platinum-bright">{n.referenceNumber}</p>
          <p className="text-[11px] text-platinum-deep">{n.publishedAt ? stamp(n.publishedAt) : "Not published yet"}</p>
        </div>
      </header>
      {n.urgent && (
        <div className="flex items-center gap-2 bg-danger px-5 py-2 text-sm font-bold uppercase tracking-wide text-white sm:px-8" role="note">
          <Siren className="h-4 w-4" aria-hidden /> Urgent notice — read it now
        </div>
      )}
      <div className="px-5 py-6 sm:px-8 sm:py-8">
        <div className="flex flex-wrap items-center gap-2">
          <ChannelBadge channel={n.channel} />
          <CategoryTag category={n.category} />
          {n.urgent && <UrgentBadge size="sm" />}
          {n.pinned && <PinnedTag />}
          {n.status !== NoticeStatus.PUBLISHED && <NoticeStatusBadge status={n.status} />}
        </div>
        <p className="overline mt-5">From the office of the {NOTICE_CHANNEL_LABEL[n.channel as NoticeChannel] ?? n.channel}</p>
        <h1 id="notice-title" className="mt-1.5 break-words font-display text-[26px] font-extrabold leading-tight tracking-tight text-navy sm:text-[30px]">
          {n.title}
        </h1>
        <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-muted">
          <span className="inline-flex items-center gap-1.5">
            <Users className="h-4 w-4 text-ink-subtle" aria-hidden /> To: {audienceLabel(n)}
          </span>
          {n.expiresAt && (
            <span className="inline-flex items-center gap-1.5">
              <CalendarClock className="h-4 w-4 text-ink-subtle" aria-hidden /> {n.expired ? "Left the board" : "On the board until"} {stamp(n.expiresAt)}
            </span>
          )}
        </p>
        <div className="my-6 h-px bg-gradient-to-r from-line-strong via-line to-transparent" />
        <NoticeBody body={n.body} />
        <div className="mt-8 border-l-2 border-navy pl-4">
          <p className="font-display text-base font-bold text-navy">{signer.trim()}</p>
          {rest.length > 0 && <p className="text-sm text-ink-muted">{rest.join(",").trim()}</p>}
          <p className="text-xs text-ink-subtle">Anvir Bashundhara Group</p>
        </div>
        {n.attachment && (
          <div className="mt-8 flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3.5">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-danger-soft text-danger">
              <FileText className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink" title={n.attachment.name}>
                {n.attachment.name}
              </p>
              <p className="text-xs text-ink-muted">PDF · {fileSize(n.attachment.sizeBytes)}</p>
            </div>
            <div className="flex gap-2">
              <a href={n.attachment.url} download={n.attachment.name} className="btn-secondary h-9 px-3">
                <Download className="h-4 w-4" /> <span className="hidden sm:inline">Download</span>
              </a>
              <button className="btn-primary h-9 px-3" onClick={onPreview} disabled={previewing}>
                {previewing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />} Preview
              </button>
            </div>
          </div>
        )}
      </div>
    </article>
  );
}

/** Who has acknowledged, who has only opened it, and who still has to. */
function Receipts({ notice }: { notice: Notice }) {
  const ack = notice.requiresAcknowledgement;
  const [state, setState] = useState<string>(ack ? NoticeReceiptState.PENDING : NoticeReceiptState.READ);
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const list = useInfiniteQuery({
    queryKey: ["notice", notice.id, "receipts", state, q],
    queryFn: ({ pageParam }) => api.get<ReceiptPage>(`/admin/notices/${notice.id}/receipts${qs({ state, q, cursor: pageParam, limit: 25 })}`),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
  const counts = list.data?.pages[0]?.counts;
  const rows = list.data?.pages.flatMap((p) => p.items) ?? [];
  const tabs = ack
    ? [
        { value: NoticeReceiptState.ACKNOWLEDGED, label: "Acknowledged", count: counts?.acknowledged, icon: BadgeCheck },
        { value: NoticeReceiptState.READ, label: "Read, not acknowledged", count: counts?.read, icon: MailOpen },
        { value: NoticeReceiptState.PENDING, label: "Pending", count: counts?.pending, icon: Hourglass },
      ]
    : [
        { value: NoticeReceiptState.READ, label: "Opened", count: counts?.read, icon: MailOpen },
        { value: NoticeReceiptState.PENDING, label: "Not opened yet", count: counts?.pending, icon: Hourglass },
      ];

  return (
    <Card title="Who has read it" action={counts && <span className="tabular text-xs text-ink-subtle">{counts.audience.toLocaleString("en")} people in the audience</span>} padded={false}>
      <div className="space-y-3 border-b border-line p-4">
        <div className="-mx-1 flex gap-1 overflow-x-auto pb-1" role="tablist" aria-label="Receipt state">
          {tabs.map((t) => (
            <button
              key={t.value}
              role="tab"
              aria-selected={state === t.value}
              onClick={() => setState(t.value)}
              className={cx("inline-flex h-9 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition", state === t.value ? "bg-navy text-white" : "text-ink-muted hover:bg-surface hover:text-navy")}
            >
              <t.icon className="h-3.5 w-3.5" aria-hidden /> {t.label}
              {t.count !== undefined && <span className={cx("tabular rounded-md px-1.5 text-[11px]", state === t.value ? "bg-white/15" : "bg-platinum-bright text-navy-500")}>{t.count}</span>}
            </button>
          ))}
        </div>
        <form
          className="relative"
          onSubmit={(e) => {
            e.preventDefault();
            setQ(search.trim());
          }}
        >
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subtle" aria-hidden />
          <input className="input pl-9" placeholder="Name, employee ID, designation or office…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search people" />
        </form>
      </div>
      <ErrorNote error={list.error} />
      {list.isLoading ? (
        <Spinner label="Loading people" />
      ) : rows.length === 0 ? (
        <Empty icon={state === NoticeReceiptState.PENDING ? BadgeCheck : Users} title={state === NoticeReceiptState.PENDING ? "Nobody is pending" : "Nobody here yet"} hint={q ? "No one matches that search." : undefined} />
      ) : (
        <ul className="divide-y divide-line">
          {rows.map((r) => (
            <li key={r.userId} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-platinum-bright text-navy-500">
                <UserRound className="h-4 w-4" aria-hidden />
              </span>
              <div className="min-w-0 flex-1 basis-[180px]">
                <p className="truncate text-sm font-semibold text-ink">
                  {r.name} {r.employeeCode && <span className="mono text-[11px] font-medium text-ink-subtle">{r.employeeCode}</span>}
                </p>
                <p className="truncate text-xs text-ink-muted">{[r.designation, r.department, r.office?.name].filter(Boolean).join(" · ") || "—"}</p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-x-4 gap-y-1 text-xs">
                <span className={cx("inline-flex items-center gap-1", r.readAt ? "text-ink-muted" : "text-ink-subtle")}>
                  <MailOpen className="h-3.5 w-3.5" aria-hidden /> {r.readAt ? `Opened ${when(r.readAt)}` : "Not opened"}
                </span>
                {ack && (
                  <span className={cx("inline-flex items-center gap-1 font-semibold", r.acknowledgedAt ? "text-success" : "text-pending")}>
                    {r.acknowledgedAt ? <BadgeCheck className="h-3.5 w-3.5" aria-hidden /> : <Hourglass className="h-3.5 w-3.5" aria-hidden />}
                    {r.acknowledgedAt ? `Acknowledged ${when(r.acknowledgedAt)}` : "Not acknowledged"}
                  </span>
                )}
              </div>
            </li>
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
    </Card>
  );
}

export function NoticeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [editing, setEditing] = useState(false);
  const [preview, setPreview] = useState<{ url: string; name: string; sizeBytes: number } | null>(null);
  const [opening, setOpening] = useState(false);

  const notice = useQuery({
    queryKey: ["notice", id],
    queryFn: () => api.get<Notice>(`/notices/${id}`),
    // Attachment links are signed for ten minutes; refresh well before that.
    refetchInterval: 5 * 60_000,
  });

  // Opening it marked it read: refresh the unread badges and the board.
  const loaded = !!notice.data;
  useEffect(() => {
    if (!loaded) return;
    void qc.invalidateQueries({ queryKey: ["notices"] });
  }, [loaded, id, qc]);

  const apply = (next: Notice) => {
    qc.setQueryData(["notice", id], next);
    void qc.invalidateQueries({ queryKey: ["notices"] });
    void qc.invalidateQueries({ queryKey: ["admin", "notices"] });
    void qc.invalidateQueries({ queryKey: ["notice", id, "receipts"] });
  };
  const closeConfirm = useCallback(() => setConfirm(null), []);
  const closeEditor = useCallback(() => setEditing(false), []);
  const closePreview = useCallback(() => setPreview(null), []);

  const act = useMutation({
    mutationFn: async (action: Confirm) => {
      if (action === "DISCARD") return api.delete<{ id: string; discarded: true }>(`/notices/${id}`);
      const path = action === "ACKNOWLEDGE" ? "acknowledge" : action === "PUBLISH" ? "publish" : "archive";
      return api.post<Notice>(`/notices/${id}/${path}`);
    },
    onSuccess: (result, action) => {
      setConfirm(null);
      if (action === "DISCARD") {
        toast.success("Draft discarded.");
        void qc.invalidateQueries({ queryKey: ["admin", "notices"] });
        navigate("/notices?view=DRAFT");
        return;
      }
      apply(result as Notice);
      toast.success(
        action === "ACKNOWLEDGE" ? "Thank you — your acknowledgement is recorded." : action === "PUBLISH" ? "Published — everyone in the audience has been notified." : "Archived and taken off the board.",
      );
    },
  });

  const openPreview = async () => {
    setOpening(true);
    try {
      // Always use a freshly signed link.
      const fresh = (await notice.refetch()).data;
      if (fresh?.attachment) setPreview({ url: fresh.attachment.url, name: fresh.attachment.name, sizeBytes: fresh.attachment.sizeBytes });
    } finally {
      setOpening(false);
    }
  };

  if (notice.isLoading) return <Spinner label="Loading notice" />;
  if (notice.error || !notice.data) return <ErrorNote error={notice.error ?? new Error("Notice not found.")} />;
  const n = notice.data;
  const actions = new Set(n.viewer.actions);
  const reader = n.viewer.inAudience && !n.viewer.isAuthor && n.status === NoticeStatus.PUBLISHED;

  const confirmCopy: Record<Confirm, { title: string; body: string; label: string; icon: typeof Send; danger?: boolean }> = {
    ACKNOWLEDGE: { title: "Acknowledge this notice", body: `You confirm that you have read and understood “${n.title}”. Your name and the time are recorded for the sender.`, label: "I have read and understood", icon: BadgeCheck },
    PUBLISH: {
      title: `Publish ${n.referenceNumber}`,
      body: `It goes on the board now and ${n.counters ? `${n.counters.audienceSize.toLocaleString("en")} people` : "everyone in the audience"} will be notified. After publishing, only pinning, urgency and the expiry can change.`,
      label: "Publish now",
      icon: Send,
    },
    ARCHIVE: { title: `Archive ${n.referenceNumber}`, body: "It leaves everyone's board at once. You keep the notice and its acknowledgement report.", label: "Archive", icon: Archive, danger: true },
    DISCARD: { title: "Discard this draft", body: "The draft is deleted. Nobody has received it.", label: "Discard draft", icon: Trash2, danger: true },
  };
  const c = confirm ? confirmCopy[confirm] : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/notices" className="no-print inline-flex items-center gap-1.5 text-sm font-semibold text-ink-muted hover:text-navy">
          <ArrowLeft className="h-4 w-4" /> Notice board
        </Link>
        <div className="no-print flex flex-wrap gap-2">
          {actions.has(NoticeAction.DISCARD) && (
            <button className="btn-ghost text-danger" onClick={() => setConfirm("DISCARD")}>
              <Trash2 className="h-4 w-4" /> Discard
            </button>
          )}
          {actions.has(NoticeAction.ARCHIVE) && (
            <button className="btn-secondary" onClick={() => setConfirm("ARCHIVE")}>
              <Archive className="h-4 w-4" /> Archive
            </button>
          )}
          {actions.has(NoticeAction.EDIT) && (
            <button className="btn-secondary" onClick={() => setEditing(true)}>
              <PenLine className="h-4 w-4" /> {n.status === NoticeStatus.PUBLISHED ? "Pin, urgency & expiry" : "Edit draft"}
            </button>
          )}
          {actions.has(NoticeAction.PUBLISH) && (
            <button className="btn-primary" onClick={() => setConfirm("PUBLISH")}>
              <Send className="h-4 w-4" /> Publish
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-6">
          <Letterhead notice={n} onPreview={openPreview} previewing={opening} />
          {actions.has(NoticeAction.VIEW_RECEIPTS) && <Receipts notice={n} />}
        </div>

        <div className="space-y-6">
          {reader && n.requiresAcknowledgement && (
            <section className={cx("card overflow-hidden", n.acknowledged ? "border-success/30" : "border-pending/40")}>
              <div className={cx("h-1", n.acknowledged ? "bg-success" : "bg-pending")} />
              <div className="p-5">
                {n.acknowledged ? (
                  <div className="flex items-start gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-success-soft text-success">
                      <BadgeCheck className="h-5 w-5" aria-hidden />
                    </span>
                    <div>
                      <p className="font-display font-bold text-navy">You have acknowledged this notice</p>
                      <p className="text-sm text-ink-muted">{stamp(n.receipt?.acknowledgedAt)}</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="font-display font-bold text-navy">The sender asks you to acknowledge this notice</p>
                    <p className="mt-1 text-sm text-ink-muted">Read it in full{n.attachment ? ", including the attached PDF," : ""} and confirm.</p>
                    {actions.has(NoticeAction.ACKNOWLEDGE) ? (
                      <button className="btn-primary mt-4 w-full" onClick={() => setConfirm("ACKNOWLEDGE")}>
                        <BadgeCheck className="h-4 w-4" /> I have read and understood
                      </button>
                    ) : (
                      <p className="mt-3 text-sm text-ink-subtle">This notice has expired and can no longer be acknowledged.</p>
                    )}
                  </>
                )}
              </div>
            </section>
          )}
          {reader && !n.requiresAcknowledgement && (
            <Card>
              <p className="flex items-center gap-2 text-sm text-ink-muted">
                <MailOpen className="h-4 w-4 text-success" aria-hidden /> For your information — no acknowledgement needed. {n.receipt ? `Opened ${when(n.receipt.readAt)}.` : ""}
              </p>
            </Card>
          )}

          {n.counters && n.status !== NoticeStatus.DRAFT && (
            <Card title={n.requiresAcknowledgement ? "Acknowledgements" : "Readership"}>
              <AckCounter counters={n.counters} requiresAcknowledgement={n.requiresAcknowledgement} />
            </Card>
          )}
          {n.counters && n.status === NoticeStatus.DRAFT && (
            <Card title="Not sent yet">
              <p className="text-sm text-ink-muted">
                When published, this notice reaches <span className="tabular font-semibold text-ink">{n.counters.audienceSize.toLocaleString("en")}</span> people and each of them gets a notification on their phone.
              </p>
            </Card>
          )}

          <Card title="Details">
            <dl className="grid grid-cols-1 gap-4">
              <KeyValue label="Reference">
                <span className="mono">{n.referenceNumber}</span>
              </KeyValue>
              <KeyValue label="Status">
                <NoticeStatusBadge status={n.status} />
              </KeyValue>
              <KeyValue label="From">{n.channelLabel}</KeyValue>
              <KeyValue label="Category">{n.categoryLabel}</KeyValue>
              <KeyValue label="Audience">{audienceLabel(n)}</KeyValue>
              <KeyValue label="Acknowledgement">{n.requiresAcknowledgement ? "Required" : "Not required"}</KeyValue>
              <KeyValue label="Published">{n.publishedAt ? stamp(n.publishedAt) : "Not yet"}</KeyValue>
              {n.expiresAt && <KeyValue label={n.expired ? "Expired" : "Expires"}>{stamp(n.expiresAt)}</KeyValue>}
              {n.archivedAt && <KeyValue label="Archived">{stamp(n.archivedAt)}</KeyValue>}
              <KeyValue label="Posted by">
                {n.author.name}
                {n.author.designation && <span className="block text-xs font-normal text-ink-muted">{n.author.designation}</span>}
              </KeyValue>
            </dl>
          </Card>
        </div>
      </div>

      <Modal
        open={!!c}
        onClose={closeConfirm}
        title={c?.title ?? ""}
        footer={
          c && (
            <>
              <button className="btn-ghost" onClick={closeConfirm} disabled={act.isPending}>
                <X className="h-4 w-4" /> Cancel
              </button>
              <button className={c.danger ? "btn-danger" : "btn-primary"} data-autofocus onClick={() => act.mutate(confirm!)} disabled={act.isPending}>
                {act.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <c.icon className="h-4 w-4" />} {c.label}
              </button>
            </>
          )
        }
      >
        <p className="text-sm leading-relaxed text-ink">{c?.body}</p>
        <ErrorNote error={act.error} />
      </Modal>

      <NoticeFormModal open={editing} notice={n} onClose={closeEditor} onSaved={(next) => (apply(next), setEditing(false))} />
      {preview && <PdfPreviewModal url={preview.url} name={preview.name} sizeBytes={preview.sizeBytes} reference={n.referenceNumber} onClose={closePreview} />}
    </div>
  );
}
