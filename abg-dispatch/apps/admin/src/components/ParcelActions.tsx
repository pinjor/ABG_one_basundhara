import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertOctagon,
  Ban,
  BellRing,
  CalendarClock,
  ClipboardCheck,
  FilePenLine,
  Flag,
  KeyRound,
  Loader2,
  MapPin,
  PauseCircle,
  RotateCcw,
  Truck,
  Undo2,
  UserCheck,
  UserRoundCog,
  type LucideIcon,
} from "lucide-react";
import { CARRIER_TYPE_LABEL, CarrierType, EXCEPTION_LABEL, ExternalStatus, STATUS_LABEL, STATUS_TRANSITIONS, type ParcelStatus } from "@abg-dispatch/shared";
import { api, newKey } from "../lib/api";
import type { Parcel, TimelineEvent } from "../lib/types";
import { useProviders } from "../lib/lookups";
import { stamp } from "../lib/format";
import { ErrorNote, Field, Modal, cx } from "./ui";
import { toast } from "./toast";

interface Meta {
  label: string;
  icon: LucideIcon;
  group: "custody" | "admin";
  danger?: boolean;
}

const META: Record<string, Meta> = {
  ASSIGN_CARRIER: { label: "Assign courier", icon: UserRoundCog, group: "custody" },
  CONFIRM_HANDOVER_OFFICER: { label: "Confirm handover at desk", icon: ClipboardCheck, group: "custody" },
  START_TRANSIT: { label: "Mark in transit", icon: Truck, group: "custody" },
  CHECKPOINT: { label: "Add checkpoint", icon: Flag, group: "custody" },
  MARK_ARRIVED: { label: "Mark arrived", icon: MapPin, group: "custody" },
  RECEIVE_WITH_CODE: { label: "Receive with receiver's code", icon: KeyRound, group: "custody" },
  RECEIVE_ON_BEHALF: { label: "Receive on behalf at desk", icon: UserCheck, group: "custody" },
  EXTERNAL_STATUS: { label: "Update courier status", icon: Truck, group: "custody" },
  START_RETURN: { label: "Start return", icon: RotateCcw, group: "custody" },
  CONFIRM_RETURN: { label: "Confirm returned to sender", icon: Undo2, group: "custody" },
  RECORD_EXCEPTION: { label: "Record exception", icon: AlertOctagon, group: "admin" },
  PUT_ON_HOLD: { label: "Put on hold", icon: PauseCircle, group: "admin" },
  UPDATE_SLA: { label: "Change expected delivery", icon: CalendarClock, group: "admin" },
  RESEND_NOTIFICATION: { label: "Resend notification", icon: BellRing, group: "admin" },
  CORRECT: { label: "Add correction", icon: FilePenLine, group: "admin" },
  REQUEST_RETURN: { label: "Request return", icon: Undo2, group: "admin", danger: true },
  CANCEL: { label: "Cancel parcel", icon: Ban, group: "admin", danger: true },
};

export const PORTAL_ACTIONS = Object.keys(META);

const CORRECTABLE = [
  ["title", "Title"],
  ["description", "Description"],
  ["priority", "Priority"],
  ["expectedDeliveryAt", "Expected delivery"],
  ["externalTrackingNumber", "Courier tracking number"],
  ["externalBookingReference", "Courier booking reference"],
  ["riderName", "Rider name"],
  ["riderPhone", "Rider phone"],
] as const;

/** Dhaka has no daylight saving: a datetime-local value is read as UTC+06:00. */
const fromDhakaInput = (v: string) => new Date(`${v}:00+06:00`).toISOString();
const toDhakaInput = (iso: string | null) => (iso ? new Date(new Date(iso).getTime() + 6 * 3_600_000).toISOString().slice(0, 16) : "");

export function ActionButtons({ parcel, onPick }: { parcel: Parcel; onPick: (a: string) => void }) {
  const available = parcel.viewer.actions.filter((a) => META[a]);
  const custody = available.filter((a) => META[a].group === "custody");
  const admin = available.filter((a) => META[a].group === "admin");
  if (!available.length) return <p className="text-sm text-ink-muted">No actions are open to your role at this stage.</p>;
  const label = (a: string) => (a === "ASSIGN_CARRIER" && parcel.carrier ? "Reassign courier" : META[a].label);
  return (
    <div className="space-y-4">
      {custody.length > 0 && (
        <div className="space-y-2">
          {custody.map((a, i) => {
            const M = META[a];
            return (
              <button key={a} className={cx("w-full justify-start", i === 0 ? "btn-primary" : "btn-secondary")} onClick={() => onPick(a)}>
                <M.icon className="h-4 w-4" /> {label(a)}
              </button>
            );
          })}
        </div>
      )}
      {admin.length > 0 && (
        <div>
          <p className="overline mb-2">Administration</p>
          <div className="grid grid-cols-1 gap-1">
            {admin.map((a) => {
              const M = META[a];
              return (
                <button key={a} className={cx("btn-ghost h-9 justify-start px-2.5 font-medium", M.danger && "text-danger hover:bg-danger-soft")} onClick={() => onPick(a)}>
                  <M.icon className="h-4 w-4" /> {M.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

interface Props {
  action: string | null;
  parcel: Parcel;
  events: TimelineEvent[];
  exceptionId?: string;
  onClose: () => void;
}

export function ActionDialog({ action, parcel, events, exceptionId, onClose }: Props) {
  const qc = useQueryClient();
  const providers = useProviders();
  const [f, setF] = useState<Record<string, string>>({ carrierType: parcel.deliveryMethod, audience: "RECEIVER", expectedDeliveryAt: toDhakaInput(parcel.expectedDeliveryAt), code: "OTHER" });
  const [employeeQuery, setEmployeeQuery] = useState("");
  const [codeSent, setCodeSent] = useState<{ sentTo: string | null; devOtp?: string } | null>(null);
  const [witnessed, setWitnessed] = useState(false);
  const v = (k: string) => f[k] ?? "";
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF((s) => ({ ...s, [k]: e.target.value }));
  const id = parcel.id;
  const opt = (s: string) => s.trim() || undefined;

  const employees = useQuery({
    queryKey: ["directory", "employees", employeeQuery],
    queryFn: () => api.get<{ id: string; employeeCode: string; fullName: string; designation: string | null; branch: { name: string } | null }[]>(`/directory/employees?q=${encodeURIComponent(employeeQuery)}`),
    enabled: action === "ASSIGN_CARRIER" && v("carrierType") === CarrierType.INTERNAL_EMPLOYEE && employeeQuery.trim().length >= 2,
  });

  const run = useMutation({
    mutationFn: async (): Promise<unknown> => {
      switch (action) {
        case "ASSIGN_CARRIER": {
          const type = v("carrierType");
          const body: Record<string, unknown> = { type, reason: parcel.carrier ? v("reason") : opt(v("reason")) };
          if (type === CarrierType.INTERNAL_EMPLOYEE) body.employeeId = v("employeeId");
          if (type === CarrierType.EXTERNAL_COURIER)
            body.external = { providerId: v("providerId"), trackingNumber: opt(v("trackingNumber")), bookingReference: opt(v("bookingReference")), riderName: opt(v("riderName")), riderPhone: opt(v("riderPhone")), trackingUrl: opt(v("trackingUrl")) };
          if (type === CarrierType.GUEST_PERSON)
            body.guest = { fullName: v("guestName"), phone: v("guestPhone"), company: opt(v("guestCompany")), vehicleNumber: opt(v("vehicle")), idType: opt(v("idType")), idReference: opt(v("idReference")) };
          return api.post(`/parcels/${id}/carrier`, body, newKey());
        }
        case "CONFIRM_HANDOVER_OFFICER":
          return api.post(`/parcels/${id}/handover/confirm`, { method: "DISPATCH_OFFICER", notes: opt(v("notes")) }, newKey());
        case "START_TRANSIT":
          return api.post(`/parcels/${id}/in-transit`, { notes: opt(v("notes")) }, newKey());
        case "CHECKPOINT":
          return api.post(`/parcels/${id}/checkpoint`, { label: opt(v("label")), notes: opt(v("notes")) }, newKey());
        case "MARK_ARRIVED":
          return api.post(`/parcels/${id}/arrive`, { notes: opt(v("notes")) }, newKey());
        case "RECEIVE_WITH_CODE":
          if (!codeSent) {
            const res = await api.post<{ sentTo: string | null; devOtp?: string }>(`/parcels/${id}/receipt-code`, {});
            setCodeSent(res);
            return "code-sent";
          }
          return api.post(`/parcels/${id}/receive`, { method: "OTP", code: v("otp"), notes: opt(v("notes")) }, newKey());
        case "RECEIVE_ON_BEHALF":
          return api.post(`/parcels/${id}/receive`, { method: "APP_CONFIRMATION", onBehalf: { reason: v("reason"), relationship: opt(v("relationship")) }, notes: opt(v("notes")) }, newKey());
        case "EXTERNAL_STATUS":
          return api.post(`/parcels/${id}/external-status`, { rawStatus: v("rawStatus"), normalized: opt(v("normalized")), note: opt(v("notes")), recipientName: opt(v("recipientName")) });
        case "START_RETURN":
          return api.post(`/parcels/${id}/return/start`, { notes: opt(v("notes")) });
        case "CONFIRM_RETURN":
          return api.post(`/parcels/${id}/return/complete`, { method: "DISPATCH_OFFICER", notes: opt(v("notes")) });
        case "RECORD_EXCEPTION":
          return api.post(`/parcels/${id}/exceptions`, { code: v("code"), details: v("details"), setStatus: opt(v("setStatus")) }, newKey());
        case "PUT_ON_HOLD":
          return api.post(`/parcels/${id}/exceptions`, { code: v("code") === "OTHER" ? "AWAITING_AUTHORIZATION" : v("code"), details: v("details"), setStatus: "ON_HOLD" }, newKey());
        case "RESOLVE_EXCEPTION":
          return api.post(`/parcels/${id}/exceptions/${exceptionId}/resolve`, { resolution: v("resolution"), resumeStatus: opt(v("resumeStatus")) });
        case "UPDATE_SLA":
          return api.post(`/parcels/${id}/sla`, { expectedDeliveryAt: v("expectedDeliveryAt") ? fromDhakaInput(v("expectedDeliveryAt")) : null, reason: opt(v("reason")) });
        case "RESEND_NOTIFICATION":
          return api.post(`/parcels/${id}/notifications/resend`, { audience: v("audience") });
        case "CORRECT":
          return api.post(`/parcels/${id}/corrections`, { reason: v("reason"), eventId: opt(v("eventId")), field: opt(v("field")), value: v("field") ? v("value") : undefined });
        case "CANCEL":
          return api.post(`/parcels/${id}/cancel`, { reason: v("reason") }, newKey());
        case "REQUEST_RETURN":
          return api.post(`/parcels/${id}/return`, { reason: v("reason") }, newKey());
      }
      throw new Error("This action is not available in the control centre.");
    },
    onSuccess: (res) => {
      if (res === "code-sent") return;
      toast.success(action === "RESOLVE_EXCEPTION" ? "Exception resolved" : `${META[action!]?.label ?? "Done"} — recorded in the custody ledger`);
      void qc.invalidateQueries({ queryKey: ["parcel", id] });
      void qc.invalidateQueries({ queryKey: ["timeline", id] });
      void qc.invalidateQueries({ queryKey: ["admin"] });
      onClose();
    },
  });

  if (!action) return null;
  const title = action === "RESOLVE_EXCEPTION" ? "Resolve exception" : action === "ASSIGN_CARRIER" && parcel.carrier ? "Reassign courier" : META[action]?.label ?? action;
  const notes = (label = "Notes (optional)") => <Field label={label}>{(fid) => <textarea id={fid} className="input h-20 py-2" value={v("notes")} onChange={set("notes")} maxLength={1000} />}</Field>;
  const reason = (label = "Reason", min = 3) => (
    <Field label={label} hint={`Required — at least ${min} characters. Saved to the audit trail.`}>
      {(fid) => <textarea id={fid} className="input h-20 py-2" value={v("reason")} onChange={set("reason")} maxLength={500} />}
    </Field>
  );
  const resumeTargets = (STATUS_TRANSITIONS[parcel.status as ParcelStatus] ?? []).filter((s) => !["CANCELLED", "RETURN_REQUESTED", "ON_HOLD", "DELIVERY_EXCEPTION", "DELIVERY_FAILED"].includes(s));

  let body: React.ReactNode = null;
  let valid = true;
  switch (action) {
    case "ASSIGN_CARRIER": {
      const type = v("carrierType");
      valid =
        (type === CarrierType.INTERNAL_EMPLOYEE ? !!v("employeeId") : type === CarrierType.EXTERNAL_COURIER ? !!v("providerId") : v("guestName").trim().length >= 2 && v("guestPhone").replace(/\D/g, "").length >= 10) &&
        (!parcel.carrier || v("reason").trim().length >= 3);
      body = (
        <>
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Carrier type">
            {Object.values(CarrierType).map((t) => (
              <button key={t} type="button" role="radio" aria-checked={type === t} className={cx("rounded-xl border px-3 py-2.5 text-left text-sm font-semibold", type === t ? "border-navy bg-navy text-white" : "border-line text-navy hover:bg-surface")} onClick={() => setF((s) => ({ ...s, carrierType: t }))}>
                {CARRIER_TYPE_LABEL[t]}
              </button>
            ))}
          </div>
          {type === CarrierType.INTERNAL_EMPLOYEE && (
            <div>
              <Field label="Find employee courier">{(fid) => <input id={fid} className="input" placeholder="Name or employee ID, e.g. ABG-4832" value={employeeQuery} onChange={(e) => setEmployeeQuery(e.target.value)} />}</Field>
              <ul className="mt-2 max-h-48 divide-y divide-line overflow-y-auto rounded-xl border border-line">
                {(employees.data ?? []).map((e) => (
                  <li key={e.id}>
                    <button type="button" className={cx("flex w-full items-center justify-between px-3 py-2 text-left text-sm", v("employeeId") === e.id ? "bg-active-soft" : "hover:bg-surface")} onClick={() => setF((s) => ({ ...s, employeeId: e.id }))}>
                      <span>
                        <span className="font-semibold text-ink">{e.fullName}</span> <span className="mono text-xs text-ink-muted">{e.employeeCode}</span>
                        <span className="block text-xs text-ink-muted">
                          {e.designation} · {e.branch?.name}
                        </span>
                      </span>
                      {v("employeeId") === e.id && <span className="text-xs font-semibold text-active">Selected</span>}
                    </button>
                  </li>
                ))}
                {employeeQuery.trim().length < 2 && <li className="px-3 py-3 text-xs text-ink-subtle">Type at least two characters.</li>}
              </ul>
            </div>
          )}
          {type === CarrierType.EXTERNAL_COURIER && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Courier company" className="col-span-2">
                {(fid) => (
                  <select id={fid} className="input" value={v("providerId")} onChange={set("providerId")}>
                    <option value="">Choose…</option>
                    {(providers.data ?? []).filter((p) => p.enabled).map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                )}
              </Field>
              <Field label="Courier tracking number">{(fid) => <input id={fid} className="input" value={v("trackingNumber")} onChange={set("trackingNumber")} />}</Field>
              <Field label="Booking reference">{(fid) => <input id={fid} className="input" value={v("bookingReference")} onChange={set("bookingReference")} />}</Field>
              <Field label="Rider name">{(fid) => <input id={fid} className="input" value={v("riderName")} onChange={set("riderName")} />}</Field>
              <Field label="Rider phone">{(fid) => <input id={fid} className="input" value={v("riderPhone")} onChange={set("riderPhone")} />}</Field>
              <Field label="Tracking link" className="col-span-2">{(fid) => <input id={fid} className="input" placeholder="https://…" value={v("trackingUrl")} onChange={set("trackingUrl")} />}</Field>
            </div>
          )}
          {type === CarrierType.GUEST_PERSON && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Full name">{(fid) => <input id={fid} className="input" value={v("guestName")} onChange={set("guestName")} />}</Field>
              <Field label="Mobile number" hint="They sign in with an SMS code sent here.">{(fid) => <input id={fid} className="input" placeholder="01XXXXXXXXX" value={v("guestPhone")} onChange={set("guestPhone")} />}</Field>
              <Field label="Company (optional)">{(fid) => <input id={fid} className="input" value={v("guestCompany")} onChange={set("guestCompany")} />}</Field>
              <Field label="Vehicle number (optional)">{(fid) => <input id={fid} className="input" value={v("vehicle")} onChange={set("vehicle")} />}</Field>
              <Field label="ID type (optional)">{(fid) => <input id={fid} className="input" placeholder="NID, driving licence…" value={v("idType")} onChange={set("idType")} />}</Field>
              <Field label="ID reference (optional)">{(fid) => <input id={fid} className="input" value={v("idReference")} onChange={set("idReference")} />}</Field>
            </div>
          )}
          {parcel.carrier ? reason("Why is the courier changing?") : null}
          {parcel.carrier?.custodyStartedAt && <p className="rounded-xl bg-pending-soft px-3 py-2 text-xs text-pending">{parcel.carrier.name} currently holds this parcel. The new courier must complete a verified handover before custody moves.</p>}
        </>
      );
      break;
    }
    case "CONFIRM_HANDOVER_OFFICER":
      valid = witnessed;
      body = (
        <>
          <p className="text-sm text-ink-muted">
            Confirm that <strong className="text-ink">{parcel.carrier?.name}</strong> collected the sealed parcel from the dispatch desk. Custody passes to the courier from this moment.
          </p>
          <label className="flex items-start gap-2 rounded-xl border border-line p-3 text-sm">
            <input type="checkbox" className="mt-0.5" checked={witnessed} onChange={(e) => setWitnessed(e.target.checked)} />
            <span>I witnessed the handover and checked the label matches {parcel.trackingNumber}.</span>
          </label>
          {notes()}
        </>
      );
      break;
    case "CHECKPOINT":
      body = (
        <>
          <Field label="Checkpoint">{(fid) => <input id={fid} className="input" placeholder="e.g. Gazipur hub, security gate" value={v("label")} onChange={set("label")} maxLength={120} />}</Field>
          {notes()}
        </>
      );
      break;
    case "START_TRANSIT":
    case "START_RETURN":
      body = notes();
      break;
    case "MARK_ARRIVED":
      body = (
        <>
          <p className="rounded-xl bg-pending-soft px-3 py-2 text-sm text-pending">Arrival is not receipt. The parcel becomes Pending Receipt and the receiver is asked to confirm.</p>
          {notes()}
        </>
      );
      break;
    case "CONFIRM_RETURN":
      body = (
        <>
          <p className="text-sm text-ink-muted">Confirm the parcel is back with the sender's office. This closes the parcel as Returned.</p>
          {notes()}
        </>
      );
      break;
    case "RECEIVE_WITH_CODE":
      valid = !codeSent || /^\d{6}$/.test(v("otp"));
      body = !codeSent ? (
        <p className="text-sm text-ink-muted">
          A 6-digit code will be sent by SMS to the intended receiver{parcel.receiver.employee ? ` (${parcel.receiver.employee.fullName})` : ""}. They read it out only when the parcel is in their hands.
        </p>
      ) : (
        <>
          <p className="text-sm text-ink-muted">
            Code sent to <strong className="text-ink">{codeSent.sentTo ?? "the receiver"}</strong>.
            {codeSent.devOtp && <span className="ml-1 rounded bg-pending-soft px-1.5 py-0.5 text-xs font-semibold text-pending">Development code: {codeSent.devOtp}</span>}
          </p>
          <Field label="Receiver's code">{(fid) => <input id={fid} className="input mono h-12 text-center text-xl tracking-[0.4em]" inputMode="numeric" maxLength={6} value={v("otp")} onChange={(e) => setF((s) => ({ ...s, otp: e.target.value.replace(/\D/g, "") }))} />}</Field>
          {notes()}
        </>
      );
      break;
    case "RECEIVE_ON_BEHALF":
      valid = v("reason").trim().length >= 3;
      body = (
        <>
          <p className="text-sm text-ink-muted">You will be recorded as the actual receiver, on behalf of {parcel.receiver.employee?.fullName ?? parcel.receiver.department?.name ?? "the intended receiver"}, who is notified at once.</p>
          {reason("Why are you receiving it?")}
          <Field label="Relationship (optional)">{(fid) => <input id={fid} className="input" placeholder="e.g. Front desk, colleague, assistant" value={v("relationship")} onChange={set("relationship")} />}</Field>
        </>
      );
      break;
    case "EXTERNAL_STATUS":
      valid = v("rawStatus").trim().length > 0;
      body = (
        <>
          <Field label="Status reported by the courier">{(fid) => <input id={fid} className="input" placeholder="e.g. Out for delivery" value={v("rawStatus")} onChange={set("rawStatus")} />}</Field>
          <Field label="Means" hint="Leave blank to map automatically. Delivered by a courier still needs receiver confirmation.">
            {(fid) => (
              <select id={fid} className="input" value={v("normalized")} onChange={set("normalized")}>
                <option value="">Map automatically</option>
                {Object.values(ExternalStatus).map((s) => (
                  <option key={s} value={s}>
                    {s.replace(/_/g, " ").toLowerCase()}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field label="Recipient name (if delivered)">{(fid) => <input id={fid} className="input" value={v("recipientName")} onChange={set("recipientName")} />}</Field>
          {notes("Note (optional)")}
        </>
      );
      break;
    case "RECORD_EXCEPTION":
    case "PUT_ON_HOLD":
      valid = v("details").trim().length >= 3;
      body = (
        <>
          <Field label="What happened">
            {(fid) => (
              <select id={fid} className="input" value={v("code")} onChange={set("code")}>
                {Object.entries(EXCEPTION_LABEL).map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field label="Details">{(fid) => <textarea id={fid} className="input h-24 py-2" value={v("details")} onChange={set("details")} maxLength={1000} />}</Field>
          {action === "RECORD_EXCEPTION" && (
            <Field label="Change status">
              {(fid) => (
                <select id={fid} className="input" value={v("setStatus")} onChange={set("setStatus")}>
                  <option value="">Keep current status (flag only)</option>
                  <option value="DELIVERY_EXCEPTION">Exception</option>
                  <option value="DELIVERY_FAILED">Delivery failed</option>
                </select>
              )}
            </Field>
          )}
          {action === "PUT_ON_HOLD" && <p className="text-xs text-ink-muted">The parcel stops moving until the exception is resolved. Parties are notified.</p>}
        </>
      );
      break;
    case "RESOLVE_EXCEPTION":
      valid = v("resolution").trim().length >= 3;
      body = (
        <>
          <Field label="How was it resolved?">{(fid) => <textarea id={fid} className="input h-24 py-2" value={v("resolution")} onChange={set("resolution")} maxLength={1000} />}</Field>
          {resumeTargets.length > 0 && ["ON_HOLD", "DELIVERY_EXCEPTION", "DELIVERY_FAILED"].includes(parcel.status) && (
            <Field label="Resume as" hint="Defaults to the status it had before the exception.">
              {(fid) => (
                <select id={fid} className="input" value={v("resumeStatus")} onChange={set("resumeStatus")}>
                  <option value="">Previous status</option>
                  {resumeTargets.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </option>
                  ))}
                </select>
              )}
            </Field>
          )}
        </>
      );
      break;
    case "UPDATE_SLA":
      body = (
        <>
          <Field label="Expected delivery (Asia/Dhaka)" hint="Leave empty to remove the deadline.">{(fid) => <input id={fid} type="datetime-local" className="input" value={v("expectedDeliveryAt")} onChange={set("expectedDeliveryAt")} />}</Field>
          <Field label="Reason (optional)">{(fid) => <input id={fid} className="input" value={v("reason")} onChange={set("reason")} maxLength={500} />}</Field>
        </>
      );
      break;
    case "RESEND_NOTIFICATION":
      body = (
        <Field label="Send to">
          {(fid) => (
            <select id={fid} className="input" value={v("audience")} onChange={set("audience")}>
              <option value="RECEIVER">Receiver</option>
              <option value="SENDER">Sender</option>
              <option value="CARRIER">Courier</option>
            </select>
          )}
        </Field>
      );
      break;
    case "CORRECT":
      valid = v("reason").trim().length >= 5 && (!v("field") || v("value").trim().length > 0);
      body = (
        <>
          <p className="rounded-xl bg-platinum-bright px-3 py-2 text-xs text-navy-500">The ledger is append-only. A correction adds a new entry that references the original; nothing is overwritten or deleted.</p>
          <Field label="Ledger entry (optional)">
            {(fid) => (
              <select id={fid} className="input" value={v("eventId")} onChange={set("eventId")}>
                <option value="">The parcel as a whole</option>
                {events.map((e) => (
                  <option key={e.id} value={e.id}>
                    #{e.sequence} {e.label} — {stamp(e.at)}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Field to change (optional)">
              {(fid) => (
                <select id={fid} className="input" value={v("field")} onChange={set("field")}>
                  <option value="">Annotation only</option>
                  {CORRECTABLE.map(([k, l]) => (
                    <option key={k} value={k}>
                      {l}
                    </option>
                  ))}
                </select>
              )}
            </Field>
            <Field label="New value">{(fid) => <input id={fid} className="input" disabled={!v("field")} placeholder={v("field") === "priority" ? "NORMAL, PRIORITY, URGENT or CRITICAL" : ""} value={v("value")} onChange={set("value")} />}</Field>
          </div>
          {reason("Explanation", 5)}
        </>
      );
      break;
    case "CANCEL":
    case "REQUEST_RETURN":
      valid = v("reason").trim().length >= 3;
      body = (
        <>
          <p className="text-sm text-ink-muted">{action === "CANCEL" ? "Cancelling ends the parcel. The sender, receiver and courier are told." : "The courier is asked to bring the parcel back to the sender's office."}</p>
          {reason()}
        </>
      );
      break;
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={title}
      subtitle={`${parcel.trackingNumber} · ${parcel.title}`}
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>
            Close
          </button>
          <button className={META[action]?.danger ? "btn-danger" : "btn-primary"} disabled={!valid || run.isPending} onClick={() => run.mutate()}>
            {run.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {action === "RECEIVE_WITH_CODE" && !codeSent ? "Send code" : action === "RECEIVE_WITH_CODE" ? "Confirm receipt" : "Confirm"}
          </button>
        </>
      }
    >
      {body}
      <ErrorNote error={run.error} />
    </Modal>
  );
}
