import { Ban, BadgeCheck, CalendarClock, CheckCircle2, ClipboardCheck, ClipboardList, Eye, FileSearch, Flame, Gavel, Hourglass, Leaf, Scale, Send, ShieldAlert, ShoppingBag, TriangleAlert, Wallet, type LucideIcon } from "lucide-react";
import {
  AUDIT_RATING_LABEL,
  AUDIT_RATING_TONE,
  AUDIT_STATUS_LABEL,
  AUDIT_STATUS_TONE,
  AUDIT_TYPE_LABEL,
  FINDING_SEVERITY_LABEL,
  FINDING_SEVERITY_TONE,
  FINDING_STATUS_LABEL,
  FINDING_STATUS_TONE,
  type AuditRating,
  type AuditStatus,
  type AuditType,
  type FindingSeverity,
  type FindingStatus,
  type StatusTone,
} from "@abg-dispatch/shared";
import { StatusChip } from "../../components/StatusChip";
import { cx } from "../../components/ui";

export const AUDIT_STATUS_ICON: Record<string, LucideIcon> = { PLANNED: CalendarClock, IN_PROGRESS: FileSearch, FOLLOW_UP: ClipboardList, CLOSED: ClipboardCheck, CANCELLED: Ban };
export const AUDIT_TYPE_ICON: Record<string, LucideIcon> = { INTERNAL: Scale, COMPLIANCE: Gavel, SAFETY: Flame, BUYER: ShoppingBag, ISO: BadgeCheck, FINANCIAL: Wallet, ENVIRONMENT: Leaf };
export const FINDING_STATUS_ICON: Record<string, LucideIcon> = { OPEN: Hourglass, SUBMITTED: Send, VERIFIED: CheckCircle2, NOTED: Eye };
export const SEVERITY_ICON: Record<string, LucideIcon> = { CRITICAL: ShieldAlert, MAJOR: TriangleAlert, MINOR: TriangleAlert, OBSERVATION: Eye };

export const auditTone = (s: string): StatusTone => AUDIT_STATUS_TONE[s as AuditStatus] ?? "neutral";

export function AuditStatusBadge({ status, size = "md" }: { status: string; size?: "sm" | "md" }) {
  return <StatusChip label={AUDIT_STATUS_LABEL[status as AuditStatus] ?? status} tone={auditTone(status)} icon={AUDIT_STATUS_ICON[status]} size={size} />;
}

export function FindingStatusBadge({ status }: { status: string }) {
  return <StatusChip label={FINDING_STATUS_LABEL[status as FindingStatus] ?? status} tone={FINDING_STATUS_TONE[status as FindingStatus] ?? "neutral"} icon={FINDING_STATUS_ICON[status]} size="sm" />;
}

export function RatingBadge({ rating }: { rating: string | null }) {
  if (!rating) return null;
  return <StatusChip label={AUDIT_RATING_LABEL[rating as AuditRating] ?? rating} tone={AUDIT_RATING_TONE[rating as AuditRating] ?? "neutral"} icon={BadgeCheck} size="sm" />;
}

export function SeverityTag({ severity }: { severity: string }) {
  const tone = FINDING_SEVERITY_TONE[severity as FindingSeverity] ?? "neutral";
  const Icon = SEVERITY_ICON[severity] ?? TriangleAlert;
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide",
        severity === "CRITICAL" ? "bg-danger text-white" : tone === "danger" ? "bg-danger-soft text-danger" : tone === "pending" ? "bg-pending-soft text-pending" : "bg-neutral-soft text-neutral",
      )}
    >
      <Icon className="h-3 w-3" aria-hidden /> {FINDING_SEVERITY_LABEL[severity as FindingSeverity] ?? severity}
    </span>
  );
}

export function AuditTypeTag({ type }: { type: string }) {
  const Icon = AUDIT_TYPE_ICON[type] ?? Scale;
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-md bg-platinum-bright px-1.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-navy-500 ring-1 ring-inset ring-line-strong">
      <Icon className="h-3 w-3" aria-hidden /> {AUDIT_TYPE_LABEL[type as AuditType] ?? type}
    </span>
  );
}

export function OverdueTag() {
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-md bg-danger px-1.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-white">
      <Hourglass className="h-3 w-3" aria-hidden /> Overdue
    </span>
  );
}

const dayMonth = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", day: "numeric", month: "short" });
const dayMonthYear = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" });
const asDate = (d: string) => new Date(`${d}T00:00:00Z`);

export function calendarDay(d: string | null | undefined): string {
  return d ? dayMonthYear.format(asDate(d)) : "—";
}

export function auditDates(start: string, end: string): string {
  if (start === end) return dayMonthYear.format(asDate(start));
  const a = asDate(start);
  const b = asDate(end);
  if (a.getUTCMonth() === b.getUTCMonth() && a.getUTCFullYear() === b.getUTCFullYear()) return `${a.getUTCDate()}–${dayMonthYear.format(b)}`;
  return `${dayMonth.format(a)} – ${dayMonthYear.format(b)}`;
}

/** A thin bar: verified / noted / submitted / open, with the counts. */
export function FindingsBar({ counts }: { counts: { total: number; open: number; submitted: number; verified: number; noted: number; overdue: number } }) {
  if (!counts.total) return <span className="text-xs text-ink-subtle">No findings</span>;
  const part = (n: number) => `${(n / counts.total) * 100}%`;
  return (
    <div className="min-w-[120px]">
      <div className="flex h-1.5 overflow-hidden rounded-full bg-platinum-bright" aria-hidden>
        <span className="bg-success" style={{ width: part(counts.verified) }} />
        <span className="bg-neutral/50" style={{ width: part(counts.noted) }} />
        <span className="bg-active" style={{ width: part(counts.submitted) }} />
        <span className="bg-pending" style={{ width: part(counts.open) }} />
      </div>
      <p className="mt-1 text-[11px] text-ink-subtle">
        {counts.total} finding{counts.total === 1 ? "" : "s"}
        {counts.open + counts.submitted ? ` · ${counts.open + counts.submitted} open` : " · all closed"}
        {counts.overdue ? ` · ${counts.overdue} overdue` : ""}
      </p>
    </div>
  );
}
