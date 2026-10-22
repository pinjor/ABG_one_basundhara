import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, CarFront, Fuel, Gauge, IdCard, Loader2, Pencil, Plus, Search, UserRound, Users, Wrench, X } from "lucide-react";
import { Capability, FLEET_LIMITS, VEHICLE_STATUS_LABEL, VEHICLE_TYPE_LABEL, VehicleStatus, VehicleType } from "@abg-dispatch/shared";
import { api, qs } from "../../lib/api";
import { useCan } from "../../lib/auth";
import { when } from "../../lib/format";
import { Empty, ErrorNote, Field, Modal, Spinner, Toggle, cx } from "../../components/ui";
import { toast } from "../../components/toast";
import type { BranchRef, DirectoryPerson, Driver, Vehicle } from "./types";
import { CallButton, DriverStatusBadge, DueDate, VehicleStatusBadge, km } from "./ui";

export const useDirectoryBranches = () => useQuery({ queryKey: ["directory", "branches"], queryFn: () => api.get<BranchRef[]>("/directory/branches"), staleTime: 5 * 60_000 });

function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative w-full sm:max-w-xs">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subtle" aria-hidden />
      <input className="input pl-9" placeholder={placeholder} aria-label={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

// ── Vehicles ──

export function VehiclesTab({ branchId }: { branchId?: string }) {
  const canManage = useCan(Capability.FLEET_MANAGE);
  const [q, setQ] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [editing, setEditing] = useState<Vehicle | "new" | null>(null);
  const list = useQuery({ queryKey: ["pool-car", "vehicles", branchId ?? "", showInactive], queryFn: () => api.get<Vehicle[]>(`/pool-car/vehicles${qs({ branchId, includeInactive: showInactive ? "true" : undefined })}`), refetchInterval: 60_000 });
  const text = q.trim().toLowerCase();
  const rows = (list.data ?? []).filter((v) => !text || `${v.registrationNumber} ${v.name} ${v.typeLabel}`.toLowerCase().includes(text));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SearchBox value={q} onChange={setQ} placeholder="Registration, make or model" />
        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex items-center gap-2 text-sm text-ink-muted">
            <Toggle checked={showInactive} onChange={setShowInactive} label="Show vehicles out of service" /> Out of service too
          </label>
          {canManage && (
            <button className="btn-primary" onClick={() => setEditing("new")}>
              <Plus className="h-4 w-4" /> Add vehicle
            </button>
          )}
        </div>
      </div>
      <ErrorNote error={list.error} />
      {list.isLoading ? (
        <Spinner label="Loading the fleet" />
      ) : rows.length === 0 ? (
        <div className="card">
          <Empty icon={CarFront} title="No vehicles" hint={canManage ? "Add the pool cars this office runs." : "No pool cars are registered for your offices."} />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {rows.map((v) => (
            <VehicleCard key={v.id} v={v} onEdit={canManage ? () => setEditing(v) : undefined} />
          ))}
        </div>
      )}
      <VehicleModal value={editing} onClose={() => setEditing(null)} />
    </div>
  );
}

function VehicleCard({ v, onEdit }: { v: Vehicle; onEdit?: () => void }) {
  const alert = (kind: string) => v.alerts.find((a) => a.kind === kind)?.state ?? null;
  return (
    <article className={cx("card flex flex-col overflow-hidden", v.status === VehicleStatus.MAINTENANCE && "ring-1 ring-pending/30")}>
      <div className="flex items-start gap-3 p-4">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-platinum-bright text-navy-500">
          <CarFront className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="mono truncate text-[15px] text-navy">{v.registrationNumber}</p>
          <p className="truncate text-sm text-ink-muted">
            {v.name} · {v.typeLabel}
          </p>
        </div>
        <VehicleStatusBadge status={v.status} size="sm" />
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 px-4 text-xs text-ink-muted">
        <span className="inline-flex items-center gap-1">
          <Users className="h-3.5 w-3.5" aria-hidden /> {v.seats} seats
        </span>
        <span className="inline-flex items-center gap-1">
          <Gauge className="h-3.5 w-3.5" aria-hidden /> {km(v.odometerKm)}
        </span>
        {v.fuelType && (
          <span className="inline-flex items-center gap-1">
            <Fuel className="h-3.5 w-3.5" aria-hidden /> {v.fuelType}
          </span>
        )}
        <span>
          {v.branch.name} <span className="mono text-[10.5px] text-ink-subtle">{v.branch.code}</span>
        </span>
      </div>
      {v.statusNote && (
        <p className="mx-4 mt-3 flex items-start gap-2 rounded-lg bg-pending-soft px-3 py-2 text-xs text-pending">
          <Wrench className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden /> {v.statusNote}
        </p>
      )}
      <div className="mt-3 grid grid-cols-3 gap-2 px-4">
        <DueDate label="Service" date={v.nextServiceAt} state={alert("SERVICE")} />
        <DueDate label="Fitness" date={v.fitnessExpiry} state={alert("FITNESS")} />
        <DueDate label="Insurance" date={v.insuranceExpiry} state={alert("INSURANCE")} />
      </div>
      <div className="mt-auto flex items-center justify-between gap-3 border-t border-line px-4 py-3 text-xs">
        <div className="min-w-0 text-ink-muted">
          {v.currentTrip ? (
            <span>
              Out on{" "}
              <Link className="mono text-navy hover:underline" to={`/pool-car/${v.currentTrip.id}`}>
                {v.currentTrip.referenceNumber}
              </Link>
              {v.currentTrip.driverName ? ` with ${v.currentTrip.driverName}` : ""} · back {when(v.currentTrip.until)}
            </span>
          ) : v.nextTrip ? (
            <span>
              Next:{" "}
              <Link className="mono text-navy hover:underline" to={`/pool-car/${v.nextTrip.id}`}>
                {v.nextTrip.referenceNumber}
              </Link>{" "}
              · {when(v.nextTrip.pickupAt)}
              {v.upcomingTrips > 1 ? ` (+${v.upcomingTrips - 1} more)` : ""}
            </span>
          ) : (
            <span>No trips booked</span>
          )}
        </div>
        {onEdit && (
          <button className="btn-ghost h-8 shrink-0 px-2 text-xs" onClick={onEdit} aria-label={`Edit ${v.registrationNumber}`}>
            <Pencil className="h-3.5 w-3.5" /> Edit
          </button>
        )}
      </div>
    </article>
  );
}

interface VehicleForm {
  registrationNumber: string;
  make: string;
  model: string;
  type: string;
  seats: string;
  colour: string;
  fuelType: string;
  branchId: string;
  odometerKm: string;
  nextServiceAt: string;
  fitnessExpiry: string;
  insuranceExpiry: string;
  notes: string;
  status: string;
  statusNote: string;
}

const EMPTY_VEHICLE: VehicleForm = { registrationNumber: "", make: "Toyota", model: "", type: VehicleType.SEDAN, seats: "4", colour: "", fuelType: "", branchId: "", odometerKm: "0", nextServiceAt: "", fitnessExpiry: "", insuranceExpiry: "", notes: "", status: VehicleStatus.AVAILABLE, statusNote: "" };

function VehicleModal({ value, onClose }: { value: Vehicle | "new" | null; onClose: () => void }) {
  const qc = useQueryClient();
  const branches = useDirectoryBranches();
  const editing = value && value !== "new" ? value : null;
  const [f, setF] = useState<VehicleForm>(EMPTY_VEHICLE);
  useEffect(() => {
    if (!value) return;
    setF(
      editing
        ? {
            registrationNumber: editing.registrationNumber,
            make: editing.make,
            model: editing.model,
            type: editing.type,
            seats: String(editing.seats),
            colour: editing.colour ?? "",
            fuelType: editing.fuelType ?? "",
            branchId: editing.branch.id,
            odometerKm: String(editing.odometerKm),
            nextServiceAt: editing.nextServiceAt ?? "",
            fitnessExpiry: editing.fitnessExpiry ?? "",
            insuranceExpiry: editing.insuranceExpiry ?? "",
            notes: editing.notes ?? "",
            status: editing.status === VehicleStatus.ON_TRIP ? VehicleStatus.ON_TRIP : editing.status,
            statusNote: editing.statusNote ?? "",
          }
        : { ...EMPTY_VEHICLE, branchId: branches.data?.find((b) => b.code === "HO")?.id ?? branches.data?.[0]?.id ?? "" },
    );
  }, [value]);
  const set = (patch: Partial<VehicleForm>) => setF((x) => ({ ...x, ...patch }));
  const save = useMutation({
    mutationFn: () => {
      const body: Record<string, unknown> = {
        registrationNumber: f.registrationNumber,
        make: f.make,
        model: f.model,
        type: f.type,
        seats: Number(f.seats),
        colour: f.colour.trim() || (editing ? null : undefined),
        fuelType: f.fuelType.trim() || (editing ? null : undefined),
        branchId: f.branchId,
        odometerKm: Number(f.odometerKm) || 0,
        nextServiceAt: f.nextServiceAt || (editing ? null : undefined),
        fitnessExpiry: f.fitnessExpiry || (editing ? null : undefined),
        insuranceExpiry: f.insuranceExpiry || (editing ? null : undefined),
        notes: f.notes.trim() || (editing ? null : undefined),
      };
      if (editing && editing.status !== VehicleStatus.ON_TRIP && (f.status !== editing.status || f.statusNote !== (editing.statusNote ?? ""))) {
        body.status = f.status;
        body.statusNote = f.statusNote.trim() || null;
      }
      return editing ? api.patch<Vehicle>(`/pool-car/vehicles/${editing.id}`, body) : api.post<Vehicle>("/pool-car/vehicles", body);
    },
    onSuccess: (v) => {
      toast.success(editing ? `${v.registrationNumber} updated.` : `${v.registrationNumber} added to the pool.`);
      void qc.invalidateQueries({ queryKey: ["pool-car"] });
      save.reset();
      onClose();
    },
  });
  const close = () => {
    save.reset();
    onClose();
  };
  const needsNote = f.status === VehicleStatus.MAINTENANCE || f.status === VehicleStatus.INACTIVE;
  const valid = f.registrationNumber.trim().length >= 4 && f.make.trim() && f.model.trim() && Number(f.seats) >= 1 && f.branchId && (!needsNote || f.statusNote.trim().length >= 3);

  return (
    <Modal
      open={!!value}
      onClose={close}
      width="max-w-2xl"
      title={editing ? `Edit ${editing.registrationNumber}` : "Add a vehicle"}
      subtitle="Seats are passenger seats, not counting the driver. Service, fitness and insurance dates turn amber 30 days ahead."
      footer={
        <>
          <button className="btn-ghost" onClick={close}>
            Cancel
          </button>
          <button className="btn-primary" disabled={!valid || save.isPending} onClick={() => save.mutate()}>
            {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />} {editing ? "Save changes" : "Add vehicle"}
          </button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Registration number" className="sm:col-span-2" hint="As on the BRTA certificate, e.g. Dhaka Metro-GA 27-4512">
          {(id) => <input id={id} className="input mono" maxLength={FLEET_LIMITS.registrationMax} value={f.registrationNumber} onChange={(e) => set({ registrationNumber: e.target.value })} />}
        </Field>
        <Field label="Make">{(id) => <input id={id} className="input" value={f.make} onChange={(e) => set({ make: e.target.value })} />}</Field>
        <Field label="Model">{(id) => <input id={id} className="input" placeholder="e.g. Noah" value={f.model} onChange={(e) => set({ model: e.target.value })} />}</Field>
        <Field label="Type">
          {(id) => (
            <select id={id} className="input" value={f.type} onChange={(e) => set({ type: e.target.value })}>
              {Object.entries(VEHICLE_TYPE_LABEL).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field label="Passenger seats">{(id) => <input id={id} type="number" min={1} max={FLEET_LIMITS.maxSeats} className="input tabular" value={f.seats} onChange={(e) => set({ seats: e.target.value })} />}</Field>
        <Field label="Colour">{(id) => <input id={id} className="input" value={f.colour} onChange={(e) => set({ colour: e.target.value })} />}</Field>
        <Field label="Fuel">{(id) => <input id={id} className="input" placeholder="Octane, Diesel, CNG…" value={f.fuelType} onChange={(e) => set({ fuelType: e.target.value })} />}</Field>
        <Field label="Office">
          {(id) => (
            <select id={id} className="input" value={f.branchId} onChange={(e) => set({ branchId: e.target.value })}>
              <option value="" disabled>
                Choose an office
              </option>
              {(branches.data ?? []).map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field label="Odometer (km)" hint={editing ? "Can only go up" : undefined}>
          {(id) => <input id={id} type="number" min={editing?.odometerKm ?? 0} className="input tabular" value={f.odometerKm} onChange={(e) => set({ odometerKm: e.target.value })} />}
        </Field>
        <Field label="Next service">{(id) => <input id={id} type="date" className="input" value={f.nextServiceAt} onChange={(e) => set({ nextServiceAt: e.target.value })} />}</Field>
        <Field label="Fitness certificate expires">{(id) => <input id={id} type="date" className="input" value={f.fitnessExpiry} onChange={(e) => set({ fitnessExpiry: e.target.value })} />}</Field>
        <Field label="Insurance expires">{(id) => <input id={id} type="date" className="input" value={f.insuranceExpiry} onChange={(e) => set({ insuranceExpiry: e.target.value })} />}</Field>
        <Field label="Notes" className="sm:col-span-2">
          {(id) => <textarea id={id} className="input min-h-[64px] py-2" maxLength={FLEET_LIMITS.noteMax} value={f.notes} onChange={(e) => set({ notes: e.target.value })} />}
        </Field>
      </div>
      {editing && (
        <div className="rounded-xl border border-line bg-surface/60 p-4">
          {editing.status === VehicleStatus.ON_TRIP ? (
            <p className="text-sm text-ink-muted">This vehicle is out on a trip. Its status changes back when the trip is completed.</p>
          ) : (
            <>
              <span className="label">Status</span>
              <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Vehicle status">
                {[VehicleStatus.AVAILABLE, VehicleStatus.MAINTENANCE, VehicleStatus.INACTIVE].map((s) => (
                  <button key={s} type="button" role="radio" aria-checked={f.status === s} onClick={() => set({ status: s })} className={cx("rounded-xl border px-3 py-2 text-sm font-semibold transition", f.status === s ? "border-navy bg-navy text-white" : "border-line bg-white text-ink hover:border-line-strong")}>
                    {VEHICLE_STATUS_LABEL[s]}
                  </button>
                ))}
              </div>
              {needsNote && (
                <Field label={f.status === VehicleStatus.MAINTENANCE ? "What is the maintenance for?" : "Why is it out of service?"} className="mt-3" hint="Required. Shown on the register and in the assign dialog.">
                  {(id) => <input id={id} className="input" placeholder="e.g. AC compressor replacement at Rancon Motors, Tejgaon" value={f.statusNote} onChange={(e) => set({ statusNote: e.target.value })} />}
                </Field>
              )}
            </>
          )}
        </div>
      )}
      <ErrorNote error={save.error} />
    </Modal>
  );
}

// ── Drivers ──

export function DriversTab({ branchId }: { branchId?: string }) {
  const canManage = useCan(Capability.FLEET_MANAGE);
  const [q, setQ] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [editing, setEditing] = useState<Driver | "new" | null>(null);
  const list = useQuery({ queryKey: ["pool-car", "drivers", branchId ?? "", showInactive], queryFn: () => api.get<Driver[]>(`/pool-car/drivers${qs({ branchId, includeInactive: showInactive ? "true" : undefined })}`), refetchInterval: 60_000 });
  const text = q.trim().toLowerCase();
  const rows = (list.data ?? []).filter((d) => !text || `${d.fullName} ${d.phone} ${d.licenseNumber}`.toLowerCase().includes(text));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SearchBox value={q} onChange={setQ} placeholder="Name, phone or licence" />
        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex items-center gap-2 text-sm text-ink-muted">
            <Toggle checked={showInactive} onChange={setShowInactive} label="Show drivers who left the pool" /> Former drivers too
          </label>
          {canManage && (
            <button className="btn-primary" onClick={() => setEditing("new")}>
              <Plus className="h-4 w-4" /> Add driver
            </button>
          )}
        </div>
      </div>
      <ErrorNote error={list.error} />
      {list.isLoading ? (
        <Spinner label="Loading drivers" />
      ) : rows.length === 0 ? (
        <div className="card">
          <Empty icon={IdCard} title="No drivers" hint={canManage ? "Add the drivers who run the pool cars." : "No drivers are registered for your offices."} />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {rows.map((d) => (
            <article key={d.id} className="card flex flex-col">
              <div className="flex items-start gap-3 p-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-navy-deep to-navy-500 text-sm font-bold text-white">
                  {d.fullName
                    .split(" ")
                    .map((p) => p[0])
                    .slice(0, 2)
                    .join("")}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-semibold text-ink">{d.fullName}</p>
                  <p className="truncate text-xs text-ink-muted">
                    {d.branch.name} · <span className="mono">{d.phone}</span>
                  </p>
                  {d.hasAccount && (
                    <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-active">
                      <BadgeCheck className="h-3.5 w-3.5" aria-hidden /> Uses the ABG ONE app
                    </p>
                  )}
                </div>
                <DriverStatusBadge status={d.status} active={d.active} size="sm" />
              </div>
              <div className="grid grid-cols-2 gap-2 px-4">
                <div className="rounded-lg bg-surface px-2.5 py-1.5">
                  <p className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-subtle">Licence</p>
                  <p className="mono truncate text-[13px] text-ink">{d.licenseNumber}</p>
                </div>
                <DueDate label="Licence expires" date={d.licenseExpiry} state={d.licenseAlert?.state ?? null} />
              </div>
              <div className="mt-auto flex items-center justify-between gap-3 border-t border-line px-4 py-3 text-xs">
                <div className="min-w-0 text-ink-muted">
                  {d.currentTrip ? (
                    <span>
                      Driving{" "}
                      <Link className="mono text-navy hover:underline" to={`/pool-car/${d.currentTrip.id}`}>
                        {d.currentTrip.referenceNumber}
                      </Link>{" "}
                      · back {when(d.currentTrip.until)}
                    </span>
                  ) : d.nextTrip ? (
                    <span>
                      Next:{" "}
                      <Link className="mono text-navy hover:underline" to={`/pool-car/${d.nextTrip.id}`}>
                        {d.nextTrip.referenceNumber}
                      </Link>{" "}
                      · {when(d.nextTrip.pickupAt)}
                    </span>
                  ) : (
                    <span>No trips booked</span>
                  )}
                </div>
                <div className="flex shrink-0 gap-1">
                  <CallButton phone={d.phone} compact />
                  {canManage && (
                    <button className="btn-ghost h-9 px-2 text-xs" onClick={() => setEditing(d)} aria-label={`Edit ${d.fullName}`}>
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
      <DriverModal value={editing} onClose={() => setEditing(null)} />
    </div>
  );
}

interface DriverForm {
  fullName: string;
  phone: string;
  licenseNumber: string;
  licenseExpiry: string;
  branchId: string;
  employee: { id: string; name: string; hasAccount: boolean } | null;
  status: string;
  active: boolean;
}

function DriverModal({ value, onClose }: { value: Driver | "new" | null; onClose: () => void }) {
  const qc = useQueryClient();
  const branches = useDirectoryBranches();
  const editing = value && value !== "new" ? value : null;
  const [f, setF] = useState<DriverForm>({ fullName: "", phone: "", licenseNumber: "", licenseExpiry: "", branchId: "", employee: null, status: "AVAILABLE", active: true });
  const [search, setSearch] = useState("");
  const [term, setTerm] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setTerm(search.trim()), 250);
    return () => clearTimeout(t);
  }, [search]);
  const people = useQuery({ queryKey: ["directory", "employees", term], queryFn: () => api.get<DirectoryPerson[]>(`/directory/employees${qs({ q: term })}`), enabled: !!value && term.length >= 2 });
  useEffect(() => {
    if (!value) return;
    setSearch("");
    setF(
      editing
        ? { fullName: editing.fullName, phone: editing.phone, licenseNumber: editing.licenseNumber, licenseExpiry: editing.licenseExpiry ?? "", branchId: editing.branch.id, employee: editing.employeeId ? { id: editing.employeeId, name: editing.fullName, hasAccount: editing.hasAccount } : null, status: editing.status, active: editing.active }
        : { fullName: "", phone: "", licenseNumber: "", licenseExpiry: "", branchId: branches.data?.find((b) => b.code === "HO")?.id ?? branches.data?.[0]?.id ?? "", employee: null, status: "AVAILABLE", active: true },
    );
  }, [value]);
  const set = (patch: Partial<DriverForm>) => setF((x) => ({ ...x, ...patch }));
  const save = useMutation({
    mutationFn: () => {
      const base = { fullName: f.fullName, phone: f.phone, licenseNumber: f.licenseNumber, licenseExpiry: f.licenseExpiry || (editing ? null : undefined), branchId: f.branchId };
      if (!editing) return api.post<Driver>("/pool-car/drivers", { ...base, employeeId: f.employee?.id });
      const body: Record<string, unknown> = { ...base };
      if ((f.employee?.id ?? null) !== editing.employeeId) body.employeeId = f.employee?.id ?? null;
      if (editing.status !== "ON_TRIP" && f.status !== editing.status) body.status = f.status;
      if (f.active !== editing.active) body.active = f.active;
      return api.patch<Driver>(`/pool-car/drivers/${editing.id}`, body);
    },
    onSuccess: (d) => {
      toast.success(editing ? `${d.fullName} updated.` : `${d.fullName} added to the driver pool.`);
      void qc.invalidateQueries({ queryKey: ["pool-car"] });
      save.reset();
      onClose();
    },
  });
  const close = () => {
    save.reset();
    onClose();
  };
  const valid = f.fullName.trim().length >= 2 && /^[+\d][\d\s-]{6,19}$/.test(f.phone.trim()) && f.licenseNumber.trim().length >= 3 && f.branchId;

  return (
    <Modal
      open={!!value}
      onClose={close}
      width="max-w-xl"
      title={editing ? `Edit ${editing.fullName}` : "Add a driver"}
      subtitle="Link the driver to their directory entry: if they can sign in, their trips appear in their ABG ONE app."
      footer={
        <>
          <button className="btn-ghost" onClick={close}>
            Cancel
          </button>
          <button className="btn-primary" disabled={!valid || save.isPending} onClick={() => save.mutate()}>
            {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />} {editing ? "Save changes" : "Add driver"}
          </button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" className="sm:col-span-2">
          {(id) => <input id={id} className="input" value={f.fullName} onChange={(e) => set({ fullName: e.target.value })} />}
        </Field>
        <Field label="Mobile">{(id) => <input id={id} className="input mono" inputMode="tel" placeholder="01712345678" value={f.phone} onChange={(e) => set({ phone: e.target.value })} />}</Field>
        <Field label="Office">
          {(id) => (
            <select id={id} className="input" value={f.branchId} onChange={(e) => set({ branchId: e.target.value })}>
              {(branches.data ?? []).map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field label="Driving licence number">{(id) => <input id={id} className="input mono uppercase" value={f.licenseNumber} onChange={(e) => set({ licenseNumber: e.target.value })} />}</Field>
        <Field label="Licence expires">{(id) => <input id={id} type="date" className="input" value={f.licenseExpiry} onChange={(e) => set({ licenseExpiry: e.target.value })} />}</Field>
      </div>
      <div>
        <span className="label">Directory entry (optional)</span>
        {f.employee ? (
          <div className="flex items-center gap-3 rounded-xl border border-line px-3 py-2.5">
            <UserRound className="h-4 w-4 text-navy-500" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink">{f.employee.name}</p>
              <p className="text-xs text-ink-muted">{f.employee.hasAccount ? "Trips will appear in their app" : "No app account yet — trips are phoned through"}</p>
            </div>
            <button type="button" className="btn-ghost h-8 w-8 px-0" onClick={() => set({ employee: null })} aria-label="Unlink directory entry">
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="rounded-xl border border-line">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subtle" aria-hidden />
              <input className="h-11 w-full rounded-xl bg-transparent pl-9 pr-3 text-sm focus:outline-none" placeholder="Search the directory by name or ID" aria-label="Search the directory" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            {term.length >= 2 && (
              <ul className="max-h-44 overflow-y-auto border-t border-line py-1">
                {(people.data ?? []).map((p) => (
                  <li key={p.id}>
                    <button type="button" className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-surface" onClick={() => (set({ employee: { id: p.id, name: p.fullName, hasAccount: p.hasAccount }, fullName: f.fullName || p.fullName }), setSearch(""))}>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-ink">
                          {p.fullName} <span className="mono text-[11px] text-ink-subtle">{p.employeeCode}</span>
                        </span>
                        <span className="block truncate text-xs text-ink-muted">{[p.designation, p.branch?.name].filter(Boolean).join(" · ")}</span>
                      </span>
                      {p.hasAccount && <BadgeCheck className="h-4 w-4 shrink-0 text-active" aria-label="Has an account" />}
                    </button>
                  </li>
                ))}
                {!people.isFetching && (people.data ?? []).length === 0 && <li className="px-3 py-2 text-xs text-ink-subtle">Nobody matches.</li>}
              </ul>
            )}
          </div>
        )}
      </div>
      {editing && (
        <div className="grid gap-3 rounded-xl border border-line bg-surface/60 p-4 sm:grid-cols-2">
          {editing.status === "ON_TRIP" ? (
            <p className="text-sm text-ink-muted sm:col-span-2">On a trip now — their status changes back when it is completed.</p>
          ) : (
            <div>
              <span className="label">Duty</span>
              <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Driver duty">
                {(["AVAILABLE", "OFF_DUTY"] as const).map((s) => (
                  <button key={s} type="button" role="radio" aria-checked={f.status === s} onClick={() => set({ status: s })} className={cx("rounded-xl border px-3 py-2 text-sm font-semibold transition", f.status === s ? "border-navy bg-navy text-white" : "border-line bg-white text-ink hover:border-line-strong")}>
                    {s === "AVAILABLE" ? "Available" : "Off duty"}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div>
            <span className="label">In the driver pool</span>
            <div className="flex h-10 items-center gap-3">
              <Toggle checked={f.active} onChange={(v) => set({ active: v })} label="Driver is in the pool" disabled={editing.status === "ON_TRIP"} />
              <span className="text-sm text-ink-muted">{f.active ? "Yes" : "Left the pool"}</span>
            </div>
          </div>
        </div>
      )}
      <ErrorNote error={save.error} />
    </Modal>
  );
}
