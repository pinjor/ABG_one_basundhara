import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { compact, minutes } from "../lib/format";

/**
 * Small SVG chart kit. Marks follow one spec everywhere: bars ≤ 24px with a
 * 4px rounded data end and a square baseline, 2px lines, ≥ 8px markers with a
 * surface ring, hairline solid gridlines, one axis, text in ink tokens (never
 * the series colour), a legend for two or more series, and a hover tooltip.
 * Series colours are validated for colour-vision deficiency, in fixed order
 * (#2a78d6, #eb6834, #1baf7a); the third sits below 3:1 contrast, so it is
 * only used where its values are also printed as text.
 */
export const SERIES = ["#2a78d6", "#eb6834", "#1baf7a"] as const;
const GRID = "#E3E8EF";
const AXIS_TEXT = "#5B6678";
const SURFACE = "#FFFFFF";

function useWidth<T extends HTMLElement>(): [React.RefObject<T>, number] {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(600);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.max(240, Math.floor(entry.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width];
}

function niceMax(v: number): number {
  if (v <= 4) return 4;
  const pow = 10 ** Math.floor(Math.log10(v));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * pow >= v) return m * pow;
  return 10 * pow;
}

/** Rounded top, square bottom. */
function barPath(x: number, y: number, w: number, h: number, r = 4): string {
  if (h <= 0) return "";
  const rr = Math.min(r, w / 2, h);
  return `M${x},${y + h} L${x},${y + rr} Q${x},${y} ${x + rr},${y} L${x + w - rr},${y} Q${x + w},${y} ${x + w},${y + rr} L${x + w},${y + h} Z`;
}

/** Rounded right end, square at the left baseline. */
function hbarPath(x: number, y: number, w: number, h: number, r = 4): string {
  if (w <= 0) return "";
  const rr = Math.min(r, h / 2, w);
  return `M${x},${y} L${x + w - rr},${y} Q${x + w},${y} ${x + w},${y + rr} L${x + w},${y + h - rr} Q${x + w},${y + h} ${x + w - rr},${y + h} L${x},${y + h} Z`;
}

export function Legend({ items }: { items: { label: string; color: string; line?: boolean }[] }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-muted">
      {items.map((i) => (
        <li key={i.label} className="inline-flex items-center gap-1.5">
          {i.line ? <span className="h-0.5 w-4 rounded-full" style={{ background: i.color }} /> : <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: i.color }} />}
          {i.label}
        </li>
      ))}
    </ul>
  );
}

function Tooltip({ x, y, width, children }: { x: number; y: number; width: number; children: ReactNode }) {
  const left = Math.min(Math.max(x, 70), width - 70);
  return (
    <div className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg bg-navy px-3 py-2 text-xs text-white shadow-raised" style={{ left, top: y - 8 }}>
      {children}
    </div>
  );
}

function TooltipRow({ color, label, value }: { color: string; label: string; value: ReactNode }) {
  return (
    <div className="flex items-center gap-2 whitespace-nowrap">
      <span className="h-2 w-2 rounded-[2px] ring-1 ring-white/60" style={{ background: color }} />
      <span className="text-white/75">{label}</span>
      <span className="tabular ml-auto pl-3 font-semibold">{value}</span>
    </div>
  );
}

/** Screen-reader table behind every chart, so no value is colour-only or hover-only. */
function DataTable({ caption, head, rows }: { caption: string; head: string[]; rows: (string | number)[][] }) {
  return (
    // A table ignores width: 1px, so the visually-hidden wrapper is a div.
    <div className="sr-only">
    <table>
      <caption>{caption}</caption>
      <thead>
        <tr>
          {head.map((h) => (
            <th key={h}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>
            {r.map((c, j) => (
              <td key={j}>{c}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
    </div>
  );
}

export interface SeriesDef<T> {
  key: keyof T & string;
  label: string;
}

/** Grouped columns: one group per category, one column per series (max 2). */
export function GroupedColumns<T extends Record<string, unknown>>({ data, category, series, height = 220, caption, formatCategory = String }: { data: T[]; category: keyof T & string; series: SeriesDef<T>[]; height?: number; caption: string; formatCategory?: (v: unknown) => string }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const pad = { top: 12, right: 8, bottom: 26, left: 32 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const max = niceMax(Math.max(1, ...data.flatMap((d) => series.map((s) => Number(d[s.key]) || 0))));
  const band = innerW / Math.max(1, data.length);
  const gap = 2;
  const barW = Math.min(24, Math.max(4, (band * 0.62 - gap * (series.length - 1)) / series.length));
  const groupW = barW * series.length + gap * (series.length - 1);
  const ticks = [0, max / 2, max];
  const y = (v: number) => pad.top + innerH - (v / max) * innerH;
  const labelEvery = Math.ceil(data.length / Math.max(1, Math.floor(innerW / 44)));

  return (
    <div>
      {series.length > 1 && (
        <div className="mb-3">
          <Legend items={series.map((s, i) => ({ label: s.label, color: SERIES[i] }))} />
        </div>
      )}
      <div ref={ref} className="relative w-full min-w-0 overflow-hidden" onMouseLeave={() => setHover(null)}>
        <svg width={width} height={height} role="img" aria-label={caption} className="block">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={pad.left} x2={width - pad.right} y1={y(t)} y2={y(t)} stroke={GRID} strokeWidth={1} />
              <text x={pad.left - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill={AXIS_TEXT} className="tabular">
                {compact(t)}
              </text>
            </g>
          ))}
          {data.map((d, i) => {
            const gx = pad.left + band * i + (band - groupW) / 2;
            return (
              <g key={i}>
                {hover === i && <rect x={pad.left + band * i} y={pad.top} width={band} height={innerH} fill="#0C1727" opacity={0.04} />}
                {series.map((s, j) => {
                  const v = Number(d[s.key]) || 0;
                  return <path key={s.key} d={barPath(gx + j * (barW + gap), y(v), barW, pad.top + innerH - y(v))} fill={SERIES[j]} />;
                })}
                {i % labelEvery === 0 && (
                  <text x={pad.left + band * i + band / 2} y={height - 8} textAnchor="middle" fontSize={11} fill={AXIS_TEXT}>
                    {formatCategory(d[category])}
                  </text>
                )}
                {/* Hit target: the whole band, larger than the marks. */}
                <rect x={pad.left + band * i} y={pad.top} width={band} height={innerH} fill="transparent" onMouseEnter={() => setHover(i)} />
              </g>
            );
          })}
        </svg>
        {hover !== null && data[hover] && (
          <Tooltip x={pad.left + band * hover + band / 2} y={y(Math.max(...series.map((s) => Number(data[hover][s.key]) || 0)))} width={width}>
            <p className="mb-1 font-semibold">{formatCategory(data[hover][category])}</p>
            {series.map((s, j) => (
              <TooltipRow key={s.key} color={SERIES[j]} label={s.label} value={Number(data[hover][s.key]) || 0} />
            ))}
          </Tooltip>
        )}
      </div>
      <DataTable caption={caption} head={[category, ...series.map((s) => s.label)]} rows={data.map((d) => [formatCategory(d[category]), ...series.map((s) => Number(d[s.key]) || 0)])} />
    </div>
  );
}

/** Lines over time with a crosshair tooltip. */
export function LineChart<T extends Record<string, unknown>>({ data, x, series, height = 240, caption, formatX = String }: { data: T[]; x: keyof T & string; series: SeriesDef<T>[]; height?: number; caption: string; formatX?: (v: unknown) => string }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const pad = { top: 14, right: 64, bottom: 26, left: 32 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const max = niceMax(Math.max(1, ...data.flatMap((d) => series.map((s) => Number(d[s.key]) || 0))));
  const step = data.length > 1 ? innerW / (data.length - 1) : 0;
  const px = (i: number) => pad.left + i * step;
  const py = (v: number) => pad.top + innerH - (v / max) * innerH;
  const ticks = [0, max / 2, max];
  const labelEvery = Math.ceil(data.length / Math.max(1, Math.floor(innerW / 70)));
  const last = data.length - 1;

  // End labels: drop them when the two endpoints would collide; legend and tooltip still carry identity.
  const ends = series.map((s) => py(Number(data[last]?.[s.key]) || 0));
  const collide = ends.length === 2 && Math.abs(ends[0] - ends[1]) < 14;

  return (
    <div>
      <div className="mb-3">
        <Legend items={series.map((s, i) => ({ label: s.label, color: SERIES[i], line: true }))} />
      </div>
      <div
        ref={ref}
        className="relative w-full min-w-0 overflow-hidden"
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const i = Math.round((e.clientX - rect.left - pad.left) / (step || 1));
          setHover(Math.min(Math.max(i, 0), last));
        }}
      >
        <svg width={width} height={height} role="img" aria-label={caption} className="block">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={pad.left} x2={width - pad.right} y1={py(t)} y2={py(t)} stroke={GRID} strokeWidth={1} />
              <text x={pad.left - 8} y={py(t)} dy="0.32em" textAnchor="end" fontSize={11} fill={AXIS_TEXT} className="tabular">
                {compact(t)}
              </text>
            </g>
          ))}
          {data.map((d, i) =>
            i % labelEvery === 0 ? (
              <text key={i} x={px(i)} y={height - 8} textAnchor="middle" fontSize={11} fill={AXIS_TEXT}>
                {formatX(d[x])}
              </text>
            ) : null,
          )}
          {series.map((s, j) => (
            <polyline
              key={s.key}
              fill="none"
              stroke={SERIES[j]}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              points={data.map((d, i) => `${px(i)},${py(Number(d[s.key]) || 0)}`).join(" ")}
            />
          ))}
          {series.map((s, j) => (
            <g key={s.key}>
              <circle cx={px(last)} cy={ends[j]} r={4} fill={SERIES[j]} stroke={SURFACE} strokeWidth={2} />
              {!collide && (
                <text x={px(last) + 9} y={ends[j]} dy="0.32em" fontSize={11} fill="#0C1727" fontWeight={600}>
                  {s.label}
                </text>
              )}
            </g>
          ))}
          {hover !== null && (
            <g>
              <line x1={px(hover)} x2={px(hover)} y1={pad.top} y2={pad.top + innerH} stroke="#9AA4B2" strokeWidth={1} />
              {series.map((s, j) => (
                <circle key={s.key} cx={px(hover)} cy={py(Number(data[hover][s.key]) || 0)} r={4.5} fill={SERIES[j]} stroke={SURFACE} strokeWidth={2} />
              ))}
            </g>
          )}
        </svg>
        {hover !== null && data[hover] && (
          <Tooltip x={px(hover)} y={pad.top + 12} width={width}>
            <p className="mb-1 font-semibold">{formatX(data[hover][x])}</p>
            {series.map((s, j) => (
              <TooltipRow key={s.key} color={SERIES[j]} label={s.label} value={Number(data[hover][s.key]) || 0} />
            ))}
          </Tooltip>
        )}
      </div>
      <DataTable caption={caption} head={[x, ...series.map((s) => s.label)]} rows={data.map((d) => [formatX(d[x]), ...series.map((s) => Number(d[s.key]) || 0)])} />
    </div>
  );
}

/** Ranked horizontal bars for one measure. Value at the bar tip, in ink. */
export function BarList({ data, caption, format = (v: number) => String(v), detail, onSelect }: { data: { label: string; value: number; detail?: string }[]; caption: string; format?: (v: number) => string; detail?: string; onSelect?: (label: string) => void }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.value));
  if (!data.length) return <p className="py-6 text-center text-sm text-ink-muted">No data for this period.</p>;
  return (
    <div>
      <ul className="space-y-2.5" aria-label={caption}>
        {data.map((d, i) => (
          <li
            key={d.label}
            className={`group relative grid grid-cols-[minmax(90px,38%)_1fr] items-center gap-3 rounded-md ${onSelect ? "cursor-pointer" : ""}`}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            onClick={() => onSelect?.(d.label)}
          >
            <span className="truncate text-[13px] text-ink" title={d.label}>
              {d.label}
            </span>
            <span className="flex items-center gap-2">
              <svg className="h-[14px] flex-1" viewBox="0 0 100 14" preserveAspectRatio="none" aria-hidden>
                <path d={hbarPath(0, 0, Math.max(0.8, (d.value / max) * 100), 14, 2)} fill={SERIES[0]} opacity={hover === null || hover === i ? 1 : 0.55} />
              </svg>
              <span className="tabular w-16 shrink-0 text-right text-[13px] font-semibold text-ink">{format(d.value)}</span>
            </span>
            {hover === i && d.detail && (
              <span className="pointer-events-none absolute right-0 top-0 z-10 -translate-y-full rounded-lg bg-navy px-2.5 py-1.5 text-xs text-white shadow-raised">
                {d.detail}
              </span>
            )}
          </li>
        ))}
      </ul>
      {detail && <p className="mt-3 text-xs text-ink-subtle">{detail}</p>}
      <DataTable caption={caption} head={["Item", "Value"]} rows={data.map((d) => [d.label, format(d.value)])} />
    </div>
  );
}

/** Single-series columns (e.g. ageing buckets). The title names the measure, so no legend. */
export function Columns({ data, caption, height = 180, onSelect, unit = "parcels" }: { data: { label: string; value: number }[]; caption: string; height?: number; onSelect?: (label: string) => void; unit?: string }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const pad = { top: 22, right: 4, bottom: 26, left: 4 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const max = Math.max(1, ...data.map((d) => d.value));
  const band = innerW / Math.max(1, data.length);
  const barW = Math.min(24, band * 0.5);
  const y = (v: number) => pad.top + innerH - (v / max) * innerH;
  return (
    <div ref={ref} className="relative w-full min-w-0 overflow-hidden" onMouseLeave={() => setHover(null)}>
      <svg width={width} height={height} role="img" aria-label={caption} className="block">
        <line x1={pad.left} x2={width - pad.right} y1={pad.top + innerH} y2={pad.top + innerH} stroke={GRID} strokeWidth={1} />
        {data.map((d, i) => {
          const cx = pad.left + band * i + band / 2;
          return (
            <g key={d.label} className={onSelect ? "cursor-pointer" : undefined} onClick={() => onSelect?.(d.label)}>
              {hover === i && <rect x={pad.left + band * i} y={pad.top - 18} width={band} height={innerH + 18} fill="#0C1727" opacity={0.04} rx={6} />}
              <path d={barPath(cx - barW / 2, y(d.value), barW, pad.top + innerH - y(d.value))} fill={SERIES[0]} />
              <text x={cx} y={y(d.value) - 6} textAnchor="middle" fontSize={12} fontWeight={600} fill="#0C1727" className="tabular">
                {d.value}
              </text>
              <text x={cx} y={height - 8} textAnchor="middle" fontSize={11} fill={AXIS_TEXT}>
                {d.label}
              </text>
              <rect x={pad.left + band * i} y={pad.top - 18} width={band} height={innerH + 18} fill="transparent" onMouseEnter={() => setHover(i)} />
            </g>
          );
        })}
      </svg>
      {hover !== null && (
        <Tooltip x={pad.left + band * hover + band / 2} y={y(data[hover].value) - 18} width={width}>
          <p className="font-semibold">{data[hover].label}</p>
          <p className="tabular text-white/80">
            {data[hover].value} {unit}
          </p>
        </Tooltip>
      )}
      <DataTable caption={caption} head={["Bucket", unit.charAt(0).toUpperCase() + unit.slice(1)]} rows={data.map((d) => [d.label, d.value])} />
    </div>
  );
}

/** Stage durations as one segmented bar: booking→pickup, pickup→arrival, arrival→receipt. */
export function StageBar({ stages }: { stages: { label: string; minutes: number | null }[] }) {
  const total = stages.reduce((s, x) => s + (x.minutes ?? 0), 0);
  const tones = SERIES;
  if (!total) return <p className="text-sm text-ink-muted">Not enough completed parcels in this period.</p>;
  return (
    <div>
      <div className="flex h-4 w-full gap-[2px] overflow-hidden rounded" role="img" aria-label={stages.map((s) => `${s.label}: ${Math.round(s.minutes ?? 0)} minutes`).join(", ")}>
        {stages.map((s, i) => (
          <div key={s.label} style={{ width: `${((s.minutes ?? 0) / total) * 100}%`, background: tones[i] }} title={`${s.label}: ${Math.round(s.minutes ?? 0)} min`} />
        ))}
      </div>
      <div className="mt-3">
        <Legend items={stages.map((s, i) => ({ label: `${s.label} · ${minutes(s.minutes)}`, color: tones[i] }))} />
      </div>
    </div>
  );
}
