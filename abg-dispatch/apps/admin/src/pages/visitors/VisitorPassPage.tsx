import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, BadgeCheck, CalendarClock, Car, DoorOpen, IdCard, Loader2, LogIn, LogOut, ScanLine, ShieldAlert, ShieldCheck, ShieldX, TriangleAlert, UserRound, UsersRound, type LucideIcon } from "lucide-react";
import { VISITOR_LIMITS, extractGatePass, normalizeVisitorPassNumber } from "@abg-dispatch/shared";
import { ApiError, api } from "../../lib/api";
import { Card, ErrorNote, KeyValue, Spinner, cx } from "../../components/ui";
import { toast } from "../../components/toast";
import { PurposeIcon, VisitStatusBadge, purposeLabel, stay, timeOf, windowLabel } from "./parts";
import type { GatePassView } from "./types";

const BLOCK_TITLE: Record<string, string> = {
  WRONG_OFFICE: "Wrong office",
  WRONG_DAY: "Not valid today",
  CANCELLED: "Pass cancelled",
  EXPIRED: "Pass expired",
  ALREADY_OUT: "Pass already used",
};

interface Verdict {
  tone: "success" | "active" | "danger" | "neutral";
  icon: LucideIcon;
  title: string;
  message: string;
}

function verdict(p: GatePassView): Verdict {
  const block = p.warnings.find((w) => w.blocking);
  if (block) return { tone: "danger", icon: ShieldX, title: BLOCK_TITLE[block.code] ?? "Not valid", message: block.message };
  if (p.allowed.includes("CHECK_IN")) return { tone: "success", icon: ShieldCheck, title: "Valid pass", message: `Expected ${windowLabel(p.expectedAt, p.expectedUntil)} to see ${p.host.name}. Check the ID, then check the visitor in.` };
  if (p.allowed.includes("CHECK_OUT")) return { tone: "active", icon: DoorOpen, title: "On site", message: `Checked in at ${p.checkedInAt ? timeOf(p.checkedInAt) : "—"}${p.badgeNumber ? ` with badge ${p.badgeNumber}` : ""}. Check them out as they leave.` };
  return { tone: "neutral", icon: BadgeCheck, title: "Genuine pass", message: "Your role can verify passes but not check visitors in or out. Ask security or the front desk." };
}

const TONE: Record<Verdict["tone"], string> = {
  success: "bg-success text-white",
  active: "bg-active text-white",
  danger: "bg-danger text-white",
  neutral: "bg-navy text-white",
};

function VerifyAnother() {
  const navigate = useNavigate();
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="flex flex-col gap-2 sm:flex-row"
      onSubmit={async (e) => {
        e.preventDefault();
        const v = value.trim();
        const pass = extractGatePass(v);
        if (pass?.kind === "VISITOR") return (setValue(""), navigate(`/visitors/pass/${pass.token}`));
        const number = normalizeVisitorPassNumber(v);
        if (!number) return toast.error(new Error("Scan the QR or type a pass number like VP-261021-FCA-012."));
        setBusy(true);
        try {
          const found = await api.get<GatePassView>(`/visitors/passes/by-number/${encodeURIComponent(number)}`);
          setValue("");
          if (found.token) navigate(`/visitors/pass/${found.token}`);
        } catch (err) {
          toast.error(err);
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="relative flex-1">
        <ScanLine className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subtle" aria-hidden />
        <input className="input pl-9" value={value} onChange={(e) => setValue(e.target.value)} placeholder="Scan the next pass or type its number" aria-label="Verify another pass" />
      </div>
      <button className="btn-secondary" disabled={busy || !value.trim()}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <BadgeCheck className="h-4 w-4" />} Verify
      </button>
    </form>
  );
}

/** Opened when a desk scanner or phone reads a visitor's QR pass: a big verdict, the details to compare, and one action. */
export function VisitorPassPage() {
  const { token } = useParams<{ token: string }>();
  const qc = useQueryClient();
  const [badge, setBadge] = useState("");
  const pass = useQuery({ queryKey: ["visitor-pass", token], queryFn: () => api.get<GatePassView>(`/visitors/passes/${token}`), retry: false });
  const act = useMutation({
    mutationFn: (action: "check-in" | "check-out") => api.post<GatePassView>(`/visitors/passes/${token}/${action}`, action === "check-in" ? { badgeNumber: badge.trim() || undefined } : {}),
    onSuccess: (next, action) => {
      qc.setQueryData(["visitor-pass", token], next);
      void qc.invalidateQueries({ queryKey: ["admin", "visitors"] });
      setBadge("");
      toast.success(action === "check-in" ? `${next.visitor.name} checked in. ${next.host.name} has been told.` : `${next.visitor.name} checked out.`);
    },
    onError: toast.error,
  });

  const back = (
    <Link to="/visitors" className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-muted hover:text-navy">
      <ArrowLeft className="h-4 w-4" /> Visitors
    </Link>
  );

  if (pass.isLoading) return <Spinner label="Verifying pass" />;
  if (pass.error || !pass.data) {
    const notFound = pass.error instanceof ApiError && pass.error.status === 404;
    return (
      <div className="mx-auto max-w-2xl space-y-5">
        {back}
        {notFound ? (
          <section className="overflow-hidden rounded-2xl bg-danger text-white shadow-raised" role="alert">
            <div className="flex items-start gap-4 p-6">
              <ShieldAlert className="h-12 w-12 shrink-0" aria-hidden />
              <div>
                <p className="font-display text-2xl font-extrabold">Pass not recognised</p>
                <p className="mt-1 text-sm text-white/90">{pass.error instanceof Error ? pass.error.message : "This gate pass is not valid."} Do not admit the visitor on it — call the host or register them as a walk-in.</p>
              </div>
            </div>
          </section>
        ) : (
          <ErrorNote error={pass.error} />
        )}
        <Card>
          <VerifyAnother />
        </Card>
      </div>
    );
  }

  const p = pass.data;
  const v = verdict(p);
  const notes = p.warnings.filter((w) => !w.blocking);
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      {back}
      <section className={cx("overflow-hidden rounded-2xl shadow-raised", TONE[v.tone])} role="status" aria-live="polite">
        <div className="flex items-start gap-4 p-6">
          <v.icon className="h-12 w-12 shrink-0" aria-hidden />
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/75">Visitor gate pass · {p.branch.name}</p>
            <p className="mt-1 font-display text-[30px] font-extrabold leading-tight">{v.title}</p>
            <p className="mt-1 text-sm text-white/90">{v.message}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-white/15 bg-black/10 px-6 py-2.5 text-xs text-white/85">
          <span className="mono tracking-[0.06em]">{p.passNumber}</span>
          <span>{p.walkIn ? "Walk-in" : "Pre-registered"}</span>
          {p.checkInPoint && <span>In at {p.checkInPoint.split(" › ").pop()}</span>}
        </div>
      </section>

      {notes.map((w) => (
        <p key={w.code} className="flex items-start gap-2 rounded-xl border border-pending/25 bg-pending-soft px-4 py-3 text-sm font-medium text-pending" role="note">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> {w.message}
        </p>
      ))}

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-platinum-bright text-navy-500">
              <PurposeIcon purpose={p.purpose} className="h-6 w-6" />
            </span>
            <div className="min-w-0">
              <p className="font-display text-[22px] font-extrabold leading-tight text-navy">{p.visitor.name}</p>
              <p className="text-sm text-ink-muted">{[p.visitor.company, purposeLabel(p.purpose)].filter(Boolean).join(" · ")}</p>
              {p.purposeDetail && <p className="mt-0.5 text-xs text-ink-subtle">{p.purposeDetail}</p>}
            </div>
          </div>
          <VisitStatusBadge status={p.status} />
        </div>
        <dl className="mt-5 grid grid-cols-1 gap-4 border-t border-line pt-5 sm:grid-cols-3">
          <KeyValue label="ID card — last 4">{p.visitor.idLast4 ? <span className="mono text-base tracking-[0.25em] text-navy">{p.visitor.idLast4}</span> : "Not recorded"}</KeyValue>
          <KeyValue label="Party">
            <span className="inline-flex items-center gap-1.5">
              <UsersRound className="h-3.5 w-3.5 text-ink-subtle" /> {p.visitor.partySize === 1 ? "1 person" : `${p.visitor.partySize} people`}
            </span>
          </KeyValue>
          <KeyValue label="Mobile">{p.visitor.phone}</KeyValue>
          <KeyValue label="Host">
            <span className="inline-flex items-center gap-1.5">
              <UserRound className="h-3.5 w-3.5 text-ink-subtle" /> {p.host.name}
            </span>
            {(p.host.designation || p.host.department) && <span className="block text-xs font-normal text-ink-subtle">{[p.host.designation, p.host.department].filter(Boolean).join(" · ")}</span>}
          </KeyValue>
          <KeyValue label="When">
            <span className="inline-flex items-center gap-1.5">
              <CalendarClock className="h-3.5 w-3.5 text-ink-subtle" /> {windowLabel(p.expectedAt, p.expectedUntil, true)}
            </span>
          </KeyValue>
          <KeyValue label="Office · area">{p.location ?? p.branch.name}</KeyValue>
          {p.visitor.vehicleNumber && (
            <KeyValue label="Vehicle">
              <span className="inline-flex items-center gap-1.5">
                <Car className="h-3.5 w-3.5 text-ink-subtle" /> {p.visitor.vehicleNumber}
              </span>
            </KeyValue>
          )}
          {p.visitor.carrying && <KeyValue label="Carrying">{p.visitor.carrying}</KeyValue>}
          {p.checkedInAt && <KeyValue label="Checked in">{`${timeOf(p.checkedInAt)}${p.checkedOutAt ? ` → ${timeOf(p.checkedOutAt)}` : ""} · ${stay(Math.round(((p.checkedOutAt ? new Date(p.checkedOutAt) : new Date()).getTime() - new Date(p.checkedInAt).getTime()) / 60_000))}`}</KeyValue>}
        </dl>

        {(p.allowed.includes("CHECK_IN") || p.allowed.includes("CHECK_OUT")) && (
          <div className="mt-6 border-t border-line pt-5">
            {p.allowed.includes("CHECK_IN") ? (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <label className="flex-1">
                  <span className="label">Badge number (optional)</span>
                  <span className="relative block">
                    <IdCard className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subtle" aria-hidden />
                    <input className="input pl-9 uppercase" value={badge} onChange={(e) => setBadge(e.target.value.replace(/[^A-Za-z0-9-]/g, "").slice(0, VISITOR_LIMITS.badgeMax))} placeholder={`e.g. ${p.branch.code}-V15`} />
                  </span>
                </label>
                <button className="btn-primary h-12 px-6 text-base" disabled={act.isPending} onClick={() => act.mutate("check-in")}>
                  {act.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <LogIn className="h-5 w-5" />} Check in
                </button>
              </div>
            ) : (
              <button className="btn-primary h-12 w-full px-6 text-base sm:w-auto" disabled={act.isPending} onClick={() => act.mutate("check-out")}>
                {act.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <LogOut className="h-5 w-5" />} Check out{p.badgeNumber ? ` · collect badge ${p.badgeNumber}` : ""}
              </button>
            )}
          </div>
        )}
        {p.visitId && (
          <div className="mt-4 text-right">
            <Link to={`/visitors/${p.visitId}`} className="inline-flex items-center gap-1 text-sm font-semibold text-active hover:underline">
              Open the visit <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        )}
      </Card>

      <Card title="Next visitor">
        <VerifyAnother />
      </Card>
    </div>
  );
}
