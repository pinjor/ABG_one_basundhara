import { CheckCircle2, CircleAlert, X } from "lucide-react";
import { create } from "zustand";

interface Toast {
  id: number;
  tone: "success" | "danger";
  message: string;
}

const useToasts = create<{ items: Toast[]; push: (t: Omit<Toast, "id">) => void; dismiss: (id: number) => void }>((set) => ({
  items: [],
  push: (t) => {
    const id = Date.now() + Math.random();
    set((s) => ({ items: [...s.items, { ...t, id }] }));
    setTimeout(() => set((s) => ({ items: s.items.filter((x) => x.id !== id) })), 5000);
  },
  dismiss: (id) => set((s) => ({ items: s.items.filter((x) => x.id !== id) })),
}));

export const toast = {
  success: (message: string) => useToasts.getState().push({ tone: "success", message }),
  error: (err: unknown) => useToasts.getState().push({ tone: "danger", message: err instanceof Error ? err.message : String(err) }),
};

export function ToastHost() {
  const { items, dismiss } = useToasts();
  return (
    <div className="no-print fixed bottom-5 right-5 z-[60] flex w-[360px] max-w-[calc(100vw-2rem)] flex-col gap-2" role="status" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className="flex items-start gap-3 rounded-xl border border-line bg-white px-4 py-3 text-sm shadow-raised">
          {t.tone === "success" ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" /> : <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-danger" />}
          <p className="flex-1 whitespace-pre-line text-ink">{t.message}</p>
          <button className="text-ink-subtle hover:text-ink" onClick={() => dismiss(t.id)} aria-label="Dismiss">
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
