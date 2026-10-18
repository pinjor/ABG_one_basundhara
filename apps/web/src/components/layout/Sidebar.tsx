import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { NAV, COMMAND_CENTRE, ROLE_MODULE_ACCESS, Role, canAccessModule } from "@bsc/shared";
import { BrandLogo } from "../BrandLogo";
import { Icon, type IconName } from "../ui/Icon";
import { useAuthStore } from "../../store/auth";
import { useI18n } from "../../lib/i18n";

const ICONS: Record<string, IconName> = {
  "command-centre": "stadium",
  "ticketing-overview": "chart",
  "ticketing-events": "calendar",
  "ticketing-orders": "ticket",
  "ticketing-payments": "card",
  "ticketing-scan": "gate",
  "ticketing-reports": "chart",
  finance: "card",
  procurement: "chart",
  hrm: "users",
  calendar: "calendar",
  approvals: "check",
  tasks: "bell",
  zones: "stadium",
  facilities: "stadium",
  bookings: "ticket",
  gates: "gate",
  visitors: "users",
  membership: "users",
};

export function Sidebar({
  collapsed,
  mobileOpen,
  onNavigate,
  onToggleCollapse,
}: {
  collapsed: boolean;
  mobileOpen: boolean;
  onNavigate: () => void;
  onToggleCollapse: () => void;
}) {
  const { t } = useI18n();
  const user = useAuthStore((s) => s.user);
  const role = user?.role ?? Role.READ_ONLY_EXECUTIVE;
  const location = useLocation();
  const [openKeys, setOpenKeys] = useState<string[]>([]);
  const activeFeature = new URLSearchParams(location.search).get("feature");

  useEffect(() => {
    const current = NAV.flatMap((group) => group.modules).find((mod) => location.pathname === mod.path);
    if (current) setOpenKeys((keys) => (keys.includes(current.key) ? keys : [...keys, current.key]));
  }, [location.pathname]);

  return (
    <aside
      className={`nav-rail fixed inset-y-0 left-0 z-40 flex h-full shrink-0 flex-col transition-transform duration-200 lg:static ${
        mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      } ${collapsed ? "w-[248px] lg:w-[76px]" : "w-[248px]"}`}
    >
      <div className="flex items-center px-3 py-4">
        <BrandLogo size={collapsed ? "xs" : "sm"} align="start" className={collapsed ? "max-w-[3.25rem] overflow-hidden" : ""} />
      </div>
      <nav className="thin-scroll min-h-0 flex-1 overflow-y-auto px-2 py-3" aria-label="Operations">
        {ROLE_MODULE_ACCESS[role as Role]?.modules === "*" && (
          <NavLink
            to="/"
            end
            title={COMMAND_CENTRE.label}
            onClick={onNavigate}
            className={({ isActive }) =>
              `mb-3 flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${isActive ? "bg-[#e6b54a] font-semibold text-[#1a1408]" : "text-[#f6f3ea] hover:bg-white/10"}`
            }
          >
            <Icon name="stadium" className="h-4 w-4 shrink-0" />
            <span className={collapsed ? "lg:sr-only" : ""}>{COMMAND_CENTRE.label}</span>
          </NavLink>
        )}
        {NAV.map((group) => {
          const visible = group.modules.filter((mod) => canAccessModule(role, mod.key));
          if (visible.length === 0) return null;
          return (
            <div key={group.key} className="mb-4">
              <div className={`mb-1 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#e8c15a] ${collapsed ? "lg:sr-only" : ""}`}>{group.label}</div>
              {visible.map((mod) => {
                const expanded = openKeys.includes(mod.key) && !collapsed;
                const moduleActive = location.pathname === mod.path;
                return (
                  <div key={mod.key} className="mb-0.5">
                    <div className="flex items-center">
                      <NavLink
                        to={mod.path}
                        title={mod.label}
                        onClick={onNavigate}
                        className={`flex min-h-10 min-w-0 flex-1 items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                          moduleActive ? "bg-[#e6b54a] font-semibold text-[#1a1408]" : "text-[#f6f3ea] hover:bg-white/10"
                        }`}
                      >
                        <Icon name={ICONS[mod.key] ?? "ticket"} className="h-4 w-4 shrink-0" />
                        <span className={`truncate ${collapsed ? "lg:sr-only" : ""}`}>{mod.label}</span>
                      </NavLink>
                      {!collapsed && (
                        <button type="button" aria-label={`${expanded ? "Collapse" : "Expand"} ${mod.label}`} className="rounded-md px-2 py-2 text-xs text-[#f6f3ea]/80 hover:text-[#f6f3ea]" onClick={() => setOpenKeys((keys) => (keys.includes(mod.key) ? keys.filter((item) => item !== mod.key) : [...keys, mod.key]))}>
                          {expanded ? "−" : "+"}
                        </button>
                      )}
                    </div>
                    <AnimatePresence initial={false}>
                    {expanded && (
                      <motion.div
                        className="ml-7 overflow-hidden border-l border-[#e8c15a]/35 pl-2"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                      >
                        {mod.features.map((feature) => (
                          <NavLink key={feature.key} to={`${mod.path}?feature=${feature.key}`} onClick={onNavigate} className={`block truncate rounded-md px-2 py-1.5 text-[12px] ${moduleActive && activeFeature === feature.key ? "text-[#e8c15a]" : "text-[#f6f3ea]/80 hover:text-[#f6f3ea]"}`}>
                            {feature.label}
                          </NavLink>
                        ))}
                      </motion.div>
                    )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          );
        })}
      </nav>
      <div className="p-4">
        <button type="button" className="hidden min-h-10 w-full rounded-md px-2 text-left text-xs text-[#f6f3ea]/80 hover:text-[#f6f3ea] lg:block" onClick={onToggleCollapse}>
          {collapsed ? t("shell.expand") : t("shell.collapse")}
        </button>
        {!collapsed && (
          <p className="nav-rail-mark mt-2 text-[15px] uppercase">
            People
            <br />
            Build
            <br />
            Champions
          </p>
        )}
      </div>
    </aside>
  );
}
