import { useState, type ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

export function AppShell({ title, children }: { title: string; children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem("bsc-sidebar") === "collapsed");

  function toggleCollapsed() {
    setCollapsed((value) => {
      localStorage.setItem("bsc-sidebar", value ? "open" : "collapsed");
      return !value;
    });
  }

  return (
    <div className="app-shell flex h-screen overflow-hidden">
      <a href="#content" className="sr-only-focusable absolute left-3 top-3 z-50 rounded bg-[var(--brand-gold)] px-3 py-2 text-sm text-[var(--text-on-gold)]">
        Skip to content
      </a>
      {mobileOpen && (
        <button type="button" className="fixed inset-0 z-30 bg-black/60 lg:hidden" aria-label="Close menu" onClick={() => setMobileOpen(false)} />
      )}
      <Sidebar collapsed={collapsed} mobileOpen={mobileOpen} onNavigate={() => setMobileOpen(false)} onToggleCollapse={toggleCollapsed} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar title={title} onMenu={() => setMobileOpen(true)} />
        <main id="content" className="thin-scroll min-w-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">{children}</main>
      </div>
    </div>
  );
}
