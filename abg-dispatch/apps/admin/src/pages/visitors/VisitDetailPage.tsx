import { useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Ban, CalendarClock, CheckCircle2, Copy, Download, EyeOff, IdCard, Loader2, LogIn, LogOut, Phone, Printer, TimerOff, UserRound } from "lucide-react";
import { VISITOR_LIMITS, VISIT_PURPOSE_HINT, VISIT_STATUS_TONE, VisitStatus, type VisitPurpose } from "@abg-dispatch/shared";
import { api, newKey } from "../../lib/api";
import { stamp } from "../../lib/format";
import { Card, ErrorNote, Field, KeyValue, Modal, Pill, Spinner, cx } from "../../components/ui";
import { toast } from "../../components/toast";
import { GatePassCard, OverstayTag, PrintPassStyles, PurposeIcon, VisitStatusBadge, dateOf, downloadPassPng, isToday, purposeLabel, stay, timeOf, windowLabel } from "./parts";
import type { Visit } from "./types";

const TONE_BAR: Record<string, string> = { pending: "bg-pending", active: "bg-active", success: "bg-success", neutral: "bg-neutral", danger: "bg-danger" };

interface Step {
  label: string;
  at: string | null;
  detail?: string | null;
  state: "done" | "current" | "todo" | "stopped";
}

/** Expected → On site → Checked out, or where it stopped (cancelled, did not arrive). */
function steps(v: Visit): Step[] {
  const registered: Step = {
    label: v.walkIn ? "Walk-in" : "Expected",
    at: v.expectedAt,
    detail: v.walkIn ? `Registered at the gate by ${v.checkedInBy ?? "security"}` : `Pass issued ${stamp(v.createdAt)}`,
    state: v.status === VisitStatus.EXPECTED ? "current" : "done",
  };
  if (v.status === VisitStatus.CANCELLED) {
    return [registered, { label: "Cancelled", at: v.cancelledAt, detail: [v.cancelledBy && `By ${v.cancelledBy}`, v.cancelReason].filter(Boolean).join(" — "), state: "stopped" }];
  }
  if (v.status === VisitStatus.EXPIRED) {
    return [registered, { label: "Did not arrive", at: v.expiredAt, detail: "The pass lapsed at the end of its day", state: "stopped" }];
  }
  return [
    registered,
    { label: "On site", at: v.checkedInAt, detail: v.checkedInAt ? [v.checkInPoint, v.checkedInBy && `by ${v.checkedInBy}`].filter(Boolean).join(" · ") : null, state: v.status === VisitStatus.CHECKED_IN ? "current" : v.checkedInAt ? "done" : "todo" },
    { label: "Checked out", at: v.checkedOutAt, detail: v.checkedOutAt ? [v.checkedOutBy && `by ${v.checkedOutBy}`, `${stay(v.onSiteMinutes)} on site`].filter(Boolean).join(" · ") : null, state: v.checkedOutAt ? "done" : "todo" },
  ];
}

function Progress({ visit }: { visit: Visit }) {
  const list = steps(visit);
  return (
    <ol className={cx("grid gap-y-4", list.length === 3 ? "grid-cols-3" : "grid-cols-2")} aria-label="Visit progress">
      {list.map((s, i) => (
        <li key={s.label} className="relative flex flex-col items-center px-1 text-center">
          {i > 0 && <span className={cx("absolute right-1/2 top-[13px] h-[2px] w-full", s.state === "todo" ? "bg-line" : s.state === "stopped" ? "bg-neutral" : "bg-navy")} aria-hidden />}
          <span
            className={cx(
              "relative z-10 grid h-7 w-7 place-items-center rounded-full border-2 text-[11px] font-bold",
              s.state === "done" && "border-navy bg-navy text-white",
              s.state === "current" && "border-active bg-active text-white",
              s.state === "stopped" && "border-neutral bg-neutral text-white",
              s.state === "todo" && "border-line-strong bg-white text-ink-subtle",
            )}
          >
            {s.state === "stopped" ? <Ban className="h-4 w-4" /> : s.state === "done" ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
          </span>
          <span className={cx("mt-2 text-xs font-semibold", s.state === "todo" ? "text-ink-subtle" : "text-navy")}>{s.label}</span>
          <span className="tabular text-[11px] text-ink-subtle">{s.at ? (isToday(s.at) ? timeOf(s.at) : `${dateOf(s.at)}, ${timeOf(s.at)}`) : s.state === "todo" ? "—" : ""}</span>
          {s.detail && <span className="mt-0.5 max-w-[220px] text-[11px] leading-snug text-ink-muted">{s.detail}</span>}
        </li>
      ))}
    </ol>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return <KeyValue label={label}>{children}</KeyValue>;
}

type Dialog = "checkin" | "checkout" | "cancel" | null;

export function VisitDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [dialog, setDialog] = useState<Dialog>(null);
  const [badge, setBadge] = useState("");
  const [reason, setReason] = useState("");
  const [idemKey, setIdemKey] = useState(newKey);
  const [downloading, setDownloading] = useState(false);

  const visit = useQuery({ queryKey: ["visit", id], queryFn: () => api.get<Visit>(`/visitors/${id}`), refetchInterval: 30_000 });

  const close = () => {
    setDialog(null);
    setBadge("");
    setReason("");
    setIdemKey(newKey());
    act.reset();
  };
  const act = useMutation({
    mutationFn: (d: Exclude<Dialog, null>) =>
      d === "checkin"
        ? api.post<Visit>(`/visitors/${id}/check-in`, { badgeNumber: badge.trim() || undefined }, idemKey)
        : d === "checkout"
          ? api.post<Visit>(`/visitors/${id}/check-out`, {}, idemKey)
          : api.post<Visit>(`/visitors/${id}/cancel`, { reason: reason.trim() || undefined }, idemKey),
    onSuccess: (next, d) => {
      qc.setQueryData(["visit", id], next);
      void qc.invalidateQueries({ queryKey: ["admin", "visitors"] });
      void qc.invalidateQueries({ queryKey: ["visitors", "mine"] });
      const told = next.host.userId && !next.viewer.isHost ? ` ${next.host.name} has been told.` : "";
      toast.success(d === "checkin" ? `${next.visitorName} checked in.${told}` : d === "checkout" ? `${next.visitorName} checked out after ${stay(next.onSiteMinutes)}.${told}` : `Gate pass ${next.passNumber} cancelled. The visitor has been sent an SMS.`);
      close();
    },
  });

  if (visit.isLoading) return <Spinner label="Loading visit" />;
  if (visit.error || !visit.data) return <ErrorNote error={visit.error ?? new Error("Visit not found.")} />;
  const v = visit.data;
  const actions = new Set(v.viewer.actions);
  const tone = VISIT_STATUS_TONE[v.status as VisitStatus] ?? "neutral";

  return (
    <div className="space-y-6">
      <PrintPassStyles />
      <Link to="/visitors" className="no-print inline-flex items-center gap-1.5 text-sm font-semibold text-ink-muted hover:text-navy">
        <ArrowLeft className="h-4 w-4" /> Visitors
      </Link>

      <section className="card overflow-hidden">
        <div className={cx("h-1", TONE_BAR[tone])} />
        <div className="flex flex-wrap items-start justify-between gap-4 px-6 pb-5 pt-5">
          <div className="flex min-w-0 items-start gap-4">
            <span className="hidden h-14 w-14 shrink-0 place-items-center rounded-2xl bg-platinum-bright text-navy-500 sm:grid">
              <PurposeIcon purpose={v.purpose} className="h-6 w-6" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="mono text-sm text-navy-500">{v.passNumber}</span>
                <VisitStatusBadge status={v.status} />
                {v.walkIn && <Pill tone="neutral">Walk-in</Pill>}
                {v.overstay && <OverstayTag />}
              </div>
              <h1 className="mt-2 font-display text-[26px] font-extrabold leading-tight tracking-tight text-navy">{v.visitorName}</h1>
              <p className="mt-1 text-sm text-ink-muted">
                {[v.company, purposeLabel(v.purpose), v.branch.name].filter(Boolean).join(" · ")}
              </p>
            </div>
          </div>
          {actions.size > 0 && (
            <div className="no-print flex flex-wrap gap-2">
              {actions.has("CANCEL") && (
                <button className="btn-secondary" onClick={() => setDialog("cancel")}>
                  <Ban className="h-4 w-4" /> Cancel pass
                </button>
              )}
              {actions.has("CHECK_IN") && (
                <button className="btn-primary" onClick={() => setDialog("checkin")}>
                  <LogIn className="h-4 w-4" /> Check in
                </button>
              )}
              {actions.has("CHECK_OUT") && (
                <button className="btn-primary" onClick={() => setDialog("checkout")}>
                  <LogOut className="h-4 w-4" /> Check out
                </button>
              )}
            </div>
          )}
        </div>
        <div className="border-t border-line bg-surface/50 px-4 py-5 sm:px-6">
          <Progress visit={v} />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_1fr]">
        <div className="min-w-0 space-y-3">
          {v.pass ? (
            <>
              <GatePassCard visit={v} />
              <div className="no-print mx-auto flex max-w-[400px] flex-wrap justify-center gap-2">
                <button className="btn-secondary" onClick={() => window.print()}>
                  <Printer className="h-4 w-4" /> Print
                </button>
                <button
                  className="btn-secondary"
                  disabled={downloading}
                  onClick={async () => {
                    setDownloading(true);
                    try {
                      await downloadPassPng(v);
                    } catch (err) {
                      toast.error(err);
                    } finally {
                      setDownloading(false);
                    }
                  }}
                >
                  {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Download
                </button>
                <button
                  className="btn-ghost"
                  onClick={() =>
                    navigator.clipboard
                      ?.writeText(`ABG gate pass ${v.passNumber}\n${v.visitorName}${v.company ? `, ${v.company}` : ""}\n${v.branch.name} · ${windowLabel(v.expectedAt, v.expectedUntil, true)}\nHost: ${v.host.name}`)
                      .then(() => toast.success("Pass details copied."), toast.error)
                  }
                >
                  <Copy className="h-4 w-4" /> Copy details
                </button>
              </div>
              <p className="no-print mx-auto max-w-[400px] text-center text-xs text-ink-subtle">The QR holds only a secret link that the gate verifies in ABG ONE. Share it with the visitor only.</p>
            </>
          ) : (
            <Card>
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-neutral-soft text-neutral">
                  <EyeOff className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-ink">Gate pass not shown</p>
                  <p className="text-xs text-ink-muted">Only the host and this office's gate staff can see or print the QR pass.</p>
                </div>
              </div>
            </Card>
          )}
        </div>

        <div className="min-w-0 space-y-6">
          <Card title="Visitor">
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Row label="Mobile">
                {v.visitorPhone ? (
                  v.visitorPhone.includes("•") ? (
                    <span className="tabular">{v.visitorPhone}</span>
                  ) : (
                    <a href={`tel:${v.visitorPhone}`} className="tabular inline-flex items-center gap-1 font-semibold text-active hover:underline">
                      <Phone className="h-3.5 w-3.5" /> {v.visitorPhone}
                    </a>
                  )
                ) : null}
              </Row>
              <Row label="Company or organisation">{v.company ?? "Not given"}</Row>
              <Row label="ID (last 4)">{v.idLast4 ? <span className="mono tracking-[0.2em]">•••• {v.idLast4}</span> : "Not recorded"}</Row>
              <Row label="Party">{v.partySize === 1 ? "1 person" : `${v.partySize} people on this pass`}</Row>
              <Row label="Vehicle">{v.vehicleNumber ?? "None"}</Row>
              <Row label="Carrying">{v.carrying ?? "Nothing declared"}</Row>
              {v.notes && (
                <div className="sm:col-span-2">
                  <Row label="Note for the gate">{v.notes}</Row>
                </div>
              )}
            </dl>
          </Card>

          <Card title="Visit">
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Row label="Purpose">
                <span className="inline-flex items-center gap-1.5">
                  <PurposeIcon purpose={v.purpose} className="h-3.5 w-3.5 text-ink-subtle" /> {purposeLabel(v.purpose)}
                </span>
                <span className="block text-xs font-normal text-ink-subtle">{v.purposeDetail ?? VISIT_PURPOSE_HINT[v.purpose as VisitPurpose]}</span>
              </Row>
              <Row label="When">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarClock className="h-3.5 w-3.5 text-ink-subtle" /> {windowLabel(v.expectedAt, v.expectedUntil, true)}
                </span>
              </Row>
              <Row label="Office">
                {v.branch.name} <span className="mono text-xs text-ink-muted">{v.branch.code}</span>
                {v.branch.address && <span className="block text-xs font-normal text-ink-subtle">{v.branch.address}</span>}
              </Row>
              <Row label="Area">{v.location?.path ?? "Anywhere in the office"}</Row>
              <Row label="Badge">
                {v.badgeNumber ? (
                  <span className="inline-flex items-center gap-1.5">
                    <IdCard className="h-3.5 w-3.5 text-ink-subtle" /> {v.badgeNumber}
                  </span>
                ) : (
                  "Not issued"
                )}
              </Row>
              <Row label="Time on site">{v.onSiteMinutes !== null ? stay(v.onSiteMinutes) : "—"}</Row>
              {v.status === VisitStatus.EXPIRED && (
                <div className="sm:col-span-2">
                  <p className="flex items-start gap-2 rounded-xl bg-neutral-soft px-3 py-2.5 text-sm text-neutral">
                    <TimerOff className="mt-0.5 h-4 w-4 shrink-0" /> The visitor never arrived; the pass lapsed at the end of {dateOf(v.expectedAt)}.
                  </p>
                </div>
              )}
            </dl>
          </Card>

          <Card title="Host">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-platinum-bright text-navy-500">
                <UserRound className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink">
                  {v.host.name} {v.host.employeeCode && <span className="mono text-xs font-medium text-ink-muted">{v.host.employeeCode}</span>}
                  {v.viewer.isHost && <span className="ml-1 text-xs font-medium text-ink-muted">(you)</span>}
                </p>
                <p className="text-xs text-ink-muted">{[v.host.designation, v.host.department].filter(Boolean).join(" · ") || (v.host.userId ? "—" : "Not on ABG ONE — tell them in person when the visitor arrives")}</p>
                {v.host.phone && (
                  <a href={`tel:${v.host.phone}`} className="mt-1 inline-block text-xs font-semibold text-active hover:underline">
                    {v.host.phone}
                  </a>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>

      <Modal
        open={dialog === "checkin"}
        onClose={close}
        title={`Check in ${v.visitorName}`}
        subtitle={`${v.partySize > 1 ? `${v.partySize} people on this pass. ` : ""}Compare the ID card${v.idLast4 ? ` (last 4: ${v.idLast4})` : ""} and hand over a visitor badge. ${v.host.userId ? `${v.host.name} is told at once.` : ""}`}
        footer={
          <>
            <button className="btn-ghost" onClick={close}>
              Back
            </button>
            <button className="btn-primary" disabled={act.isPending} onClick={() => act.mutate("checkin")}>
              {act.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />} Check in
            </button>
          </>
        }
      >
        <Field label="Badge number (optional)">
          {(fid) => (
            <input
              id={fid}
              className="input uppercase"
              value={badge}
              onChange={(e) => setBadge(e.target.value.replace(/[^A-Za-z0-9-]/g, "").slice(0, VISITOR_LIMITS.badgeMax))}
              onKeyDown={(e) => e.key === "Enter" && act.mutate("checkin")}
              placeholder={`e.g. ${v.branch.code}-V15`}
            />
          )}
        </Field>
        <ErrorNote error={act.error} />
      </Modal>

      <Modal
        open={dialog === "checkout"}
        onClose={close}
        title={`Check out ${v.visitorName}`}
        subtitle={`On site for ${stay(v.onSiteMinutes)}.${v.badgeNumber ? ` Collect badge ${v.badgeNumber}.` : ""}${v.carrying ? ` Check what they carry out: ${v.carrying}.` : ""}`}
        footer={
          <>
            <button className="btn-ghost" onClick={close}>
              Back
            </button>
            <button className="btn-primary" data-autofocus disabled={act.isPending} onClick={() => act.mutate("checkout")}>
              {act.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />} Check out
            </button>
          </>
        }
      >
        <p className="text-sm text-ink-muted">The pass cannot be used again after check-out.</p>
        <ErrorNote error={act.error} />
      </Modal>

      <Modal
        open={dialog === "cancel"}
        onClose={close}
        title="Cancel this gate pass"
        subtitle={`${v.visitorName} is sent an SMS that the visit on ${dateOf(v.expectedAt)} is cancelled, and the pass stops working at the gate.`}
        footer={
          <>
            <button className="btn-ghost" onClick={close}>
              Keep the pass
            </button>
            <button className="btn-danger" disabled={act.isPending} onClick={() => act.mutate("cancel")}>
              {act.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />} Cancel pass
            </button>
          </>
        }
      >
        <Field label="Reason (optional)">
          {(fid) => <textarea id={fid} className="input min-h-[88px] py-2.5" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={VISITOR_LIMITS.noteMax} placeholder="e.g. Meeting moved to next week." />}
        </Field>
        <ErrorNote error={act.error} />
      </Modal>
    </div>
  );
}
