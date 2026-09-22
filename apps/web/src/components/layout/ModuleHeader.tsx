import type { ReactNode } from "react";

export function ModuleHeader({ purpose, action }: { purpose: string; action?: ReactNode }) {
  return (
    <div className="mb-5 flex items-start justify-between gap-4">
      <p className="max-w-2xl text-sm text-text-dim">{purpose}</p>
      {action}
    </div>
  );
}
