import { useState, type FormEvent } from "react";
import { nextDeskStatuses, useCreateDeskRecord, useDeskAction, useDeskRecords, useSetDeskStatus, type DeskAction, type DeskModule, type DeskRecord } from "../../api/desk";
import { Button } from "../../components/ui/Button";
import { ErrorState, LoadingSkeleton } from "../../components/ui/States";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { apiErrorMessage } from "../../lib/apiError";
import { formatBdt } from "../../lib/money";
import { useI18n } from "../../lib/i18n";
import { featureForm, type DeskField } from "./featureForms";

const INPUT = "mt-1 min-h-11 w-full rounded-md border border-[var(--border-strong)] bg-[var(--surface-secondary)] px-3";

function formatStamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Dhaka",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function cell(row: DeskRecord, field: DeskField, titleKey: string, partyKey: string, lang: "en" | "bn"): string {
  if (field.kind === "stamp") {
    const stamp = row.details?.[field.key];
    return typeof stamp === "string" && stamp ? formatStamp(stamp) : "Not yet";
  }
  const value = row.details?.[field.key];
  if (value == null || value === "") {
    if (field.key === titleKey) return row.title;
    if (field.key === partyKey && field.key !== titleKey) return row.party;
    return "—";
  }
  if (field.money && typeof value === "number") return formatBdt(value, lang);
  return String(value);
}

export function FeatureRegister({
  module,
  featureKey,
  featureLabel,
  canWrite,
}: {
  module: DeskModule;
  featureKey: string;
  featureLabel: string;
  canWrite: boolean;
}) {
  const form = featureForm(featureKey);
  const { lang } = useI18n();
  const records = useDeskRecords(module, featureKey);
  const create = useCreateDeskRecord(module);
  const setStatus = useSetDeskStatus(module);
  const act = useDeskAction(module);
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  if (!form) {
    return <p className="text-sm text-text-dim">This feature is not on the module list.</p>;
  }
  const desk = form;

  const entryFields = desk.fields.filter((field) => field.kind !== "stamp");
  const columns = desk.fields.filter((field) => field.list !== false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const details: Record<string, string | number> = {};
    for (const field of entryFields) {
      const raw = values[field.key]?.trim() ?? "";
      if (!raw) {
        if (field.required) {
          setError(`${field.label} is required.`);
          return;
        }
        continue;
      }
      if (field.kind === "number") {
        const amount = Number(raw);
        if (Number.isNaN(amount)) {
          setError(`${field.label} must be a number.`);
          return;
        }
        details[field.key] = amount;
      } else {
        details[field.key] = raw;
      }
    }
    const title = String(details[desk.titleKey] ?? "");
    const party = String(details[desk.partyKey] ?? "");
    const amountValue = desk.amountKey ? details[desk.amountKey] : undefined;
    try {
      await create.mutateAsync({
        featureKey,
        title,
        party,
        notes: typeof details.notes === "string" ? details.notes : "",
        amountBdt: typeof amountValue === "number" && amountValue >= 0 ? amountValue : undefined,
        detailsJson: JSON.stringify(details),
      });
      setValues({});
    } catch (err) {
      setError(apiErrorMessage(err, "Could not save this record."));
    }
  }

  async function run(id: string, action: DeskAction) {
    setError(null);
    try {
      await act.mutateAsync({ id, action });
    } catch (err) {
      setError(apiErrorMessage(err, "Could not update this record."));
    }
  }

  return (
    <section className="mb-6">
      <h2 className="font-display text-2xl uppercase text-[var(--brand-gold)]">{featureLabel}</h2>
      <p className="mt-1 max-w-3xl text-sm text-text-dim">{desk.blurb}</p>
      {canWrite && (
        <form className="panel mt-3 grid gap-3 p-4 md:grid-cols-2" onSubmit={(event) => void submit(event)}>
          {entryFields.map((field) => (
            <label key={field.key} className={`text-sm ${field.kind === "textarea" ? "md:col-span-2" : ""}`}>
              {field.label}
              {field.kind === "select" ? (
                <select required={field.required} value={values[field.key] ?? ""} onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))} className={INPUT}>
                  <option value="">Select</option>
                  {(field.options ?? []).map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              ) : field.kind === "textarea" ? (
                <textarea value={values[field.key] ?? ""} onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))} className={`${INPUT} min-h-20 py-2`} />
              ) : (
                <input
                  required={field.required}
                  minLength={field.kind === "text" && field.required ? 2 : undefined}
                  type={field.kind === "number" ? "number" : field.kind === "date" ? "date" : field.kind === "time" ? "time" : "text"}
                  step={field.kind === "number" ? "any" : undefined}
                  value={values[field.key] ?? ""}
                  onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))}
                  className={INPUT}
                />
              )}
            </label>
          ))}
          {error && <p className="text-sm text-[var(--status-danger)] md:col-span-2" role="alert">{error}</p>}
          <div><Button type="submit" disabled={create.isPending}>{create.isPending ? "Saving…" : "Save record"}</Button></div>
        </form>
      )}
      {!canWrite && error && <p className="mt-3 text-sm text-[var(--status-danger)]" role="alert">{error}</p>}
      <div className="mt-4 overflow-x-auto rounded-lg border border-[var(--border-strong)]">
        {records.isLoading && <LoadingSkeleton />}
        {records.isError && <ErrorState message={apiErrorMessage(records.error, "Could not load records.")} onRetry={() => void records.refetch()} />}
        {records.data && (
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-[var(--border-strong)] text-left text-xs uppercase tracking-[0.14em] text-text-dim">
                <th className="px-3 py-3 font-medium">Reference</th>
                {columns.map((field) => <th key={field.key} className="px-3 py-3 font-medium">{field.label}</th>)}
                <th className="px-3 py-3 font-medium">Status</th>
                {canWrite && <th className="px-3 py-3 font-medium">Action</th>}
              </tr>
            </thead>
            <tbody>
              {records.data.length === 0 ? (
                <tr><td colSpan={columns.length + (canWrite ? 3 : 2)} className="px-3 py-8 text-center text-text-dim">No records for this feature yet.</td></tr>
              ) : records.data.map((row) => (
                <tr key={row.id} className="border-b border-[var(--border-strong)] last:border-0">
                  <td className="px-3 py-3">{row.reference}</td>
                  {columns.map((field) => <td key={field.key} className="px-3 py-3">{cell(row, field, desk.titleKey, desk.partyKey, lang)}</td>)}
                  <td className="px-3 py-3"><StatusBadge status={row.status} /></td>
                  {canWrite && (
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-2">
                        {desk.workflow === "attendance" && !row.details?.checkInAt && (
                          <Button type="button" disabled={act.isPending} onClick={() => void run(row.id, "CHECK_IN")}>Check in</Button>
                        )}
                        {desk.workflow === "attendance" && row.details?.checkInAt && !row.details?.checkOutAt && (
                          <Button type="button" variant="secondary" disabled={act.isPending} onClick={() => void run(row.id, "CHECK_OUT")}>Check out</Button>
                        )}
                        {desk.workflow === "approval" && row.status === "PENDING" && (
                          <>
                            <Button type="button" disabled={act.isPending} onClick={() => void run(row.id, "APPROVE")}>Approve</Button>
                            <Button type="button" variant="danger" disabled={act.isPending} onClick={() => void run(row.id, "REJECT")}>Reject</Button>
                          </>
                        )}
                        {desk.workflow === "module" && nextDeskStatuses(module, row.status).map((status) => (
                          <Button key={status} type="button" variant="secondary" disabled={setStatus.isPending} onClick={() => void setStatus.mutateAsync({ id: row.id, status }).catch((err) => setError(apiErrorMessage(err, "Could not update this record.")))}>
                            {status === "POSTED" ? "Post" : status === "REVERSED" ? "Reverse" : status === "SUBMITTED" ? "Submit" : status === "APPROVED" ? "Approve" : status === "RETURNED" ? "Return" : status === "CLOSED" ? "Close" : status === "ACTIVE" ? "Activate" : status}
                          </Button>
                        ))}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
