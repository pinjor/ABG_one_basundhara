import type { ReactNode } from "react";

export interface Column<T> {
  header: string;
  accessor: (row: T) => ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  keyFor: (row: T) => string;
  onRowClick?: (row: T) => void;
  emptyLabel?: string;
}

export function DataTable<T>({ columns, rows, keyFor, onRowClick, emptyLabel = "No records found." }: DataTableProps<T>) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gold/20 bg-surface-2 shadow-gold-sm">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-gold/15 bg-surface-2 text-left text-xs uppercase tracking-[0.16em] text-gold/80">
            {columns.map((col) => (
              <th key={col.header} className="px-4 py-3 font-medium">
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-10 text-center text-text-dim">
                {emptyLabel}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={keyFor(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                onKeyDown={
                  onRowClick
                    ? (e) => {
                        if (e.key === "Enter") onRowClick(row);
                      }
                    : undefined
                }
                className={`border-b border-border-soft last:border-0 ${
                  onRowClick ? "cursor-pointer hover:bg-hover focus-visible:bg-gold/10" : ""
                }`}
              >
                {columns.map((col) => (
                  <td key={col.header} className={`px-4 py-3 text-text ${col.className ?? ""}`}>
                    {col.accessor(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
