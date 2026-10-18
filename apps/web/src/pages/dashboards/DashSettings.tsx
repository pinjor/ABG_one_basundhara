import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ROLE_LABELS, Role } from "@bsc/shared";
import { useAuthStore } from "../../store/auth";
import { Ico } from "./icons";
import { displayName } from "../../lib/user";
import { Card, Fields } from "./widgets";

type Prefs = { email: boolean; desktop: boolean; sound: boolean; digest: boolean; compact: boolean };

const DEFAULTS: Prefs = { email: true, desktop: true, sound: false, digest: true, compact: false };
const KEY = "bsc-dash-prefs";

export function loadPrefs(): Prefs {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? "{}") };
  } catch {
    return DEFAULTS;
  }
}

const HELP: Record<string, { links: [string, string, string][]; faq: [string, string][] }> = {
  [Role.FINANCE_CONTROLLER]: {
    links: [
      ["file", "Invoices", "/finance?feature=invoice-management"],
      ["card", "Payments", "/finance?feature=payment-tracking"],
      ["download", "Receivables", "/finance?feature=receivable-management"],
      ["bars", "Financial reports", "/finance?feature=financial-reports"],
    ],
    faq: [
      ["How do I mark an invoice as paid?", "On the dashboard open the three-dot menu on an invoice row and choose Mark as paid, or open the Invoices desk for the full record."],
      ["Where do the revenue figures come from?", "The dashboard shows the presentation set for 2024. Desks under Modules hold the live records."],
      ["How do I change the reporting period?", "Use the date selector at the top right of the Revenue Dashboard, or the pill on each chart."],
    ],
  },
  [Role.HR_MANAGER]: {
    links: [
      ["users", "Employee directory", "/hrm?feature=employee-master"],
      ["calCheck", "Leave requests", "/hrm?feature=leave-management"],
      ["calendar", "Attendance", "/hrm?feature=attendance-management"],
      ["bars", "HR reports", "/hrm?feature=hr-reports"],
    ],
    faq: [
      ["How do I approve a leave request?", "Open Leave Management from the sidebar or the Apply Leave quick action."],
      ["Can I see work anniversaries?", "Yes. Switch the tab on the Upcoming Birthdays card to Work Anniversaries."],
      ["How do I add an employee?", "Use Add Employee under Quick Actions. It opens the employee master desk."],
    ],
  },
  [Role.BOOKINGS_OFFICER]: {
    links: [
      ["calendar", "Online booking", "/bookings?feature=online-booking"],
      ["ticket", "Ticketing", "/ticketing"],
      ["stadium", "Venue schedule", "/bookings?feature=availability-calendar"],
      ["trend", "Reports", "/ticketing/reports"],
    ],
    faq: [
      ["How do I approve a booking?", "Open the three-dot menu on a pending row in Recent Bookings and choose Approve, or use Approve Booking under Quick Actions."],
      ["How do I record a payment?", "Choose Mark as paid in the row menu. The payment badge and Booking Overview update at once."],
      ["Where is the venue calendar?", "Quick Actions → View Venue Schedule."],
    ],
  },
  [Role.SECURITY_MANAGER]: {
    links: [
      ["camera", "Live cameras", "/security#live"],
      ["alert", "Incidents", "/security#incidents"],
      ["lock", "Access control", "/security#access"],
      ["report", "Reports", "/security#reports"],
    ],
    faq: [
      ["How do I acknowledge an alert?", "Click an alert under Recent Alerts and choose Acknowledge. It moves to resolved and the alert count drops."],
      ["Can I filter the site map?", "Pick a zone in the list beside the map. Pins outside the zone fade out."],
      ["Is Lockdown Mode connected?", "Not in this prototype. It runs as a drill and shows a banner until you end it."],
    ],
  },
  [Role.CHAIRMAN]: {
    links: [
      ["wallet", "Revenue & Finance", "/chairman/revenue"],
      ["users", "People & HR", "/chairman/hr"],
      ["ticket", "Booking & Ticketing", "/chairman/booking"],
      ["shield", "Security", "/chairman/security"],
    ],
    faq: [
      ["Can I change records from the Chairman view?", "No. The Chairman view is view only. Department teams approve, pay and update records from their own dashboards."],
      ["How do I see a department in detail?", "Click any headline figure or use Departments in the menu. It opens that department's dashboard in view-only mode."],
      ["Where do the city-wide figures come from?", "The overview shows the year-to-date presentation set. Each department dashboard holds its own detail."],
    ],
  },
};

function Toggle({ label, hint, on, onChange }: { label: string; hint: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="toggle">
      <span>
        <b>{label}</b>
        <small>{hint}</small>
      </span>
      <input type="checkbox" checked={on} onChange={(e) => onChange(e.target.checked)} />
      <i aria-hidden />
    </label>
  );
}

export function DashSettings({ kind, roleKey }: { kind: "settings" | "help"; roleKey?: string }) {
  const user = useAuthStore((s) => s.user);
  const role = roleKey ?? user?.role ?? Role.FINANCE_CONTROLLER;
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs);
  const [saved, setSaved] = useState(false);
  const [openQ, setOpenQ] = useState(0);
  const help = HELP[role] ?? HELP[Role.FINANCE_CONTROLLER];

  useEffect(() => {
    if (!saved) return;
    const t = window.setTimeout(() => setSaved(false), 2000);
    return () => window.clearTimeout(t);
  }, [saved]);

  const set = (k: keyof Prefs) => (v: boolean) => setPrefs((p) => ({ ...p, [k]: v }));

  if (kind === "help")
    return (
      <div className="page-free">
        <div className="title-row">
          <div>
            <h2 className="dash-title"><span>Help</span> &amp; Support</h2>
            <p className="sub">Answers for your desk, shortcuts, and who to contact.</p>
          </div>
        </div>
        <div className="free-grid">
          <Card title="Common questions" icon="help">
            <div className="faq">
              {help.faq.map(([q, a], i) => (
                <div key={q} className={`faq-i ${openQ === i ? "on" : ""}`}>
                  <button type="button" aria-expanded={openQ === i} onClick={() => setOpenQ(openQ === i ? -1 : i)}>
                    {q}
                    <Ico name="chevron" className="pill-ico" />
                  </button>
                  {openQ === i && <p>{a}</p>}
                </div>
              ))}
            </div>
          </Card>
          <div className="free-col">
            <Card title="Shortcuts" icon="external">
              <div className="qa">
                {help.links.map(([icon, label, to]) => (
                  <Link key={label} to={to} className="quick">
                    <Ico name={icon} className="q-ico" />
                    <span>{label}</span>
                    <Ico name="chevronR" className="q-go" />
                  </Link>
                ))}
              </div>
            </Card>
            <Card title="Contact support" icon="mail">
              <Fields
                rows={[
                  ["IT helpdesk", <a key="m" className="view-all" href="mailto:support@bsc.com.bd">support@bsc.com.bd</a>],
                  ["Phone", <a key="p" className="view-all" href="tel:+8809612000000">+880 9612 000000</a>],
                  ["Hours", "Sun – Thu, 9:00 AM – 6:00 PM"],
                ]}
              />
            </Card>
          </div>
        </div>
      </div>
    );

  return (
    <div className="page-free">
      <div className="title-row">
        <div>
          <h2 className="dash-title"><span>Account</span> Settings</h2>
          <p className="sub">Your profile and how the dashboard notifies you.</p>
        </div>
      </div>
      <div className="free-grid">
        <Card title="Profile" icon="user">
          <div className="acct">
            <span className="acct-ava">{displayName(user, "U").split(" ").map((p) => p[0]).slice(0, 2).join("")}</span>
            <div className="acct-id">
              <b>{displayName(user)}</b>
              {displayName(user) !== (ROLE_LABELS[role as Role] ?? role) && <span>{ROLE_LABELS[role as Role] ?? role}</span>}
              <small><Ico name="mail" />{user?.email}</small>
            </div>
          </div>
          <Fields
            rows={[
              ["Name", displayName(user, "—")],
              ["Email", user?.email ?? "—"],
              ["Role", ROLE_LABELS[role as Role] ?? role],
              ["Password", "Managed by the IT helpdesk"],
            ]}
          />
        </Card>
        <Card title="Notifications & display" icon="bell">
          <form
            className="prefs"
            onSubmit={(e) => {
              e.preventDefault();
              localStorage.setItem(KEY, JSON.stringify(prefs));
              window.dispatchEvent(new Event("bsc-prefs"));
              setSaved(true);
            }}
          >
            <Toggle label="Email alerts" hint="Send critical items to your inbox" on={prefs.email} onChange={set("email")} />
            <Toggle label="Desktop notifications" hint="Show the bell badge for new items" on={prefs.desktop} onChange={set("desktop")} />
            <Toggle label="Alert sound" hint="Play a tone for critical alerts" on={prefs.sound} onChange={set("sound")} />
            <Toggle label="Daily digest" hint="Morning summary at 8:00 AM" on={prefs.digest} onChange={set("digest")} />
            <Toggle label="Compact tables" hint="Tighter rows in dashboard tables" on={prefs.compact} onChange={set("compact")} />
            <div className="prefs-foot">
              <button type="button" className="panel-btn" onClick={() => setPrefs(DEFAULTS)}>Reset</button>
              <button type="submit" className="btn-gold">{saved ? <><Ico name="check" className="pop-ico" />Saved</> : "Save changes"}</button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
