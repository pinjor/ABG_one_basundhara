import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Ban,
  CarFront,
  CheckCircle2,
  CircleX,
  ClipboardCheck,
  Flag,
  Gauge,
  KeyRound,
  Loader2,
  LogIn,
  LogOut,
  MapPin,
  Navigation,
  RefreshCw,
  Send,
  UserCheck,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import { CAR_REQUISITION_STATUS_LABEL, CAR_REQUISITION_STATUS_TONE, FLEET_LIMITS, TRIP_TYPE_LABEL, VEHICLE_PREFERENCE_LABEL, type CarRequisitionStatus, type TripType, type VehiclePreference } from "@abg-dispatch/shared";
import { api, newKey } from "../../lib/api";
import { stamp, when } from "../../lib/format";
import { Card, ErrorNote, Field, KeyValue, Modal, Spinner, cx } from "../../components/ui";
import { toast } from "../../components/toast";
import type { CarRequisition, CarUpdate, Driver, Vehicle } from "./types";
import { CallButton, CarStatusBadge, DriverStatusBadge, PipelineStepper, UrgentTag, VehicleStatusBadge, km } from "./ui";
import { GatePassCard } from "./GatePassCard";

const TONE_BAR: Record<string, string> = { pending: "bg-pending", active: "bg-active", success: "bg-success", neutral: "bg-neutral", danger: "bg-danger" };

type Dialog = "APPROVE" | "REJECT" | "ASSIGN" | "START" | "COMPLETE" | "CANCEL" | null;

function describe(u: CarUpdate): { icon: LucideIcon; tone: string; text: string } {
  const m = u.metadata ?? {};
  switch (u.type) {
    case "SUBMITTED":
      return { icon: Send, tone: "bg-pending-soft text-pending", text: `${u.actor} requested a car${m.approver ? ` — sent to ${m.approver}` : ""}` };
    case "ASSIGNED":
      return { icon: KeyRound, tone: "bg-active-soft text-active", text: `${u.actor} assigned ${m.vehicle} with ${m.driver}` };
    case "REASSIGNED":
      return { icon: RefreshCw, tone: "bg-active-soft text-active", text: `${u.actor} changed the car to ${m.vehicle} with ${m.driver}${m.previous ? ` (was ${m.previous.vehicle}, ${m.previous.driver})` : ""}` };
    case "GATE_SCANNED":
      return m.direction === "RETURN"
        ? { icon: LogIn, tone: "bg-success-soft text-success", text: `${u.actor} recorded the return at the gate${m.odometerKm != null ? ` · ${km(m.odometerKm)}` : ""}${m.distanceKm != null ? ` · ${m.distanceKm} km driven` : ""}` }
        : { icon: LogOut, tone: "bg-active-soft text-active", text: `${u.actor} recorded the exit at the gate${m.odometerKm != null ? ` · ${km(m.odometerKm)}` : ""}` };
    case "STATUS_CHANGED":
      switch (u.toStatus) {
        case "PENDING_FLEET":
          return { icon: UserCheck, tone: "bg-success-soft text-success", text: `${u.actor} approved as head of department` };
        case "REJECTED":
          return { icon: CircleX, tone: "bg-danger-soft text-danger", text: `${u.actor} rejected the request` };
        case "CANCELLED":
          return { icon: Ban, tone: "bg-neutral-soft text-neutral", text: `${u.actor} cancelled the request` };
        case "IN_PROGRESS":
          return { icon: Navigation, tone: "bg-active-soft text-active", text: `${u.actor} started the trip${m.odometerKm != null ? ` · ${km(m.odometerKm)}` : ""}` };
        case "COMPLETED":
          return { icon: Flag, tone: "bg-success-soft text-success", text: `${u.actor} completed the trip${m.odometerKm != null ? ` · ${km(m.odometerKm)}` : ""}${m.distanceKm != null ? ` · ${m.distanceKm} km driven` : ""}` };
      }
      return { icon: ClipboardCheck, tone: "bg-platinum-bright text-navy-500", text: `${u.actor} moved it to ${CAR_REQUISITION_STATUS_LABEL[u.toStatus as CarRequisitionStatus] ?? u.toStatus}` };
    default:
      return { icon: ClipboardCheck, tone: "bg-platinum-bright text-navy-500", text: u.actor };
  }
}

export function CarRequisitionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [dialog, setDialog] = useState<Dialog>(null);
  const [note, setNote] = useState("");
  const [odometer, setOdometer] = useState("");
  const [idemKey, setIdemKey] = useState(newKey);
  const r = useQuery({ queryKey: ["pool-car", "requisition", id], queryFn: () => api.get<CarRequisition>(`/pool-car/requisitions/${id}`), refetchInterval: 60_000 });

  const done = (next: CarRequisition, message: string) => {
    qc.setQueryData(["pool-car", "requisition", id], next);
    void qc.invalidateQueries({ queryKey: ["pool-car"], predicate: (q) => q.queryKey[1] !== "requisition" });
    toast.success(message);
    close();
  };
  const action = useMutation({
    mutationFn: (kind: Exclude<Dialog, "ASSIGN" | null>) => {
      const odo = odometer.trim() ? Number(odometer) : undefined;
      switch (kind) {
        case "APPROVE":
        case "REJECT":
          return api.post<CarRequisition>(`/pool-car/requisitions/${id}/decision`, { decision: kind, note: note.trim() || undefined }, idemKey);
        case "START":
          return api.post<CarRequisition>(`/pool-car/requisitions/${id}/start`, { odometerKm: odo }, idemKey);
        case "COMPLETE":
          return api.post<CarRequisition>(`/pool-car/requisitions/${id}/complete`, { odometerKm: odo }, idemKey);
        case "CANCEL":
          return api.post<CarRequisition>(`/pool-car/requisitions/${id}/cancel`, { note: note.trim() || undefined }, idemKey);
      }
    },
    onSuccess: (next, kind) =>
      done(
        next,
        kind === "APPROVE"
          ? "Approved — the fleet manager will assign a car."
          : kind === "REJECT"
            ? "Rejected — the requester has been told why."
            : kind === "START"
              ? "Trip started."
              : kind === "COMPLETE"
                ? "Trip completed — the car and driver are free again."
                : "Request cancelled.",
      ),
  });
  function close() {
    setDialog(null);
    setNote("");
    setOdometer("");
    setIdemKey(newKey());
    action.reset();
  }

  if (r.isLoading) return <Spinner label="Loading the request" />;
  if (r.error || !r.data) return <ErrorNote error={r.error ?? new Error("Request not found.")} />;
  const c = r.data;
  const actions = new Set(c.viewer.actions);
  const tone = CAR_REQUISITION_STATUS_TONE[c.status as CarRequisitionStatus] ?? "neutral";
  const named = c.passengers.length;

  const buttons: { kind: Exclude<Dialog, null>; label: string; icon: LucideIcon; style: string }[] = [];
  if (actions.has("CANCEL")) buttons.push({ kind: "CANCEL", label: "Cancel request", icon: Ban, style: "btn-ghost" });
  if (actions.has("REJECT")) buttons.push({ kind: "REJECT", label: "Reject", icon: CircleX, style: "btn-secondary" });
  if (actions.has("APPROVE")) buttons.push({ kind: "APPROVE", label: "Approve", icon: CheckCircle2, style: "btn-primary" });
  if (actions.has("REASSIGN")) buttons.push({ kind: "ASSIGN", label: "Reassign", icon: RefreshCw, style: "btn-secondary" });
  if (actions.has("ASSIGN")) buttons.push({ kind: "ASSIGN", label: "Assign car & driver", icon: KeyRound, style: "btn-primary" });
  if (actions.has("START")) buttons.push({ kind: "START", label: "Start trip", icon: Navigation, style: "btn-primary" });
  if (actions.has("COMPLETE")) buttons.push({ kind: "COMPLETE", label: "Complete trip", icon: Flag, style: "btn-primary" });

  const simple = dialog && dialog !== "ASSIGN" ? dialog : null;
  const DIALOG: Record<Exclude<Dialog, "ASSIGN" | null>, { title: string; subtitle: string; confirm: string; danger?: boolean; noteLabel?: string; noteRequired?: boolean; odometer?: boolean }> = {
    APPROVE: { title: "Approve this pool car request", subtitle: "It goes to the fleet manager to assign a car and driver. The requester is told.", confirm: "Approve", noteLabel: "Note for the requester (optional)" },
    REJECT: { title: "Reject this request", subtitle: "The requester is told, with your reason.", confirm: "Reject", danger: true, noteLabel: "Reason", noteRequired: true },
    START: { title: "Start the trip", subtitle: "The car and driver go On trip. Security normally records this by scanning the gate pass.", confirm: "Start trip", odometer: true },
    COMPLETE: { title: "Complete the trip", subtitle: "The car and driver become available again. Enter the odometer to record the distance.", confirm: "Complete trip", odometer: true },
    CANCEL: { title: "Cancel this request?", subtitle: c.status === "ASSIGNED" ? "The car and driver are released and the gate pass stops working. The fleet manager and driver are told." : "It is withdrawn and the approver is told.", confirm: "Cancel request", danger: true, noteLabel: "Reason (optional)" },
  };
  const d = simple ? DIALOG[simple] : null;

  return (
    <div className="space-y-6">
      <Link to="/pool-car" className="no-print inline-flex items-center gap-1.5 text-sm font-semibold text-ink-muted hover:text-navy">
        <ArrowLeft className="h-4 w-4" /> Pool Car Requisition
      </Link>

      <section className="card overflow-hidden">
        <div className={cx("h-1", TONE_BAR[tone])} />
        <div className="flex flex-wrap items-start justify-between gap-4 px-5 pb-5 pt-5 sm:px-6">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="mono text-sm text-navy-500">{c.referenceNumber}</span>
              <CarStatusBadge status={c.status} />
              {c.urgent && <UrgentTag />}
            </div>
            <h1 className="mt-2 break-words font-display text-[24px] font-extrabold leading-tight tracking-tight text-navy sm:text-[26px]">{c.purpose}</h1>
            <p className="mt-1 text-sm text-ink-muted">
              {TRIP_TYPE_LABEL[c.tripType as TripType] ?? c.tripType} · {c.requester.name}, {c.branch.name} · requested {stamp(c.createdAt)}
            </p>
          </div>
          {buttons.length > 0 && (
            <div className="no-print flex w-full flex-wrap gap-2 sm:w-auto">
              {buttons.map((b) => (
                <button key={b.label} className={cx(b.style, "flex-1 sm:flex-none")} onClick={() => setDialog(b.kind)}>
                  <b.icon className="h-4 w-4" /> {b.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="border-t border-line bg-surface/50 px-3 py-5 sm:px-6">
          <PipelineStepper steps={c.pipeline.steps} outcome={c.pipeline.outcome} />
          {c.pipeline.outcome?.note && (
            <p className="mx-auto mt-4 max-w-xl rounded-xl bg-white px-4 py-2.5 text-center text-sm text-ink ring-1 ring-line">
              <span className="font-semibold">{c.pipeline.outcome.label}:</span> {c.pipeline.outcome.note}
            </p>
          )}
          {c.status === "PENDING_HOD" && <p className="mt-4 text-center text-sm text-ink-muted">Waiting for {c.approver.name} to approve.</p>}
          {c.status === "PENDING_FLEET" && <p className="mt-4 text-center text-sm text-ink-muted">Approved. The fleet manager assigns a car and driver next.</p>}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-6">
          <Card title="Trip">
            <div className="flex items-stretch gap-3">
              <div className="flex flex-col items-center py-1" aria-hidden>
                <span className="h-3 w-3 rounded-full border-2 border-navy bg-white" />
                <span className="my-1 w-px flex-1 bg-line-strong" />
                <MapPin className="h-4 w-4 text-danger" />
              </div>
              <div className="min-w-0 flex-1 space-y-4">
                <div>
                  <p className="text-xs font-medium text-ink-subtle">Pick up · {stamp(c.pickupAt)}</p>
                  <p className="break-words text-[15px] font-semibold text-ink">{c.pickupLocation}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-ink-subtle">Going to{c.returnAt ? ` · back by ${stamp(c.returnAt)}` : ""}</p>
                  <p className="break-words text-[15px] font-semibold text-ink">{c.dropLocation}</p>
                </div>
              </div>
            </div>
            <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-line pt-4 sm:grid-cols-4">
              <KeyValue label="Kind of trip">{TRIP_TYPE_LABEL[c.tripType as TripType] ?? c.tripType}</KeyValue>
              <KeyValue label="People">{c.passengerCount}</KeyValue>
              <KeyValue label="Vehicle wanted">{VEHICLE_PREFERENCE_LABEL[c.vehiclePreference as VehiclePreference] ?? c.vehiclePreference}</KeyValue>
              <KeyValue label="Car held until">{when(c.expectedEndAt)}</KeyValue>
            </dl>
            <div className="mt-5">
              <p className="mb-2 text-xs font-medium text-ink-subtle">
                Passengers{named < c.passengerCount ? ` · ${named} named of ${c.passengerCount}` : ""}
              </p>
              {named ? (
                <ul className="grid gap-2 sm:grid-cols-2">
                  {c.passengers.map((p, i) => (
                    <li key={i} className="flex items-center gap-2.5 rounded-xl bg-surface px-3 py-2">
                      <UserRound className="h-4 w-4 shrink-0 text-navy-500" aria-hidden />
                      <span className="min-w-0 flex-1 truncate text-sm text-ink">{p.name}</span>
                      {p.phone && (
                        <a className="mono text-xs text-active hover:underline" href={`tel:${p.phone}`}>
                          {p.phone}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-ink-muted">No names given.</p>
              )}
            </div>
            {c.statusNote && !c.pipeline.outcome && <p className="mt-4 rounded-xl bg-active-soft px-3 py-2 text-sm text-navy">“{c.statusNote}”</p>}
          </Card>

          <Card title="History" action={<span className="text-xs text-ink-subtle">Append-only · Asia/Dhaka</span>}>
            <ol>
              {c.updates.map((u, idx) => {
                const h = describe(u);
                return (
                  <li key={u.id} className="relative flex gap-3 pb-5 last:pb-0">
                    {idx < c.updates.length - 1 && <span className="absolute left-[15px] top-8 h-[calc(100%-24px)] w-px bg-line" aria-hidden />}
                    <span className={cx("relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full", h.tone)}>
                      <h.icon className="h-4 w-4" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1 pt-1">
                      <p className="break-words text-sm font-medium text-ink">{h.text}</p>
                      <p className="text-xs text-ink-subtle">{stamp(u.createdAt)}</p>
                      {u.note && <p className="mt-1.5 rounded-lg bg-surface px-3 py-2 text-sm text-ink">{u.note}</p>}
                    </div>
                  </li>
                );
              })}
            </ol>
          </Card>
        </div>

        <div className="min-w-0 space-y-6">
          <GatePassCard r={c} />

          <Card title="Car & driver">
            {c.vehicle && c.driver ? (
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-navy text-platinum-bright">
                    <CarFront className="h-5 w-5" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="mono text-[15px] text-navy">{c.vehicle.registrationNumber}</p>
                    <p className="text-sm text-ink-muted">
                      {c.vehicle.name} · {c.vehicle.typeLabel} · {c.vehicle.seats} seats{c.vehicle.colour ? ` · ${c.vehicle.colour}` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-platinum-bright text-navy-500">
                    <UserRound className="h-5 w-5" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-semibold text-ink">{c.driver.fullName}</p>
                    <p className="mono text-sm text-ink-muted">{c.driver.phone}</p>
                  </div>
                </div>
                <CallButton phone={c.driver.phone} label="Call driver" compact />
                {(c.odometer.startKm != null || c.odometer.endKm != null) && (
                  <dl className="grid grid-cols-3 gap-3 border-t border-line pt-4">
                    <KeyValue label="Out at">{km(c.odometer.startKm)}</KeyValue>
                    <KeyValue label="Back at">{km(c.odometer.endKm)}</KeyValue>
                    <KeyValue label="Driven">{c.odometer.distanceKm != null ? `${c.odometer.distanceKm} km` : "—"}</KeyValue>
                  </dl>
                )}
              </div>
            ) : (
              <p className="text-sm text-ink-muted">{c.status === "REJECTED" || c.status === "CANCELLED" ? "No car was assigned." : "The fleet manager assigns a car and driver after approval. You will see the driver's number and the gate pass here."}</p>
            )}
          </Card>

          <Card title="People">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <UserRound className="mt-0.5 h-4 w-4 shrink-0 text-navy-500" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-ink-subtle">Requested by</p>
                  <p className="text-sm font-semibold text-ink">
                    {c.requester.name} {c.requester.employeeCode && <span className="mono text-xs font-medium text-ink-muted">{c.requester.employeeCode}</span>}
                  </p>
                  <p className="text-xs text-ink-muted">{[c.requester.designation, c.requester.department].filter(Boolean).join(" · ") || "—"}</p>
                  {c.requester.phone && !c.viewer.isRequester && (
                    <a href={`tel:${c.requester.phone}`} className="mt-1 inline-block text-xs font-semibold text-active hover:underline">
                      {c.requester.phone}
                    </a>
                  )}
                </div>
              </div>
              <div className="flex items-start gap-3">
                <UserCheck className="mt-0.5 h-4 w-4 shrink-0 text-navy-500" aria-hidden />
                <div className="min-w-0">
                  <p className="text-xs text-ink-subtle">Head of department</p>
                  <p className="text-sm font-semibold text-ink">{c.approver.name}</p>
                  <p className="text-xs text-ink-muted">{c.hodApprovedAt ? `Approved ${when(c.hodApprovedAt)}` : c.status === "PENDING_HOD" ? "Decision pending" : c.approver.designation ?? ""}</p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <Modal
        open={!!d}
        onClose={close}
        title={d?.title ?? ""}
        subtitle={d?.subtitle}
        footer={
          d && (
            <>
              <button className="btn-ghost" onClick={close}>
                Back
              </button>
              <button className={d.danger ? "btn-danger" : "btn-primary"} disabled={action.isPending || (d.noteRequired && note.trim().length < 3)} onClick={() => action.mutate(simple!)}>
                {action.isPending && <Loader2 className="h-4 w-4 animate-spin" />} {d.confirm}
              </button>
            </>
          )
        }
      >
        {d?.noteLabel && <Field label={d.noteLabel}>{(fid) => <textarea id={fid} className="input min-h-[88px] py-2.5" maxLength={FLEET_LIMITS.noteMax} value={note} onChange={(e) => setNote(e.target.value)} placeholder={simple === "REJECT" ? "e.g. Pool cars are for official trips; please use the transport allowance." : undefined} />}</Field>}
        {d?.odometer && (
          <Field label="Odometer reading (km, optional)" hint={simple === "START" ? `Last recorded ${km(c.odometer.vehicleKm)}` : c.odometer.startKm != null ? `Out at ${km(c.odometer.startKm)}` : undefined}>
            {(fid) => (
              <div className="relative">
                <Gauge className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subtle" aria-hidden />
                <input id={fid} type="number" inputMode="numeric" min={0} className="input tabular pl-9" value={odometer} onChange={(e) => setOdometer(e.target.value)} />
              </div>
            )}
          </Field>
        )}
        <ErrorNote error={action.error} />
      </Modal>

      <AssignModal open={dialog === "ASSIGN"} r={c} onClose={close} onDone={(next) => done(next, c.status === "ASSIGNED" ? "Reassigned — a new gate pass was issued and everyone was told." : "Assigned — the requester and driver have been told.")} />
    </div>
  );
}

function AssignModal({ open, r, onClose, onDone }: { open: boolean; r: CarRequisition; onClose: () => void; onDone: (next: CarRequisition) => void }) {
  const [vehicleId, setVehicleId] = useState<string | null>(null);
  const [driverId, setDriverId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [idemKey, setIdemKey] = useState(newKey);
  const vehicles = useQuery({ queryKey: ["pool-car", "vehicles", "for", r.id], queryFn: () => api.get<Vehicle[]>(`/pool-car/vehicles?requisitionId=${r.id}`), enabled: open });
  const drivers = useQuery({ queryKey: ["pool-car", "drivers", "for", r.id], queryFn: () => api.get<Driver[]>(`/pool-car/drivers?requisitionId=${r.id}`), enabled: open });
  const reassign = r.status === "ASSIGNED";
  const chosenVehicle = vehicleId ?? (reassign ? r.vehicle?.id ?? null : null);
  const chosenDriver = driverId ?? (reassign ? r.driver?.id ?? null : null);

  const vehicleRows = useMemo(
    () =>
      [...(vehicles.data ?? [])].sort(
        (a, b) =>
          Number(b.availability.available) - Number(a.availability.available) ||
          Number(!!b.availability.matchesPreference) - Number(!!a.availability.matchesPreference) ||
          Number(b.branch.id === r.branch.id) - Number(a.branch.id === r.branch.id) ||
          a.seats - b.seats,
      ),
    [vehicles.data, r.branch.id],
  );
  const driverRows = useMemo(() => [...(drivers.data ?? [])].sort((a, b) => Number(b.availability.available) - Number(a.availability.available) || Number(b.branch.id === r.branch.id) - Number(a.branch.id === r.branch.id) || a.fullName.localeCompare(b.fullName)), [drivers.data, r.branch.id]);

  const assign = useMutation({
    mutationFn: () => api.post<CarRequisition>(`/pool-car/requisitions/${r.id}/assign`, { vehicleId: chosenVehicle, driverId: chosenDriver, note: note.trim() || undefined }, idemKey),
    onSuccess: (next) => {
      setVehicleId(null);
      setDriverId(null);
      setNote("");
      setIdemKey(newKey());
      onDone(next);
    },
  });
  const close = () => {
    setVehicleId(null);
    setDriverId(null);
    setNote("");
    setIdemKey(newKey());
    assign.reset();
    onClose();
  };
  const unchanged = reassign && chosenVehicle === r.vehicle?.id && chosenDriver === r.driver?.id;

  return (
    <Modal
      open={open}
      onClose={close}
      width="max-w-3xl"
      title={reassign ? "Reassign car or driver" : "Assign a car and driver"}
      subtitle={`${r.passengerCount} ${r.passengerCount === 1 ? "person" : "people"} · ${when(r.pickupAt)} until ${when(r.expectedEndAt)} · wants ${VEHICLE_PREFERENCE_LABEL[r.vehiclePreference as VehiclePreference] ?? r.vehiclePreference}`}
      footer={
        <>
          <button className="btn-ghost" onClick={close}>
            Cancel
          </button>
          <button className="btn-primary" disabled={!chosenVehicle || !chosenDriver || unchanged || assign.isPending} onClick={() => assign.mutate()}>
            {assign.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />} {reassign ? "Reassign" : "Assign"}
          </button>
        </>
      }
    >
      <div className="grid gap-5 lg:grid-cols-2">
        <fieldset className="min-w-0">
          <legend className="label">Vehicle</legend>
          {vehicles.isLoading ? (
            <Spinner label="Checking the fleet" />
          ) : (
            <div className="max-h-[46vh] space-y-2 overflow-y-auto pr-1" role="radiogroup" aria-label="Vehicle">
              {vehicleRows.map((v) => {
                const selected = chosenVehicle === v.id;
                const disabled = !v.availability.available && v.id !== r.vehicle?.id;
                return (
                  <button
                    key={v.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    disabled={disabled}
                    onClick={() => setVehicleId(v.id)}
                    className={cx("flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition disabled:cursor-not-allowed disabled:opacity-60", selected ? "border-navy bg-navy/[0.03] ring-2 ring-navy/15" : "border-line hover:border-line-strong")}
                  >
                    <CarFront className={cx("mt-0.5 h-5 w-5 shrink-0", selected ? "text-navy" : "text-navy-500")} aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="mono block truncate text-[13px] text-navy">{v.registrationNumber}</span>
                      <span className="block truncate text-xs text-ink-muted">
                        {v.name} · {v.typeLabel} · {v.branch.code}
                      </span>
                      <span className={cx("mt-1 flex flex-wrap items-center gap-1.5 text-[11px] font-semibold", v.availability.available ? "text-success" : "text-danger")}>
                        {v.availability.available ? "Free for this trip" : v.availability.reason}
                        {v.availability.matchesPreference && <span className="rounded bg-active-soft px-1.5 py-0.5 text-active">Matches request</span>}
                      </span>
                    </span>
                    <span className={cx("inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold", v.seats >= r.passengerCount ? "bg-surface text-ink" : "bg-danger-soft text-danger")}>
                      <Users className="h-3.5 w-3.5" aria-hidden /> {v.seats}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
          {chosenVehicle && vehicleRows.find((v) => v.id === chosenVehicle) && (
            <div className="mt-2">
              <VehicleStatusBadge status={vehicleRows.find((v) => v.id === chosenVehicle)!.status} size="sm" />
            </div>
          )}
        </fieldset>
        <fieldset className="min-w-0">
          <legend className="label">Driver</legend>
          {drivers.isLoading ? (
            <Spinner label="Checking drivers" />
          ) : (
            <div className="max-h-[46vh] space-y-2 overflow-y-auto pr-1" role="radiogroup" aria-label="Driver">
              {driverRows.map((dr) => {
                const selected = chosenDriver === dr.id;
                const disabled = !dr.availability.available && dr.id !== r.driver?.id;
                return (
                  <button
                    key={dr.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    disabled={disabled}
                    onClick={() => setDriverId(dr.id)}
                    className={cx("flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition disabled:cursor-not-allowed disabled:opacity-60", selected ? "border-navy bg-navy/[0.03] ring-2 ring-navy/15" : "border-line hover:border-line-strong")}
                  >
                    <UserRound className={cx("mt-0.5 h-5 w-5 shrink-0", selected ? "text-navy" : "text-navy-500")} aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-ink">{dr.fullName}</span>
                      <span className="mono block truncate text-xs text-ink-muted">
                        {dr.phone} · {dr.branch.code}
                      </span>
                      <span className={cx("mt-1 block text-[11px] font-semibold", dr.availability.available ? "text-success" : "text-danger")}>{dr.availability.available ? (dr.hasAccount ? "Free · gets it in the app" : "Free · call to confirm") : dr.availability.reason}</span>
                    </span>
                    <DriverStatusBadge status={dr.status} active={dr.active} size="sm" />
                  </button>
                );
              })}
            </div>
          )}
        </fieldset>
      </div>
      <Field label="Note for the requester and driver (optional)">{(fid) => <input id={fid} className="input" maxLength={FLEET_LIMITS.noteMax} placeholder="e.g. Driver will wait at the north gate." value={note} onChange={(e) => setNote(e.target.value)} />}</Field>
      {reassign && <p className="text-xs text-ink-muted">Reassigning issues a new gate pass; the old QR stops working at the gate.</p>}
      <ErrorNote error={assign.error ?? vehicles.error ?? drivers.error} />
    </Modal>
  );
}
