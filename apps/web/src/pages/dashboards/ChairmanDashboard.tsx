import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Role } from "@bsc/shared";
import { useAuthStore } from "../../store/auth";
import { BrandLogo } from "../../components/BrandLogo";
import { Account, Bell, DashClock, dashSpec } from "./DashFrame";
import { loadPrefs } from "./DashSettings";
import { AnimatePresence, motion } from "framer-motion";
import { CountUp, EASE, HOVER, itemVariants, pageVariants } from "../../lib/motion";
import { Ico } from "./icons";
import { displayName } from "../../lib/user";
import { Badge, Bars, Card, Cols, Donut, Fields, Line, MONTHS, Pick, Sheet, ViewAll } from "./widgets";

type Facility = { name: string; icon: string; src: string; credit?: string };
type Slot = { time: string; title: string; venue: string; icon: string; status: "Ongoing" | "Upcoming"; lead: string; booked: string };
type Event = { title: string; dates: string; venue: string; src: string; credit?: string; tickets: string; status: "Pending approval" | "Approved" };
type Project = { name: string; pct: number; due: string; budget: string; lead: string };

const FACILITIES: Facility[] = [
  { name: "Main Stadium", icon: "stadium", src: "/dash/chair-strip.jpg" },
  { name: "Football Fields", icon: "football", src: "/dash/cam-stadium.jpg" },
  { name: "Indoor Arena", icon: "building", src: "/dash/fac-indoor.jpg", credit: "Photo: Rhinen · CC BY-SA 4.0 · Wikimedia Commons" },
  { name: "Aquatic Complex", icon: "swim", src: "/dash/fac-aquatic.jpg", credit: "Photo: EKranharst · CC BY-SA 3.0 · Wikimedia Commons" },
  { name: "Tennis Complex", icon: "tennis", src: "/dash/fac-tennis.jpg" },
  { name: "Cricket Ground", icon: "bat", src: "/dash/fac-cricket.jpg", credit: "Photo: Javs1233 · CC BY-SA 4.0 · Wikimedia Commons" },
  { name: "Training Facilities", icon: "cap", src: "/dash/cam-futsal.jpg" },
];

const SCHEDULE: Slot[] = [
  { time: "08:00 AM - 10:00 AM", title: "Football Training", venue: "Field 1", icon: "football", status: "Ongoing", lead: "Coach Rafiq Ahmed", booked: "42 players" },
  { time: "10:30 AM - 12:00 PM", title: "Tennis Coaching", venue: "Tennis Complex", icon: "tennis", status: "Ongoing", lead: "Coach Nadia Islam", booked: "16 juniors" },
  { time: "02:00 PM - 05:00 PM", title: "Corporate Event", venue: "Multipurpose Hall", icon: "users", status: "Upcoming", lead: "Events team", booked: "320 guests" },
  { time: "06:30 PM - 08:00 PM", title: "Cricket Practice", venue: "Cricket Ground", icon: "bat", status: "Upcoming", lead: "Coach Tamim Hasan", booked: "28 players" },
  { time: "07:00 PM - 09:00 PM", title: "Basketball League", venue: "Indoor Arena", icon: "basket", status: "Upcoming", lead: "League office", booked: "1,200 seats" },
];

const EVENTS: Event[] = [
  { title: "Bashundhara International Football Tournament 2025", dates: "12 - 28 Jun 2025", venue: "Main Stadium", src: "/dash/ev-football.jpg", credit: "Photo: Vyacheslav Evdokimov · CC BY-SA 3.0 · Wikimedia Commons", tickets: "38,400 sold", status: "Approved" },
  { title: "National Swimming Championship", dates: "05 - 08 Jul 2025", venue: "Aquatic Complex", src: "/dash/ev-swim.jpg", credit: "Photo: Rufino Uribe · CC BY-SA 2.0 · Wikimedia Commons", tickets: "4,120 sold", status: "Pending approval" },
  { title: "South Asia Youth Athletics Meet", dates: "15 - 18 Aug 2025", venue: "Athletics Track", src: "/dash/ev-athletics.jpg", tickets: "9,860 sold", status: "Pending approval" },
  { title: "BSC Corporate Sports Fest", dates: "10 - 12 Sep 2025", venue: "Multipurpose Hall", src: "/dash/ev-corporate.jpg", tickets: "64 teams", status: "Approved" },
];

const PROJECTS: Project[] = [
  { name: "East Stand Extension", pct: 78, due: "Dec 2025", budget: "৳ 64 Cr", lead: "Civil Works" },
  { name: "Indoor Arena Renovation", pct: 65, due: "Nov 2025", budget: "৳ 22 Cr", lead: "Facilities" },
  { name: "Aquatic Complex Phase 2", pct: 42, due: "Mar 2026", budget: "৳ 38 Cr", lead: "Projects Office" },
  { name: "Additional Parking Zone", pct: 55, due: "Dec 2025", budget: "৳ 12 Cr", lead: "Infrastructure" },
  { name: "Elite Training Center", pct: 28, due: "Jun 2026", budget: "৳ 46 Cr", lead: "Sports Science" },
];

const MAINT: [string, "Operational" | "Under Maintenance"][] = [
  ["Main Stadium", "Operational"],
  ["Football Fields", "Operational"],
  ["Cricket Ground", "Operational"],
  ["Indoor Arena", "Under Maintenance"],
  ["Aquatic Complex", "Operational"],
  ["Tennis Complex", "Operational"],
];

const HIGHLIGHTS: [string, string, string, string][] = [
  ["trophy", "New sponsorship deal signed with XYZ Group", "৳ 5.0 Cr · 3 years", "Today"],
  ["users", "Record 22,430 visitors in a single day", "18% above previous record", "Today"],
  ["football", "Preparation for International Football Tournament 2025", "Progress 82%", "Yesterday"],
  ["box", "New training equipment installed at Indoor Arena", "42 stations commissioned", "Yesterday"],
];

const REVENUE: Record<string, { labels: string[]; values: number[]; axis: string[]; max: number }> = {
  Monthly: { labels: MONTHS, values: [3.1, 3.4, 3.8, 4.2, 4.9, 4.4, 5.0, 5.3, 4.6, 4.4, 5.1, 6.8], axis: ["8 Cr", "6 Cr", "4 Cr", "2 Cr", "0"], max: 8 },
  Quarterly: { labels: ["Q1", "Q2", "Q3", "Q4"], values: [10.3, 13.5, 14.9, 16.3], axis: ["20 Cr", "15 Cr", "10 Cr", "5 Cr", "0"], max: 20 },
};

const VISITORS: Record<string, { labels: string[]; values: number[]; axis: string[]; max: number }> = {
  Monthly: { labels: MONTHS, values: [8.6, 10.2, 11.4, 12.8, 14.1, 13.6, 15.9, 17.3, 18.6, 20.1, 19.4, 22.4], axis: ["25K", "20K", "15K", "10K", "5K", "0"], max: 25 },
  Quarterly: { labels: ["Q1", "Q2", "Q3", "Q4"], values: [30.2, 40.5, 51.8, 61.9], axis: ["80K", "60K", "40K", "20K", "0"], max: 80 },
};

const UTIL = [
  ["Football Fields", 92, "football"],
  ["Cricket Ground", 76, "bat"],
  ["Indoor Arena", 68, "building"],
  ["Aquatic Complex", 81, "swim"],
  ["Tennis Complex", 70, "tennis"],
  ["Athletics Track", 65, "run"],
  ["Multipurpose Hall", 58, "layers"],
] as const;

const SEGMENTS = [
  ["Events & Tournaments", 38, "#f2b81d"],
  ["Membership & Training", 22, "#d99a12"],
  ["Facility Rental", 18, "#b07a10"],
  ["Food & Beverage", 10, "#ffd977"],
  ["Merchandise", 7, "#8a5f0b"],
  ["Others", 5, "#5b4a26"],
] as const;

const MLink = motion.create(Link);

function ChKpi({ icon, label, value, delta, to, children }: { icon: string; label: string; value?: string; delta?: string; to: string; children?: ReactNode }) {
  return (
    <MLink to={to} className="ch-kpi" aria-label={`${label}${value ? `: ${value}` : ""}`} variants={itemVariants} whileHover={HOVER}>
      <span className="ch-kpi-ico"><Ico name={icon} /></span>
      <span className="ch-kpi-t">
        <span className="ch-kpi-l">{label}<small>(Year to Date)</small></span>
        {value && <b className="ch-kpi-v"><CountUp value={value} /></b>}
        {delta && <em><Ico name="arrowUp" />{delta}<small>vs. last year</small></em>}
        {children}
      </span>
    </MLink>
  );
}

function OccRing({ pct }: { pct: number }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  return (
    <span className="ch-ring">
      <svg viewBox="0 0 100 100" aria-hidden>
        <defs>
          <linearGradient id="chRing" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="#ffe08a" />
            <stop offset="1" stopColor="#c8890f" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r={r} fill="none" stroke="#2a2418" strokeWidth="8" />
        <circle cx="50" cy="50" r={r} fill="none" stroke="url(#chRing)" strokeWidth="8" strokeLinecap="round" strokeDasharray={`${(pct / 100) * c} ${c}`} transform="rotate(-90 50 50)" className="seg" />
      </svg>
      <b>{pct}%</b>
    </span>
  );
}

export function ChairmanDashboard() {
  const user = useAuthStore((s) => s.user);
  const spec = dashSpec(Role.CHAIRMAN);
  const { hash } = useLocation();
  const [prefs, setPrefs] = useState(loadPrefs);
  const [fac, setFac] = useState<Facility | null>(null);
  const [rev, setRev] = useState("Monthly");
  const [vis, setVis] = useState("Monthly");
  const [slot, setSlot] = useState<Slot | null>(null);
  const [events, setEvents] = useState(EVENTS);
  const [eventTitle, setEventTitle] = useState<string | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [sheet, setSheet] = useState<"approve" | "finance" | "projects" | null>(null);
  const event = events.find((e) => e.title === eventTitle) ?? null;
  const pending = events.filter((e) => e.status === "Pending approval");
  const approve = (title: string) => setEvents((es) => es.map((e): Event => (e.title === title ? { ...e, status: "Approved" } : e)));

  useEffect(() => {
    const sync = () => setPrefs(loadPrefs());
    window.addEventListener("bsc-prefs", sync);
    return () => window.removeEventListener("bsc-prefs", sync);
  }, []);

  useEffect(() => {
    const id = hash.replace("#", "");
    if (id) document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [hash]);

  const r = REVENUE[rev];
  const v = VISITORS[vis];

  return (
    <div className={`dash chair${prefs.compact ? " compact" : ""}`}>
      <header className="ch-top">
        <Link to="/chairman" className="ch-brand" aria-label="Chairman dashboard home">
          <BrandLogo size="sm" />
        </Link>
        <div className="ch-title">
          <h1>The Chairman Dashboard</h1>
          <p className="ch-sub">Bashundhara Sports City</p>
          <p className="ch-tag">People <i /> Sports <i /> Excellence <i /> A Brighter Bangladesh</p>
        </div>
        <div className="ch-strip" aria-hidden style={{ backgroundImage: "url(/dash/chair-strip.jpg)" }} />
        <div className="ch-tools">
          <DashClock />
          <span className="ch-weather" title="Dhaka · Partly Cloudy">
            <Ico name="cloudSun" />
            <b>32°C</b>
            <small>Dhaka<br />Partly Cloudy</small>
          </span>
          <Bell notes={spec.notes} badge={prefs.desktop} />
          <Account name={displayName(user, "Chairman")} email={user?.email ?? ""} role="Chairman" home="/chairman" />
        </div>
      </header>

      <motion.main className="ch-body" variants={pageVariants} initial="hidden" animate="show">
        <section className="ch-kpis" aria-label="Headline figures">
          <ChKpi icon="users" label="Total Visitors" value="1,28,450" delta="12%" to="/chairman/booking" />
          <ChKpi icon="calendar" label="Total Events" value="86" delta="18%" to="/chairman/booking" />
          <ChKpi icon="coins" label="Revenue" value="৳ 42.8 Cr" delta="16%" to="/chairman/revenue" />
          <ChKpi icon="pie" label="Operational Cost" value="৳ 18.6 Cr" delta="9%" to="/chairman/revenue" />
          <ChKpi icon="growth" label="Net Surplus" value="৳ 24.2 Cr" delta="22%" to="/chairman/revenue" />
          <MLink to="/chairman/booking" className="ch-kpi ch-occ" aria-label="Overall occupancy: 78%, target 85%" variants={itemVariants} whileHover={HOVER}>
            <OccRing pct={78} />
            <span className="ch-kpi-t">
              <span className="ch-kpi-l">Overall Occupancy<small>(Facilities)</small></span>
              <span className="ch-target">Target <b>85%</b></span>
            </span>
          </MLink>
          <ChKpi icon="user" label="Member Count" value="12,450" delta="14%" to="/chairman/hr">
            <small className="ch-kpi-n">Active members</small>
          </ChKpi>
        </section>

        <div className="ch-row ch-r1">
          <motion.section className="ch-hero" aria-label="Sports City overview" variants={itemVariants}>
            <AnimatePresence initial={false}>
              <motion.div
                key={fac?.src ?? "hero"}
                className="ch-hero-bg"
                style={{ backgroundImage: `url(${fac?.src ?? "/dash/chair-hero.jpg"})` }}
                initial={{ opacity: 0, scale: 1.08 }}
                animate={{ opacity: 1, scale: 1, transition: { opacity: { duration: 0.6 }, scale: { duration: 6, ease: EASE } } }}
                exit={{ opacity: 0, transition: { duration: 0.6 } }}
              />
            </AnimatePresence>
            <div className="ch-hero-copy">
              <h2>A World-Class<br />Sports Destination</h2>
              <p>For a Stronger Bangladesh</p>
            </div>
            <div className="ch-live">
              <p className="ch-live-h">
                <i className="ch-dot" />
                <span>Bashundhara Sports City<small>{fac ? fac.name : "Live View"}</small></span>
              </p>
              <ul>
                {FACILITIES.map((f) => (
                  <li key={f.name}>
                    <button type="button" className={fac?.name === f.name ? "on" : ""} aria-pressed={fac?.name === f.name} onClick={() => setFac(fac?.name === f.name ? null : f)}>
                      <Ico name={f.icon} />
                      {f.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <dl className="ch-stats">
              <div><dt><CountUp value="35+" /></dt><dd>Sports Facilities</dd></div>
              <div><dt><CountUp value="228" /> <small>Acres</small></dt><dd>Total Area</dd></div>
              <div><dt>5</dt><dd>International Standard Stadiums &amp; Arenas</dd></div>
              <div><dt>1</dt><dd>Iconic Sports City</dd></div>
            </dl>
            {fac?.credit && <p className="ch-credit">{fac.credit}</p>}
          </motion.section>

          <Card title="Today's Schedule" icon="clock" className="ch-card" extra={<ViewAll to="/chairman/booking" />}>
            <ul className="ch-sched">
              {SCHEDULE.map((s) => (
                <li key={s.title}>
                  <button type="button" onClick={() => setSlot(s)}>
                    <span className="ch-sched-ico"><Ico name={s.icon} /></span>
                    <span className="ch-sched-t">
                      <small>{s.time}</small>
                      <b>{s.title}</b>
                      <small>({s.venue})</small>
                    </span>
                    <span className={`ch-state ${s.status === "Ongoing" ? "on" : ""}`}>{s.status}</span>
                  </button>
                </li>
              ))}
            </ul>
          </Card>

          <Card title="Upcoming Major Events" icon="star" className="ch-card" extra={<ViewAll to="/chairman/booking" />}>
            <ul className="ch-events">
              {events.map((e) => (
                <li key={e.title}>
                  <button type="button" onClick={() => setEventTitle(e.title)}>
                    <img src={e.src} alt="" loading="lazy" />
                    <span>
                      <b>{e.title}</b>
                      <small><Ico name="calendar" />{e.dates}</small>
                      <small><Ico name="pin" />{e.venue}</small>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="ch-row ch-r2">
          <Card title="Revenue Overview" sub={rev === "Monthly" ? "(Last 12 Months)" : "(Quarterly)"} className="ch-card" extra={<Pick options={Object.keys(REVENUE)} value={rev} onChange={setRev} />}>
            <div className="ch-peak"><b>৳ {Math.max(...r.values)} Cr</b><small>{rev === "Monthly" ? "Dec 2024" : "Q4 2024"}</small></div>
            <Cols key={rev} labels={r.labels} axis={r.axis} max={r.max} series={[{ name: "Revenue (Cr)", color: "#e9a816", values: r.values }]} legend={false} />
          </Card>
          <Card title="Visitor Trend" sub={vis === "Monthly" ? "(Last 12 Months)" : "(Quarterly)"} className="ch-card" extra={<Pick options={Object.keys(VISITORS)} value={vis} onChange={setVis} />}>
            <div className="ch-peak"><b>{(Math.max(...v.values) * 1000).toLocaleString("en-IN")}</b><small>{vis === "Monthly" ? "Dec 2024" : "Q4 2024"}</small></div>
            <Line key={vis} labels={v.labels} axis={v.axis} max={v.max} legend={false} fmt={(n) => `${n}K visitors`} series={[{ name: "Visitors", color: "#f2b81d", values: v.values }]} />
          </Card>
          <Card title="Facility Utilization" sub="(Real-time)" className="ch-card" extra={<ViewAll to="/chairman/booking" />}>
            <Bars rows={UTIL.map(([label, pct, icon]) => ({ label, pct, icon, value: `${pct}%`, color: "linear-gradient(90deg, #8a5f0b, #f2b81d)" }))} />
          </Card>
          <Card title="Revenue by Segment" sub="(Year to Date)" className="ch-card" extra={<ViewAll to="/chairman/revenue" />}>
            <Donut center="৳ 42.8 Cr" caption="Total Revenue" thick={16} parts={SEGMENTS.map(([label, pct, color]) => ({ label, pct, color, value: `${pct}%` }))} />
          </Card>
        </div>

        <div className="ch-row ch-r3">
          <Card title="Key Highlights" icon="sparkle" className="ch-card">
            <ul className="ch-high">
              {HIGHLIGHTS.map(([icon, title, sub, when]) => (
                <li key={title}>
                  <span className="ch-sched-ico"><Ico name={icon} /></span>
                  <span><b>{title}</b><small>{sub}</small></span>
                  <time>{when}</time>
                </li>
              ))}
            </ul>
          </Card>
          <Card title="Ongoing Projects" icon="building" className="ch-card" extra={<button type="button" className="view-all" onClick={() => setSheet("projects")}>View All</button>}>
            <div className="ch-proj">
              <p className="ch-proj-h"><span>Project</span><span>Progress</span><span>Completion</span></p>
              {PROJECTS.map((p) => (
                <button key={p.name} type="button" onClick={() => setProject(p)}>
                  <span>{p.name}</span>
                  <span className="ch-bar"><motion.i initial={{ width: 0 }} animate={{ width: `${p.pct}%` }} transition={{ duration: 1.1, ease: EASE, delay: 0.4 }} /><em>{p.pct}%</em></span>
                  <span>{p.due}</span>
                </button>
              ))}
            </div>
          </Card>
          <Card id="maintenance" title="Maintenance Status" icon="wrench" className="ch-card" extra={<ViewAll to="/chairman/booking" />}>
            <ul className="ch-maint">
              {MAINT.map(([name, status]) => (
                <li key={name}>
                  <span>{name}</span>
                  <span className={`ch-st ${status === "Operational" ? "ok" : "warn"}`}><i />{status}</span>
                </li>
              ))}
            </ul>
          </Card>
          <Card title="Quick Actions" icon="crown" className="ch-card">
            <div className="ch-qa">
              <button type="button" onClick={() => setSheet("approve")}>
                <Ico name="calCheck" />
                <span>Approve Event</span>
                {pending.length > 0 && <i className="ch-badge">{pending.length}</i>}
              </button>
              <Link to="/chairman/revenue"><Ico name="file" /><span>View Reports</span></Link>
              <button type="button" onClick={() => setSheet("finance")}><Ico name="bars" /><span>Financial Summary</span></button>
              <button type="button" onClick={() => setSheet("projects")}><Ico name="report" /><span>Project Updates</span></button>
              <Link to="/chairman/hr"><Ico name="users" /><span>Member Insights</span></Link>
              <Link to="/chairman?view=settings"><Ico name="gear" /><span>Settings</span></Link>
            </div>
          </Card>
        </div>
      </motion.main>

      <Sheet open={!!slot} title={slot?.title ?? ""} onClose={() => setSlot(null)}>
        {slot && (
          <>
            <Fields
              rows={[
                ["Time", slot.time],
                ["Venue", slot.venue],
                ["Led by", slot.lead],
                ["Attendance", slot.booked],
                ["Status", <Badge key="s" tone={slot.status === "Ongoing" ? "gold" : "blue"}>{slot.status}</Badge>],
              ]}
            />
            <div className="sheet-actions">
              <Link to="/chairman/booking" className="panel-btn"><Ico name="external" className="pop-ico" />Open booking overview</Link>
            </div>
          </>
        )}
      </Sheet>

      <Sheet open={!!event} title={event?.title ?? ""} onClose={() => setEventTitle(null)} wide>
        {event && (
          <>
            <img src={event.src} alt={event.title} className="big-shot" />
            <div className="sheet-gap" />
            <Fields
              rows={[
                ["Dates", event.dates],
                ["Venue", event.venue],
                ["Tickets", event.tickets],
                ["Status", <Badge key="s" tone={event.status === "Approved" ? "green" : "gold"}>{event.status}</Badge>],
              ]}
            />
            {event.credit && <p className="credit">{event.credit}</p>}
            <div className="sheet-actions">
              {event.status !== "Approved" && (
                <button type="button" className="btn-gold" onClick={() => approve(event.title)}><Ico name="check" className="pop-ico" />Approve event</button>
              )}
              <Link to="/chairman/booking" className="panel-btn"><Ico name="ticket" className="pop-ico" />Ticket sales</Link>
            </div>
          </>
        )}
      </Sheet>

      <Sheet open={sheet === "approve"} title="Events awaiting approval" onClose={() => setSheet(null)}>
        {pending.length === 0 ? (
          <p className="sub">All upcoming events are approved.</p>
        ) : (
          <ul className="ch-approve">
            {pending.map((e) => (
              <li key={e.title}>
                <img src={e.src} alt="" />
                <span><b>{e.title}</b><small>{e.dates} · {e.venue}</small></span>
                <button type="button" className="btn-gold" onClick={() => approve(e.title)}><Ico name="check" className="pop-ico" />Approve</button>
              </li>
            ))}
          </ul>
        )}
      </Sheet>

      <Sheet open={sheet === "finance"} title="Financial summary · Year to date" onClose={() => setSheet(null)}>
        <Fields
          rows={[
            ["Revenue", "৳ 42.8 Cr (+16%)"],
            ["Operational cost", "৳ 18.6 Cr (+9%)"],
            ["Net surplus", "৳ 24.2 Cr (+22%)"],
            ["Largest segment", "Events & Tournaments · 38%"],
            ["Best month", "December 2024 · ৳ 6.8 Cr"],
          ]}
        />
        <div className="sheet-actions">
          <Link to="/chairman/revenue" className="btn-gold"><Ico name="external" className="pop-ico" />Open revenue dashboard</Link>
        </div>
      </Sheet>

      <Sheet open={sheet === "projects"} title="Project updates" onClose={() => setSheet(null)} wide>
        <div className="ch-proj wide">
          <p className="ch-proj-h"><span>Project</span><span>Progress</span><span>Completion</span><span>Budget</span></p>
          {PROJECTS.map((p) => (
            <button key={p.name} type="button" onClick={() => { setSheet(null); setProject(p); }}>
              <span>{p.name}</span>
              <span className="ch-bar"><i style={{ width: `${p.pct}%` }} /><em>{p.pct}%</em></span>
              <span>{p.due}</span>
              <span>{p.budget}</span>
            </button>
          ))}
        </div>
      </Sheet>

      <Sheet open={!!project} title={project?.name ?? ""} onClose={() => setProject(null)}>
        {project && (
          <>
            <div className="ch-bar big"><i style={{ width: `${project.pct}%` }} /><em>{project.pct}%</em></div>
            <div className="sheet-gap" />
            <Fields
              rows={[
                ["Owner", project.lead],
                ["Budget", project.budget],
                ["Expected completion", project.due],
                ["Status", <Badge key="s" tone={project.pct >= 60 ? "green" : "gold"}>{project.pct >= 60 ? "On track" : "In progress"}</Badge>],
              ]}
            />
          </>
        )}
      </Sheet>
    </div>
  );
}
