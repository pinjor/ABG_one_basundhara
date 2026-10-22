import {
  Ban,
  Bus,
  CarFront,
  CheckCircle2,
  CircleDashed,
  Flag,
  Globe,
  Hourglass,
  Landmark,
  MapPin,
  Plane,
  PlaneTakeoff,
  Ship,
  Stamp,
  TrainFront,
  TriangleAlert,
  UserCheck,
  Wallet,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { TOUR_STATUS_LABEL, TOUR_STATUS_TONE, TourStatus, type StatusTone } from "@abg-dispatch/shared";
import { when } from "../../lib/format";
import { cx } from "../../components/ui";
import type { PipelineStage } from "./types";

const TONE_CLASS: Record<StatusTone, string> = {
  active: "bg-active-soft text-active ring-active/15",
  pending: "bg-pending-soft text-pending ring-pending/20",
  success: "bg-success-soft text-success ring-success/15",
  danger: "bg-danger-soft text-danger ring-danger/15",
  neutral: "bg-neutral-soft text-neutral ring-neutral/15",
};

export const TONE_BAR: Record<StatusTone, string> = { pending: "bg-pending", active: "bg-active", success: "bg-success", neutral: "bg-neutral", danger: "bg-danger" };

const STATUS_ICON: Record<TourStatus, LucideIcon> = {
  PENDING_HOD: UserCheck,
  PENDING_VETTING: Wallet,
  PENDING_SANCTION: Stamp,
  APPROVED: CheckCircle2,
  ACTIVE: PlaneTakeoff,
  COMPLETED: Flag,
  REJECTED: XCircle,
  CANCELLED: Ban,
};

export function tourTone(status: string): StatusTone {
  return TOUR_STATUS_TONE[status as TourStatus] ?? "neutral";
}

/** Status is never colour alone: icon plus the shared label. */
export function TourStatusBadge({ status, size = "md" }: { status: string; size?: "sm" | "md" }) {
  const Icon = STATUS_ICON[status as TourStatus] ?? CircleDashed;
  return (
    <span className={cx("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full font-semibold ring-1 ring-inset", TONE_CLASS[tourTone(status)], size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs")}>
      <Icon className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} aria-hidden />
      {TOUR_STATUS_LABEL[status as TourStatus] ?? status}
    </span>
  );
}

export function TourTypeTag({ type }: { type: string }) {
  const foreign = type === "FOREIGN";
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide",
        foreign ? "bg-navy text-platinum-bright" : "bg-platinum-bright text-navy-500 ring-1 ring-inset ring-line-strong",
      )}
    >
      {foreign ? <Globe className="h-3 w-3" aria-hidden /> : <MapPin className="h-3 w-3" aria-hidden />}
      {foreign ? "Foreign" : "Local"}
    </span>
  );
}

export function PassportTag() {
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-md bg-danger-soft px-1.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-danger" title="Passport valid for less than 6 months after return">
      <TriangleAlert className="h-3 w-3" aria-hidden /> Passport
    </span>
  );
}

export const TRANSPORT_ICON: Record<string, LucideIcon> = { AIR: Plane, ROAD: Bus, RAIL: TrainFront, WATER: Ship, POOL_CAR: CarFront };

const dayMonth = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", day: "numeric", month: "short" });
const dayMonthYear = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" });
const weekday = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short", year: "numeric" });
const asDate = (d: string) => new Date(`${d}T00:00:00Z`);

/** A calendar date from the API (YYYY-MM-DD): "14 Nov 2026". */
export function calendarDay(d: string | null | undefined, withWeekday = false): string {
  if (!d) return "—";
  return (withWeekday ? weekday : dayMonthYear).format(asDate(d));
}

/** "14–18 Nov 2026", "28 Nov – 3 Dec 2026", "30 Dec 2026 – 2 Jan 2027". */
export function travelDates(start: string, end: string): string {
  const a = asDate(start);
  const b = asDate(end);
  if (start === end) return dayMonthYear.format(a);
  if (a.getUTCFullYear() !== b.getUTCFullYear()) return `${dayMonthYear.format(a)} – ${dayMonthYear.format(b)}`;
  if (a.getUTCMonth() === b.getUTCMonth()) return `${a.getUTCDate()}–${dayMonthYear.format(b)}`;
  return `${dayMonth.format(a)} – ${dayMonthYear.format(b)}`;
}

export const place = (destination: string, country: string | null) => (country ? `${destination}, ${country}` : destination);

const STAGE_ICON: Record<string, LucideIcon> = {
  SUBMITTED: Landmark,
  PENDING_HOD: UserCheck,
  PENDING_VETTING: Wallet,
  PENDING_SANCTION: Stamp,
  APPROVED: CheckCircle2,
  ACTIVE: PlaneTakeoff,
  COMPLETED: Flag,
};

const STAGE_TITLE: Record<string, string> = {
  SUBMITTED: "Submitted",
  PENDING_HOD: "HOD approval",
  PENDING_VETTING: "HR & Finance vetting",
  PENDING_SANCTION: "MD / Chairman sanction",
  APPROVED: "Funds sanctioned",
  ACTIVE: "On tour",
  COMPLETED: "Completed",
};

function stageCaption(s: PipelineStage): string {
  switch (s.state) {
    case "done":
      return [s.by, s.at ? when(s.at) : null].filter(Boolean).join(" · ") || "Done";
    case "current":
      return s.waitingFor ? `Waiting for ${s.waitingFor}` : s.at ? `Since ${when(s.at)}` : "In progress";
    case "rejected":
      return `Rejected${s.by ? ` by ${s.by}` : ""}`;
    case "cancelled":
      return "Cancelled by the traveller";
    case "skipped":
      return "Not reached";
    default:
      return s.waitingFor ? s.waitingFor : "";
  }
}

/** The approval pipeline: horizontal on wide screens, a vertical list on phones. */
export function PipelineStepper({ stages }: { stages: PipelineStage[] }) {
  const dot = (s: PipelineStage) => {
    const Icon = s.state === "rejected" ? XCircle : s.state === "cancelled" ? Ban : s.state === "current" ? Hourglass : STAGE_ICON[s.key] ?? CircleDashed;
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
  const label = (s: PipelineStage) => `${STAGE_TITLE[s.key] ?? s.label}: ${stageCaption(s)}`;
  return (
    <>
      <ol className="hidden md:grid" style={{ gridTemplateColumns: `repeat(${stages.length}, minmax(0, 1fr))` }} aria-label="Approval pipeline">
        {stages.map((s, i) => (
          <li key={s.key} className="relative flex flex-col items-center px-1 text-center" aria-label={label(s)}>
            {i > 0 && <span className={cx("absolute right-1/2 top-[17px] h-[2px] w-full", s.state === "done" || s.state === "current" || s.state === "rejected" || s.state === "cancelled" ? "bg-navy" : "bg-line")} aria-hidden />}
            {dot(s)}
            <span className={cx("mt-2 text-xs font-bold", s.state === "upcoming" || s.state === "skipped" ? "text-ink-subtle" : s.state === "rejected" ? "text-danger" : "text-navy")}>{STAGE_TITLE[s.key] ?? s.label}</span>
            <span className={cx("mt-0.5 line-clamp-2 text-[11px] leading-snug", s.state === "current" ? "font-semibold text-pending" : "text-ink-subtle")}>{stageCaption(s)}</span>
          </li>
        ))}
      </ol>
      <ol className="space-y-0 md:hidden" aria-label="Approval pipeline">
        {stages.map((s, i) => (
          <li key={s.key} className="relative flex gap-3 pb-4 last:pb-0" aria-label={label(s)}>
            {i < stages.length - 1 && <span className={cx("absolute left-[17px] top-9 h-[calc(100%-28px)] w-[2px]", stages[i + 1].state === "upcoming" || stages[i + 1].state === "skipped" ? "bg-line" : "bg-navy")} aria-hidden />}
            {dot(s)}
            <div className="min-w-0 pt-1.5">
              <p className={cx("text-sm font-bold", s.state === "upcoming" || s.state === "skipped" ? "text-ink-subtle" : s.state === "rejected" ? "text-danger" : "text-navy")}>{STAGE_TITLE[s.key] ?? s.label}</p>
              <p className={cx("text-xs", s.state === "current" ? "font-semibold text-pending" : "text-ink-subtle")}>{stageCaption(s)}</p>
            </div>
          </li>
        ))}
      </ol>
    </>
  );
}

export function Stat({
  label,
  value,
  hint,
  icon: Icon,
  tone,
  children,
  action,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  tone?: "pending" | "danger" | "success" | "active";
  children?: React.ReactNode;
  action?: React.ReactNode;
}) {
  const toneText = tone === "danger" ? "text-danger" : tone === "pending" ? "text-pending" : tone === "success" ? "text-success" : tone === "active" ? "text-active" : "text-navy";
  const toneChip = tone === "danger" ? "bg-danger-soft text-danger" : tone === "pending" ? "bg-pending-soft text-pending" : tone === "success" ? "bg-success-soft text-success" : "bg-active-soft text-active";
  return (
    <div className="card flex min-w-0 flex-col px-4 py-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold text-ink-muted">{label}</p>
        <span className={cx("grid h-8 w-8 shrink-0 place-items-center rounded-lg", toneChip)}>
          <Icon className="h-4 w-4" aria-hidden />
        </span>
      </div>
      <div className="flex items-end justify-between gap-2">
        <p className={cx("tabular font-display text-[26px] font-extrabold leading-tight", toneText)}>{value}</p>
        {action}
      </div>
      {hint && <p className="mt-0.5 truncate text-[11.5px] text-ink-subtle" title={hint}>{hint}</p>}
      {children}
    </div>
  );
}
