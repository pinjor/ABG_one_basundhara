import type { ReactNode } from "react";
import { Button } from "./Button";

interface StatusKanbanProps<T> {
  columns: string[];
  items: T[];
  statusOf: (item: T) => string;
  keyFor: (item: T) => string;
  renderCard: (item: T) => ReactNode;
  nextStatusFor: (item: T) => string | null;
  onAdvance: (item: T, nextStatus: string) => void;
  advancing?: boolean;
}

/** A linear status pipeline board (Section 2.3) — used where a module's data is a queue, not a table. */
export function StatusKanban<T>({
  columns,
  items,
  statusOf,
  keyFor,
  renderCard,
  nextStatusFor,
  onAdvance,
  advancing,
}: StatusKanbanProps<T>) {
  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}>
      {columns.map((col) => {
        const colItems = items.filter((item) => statusOf(item) === col);
        return (
          <div key={col} className="rounded-lg border border-border bg-surface p-3">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-text-dimmer">{col}</h4>
              <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs text-text-dim">{colItems.length}</span>
            </div>
            <div className="space-y-2">
              {colItems.map((item) => {
                const next = nextStatusFor(item);
                return (
                  <div key={keyFor(item)} className="rounded-md border border-border-soft bg-surface-2 p-3 text-sm">
                    {renderCard(item)}
                    {next && (
                      <Button
                        variant="secondary"
                        className="mt-2 w-full justify-center text-xs"
                        onClick={() => onAdvance(item, next)}
                        disabled={advancing}
                      >
                        Advance to {next}
                      </Button>
                    )}
                  </div>
                );
              })}
              {colItems.length === 0 && <p className="text-xs text-text-dimmer">Nothing here.</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
