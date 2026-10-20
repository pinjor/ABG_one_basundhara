import { useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  FileText,
  Fingerprint,
  ImageIcon,
  Loader2,
  MapPin,
  MessageSquare,
  Paperclip,
  Printer,
  ScrollText,
  Send,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { CARRIER_TYPE_LABEL, CLASSIFICATION_LABEL, Capability, EXCEPTION_LABEL, HAPPY_PATH, STATUS_LABEL, STATUS_TONE, VERIFICATION_LABEL, type ParcelStatus } from "@abg-dispatch/shared";
import { api, upload } from "../lib/api";
import { useCan } from "../lib/auth";
import { ago, stamp, when } from "../lib/format";
import type { Parcel, Person, Timeline } from "../lib/types";
import { Card, ClassificationTag, ErrorNote, KeyValue, OverdueTag, Pill, PriorityBadge, Spinner, StatusBadge, cx } from "../components/ui";
import { ActionButtons, ActionDialog } from "../components/ParcelActions";
import { toast } from "../components/toast";

const MILESTONE: Partial<Record<ParcelStatus, keyof Parcel["milestones"]>> = {
  BOOKED: "bookedAt",
  AWAITING_PICKUP: "carrierAssignedAt",
  PICKED_UP: "pickedUpAt",
  IN_TRANSIT: "inTransitAt",
  ARRIVED_AT_DESTINATION: "arrivedAt",
  PENDING_RECEIPT: "pendingReceiptAt",
  RECEIVED: "receivedAt",
};

function Stepper({ parcel }: { parcel: Parcel }) {
  const steps = HAPPY_PATH.filter((s) => s !== "PENDING_RECEIPT");
  const reached = (s: ParcelStatus) => !!parcel.milestones[MILESTONE[s]!];
  const offPath = !HAPPY_PATH.includes(parcel.status as ParcelStatus);
  return (
    <ol className="grid grid-cols-3 gap-y-4 sm:grid-cols-6" aria-label="Custody progress">
      {steps.map((s, i) => {
        const done = reached(s);
        const current = !offPath && (parcel.status === s || (s === "ARRIVED_AT_DESTINATION" && parcel.status === "PENDING_RECEIPT"));
        const at = parcel.milestones[MILESTONE[s]!];
        return (
          <li key={s} className="relative flex flex-col items-center text-center">
            {i > 0 && <span className={cx("absolute right-1/2 top-[13px] h-[2px] w-full", done ? "bg-navy" : "bg-line")} aria-hidden />}
            <span className={cx("relative z-10 grid h-7 w-7 place-items-center rounded-full border-2 text-[11px] font-bold", done ? "border-navy bg-navy text-white" : current ? "border-navy bg-white text-navy" : "border-line-strong bg-white text-ink-subtle")}>
              {done ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
            </span>
            <span className={cx("mt-2 text-xs font-semibold", done || current ? "text-navy" : "text-ink-subtle")}>{s === "ARRIVED_AT_DESTINATION" ? "Arrived" : STATUS_LABEL[s]}</span>
            <span className="text-[11px] text-ink-subtle">{at ? when(at) : current && parcel.status === "PENDING_RECEIPT" ? "Awaiting receiver" : ""}</span>
          </li>
        );
      })}
    </ol>
  );
}

function PersonLine({ person, fallback }: { person: Person | null; fallback?: string | null }) {
  if (!person) return <span className="text-sm text-ink">{fallback ?? "—"}</span>;
  return (
    <div>
      <p className="text-sm font-semibold text-ink">
        {person.fullName} <span className="mono text-xs font-medium text-ink-muted">{person.employeeCode}</span>
      </p>
      <p className="text-xs text-ink-muted">
        {[person.designation, person.department?.name, person.branch?.name].filter(Boolean).join(" · ")}
        {person.phone ? ` · ${person.phone}` : ""}
      </p>
    </div>
  );
}

export function ParcelDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [action, setAction] = useState<string | null>(null);
  const [exceptionId, setExceptionId] = useState<string>();
  const [comment, setComment] = useState("");
  const [kind, setKind] = useState("SUPPORTING_DOCUMENT");
  const fileRef = useRef<HTMLInputElement>(null);
  const canReport = useCan(Capability.REPORTS_EXPORT);

  const parcel = useQuery({ queryKey: ["parcel", id], queryFn: () => api.get<Parcel>(`/parcels/${id}`) });
  const timeline = useQuery({ queryKey: ["timeline", id], queryFn: () => api.get<Timeline>(`/parcels/${id}/timeline`) });

  const addComment = useMutation({
    mutationFn: () => api.post(`/parcels/${id}/comments`, { body: comment }),
    onSuccess: () => {
      setComment("");
      void qc.invalidateQueries({ queryKey: ["timeline", id] });
    },
    onError: toast.error,
  });
  const attach = useMutation({
    mutationFn: (file: File) => upload(`/parcels/${id}/attachments`, file, { kind }),
    onSuccess: () => {
      toast.success("Attachment added");
      void qc.invalidateQueries({ queryKey: ["timeline", id] });
    },
    onError: toast.error,
  });
  const openAttachment = async (attachmentId: string) => {
    const win = window.open("", "_blank");
    try {
      const { url } = await api.get<{ url: string }>(`/parcels/${id}/attachments/${attachmentId}/link`);
      if (win) win.location.href = url;
    } catch (err) {
      win?.close();
      toast.error(err);
    }
  };

  if (parcel.isLoading) return <Spinner label="Loading parcel" />;
  if (parcel.error || !parcel.data) return <ErrorNote error={parcel.error ?? new Error("Parcel not found.")} />;
  const p = parcel.data;
  const t = timeline.data;
  const actions = p.viewer.actions;
  const openExceptions = t?.exceptions.filter((x) => x.open) ?? [];
  const tone = STATUS_TONE[p.status as ParcelStatus];

  return (
    <div className="space-y-6">
      <Link to="/parcels" className="no-print inline-flex items-center gap-1.5 text-sm font-semibold text-ink-muted hover:text-navy">
        <ArrowLeft className="h-4 w-4" /> Parcels
      </Link>

      <section className="card overflow-hidden">
        <div className={cx("h-1", tone === "danger" ? "bg-danger" : tone === "success" ? "bg-success" : tone === "pending" ? "bg-pending" : tone === "active" ? "bg-active" : "bg-neutral")} />
        <div className="flex flex-wrap items-start justify-between gap-4 px-6 pb-5 pt-5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="mono text-sm text-navy-500">{p.trackingNumber}</span>
              <StatusBadge status={p.status} />
              <PriorityBadge priority={p.priority} />
              <ClassificationTag value={p.classification} />
              {p.isOverdue && <OverdueTag />}
            </div>
            <h1 className="mt-2 font-display text-[26px] font-extrabold leading-tight tracking-tight text-navy">{p.title}</h1>
            <p className="mt-1 text-sm text-ink-muted">
              {p.category.name} · {p.origin.branch.name} → {p.destination.branch?.name ?? "External"} · booked {stamp(p.milestones.bookedAt ?? p.createdAt)}
            </p>
          </div>
          <div className="no-print flex flex-wrap gap-2">
            {p.qrPayload && (
              <Link to={`/print/label/${p.id}`} target="_blank" className="btn-secondary">
                <Printer className="h-4 w-4" /> Print label
              </Link>
            )}
            {canReport && (
              <Link to={`/reports?type=chain-of-custody&parcelId=${p.id}`} className="btn-secondary">
                <ScrollText className="h-4 w-4" /> Chain of custody
              </Link>
            )}
          </div>
        </div>
        <div className="border-t border-line bg-surface/50 px-6 py-5">
          <Stepper parcel={p} />
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-6">
          {p.receipt && (
            <Card title="Proof of receipt">
              <div className="flex items-start gap-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-success-soft text-success">
                  <ShieldCheck className="h-5 w-5" />
                </span>
                <dl className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-3">
                  <KeyValue label="Received by">
                    {p.receipt.receivedBy.name} {p.receipt.receivedBy.employeeCode && <span className="mono text-xs text-ink-muted">{p.receipt.receivedBy.employeeCode}</span>}
                  </KeyValue>
                  <KeyValue label="Received at">{stamp(p.receipt.receivedAt)}</KeyValue>
                  <KeyValue label="Verified by">{p.receipt.verification ? VERIFICATION_LABEL[p.receipt.verification as keyof typeof VERIFICATION_LABEL] ?? p.receipt.verification : "—"}</KeyValue>
                  {p.receipt.onBehalf && (
                    <div className="sm:col-span-3">
                      <Pill tone="pending">
                        <UserRound className="h-3 w-3" /> Received on behalf of {p.receiver.employee?.fullName ?? p.receiver.department?.name}
                      </Pill>
                      <p className="mt-1.5 text-sm text-ink-muted">
                        {p.receipt.onBehalfReason}
                        {p.receipt.onBehalfRelationship ? ` · ${p.receipt.onBehalfRelationship}` : ""}
                      </p>
                    </div>
                  )}
                </dl>
              </div>
            </Card>
          )}

          <Card title="Custody ledger" action={<span className="text-xs text-ink-subtle">Append-only · server time, Asia/Dhaka</span>} padded={false}>
            {!t ? (
              <Spinner />
            ) : (
              <ol className="relative px-5 py-4">
                {t.events.map((e, i) => {
                  const last = i === t.events.length - 1;
                  const bad = ["EXCEPTION_RECORDED", "DELIVERY_FAILED", "PUT_ON_HOLD", "CANCELLED", "SLA_ESCALATED"].includes(e.eventType);
                  const good = e.eventType === "RECEIVED" || e.eventType === "HANDOVER_CONFIRMED";
                  return (
                    <li key={e.id} className="relative flex gap-4 pb-5 last:pb-1">
                      {!last && <span className="absolute left-[15px] top-8 h-[calc(100%-24px)] w-px bg-line" aria-hidden />}
                      <span className={cx("relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full text-[11px] font-bold", bad ? "bg-danger-soft text-danger" : good ? "bg-success-soft text-success" : "bg-platinum-bright text-navy-500")}>{e.sequence}</span>
                      <div className="min-w-0 flex-1 pt-1">
                        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                          <p className="text-sm font-semibold text-ink">
                            {e.label}
                            {e.toStatus && e.toStatus !== e.fromStatus && <span className="ml-2 text-xs font-medium text-ink-muted">→ {STATUS_LABEL[e.toStatus as ParcelStatus]}</span>}
                          </p>
                          <time className="text-xs text-ink-muted" dateTime={e.at} title={e.deviceAt ? `Device time ${stamp(e.deviceAt)}` : undefined}>
                            {stamp(e.at)}
                          </time>
                        </div>
                        <p className="mt-0.5 text-xs text-ink-muted">
                          {e.actor.name}
                          {e.actor.code ? ` · ${e.actor.code}` : ""}
                          {e.location && (
                            <>
                              {" · "}
                              <MapPin className="inline h-3 w-3" /> {e.location}
                            </>
                          )}
                          {e.externalProvider ? ` · via ${e.externalProvider}` : ""}
                        </p>
                        {(e.verification || e.proof) && (
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {e.verification && (
                              <Pill tone="success">
                                <Fingerprint className="h-3 w-3" /> {e.verification.label}
                              </Pill>
                            )}
                            {e.proof?.attachmentId && (
                              <button className="inline-flex items-center gap-1 rounded-full bg-platinum-bright px-2 py-0.5 text-[11px] font-semibold text-navy-500 hover:text-active" onClick={() => openAttachment(e.proof!.attachmentId!)}>
                                <ImageIcon className="h-3 w-3" /> View proof
                              </button>
                            )}
                          </div>
                        )}
                        {e.notes && <p className="mt-1.5 rounded-lg bg-surface px-3 py-2 text-[13px] text-ink">{e.notes}</p>}
                        {e.eventType === "CORRECTION_ADDED" && typeof e.metadata.field === "string" && (
                          <p className="mt-1 text-xs text-ink-muted">
                            {String(e.metadata.field)}: <s>{String(e.metadata.before ?? "—")}</s> → {String(e.metadata.after ?? "—")}
                          </p>
                        )}
                        {e.correctedBy.length > 0 && <p className="mt-1 text-[11px] font-semibold text-pending">Has a later correction</p>}
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </Card>

          <Card title="Notes" padded={false}>
            {t && t.comments.length === 0 && <p className="px-5 pt-4 text-sm text-ink-muted">No notes yet.</p>}
            <ul className="divide-y divide-line">
              {t?.comments.map((c) => (
                <li key={c.id} className="px-5 py-3">
                  <p className="text-xs text-ink-muted">
                    <span className="font-semibold text-ink">{c.author}</span> · {when(c.createdAt)}
                  </p>
                  <p className="mt-0.5 whitespace-pre-line text-sm text-ink">{c.body}</p>
                </li>
              ))}
            </ul>
            {actions.includes("COMMENT") && (
              <form
                className="no-print flex gap-2 border-t border-line p-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (comment.trim()) addComment.mutate();
                }}
              >
                <MessageSquare className="mt-2.5 h-4 w-4 shrink-0 text-ink-subtle" />
                <input className="input" placeholder="Add a note for everyone on this parcel…" value={comment} onChange={(e) => setComment(e.target.value)} maxLength={2000} />
                <button className="btn-primary" disabled={!comment.trim() || addComment.isPending}>
                  <Send className="h-4 w-4" />
                </button>
              </form>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Actions" className="no-print">
            <ActionButtons parcel={p} onPick={setAction} />
          </Card>

          {openExceptions.length > 0 || (t?.exceptions.length ?? 0) > 0 ? (
            <Card title="Exceptions">
              <ul className="space-y-3">
                {t!.exceptions.map((x) => (
                  <li key={x.id} className={cx("rounded-xl border p-3", x.open ? "border-danger/25 bg-danger-soft/50" : "border-line")}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-ink">{EXCEPTION_LABEL[x.code as keyof typeof EXCEPTION_LABEL] ?? x.code}</p>
                      <Pill tone={x.open ? "danger" : "success"}>{x.open ? "Open" : "Resolved"}</Pill>
                    </div>
                    <p className="mt-1 text-sm text-ink">{x.details}</p>
                    <p className="mt-1 text-xs text-ink-muted">
                      {x.raisedBy} · {ago(x.raisedAt)}
                    </p>
                    {x.resolution && (
                      <p className="mt-2 border-t border-line pt-2 text-xs text-ink-muted">
                        <span className="font-semibold text-success">Resolved:</span> {x.resolution} — {x.resolvedBy}
                      </p>
                    )}
                    {x.open && actions.includes("RESOLVE_EXCEPTION") && (
                      <button className="btn-secondary no-print mt-2 h-8 text-xs" onClick={() => (setExceptionId(x.id), setAction("RESOLVE_EXCEPTION"))}>
                        Resolve
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          <Card title="People & places">
            <dl className="space-y-4">
              <KeyValue label={p.sentOnBehalf ? `Sender (booked by ${p.createdBy.name})` : "Sender"}>
                <PersonLine person={p.sender} />
              </KeyValue>
              <KeyValue label="From">{p.origin.location?.path ?? p.origin.branch.name}</KeyValue>
              <KeyValue label={`Receiver · ${p.receiverType.toLowerCase()}`}>
                <PersonLine person={p.receiver.employee} fallback={p.receiver.department?.name ?? (p.receiver.external ? `${p.receiver.external.name}${p.receiver.external.organization ? `, ${p.receiver.external.organization}` : ""}` : p.destination.branch?.name)} />
              </KeyValue>
              <KeyValue label="To">{p.destination.location?.path ?? p.destination.branch?.name ?? p.destination.address}</KeyValue>
              <KeyValue label="Expected delivery">
                {p.expectedDeliveryAt ? stamp(p.expectedDeliveryAt) : "No deadline set"}
                {p.isOverdue && p.overdueSince && <span className="block text-xs font-semibold text-danger">Overdue since {stamp(p.overdueSince)}</span>}
              </KeyValue>
            </dl>
          </Card>

          <Card title="Courier">
            {!p.carrier ? (
              <p className="text-sm text-pending">No courier assigned yet.</p>
            ) : (
              <dl className="space-y-3">
                <KeyValue label={CARRIER_TYPE_LABEL[p.carrier.type as keyof typeof CARRIER_TYPE_LABEL]}>
                  {p.carrier.employee ? <PersonLine person={p.carrier.employee} /> : (
                    <>
                      {p.carrier.provider?.name ?? p.carrier.name}
                      {p.carrier.phone && <span className="block text-xs text-ink-muted">{p.carrier.phone}</span>}
                    </>
                  )}
                </KeyValue>
                {p.carrier.guest && (
                  <KeyValue label="Guest details">
                    {[p.carrier.guest.company, p.carrier.guest.vehicleNumber].filter(Boolean).join(" · ") || "—"}
                    <span className={cx("block text-xs", p.carrier.guest.phoneVerified ? "text-success" : "text-pending")}>{p.carrier.guest.phoneVerified ? "Phone verified by SMS code" : "Phone not yet verified"}</span>
                  </KeyValue>
                )}
                {p.carrier.externalTrackingNumber && <KeyValue label="Courier tracking">{p.carrier.externalTrackingNumber}</KeyValue>}
                {p.carrier.riderName && (
                  <KeyValue label="Rider">
                    {p.carrier.riderName} {p.carrier.riderPhone && <span className="text-xs text-ink-muted">· {p.carrier.riderPhone}</span>}
                  </KeyValue>
                )}
                {p.carrier.externalStatus && (
                  <KeyValue label="Courier says">
                    {p.carrier.externalStatus} <span className="text-xs text-ink-muted">· {when(p.carrier.externalStatusAt)}</span>
                  </KeyValue>
                )}
                <KeyValue label="Custody">{p.carrier.custodyStartedAt ? `Since ${stamp(p.carrier.custodyStartedAt)}` : p.carrier.acceptedAt ? "Accepted, awaiting handover" : "Assigned, not yet accepted"}</KeyValue>
                {p.carrier.trackingUrl && (
                  <a href={p.carrier.trackingUrl} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 text-sm font-semibold text-active hover:underline">
                    Track on courier site <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </dl>
            )}
          </Card>

          <Card title="Contents">
            {p.contentAccess === "FULL" ? <p className="whitespace-pre-line text-sm text-ink">{p.description}</p> : <p className="text-sm text-ink-muted">{p.description}</p>}
            <p className="mt-3 text-xs text-ink-subtle">Classification: {CLASSIFICATION_LABEL[p.classification as keyof typeof CLASSIFICATION_LABEL]}</p>
          </Card>

          <Card title="Attachments">
            {t && t.attachments.length === 0 && <p className="text-sm text-ink-muted">No attachments yet.</p>}
            <ul className="space-y-2">
              {t?.attachments.map((a) => (
                <li key={a.id}>
                  <button className="flex w-full items-center gap-3 rounded-xl border border-line px-3 py-2 text-left hover:bg-surface" onClick={() => openAttachment(a.id)}>
                    {a.mimeType.startsWith("image/") ? <ImageIcon className="h-4 w-4 text-navy-500" /> : <FileText className="h-4 w-4 text-navy-500" />}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-ink">{a.fileName}</span>
                      <span className="text-xs text-ink-muted">
                        {a.kind.replace(/_/g, " ").toLowerCase()} · {a.uploadedBy} · {when(a.createdAt)}
                      </span>
                    </span>
                    <ExternalLink className="h-3.5 w-3.5 text-ink-subtle" />
                  </button>
                </li>
              ))}
            </ul>
            {actions.includes("ATTACH") && (
              <div className="no-print mt-3 flex gap-2">
                <select className="input h-9 flex-1 text-xs" value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Attachment type">
                  <option value="SUPPORTING_DOCUMENT">Supporting document</option>
                  <option value="DISPATCH_CHALLAN">Dispatch challan</option>
                  <option value="COURIER_RECEIPT">Courier receipt</option>
                  <option value="PROOF_OF_DELIVERY">Proof of delivery</option>
                  <option value="COVER_PHOTO">Package photo</option>
                  <option value="OTHER">Other</option>
                </select>
                <input
                  ref={fileRef}
                  type="file"
                  className="hidden"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) attach.mutate(file);
                    e.target.value = "";
                  }}
                />
                <button className="btn-secondary h-9" onClick={() => fileRef.current?.click()} disabled={attach.isPending}>
                  {attach.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />} Attach
                </button>
              </div>
            )}
          </Card>
        </div>
      </div>

      {action && <ActionDialog action={action} parcel={p} events={t?.events ?? []} exceptionId={exceptionId} onClose={() => setAction(null)} />}
    </div>
  );
}
