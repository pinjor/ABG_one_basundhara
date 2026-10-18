import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ROLE_LABELS, Role } from "@bsc/shared";
import { useAuthStore } from "../../store/auth";
import { BrandLogo } from "../../components/BrandLogo";
import { loadPrefs } from "./DashSettings";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { PageMotion, popVariants } from "../../lib/motion";
import { Ico } from "./icons";
import { useOutside } from "./widgets";
import "./dash.css";

export type DashItem = { label: string; to: string; icon: string; section?: string };
type Note = { title: string; detail: string; to: string };

const FINANCE: DashItem[] = [
  { label: "Dashboard", to: "/finance", icon: "home" },
  { label: "Accounts", to: "/finance?feature=chart-of-accounts", icon: "bank", section: "Modules" },
  { label: "Finance", to: "/finance?feature=revenue-management", icon: "wallet" },
  { label: "Reports", to: "/finance?feature=financial-reports", icon: "bars" },
  { label: "Budget Management", to: "/finance?feature=budget-management", icon: "pie" },
  { label: "Invoices", to: "/finance?feature=invoice-management", icon: "file" },
  { label: "Payments", to: "/finance?feature=payment-tracking", icon: "card" },
  { label: "Receivables", to: "/finance?feature=receivable-management", icon: "download" },
  { label: "Payables", to: "/finance?feature=payable-management", icon: "upload" },
  { label: "Settings", to: "/finance?view=settings", icon: "gear", section: "System" },
  { label: "Help & Support", to: "/finance?view=help", icon: "help" },
];

const HR: DashItem[] = [
  { label: "Dashboard", to: "/hrm", icon: "home" },
  { label: "Employees", to: "/hrm?feature=employee-master", icon: "users" },
  { label: "Attendance", to: "/hrm?feature=attendance-management", icon: "calendar" },
  { label: "Leave Management", to: "/hrm?feature=leave-management", icon: "calCheck" },
  { label: "Recruitment", to: "/hrm?feature=recruitment-management", icon: "userPlus" },
  { label: "Performance", to: "/hrm?feature=performance-management", icon: "target" },
  { label: "Training & Development", to: "/hrm?feature=training-management", icon: "cap" },
  { label: "Payroll", to: "/hrm?feature=payroll-integration", icon: "money" },
  { label: "Reports", to: "/hrm?feature=hr-reports", icon: "bars" },
  { label: "Settings", to: "/hrm?view=settings", icon: "gear" },
];

const BOOKING: DashItem[] = [
  { label: "Dashboard", to: "/bookings", icon: "home" },
  { label: "Booking", to: "/bookings?feature=online-booking", icon: "calendar" },
  { label: "Tickets", to: "/ticketing", icon: "ticket" },
  { label: "Members", to: "/membership", icon: "users" },
  { label: "Venues", to: "/facilities", icon: "stadium" },
  { label: "Events", to: "/ticketing/events", icon: "star" },
  { label: "Reports", to: "/ticketing/reports", icon: "trend" },
  { label: "Settings", to: "/bookings?view=settings", icon: "gear" },
];

const SECURITY: DashItem[] = [
  { label: "Dashboard", to: "/security", icon: "camera" },
  { label: "Live Monitoring", to: "/security#live", icon: "camera" },
  { label: "AI Analytics", to: "/security#analytics", icon: "sparkle" },
  { label: "Incidents", to: "/security#incidents", icon: "alert" },
  { label: "Access Control", to: "/security#access", icon: "lock" },
  { label: "People Tracking", to: "/security#people", icon: "pin" },
  { label: "Vehicle Monitoring", to: "/security#vehicles", icon: "car" },
  { label: "Perimeter Security", to: "/security#perimeter", icon: "shield" },
  { label: "Reports", to: "/security#reports", icon: "report" },
  { label: "Settings", to: "/security?view=settings", icon: "gear" },
];

const CHAIR: DashItem[] = [
  { label: "Chairman Overview", to: "/chairman", icon: "crown" },
  { label: "Revenue & Finance", to: "/chairman/revenue", icon: "wallet", section: "Departments" },
  { label: "People & HR", to: "/chairman/hr", icon: "users" },
  { label: "Booking & Ticketing", to: "/chairman/booking", icon: "ticket" },
  { label: "Security", to: "/chairman/security", icon: "shield" },
  { label: "Settings", to: "/chairman?view=settings", icon: "gear", section: "System" },
  { label: "Help & Support", to: "/chairman?view=help", icon: "help" },
];

type Spec = { items: DashItem[]; home: string; search: string; art: string; artPos: string; side: string; notes: Note[] };

const SPEC: Record<string, Spec> = {
  [Role.FINANCE_CONTROLLER]: {
    items: FINANCE,
    home: "/finance",
    search: "Search here...",
    art: "/dash/rail-revenue.jpg",
    artPos: "center bottom",
    side: "16.5vw",
    notes: [
      { title: "Invoice INV-2024-1255 is overdue", detail: "Urban Bites · ৳ 950,000", to: "/finance?feature=invoice-management" },
      { title: "Partial payment received", detail: "Fitness World · INV-2024-1257", to: "/finance?feature=payment-tracking" },
      { title: "Budget review due Friday", detail: "Budget Management", to: "/finance?feature=budget-management" },
    ],
  },
  [Role.HR_MANAGER]: {
    items: HR,
    home: "/hrm",
    search: "Search employees, departments, etc...",
    art: "/dash/rail-hr.jpg",
    artPos: "center bottom",
    side: "15.5vw",
    notes: [
      { title: "3 leave requests waiting", detail: "Leave Management", to: "/hrm?feature=leave-management" },
      { title: "Arafat Karim's birthday", detail: "Oct 03 · Operations", to: "/hrm?feature=employee-master" },
      { title: "2 interviews scheduled today", detail: "Recruitment", to: "/hrm?feature=recruitment-management" },
    ],
  },
  [Role.BOOKINGS_OFFICER]: {
    items: BOOKING,
    home: "/bookings",
    search: "Search bookings, members, venues...",
    art: "/dash/rail-booking.jpg",
    artPos: "54% bottom",
    side: "15vw",
    notes: [
      { title: "224 bookings pending approval", detail: "Booking", to: "/bookings?feature=online-booking" },
      { title: "Peak hours 6 PM - 9 PM tonight", detail: "Venue schedule", to: "/bookings?feature=availability-calendar" },
      { title: "BSC-2025-004 unpaid", detail: "Arif Karim · Padel Court", to: "/bookings?feature=online-booking" },
    ],
  },
  [Role.SECURITY_MANAGER]: {
    items: SECURITY,
    home: "/security",
    search: "Search cameras, incidents, zones...",
    art: "/dash/rail-security.jpg",
    artPos: "28% bottom",
    side: "16vw",
    notes: [
      { title: "Unauthorized access · Main Gate", detail: "CAM-001 · 2 min ago", to: "/security#incidents" },
      { title: "Perimeter breach · East Zone", detail: "CAM-201 · 41 min ago", to: "/security#perimeter" },
      { title: "Crowd density high · Stadium", detail: "CAM-078 · 25 min ago", to: "/security#people" },
    ],
  },
  [Role.CHAIRMAN]: {
    items: CHAIR,
    home: "/chairman",
    search: "Search departments...",
    art: "/dash/rail-booking.jpg",
    artPos: "54% bottom",
    side: "15.5vw",
    notes: [
      { title: "Net surplus up 22% this year", detail: "Revenue & Finance", to: "/chairman/revenue" },
      { title: "International Football Tournament in 12 days", detail: "Main Stadium · 12-28 Jun", to: "/chairman/booking" },
      { title: "Indoor Arena under maintenance", detail: "Expected back 30 May", to: "/chairman#maintenance" },
    ],
  },
};

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");
}

function onItem(to: string, pathname: string, search: string, hash: string) {
  const url = new URL(to, "http://local");
  if (url.hash) return pathname === url.pathname && hash === url.hash;
  if (url.search) return pathname === url.pathname && search === url.search;
  return pathname === url.pathname && !search && !hash;
}

function withView(home: string, view: string) {
  return `${home}?view=${view}`;
}

export function Bell({ notes, badge }: { notes: Note[]; badge: boolean }) {
  const [open, setOpen] = useState(false);
  const [read, setRead] = useState<string[]>([]);
  const ref = useOutside(open, () => setOpen(false));
  const navigate = useNavigate();
  const unread = notes.filter((n) => !read.includes(n.title)).length;
  return (
    <div className="pick" ref={ref}>
      <button type="button" className="dash-bell" aria-label={`Notifications, ${unread} unread`} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <Ico name="bell" />
        {badge && unread > 0 && <i className="dot">{unread}</i>}
      </button>
      <AnimatePresence>
      {open && (
        <motion.div className="pop right panel" variants={popVariants} initial="hidden" animate="show" exit="exit" style={{ transformOrigin: "top right" }}>
          <div className="panel-top">
            <p className="panel-h">Notifications</p>
            {unread > 0 && (
              <button type="button" className="link-btn" onClick={() => setRead(notes.map((n) => n.title))}>
                Mark all read
              </button>
            )}
          </div>
          <ul>
            {notes.map((n) => (
              <li key={n.title}>
                <button
                  type="button"
                  className={`note ${read.includes(n.title) ? "" : "unread"}`}
                  onClick={() => {
                    setRead((r) => [...new Set([...r, n.title])]);
                    setOpen(false);
                    navigate(n.to);
                  }}
                >
                  <b>{n.title}</b>
                  <span>{n.detail}</span>
                </button>
              </li>
            ))}
          </ul>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
}

export function DashClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);
  const day = now.toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
  const time = now.toLocaleTimeString("en-GB", { hour12: false });
  return (
    <time className="dash-date dash-clock" dateTime={now.toISOString()} aria-label={`${day}, ${time}`}>
      <Ico name="calendar" />
      <span className="clock-day">{day}</span>
      <b className="clock-time">{time}</b>
    </time>
  );
}

export function Account({ name, email, role, home }: { name: string; email: string; role: string; home: string }) {
  const [open, setOpen] = useState(false);
  const ref = useOutside(open, () => setOpen(false));
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const go = (to: string) => {
    setOpen(false);
    navigate(to);
  };
  const signOut = () => {
    setOpen(false);
    logout();
    navigate("/login", { replace: true });
  };
  return (
    <div className="pick acct-wrap" ref={ref}>
      <button type="button" className={`dash-user ${open ? "on" : ""}`} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span className="dash-ava">{initials(name)}</span>
        <span className="dash-who">
          <b>{name}</b>
          <small>{role}</small>
        </span>
        <Ico name="chevron" className="pill-ico" />
      </button>
      <AnimatePresence>
      {open && (
        <motion.div className="pop right panel acct-pop" role="menu" aria-label="My account" variants={popVariants} initial="hidden" animate="show" exit="exit" style={{ transformOrigin: "top right" }}>
          <div className="acct">
            <span className="acct-ava">{initials(name)}</span>
            <div className="acct-id">
              <b>{name}</b>
              <span>{role}</span>
              <small><Ico name="mail" />{email}</small>
            </div>
          </div>
          <div className="acct-actions">
            <button type="button" role="menuitem" onClick={() => go(home)}><Ico name="home" className="pop-ico" />Dashboard</button>
            <button type="button" role="menuitem" onClick={() => go(withView(home, "settings"))}><Ico name="gear" className="pop-ico" />Account settings</button>
            <button type="button" role="menuitem" onClick={() => go(withView(home, "help"))}><Ico name="help" className="pop-ico" />Help &amp; Support</button>
            <button type="button" role="menuitem" onClick={signOut}><Ico name="swap" className="pop-ico" />Switch account</button>
            <button type="button" role="menuitem" className="danger" onClick={signOut}><Ico name="logout" className="pop-ico" />Sign out</button>
          </div>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
}

const RAIL_KEY = "bsc-rail-mini";

export function dashSpec(role: string) {
  return SPEC[role] ?? SPEC[Role.FINANCE_CONTROLLER];
}

export function DashFrame({ children, light = false, roleKey, photo: photoProp }: { children: ReactNode; light?: boolean; roleKey?: string; photo?: boolean }) {
  const user = useAuthStore((s) => s.user);
  const role = roleKey ?? user?.role ?? Role.FINANCE_CONTROLLER;
  const spec = SPEC[role] ?? SPEC[Role.FINANCE_CONTROLLER];
  const { pathname, search, hash } = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [mini, setMini] = useState(() => localStorage.getItem(RAIL_KEY) === "1");
  const [query, setQuery] = useState("");
  const [prefs, setPrefs] = useState(loadPrefs);
  const toggleMini = () =>
    setMini((m) => {
      localStorage.setItem(RAIL_KEY, m ? "0" : "1");
      return !m;
    });
  useEffect(() => {
    const sync = () => setPrefs(loadPrefs());
    window.addEventListener("bsc-prefs", sync);
    return () => window.removeEventListener("bsc-prefs", sync);
  }, []);
  const items = spec.items.filter((item) => item.label.toLowerCase().includes(query.trim().toLowerCase()));
  const photo = photoProp ?? (!light && role !== Role.FINANCE_CONTROLLER);
  const name = user?.name ?? "User";
  const roleLabel = ROLE_LABELS[role as Role] ?? role;

  return (
    <div className={`dash${photo ? " photo" : ""}${light ? " is-light" : ""}${prefs.compact ? " compact" : ""}${mini ? " mini" : ""}`} style={{ ["--side" as string]: spec.side }}>
      {open && <button type="button" className="dash-scrim" aria-label="Close menu" onClick={() => setOpen(false)} />}
      <aside className={`dash-side ${open ? "open" : ""}`}>
        <img src={spec.art} alt="" className="dash-art" style={{ objectPosition: spec.artPos }} />
        <div className="dash-brand">
          <Link to={spec.home} aria-label="Dashboard home" onClick={() => setOpen(false)}>
            <BrandLogo size="sm" />
          </Link>
          <button type="button" className="dash-close" aria-label="Close menu" onClick={() => setOpen(false)}><Ico name="x" /></button>
        </div>
        <LayoutGroup id="rail">
        <nav className="dash-nav" aria-label="Dashboard">
          {items.map((item) => (
            <div key={item.to + item.label}>
              {item.section && !query && <p className="dash-sec">{item.section}</p>}
              <Link
                to={item.to}
                title={mini ? item.label : undefined}
                className={`dash-link ${onItem(item.to, pathname, search, hash) ? "on" : ""}`}
                onClick={() => {
                  setOpen(false);
                  setQuery("");
                }}
              >
                {onItem(item.to, pathname, search, hash) && (
                  <motion.i layoutId="rail-pill" className="dash-pill" transition={{ type: "spring", stiffness: 420, damping: 34 }} />
                )}
                <Ico name={item.icon} />
                <span>{item.label}</span>
              </Link>
            </div>
          ))}
          {items.length === 0 && <p className="dash-empty">No menu item matches.</p>}
        </nav>
        </LayoutGroup>
        <p className="dash-mark">People<br />Build<br />Champions</p>
      </aside>
      <div className="dash-main">
        <button
          type="button"
          className="rail-tog"
          aria-label={mini ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!mini}
          title={mini ? "Expand sidebar" : "Collapse sidebar"}
          onClick={toggleMini}
        >
          <Ico name="chevron" />
        </button>
        <header className="dash-top">
          <button type="button" className="dash-menu" aria-label="Open menu" onClick={() => setOpen(true)}>
            <Ico name="menu" />
          </button>
          <form
            className="dash-search"
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              if (!query.trim() || !items[0]) return;
              navigate(items[0].to);
              setQuery("");
            }}
          >
            <Ico name="search" />
            <input
              value={query}
              placeholder={spec.search}
              onChange={(e) => {
                setQuery(e.target.value);
                if (e.target.value && window.innerWidth <= 900) setOpen(true);
              }}
              aria-label="Search menu"
            />
            {query && (
              <button type="button" className="search-x" aria-label="Clear search" onClick={() => setQuery("")}><Ico name="x" /></button>
            )}
          </form>
          <div className="dash-tools">
            {role === Role.CHAIRMAN && pathname !== "/chairman" && (
              <Link to="/chairman" className="dash-back"><Ico name="crown" /><span>Chairman view</span></Link>
            )}
            <DashClock />
            <Bell notes={spec.notes} badge={prefs.desktop} />
            <Account name={name} email={user?.email ?? ""} role={roleLabel} home={spec.home} />
          </div>
        </header>
        <div className={`dash-body ${light ? "light" : ""}`}>
          <PageMotion id={pathname + search} className="dash-anim">{children}</PageMotion>
        </div>
      </div>
    </div>
  );
}
