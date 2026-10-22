import { useEffect, useState, type ReactNode } from "react";
import QRCode from "qrcode";
import {
  Ban,
  CalendarClock,
  CarFront,
  CheckCircle2,
  CircleDashed,
  CircleX,
  ClipboardCheck,
  Flame,
  Hourglass,
  KeyRound,
  Navigation,
  Phone,
  TriangleAlert,
  UserCheck,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import {
  CAR_REQUISITION_STATUS_LABEL,
  CAR_REQUISITION_STATUS_TONE,
  DRIVER_STATUS_LABEL,
  DRIVER_STATUS_TONE,
  VEHICLE_STATUS_LABEL,
  VEHICLE_STATUS_TONE,
  type CarRequisitionStatus,
  type DriverStatus,
  type StatusTone,
  type VehicleStatus,
} from "@abg-dispatch/shared";
import { cx } from "../../components/ui";
import { when } from "../../lib/format";
import type { PipelineStep } from "./types";

const TONE_CLASS: Record<StatusTone, string> = {
  active: "bg-active-soft text-active ring-active/15",
  pending: "bg-pending-soft text-pending ring-pending/20",
  success: "bg-success-soft text-success ring-success/15",
  danger: "bg-danger-soft text-danger ring-danger/15",
  neutral: "bg-neutral-soft text-neutral ring-neutral/15",
};

export const CAR_STATUS_ICON: Record<CarRequisitionStatus, LucideIcon> = {
  PENDING_HOD: UserCheck,
  PENDING_FLEET: Hourglass,
  ASSIGNED: KeyRound,
  IN_PROGRESS: Navigation,
  COMPLETED: CheckCircle2,
  REJECTED: CircleX,
  CANCELLED: Ban,
};

function Badge({ tone, icon: Icon, label, size = "md" }: { tone: StatusTone; icon: LucideIcon; label: string; size?: "sm" | "md" }) {
  return (
    <span className={cx("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full font-semibold ring-1 ring-inset", TONE_CLASS[tone], size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs")}>
      <Icon className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} aria-hidden />
      {label}
    </span>
  );
}

/** Status is never colour alone: icon + the shared label. */
export function CarStatusBadge({ status, size }: { status: string; size?: "sm" | "md" }) {
  const s = status as CarRequisitionStatus;
  return <Badge tone={CAR_REQUISITION_STATUS_TONE[s] ?? "neutral"} icon={CAR_STATUS_ICON[s] ?? CircleDashed} label={CAR_REQUISITION_STATUS_LABEL[s] ?? status} size={size} />;
}

const VEHICLE_ICON: Record<VehicleStatus, LucideIcon> = { AVAILABLE: CheckCircle2, ON_TRIP: Navigation, MAINTENANCE: Wrench, INACTIVE: Ban };

export function VehicleStatusBadge({ status, size }: { status: string; size?: "sm" | "md" }) {
  const s = status as VehicleStatus;
  return <Badge tone={VEHICLE_STATUS_TONE[s] ?? "neutral"} icon={VEHICLE_ICON[s] ?? CircleDashed} label={VEHICLE_STATUS_LABEL[s] ?? status} size={size} />;
}

const DRIVER_ICON: Record<DriverStatus, LucideIcon> = { AVAILABLE: CheckCircle2, ON_TRIP: Navigation, OFF_DUTY: CalendarClock };

export function DriverStatusBadge({ status, active = true, size }: { status: string; active?: boolean; size?: "sm" | "md" }) {
  if (!active) return <Badge tone="neutral" icon={Ban} label="Left the pool" size={size} />;
  const s = status as DriverStatus;
  return <Badge tone={DRIVER_STATUS_TONE[s] ?? "neutral"} icon={DRIVER_ICON[s] ?? CircleDashed} label={DRIVER_STATUS_LABEL[s] ?? status} size={size} />;
}

export function UrgentTag() {
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-md bg-danger-soft px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-danger">
      <Flame className="h-3 w-3" aria-hidden /> Urgent
    </span>
  );
}

/** A service, fitness, insurance or licence date: amber when due soon, red when overdue. */
export function DueDate({ label, date, state }: { label: string; date: string | null; state?: "OVERDUE" | "DUE_SOON" | null }) {
  const text = date ? new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`)) : "Not set";
  return (
    <div className={cx("min-w-0 rounded-lg px-2.5 py-1.5", state === "OVERDUE" ? "bg-danger-soft" : state === "DUE_SOON" ? "bg-pending-soft" : "bg-surface")}>
      <p className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-subtle">{label}</p>
      <p className={cx("flex items-center gap-1 text-[13px] font-semibold", state === "OVERDUE" ? "text-danger" : state === "DUE_SOON" ? "text-pending" : date ? "text-ink" : "text-ink-subtle")}>
        {state && <TriangleAlert className="h-3.5 w-3.5 shrink-0" aria-hidden />}
        <span className="truncate">{text}</span>
        {state && <span className="sr-only">{state === "OVERDUE" ? "(overdue)" : "(due soon)"}</span>}
      </p>
    </div>
  );
}

export function CallButton({ phone, label = "Call", compact }: { phone: string | null | undefined; label?: string; compact?: boolean }) {
  if (!phone) return null;
  return (
    <a href={`tel:${phone}`} className={cx("btn-secondary", compact ? "h-9 px-3" : "")} aria-label={`${label} ${phone}`}>
      <Phone className="h-4 w-4" aria-hidden /> {compact ? label : `${label} ${phone}`}
    </a>
  );
}

const STEP_ICON: Record<string, LucideIcon> = { PENDING_HOD: UserCheck, PENDING_FLEET: ClipboardCheck, ASSIGNED: KeyRound, IN_PROGRESS: CarFront, COMPLETED: CheckCircle2 };
const STEP_LABEL: Record<string, string> = { PENDING_HOD: "Pending HOD", PENDING_FLEET: "Pending fleet manager", ASSIGNED: "Assigned", IN_PROGRESS: "In progress", COMPLETED: "Completed" };

/** Pending HOD → Pending fleet manager → Assigned → In progress → Completed. */
export function PipelineStepper({ steps, outcome }: { steps: PipelineStep[]; outcome: { label: string; status: string } | null }) {
  return (
    <ol className="grid grid-cols-5 gap-1" aria-label="Request progress">
      {steps.map((s, i) => {
        const Icon = s.state === "HALTED" ? (outcome?.status === "REJECTED" ? CircleX : Ban) : STEP_ICON[s.status] ?? CircleDashed;
        const reached = s.state === "DONE" || s.state === "CURRENT" || s.state === "HALTED";
        return (
          <li key={s.status} className="relative flex min-w-0 flex-col items-center text-center" aria-current={s.state === "CURRENT" ? "step" : undefined}>
            {i > 0 && <span className={cx("absolute right-1/2 top-[15px] h-[2px] w-full", reached ? "bg-navy" : "bg-line")} aria-hidden />}
            <span
              className={cx(
                "relative z-10 grid h-8 w-8 place-items-center rounded-full border-2",
                s.state === "DONE" && (s.status === "COMPLETED" ? "border-success bg-success text-white" : "border-navy bg-navy text-white"),
                s.state === "CURRENT" && "border-navy bg-white text-navy ring-4 ring-navy/10",
                s.state === "HALTED" && "border-danger bg-danger text-white",
                s.state === "UPCOMING" && "border-line-strong bg-white text-ink-subtle",
              )}
            >
              <Icon className="h-4 w-4" aria-hidden />
            </span>
            <span className={cx("mt-2 text-[11px] font-semibold leading-tight sm:text-xs", reached ? "text-navy" : "text-ink-subtle")}>{s.state === "HALTED" ? outcome?.label : STEP_LABEL[s.status] ?? s.label}</span>
            <span className="text-[10.5px] text-ink-subtle sm:text-[11px]">{s.at ? when(s.at) : s.state === "CURRENT" ? "Now" : ""}</span>
          </li>
        );
      })}
    </ol>
  );
}

export function Stat({ label, value, hint, tone, icon: Icon }: { label: string; value: ReactNode; hint?: string; tone?: "pending" | "danger" | "success" | "active"; icon: LucideIcon }) {
  return (
    <div className="card flex items-start gap-3 px-4 py-4">
      <span className={cx("grid h-10 w-10 shrink-0 place-items-center rounded-xl", tone === "danger" ? "bg-danger-soft text-danger" : tone === "pending" ? "bg-pending-soft text-pending" : tone === "success" ? "bg-success-soft text-success" : "bg-active-soft text-active")}>
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium text-ink-muted">{label}</p>
        <p className="tabular mt-0.5 font-display text-2xl font-extrabold text-navy">{value}</p>
        {hint && <p className="mt-0.5 text-[11px] text-ink-subtle">{hint}</p>}
      </div>
    </div>
  );
}

/** QR as inline SVG (crisp on screen and in print). */
export function useQrSvg(payload: string | null | undefined) {
  const [svg, setSvg] = useState("");
  useEffect(() => {
    if (!payload) return setSvg("");
    let live = true;
    void QRCode.toString(payload, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#0C1727", light: "#FFFFFF" } }).then((s) => live && setSvg(s));
    return () => {
      live = false;
    };
  }, [payload]);
  return svg;
}

/** Asia/Dhaka wall-clock value for <input type="datetime-local">. */
export function toDhakaInput(d: Date): string {
  return new Date(d.getTime() + 6 * 3_600_000).toISOString().slice(0, 16);
}

/** A datetime-local value read as Asia/Dhaka time. */
export function fromDhakaInput(v: string): string {
  return new Date(`${v}:00+06:00`).toISOString();
}

export function km(n: number | null | undefined): string {
  return n === null || n === undefined ? "—" : `${n.toLocaleString("en-US")} km`;
}
