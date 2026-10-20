import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { CalendarDays, ClipboardList, Download, FileClock, FileWarning, Inbox, Loader2, PackageCheck, Printer, Route, ScrollText, Send, Truck, type LucideIcon } from "lucide-react";
import { api, download, qs } from "../lib/api";
import { useAuth } from "../lib/auth";
import { daysAgo, dhakaDay, stamp } from "../lib/format";
import { useBranches } from "../lib/lookups";
import type { Parcel } from "../lib/types";
import { Card, Empty, ErrorNote, Field, PageHeader, cx } from "../components/ui";
import { toast } from "../components/toast";

type Param = "date" | "range" | "branch" | "branchRequired" | "month" | "parcel";

const REPORTS: { type: string; title: string; description: string; icon: LucideIcon; params: Param[] }[] = [
  { type: "daily-register", title: "Daily dispatch register", description: "Everything booked on one day, with custody milestones.", icon: CalendarDays, params: ["date", "branch"] },
  { type: "incoming", title: "Incoming register", description: "Parcels addressed to one office.", icon: Inbox, params: ["branchRequired", "range"] },
  { type: "outgoing", title: "Outgoing register", description: "Parcels sent from one office.", icon: Send, params: ["branchRequired", "range"] },
  { type: "pending-receipt", title: "Pending receipt", description: "Arrived but not yet confirmed, longest wait first.", icon: FileClock, params: ["branch"] },
  { type: "overdue", title: "Overdue parcels", description: "Open parcels past their SLA.", icon: FileWarning, params: ["branch"] },
  { type: "completed", title: "Completed deliveries", description: "Received in the period, with who received and how.", icon: PackageCheck, params: ["range", "branch"] },
  { type: "exceptions", title: "Exception report", description: "Exceptions raised, their status and resolution.", icon: ClipboardList, params: ["range", "branch"] },
  { type: "monthly-branch", title: "Monthly office summary", description: "Per-office volumes and performance for a month.", icon: Route, params: ["month"] },
  { type: "courier-activity", title: "Courier activity", description: "Assignments and custody time per courier.", icon: Truck, params: ["range", "branch"] },
  { type: "chain-of-custody", title: "Chain of custody", description: "Every ledger entry for one parcel, for audits and disputes.", icon: ScrollText, params: ["parcel"] },
];

interface Report {
  type: string;
  title: string;
  subtitle: string;
  columns: { key: string; label: string }[];
  rows: Record<string, string | number | null>[];
  generatedAt: string;
}

const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;
const cell = (v: string | number | null | undefined) => (v === null || v === undefined || v === "" ? "—" : typeof v === "string" && ISO.test(v) ? stamp(v) : String(v));

export function ReportsPage() {
  const [params, setParams] = useSearchParams();
  const profile = useAuth((s) => s.profile)!;
  const branches = useBranches();
  const type = params.get("type") ?? "daily-register";
  const def = REPORTS.find((r) => r.type === type) ?? REPORTS[0];
  const [form, setForm] = useState({ date: dhakaDay(), from: daysAgo(29), to: dhakaDay(), month: dhakaDay().slice(0, 7), branchId: "", tracking: "" });
  const [parcelId, setParcelId] = useState(params.get("parcelId") ?? "");
  const [report, setReport] = useState<Report | null>(null);
  const scoped = profile.scopedBranchIds.length ? branches.data?.filter((b) => profile.scopedBranchIds.includes(b.id)) : branches.data;

  const query = () => {
    const p: Record<string, string> = {};
    if (def.params.includes("date")) p.date = form.date;
    if (def.params.includes("range")) Object.assign(p, { from: form.from, to: form.to });
    if (def.params.includes("month")) p.month = form.month;
    if (def.params.some((x) => x === "branch" || x === "branchRequired") && form.branchId) p.branchId = form.branchId;
    if (def.params.includes("parcel")) p.parcelId = parcelId;
    return p;
  };

  const resolveParcel = async () => {
    if (!def.params.includes("parcel") || !form.tracking.trim()) return;
    const parcel = await api.get<Parcel>(`/parcels/by-tracking/${encodeURIComponent(form.tracking.trim().toUpperCase())}`);
    setParcelId(parcel.id);
    return parcel.id;
  };

  const run = useMutation({
    mutationFn: async () => {
      if (def.params.includes("parcel") && form.tracking.trim()) {
        const id = await resolveParcel();
        return api.get<Report>(`/admin/reports/${def.type}${qs({ ...query(), parcelId: id })}`);
      }
      return api.get<Report>(`/admin/reports/${def.type}${qs(query())}`);
    },
    onSuccess: setReport,
  });

  // Opened from a parcel page: run straight away.
  useEffect(() => {
    if (params.get("parcelId") && type === "chain-of-custody") run.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pick = (t: string) => {
    setReport(null);
    run.reset();
    setParams({ type: t }, { replace: true });
  };

  const csv = async () => {
    try {
      await download(`/admin/reports/${def.type}${qs({ ...query(), format: "csv" })}`, `abg-${def.type}-${dhakaDay()}.csv`);
    } catch (err) {
      toast.error(err);
    }
  };

  const needsBranch = def.params.includes("branchRequired") && !form.branchId;
  const needsParcel = def.params.includes("parcel") && !parcelId && !form.tracking.trim();

  return (
    <div className="space-y-6">
      <PageHeader overline="Insight" title="Reports" subtitle="Registers and audit reports. View on screen, download as CSV (opens in Excel), or print." />

      <div className="no-print grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {REPORTS.map((r) => (
          <button key={r.type} onClick={() => pick(r.type)} className={cx("card flex flex-col items-start gap-2 p-4 text-left transition hover:shadow-raised", r.type === def.type && "border-navy ring-1 ring-navy")}>
            <span className={cx("grid h-8 w-8 place-items-center rounded-lg", r.type === def.type ? "bg-navy text-platinum" : "bg-platinum-bright text-navy-500")}>
              <r.icon className="h-4 w-4" />
            </span>
            <span className="text-sm font-semibold text-navy">{r.title}</span>
            <span className="text-xs leading-snug text-ink-muted">{r.description}</span>
          </button>
        ))}
      </div>

      <Card className="no-print" title={def.title}>
        <div className="flex flex-wrap items-end gap-3">
          {def.params.includes("date") && <Field label="Date">{(id) => <input id={id} type="date" className="input w-44" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />}</Field>}
          {def.params.includes("range") && (
            <>
              <Field label="From">{(id) => <input id={id} type="date" className="input w-44" value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value })} />}</Field>
              <Field label="To">{(id) => <input id={id} type="date" className="input w-44" value={form.to} onChange={(e) => setForm({ ...form, to: e.target.value })} />}</Field>
            </>
          )}
          {def.params.includes("month") && <Field label="Month">{(id) => <input id={id} type="month" className="input w-44" value={form.month} onChange={(e) => setForm({ ...form, month: e.target.value })} />}</Field>}
          {def.params.some((x) => x === "branch" || x === "branchRequired") && (
            <Field label={def.params.includes("branchRequired") ? "Office (required)" : "Office"}>
              {(id) => (
                <select id={id} className="input w-60" value={form.branchId} onChange={(e) => setForm({ ...form, branchId: e.target.value })}>
                  <option value="">{def.params.includes("branchRequired") ? "Choose an office…" : "All permitted offices"}</option>
                  {scoped?.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              )}
            </Field>
          )}
          {def.params.includes("parcel") && (
            <Field label="Tracking ID" hint={parcelId && !form.tracking ? "Parcel selected from its detail page." : undefined}>
              {(id) => <input id={id} className="input mono w-72" placeholder="ABG-261020-HO-00428" value={form.tracking} onChange={(e) => (setForm({ ...form, tracking: e.target.value }), setParcelId(""))} />}
            </Field>
          )}
          <div className="flex gap-2">
            <button className="btn-primary" onClick={() => run.mutate()} disabled={run.isPending || needsBranch || needsParcel}>
              {run.isPending && <Loader2 className="h-4 w-4 animate-spin" />} View report
            </button>
            <button className="btn-secondary" onClick={csv} disabled={needsBranch || needsParcel || (def.params.includes("parcel") && !parcelId)}>
              <Download className="h-4 w-4" /> CSV
            </button>
            <button className="btn-secondary" onClick={() => window.print()} disabled={!report}>
              <Printer className="h-4 w-4" /> Print
            </button>
          </div>
        </div>
        <div className="mt-3">
          <ErrorNote error={run.error} />
        </div>
      </Card>

      {report && (
        <section className="card overflow-hidden print:border-0">
          <header className="flex items-center justify-between gap-4 bg-midnight px-6 py-4" style={{ printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" }}>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-platinum-deep">ABG Dispatch · Anvir Bashundhara Group</p>
              <h2 className="font-display text-xl font-extrabold text-platinum-bright">{report.title}</h2>
              <p className="text-xs text-platinum">{report.subtitle}</p>
            </div>
            <img src="/brand/abg-logo-light.png" alt="ABG" className="h-10" />
          </header>
          {report.rows.length === 0 ? (
            <Empty title="No rows for these settings" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px] print:text-[9pt]">
                <thead className="border-b border-line bg-surface text-xs text-ink-muted">
                  <tr>
                    {report.columns.map((c) => (
                      <th key={c.key} className="whitespace-nowrap px-4 py-2.5 font-semibold">
                        {c.label.replace(" (UTC)", "")}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {report.rows.map((r, i) => (
                    <tr key={i} className="align-top">
                      {report.columns.map((c) => (
                        <td key={c.key} className={cx("px-4 py-2", c.key === "trackingNumber" ? "mono whitespace-nowrap text-navy" : typeof r[c.key] === "number" ? "tabular text-right" : typeof r[c.key] === "string" && ISO.test(String(r[c.key])) ? "whitespace-nowrap" : "")}>
                          {cell(r[c.key])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <footer className="flex flex-wrap justify-between gap-2 border-t border-line px-6 py-3 text-xs text-ink-muted">
            <span>
              {report.rows.length} row{report.rows.length === 1 ? "" : "s"} · generated {stamp(report.generatedAt)} by {profile.displayName}
            </span>
            <span>Times in Asia/Dhaka. Generated from the append-only custody ledger.</span>
          </footer>
        </section>
      )}
    </div>
  );
}
