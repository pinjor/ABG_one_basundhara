/** Building blocks shared by the notice board pages. */
import { useQuery } from "@tanstack/react-query";
import { Archive, BadgeCheck, Building2, CircleCheck, Cpu, Crown, FileEdit, Hourglass, Landmark, Pin, ShieldCheck, Siren, Users, type LucideIcon } from "lucide-react";
import {
  NOTICE_CATEGORY_LABEL,
  NOTICE_CHANNEL_LABEL,
  NOTICE_STATUS_LABEL,
  NOTICE_STATUS_TONE,
  NoticeChannel,
  NoticeStatus,
  noticeParagraphs,
  type NoticeCategory,
} from "@abg-dispatch/shared";
import { ApiError, api, request } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { Pill, cx } from "../../components/ui";
import type { DirectoryBranch, NoticeCounters } from "./types";

export const CHANNEL_ICON: Record<NoticeChannel, LucideIcon> = {
  CHAIRMAN: Crown,
  MANAGING_DIRECTOR: Landmark,
  HR: Users,
  ADMINISTRATION: Building2,
  COMPLIANCE: ShieldCheck,
  IT: Cpu,
};

/** Executive channels read as the most senior voice: navy on platinum. */
const CHANNEL_CLASS: Record<NoticeChannel, string> = {
  CHAIRMAN: "bg-navy text-platinum-bright ring-navy",
  MANAGING_DIRECTOR: "bg-navy-700 text-platinum-bright ring-navy-700",
  HR: "bg-active-soft text-active ring-active/15",
  ADMINISTRATION: "bg-platinum-bright text-navy-500 ring-line-strong",
  COMPLIANCE: "bg-success-soft text-success ring-success/15",
  IT: "bg-neutral-soft text-neutral ring-neutral/20",
};

export function ChannelBadge({ channel, size = "md" }: { channel: string; size?: "sm" | "md" }) {
  const c = channel as NoticeChannel;
  const Icon = CHANNEL_ICON[c] ?? Building2;
  return (
    <span className={cx("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full font-semibold ring-1 ring-inset", CHANNEL_CLASS[c] ?? CHANNEL_CLASS.ADMINISTRATION, size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs")}>
      <Icon className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} aria-hidden />
      {NOTICE_CHANNEL_LABEL[c] ?? channel}
    </span>
  );
}

/** The urgent highlight: solid red with an icon, never colour alone. */
export function UrgentBadge({ size = "md" }: { size?: "sm" | "md" }) {
  return (
    <span className={cx("inline-flex items-center gap-1 whitespace-nowrap rounded-md bg-danger font-bold uppercase tracking-wide text-white shadow-[0_2px_8px_rgba(201,60,60,0.35)]", size === "sm" ? "px-1.5 py-0.5 text-[10.5px]" : "px-2 py-1 text-[11px]")}>
      <Siren className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} aria-hidden /> Urgent
    </span>
  );
}

export function PinnedTag() {
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-md bg-pending-soft px-1.5 py-0.5 text-[11px] font-semibold text-pending" title="Pinned to the top of the board">
      <Pin className="h-3 w-3 fill-current" aria-hidden /> Pinned
    </span>
  );
}

export function CategoryTag({ category }: { category: string }) {
  return <span className="text-xs font-medium text-ink-muted">{NOTICE_CATEGORY_LABEL[category as NoticeCategory] ?? category}</span>;
}

const STATUS_ICON: Record<NoticeStatus, LucideIcon> = { DRAFT: FileEdit, PUBLISHED: CircleCheck, ARCHIVED: Archive };

export function NoticeStatusBadge({ status }: { status: string }) {
  const s = status as NoticeStatus;
  const Icon = STATUS_ICON[s] ?? FileEdit;
  return (
    <Pill tone={NOTICE_STATUS_TONE[s] ?? "neutral"}>
      <Icon className="h-3 w-3" aria-hidden /> {NOTICE_STATUS_LABEL[s] ?? status}
    </Pill>
  );
}

/** What the reader still owes: acknowledged, or acknowledgement needed. */
export function ReaderState({ acknowledged, awaiting }: { acknowledged: boolean; awaiting: boolean }) {
  if (acknowledged)
    return (
      <Pill tone="success">
        <BadgeCheck className="h-3 w-3" aria-hidden /> Acknowledged
      </Pill>
    );
  if (awaiting)
    return (
      <Pill tone="pending">
        <Hourglass className="h-3 w-3" aria-hidden /> Acknowledgement needed
      </Pill>
    );
  return null;
}

/** "184 / 240 acknowledged" with a progress bar; "opened" when no acknowledgement is asked. */
export function AckCounter({ counters, requiresAcknowledgement, compact = false }: { counters: NoticeCounters; requiresAcknowledgement: boolean; compact?: boolean }) {
  const done = requiresAcknowledgement ? counters.acknowledgedCount : counters.readCount;
  const pct = (requiresAcknowledgement ? counters.acknowledgedPct : counters.readPct) ?? 0;
  const verb = requiresAcknowledgement ? "acknowledged" : "opened";
  const tone = requiresAcknowledgement ? (pct >= 80 ? "bg-success" : pct >= 40 ? "bg-active" : "bg-pending") : "bg-active";
  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-2">
        <p className={cx("tabular font-semibold text-ink", compact ? "text-[13px]" : "text-sm")}>
          <span className="font-display text-navy">{done.toLocaleString("en")}</span>
          <span className="text-ink-subtle"> / {counters.audienceSize.toLocaleString("en")}</span> <span className="font-medium text-ink-muted">{verb}</span>
        </p>
        <span className="tabular text-xs font-bold text-navy-500">{counters.audienceSize ? `${pct}%` : "—"}</span>
      </div>
      <div
        className="mt-1.5 h-2 overflow-hidden rounded-full bg-platinum-bright"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label={`${done} of ${counters.audienceSize} ${verb}`}
      >
        <div className={cx("h-full rounded-full transition-[width] duration-500", tone)} style={{ width: `${pct}%` }} />
      </div>
      {requiresAcknowledgement && !compact && (
        <p className="mt-1.5 text-[11px] text-ink-subtle">
          {counters.readCount.toLocaleString("en")} opened · {(counters.audienceSize - counters.acknowledgedCount).toLocaleString("en")} still to acknowledge
        </p>
      )}
    </div>
  );
}

/** The notice text as the author wrote it: blank lines make paragraphs, single line breaks are kept. */
export function NoticeBody({ body, className }: { body: string; className?: string }) {
  const paragraphs = noticeParagraphs(body);
  return (
    <div className={cx("space-y-4 text-[15px] leading-[1.7] text-ink", className)}>
      {paragraphs.map((p, i) => (
        <p key={i} className="whitespace-pre-line break-words">
          {p}
        </p>
      ))}
    </div>
  );
}

export function fileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** Asia/Dhaka is UTC+6 all year: convert between an ISO instant and a datetime-local value read as Dhaka time. */
export function toDhakaInput(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(new Date(iso).getTime() + 6 * 3_600_000).toISOString().slice(0, 16);
}

export function fromDhakaInput(value: string): string | null {
  if (!value) return null;
  const d = new Date(`${value}:00+06:00`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** True when the file starts with the PDF signature (the server checks again). */
export async function looksLikePdf(file: File): Promise<boolean> {
  const head = new Uint8Array(await file.slice(0, 5).arrayBuffer());
  return String.fromCharCode(...head) === "%PDF-";
}

/**
 * Multipart request with the bearer token and an Idempotency-Key. If the
 * access token has expired, a cheap authenticated call refreshes it and the
 * form is sent once more.
 */
export async function sendForm<T = unknown>(path: string, form: () => FormData, idempotencyKey?: string): Promise<T> {
  const send = () => {
    const token = useAuth.getState().accessToken;
    const headers: Record<string, string> = { accept: "application/json" };
    if (token) headers.authorization = `Bearer ${token}`;
    if (idempotencyKey) headers["idempotency-key"] = idempotencyKey;
    return fetch(`/api${path}`, { method: "POST", headers, body: form() });
  };
  let res: Response;
  try {
    res = await send();
    if (res.status === 401) {
      await request("GET", "/auth/me").catch(() => undefined);
      res = await send();
    }
  } catch {
    throw new ApiError(0, "NETWORK", "Can't reach the ABG ONE server. Check your connection.");
  }
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const message = Array.isArray(json?.message) ? json.message.join("\n") : (json?.message ?? `Request failed (${res.status})`);
    throw new ApiError(res.status, json?.code ?? "HTTP", res.status === 413 ? "The PDF must be 15 MB or smaller." : message, json?.details);
  }
  return json as T;
}

/** Every active office, for the audience picker (open to every signed-in user). */
export const useOffices = () => useQuery({ queryKey: ["directory", "branches"], queryFn: () => api.get<DirectoryBranch[]>("/directory/branches"), staleTime: 10 * 60_000 });

export const CHANNEL_FILTERS: { value: string; label: string }[] = [{ value: "", label: "All" }, ...Object.values(NoticeChannel).map((c) => ({ value: c, label: NOTICE_CHANNEL_LABEL[c] }))];
