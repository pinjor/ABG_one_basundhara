import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Ico } from "./icons";
import { Badge, Bars, Card, Cols, Donut, Fields, Kpi, Pick, Quick, Ring, RowMenu, Sheet, ViewAll, useReadOnly } from "./widgets";

type Status = "Approved" | "Pending" | "Completed" | "Cancelled";
type Booking = { id: string; name: string; venue: string; date: string; time: string; amount: string; pay: "Paid" | "Unpaid"; status: Status };

const bookings: Booking[] = [
  { id: "BSC-2025-001", name: "Tanvir Hasan", venue: "Football Stadium", date: "Oct 01, 2025", time: "6:00 PM", amount: "৳ 2,500", pay: "Paid", status: "Approved" },
  { id: "BSC-2025-002", name: "Sarah Khan", venue: "Futsal Court", date: "Oct 01, 2025", time: "7:00 PM", amount: "৳ 1,200", pay: "Paid", status: "Pending" },
  { id: "BSC-2025-003", name: "Nusrat Jahan", venue: "Cricket Ground", date: "Oct 01, 2025", time: "5:00 PM", amount: "৳ 3,000", pay: "Paid", status: "Approved" },
  { id: "BSC-2025-004", name: "Arif Karim", venue: "Padel Court", date: "Oct 01, 2025", time: "8:00 PM", amount: "৳ 1,800", pay: "Unpaid", status: "Pending" },
  { id: "BSC-2025-005", name: "Mehedi Rahman", venue: "Badminton Court", date: "Oct 01, 2025", time: "4:00 PM", amount: "৳ 1,000", pay: "Paid", status: "Completed" },
];
const statusTone = { Approved: "green", Pending: "gold", Completed: "grey", Cancelled: "red" } as const;
const BASE = { Pending: 224, Approved: 562, Completed: 348, Cancelled: 114 };

const TREND: Record<string, { labels: string[]; bookings: number[]; revenue: number[]; online: number[]; onsite: number[] }> = {
  "This Month": { labels: ["W1", "W2", "W3", "W4"], bookings: [620, 980, 940, 1360], revenue: [520, 900, 1150, 1680], online: [780, 1050, 1000, 1250], onsite: [1100, 1450, 1650, 1700] },
  "Last Month": { labels: ["W1", "W2", "W3", "W4"], bookings: [540, 820, 900, 1100], revenue: [480, 760, 980, 1300], online: [700, 900, 980, 1100], onsite: [1000, 1300, 1400, 1500] },
};

const VENUE: Record<string, number[]> = { "This Month": [32, 18, 15, 12, 9, 14], "Last Month": [30, 20, 14, 11, 10, 15] };
const venues = ["Football Stadium", "Cricket Ground", "Futsal Court", "Padel Court", "Food Court", "Others"];

const POPULAR: Record<string, number[]> = { "This Month": [28, 22, 18, 14, 10], "Last Month": [26, 24, 17, 15, 9] };
const sports = [["Football", "football"], ["Cricket", "bat"], ["Futsal", "football"], ["Badminton", "shuttle"], ["Padel", "racket"]];

const insights = [
  ["clock", "Peak booking hours detected", "6 PM - 9 PM (Highest demand)", "/bookings?feature=availability-calendar"],
  ["trophy", "Football Stadium generates", "32% of total revenue", "/ticketing/reports"],
  ["users", "Weekend visitor volume", "expected to increase by 18%", "/ticketing/reports"],
  ["bulb", "Consider dynamic pricing", "for high-demand slots", "/bookings?feature=online-booking"],
];

export function BookingDashboard() {
  const navigate = useNavigate();
  const ro = useReadOnly();
  const [trend, setTrend] = useState("This Month");
  const [sales, setSales] = useState("This Month");
  const [venue, setVenue] = useState("This Month");
  const [popular, setPopular] = useState("This Month");
  const [rows, setRows] = useState(bookings);
  const [openId, setOpenId] = useState<string | null>(null);
  const open = rows.find((b) => b.id === openId) ?? null;
  const setOpen = (b: Booking | null) => setOpenId(b?.id ?? null);
  const patch = (id: string, change: Partial<Booking>) => setRows((rs) => rs.map((b): Booking => (b.id === id ? { ...b, ...change } : b)));
  const counts = { ...BASE };
  rows.forEach((b, i) => {
    const was = bookings[i].status;
    if (b.status !== was) {
      counts[was] -= 1;
      counts[b.status] += 1;
    }
  });
  const actions = (b: Booking) => ro ? [
    { label: "View booking", icon: "eye", onClick: () => setOpen(b) },
    { label: "Open booking desk", icon: "external", onClick: () => navigate("/bookings?feature=online-booking") },
  ] : [
    { label: "View booking", icon: "eye", onClick: () => setOpen(b) },
    ...(b.status === "Pending" ? [{ label: "Approve", icon: "check", onClick: () => patch(b.id, { status: "Approved" }) }] : []),
    ...(b.pay === "Unpaid" && b.status !== "Cancelled" ? [{ label: "Mark as paid", icon: "card", onClick: () => patch(b.id, { pay: "Paid" }) }] : []),
    ...(b.status === "Pending" || b.status === "Approved" ? [{ label: "Cancel booking", icon: "x", onClick: () => patch(b.id, { status: "Cancelled" }) }] : []),
    { label: "Open booking desk", icon: "external", onClick: () => navigate("/bookings?feature=online-booking") },
  ];
  const t = TREND[trend];
  const s = TREND[sales];
  const v = VENUE[venue];
  const p = POPULAR[popular];

  return (
    <div className="page p-book">
      <header className="hero" style={{ backgroundImage: "linear-gradient(90deg, rgba(0,0,0,.88) 0%, rgba(0,0,0,.45) 30%, rgba(0,0,0,0) 55%), url(/dash/hero-booking.jpg)" }}>
        <h2 className="gold upper">Booking &amp; Ticketing</h2>
        <p className="sub">Play. Book. Experience.</p>
        <div className="hero-script">
          More<br />Than Sports
          <small>A City of Possibilities</small>
        </div>
      </header>

      <div className="kpis c6">
        <Kpi variant="compact" icon="calendar" label="Total Bookings" value="1,248" delta="12%" spark={[4, 5, 4, 6, 7, 6, 8, 9]} to="/bookings?feature=online-booking" />
        <Kpi variant="compact" icon="ticket" label="Tickets Sold Today" value="3,856" delta="18%" spark={[3, 4, 5, 4, 6, 7, 7, 9]} to="/ticketing" />
        <Kpi variant="compact" icon="users" label="Active Members" value="12,680" delta="9%" spark={[5, 5, 6, 6, 7, 7, 8, 8]} to="/membership" />
        <Kpi variant="compact" icon="coins" label="Revenue Today" value="৳ 2.8M" delta="22%" spark={[3, 4, 4, 6, 5, 7, 8, 9]} to="/ticketing/reports" />
        <Kpi variant="compact" icon="pie" label="Venue Occupancy" value="78%" delta="6%" spark={[6, 6, 7, 6, 7, 8, 7, 8]} to="/facilities" />
        <Kpi variant="compact" icon="star" label="Upcoming Events" value="24" delta="14%" spark={[2, 3, 3, 4, 4, 5, 6, 7]} to="/ticketing/events" />
      </div>

      <div className="row c-bk1">
        <Card title="Booking Trend" extra={<Pick options={Object.keys(TREND)} value={trend} onChange={setTrend} />}>
          <Cols
            key={trend}
            labels={t.labels}
            axis={["2K", "1.5K", "1K", "500", "0"]}
            max={2000}
            wide
            series={[{ name: "Bookings", color: "#f2b81d", values: t.bookings }]}
            line={{ name: "Revenue", color: "#ffffff", values: t.revenue }}
          />
        </Card>
        <Card title="Ticket Sales Trend" extra={<Pick options={Object.keys(TREND)} value={sales} onChange={setSales} />}>
          <Cols
            key={sales}
            labels={s.labels}
            axis={["2K", "1.5K", "1K", "500", "0"]}
            max={2000}
            series={[
              { name: "Online", color: "#f2b81d", values: s.online },
              { name: "On-site", color: "#6b6f79", values: s.onsite },
            ]}
          />
        </Card>
        <Card title="Booking Status">
          <Donut
            center="1,248"
            caption="Total Bookings"
            thick={16}
            parts={[
              { label: "Pending", pct: 18, color: "#f2b81d" },
              { label: "Approved", pct: 45, color: "#22c97a" },
              { label: "Completed", pct: 28, color: "#3f97f4" },
              { label: "Cancelled", pct: 9, color: "#f0444a" },
            ]}
          />
        </Card>
        <Card title="Revenue by Venue" extra={<Pick options={Object.keys(VENUE)} value={venue} onChange={setVenue} />}>
          <Bars key={venue} rows={venues.map((label, i) => ({ label, value: `${v[i]}%`, pct: (v[i] / v[0]) * 100 }))} />
        </Card>
      </div>

      <div className="row c-bk2">
        <Card title="Venue Occupancy" extra={<span className="live-chip"><i />Live</span>}>
          <div className="rings">
            <Ring pct={92} color="#22c97a" label="Football Stadium" to="/bookings?feature=availability-calendar" />
            <Ring pct={78} color="#f2b81d" label="Cricket Ground" to="/bookings?feature=availability-calendar" />
            <Ring pct={65} color="#f2b81d" label="Futsal Court" to="/bookings?feature=availability-calendar" />
            <Ring pct={58} color="#f2b81d" label="Padel Court" to="/bookings?feature=availability-calendar" />
            <Ring pct={46} color="#8d919a" label="Squash Court" to="/bookings?feature=availability-calendar" />
            <Ring pct={72} color="#f2b81d" label="Badminton Court" to="/bookings?feature=availability-calendar" />
          </div>
        </Card>
        <Card title="Most Popular Sports Facilities" extra={<Pick options={Object.keys(POPULAR)} value={popular} onChange={setPopular} />}>
          <Bars key={popular} rank rows={sports.map(([label, icon], i) => ({ label, icon, value: `${p[i]}%`, pct: (p[i] / 30) * 100 }))} />
        </Card>
        <Link to="/ticketing/events" className="promo" style={{ backgroundImage: "url(/dash/player.jpg)" }} aria-label="Upcoming events">
          <p>Sports<br /><span>brings us</span><br />together</p>
        </Link>
        <Card title="AI Insights" icon="sparkle">
          <ul className="list ai scroll">
            {insights.map(([icon, a, b, to]) => (
              <li key={a}>
                <button type="button" className="ai-row" onClick={() => navigate(to)}>
                  <Ico name={icon} className="ai-ico" />
                  <span><b>{a}</b><small>{b}</small></span>
                  <Ico name="chevronR" className="chev" />
                </button>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="row c-bk3">
        <Card title="Recent Bookings" extra={<ViewAll to="/bookings?feature=online-booking" label="View All →" />}>
          <div className="table-wrap">
            <table className="d">
              <thead>
                <tr>{["#", "Booking ID", "Customer Name", "Venue", "Date & Time", "Amount", "Payment Status", "Approval Status", "Actions"].map((h) => <th key={h} className={h === "Actions" ? "act" : ""}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {rows.map((b, i) => (
                  <tr key={b.id}>
                    <td>{i + 1}</td>
                    <td>{b.id}</td>
                    <td><span className="who"><img src={`/dash/cust-${i + 1}.jpg`} alt="" />{b.name}</span></td>
                    <td>{b.venue}</td>
                    <td className="dt">{b.date}<br />{b.time}</td>
                    <td>{b.amount}</td>
                    <td><Badge tone={b.pay === "Paid" ? "green" : "red"}>{b.pay}</Badge></td>
                    <td><Badge tone={statusTone[b.status]}>{b.status}</Badge></td>
                    <td className="act">
                      <RowMenu items={actions(b)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <div className="stack">
          <Card title="Booking Overview">
            <div className="overview">
              {([
                ["Pending", "orange", "hourglass"],
                ["Approved", "green", "check"],
                ["Completed", "green", "flag"],
                ["Cancelled", "red", "x"],
              ] as const).map(([k, c, icon]) => (
                <Link key={k} to="/bookings?feature=online-booking" className="ov">
                  <span className={`li-ico ${c}`}><Ico name={icon} /></span>
                  <div><b key={counts[k]} className="fade-in">{counts[k]}</b><small>{k} Bookings</small></div>
                </Link>
              ))}
            </div>
          </Card>
          <Card title="Quick Actions">
            <div className="qa">
              {!ro && <Quick icon="check" label="Approve Booking" to="/bookings?feature=online-booking" />}
              {!ro && <Quick icon="ticket" label="Generate Ticket" to="/ticketing" />}
              {ro && <Quick icon="users" label="Members" to="/membership" />}
              {ro && <Quick icon="star" label="Upcoming Events" to="/ticketing/events" />}
              <Quick icon="download" label="Export Report" to="/ticketing/reports" />
              <Quick icon="calendar" label="View Venue Schedule" to="/bookings?feature=availability-calendar" />
            </div>
          </Card>
        </div>
      </div>

      <Sheet open={!!open} title={open?.id ?? ""} onClose={() => setOpen(null)}>
        {open && (
          <Fields
            rows={[
              ["Customer", open.name],
              ["Venue", open.venue],
              ["Date & time", `${open.date} · ${open.time}`],
              ["Amount", open.amount],
              ["Payment", <Badge key="p" tone={open.pay === "Paid" ? "green" : "red"}>{open.pay}</Badge>],
              ["Approval", <Badge key="a" tone={statusTone[open.status]}>{open.status}</Badge>],
            ]}
          />
        )}
        {open && (
          <div className="sheet-actions">
            {actions(open)
              .filter((a) => a.label !== "View booking")
              .map((a, i) => (
                <button key={a.label} type="button" className={i === 0 && a.label !== "Open booking desk" ? "btn-gold" : "panel-btn"} onClick={a.onClick}>
                  <Ico name={a.icon} className="pop-ico" />
                  {a.label}
                </button>
              ))}
          </div>
        )}
      </Sheet>
    </div>
  );
}
