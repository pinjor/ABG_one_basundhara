import type { StatusTone } from "@bsc/shared";

const TONE_CLASSES: Record<StatusTone, string> = {
  success: "bg-teal/15 text-teal border-teal/30",
  warning: "bg-gold/15 text-gold border-gold/30",
  danger: "bg-red/15 text-red border-red/30",
  info: "bg-blue/15 text-blue border-blue/30",
  neutral: "bg-text-dimmer/15 text-text-dim border-text-dimmer/30",
};

/** Maps a domain status string (Section 4) to one of the five semantic tones (Section 2.1). */
export function toneForStatus(status: string): StatusTone {
  const s = status.toLowerCase();
  if (["available", "confirmed", "active", "approved", "online", "open", "operational", "delivered", "completed", "paid", "ready", "live", "playable", "done"].includes(s)) {
    return "success";
  }
  if (["maintenance", "pending", "reserved", "preparing", "scheduled", "requested", "frozen", "deposit paid", "planning", "attention"].includes(s)) {
    return "warning";
  }
  if (["cancelled", "denied", "offline", "closed", "expired", "no-show", "under repair", "restricted", "closed for maintenance", "closed for recovery"].includes(s)) {
    return "danger";
  }
  if (["in use", "on trip", "in progress", "arrived", "checked in", "expected", "charging"].includes(s)) {
    return "info";
  }
  return "neutral";
}

export function StatusBadge({ status, tone }: { status: string; tone?: StatusTone }) {
  const resolvedTone = tone ?? toneForStatus(status);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium tracking-wide ${TONE_CLASSES[resolvedTone]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}
