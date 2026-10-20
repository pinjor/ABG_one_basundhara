import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import {
  AlertOctagon,
  ArrowRight,
  Ban,
  CheckCircle2,
  CircleDashed,
  Clock3,
  FileEdit,
  Flame,
  Hammer,
  Hourglass,
  Inbox,
  Loader2,
  Lock,
  MapPin,
  PackageCheck,
  PauseCircle,
  RotateCcw,
  ShieldAlert,
  Truck,
  Undo2,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  CLASSIFICATION_LABEL,
  Classification,
  INCIDENT_SEVERITY_LABEL,
  INCIDENT_STATUS_LABEL,
  INCIDENT_STATUS_TONE,
  IncidentStatus,
  IncidentSeverity,
  PRIORITY_LABEL,
  ParcelStatus,
  Priority,
  STATUS_LABEL,
  STATUS_TONE,
  type StatusTone,
} from "@abg-dispatch/shared";
import { ApiError } from "../lib/api";

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

const TONE_CLASS: Record<StatusTone, string> = {
  active: "bg-active-soft text-active ring-active/15",
  pending: "bg-pending-soft text-pending ring-pending/20",
  success: "bg-success-soft text-success ring-success/15",
  danger: "bg-danger-soft text-danger ring-danger/15",
  neutral: "bg-neutral-soft text-neutral ring-neutral/15",
};

const STATUS_ICON: Record<ParcelStatus, LucideIcon> = {
  DRAFT: FileEdit,
  BOOKED: CircleDashed,
  AWAITING_PICKUP: Clock3,
  PICKED_UP: Truck,
  IN_TRANSIT: Truck,
  ARRIVED_AT_DESTINATION: MapPin,
  PENDING_RECEIPT: Inbox,
  RECEIVED: PackageCheck,
  ON_HOLD: PauseCircle,
  DELIVERY_EXCEPTION: AlertOctagon,
  DELIVERY_FAILED: AlertOctagon,
  RETURN_REQUESTED: Undo2,
  RETURN_IN_TRANSIT: RotateCcw,
  RETURNED: RotateCcw,
  CANCELLED: Ban,
};

/** Status is never colour alone: every badge carries an icon and the shared label. */
export function StatusBadge({ status, size = "md" }: { status: string; size?: "sm" | "md" }) {
  const s = status as ParcelStatus;
  const Icon = STATUS_ICON[s] ?? CircleDashed;
  return (
    <span className={cx("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full font-semibold ring-1 ring-inset", TONE_CLASS[STATUS_TONE[s] ?? "neutral"], size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs")}>
      <Icon className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} aria-hidden />
      {STATUS_LABEL[s] ?? status}
    </span>
  );
}

const INCIDENT_ICON: Record<IncidentStatus, LucideIcon> = {
  PENDING: Hourglass,
  PROCESSING: Hammer,
  DONE: CheckCircle2,
  DECLINED: Ban,
};

export function IncidentStatusBadge({ status, size = "md" }: { status: string; size?: "sm" | "md" }) {
  const s = status as IncidentStatus;
  const Icon = INCIDENT_ICON[s] ?? CircleDashed;
  return (
    <span className={cx("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full font-semibold ring-1 ring-inset", TONE_CLASS[INCIDENT_STATUS_TONE[s] ?? "neutral"], size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs")}>
      <Icon className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} aria-hidden />
      {INCIDENT_STATUS_LABEL[s] ?? status}
    </span>
  );
}

export function SeverityBadge({ severity }: { severity: string }) {
  if (severity === IncidentSeverity.MEDIUM || severity === IncidentSeverity.LOW) return <span className="text-xs text-ink-muted">{INCIDENT_SEVERITY_LABEL[severity]}</span>;
  const urgent = severity === IncidentSeverity.URGENT;
  return (
    <span className={cx("inline-flex items-center gap-1 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wide", urgent ? "bg-danger-soft text-danger" : "bg-pending-soft text-pending")}>
      {urgent && <Flame className="h-3 w-3" aria-hidden />}
      {INCIDENT_SEVERITY_LABEL[severity as IncidentSeverity] ?? severity}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: string }) {
  if (priority === Priority.NORMAL) return <span className="text-xs text-ink-muted">Normal</span>;
  const urgent = priority === Priority.URGENT || priority === Priority.CRITICAL;
  return (
    <span className={cx("inline-flex items-center gap-1 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wide", urgent ? "bg-danger-soft text-danger" : "bg-pending-soft text-pending")}>
      {urgent && <Flame className="h-3 w-3" aria-hidden />}
      {PRIORITY_LABEL[priority as Priority] ?? priority}
    </span>
  );
}

export function ClassificationTag({ value }: { value: string }) {
  if (value === Classification.NORMAL) return null;
  const high = value === Classification.HIGHLY_CONFIDENTIAL;
  return (
    <span className={cx("inline-flex items-center gap-1 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[11px] font-semibold", high ? "bg-navy text-platinum-bright" : "bg-platinum-bright text-navy-500")}>
      {high ? <ShieldAlert className="h-3 w-3" aria-hidden /> : <Lock className="h-3 w-3" aria-hidden />}
      {CLASSIFICATION_LABEL[value as Classification] ?? value}
    </span>
  );
}

export function OverdueTag() {
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-md bg-danger px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">
      <Clock3 className="h-3 w-3" aria-hidden /> Overdue
    </span>
  );
}

export function PageHeader({ title, subtitle, actions, overline }: { title: string; subtitle?: ReactNode; actions?: ReactNode; overline?: string }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {overline && <p className="overline mb-1">{overline}</p>}
        <h1 className="font-display text-[26px] font-extrabold leading-tight tracking-tight text-navy">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-muted">{subtitle}</p>}
      </div>
      {actions && <div className="no-print flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ title, action, children, className, padded = true }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string; padded?: boolean }) {
  return (
    <section className={cx("card min-w-0", className)}>
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          <h2 className="font-display text-[15px] font-bold text-navy">{title}</h2>
          {action}
        </header>
      )}
      <div className={padded ? "p-5" : undefined}>{children}</div>
    </section>
  );
}

export function Spinner({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-sm text-ink-muted" role="status">
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> {label}…
    </div>
  );
}

export function Empty({ icon: Icon = Inbox, title, hint }: { icon?: LucideIcon; title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-3 grid h-11 w-11 place-items-center rounded-full bg-platinum-bright text-navy-500">
        <Icon className="h-5 w-5" aria-hidden />
      </div>
      <p className="font-semibold text-navy">{title}</p>
      {hint && <p className="mt-1 max-w-sm text-sm text-ink-muted">{hint}</p>}
    </div>
  );
}

export function ErrorNote({ error }: { error: unknown }) {
  if (!error) return null;
  const forbidden = error instanceof ApiError && error.status === 403;
  return (
    <div className="flex items-start gap-2 rounded-xl border border-danger/20 bg-danger-soft px-4 py-3 text-sm text-danger" role="alert">
      <AlertOctagon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <span className="whitespace-pre-line">{forbidden ? "Your role does not include access to this." : error instanceof Error ? error.message : String(error)}</span>
    </div>
  );
}

export function Field({ label, hint, children, className }: { label: string; hint?: string; children: (id: string) => ReactNode; className?: string }) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="label">
        {label}
      </label>
      {children(id)}
      {hint && <p className="mt-1 text-xs text-ink-subtle">{hint}</p>}
    </div>
  );
}

export function Modal({ open, title, subtitle, onClose, children, footer, width = "max-w-lg" }: { open: boolean; title: string; subtitle?: string; onClose: () => void; children: ReactNode; footer?: ReactNode; width?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    ref.current?.querySelector<HTMLElement>("input, textarea, select, button[data-autofocus]")?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  // Portalled to <body> so no ancestor's stacking context or filter can clip the overlay.
  return createPortal(
    <div className="no-print fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-midnight/55 p-4 pt-[8vh] backdrop-blur-[2px]" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} role="dialog" aria-modal="true" aria-label={title} className={cx("w-full rounded-2xl bg-white shadow-raised", width)}>
        <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-4">
          <div>
            <h2 className="font-display text-lg font-bold text-navy">{title}</h2>
            {subtitle && <p className="mt-0.5 text-sm text-ink-muted">{subtitle}</p>}
          </div>
          <button className="rounded-lg p-1 text-ink-subtle hover:bg-surface hover:text-ink" onClick={onClose} aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-4 px-6 py-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-line bg-surface/60 px-6 py-4">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

export function Tabs<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: { value: T; label: string; count?: number }[] }) {
  return (
    <div className="no-print -mx-1 flex gap-1 overflow-x-auto pb-1" role="tablist">
      {items.map((t) => (
        <button
          key={t.value}
          role="tab"
          aria-selected={value === t.value}
          onClick={() => onChange(t.value)}
          className={cx(
            "inline-flex h-9 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition",
            value === t.value ? "bg-navy text-white shadow-card" : "text-ink-muted hover:bg-white hover:text-navy",
          )}
        >
          {t.label}
          {t.count !== undefined && <span className={cx("tabular rounded-md px-1.5 text-[11px]", value === t.value ? "bg-white/15" : "bg-platinum-bright text-navy-500")}>{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function Toggle({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cx("relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition disabled:opacity-50", checked ? "bg-success" : "bg-line-strong")}
    >
      <span className={cx("inline-block h-5 w-5 rounded-full bg-white shadow transition", checked ? "translate-x-5" : "translate-x-0.5")} />
    </button>
  );
}

export function Pill({ children, tone = "neutral" }: { children: ReactNode; tone?: StatusTone }) {
  return <span className={cx("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset", TONE_CLASS[tone])}>{children}</span>;
}

/** Health dot + label for integrations and services. */
export function HealthBadge({ status }: { status: string }) {
  const map: Record<string, { tone: StatusTone; label: string; Icon: LucideIcon }> = {
    HEALTHY: { tone: "success", label: "Healthy", Icon: CheckCircle2 },
    DEGRADED: { tone: "pending", label: "Degraded", Icon: AlertOctagon },
    DOWN: { tone: "danger", label: "Down", Icon: AlertOctagon },
    UNKNOWN: { tone: "neutral", label: "Not checked", Icon: CircleDashed },
    NOT_CONFIGURED: { tone: "neutral", label: "Not configured", Icon: CircleDashed },
    DEV_MODE: { tone: "pending", label: "Development mode", Icon: Clock3 },
    DISABLED: { tone: "neutral", label: "Disabled", Icon: Ban },
    MANUAL: { tone: "active", label: "Manual updates", Icon: FileEdit },
  };
  const m = map[status] ?? map.UNKNOWN;
  return (
    <Pill tone={m.tone}>
      <m.Icon className="h-3 w-3" aria-hidden /> {m.label}
    </Pill>
  );
}

export function TrackingLink({ id, tracking }: { id: string; tracking: string }) {
  return (
    <Link to={`/parcels/${id}`} className="mono whitespace-nowrap text-[13px] text-navy hover:text-active hover:underline">
      {tracking}
    </Link>
  );
}

export function MoreLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className="inline-flex items-center gap-1 text-sm font-semibold text-active hover:underline">
      {children} <ArrowRight className="h-3.5 w-3.5" aria-hidden />
    </Link>
  );
}

export function KeyValue({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-ink-subtle">{label}</dt>
      <dd className="mt-0.5 break-words text-sm font-medium text-ink">{children ?? "—"}</dd>
    </div>
  );
}
