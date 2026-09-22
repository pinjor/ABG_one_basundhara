import { useEffect, useState } from "react";
import { ROLE_LABELS, Role } from "@bsc/shared";
import { useAuthStore } from "../../store/auth";
import { Button } from "../ui/Button";

export function TopBar({ title }: { title: string }) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-border bg-surface/95 px-6 backdrop-blur">
      <h1 className="font-display text-xl font-semibold tracking-wide text-text">{title}</h1>
      <div className="flex items-center gap-5">
        <span className="font-display text-sm tabular-nums text-text-dim" suppressHydrationWarning>
          {now.toLocaleTimeString("en-GB", { hour12: false })}
        </span>
        <div className="text-right">
          <div className="text-sm font-medium text-text">{user?.name ?? "Guest"}</div>
          <div className="text-xs text-text-dimmer">{ROLE_LABELS[(user?.role as Role) ?? Role.READ_ONLY_EXECUTIVE]}</div>
        </div>
        <Button variant="ghost" onClick={logout}>
          Sign out
        </Button>
      </div>
    </header>
  );
}
