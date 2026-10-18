import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { CountUp, HOVER, itemVariants } from "../../lib/motion";
import { Sparkline } from "./Charts";

export function KPIStatCard({
  icon,
  label,
  value,
  hint,
  delta,
  series,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  hint?: string;
  delta?: { direction: "up" | "down" | "flat"; text: string };
  series?: number[];
}) {
  return (
    <motion.article className="panel flex min-h-[112px] flex-col justify-between p-3.5" variants={itemVariants} whileHover={HOVER}>
      <div className="flex items-start justify-between gap-2">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-[color-mix(in_srgb,var(--brand-gold)_16%,transparent)] text-[var(--brand-gold)]">
          {icon}
        </span>
        {series && series.length > 1 && <Sparkline values={series} />}
      </div>
      <p className="mt-3 font-display text-[30px] font-bold leading-none tabular-nums text-text"><CountUp value={value} /></p>
      <div className="mt-1 flex items-end justify-between gap-2">
        <p className="text-xs text-text-dim">{label}{hint ? ` · ${hint}` : ""}</p>
        {delta && (
          <p className={`text-xs font-medium ${delta.direction === "down" ? "text-[var(--status-danger)]" : "text-[var(--status-success)]"}`}>
            <span aria-hidden>{delta.direction === "down" ? "↓" : delta.direction === "up" ? "↑" : "→"}</span>{" "}
            <span className="sr-only">{delta.direction} </span>
            {delta.text}
          </p>
        )}
      </div>
    </motion.article>
  );
}
