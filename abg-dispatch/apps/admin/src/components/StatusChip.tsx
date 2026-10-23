import { Ban, CheckCircle2, CircleDashed, Hourglass, XCircle, type LucideIcon } from "lucide-react";
import type { StatusTone } from "@abg-dispatch/shared";
import { stamp, when } from "../lib/format";
import { cx } from "./ui";

export const TONE_CLASS: Record<StatusTone, string> = {
  active: "bg-active-soft text-active ring-active/15",
  pending: "bg-pending-soft text-pending ring-pending/20",
  success: "bg-success-soft text-success ring-success/15",
  danger: "bg-danger-soft text-danger ring-danger/15",
  neutral: "bg-neutral-soft text-neutral ring-neutral/15",
};

export const TONE_BAR: Record<StatusTone, string> = { pending: "bg-pending", active: "bg-active", success: "bg-success", neutral: "bg-neutral", danger: "bg-danger" };

/** Status is never colour alone: an icon and the shared label. */
export function StatusChip({ label, tone, icon: Icon = CircleDashed, size = "md" }: { label: string; tone: StatusTone; icon?: LucideIcon; size?: "sm" | "md" }) {
  return (
    <span className={cx("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full font-semibold ring-1 ring-inset", TONE_CLASS[tone], size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs")}>
      <Icon className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} aria-hidden />
      {label}
    </span>
  );
}

export interface ProgressStage {
  key: string;
  label: string;
  state: string;
  at: string | null;
  by: string | null;
  note?: string | null;
  waitingFor: string | null;
}

function caption(s: ProgressStage, endedBy: string): string {
  switch (s.state) {
    case "done":
      return [s.by, s.at ? when(s.at) : null].filter(Boolean).join(" · ") || "Done";
    case "current":
      return s.waitingFor ? `Waiting for ${s.waitingFor}` : s.at ? `Since ${when(s.at)}` : "In progress";
    case "rejected":
      return `Not approved${s.by ? ` by ${s.by}` : ""}`;
    case "cancelled":
      return `Cancelled${s.by ? ` by ${s.by}` : ` by the ${endedBy}`}`;
    case "skipped":
      return "Not reached";
    default:
      return s.waitingFor ?? "";
  }
}

/** An approval chain: horizontal on wide screens, a vertical list on phones. */
export function ProgressSteps({ stages, titles = {}, icons = {}, endedBy = "applicant" }: { stages: ProgressStage[]; titles?: Record<string, string>; icons?: Record<string, LucideIcon>; endedBy?: string }) {
  const dot = (s: ProgressStage) => {
    const Icon = s.state === "rejected" ? XCircle : s.state === "cancelled" ? Ban : s.state === "current" ? Hourglass : s.state === "done" ? (icons[s.key] ?? CheckCircle2) : (icons[s.key] ?? CircleDashed);
    return (
      <span
        className={cx(
          "relative z-10 grid h-9 w-9 shrink-0 place-items-center rounded-full border-2",
          s.state === "done" && "border-navy bg-navy text-white",
          s.state === "current" && "border-pending bg-pending-soft text-pending ring-4 ring-pending/10",
          s.state === "rejected" && "border-danger bg-danger text-white",
          s.state === "cancelled" && "border-neutral bg-neutral text-white",
          (s.state === "upcoming" || s.state === "skipped") && "border-line-strong bg-white text-ink-subtle",
        )}
        aria-hidden
      >
        <Icon className="h-4 w-4" />
      </span>
    );
  };
  const title = (s: ProgressStage) => titles[s.key] ?? s.label;
  const muted = (s: ProgressStage) => s.state === "upcoming" || s.state === "skipped";
  return (
    <>
      <ol className="hidden md:grid" style={{ gridTemplateColumns: `repeat(${stages.length}, minmax(0, 1fr))` }} aria-label="Progress">
        {stages.map((s, i) => (
          <li key={s.key} className="relative flex flex-col items-center px-1 text-center" aria-label={`${title(s)}: ${caption(s, endedBy)}`}>
            {i > 0 && <span className={cx("absolute right-1/2 top-[17px] h-[2px] w-full", muted(s) ? "bg-line" : "bg-navy")} aria-hidden />}
            {dot(s)}
            <span className={cx("mt-2 text-xs font-bold", muted(s) ? "text-ink-subtle" : s.state === "rejected" ? "text-danger" : "text-navy")}>{title(s)}</span>
            <span className={cx("mt-0.5 line-clamp-2 text-[11px] leading-snug", s.state === "current" ? "font-semibold text-pending" : "text-ink-subtle")}>{caption(s, endedBy)}</span>
          </li>
        ))}
      </ol>
      <ol className="md:hidden" aria-label="Progress">
        {stages.map((s, i) => (
          <li key={s.key} className="relative flex gap-3 pb-4 last:pb-0" aria-label={`${title(s)}: ${caption(s, endedBy)}`}>
            {i < stages.length - 1 && <span className={cx("absolute left-[17px] top-9 h-[calc(100%-28px)] w-[2px]", muted(stages[i + 1]) ? "bg-line" : "bg-navy")} aria-hidden />}
            {dot(s)}
            <div className="min-w-0 pt-1.5">
              <p className={cx("text-sm font-bold", muted(s) ? "text-ink-subtle" : s.state === "rejected" ? "text-danger" : "text-navy")}>{title(s)}</p>
              <p className={cx("text-xs", s.state === "current" ? "font-semibold text-pending" : "text-ink-subtle")}>{caption(s, endedBy)}</p>
            </div>
          </li>
        ))}
      </ol>
    </>
  );
}

export interface HistoryEntry {
  id: string;
  icon: LucideIcon;
  tone: string;
  text: string;
  at: string;
  note?: string | null;
}

/** The append-only history of a record. */
export function HistoryList({ entries }: { entries: HistoryEntry[] }) {
  return (
    <ol>
      {entries.map((e, idx) => (
        <li key={e.id} className="relative flex gap-3 pb-5 last:pb-0">
          {idx < entries.length - 1 && <span className="absolute left-[15px] top-8 h-[calc(100%-24px)] w-px bg-line" aria-hidden />}
          <span className={cx("relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full", e.tone)}>
            <e.icon className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0 flex-1 pt-1">
            <p className="text-sm font-medium text-ink">{e.text}</p>
            <p className="text-xs text-ink-subtle">{stamp(e.at)}</p>
            {e.note && <p className="mt-1.5 whitespace-pre-line rounded-lg bg-surface px-3 py-2 text-sm text-ink">{e.note}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}

/** A row of tabs that sets ?tab= (the first tab clears it). */
export function TabBar<T extends string>({ value, items, onChange, label }: { value: T; items: { value: T; label: string; count?: number; urgent?: boolean }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="-mx-1 flex gap-1 overflow-x-auto pb-1" role="tablist" aria-label={label}>
      {items.map((t) => (
        <button
          key={t.value}
          role="tab"
          aria-selected={value === t.value}
          onClick={() => onChange(t.value)}
          className={cx("inline-flex h-9 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition", value === t.value ? "bg-navy text-white" : "text-ink-muted hover:bg-surface hover:text-navy")}
        >
          {t.label}
          {t.count !== undefined && (
            <span className={cx("tabular rounded-md px-1.5 text-[11px]", value === t.value ? "bg-white/15" : t.urgent && t.count > 0 ? "bg-pending text-white" : "bg-platinum-bright text-navy-500")}>{t.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}
