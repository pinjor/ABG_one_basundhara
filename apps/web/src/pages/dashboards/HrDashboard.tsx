import { useState } from "react";
import { Ico } from "./icons";
import { Card, Cols, Donut, Kpi, Pick, Quick, Sheet, ViewAll, useReadOnly } from "./widgets";

const DEPTS = ["Operations", "Administration", "Sports Mgmt.", "Facilities", "Security", "Maintenance", "Finance", "IT", "Marketing", "Others"];

const HEADCOUNT: Record<string, number[]> = {
  "This Month": [180, 120, 95, 88, 76, 64, 54, 52, 48, 65],
  "Last Month": [172, 118, 90, 86, 74, 62, 52, 49, 45, 62],
  "Last Quarter": [165, 112, 88, 82, 70, 60, 50, 46, 44, 58],
};

const leaves = [
  { name: "Annual Leave", icon: "plane", n: 324, pct: 68 },
  { name: "Sick Leave", icon: "heart", n: 86, pct: 42 },
  { name: "Casual Leave", icon: "calendar", n: 120, pct: 55 },
  { name: "Maternity Leave", icon: "baby", n: 12, pct: 30 },
];

const activities = [
  ["userPlus", "New employee joined", "Tanvir Hasan joined as Sports Executive", "2 hours ago"],
  ["calCheck", "Leave request approved", "Sadia Khan (Marketing)", "4 hours ago"],
  ["user", "Employee profile updated", "Rafiul Islam updated personal information", "6 hours ago"],
  ["target", "Performance review completed", "Nusrat Jahan (Administration)", "1 day ago"],
  ["cap", "Training program assigned", "Customer Service Excellence", "1 day ago"],
];

const people = [
  ["Arafat Karim", "Operations", "Oct 03", "5 years"],
  ["Nusrat Jahan", "Administration", "Oct 07", "3 years"],
  ["Siam Ahmed", "Facilities", "Oct 12", "2 years"],
  ["Faria Islam", "Marketing", "Oct 18", "4 years"],
  ["Kazi Tanvir", "IT Department", "Oct 25", "1 year"],
];

export function HrDashboard() {
  const ro = useReadOnly();
  const [range, setRange] = useState("This Month");
  const [tab, setTab] = useState<"b" | "w">("b");
  const [detail, setDetail] = useState<"leave" | "dist" | null>(null);

  return (
    <div className="page p-hr">
      <header className="hero" style={{ backgroundImage: "linear-gradient(90deg, rgba(0,0,0,.9) 0%, rgba(0,0,0,.55) 34%, rgba(0,0,0,0) 62%), url(/dash/hero-hr.jpg)" }}>
        <p className="hello">Good Morning,</p>
        <h2 className="gold">Let’s Build Champions Together</h2>
        <p className="sub">Our People Power a Stronger Tomorrow</p>
        <div className="hero-brand">
          <b>Bashundhara Sports City</b>
          <small>People Build Champions</small>
        </div>
      </header>

      <div className="kpis c4">
        <Kpi variant="spark" icon="users" label="Total Employees" value="842" delta="12%" note="+90 from last month" spark={[20, 22, 21, 24, 23, 26, 28, 27, 31, 34]} to="/hrm?feature=employee-master" />
        <Kpi variant="spark" icon="calendar" label="Present Today" value="756" delta="5%" note="89.8% attendance" spark={[40, 42, 41, 44, 43, 46, 45, 48, 47, 50]} to="/hrm?feature=attendance-management" />
        <Kpi variant="spark" icon="plane" label="On Leave" value="86" delta="8%" bad down note="10.2% of total" spark={[10, 13, 11, 14, 12, 15, 13, 16, 14, 17]} to="/hrm?feature=leave-management" />
        <Kpi variant="spark" icon="userPlus" label="New Hires (This Month)" value="24" delta="33%" note="+6 from last month" spark={[4, 6, 5, 7, 8, 7, 9, 10, 11, 12]} to="/hrm?feature=recruitment-management" />
      </div>

      <div className="row c-hr1">
        <Card title="Employee Headcount by Department" sub="Total employees across all departments" extra={<Pick options={Object.keys(HEADCOUNT)} value={range} onChange={setRange} />}>
          <Cols key={range} labels={DEPTS} axis={["200", "150", "100", "50", "0"]} max={200} wide showValues series={[{ name: "Employees", color: "#f2b81d", values: HEADCOUNT[range] }]} />
        </Card>
        <Card title="Attendance Status" sub="This month’s overview">
          <Donut
            center="842"
            caption="Total Employees"
            thick={16}
            parts={[
              { label: "Present", pct: 89.8, color: "#f2b81d", value: "756 (89.8%)" },
              { label: "On Leave", pct: 10.2 - 3.7, color: "#f5d27a", value: "86 (10.2%)" },
              { label: "Absent", pct: 3.7, color: "#4b4f58", value: "31 (3.7%)" },
            ]}
          />
        </Card>
      </div>

      <div className="row c-hr1">
        <Card title="Leave Overview" sub="Leave status for current year" extra={<button type="button" className="view-all btn" onClick={() => setDetail("leave")}>View Details</button>}>
          <div className="leaves">
            {leaves.map((l, i) => (
              <div key={l.name} className="leave">
                <span className="kpi-ico line" style={{ ["--a" as string]: "#f2b81d" }}><Ico name={l.icon} /></span>
                <span>{l.name}</span>
                <b>{l.n}<small>Taken</small></b>
                <div className="leave-bar">
                  <s><i style={{ width: `${l.pct}%`, animationDelay: `${i * 70}ms` }} /></s>
                  <small>{l.pct}%</small>
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Employee Distribution" sub="By employment type" extra={<button type="button" className="view-all btn" onClick={() => setDetail("dist")}>View Details</button>}>
          <Donut
            center="842"
            caption="Total"
            thick={16}
            parts={[
              { label: "Permanent", pct: 62, color: "#f2b81d" },
              { label: "Contractual", pct: 24, color: "#f5d27a" },
              { label: "Part-Time", pct: 10, color: "#fff1c4" },
              { label: "Intern", pct: 4, color: "#4b4f58" },
            ]}
          />
        </Card>
      </div>

      <div className="row c-hr3">
        <Card title="Recent HR Activities" sub="Latest HR activities across the organization" extra={<ViewAll to="/hrm?feature=employee-master" label="View All" />}>
          <ul className="list tight scroll">
            {activities.map(([icon, t, d, w]) => (
              <li key={t}>
                <span className="li-ico"><Ico name={icon} /></span>
                <div><b>{t}</b><small>{d}</small></div>
                <span className="when">{w}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Upcoming Birthdays & Work Anniversaries" extra={<ViewAll to="/hrm?feature=employee-master" label="View All" />}>
          <div className="tabs" role="tablist">
            <button type="button" role="tab" aria-selected={tab === "b"} className={tab === "b" ? "on" : ""} onClick={() => setTab("b")}>Birthdays</button>
            <button type="button" role="tab" aria-selected={tab === "w"} className={tab === "w" ? "on" : ""} onClick={() => setTab("w")}>Work Anniversaries</button>
          </div>
          <ul className="list tight scroll fade-in" key={tab}>
            {people.map(([name, dept, date, years], i) => (
              <li key={name}>
                <img src={`/dash/ava-${i + 1}.jpg`} alt="" className="ava sm" />
                <div><b>{name}</b><small>{tab === "b" ? dept : `${dept} · ${years}`}</small></div>
                <span className="when date-gift">{date}<Ico name={tab === "b" ? "gift" : "trophy"} /></span>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Quick Actions" sub="Frequently used HR actions">
          <div className="qa">
            {!ro && <Quick icon="userPlus" label="Add Employee" to="/hrm?feature=employee-master" />}
            {!ro && <Quick icon="plane" label="Apply Leave" to="/hrm?feature=leave-management" />}
            <Quick icon="calendar" label="View Attendance" to="/hrm?feature=attendance-management" />
            <Quick icon="file" label="Generate Report" to="/hrm?feature=hr-reports" />
            {!ro && <Quick icon="cap" label="Schedule Training" to="/hrm?feature=training-management" />}
            <Quick icon="users" label="Employee Directory" to="/hrm?feature=employee-master" />
          </div>
        </Card>
      </div>

      <footer className="foot">
        <span>© 2025 Bashundhara Sports City. All rights reserved.</span>
        <b>Sports Empowers People</b>
      </footer>

      <Sheet open={detail === "leave"} title="Leave overview · 2025" onClose={() => setDetail(null)}>
        <ul className="list">
          {leaves.map((l) => (
            <li key={l.name}>
              <span className="li-ico"><Ico name={l.icon} /></span>
              <div><b>{l.name}</b><small>{l.n} days taken</small></div>
              <span className="when">{l.pct}% of quota</span>
            </li>
          ))}
        </ul>
      </Sheet>
      <Sheet open={detail === "dist"} title="Employment type" onClose={() => setDetail(null)}>
        <ul className="list">
          {[["Permanent", 62], ["Contractual", 24], ["Part-Time", 10], ["Intern", 4]].map(([k, v]) => (
            <li key={k}>
              <span className="li-ico"><Ico name="users" /></span>
              <div><b>{k}</b><small>{Math.round((Number(v) / 100) * 842)} employees</small></div>
              <span className="when">{v}%</span>
            </li>
          ))}
        </ul>
      </Sheet>
    </div>
  );
}
