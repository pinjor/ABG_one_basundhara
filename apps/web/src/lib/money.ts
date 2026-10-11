import type { Lang } from "./prefs";

/** BDT with lakh/crore grouping. Bengali locale uses Bengali digits. */
export function formatBdt(amount: number, lang: Lang): string {
  const formatted = new Intl.NumberFormat(lang === "bn" ? "bn-BD" : "en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return `৳ ${formatted}`;
}

export function formatWhen(value: string | Date, lang: Lang): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat(lang === "bn" ? "bn-BD" : "en-GB", {
    timeZone: "Asia/Dhaka",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
}
