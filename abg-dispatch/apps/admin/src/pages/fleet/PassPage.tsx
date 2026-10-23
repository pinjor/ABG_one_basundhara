import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CalendarClock, CarFront, CircleCheckBig, Flag, Gauge, Loader2, LogIn, LogOut, ShieldAlert, ShieldCheck, ShieldX, UserRound, Users, type LucideIcon } from "lucide-react";
import { TRIP_TYPE_LABEL, type TripType } from "@abg-dispatch/shared";
import { ApiError, api, newKey } from "../../lib/api";
import { stamp, when } from "../../lib/format";
import { Card, ErrorNote, Field, KeyValue, Spinner, cx } from "../../components/ui";
import { toast } from "../../components/toast";
import type { GatePassView } from "./types";
import { CallButton, CarStatusBadge, UrgentTag } from "./ui";

const BANNER: Record<GatePassView["state"] | "INVALID", { icon: LucideIcon; title: string; className: string }> = {
  VALID: { icon: ShieldCheck, title: "Valid gate pass", className: "bg-success text-white" },
  OUT: { icon: CarFront, title: "Car is out on this trip", className: "bg-active text-white" },
  USED: { icon: CircleCheckBig, title: "Trip complete — pass used", className: "bg-neutral text-white" },
  CANCELLED: { icon: ShieldX, title: "Not valid — trip cancelled", className: "bg-danger text-white" },
  EXPIRED: { icon: ShieldX, title: "Not valid — pass expired", className: "bg-danger text-white" },
  NOT_YET_VALID: { icon: CalendarClock, title: "Not valid yet", className: "bg-pending text-white" },
  INVALID: { icon: ShieldX, title: "Not a valid gate pass", className: "bg-danger text-white" },
};

/** Opened when a desk scanner reads a vehicle gate pass (…/g/c/<token>). Security checks the car and records exit or return. */
export function VehiclePassPage() {
  const { token = "" } = useParams<{ token: string }>();
  const qc = useQueryClient();
  const [odometer, setOdometer] = useState("");
  const [idemKey, setIdemKey] = useState(newKey);
  const pass = useQuery({ queryKey: ["pool-car", "pass", token], queryFn: () => api.get<GatePassView>(`/pool-car/passes/${encodeURIComponent(token)}`), retry: false, refetchInterval: 30_000 });
  const scan = useMutation({
    mutationFn: (direction: "EXIT" | "RETURN") => api.post<GatePassView>(`/pool-car/passes/${encodeURIComponent(token)}/scan`, { direction, odometerKm: odometer.trim() ? Number(odometer) : undefined }, idemKey),
    onSuccess: (next, direction) => {
      qc.setQueryData(["pool-car", "pass", token], next);
      void qc.invalidateQueries({ queryKey: ["pool-car"], predicate: (q) => q.queryKey[1] !== "pass" });
      setOdometer("");
      setIdemKey(newKey());
      toast.success(direction === "EXIT" ? `Exit recorded for ${next.vehicle?.registrationNumber}. The trip has started.` : `Return recorded for ${next.vehicle?.registrationNumber}. The trip is complete.`);
    },
  });

  const back = (
    <Link to="/pool-car" className="no-print inline-flex items-center gap-1.5 text-sm font-semibold text-ink-muted hover:text-navy">
      <ArrowLeft className="h-4 w-4" /> Pool Car Requisition
    </Link>
  );
  if (pass.isLoading) return <Spinner label="Checking the gate pass" />;
  const invalid = pass.error instanceof ApiError && pass.error.status === 404;
  if (pass.error && !invalid) {
    return (
      <div className="space-y-4">
        {back}
        <ErrorNote error={pass.error instanceof ApiError && pass.error.status === 403 ? new Error("Only security, front desks and the fleet manager can verify gate passes.") : pass.error} />
      </div>
    );
  }
  const p = pass.data;
  const banner = BANNER[invalid || !p ? "INVALID" : p.state];

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      {back}
      <section className={cx("overflow-hidden rounded-2xl shadow-raised", banner.className)} role="status" aria-live="polite">
        <div className="flex items-center gap-4 px-5 py-6 sm:px-7">
          <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-white/15">
            <banner.icon className="h-9 w-9" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.14em] opacity-80">Vehicle gate pass</p>
            <h1 className="font-display text-2xl font-extrabold leading-tight sm:text-3xl">{banner.title}</h1>
            <p className="mt-1 text-sm opacity-90">{invalid || !p ? "This code is not a gate pass that ABG ONE issued, or it has been replaced. Do not let the vehicle through — call the fleet desk." : p.message}</p>
          </div>
        </div>
        {p && (
          <div className="flex flex-wrap items-center justify-between gap-3 bg-black/15 px-5 py-4 sm:px-7">
            <div className="min-w-0">
              <p className="mono text-2xl tracking-wide sm:text-3xl">{p.vehicle?.registrationNumber}</p>
              <p className="text-sm opacity-90">
                {p.vehicle?.name} · {p.vehicle?.typeLabel}
                {p.vehicle?.colour ? ` · ${p.vehicle.colour}` : ""}
              </p>
            </div>
            <div className="text-right text-sm">
              <p className="font-semibold">{p.driver?.fullName}</p>
              <p className="mono opacity-90">{p.driver?.phone}</p>
            </div>
          </div>
        )}
      </section>

      {p && (
        <>
          {(p.allowed.length > 0 || p.scanNote) && (
            <Card>
              {p.allowed.length > 0 ? (
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                  <Field label="Odometer reading (km, optional)" className="sm:w-56">
                    {(fid) => (
                      <div className="relative">
                        <Gauge className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subtle" aria-hidden />
                        <input id={fid} type="number" inputMode="numeric" min={0} className="input tabular pl-9" value={odometer} onChange={(e) => setOdometer(e.target.value)} />
                      </div>
                    )}
                  </Field>
                  <div className="grid flex-1 grid-cols-2 gap-3">
                    <button className="btn-primary h-14 text-base" disabled={!p.allowed.includes("EXIT") || scan.isPending} onClick={() => scan.mutate("EXIT")}>
                      {scan.isPending && scan.variables === "EXIT" ? <Loader2 className="h-5 w-5 animate-spin" /> : <LogOut className="h-5 w-5" />} Record exit
                    </button>
                    <button className="btn-primary h-14 bg-success text-base hover:bg-success hover:brightness-95" disabled={!p.allowed.includes("RETURN") || scan.isPending} onClick={() => scan.mutate("RETURN")}>
                      {scan.isPending && scan.variables === "RETURN" ? <Loader2 className="h-5 w-5 animate-spin" /> : <LogIn className="h-5 w-5" />} Record return
                    </button>
                  </div>
                </div>
              ) : (
                <p className="flex items-start gap-2 text-sm text-ink-muted">
                  <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-pending" aria-hidden /> {p.scanNote}
                </p>
              )}
              <div className="mt-3">
                <ErrorNote error={scan.error} />
              </div>
            </Card>
          )}

          <div className="grid gap-5 md:grid-cols-2">
            <Card title="Trip">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="mono text-sm text-navy-500">{p.requisition.referenceNumber}</span>
                <CarStatusBadge status={p.requisition.status} size="sm" />
                {p.requisition.urgent && <UrgentTag />}
              </div>
              <p className="break-words font-semibold text-ink">{p.requisition.purpose}</p>
              <dl className="mt-4 grid grid-cols-2 gap-4">
                <KeyValue label="From">{p.requisition.pickupLocation}</KeyValue>
                <KeyValue label="To">{p.requisition.dropLocation}</KeyValue>
                <KeyValue label="Pickup">{stamp(p.requisition.pickupAt)}</KeyValue>
                <KeyValue label="Back by">{p.requisition.returnAt ? stamp(p.requisition.returnAt) : TRIP_TYPE_LABEL[p.requisition.tripType as TripType]}</KeyValue>
                <KeyValue label="Pass valid">
                  {when(p.validFrom)} – {when(p.validUntil)}
                </KeyValue>
                <KeyValue label="Office">{p.requisition.branch.name}</KeyValue>
              </dl>
            </Card>
            <Card title="Driver & passengers">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <UserRound className="mt-0.5 h-4 w-4 shrink-0 text-navy-500" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink">{p.driver?.fullName}</p>
                    <p className="mono text-xs text-ink-muted">Licence {p.driver?.licenseNumber}</p>
                  </div>
                  <CallButton phone={p.driver?.phone} compact />
                </div>
                <div className="flex items-start gap-3">
                  <Users className="mt-0.5 h-4 w-4 shrink-0 text-navy-500" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-ink-subtle">{p.requisition.passengerCount} travelling · requested by</p>
                    <p className="text-sm font-semibold text-ink">{p.requisition.requester.name}</p>
                    <p className="text-xs text-ink-muted">{[p.requisition.requester.designation, p.requisition.requester.department].filter(Boolean).join(" · ")}</p>
                  </div>
                  <CallButton phone={p.requisition.requester.phone} compact />
                </div>
                {p.passengers.length > 0 && (
                  <ul className="space-y-1.5 border-t border-line pt-3">
                    {p.passengers.map((x, i) => (
                      <li key={i} className="flex items-center justify-between gap-2 text-sm">
                        <span className="truncate text-ink">{x.name}</span>
                        {x.phone && <span className="mono text-xs text-ink-muted">{x.phone}</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Card>
          </div>

          {p.scans.length > 0 && (
            <Card title="Gate record">
              <ol className="space-y-3">
                {p.scans.map((s, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm">
                    <span className={cx("grid h-8 w-8 place-items-center rounded-full", s.direction === "RETURN" ? "bg-success-soft text-success" : "bg-active-soft text-active")}>
                      {s.direction === "RETURN" ? <Flag className="h-4 w-4" aria-hidden /> : <LogOut className="h-4 w-4" aria-hidden />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="font-semibold text-ink">{s.direction === "RETURN" ? "Returned" : "Left the gate"}</span> <span className="text-ink-muted">· {s.by}</span>
                    </span>
                    <span className="tabular text-xs text-ink-subtle">{stamp(s.at)}</span>
                  </li>
                ))}
              </ol>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
