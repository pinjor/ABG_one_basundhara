import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Ico } from "./icons";
import { Badge, Card, Cols, Donut, Fields, Kpi, Line, Pick, Quick, Sheet, useReadOnly } from "./widgets";

type Cam = { id: string; name: string; src: string; zone: string; credit?: string };
type Alert = { id: string; icon: string; tone: string; title: string; where: string; when: string; src: string; cam: string };

const cams: Cam[] = [
  { id: "CAM-001", name: "Main Entrance", src: "/dash/cam-entrance.jpg", zone: "Entrances & Exits" },
  { id: "CAM-078", name: "Football Stadium", src: "/dash/cam-stadium.jpg", zone: "Stadium Zone", credit: "Photo: Emessem T, CC BY-SA 4.0, via Wikimedia Commons" },
  { id: "CAM-045", name: "Parking Area", src: "/dash/cam-parking.jpg", zone: "Parking Zone", credit: "Photo: epSos.de, CC BY 2.0, via Wikimedia Commons" },
  { id: "CAM-132", name: "Futsal Court", src: "/dash/cam-futsal.jpg", zone: "Sports Zone" },
  { id: "CAM-156", name: "Retail Zone", src: "/dash/cam-retail.jpg", zone: "Retail Zone" },
  { id: "CAM-171", name: "Food Court", src: "/dash/cam-food.jpg", zone: "F&B Zone", credit: "Photo: McKay Savage, CC BY 2.0, via Wikimedia Commons" },
];

const ZONES = ["All Zones", "Stadium Zone", "Sports Zone", "Retail Zone", "F&B Zone", "Parking Zone", "Perimeter", "Entrances & Exits"];

const pins: { x: number; y: number; zone: string; alert?: boolean; label: string }[] = [
  { x: 14, y: 22, zone: "Entrances & Exits", label: "CAM-001 · North Gate" },
  { x: 36, y: 12, zone: "Perimeter", label: "CAM-201 · North Fence" },
  { x: 62, y: 16, zone: "Sports Zone", label: "CAM-132 · Futsal Court" },
  { x: 80, y: 22, zone: "Perimeter", alert: true, label: "CAM-201 · East Zone breach" },
  { x: 22, y: 46, zone: "Parking Zone", label: "CAM-045 · Parking A" },
  { x: 46, y: 40, zone: "Stadium Zone", alert: true, label: "CAM-078 · Crowd density high" },
  { x: 58, y: 54, zone: "Stadium Zone", label: "CAM-079 · Stand East" },
  { x: 82, y: 48, zone: "Retail Zone", label: "CAM-156 · Retail Strip" },
  { x: 30, y: 70, zone: "F&B Zone", label: "CAM-171 · Food Court" },
  { x: 52, y: 76, zone: "Parking Zone", alert: true, label: "CAM-045 · Suspicious activity" },
  { x: 74, y: 72, zone: "Sports Zone", label: "CAM-140 · Cricket Nets" },
  { x: 88, y: 84, zone: "Entrances & Exits", label: "CAM-112 · Entry Gate" },
];

const ALERTS: Alert[] = [
  { id: "A-1042", icon: "alert", tone: "red", title: "Unauthorized Access", where: "Main Gate", when: "2 min ago", src: "/dash/cam-entrance.jpg", cam: "CAM-001" },
  { id: "A-1041", icon: "alert", tone: "orange", title: "Suspicious Activity", where: "Parking Area", when: "12 min ago", src: "/dash/cam-parking.jpg", cam: "CAM-045" },
  { id: "A-1040", icon: "users", tone: "orange", title: "Crowd Density High", where: "Stadium", when: "25 min ago", src: "/dash/cam-stadium.jpg", cam: "CAM-078" },
  { id: "A-1039", icon: "car", tone: "red", title: "Vehicle Without Pass", where: "Entry Gate", when: "32 min ago", src: "/dash/cam-retail.jpg", cam: "CAM-112" },
  { id: "A-1038", icon: "shield", tone: "red", title: "Perimeter Breach", where: "East Zone", when: "41 min ago", src: "/dash/cam-food.jpg", cam: "CAM-201" },
];
const OPEN_BASE = 12;

const events = [
  ["10:24 AM", "/dash/cam-entrance.jpg", "CAM-001", "Main Entrance", "Face Matched", "ID: #4587", "Approved", "green"],
  ["10:18 AM", "/dash/cam-parking.jpg", "CAM-045", "Parking Area", "Suspicious Activity", "N/A", "Investigating", "orange"],
  ["10:12 AM", "/dash/cam-stadium.jpg", "CAM-078", "Stadium Zone", "Crowd Density High", "N/A", "Monitoring", "blue"],
  ["10:08 AM", "/dash/cam-retail.jpg", "CAM-112", "Entry Gate", "Vehicle Without Pass", "Plate: DHA-3321", "Alert", "red"],
  ["10:03 AM", "/dash/cam-food.jpg", "CAM-201", "Perimeter", "Perimeter Breach", "N/A", "Investigating", "orange"],
] as const;

const FLOW: Record<string, { labels: string[]; values: number[] }> = {
  Today: { labels: ["6AM", "9AM", "12PM", "3PM", "6PM", "9PM"], values: [600, 900, 820, 1250, 1480, 1100, 1350, 980, 1150, 760, 900] },
  Yesterday: { labels: ["6AM", "9AM", "12PM", "3PM", "6PM", "9PM"], values: [500, 780, 760, 1100, 1300, 1000, 1180, 900, 1000, 700, 820] },
};

const VEHICLE: Record<string, { entries: number[]; exits: number[] }> = {
  Today: { entries: [120, 210, 180, 260, 300, 240, 340, 280, 220, 160], exits: [80, 150, 200, 190, 260, 300, 250, 310, 260, 200] },
  Yesterday: { entries: [100, 190, 170, 230, 280, 220, 300, 260, 200, 150], exits: [70, 140, 180, 180, 240, 270, 230, 290, 240, 180] },
};

export function SecurityDashboard() {
  const { hash } = useLocation();
  const ro = useReadOnly();
  const [zone, setZone] = useState("All Zones");
  const [zoom, setZoom] = useState(1);
  const [cam, setCam] = useState<Cam | null>(null);
  const [sheet, setSheet] = useState<"all" | "map" | "lock" | "report" | "alerts" | null>(null);
  const [crowd, setCrowd] = useState("Live");
  const [flow, setFlow] = useState("Today");
  const [veh, setVeh] = useState("Today");
  const [flash, setFlash] = useState("");
  const [acked, setAcked] = useState<string[]>([]);
  const [alertId, setAlertId] = useState<string | null>(null);
  const [lockdown, setLockdown] = useState(false);
  const alert = ALERTS.find((a) => a.id === alertId) ?? null;
  const camById = (id: string) => cams.find((c) => c.id === id) ?? null;
  const ack = (id: string) => setAcked((x) => (x.includes(id) ? x : [...x, id]));

  useEffect(() => {
    const id = hash.replace("#", "");
    if (!id) return;
    const el = document.getElementById(id);
    el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    setFlash(id);
    const t = window.setTimeout(() => setFlash(""), 1600);
    return () => window.clearTimeout(t);
  }, [hash]);

  const f = (id: string) => (flash === id ? "flash" : "");
  const fl = FLOW[flow];
  const v = VEHICLE[veh];

  return (
    <div className="page p-sec">
      <header className="hero" style={{ backgroundImage: "linear-gradient(90deg, rgba(0,0,0,.85) 0%, rgba(0,0,0,.4) 34%, rgba(0,0,0,0) 60%), url(/dash/hero-security.jpg)" }}>
        <h2 className="gold upper">Security &amp; Surveillance</h2>
        <p className="sub">A Safer Environment for a Brighter Tomorrow</p>
      </header>

      {lockdown && (
        <div className="drill" role="status">
          <Ico name="lock" />
          <span><b>Lockdown drill active</b><small>Simulation only · gates and hardware are not affected</small></span>
          <button type="button" className="panel-btn" onClick={() => setLockdown(false)}>End lockdown</button>
        </div>
      )}

      <div className="kpis c6">
        <Kpi variant="mini" icon="camera" label="Total Cameras" value="248" delta="12%" onClick={() => setSheet("all")} />
        <Kpi variant="mini" icon="alert" label="Active Alerts" value={String(OPEN_BASE - acked.length)} delta="33%" bad color="#f0444a" onClick={() => setSheet("alerts")} />
        <Kpi variant="mini" icon="users" label="People Detected Today" value="1,248" delta="18%" to="/security#people" />
        <Kpi variant="mini" icon="car" label="Vehicles Tracked" value="342" delta="26%" to="/security#vehicles" />
        <Kpi variant="mini" icon="shield" label="System Uptime" value="99.8%" delta="0.2%" onClick={() => setSheet("report")} />
        <Kpi variant="mini" icon="siren" label="Critical Incidents" value="5" delta="67%" bad color="#f0444a" onClick={() => setSheet("alerts")} />
      </div>

      <div className="row c-sec1">
        <Card id="live" className={f("live")} title="Live Camera Feeds" extra={<button type="button" className="view-all" onClick={() => setSheet("all")}>View All</button>}>
          <div className="cams">
            {cams.map((c) => (
              <button key={c.id} type="button" className="cam" onClick={() => setCam(c)} aria-label={`Open ${c.name} camera`}>
                <img src={c.src} alt="" />
                <span className="live"><i />Live</span>
                <span className="cam-cap">{c.name}<Ico name="expand" /></span>
              </button>
            ))}
          </div>
        </Card>
        <Card
          id="perimeter"
          className={f("perimeter")}
          title="Site Map & Camera Locations"
          extra={
            <div className="card-x">
              <Pick options={ZONES} value={zone} onChange={setZone} />
              <button type="button" className="dots" aria-label="Expand map" onClick={() => setSheet("map")}><Ico name="expand" /></button>
            </div>
          }
        >
          <div className="map">
            <div className="map-view">
              <div className="map-layer" style={{ transform: `scale(${zoom})` }}>
                <img src="/dash/site-map.jpg" alt="Sports City site map" className="map-img" />
                {pins.map((p) => (
                  <button
                    type="button"
                    key={p.label}
                    className={`map-pin ${p.alert ? "alert" : ""} ${zone !== "All Zones" && p.zone !== zone ? "dim" : ""}`}
                    style={{ left: `${p.x}%`, top: `${p.y}%` }}
                    data-tip={p.label}
                    aria-label={p.label}
                    onClick={() => {
                      const c = camById(p.label.split(" ")[0]);
                      if (c) setCam(c);
                      else setSheet("map");
                    }}
                  >
                    <Ico name={p.alert ? "alert" : "camera"} />
                  </button>
                ))}
              </div>
              <div className="map-zoom">
                <button type="button" aria-label="Zoom in" onClick={() => setZoom((z) => Math.min(2, z + 0.25))}><Ico name="zoomIn" /></button>
                <button type="button" aria-label="Zoom out" onClick={() => setZoom((z) => Math.max(1, z - 0.25))}><Ico name="zoomOut" /></button>
              </div>
              <button type="button" className="map-compass" aria-label="Reset view" onClick={() => setZoom(1)}><Ico name="compass" /></button>
            </div>
            <div className="zones" role="listbox" aria-label="Zones">
              {ZONES.map((z) => (
                <button key={z} type="button" role="option" aria-selected={z === zone} className={z === zone ? "on" : ""} onClick={() => setZone(z)}>{z}</button>
              ))}
            </div>
          </div>
        </Card>
        <Card id="incidents" className={f("incidents")} title="Recent Alerts" extra={<button type="button" className="view-all" onClick={() => setSheet("alerts")}>View All</button>}>
          <ul className="list tight scroll alerts">
            {ALERTS.filter((a) => !acked.includes(a.id)).map((a) => (
              <li key={a.id}>
                <button type="button" className={`al-row ${a.tone}`} onClick={() => setAlertId(a.id)}>
                  <img src={a.src} alt="" className="thumb" />
                  <div className="al-t">
                    <Ico name={a.icon} className={`al-ico ${a.tone}`} />
                    <span><b>{a.title}</b><small>{a.where} · {a.cam}</small></span>
                  </div>
                  <span className="when">{a.when}</span>
                </button>
              </li>
            ))}
            {acked.length === ALERTS.length && <li className="empty">All recent alerts acknowledged</li>}
          </ul>
        </Card>
      </div>

      <div className="row c-sec2" id="analytics">
        <Card id="people" className={f("people")} title="Crowd Density Analysis" extra={<Pick options={["Live", "Peak Hour", "Daily Avg"]} value={crowd} onChange={setCrowd} />}>
          <div className="heat">
            <img src="/dash/heatmap.jpg" alt="Crowd heatmap" className={`fade-in heat-${crowd.replace(/\s/g, "").toLowerCase()}`} key={crowd} />
            <div className="heat-scale"><span>Low</span><i /><span>High</span></div>
          </div>
        </Card>
        <Card title="People Flow Trend" extra={<Pick options={Object.keys(FLOW)} value={flow} onChange={setFlow} />}>
          <Line
            key={flow}
            legend={false}
            labels={["6AM", "7:30AM", "9AM", "10:30AM", "12PM", "1:30PM", "3PM", "4:30PM", "6PM", "7:30PM", "9PM"]}
            tick={2}
            axis={["2K", "1.5K", "1K", "500", "0"]}
            max={2000}
            series={[{ name: "People", color: "#f2b81d", values: fl.values }]}
          />
        </Card>
        <Card id="vehicles" className={f("vehicles")} title="Vehicle Movement" extra={<Pick options={Object.keys(VEHICLE)} value={veh} onChange={setVeh} />}>
          <Cols
            key={veh}
            labels={["6AM", "7AM", "9AM", "10AM", "12PM", "1PM", "3PM", "4PM", "6PM", "8PM"]}
            tick={2}
            axis={["400", "300", "200", "100", "0"]}
            max={400}
            series={[
              { name: "Entries", color: "#f2b81d", values: v.entries },
              { name: "Exits", color: "#9a9ea8", values: v.exits },
            ]}
          />
        </Card>
        <Card id="access" className={f("access")} title="Access Control Status">
          <Donut
            center="2,840"
            caption="Total Access"
            thick={16}
            stacked
            parts={[
              { label: "Granted", pct: 85, color: "#22c97a", value: "2,420 · 85%" },
              { label: "Denied", pct: 11, color: "#f0444a", value: "320 · 11%" },
              { label: "Pending", pct: 4, color: "#f2b81d", value: "100 · 4%" },
            ]}
          />
        </Card>
        <Card title="AI Detection">
          <ul className="list tight scroll">
            {[
              ["scan", "green", "Face Recognition", "248 matches today"],
              ["box", "orange", "Object Detection", "12 suspicious objects"],
              ["activity", "blue", "Behavior Analysis", "5 unusual activities"],
              ["plate", "purple", "License Plate Recognition", "342 vehicles tracked"],
            ].map(([icon, c, t, d]) => (
              <li key={t}>
                <span className={`li-ico sq ${c}`}><Ico name={icon} /></span>
                <div><b>{t}</b><small>{d}</small></div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="row c-sec3">
        <Card title="Recent Security Events" extra={<button type="button" className="view-all" onClick={() => setSheet("report")}>View All</button>}>
          <div className="table-wrap">
            <table className="d">
              <thead>
                <tr>{["Time", "", "Camera", "Location", "Event Type", "Person/Vehicle", "Status"].map((h, i) => <th key={h + i}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {events.map(([time, src, id, loc, type, who, status, tone]) => (
                  <tr key={time + id} className="click" onClick={() => setCam(camById(id) ?? { id, name: loc, src, zone: loc })}>
                    <td>{time}</td>
                    <td><img src={src} alt="" className="thumb sm" /></td>
                    <td>{id}</td>
                    <td>{loc}</td>
                    <td>{type}</td>
                    <td>{who}</td>
                    <td><Badge tone={tone}>{status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <Card id="reports" className={f("reports")} title="Security Insights">
          <ul className="list tight scroll insights">
            {[
              ["arrowUp", "green", "Crowd density at stadium is 35% higher than usual."],
              ["alert", "red", "2 unauthorized access attempts detected today."],
              ["clock", "blue", "Average response time: 2.3 minutes."],
              ["growth", "green", "Vehicle entries increased by 28% this week."],
              ["sparkle", "purple", "AI detected 5 repeat suspicious individuals."],
            ].map(([icon, c, t]) => (
              <li key={t}>
                <span className={`dot-ico ${c}`}><Ico name={icon} /></span>
                <div><b>{t}</b></div>
              </li>
            ))}
          </ul>
        </Card>
        <Card id="settings" className={f("settings")} title="Quick Actions">
          <div className="qa tiles">
            <Quick icon="camera" label="View Live Cameras" onClick={() => setSheet("all")} />
            <Quick icon="bars" label="Generate Report" onClick={() => setSheet("report")} />
            {ro ? <Quick icon="pin" label="Site Map" onClick={() => setSheet("map")} /> : <Quick icon="lock" label={lockdown ? "End Lockdown" : "Lockdown Mode"} onClick={() => setSheet("lock")} />}
            <Quick icon="alert" label="Incident Management" onClick={() => setSheet("alerts")} />
          </div>
        </Card>
      </div>

      <Sheet open={!!cam} title={cam ? `${cam.name} · ${cam.id}` : ""} onClose={() => setCam(null)} wide>
        {cam && (
          <>
            <div className="cam-big">
              <img src={cam.src} alt={cam.name} className="big-shot" />
              <span className="live"><i />Live</span>
            </div>
            <div className="sheet-gap" />
            <Fields rows={[["Camera", cam.id], ["Zone", cam.zone], ["Status", <Badge key="s" tone="green">Online</Badge>]]} />
            {cam.credit && <p className="credit">{cam.credit}</p>}
          </>
        )}
      </Sheet>
      <Sheet open={sheet === "all"} title="Live cameras" onClose={() => setSheet(null)} wide>
        <div className="cams all">
          {cams.map((c) => (
            <button key={c.id} type="button" className="cam" onClick={() => { setSheet(null); setCam(c); }}>
              <img src={c.src} alt="" />
              <span className="live"><i />Live</span>
              <span className="cam-cap">{c.name} · {c.id}<Ico name="expand" /></span>
            </button>
          ))}
        </div>
      </Sheet>
      <Sheet open={sheet === "map"} title="Site map" onClose={() => setSheet(null)} wide>
        <img src="/dash/site-map.jpg" alt="Sports City site map" className="big-shot" />
      </Sheet>
      <Sheet open={sheet === "lock"} title="Lockdown mode" onClose={() => setSheet(null)}>
        <p className="sub">
          {lockdown
            ? "A lockdown drill is running. End it to return to normal monitoring."
            : "Start a lockdown drill? This prototype is not connected to gate hardware, so it only shows the drill banner. In production this would lock all gates and alert the response team."}
        </p>
        <div className="sheet-gap" />
        <div className="sheet-actions">
          {lockdown ? (
            <button type="button" className="btn-gold" onClick={() => { setLockdown(false); setSheet(null); }}><Ico name="check" className="pop-ico" />End lockdown</button>
          ) : (
            <button type="button" className="panel-btn danger" onClick={() => { setLockdown(true); setSheet(null); }}><Ico name="lock" className="pop-ico" />Start lockdown drill</button>
          )}
          <button type="button" className="panel-btn" onClick={() => setSheet(null)}><Ico name="x" className="pop-ico" />Cancel</button>
        </div>
      </Sheet>
      <Sheet open={sheet === "alerts"} title="All alerts" onClose={() => setSheet(null)}>
        <ul className="list tight alerts">
          {ALERTS.map((a) => (
            <li key={a.id}>
              <button type="button" className={`al-row wide ${a.tone}`} onClick={() => { setSheet(null); setAlertId(a.id); }}>
                <img src={a.src} alt="" className="thumb" />
                <div className="al-t">
                  <Ico name={a.icon} className={`al-ico ${a.tone}`} />
                  <span><b>{a.title}</b><small>{a.where} · {a.cam} · {a.when}</small></span>
                </div>
                <Badge tone={acked.includes(a.id) ? "green" : a.tone === "red" ? "red" : "gold"}>{acked.includes(a.id) ? "Acknowledged" : "Open"}</Badge>
              </button>
            </li>
          ))}
        </ul>
      </Sheet>
      <Sheet open={!!alert} title={alert ? `${alert.title} · ${alert.id}` : ""} onClose={() => setAlertId(null)} wide>
        {alert && (
          <>
            <div className="cam-big">
              <img src={alert.src} alt={alert.where} className="big-shot" />
              <span className="live"><i />Live</span>
            </div>
            <div className="sheet-gap" />
            <Fields
              rows={[
                ["Location", alert.where],
                ["Camera", alert.cam],
                ["Detected", alert.when],
                ["Status", <Badge key="s" tone={acked.includes(alert.id) ? "green" : "red"}>{acked.includes(alert.id) ? "Acknowledged" : "Open"}</Badge>],
              ]}
            />
            <div className="sheet-actions">
              {!acked.includes(alert.id) && !ro && (
                <button type="button" className="btn-gold" onClick={() => { ack(alert.id); setAlertId(null); }}><Ico name="check" className="pop-ico" />Acknowledge</button>
              )}
              <button type="button" className="panel-btn" onClick={() => { setAlertId(null); setCam(camById(alert.cam) ?? { id: alert.cam, name: alert.where, src: alert.src, zone: alert.where }); }}><Ico name="camera" className="pop-ico" />View camera</button>
              <button type="button" className="panel-btn" onClick={() => { setAlertId(null); setSheet("alerts"); }}><Ico name="bars" className="pop-ico" />All alerts</button>
            </div>
          </>
        )}
      </Sheet>
      <Sheet open={sheet === "report"} title="Security report · Wed, 01 Oct 2025" onClose={() => setSheet(null)}>
        <Fields
          rows={[
            ["Cameras online", "248"],
            ["Active alerts", String(OPEN_BASE - acked.length)],
            ["Critical incidents", "5"],
            ["People detected", "1,248"],
            ["Vehicles tracked", "342"],
            ["Access granted / denied", "2,420 / 320"],
            ["System uptime", "99.8%"],
          ]}
        />
        <div className="sheet-gap" />
        <button type="button" className="panel-btn" onClick={() => window.print()}><Ico name="download" className="pop-ico" />Print report</button>
      </Sheet>
    </div>
  );
}
