/** Everything is shown in Asia/Dhaka, whatever the browser's time zone. */
const tz = "Asia/Dhaka";
const time = new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit" });
const day = new Intl.DateTimeFormat("en-GB", { timeZone: tz, day: "numeric", month: "short" });
const full = new Intl.DateTimeFormat("en-GB", { timeZone: tz, day: "numeric", month: "short", year: "numeric" });
const iso = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" });

export const dhakaDay = (d: Date = new Date()) => iso.format(d);

export function when(value?: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  return dhakaDay(d) === dhakaDay() ? time.format(d) : `${day.format(d)}, ${time.format(d)}`;
}

export function stamp(value?: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  return `${full.format(d)} · ${time.format(d)}`;
}

export function ago(value?: string | null): string {
  if (!value) return "—";
  const mins = Math.round((Date.now() - new Date(value).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h} h ${mins % 60} m ago`;
  return day.format(new Date(value));
}

export function minutes(value?: number | null): string {
  if (value === null || value === undefined) return "—";
  const m = Math.round(value);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  return m % 60 ? `${h} h ${m % 60} m` : `${h} h`;
}

export function compact(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1)}K` : String(n);
}

export function daysAgo(n: number): string {
  return dhakaDay(new Date(Date.now() - n * 86_400_000));
}
