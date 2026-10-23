import { useState, type ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
  Building2,
  CalendarClock,
  CalendarDays,
  CarFront,
  ClipboardCheck,
  FileBadge,
  FileSpreadsheet,
  IdCard,
  LayoutDashboard,
  LogOut,
  Menu,
  Newspaper,
  Package,
  Palmtree,
  Plane,
  PlugZap,
  Radio,
  ScrollText,
  Search,
  ShieldCheck,
  TriangleAlert,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { Capability, ROLE_LABEL, RoleCode, extractGatePass, extractQrToken } from "@abg-dispatch/shared";
import { openScanned } from "../pages/QrLanding";
import { toast } from "./toast";
import { useAuth } from "../lib/auth";
import { api } from "../lib/api";
import { cx } from "./ui";
import { NotificationBell, QuickCreate } from "./HeaderMenus";
import { useIncidentSummary } from "../lib/lookups";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  cap?: string;
  badge?: "incidents";
  /** Small label after the item, e.g. "New". */
  tag?: string;
}

const NAV: { section: string; items: NavItem[] }[] = [
  {
    section: "Main console",
    items: [{ to: "/", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    // The group's agreed order, the same as the services on the phone.
    section: "Services",
    items: [
      { to: "/notices", label: "Notice board", icon: Newspaper, cap: Capability.NOTICE_READ },
      { to: "/appointments", label: "Request for Appointment", icon: CalendarClock, cap: Capability.APPOINTMENT_REQUEST, tag: "New" },
      { to: "/incidents", label: "Incident record", icon: TriangleAlert, cap: Capability.INCIDENT_VIEW, badge: "incidents" },
      { to: "/licences", label: "Regulatory Affairs", icon: FileBadge, cap: Capability.LICENCE_VIEW },
      { to: "/audits", label: "Audit", icon: ClipboardCheck, tag: "New" },
      { to: "/parcels", label: "Office parcel", icon: Package, cap: Capability.DASHBOARD_VIEW },
      { to: "/visitors", label: "Visitor Management", icon: IdCard, cap: Capability.VISITOR_INVITE },
      { to: "/leave", label: "Leave apply", icon: Palmtree, cap: Capability.LEAVE_APPLY, tag: "New" },
      { to: "/pool-car", label: "Pool car request", icon: CarFront, cap: Capability.FLEET_REQUEST },
      { to: "/tours", label: "Official Tour Request", icon: Plane, cap: Capability.TOUR_REQUEST },
    ],
  },
  {
    section: "Insight",
    items: [
      { to: "/parcels/control-room", label: "Parcel control room", icon: Radio, cap: Capability.DASHBOARD_VIEW },
      { to: "/analytics", label: "Analytics", icon: BarChart3, cap: Capability.ANALYTICS_VIEW },
      { to: "/reports", label: "Reports", icon: FileSpreadsheet, cap: Capability.REPORTS_EXPORT },
      { to: "/audit", label: "Audit log", icon: ScrollText, cap: Capability.AUDIT_VIEW },
    ],
  },
  {
    section: "Administration",
    items: [
      { to: "/config", label: "Offices & rules", icon: Building2, cap: Capability.DASHBOARD_VIEW },
      { to: "/people", label: "People & access", icon: Users, cap: Capability.DASHBOARD_VIEW },
      { to: "/integrations", label: "Integrations", icon: PlugZap, cap: Capability.DASHBOARD_VIEW },
      { to: "/security", label: "My security", icon: ShieldCheck },
    ],
  },
];

/** Reference-number prefixes and the module page that searches them. */
const REFERENCE_ROUTES: [string, string][] = [
  ["ABG-NB-", "/notices"],
  ["ABG-AP-", "/appointments"],
  ["INC-", "/incidents"],
  ["ABG-AU-", "/audits"],
  ["VP-", "/visitors"],
  ["ABG-LV-", "/leave"],
  ["PC-", "/pool-car"],
  ["ABG-TR-", "/tours"],
];

function primaryRole(roles: string[]): string {
  const order: RoleCode[] = [
    RoleCode.SUPER_ADMIN,
    RoleCode.EXECUTIVE,
    RoleCode.HEAD_OFFICE_ADMIN,
    RoleCode.BRANCH_ADMIN,
    RoleCode.HR_FINANCE,
    RoleCode.FLEET_MANAGER,
    RoleCode.COMPLIANCE_OFFICER,
    RoleCode.EXECUTIVE_ASSISTANT,
    RoleCode.AUDITOR,
    RoleCode.DISPATCH_OFFICER,
    RoleCode.SECURITY_GUARD,
  ];
  const r = order.find((x) => roles.includes(x));
  return r ? ROLE_LABEL[r] : "Staff";
}

export function Layout({ children }: { children: ReactNode }) {
  const profile = useAuth((s) => s.profile)!;
  const clear = useAuth((s) => s.clear);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const caps = new Set(profile.capabilities);
  const incidents = useIncidentSummary(undefined, caps.has(Capability.INCIDENT_VIEW));
  const pending = incidents.data?.counts.REPORTED ?? 0;
  const initials = profile.displayName
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("");
  const scope = profile.roleScopes.find((r) => r.branch)?.branch?.name;

  const signOut = async () => {
    await api.post("/auth/logout").catch(() => undefined);
    clear();
    qc.clear();
    navigate("/login");
  };

  const sidebar = (
    <nav className="flex h-full flex-col bg-midnight text-platinum" aria-label="Main">
      <div className="flex items-center gap-3 px-5 pb-5 pt-6">
        <img src="/brand/abg-logo-light.png" alt="Anvir Bashundhara Group" className="h-11 w-auto" />
      </div>
      <div className="mx-5 mb-3 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5">
        <p className="font-display text-[15px] font-extrabold tracking-wide text-platinum-bright">ABG ONE</p>
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[#8DB8FF]">Group operations portal</p>
      </div>
      <div className="mb-4 flex items-center gap-3 border-y border-white/10 px-5 py-3">
        <div className="relative">
          <div className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-platinum-bright to-platinum font-display text-sm font-extrabold text-navy ring-2 ring-white/20">{initials}</div>
          <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-midnight bg-success" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-platinum-bright">{profile.displayName}</p>
          <p className="truncate text-[11.5px] text-platinum-deep">{profile.employee?.designation ?? primaryRole(profile.roles)}</p>
        </div>
      </div>
      <div className="flex-1 space-y-5 overflow-y-auto px-3 pb-4">
        {NAV.map((group) => {
          const items = group.items.filter((i) => !i.cap || caps.has(i.cap));
          if (!items.length) return null;
          return (
            <div key={group.section}>
              <p className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-platinum-deep/70">{group.section}</p>
              <ul className="space-y-0.5">
                {items.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.to === "/" || item.to === "/parcels"}
                      onClick={() => setOpen(false)}
                      className={({ isActive }) =>
                        cx(
                          "group flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition",
                          isActive ? "bg-platinum text-navy shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]" : "text-platinum/80 hover:bg-white/[0.06] hover:text-platinum-bright",
                        )
                      }
                    >
                      <item.icon className="h-[18px] w-[18px]" aria-hidden />
                      {item.label}
                      {item.tag && <span className="ml-auto rounded-full bg-active px-2 text-[10px] font-bold uppercase leading-[18px] tracking-wide text-white">{item.tag}</span>}
                      {item.badge === "incidents" && pending > 0 && (
                        <span className="tabular ml-auto rounded-full bg-pending px-1.5 text-[11px] font-bold leading-[18px] text-white" aria-label={`${pending} pending`}>
                          {pending}
                        </span>
                      )}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-2 border-t border-white/10 px-5 py-3.5">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11.5px] font-semibold text-platinum-deep">
            {primaryRole(profile.roles)}
            {scope ? ` · ${scope}` : ""}
          </p>
          <p className="truncate text-[10.5px] text-platinum-deep/70">Anvir Bashundhara Group © {new Date().getFullYear()}</p>
        </div>
        <button onClick={signOut} className="rounded-lg p-2 text-platinum-deep hover:bg-white/10 hover:text-platinum-bright" aria-label="Sign out" title="Sign out">
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </nav>
  );

  return (
    <div className="flex min-h-screen">
      <aside className="no-print hidden w-[264px] shrink-0 bg-midnight lg:block">
        <div className="sticky top-0 h-screen">{sidebar}</div>
      </aside>
      {open && (
        <div className="no-print fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-midnight/60" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-[264px]">
            {sidebar}
            <button className="absolute right-3 top-5 rounded-lg p-1.5 text-platinum" onClick={() => setOpen(false)} aria-label="Close menu">
              <X className="h-5 w-5" />
            </button>
          </aside>
        </div>
      )}
      <div className="min-w-0 flex-1">
      <header className="no-print sticky top-0 z-30 border-b border-line bg-white/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-3 px-4 sm:px-6 lg:px-8">
          <button className="rounded-lg p-2 text-navy lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </button>
          <form
            className="relative max-w-xl flex-1"
            onSubmit={(e) => {
              e.preventDefault();
              const q = search.trim();
              if (!q) return;
              // A desk scanner "types" the code's URL: gate passes open their verification page.
              const pass = extractGatePass(q);
              if (pass) {
                setSearch("");
                navigate(pass.kind === "VISITOR" ? `/visitors/pass/${pass.token}` : `/pool-car/pass/${pass.token}`);
                return;
              }
              // A parcel label URL opens that parcel directly.
              if (extractQrToken(q)) {
                openScanned(q)
                  .then((id) => (setSearch(""), navigate(`/parcels/${id}`)))
                  .catch(toast.error);
                return;
              }
              // Reference numbers go to their module; anything else searches parcels.
              const upper = q.toUpperCase();
              const target = REFERENCE_ROUTES.find(([prefix]) => upper.startsWith(prefix))?.[1] ?? "/parcels";
              navigate(`${target}?q=${encodeURIComponent(q)}`);
            }}
          >
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subtle" aria-hidden />
            <input
              className="input h-10 rounded-full bg-surface pl-9"
              placeholder="Search notices, appointments, audits, parcels, visitors, leave…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search"
            />
          </form>
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <div className="hidden sm:block">
              <QuickCreate />
            </div>
            <div className="sm:hidden">
              <QuickCreate compact />
            </div>
            <NotificationBell />
            <div className="hidden border-l border-line pl-3 text-right xl:block">
              <p className="text-sm font-bold leading-tight text-navy">{profile.employee?.branch.name ?? "Anvir Bashundhara Group"}</p>
              <p className="flex items-center justify-end gap-1 text-[11px] text-ink-muted">
                <CalendarDays className="h-3 w-3" aria-hidden />
                {new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Dhaka", weekday: "short", day: "numeric", month: "short" }).format(new Date())} · Dhaka
              </p>
            </div>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
