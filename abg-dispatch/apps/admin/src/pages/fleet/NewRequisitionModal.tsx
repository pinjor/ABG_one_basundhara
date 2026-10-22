import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CarFront, Flame, Loader2, Plus, Search, Send, Trash2, UserCheck, UserRound, X } from "lucide-react";
import { FLEET_LIMITS, TRIP_TYPE_LABEL, VEHICLE_PREFERENCES, VEHICLE_PREFERENCE_LABEL, TripType, tripNeedsReturn, type VehiclePreference } from "@abg-dispatch/shared";
import { api, newKey, qs } from "../../lib/api";
import { ErrorNote, Field, Modal, Toggle, cx } from "../../components/ui";
import { toast } from "../../components/toast";
import type { CarRequisition, DirectoryPerson } from "./types";
import { fromDhakaInput, toDhakaInput } from "./ui";

interface Me {
  displayName: string;
  employee: { fullName: string; phone: string | null; branch: { name: string }; manager: { employeeId: string; userId: string | null; fullName: string; designation: string | null } | null } | null;
}

interface Approver {
  employeeId: string;
  name: string;
  designation: string | null;
  hasAccount: boolean;
}

const TRIP_HINT: Record<TripType, string> = {
  ONE_WAY: "Drop only",
  ROUND_TRIP: "There and back",
  FULL_DAY: "Car stays with you",
  AIRPORT: "Pickup or drop",
};

/** Next quarter hour, at least an hour from now. */
function defaultPickup(): Date {
  const d = new Date(Date.now() + 60 * 60_000);
  d.setMinutes(Math.ceil(d.getMinutes() / 15) * 15, 0, 0);
  return d;
}

export function NewRequisitionModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const me = useQuery({ queryKey: ["me"], queryFn: () => api.get<Me>("/auth/me"), staleTime: 60_000, enabled: open });
  const [idemKey, setIdemKey] = useState(newKey);
  const [tripType, setTripType] = useState<TripType>(TripType.ROUND_TRIP);
  const [purpose, setPurpose] = useState("");
  const [pickupLocation, setPickupLocation] = useState("");
  const [dropLocation, setDropLocation] = useState("");
  const [pickupAt, setPickupAt] = useState(() => toDhakaInput(defaultPickup()));
  const [returnAt, setReturnAt] = useState(() => toDhakaInput(new Date(defaultPickup().getTime() + 4 * 3_600_000)));
  const [passengers, setPassengers] = useState<{ name: string; phone: string }[]>([]);
  const [count, setCount] = useState(1);
  const [urgent, setUrgent] = useState(false);
  const [preference, setPreference] = useState<VehiclePreference>("ANY");
  const [approver, setApprover] = useState<Approver | null>(null);
  const [picking, setPicking] = useState(false);
  const [search, setSearch] = useState("");
  const [term, setTerm] = useState("");

  // Prefill the requester as the first passenger and their head of department as the approver.
  useEffect(() => {
    if (!open || !me.data) return;
    const e = me.data.employee;
    setPassengers((p) => (p.length ? p : [{ name: e?.fullName ?? me.data.displayName, phone: e?.phone ?? "" }]));
    setApprover((a) => a ?? (e?.manager ? { employeeId: e.manager.employeeId, name: e.manager.fullName, designation: e.manager.designation, hasAccount: !!e.manager.userId } : null));
    setPickupLocation((p) => p || (e ? e.branch.name : ""));
  }, [open, me.data]);

  useEffect(() => {
    const t = setTimeout(() => setTerm(search.trim()), 250);
    return () => clearTimeout(t);
  }, [search]);
  const people = useQuery({
    queryKey: ["directory", "employees", term],
    queryFn: () => api.get<DirectoryPerson[]>(`/directory/employees${qs({ q: term })}`),
    enabled: picking && term.length >= 2,
  });

  const needsReturn = tripNeedsReturn(tripType);
  const named = passengers.filter((p) => p.name.trim()).length;
  const problems = useMemo(() => {
    const out: string[] = [];
    if (purpose.trim().length < FLEET_LIMITS.purposeMin) out.push("Say what the car is for.");
    if (pickupLocation.trim().length < 2 || dropLocation.trim().length < 2) out.push("Give the pickup and drop places.");
    if (!pickupAt) out.push("Choose the pickup time.");
    else if (new Date(fromDhakaInput(pickupAt)).getTime() < Date.now() - 10 * 60_000) out.push("The pickup time has passed.");
    if (needsReturn && !returnAt) out.push("Round trips and full days need a return time.");
    if (returnAt && pickupAt && new Date(fromDhakaInput(returnAt)) <= new Date(fromDhakaInput(pickupAt))) out.push("Return must be after pickup.");
    if (named > count) out.push("More passengers are listed than travelling.");
    if (!approver) out.push("Choose who approves this request.");
    else if (!approver.hasAccount) out.push(`${approver.name} cannot sign in to approve — choose someone else.`);
    return out;
  }, [purpose, pickupLocation, dropLocation, pickupAt, returnAt, needsReturn, named, count, approver]);

  const reset = () => {
    setIdemKey(newKey());
    setTripType(TripType.ROUND_TRIP);
    setPurpose("");
    setPickupLocation("");
    setDropLocation("");
    setPickupAt(toDhakaInput(defaultPickup()));
    setReturnAt(toDhakaInput(new Date(defaultPickup().getTime() + 4 * 3_600_000)));
    setPassengers([]);
    setCount(1);
    setUrgent(false);
    setPreference("ANY");
    setApprover(null);
    setPicking(false);
    setSearch("");
    submit.reset();
  };
  const close = () => {
    reset();
    onClose();
  };

  const submit = useMutation({
    mutationFn: () =>
      api.post<CarRequisition>(
        "/pool-car/requisitions",
        {
          tripType,
          purpose: purpose.trim(),
          pickupLocation: pickupLocation.trim(),
          dropLocation: dropLocation.trim(),
          pickupAt: fromDhakaInput(pickupAt),
          returnAt: returnAt ? fromDhakaInput(returnAt) : undefined,
          passengers: passengers.filter((p) => p.name.trim()).map((p) => ({ name: p.name.trim(), phone: p.phone.trim() || undefined })),
          passengerCount: count,
          urgent,
          vehiclePreference: preference,
          approverEmployeeId: approver?.employeeId,
        },
        idemKey,
      ),
    onSuccess: (r) => {
      toast.success(`${r.referenceNumber} sent to ${r.approver.name} for approval.`);
      void qc.invalidateQueries({ queryKey: ["pool-car"] });
      close();
      navigate(`/pool-car/${r.id}`);
    },
  });

  const chooseTrip = (t: TripType) => {
    setTripType(t);
    if (t === TripType.ONE_WAY) setReturnAt("");
    else if (!returnAt && pickupAt) setReturnAt(toDhakaInput(new Date(new Date(fromDhakaInput(pickupAt)).getTime() + (t === TripType.FULL_DAY ? 9 : 4) * 3_600_000)));
  };
  const setPassenger = (i: number, patch: Partial<{ name: string; phone: string }>) => setPassengers((ps) => ps.map((p, k) => (k === i ? { ...p, ...patch } : p)));
  const addPassenger = () => {
    setPassengers((ps) => [...ps, { name: "", phone: "" }]);
    setCount((c) => Math.max(c, passengers.length + 1));
  };

  return (
    <Modal
      open={open}
      onClose={close}
      width="max-w-2xl"
      title="New pool car requisition"
      subtitle="Your head of department approves it, then the fleet manager assigns a car and driver. You get the driver's number and a gate pass."
      footer={
        <>
          <button className="btn-ghost" onClick={close}>
            Cancel
          </button>
          <button className="btn-primary" disabled={submit.isPending || problems.length > 0} onClick={() => submit.mutate()} title={problems[0]}>
            {submit.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Send for approval
          </button>
        </>
      }
    >
      <fieldset>
        <legend className="label">Kind of trip</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup">
          {Object.values(TripType).map((t) => (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={tripType === t}
              onClick={() => chooseTrip(t)}
              className={cx("rounded-xl border px-3 py-2.5 text-left transition", tripType === t ? "border-navy bg-navy text-white shadow-card" : "border-line bg-white text-ink hover:border-line-strong")}
            >
              <span className="block text-sm font-semibold">{TRIP_TYPE_LABEL[t]}</span>
              <span className={cx("block text-[11px]", tripType === t ? "text-platinum" : "text-ink-subtle")}>{TRIP_HINT[t]}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <Field label="Purpose of the trip">
        {(id) => <input id={id} className="input" maxLength={FLEET_LIMITS.purposeMax} placeholder="e.g. Hearing at the Supreme Court" value={purpose} onChange={(e) => setPurpose(e.target.value)} />}
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Pick up from">{(id) => <input id={id} className="input" maxLength={FLEET_LIMITS.placeMax} placeholder="ABG Head Office, Bashundhara" value={pickupLocation} onChange={(e) => setPickupLocation(e.target.value)} />}</Field>
        <Field label="Going to">{(id) => <input id={id} className="input" maxLength={FLEET_LIMITS.placeMax} placeholder="e.g. Bangladesh Bank, Motijheel" value={dropLocation} onChange={(e) => setDropLocation(e.target.value)} />}</Field>
        <Field label="Pickup date and time" hint="Asia/Dhaka time">
          {(id) => <input id={id} type="datetime-local" className="input" value={pickupAt} min={toDhakaInput(new Date())} onChange={(e) => setPickupAt(e.target.value)} />}
        </Field>
        <Field label={needsReturn ? "Back by" : "Back by (optional)"} hint={needsReturn ? "Required for round trips and full days" : "Leave empty for a drop only"}>
          {(id) => (
            <div className="flex gap-2">
              <input id={id} type="datetime-local" className="input" value={returnAt} min={pickupAt} onChange={(e) => setReturnAt(e.target.value)} />
              {!needsReturn && returnAt && (
                <button type="button" className="btn-ghost h-10 w-10 shrink-0 px-0" onClick={() => setReturnAt("")} aria-label="Clear return time">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
        </Field>
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <span className="label mb-0">Passengers</span>
          <button type="button" className="btn-ghost h-8 px-2 text-xs" onClick={addPassenger} disabled={passengers.length >= FLEET_LIMITS.maxPassengers}>
            <Plus className="h-3.5 w-3.5" /> Add passenger
          </button>
        </div>
        <div className="space-y-2">
          {passengers.map((p, i) => (
            <div key={i} className="flex gap-2">
              <input className="input flex-[3]" placeholder="Full name" aria-label={`Passenger ${i + 1} name`} maxLength={FLEET_LIMITS.passengerNameMax} value={p.name} onChange={(e) => setPassenger(i, { name: e.target.value })} />
              <input className="input flex-[2]" placeholder="Mobile (optional)" aria-label={`Passenger ${i + 1} mobile`} inputMode="tel" value={p.phone} onChange={(e) => setPassenger(i, { phone: e.target.value })} />
              <button type="button" className="btn-ghost h-10 w-10 shrink-0 px-0" aria-label={`Remove passenger ${i + 1}`} onClick={() => setPassengers((ps) => ps.filter((_, k) => k !== i))}>
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          {!passengers.length && <p className="rounded-xl border border-dashed border-line-strong px-3 py-2 text-sm text-ink-muted">No names yet — add who is travelling so security can check at the gate.</p>}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="People travelling" hint={`Including you · at most ${FLEET_LIMITS.maxPassengers}`}>
          {(id) => <input id={id} type="number" className="input tabular" min={Math.max(1, named)} max={FLEET_LIMITS.maxPassengers} value={count} onChange={(e) => setCount(Math.min(FLEET_LIMITS.maxPassengers, Math.max(1, Number(e.target.value) || 1)))} />}
        </Field>
        <Field label="Vehicle preference">
          {(id) => (
            <select id={id} className="input" value={preference} onChange={(e) => setPreference(e.target.value as VehiclePreference)}>
              {VEHICLE_PREFERENCES.map((v) => (
                <option key={v} value={v}>
                  {VEHICLE_PREFERENCE_LABEL[v]}
                </option>
              ))}
            </select>
          )}
        </Field>
        <div>
          <span className="label">Urgent</span>
          <div className={cx("flex h-10 items-center justify-between rounded-xl border px-3", urgent ? "border-danger/30 bg-danger-soft" : "border-line")}>
            <span className={cx("inline-flex items-center gap-1.5 text-sm font-semibold", urgent ? "text-danger" : "text-ink-muted")}>
              <Flame className="h-4 w-4" aria-hidden /> {urgent ? "Urgent" : "Normal"}
            </span>
            <Toggle checked={urgent} onChange={setUrgent} label="Mark as urgent" />
          </div>
        </div>
      </div>

      <div>
        <span className="label">Approver (head of department)</span>
        {!picking ? (
          <div className="flex items-center gap-3 rounded-xl border border-line px-3 py-2.5">
            <span className={cx("grid h-9 w-9 shrink-0 place-items-center rounded-full", approver?.hasAccount ? "bg-active-soft text-active" : "bg-pending-soft text-pending")}>
              <UserCheck className="h-4 w-4" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              {approver ? (
                <>
                  <p className="truncate text-sm font-semibold text-ink">{approver.name}</p>
                  <p className="truncate text-xs text-ink-muted">{approver.hasAccount ? approver.designation ?? "Approver" : "Cannot sign in to ABG ONE — choose someone else"}</p>
                </>
              ) : (
                <p className="text-sm text-ink-muted">{me.isLoading ? "Finding your head of department…" : "No head of department on record — choose an approver."}</p>
              )}
            </div>
            <button type="button" className="btn-secondary h-9 px-3" onClick={() => setPicking(true)}>
              Change
            </button>
          </div>
        ) : (
          <div className="rounded-xl border border-line">
            <div className="relative border-b border-line">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subtle" aria-hidden />
              <input autoFocus className="h-11 w-full rounded-t-xl bg-transparent pl-9 pr-10 text-sm focus:outline-none" placeholder="Search name, ID or department" aria-label="Search the directory" value={search} onChange={(e) => setSearch(e.target.value)} />
              <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-ink-subtle hover:bg-surface" onClick={() => setPicking(false)} aria-label="Stop searching">
                <X className="h-4 w-4" />
              </button>
            </div>
            <ul className="max-h-56 overflow-y-auto py-1">
              {term.length < 2 && <li className="px-3 py-2 text-xs text-ink-subtle">Type at least two letters.</li>}
              {people.isFetching && <li className="px-3 py-2 text-xs text-ink-subtle">Searching…</li>}
              {(people.data ?? [])
                .filter((p) => !p.isMe)
                .map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      disabled={!p.hasAccount}
                      onClick={() => {
                        setApprover({ employeeId: p.id, name: p.fullName, designation: p.designation, hasAccount: p.hasAccount });
                        setPicking(false);
                        setSearch("");
                      }}
                      className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <UserRound className="h-4 w-4 shrink-0 text-navy-500" aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-ink">
                          {p.fullName} <span className="mono text-[11px] text-ink-subtle">{p.employeeCode}</span>
                        </span>
                        <span className="block truncate text-xs text-ink-muted">{[p.designation, p.department?.name, p.branch?.name].filter(Boolean).join(" · ")}</span>
                      </span>
                      {!p.hasAccount && <span className="shrink-0 text-[11px] text-ink-subtle">No account</span>}
                    </button>
                  </li>
                ))}
              {term.length >= 2 && !people.isFetching && (people.data ?? []).filter((p) => !p.isMe).length === 0 && <li className="px-3 py-2 text-xs text-ink-subtle">Nobody matches.</li>}
            </ul>
          </div>
        )}
      </div>

      {problems.length > 0 && (submit.isError || purpose) && (
        <p className="flex items-start gap-2 text-xs text-ink-muted">
          <CarFront className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden /> {problems[0]}
        </p>
      )}
      <ErrorNote error={submit.error} />
    </Modal>
  );
}
