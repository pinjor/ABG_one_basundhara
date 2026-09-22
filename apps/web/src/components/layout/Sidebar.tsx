import { NavLink } from "react-router-dom";
import { NAV, COMMAND_CENTRE, ROLE_MODULE_ACCESS, Role } from "@bsc/shared";
import { useAuthStore } from "../../store/auth";

function canAccess(role: string, moduleKey: string): boolean {
  const access = ROLE_MODULE_ACCESS[role as Role];
  if (!access) return false;
  return access.modules === "*" || access.modules.includes(moduleKey);
}

export function Sidebar() {
  const user = useAuthStore((s) => s.user);
  const role = user?.role ?? Role.READ_ONLY_EXECUTIVE;

  return (
    <aside className="flex h-screen w-[260px] shrink-0 flex-col border-r border-border bg-surface">
      <div className="border-b border-border-soft px-5 py-5">
        <div className="font-display text-lg font-bold leading-tight text-gold">BASHUNDHARA</div>
        <div className="font-display text-sm font-semibold leading-tight text-text-dim">SPORTS CITY</div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <NavLink
          to={COMMAND_CENTRE.path}
          end
          className={({ isActive }) =>
            `mb-4 flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${
              isActive ? "bg-gold/15 text-gold" : "text-text-dim hover:bg-surface-2 hover:text-text"
            }`
          }
        >
          Command Centre
        </NavLink>

        {NAV.map((group) => (
          <div key={group.key} className="mb-5">
            <div className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-text-dimmer">
              {group.label}
            </div>
            <div className="flex flex-col gap-0.5">
              {group.modules.map((mod) => {
                const allowed = canAccess(role, mod.key);
                return (
                  <NavLink
                    key={mod.key}
                    to={mod.path}
                    className={({ isActive }) =>
                      `flex items-center justify-between rounded-md px-3 py-2 text-sm ${
                        isActive ? "bg-gold/15 text-gold" : "text-text-dim hover:bg-surface-2 hover:text-text"
                      } ${!allowed ? "opacity-40" : ""}`
                    }
                  >
                    <span>{mod.label}</span>
                    {mod.phase > 1 && (
                      <span className="rounded border border-border-soft px-1.5 py-0.5 text-[10px] text-text-dimmer">
                        Phase {mod.phase}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
