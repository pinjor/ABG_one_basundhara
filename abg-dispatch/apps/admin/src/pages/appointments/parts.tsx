import { Ban, CalendarCheck2, CalendarClock, CheckCircle2, Handshake, Hourglass, MapPin, Phone, Repeat, Siren, Users, Video, XCircle, type LucideIcon } from "lucide-react";
import { APPOINTMENT_STATUS_LABEL, APPOINTMENT_STATUS_TONE, MEETING_MODE_LABEL, type AppointmentStatus, type MeetingMode, type StatusTone } from "@abg-dispatch/shared";
import { StatusChip } from "../../components/StatusChip";

export const APPOINTMENT_STATUS_ICON: Record<string, LucideIcon> = {
  PENDING: Hourglass,
  PROPOSED: Repeat,
  CONFIRMED: CalendarCheck2,
  COMPLETED: CheckCircle2,
  DECLINED: XCircle,
  CANCELLED: Ban,
};

export const MODE_ICON: Record<string, LucideIcon> = { IN_PERSON: Users, VIDEO: Video, PHONE: Phone };

export const appointmentTone = (status: string): StatusTone => APPOINTMENT_STATUS_TONE[status as AppointmentStatus] ?? "neutral";

export function AppointmentStatusBadge({ status, size = "md" }: { status: string; size?: "sm" | "md" }) {
  return <StatusChip label={APPOINTMENT_STATUS_LABEL[status as AppointmentStatus] ?? status} tone={appointmentTone(status)} icon={APPOINTMENT_STATUS_ICON[status]} size={size} />;
}

export function ModeTag({ mode }: { mode: string }) {
  const Icon = MODE_ICON[mode] ?? Handshake;
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-md bg-platinum-bright px-1.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-navy-500 ring-1 ring-inset ring-line-strong">
      <Icon className="h-3 w-3" aria-hidden /> {MEETING_MODE_LABEL[mode as MeetingMode] ?? mode}
    </span>
  );
}

export function UrgentTag() {
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-md bg-danger px-1.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-white">
      <Siren className="h-3 w-3" aria-hidden /> Urgent
    </span>
  );
}

export function PlaceLine({ location }: { location: string | null }) {
  if (!location) return null;
  return (
    <span className="inline-flex items-center gap-1 text-xs text-ink-muted">
      <MapPin className="h-3 w-3" aria-hidden /> {location}
    </span>
  );
}

const tz = "Asia/Dhaka";
const dayFmt = new Intl.DateTimeFormat("en-GB", { timeZone: tz, weekday: "short", day: "numeric", month: "short" });
const timeFmt = new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit" });
const isoFmt = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" });
const hmFmt = new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

/** "Mon 2 Nov · 11:00 AM–11:30 AM" in Asia/Dhaka. */
export function meetingWhen(at: string | null | undefined, minutes?: number): string {
  if (!at) return "—";
  const d = new Date(at);
  const end = minutes ? new Date(d.getTime() + minutes * 60_000) : null;
  return `${dayFmt.format(d)} · ${timeFmt.format(d)}${end ? `–${timeFmt.format(end)}` : ""}`;
}

export const dhakaIso = (at: string | Date) => isoFmt.format(new Date(at));
export const dhakaHm = (at: string | Date) => hmFmt.format(new Date(at));

/** A Dhaka wall-clock date and time as an ISO instant. */
export const toInstant = (date: string, time: string) => new Date(`${date}T${time}:00+06:00`).toISOString();

export const SLOT_ICON = CalendarClock;
