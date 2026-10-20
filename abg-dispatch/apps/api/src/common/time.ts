const timeFmt = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Dhaka", hour: "numeric", minute: "2-digit", hour12: true });
const dateFmt = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Dhaka", day: "numeric", month: "short" });
const isoDay = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka", year: "numeric", month: "2-digit", day: "2-digit" });

/** "11:37 AM" today, "11:37 AM on 18 Oct" otherwise — always Asia/Dhaka. */
export function dhakaTime(date: Date, now = new Date()): string {
  const t = timeFmt.format(date);
  return dhakaDay(date) === dhakaDay(now) ? t : `${t} on ${dateFmt.format(date)}`;
}

/** YYYY-MM-DD in Asia/Dhaka. */
export function dhakaDay(date: Date): string {
  return isoDay.format(date);
}

/** UTC instant range covering one Asia/Dhaka calendar day (UTC+6, no DST). */
export function dhakaDayRange(day: string): { gte: Date; lt: Date } {
  const gte = new Date(`${day}T00:00:00+06:00`);
  return { gte, lt: new Date(gte.getTime() + 24 * 60 * 60 * 1000) };
}

export function minutesBetween(a: Date | null | undefined, b: Date | null | undefined): number | null {
  if (!a || !b) return null;
  return Math.round((b.getTime() - a.getTime()) / 60000);
}
