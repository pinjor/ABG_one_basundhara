import type { ZoneDto } from "@bsc/shared";
import { toneForStatus } from "../../components/ui/StatusBadge";

const DOT_TONE_BG: Record<string, string> = {
  success: "bg-teal",
  warning: "bg-gold",
  danger: "bg-red",
  info: "bg-blue",
  neutral: "bg-text-dimmer",
};

/** Schematic complex map — zones placed by normalized map coordinates (Section 2.3). */
export function ZoneMap({ zones, onSelect }: { zones: ZoneDto[]; onSelect: (zone: ZoneDto) => void }) {
  const placed = zones.filter((z) => z.mapX != null && z.mapY != null);

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <h3 className="mb-3 font-display text-base font-semibold text-text">Complex map</h3>
      <div className="relative aspect-[16/10] w-full overflow-hidden rounded-md border border-border-soft bg-surface-2">
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "linear-gradient(rgba(35,45,64,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(35,45,64,0.6) 1px, transparent 1px)",
            backgroundSize: "10% 10%",
          }}
        />
        {placed.map((zone) => {
          const tone = toneForStatus(zone.status);
          const occupancyPct = zone.capacity > 0 ? Math.min(100, Math.round((zone.liveOccupancy / zone.capacity) * 100)) : 0;
          return (
            <button
              key={zone.id}
              onClick={() => onSelect(zone)}
              aria-label={`${zone.name} — ${zone.status}, ${occupancyPct}% occupancy`}
              className="group absolute -translate-x-1/2 -translate-y-1/2 focus-visible:z-20"
              style={{ left: `${(zone.mapX ?? 0) * 100}%`, top: `${(zone.mapY ?? 0) * 100}%` }}
            >
              <span
                className={`block h-3.5 w-3.5 rounded-full ring-2 ring-bg ${DOT_TONE_BG[tone]} transition-transform group-hover:scale-125`}
              />
              <span className="pointer-events-none absolute left-1/2 top-full z-10 mt-1.5 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-surface px-2 py-1 text-xs text-text shadow-lg group-hover:block group-focus-visible:block">
                {zone.name} · {occupancyPct}%
              </span>
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-4 text-xs text-text-dimmer">
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-teal" /> Operational</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-gold" /> Maintenance</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red" /> Restricted</span>
      </div>
    </div>
  );
}
