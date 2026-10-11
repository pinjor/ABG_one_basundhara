import { useEffect, useRef, useState } from "react";

interface StatTileProps {
  label: string;
  value: number;
  suffix?: string;
  prefix?: string;
  tone?: "gold" | "teal" | "blue" | "red" | "default";
}

const TONE_TEXT: Record<NonNullable<StatTileProps["tone"]>, string> = {
  gold: "text-gold",
  teal: "text-teal",
  blue: "text-blue",
  red: "text-red",
  default: "text-text",
};

/**
 * KPI stat tile that counts up whenever its value changes (Section 2.4) —
 * including the first time real data replaces the initial loading value,
 * which is the moment that actually needs to read as "arriving".
 */
export function StatTile({ label, value, suffix = "", prefix = "", tone = "default" }: StatTileProps) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);

  useEffect(() => {
    const from = fromRef.current;
    if (from === value) return;
    const duration = 600;
    const start = performance.now();
    let raf: number;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(from + (value - from) * eased));
      if (progress < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        fromRef.current = value;
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return (
    <div className="animate-stat-in rounded-lg border border-gold/20 bg-surface-2 p-4 shadow-gold-sm">
      <div className="text-xs uppercase tracking-[0.16em] text-gold/70">{label}</div>
      <div className={`mt-1.5 font-display text-3xl font-bold leading-none ${TONE_TEXT[tone]}`}>
        {prefix}
        {display.toLocaleString()}
        {suffix}
      </div>
    </div>
  );
}
