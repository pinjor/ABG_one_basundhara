import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Ico } from "./icons";
import { Badge, Bars, Card, Cols, Donut, Fields, Kpi, Line, MONTHS, Pick, RowMenu, Sheet, ViewAll, useReadOnly } from "./widgets";

type Invoice = { no: string; client: string; service: string; issued: string; due: string; amount: string; status: "Paid" | "Partial" | "Overdue" };

const invoices: Invoice[] = [
  { no: "INV-2024-1258", client: "ABC Events Ltd.", service: "Tournament Booking", issued: "10 Dec 2024", due: "25 Dec 2024", amount: "৳ 5,000,000", status: "Paid" },
  { no: "INV-2024-1257", client: "Fitness World", service: "Facility Booking", issued: "08 Dec 2024", due: "23 Dec 2024", amount: "৳ 2,800,000", status: "Partial" },
  { no: "INV-2024-1256", client: "Premier Sports", service: "Membership", issued: "05 Dec 2024", due: "20 Dec 2024", amount: "৳ 1,200,000", status: "Paid" },
  { no: "INV-2024-1255", client: "Urban Bites", service: "Retail Space", issued: "03 Dec 2024", due: "18 Dec 2024", amount: "৳ 950,000", status: "Overdue" },
  { no: "INV-2024-1254", client: "Champions FC", service: "Training Facility", issued: "01 Dec 2024", due: "16 Dec 2024", amount: "৳ 3,500,000", status: "Paid" },
];

const tone = { Paid: "green", Partial: "blue", Overdue: "red" } as const;

const TREND: Record<string, { labels: string[]; rev: number[]; rec: number[] }> = {
  "This Year": { labels: MONTHS, rev: [14, 18, 16, 20, 17, 22, 25, 23, 28, 30, 26, 29], rec: [12, 14, 11, 13, 12, 14, 13, 15, 17, 19, 15, 16] },
  "Last Year": { labels: MONTHS, rev: [11, 13, 12, 15, 14, 16, 18, 17, 20, 21, 19, 22], rec: [9, 10, 10, 11, 10, 12, 12, 13, 14, 15, 13, 14] },
  "Last 6 Months": { labels: MONTHS.slice(6), rev: [25, 23, 28, 30, 26, 29], rec: [13, 15, 17, 19, 15, 16] },
};

const SOURCE: Record<string, number[]> = {
  "This Year": [42.5, 24.8, 15.6, 10.4, 6.7],
  "Last Year": [45.1, 21.2, 16.4, 11.0, 6.3],
};

const CATS: Record<string, number[]> = {
  "This Year": [121.3, 70.8, 44.5, 29.6, 19.2],
  "Last Year": [108.6, 59.8, 41.2, 27.3, 17.9],
};

const MONTHLY: Record<string, { labels: string[]; a: number[]; b: number[] }> = {
  Monthly: { labels: MONTHS, a: [12, 14, 15, 13, 17, 19, 21, 24, 22, 26, 24, 27], b: [17, 19, 21, 20, 25, 27, 32, 38, 33, 41, 36, 42] },
  Quarterly: { labels: ["Q1", "Q2", "Q3", "Q4"], a: [41, 49, 67, 77], b: [57, 72, 103, 119] },
};

const sourceParts = ["Facility Booking", "Events & Tournaments", "Membership", "Retail & F&B", "Sponsorship"];
const sourceColors = ["#f2b81d", "#3f97f4", "#9158ef", "#22c97a", "#f5a524"];
const catColors = ["#f2b81d", "#f0444a", "#3f97f4", "#22c97a", "#9158ef"];

export function RevenueDashboard() {
  const navigate = useNavigate();
  const ro = useReadOnly();
  const [range, setRange] = useState("01 Jan 2024 - 31 Dec 2024");
  const [trend, setTrend] = useState("This Year");
  const [source, setSource] = useState("This Year");
  const [cat, setCat] = useState("This Year");
  const [monthly, setMonthly] = useState("Monthly");
  const [rows, setRows] = useState(invoices);
  const [openNo, setOpenNo] = useState<string | null>(null);
  const open = rows.find((r) => r.no === openNo) ?? null;
  const setOpen = (r: Invoice | null) => setOpenNo(r?.no ?? null);
  const markPaid = (no: string) => setRows((rs) => rs.map((r): Invoice => (r.no === no ? { ...r, status: "Paid" } : r)));
  const t = TREND[trend];
  const m = MONTHLY[monthly];
  const cats = CATS[cat];
  const total = SOURCE[source].reduce((a, b) => a + b, 0);

  return (
    <div className="page p-rev">
      <div className="title-row">
        <div>
          <h2 className="dash-title"><span>Revenue</span> Dashboard</h2>
          <p className="sub">Track revenue performance, monitor income streams and drive sustainable growth.</p>
        </div>
        <div className="date-pick">
          <Pick options={["01 Jan 2024 - 31 Dec 2024", "01 Jul 2024 - 31 Dec 2024", "01 Jan 2023 - 31 Dec 2023"]} value={range} onChange={setRange} icon="calendar" />
        </div>
      </div>

      <div className="kpis c4">
        <Kpi variant="stripe" icon="coins" label="Total Revenue" value="৳ 285,420,000" delta="12.5%" color="#f2b81d" to="/finance?feature=revenue-management" />
        <Kpi variant="stripe" icon="bars" label="Total Invoices" value="1,248" delta="8.3%" color="#f0444a" to="/finance?feature=invoice-management" />
        <Kpi variant="stripe" icon="card" label="Received Amount" value="৳ 242,180,000" delta="14.2%" color="#22c97a" to="/finance?feature=payment-tracking" />
        <Kpi variant="stripe" icon="hourglass" label="Outstanding Amount" value="৳ 43,240,000" delta="6.1%" down bad color="#3f97f4" to="/finance?feature=receivable-management" />
      </div>

      <div className="row c-rev1">
        <Card title="Revenue Trend" icon="bars" extra={<Pick options={Object.keys(TREND)} value={trend} onChange={setTrend} />}>
          <Line
            key={trend}
            labels={t.labels}
            axis={["50M", "40M", "30M", "20M", "10M", "0"]}
            max={50}
            fmt={(v) => `৳ ${v}M`}
            series={[
              { name: "Revenue", color: "#f2b81d", values: t.rev },
              { name: "Receivables", color: "#f0444a", values: t.rec },
            ]}
          />
        </Card>
        <Card title="Revenue by Source" icon="pie" extra={<Pick options={Object.keys(SOURCE)} value={source} onChange={setSource} />}>
          <Donut
            key={source}
            center="৳285.4M"
            caption="Total Revenue"
            thick={17}
            parts={sourceParts.map((label, i) => ({ label, pct: (SOURCE[source][i] / total) * 100, color: sourceColors[i], value: `${SOURCE[source][i]}%` }))}
          />
        </Card>
      </div>

      <div className="row c-rev2">
        <Card title="Top Revenue Categories" icon="bars" extra={<Pick options={Object.keys(CATS)} value={cat} onChange={setCat} />}>
          <Bars
            key={cat}
            rows={sourceParts.map((label, i) => ({ label, value: `৳ ${cats[i]}M`, pct: (cats[i] / cats[0]) * 100, color: catColors[i] }))}
          />
        </Card>
        <Card title="Monthly Revenue Comparison" icon="trend" extra={<Pick options={Object.keys(MONTHLY)} value={monthly} onChange={setMonthly} />}>
          <Cols
            key={monthly}
            labels={m.labels}
            axis={["50M", "40M", "30M", "20M", "10M", "0"]}
            max={50}
            series={[
              { name: "2023", color: "#6b6f79", values: m.a.map((v) => Math.min(v, 50)) },
              { name: "2024", color: "#f2b81d", values: m.b.map((v) => Math.min(v, 50)) },
            ]}
          />
        </Card>
        <Card title="Key Insights" icon="bulb">
          <ul className="list insights scroll">
            {[
              ["growth", "green", "Revenue increased by 12.5%", "compared to previous period"],
              ["growth", "green", "Facility Booking is the top contributor", "accounting for 42.5% of total revenue"],
              ["arrowDown", "red", "Outstanding amount reduced by 6.1%", "showing improved collection"],
              ["growth", "green", "Strong growth in Events & Tournaments", "up by 18.3% this period"],
            ].map(([icon, c, title, text]) => (
              <li key={title}>
                <Ico name={icon} className={`ins-ico ${c}`} />
                <div><b>{title}</b><small>{text}</small></div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card title="Recent Invoices" icon="file" extra={<ViewAll to="/finance?feature=invoice-management" />}>
        <div className="table-wrap">
          <table className="d">
            <thead>
              <tr>{["Invoice No.", "Client / Customer", "Service", "Invoice Date", "Due Date", "Amount", "Status", "Action"].map((h) => <th key={h} className={h === "Action" ? "act" : ""}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.no}>
                  <td>{row.no}</td>
                  <td>{row.client}</td>
                  <td>{row.service}</td>
                  <td>{row.issued}</td>
                  <td>{row.due}</td>
                  <td>{row.amount}</td>
                  <td><Badge tone={tone[row.status]}>{row.status}</Badge></td>
                  <td className="act">
                    <RowMenu
                      items={[
                        { label: "View details", icon: "eye", onClick: () => setOpen(row) },
                        ...(row.status !== "Paid" && !ro ? [{ label: "Mark as paid", icon: "check", onClick: () => markPaid(row.no) }] : []),
                        { label: "Open invoice desk", icon: "external", onClick: () => navigate("/finance?feature=invoice-management") },
                        { label: "Payment tracking", icon: "card", onClick: () => navigate("/finance?feature=payment-tracking") },
                      ]}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Sheet open={!!open} title={open?.no ?? ""} onClose={() => setOpen(null)}>
        {open && (
          <Fields
            rows={[
              ["Client", open.client],
              ["Service", open.service],
              ["Invoice date", open.issued],
              ["Due date", open.due],
              ["Amount", open.amount],
              ["Status", <Badge key="s" tone={tone[open.status]}>{open.status}</Badge>],
            ]}
          />
        )}
        {open && (
          <div className="sheet-actions">
            {open.status !== "Paid" && !ro && (
              <button type="button" className="btn-gold" onClick={() => markPaid(open.no)}><Ico name="check" className="pop-ico" />Mark as paid</button>
            )}
            <button type="button" className="panel-btn" onClick={() => navigate("/finance?feature=invoice-management")}><Ico name="external" className="pop-ico" />Open invoice desk</button>
          </div>
        )}
      </Sheet>
    </div>
  );
}
