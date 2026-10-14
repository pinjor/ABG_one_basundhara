import { useMemo, useState } from "react";
import { canWriteModule } from "@bsc/shared";
import {
  useCreateMatchEvent,
  useDecideRefund,
  useRefunds,
  useSetSalesStatus,
  useStaffEvents,
  useStaffOrders,
  useTicketAnalytics,
  type RefundRow,
} from "../../api/ticketing";
import { BarChart, ChartPanel, DonutChart } from "../../components/ui/Charts";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { DataTable } from "../../components/ui/DataTable";
import { Button } from "../../components/ui/Button";
import { Icon } from "../../components/ui/Icon";
import { KPIStatCard } from "../../components/ui/KPIStatCard";
import { ErrorState, LoadingSkeleton } from "../../components/ui/States";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { apiErrorMessage } from "../../lib/apiError";
import { useI18n } from "../../lib/i18n";
import { formatBdt, formatWhen } from "../../lib/money";
import { useActiveFeature } from "../../hooks/useActiveFeature";
import { FeatureRegister } from "../platform/FeatureRegister";
import { useAuthStore } from "../../store/auth";

function FeatureStrip() {
  const { feature, module } = useActiveFeature();
  const role = useAuthStore((s) => s.user?.role);
  if (!feature) return null;
  return (
    <FeatureRegister
      key={feature.key}
      module="ticketing"
      featureKey={feature.key}
      featureLabel={feature.label}
      canWrite={canWriteModule(role, module?.key ?? "")}
    />
  );
}

function LiveNote() {
  const { t } = useI18n();
  return <p className="mb-4 text-xs text-text-dim">{t("ops.live")}</p>;
}

export function TicketingOverview() {
  const { t, lang } = useI18n();
  const analytics = useTicketAnalytics();
  const data = analytics.data;
  return (
    <div>
      <h1 className="font-display text-3xl uppercase text-[var(--brand-gold)]">{t("ops.overview")}</h1>
      <LiveNote />
      {analytics.isLoading && <LoadingSkeleton />}
      {analytics.isError && <ErrorState message={apiErrorMessage(analytics.error, t("common.error"))} onRetry={() => void analytics.refetch()} />}
      {data && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KPIStatCard icon={<Icon name="ticket" className="h-4 w-4" />} label="Tickets sold" value={String(data.ticketsSold)} series={data.salesByDay.map((day) => day.tickets)} />
            <KPIStatCard icon={<Icon name="card" className="h-4 w-4" />} label="Confirmed revenue" value={formatBdt(data.revenueConfirmed, lang)} hint="BDT" />
            <KPIStatCard icon={<Icon name="chart" className="h-4 w-4" />} label="Captured payments" value={String(data.payments.captured)} />
            <KPIStatCard icon={<Icon name="alert" className="h-4 w-4" />} label="Failed payments" value={String(data.payments.failed)} />
          </div>
          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            <ChartPanel title="Ticket sales by day" caption="Asia/Dhaka dates of confirmed orders" table={{ columns: ["Date", "Tickets", "Revenue"], rows: data.salesByDay.map((day) => [day.date, day.tickets, day.revenue]) }}>
              <BarChart label="Ticket sales by day" series={data.salesByDay.map((day) => ({ label: day.date, value: day.tickets }))} />
            </ChartPanel>
            <ChartPanel title="Payment outcomes" table={{ columns: ["Outcome", "Count"], rows: [["Captured", data.payments.captured], ["Failed", data.payments.failed], ["Refunded", data.payments.refunded]] }}>
              <DonutChart
                label="Payment outcomes"
                series={[
                  { label: "Captured", value: data.payments.captured, color: "var(--brand-gold)" },
                  { label: "Failed", value: data.payments.failed, color: "var(--status-danger)" },
                  { label: "Refunded", value: data.payments.refunded, color: "var(--data-teal)" },
                ]}
              />
            </ChartPanel>
            <ChartPanel title="Sales channel" caption="Only channels that have recorded orders are shown." table={{ columns: ["Channel", "Orders"], rows: data.byChannel.map((row) => [row.channel, row.count]) }}>
              <BarChart label="Sales channel" series={data.byChannel.map((row) => ({ label: row.channel, value: row.count }))} />
            </ChartPanel>
            <section className="panel p-4">
              <h2 className="text-[15px] font-semibold">Recent orders</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {data.recentOrders.length === 0 && <li className="text-text-dim">{t("common.empty")}</li>}
                {data.recentOrders.map((order) => (
                  <li key={order.reference} className="flex items-center justify-between gap-2 border-b border-[var(--border-subtle)] py-2">
                    <span>{order.reference}<br /><span className="text-text-dim">{order.eventTitle}</span></span>
                    <span className="text-right"><StatusBadge status={order.status} /><br /><span className="tabular-nums">{formatBdt(order.total, lang)}</span></span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </>
      )}
    </div>
  );
}

export function TicketingEventsPage() {
  const { t, lang } = useI18n();
  const role = useAuthStore((s) => s.user?.role);
  const canWrite = canWriteModule(role, "ticketing-events");
  const events = useStaffEvents();
  const create = useCreateMatchEvent();
  const sales = useSetSalesStatus();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    sport: "Football",
    venueName: "Bashundhara Sports City Stadium",
    startsAt: "",
    doorsAt: "",
    west: "800",
    east: "800",
    premium: "4500",
  });

  async function save() {
    setError(null);
    try {
      await create.mutateAsync({
        title: form.title,
        sport: form.sport,
        venueName: form.venueName,
        startsAt: new Date(form.startsAt).toISOString(),
        doorsAt: new Date(form.doorsAt).toISOString(),
        vatRateBps: 1500,
        sections: [
          { name: "West Stand", rows: 6, seatsPerRow: 12, priceBdt: Number(form.west), gateName: "Main Gate North" },
          { name: "East Stand", rows: 6, seatsPerRow: 12, priceBdt: Number(form.east), gateName: "Main Gate North" },
          { name: "Premium Box", rows: 2, seatsPerRow: 8, priceBdt: Number(form.premium), gateName: "VIP Gate 1" },
        ],
      });
      setConfirm(false);
      setOpen(false);
    } catch (err) {
      setError(apiErrorMessage(err, t("common.error")));
    }
  }

  return (
    <div>
      <FeatureStrip />
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="font-display text-3xl uppercase text-[var(--brand-gold)]">{t("ops.events")}</h1>
        {canWrite && <Button type="button" onClick={() => setOpen(true)}>New event</Button>}
      </div>
      <LiveNote />
      {events.isLoading && <LoadingSkeleton />}
      {events.isError && <ErrorState message={apiErrorMessage(events.error, t("common.error"))} onRetry={() => void events.refetch()} />}
      {events.data && (
        <DataTable
          rows={events.data}
          keyFor={(row) => row.id}
          emptyLabel={t("events.empty")}
          columns={[
            { header: "Event", accessor: (row) => row.title },
            { header: "When", accessor: (row) => formatWhen(row.startsAt, lang) },
            { header: "Sold", accessor: (row) => `${row.sold} / ${row.capacity}` },
            { header: "Status", accessor: (row) => <StatusBadge status={row.salesStatus} /> },
            { header: "From", accessor: (row) => (row.fromPriceBdt == null ? "—" : formatBdt(row.fromPriceBdt, lang)) },
            {
              header: "Sales",
              accessor: (row) => canWrite ? (
                <Button type="button" variant="secondary" onClick={() => void sales.mutateAsync({ id: row.id, salesStatus: row.salesStatus === "CLOSED" ? "ON_SALE" : "CLOSED" })}>
                  {row.salesStatus === "CLOSED" ? "Open sales" : "Close sales"}
                </Button>
              ) : "—",
            },
          ]}
        />
      )}
      {open && (
        <form className="panel mt-4 grid gap-3 p-4 md:grid-cols-2" onSubmit={(event) => { event.preventDefault(); setConfirm(true); }}>
          <h2 className="md:col-span-2 font-display text-xl uppercase">New event</h2>
          <label className="text-sm">Title<input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className="mt-1 min-h-11 w-full rounded-md border border-[var(--border-strong)] bg-[var(--surface-secondary)] px-3" /></label>
          <label className="text-sm">Sport
            <select value={form.sport} onChange={(event) => setForm({ ...form, sport: event.target.value })} className="mt-1 min-h-11 w-full rounded-md border border-[var(--border-strong)] bg-[var(--surface-secondary)] px-3">
              {["Football", "Cricket", "Tennis"].map((sport) => <option key={sport}>{sport}</option>)}
            </select>
          </label>
          <label className="text-sm md:col-span-2">Venue<input required value={form.venueName} onChange={(event) => setForm({ ...form, venueName: event.target.value })} className="mt-1 min-h-11 w-full rounded-md border border-[var(--border-strong)] bg-[var(--surface-secondary)] px-3" /></label>
          <label className="text-sm">Doors<input required type="datetime-local" value={form.doorsAt} onChange={(event) => setForm({ ...form, doorsAt: event.target.value })} className="mt-1 min-h-11 w-full rounded-md border border-[var(--border-strong)] bg-[var(--surface-secondary)] px-3" /></label>
          <label className="text-sm">Start<input required type="datetime-local" value={form.startsAt} onChange={(event) => setForm({ ...form, startsAt: event.target.value })} className="mt-1 min-h-11 w-full rounded-md border border-[var(--border-strong)] bg-[var(--surface-secondary)] px-3" /></label>
          <label className="text-sm">West Stand price (BDT, excl. VAT)<input required value={form.west} onChange={(event) => setForm({ ...form, west: event.target.value })} className="mt-1 min-h-11 w-full rounded-md border border-[var(--border-strong)] bg-[var(--surface-secondary)] px-3" /></label>
          <label className="text-sm">East Stand price<input required value={form.east} onChange={(event) => setForm({ ...form, east: event.target.value })} className="mt-1 min-h-11 w-full rounded-md border border-[var(--border-strong)] bg-[var(--surface-secondary)] px-3" /></label>
          <label className="text-sm">Premium Box price<input required value={form.premium} onChange={(event) => setForm({ ...form, premium: event.target.value })} className="mt-1 min-h-11 w-full rounded-md border border-[var(--border-strong)] bg-[var(--surface-secondary)] px-3" /></label>
          <p className="md:col-span-2 text-xs text-text-dim">VAT is stored at 15.00% and flagged as pending Finance and Legal confirmation. Saving writes an audit record.</p>
          {error && <p className="md:col-span-2 text-sm text-[var(--status-danger)]">{error}</p>}
          <div className="flex gap-2"><Button type="submit">Review prices</Button><Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button></div>
        </form>
      )}
      <ConfirmDialog
        open={confirm}
        title="Save ticket prices?"
        body="This creates the event and its prices. The change is written to the audit log."
        confirmLabel="Save event"
        busy={create.isPending}
        onClose={() => setConfirm(false)}
        onConfirm={() => void save()}
      />
    </div>
  );
}

export function TicketingOrdersPage() {
  const { t, lang } = useI18n();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const orders = useStaffOrders(search, status);
  return (
    <div>
      <FeatureStrip />
      <h1 className="font-display text-3xl uppercase text-[var(--brand-gold)]">{t("ops.orders")}</h1>
      <LiveNote />
      <div className="mb-3 flex flex-wrap gap-2">
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Reference, name or mobile" className="min-h-11 rounded-md border border-[var(--border-strong)] bg-[var(--surface-secondary)] px-3" />
        <select value={status} onChange={(event) => setStatus(event.target.value)} className="min-h-11 rounded-md border border-[var(--border-strong)] bg-[var(--surface-secondary)] px-3" aria-label="Status">
          <option value="">All statuses</option>
          {["AWAITING_PAYMENT", "PAYMENT_FAILED_RETRY_HOLD", "CONFIRMED", "EXPIRED", "CANCEL_REQUESTED", "REFUNDED"].map((item) => <option key={item}>{item}</option>)}
        </select>
      </div>
      {orders.isLoading && <LoadingSkeleton />}
      {orders.isError && <ErrorState message={apiErrorMessage(orders.error, t("common.error"))} onRetry={() => void orders.refetch()} />}
      {orders.data && (
        <DataTable
          rows={orders.data}
          keyFor={(row) => row.reference}
          columns={[
            { header: "Reference", accessor: (row) => row.reference },
            { header: "Buyer", accessor: (row) => row.buyerName },
            { header: "Event", accessor: (row) => row.eventTitle },
            { header: "Seats", accessor: (row) => row.seats },
            { header: "Total", accessor: (row) => formatBdt(Number(row.total), lang) },
            { header: "Payment", accessor: (row) => row.paymentStatus ?? "—" },
            { header: "Status", accessor: (row) => <StatusBadge status={row.status} /> },
          ]}
        />
      )}
    </div>
  );
}

export function TicketingPaymentsPage() {
  const { t, lang } = useI18n();
  const role = useAuthStore((s) => s.user?.role);
  const canDecide = canWriteModule(role, "ticketing-payments") && role !== "TICKET_ADMINISTRATOR";
  const refunds = useRefunds();
  const decide = useDecideRefund();
  const [pending, setPending] = useState<{ row: RefundRow; decision: "APPROVED" | "REJECTED" } | null>(null);
  const rows = useMemo(() => refunds.data ?? [], [refunds.data]);
  return (
    <div>
      <FeatureStrip />
      <h1 className="font-display text-3xl uppercase text-[var(--brand-gold)]">{t("ops.payments")}</h1>
      <LiveNote />
      <p className="mb-3 text-sm text-text-dim">Refunds are sandbox reversals. Approving one revokes the tickets. Ticket Administrators cannot approve refunds.</p>
      {refunds.isLoading && <LoadingSkeleton />}
      {refunds.isError && <ErrorState message={apiErrorMessage(refunds.error, t("common.error"))} onRetry={() => void refunds.refetch()} />}
      {refunds.data && (
        <DataTable
          rows={rows}
          keyFor={(row) => row.id}
          emptyLabel="No refund requests."
          columns={[
            { header: "Order", accessor: (row) => row.order.reference },
            { header: "Event", accessor: (row) => row.order.event.title },
            { header: "Buyer", accessor: (row) => row.order.buyerName },
            { header: "Amount", accessor: (row) => formatBdt(Number(row.order.total), lang) },
            { header: "Reason", accessor: (row) => row.reason },
            { header: "Status", accessor: (row) => <StatusBadge status={row.status} /> },
            {
              header: "Decision",
              accessor: (row) => row.status === "REQUESTED" && canDecide ? (
                <span className="flex gap-2">
                  <Button type="button" onClick={() => setPending({ row, decision: "APPROVED" })}>Approve</Button>
                  <Button type="button" variant="danger" onClick={() => setPending({ row, decision: "REJECTED" })}>Reject</Button>
                </span>
              ) : "—",
            },
          ]}
        />
      )}
      <ConfirmDialog
        open={!!pending}
        title={pending?.decision === "APPROVED" ? "Approve refund?" : "Reject refund?"}
        body={pending?.decision === "APPROVED" ? "Tickets will be revoked and the sandbox payment marked refunded. This is audit-logged." : "The order returns to confirmed. This is audit-logged."}
        confirmLabel={pending?.decision === "APPROVED" ? "Approve refund" : "Reject refund"}
        danger={pending?.decision === "REJECTED"}
        busy={decide.isPending}
        onClose={() => setPending(null)}
        onConfirm={() => {
          if (!pending) return;
          void decide.mutateAsync({ id: pending.row.id, decision: pending.decision }).finally(() => setPending(null));
        }}
      />
    </div>
  );
}

export function TicketingReportsPage() {
  const { t, lang } = useI18n();
  const analytics = useTicketAnalytics();
  const data = analytics.data;
  function download() {
    if (!data) return;
    const lines = ["section,sold,capacity", ...data.byCategory.map((row) => `${JSON.stringify(row.name)},${row.sold},${row.capacity}`)];
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "ticket-section-utilisation.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }
  return (
    <div>
      <FeatureStrip />
      <div className="mb-2 flex items-center justify-between">
        <h1 className="font-display text-3xl uppercase text-[var(--brand-gold)]">{t("ops.reports")}</h1>
        <Button type="button" variant="secondary" onClick={download} disabled={!data}>Export CSV</Button>
      </div>
      <LiveNote />
      {analytics.isLoading && <LoadingSkeleton />}
      {analytics.isError && <ErrorState message={apiErrorMessage(analytics.error, t("common.error"))} onRetry={() => void analytics.refetch()} />}
      {data && (
        <div className="grid gap-4 xl:grid-cols-2">
          <ChartPanel title="Section utilisation" table={{ columns: ["Section", "Sold", "Capacity"], rows: data.byCategory.map((row) => [row.name, row.sold, row.capacity]) }}>
            <BarChart label="Section utilisation" series={data.byCategory.map((row) => ({ label: row.name, value: row.sold }))} />
          </ChartPanel>
          <ChartPanel title="Check-in versus not yet admitted" table={{ columns: ["State", "Tickets"], rows: [["Admitted", data.checkIn.admitted], ["Not yet admitted", data.checkIn.notYetAdmitted]] }}>
            <DonutChart label="Check-in" series={[{ label: "Admitted", value: data.checkIn.admitted, color: "var(--status-success)" }, { label: "Not yet admitted", value: data.checkIn.notYetAdmitted, color: "var(--brand-gold)" }]} />
          </ChartPanel>
          <ChartPanel title="Entry scans over time" table={{ columns: ["Hour (UTC)", "Scans"], rows: data.scansByHour.map((row) => [row.hour, row.count]) }}>
            <BarChart label="Entry scans" series={data.scansByHour.map((row) => ({ label: row.hour, value: row.count }))} />
          </ChartPanel>
          <ChartPanel title="Event occupancy" table={{ columns: ["Event", "Sold", "Capacity", "Remaining"], rows: data.events.map((row) => [row.title, row.sold, row.capacity, row.remaining]) }}>
            <p className="text-sm text-text-dim">Revenue on this page is {formatBdt(data.revenueConfirmed, lang)} from confirmed orders.</p>
          </ChartPanel>
        </div>
      )}
    </div>
  );
}
