/** Building blocks of the licence register: countdown badges, renewal bars, the document preview and the licence form. */
import { useEffect, useId, useState, type ReactNode } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  AlarmClock,
  Archive,
  CalendarCheck2,
  CalendarClock,
  CalendarX2,
  ExternalLink,
  FileText,
  Hourglass,
  Loader2,
  RefreshCw,
  type LucideIcon,
} from "lucide-react";
import {
  LICENCE_AUTHORITY_SUGGESTIONS,
  LICENCE_CATEGORY_LABEL,
  LICENCE_LIMITS,
  LICENCE_STATE_LABEL,
  LICENCE_STATE_TONE,
  RENEWAL_STAGES,
  RENEWAL_STAGE_LABEL,
  RenewalStage,
  licenceCountdownLabel,
  type LicenceCategory,
  type LicenceState,
  type StatusTone,
} from "@abg-dispatch/shared";
import { api, newKey, qs } from "../../lib/api";
import { ErrorNote, Field, Modal, Toggle, cx } from "../../components/ui";
import type { Licence, LicenceOffice, LicenceOwnerOption, LicenceSummary } from "./types";

// ── Formatting ──

const dateFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

/** "5 Nov 2026" for a calendar date (YYYY-MM-DD). */
export function fmtDate(day?: string | null): string {
  return day ? dateFmt.format(new Date(`${day}T00:00:00Z`)) : "—";
}

/** Taka with lakh grouping, as written in Bangladesh: Tk 2,50,000. */
export function fmtTaka(amount?: number | null): string {
  return amount === null || amount === undefined ? "—" : `Tk ${new Intl.NumberFormat("en-IN").format(amount)}`;
}

export function fmtSize(bytes?: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// ── Data ──

export const useLicenceOffices = () => useQuery({ queryKey: ["licences", "offices"], queryFn: () => api.get<LicenceOffice[]>("/licences/offices"), staleTime: 5 * 60_000 });

export const useLicenceSummary = (branchId?: string) =>
  useQuery({ queryKey: ["licences", "summary", branchId ?? ""], queryFn: () => api.get<LicenceSummary>(`/admin/licences/summary${qs({ branchId })}`), refetchInterval: 60_000 });

// ── Badges ──

const TONE_CLASS: Record<StatusTone, string> = {
  active: "bg-active-soft text-active ring-active/15",
  pending: "bg-pending-soft text-pending ring-pending/20",
  success: "bg-success-soft text-success ring-success/15",
  danger: "bg-danger-soft text-danger ring-danger/15",
  neutral: "bg-neutral-soft text-neutral ring-neutral/15",
};

export const STATE_ICON: Record<LicenceState, LucideIcon> = {
  VALID: CalendarCheck2,
  DUE_SOON: CalendarClock,
  EXPIRING: Hourglass,
  EXPIRED: CalendarX2,
};

function countdownLook(daysLeft: number, state: string, active = true): { tone: StatusTone; icon: LucideIcon; label: string } {
  if (!active) return { tone: "neutral", icon: Archive, label: "Retired" };
  if (state === "EXPIRED") return { tone: "danger", icon: CalendarX2, label: licenceCountdownLabel(daysLeft) };
  if (daysLeft === 0) return { tone: "danger", icon: AlarmClock, label: licenceCountdownLabel(0) };
  return { tone: LICENCE_STATE_TONE[state as LicenceState] ?? "neutral", icon: STATE_ICON[state as LicenceState] ?? CalendarClock, label: licenceCountdownLabel(daysLeft) };
}

/** "12 days left", "Expires today", "Expired 5 days ago": colour, icon and words together. */
export function CountdownBadge({ daysLeft, state, active = true, size = "md", solid = false }: { daysLeft: number; state: string; active?: boolean; size?: "sm" | "md"; solid?: boolean }) {
  const look = countdownLook(daysLeft, state, active);
  const stateLabel = LICENCE_STATE_LABEL[state as LicenceState] ?? state;
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full font-semibold ring-1 ring-inset",
        solid && look.tone === "danger" ? "bg-danger text-white ring-danger" : TONE_CLASS[look.tone],
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
      )}
      title={active ? `${stateLabel} · ${look.label}` : "Retired from the register"}
    >
      <look.icon className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} aria-hidden />
      <span className="tabular">{look.label}</span>
      {size === "md" && active && <span className="sr-only">({stateLabel})</span>}
    </span>
  );
}

export function StateBadge({ state, active = true }: { state: string; active?: boolean }) {
  const s = state as LicenceState;
  const Icon = active ? (STATE_ICON[s] ?? CalendarClock) : Archive;
  return (
    <span className={cx("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset", TONE_CLASS[active ? (LICENCE_STATE_TONE[s] ?? "neutral") : "neutral"])}>
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {active ? (LICENCE_STATE_LABEL[s] ?? state) : "Retired"}
    </span>
  );
}

/** Segmented bar: one segment per step after "Not started", filled up to the current stage. */
export function RenewalBar({ stage, progress, compact = false, onDark = false }: { stage: string; progress: number; compact?: boolean; onDark?: boolean }) {
  const steps = RENEWAL_STAGES.slice(1);
  const reached = RENEWAL_STAGES.indexOf(stage as RenewalStage);
  const label = RENEWAL_STAGE_LABEL[stage as RenewalStage] ?? stage;
  const started = reached > 0;
  return (
    <div className={compact ? "w-full min-w-[140px] max-w-[220px]" : "w-full"}>
      <div className="mb-1 flex items-center justify-between gap-2 text-[11.5px]">
        <span className={cx("inline-flex min-w-0 items-center gap-1 truncate font-semibold", onDark ? "text-platinum-bright" : started ? "text-active" : "text-ink-muted")}>
          {started && <RefreshCw className="h-3 w-3 shrink-0" aria-hidden />}
          <span className="truncate">{label}</span>
        </span>
        <span className={cx("tabular shrink-0", onDark ? "text-platinum-deep" : "text-ink-subtle")}>{progress}%</span>
      </div>
      <div className="flex gap-1" role="progressbar" aria-label={`Renewal: ${label}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} aria-valuetext={`${label}, ${progress}%`}>
        {steps.map((s, i) => (
          <span
            key={s}
            className={cx("h-1.5 flex-1 rounded-full", i < reached ? (onDark ? "bg-platinum" : "bg-active") : onDark ? "bg-white/15" : "bg-platinum-bright")}
            title={RENEWAL_STAGE_LABEL[s]}
          />
        ))}
      </div>
    </div>
  );
}

const RING_COLOUR: Record<StatusTone, string> = { success: "#3CCB8A", pending: "#F2B84B", danger: "#FF7070", active: "#7AA7FF", neutral: "#9AA4B2" };

/** The countdown hero: how much of the renewal window is left, with the days in the middle. */
export function CountdownRing({ licence }: { licence: Pick<Licence, "daysLeft" | "state" | "renewalLeadDays" | "active"> }) {
  const { daysLeft, state, renewalLeadDays, active } = licence;
  const tone: StatusTone = !active ? "neutral" : state === "EXPIRED" || daysLeft === 0 ? "danger" : (LICENCE_STATE_TONE[state as LicenceState] ?? "neutral");
  const r = 54;
  const c = 2 * Math.PI * r;
  const fraction = state === "EXPIRED" ? 1 : Math.max(0.02, Math.min(1, daysLeft / Math.max(renewalLeadDays, 30)));
  const big = daysLeft === 0 ? "Today" : String(Math.abs(daysLeft));
  const caption = !active ? "retired" : daysLeft === 0 ? "expiry day" : daysLeft < 0 ? (daysLeft === -1 ? "day overdue" : "days overdue") : daysLeft === 1 ? "day left" : "days left";
  return (
    <div className="relative grid h-[132px] w-[132px] shrink-0 place-items-center" role="img" aria-label={active ? licenceCountdownLabel(daysLeft) : "Retired"}>
      <svg viewBox="0 0 132 132" className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx="66" cy="66" r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="10" />
        <circle cx="66" cy="66" r={r} fill="none" stroke={RING_COLOUR[tone]} strokeWidth="10" strokeLinecap="round" strokeDasharray={`${c * fraction} ${c}`} />
      </svg>
      <div className="text-center">
        <p className={cx("tabular font-display font-extrabold leading-none text-white", big.length > 3 ? "text-[26px]" : "text-[34px]")}>{big}</p>
        <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-platinum-deep">{caption}</p>
      </div>
    </div>
  );
}

// ── Scanned copy ──

export function DocumentPreviewModal({ licence, open, onClose, actions }: { licence: Licence; open: boolean; onClose: () => void; actions?: ReactNode }) {
  const doc = licence.document;
  return (
    <Modal open={open && !!doc} onClose={onClose} title="Scanned copy" subtitle={`${licence.name} · ${licence.licenceNumber}`} width="max-w-5xl">
      {doc && (
        <>
          <div className="overflow-hidden rounded-xl border border-line bg-surface">
            {doc.isPdf ? (
              <iframe key={doc.url} src={doc.url} title={`Scanned copy of ${licence.name}`} className="block h-[68vh] min-h-[360px] w-full bg-white" />
            ) : (
              <div className="grid max-h-[70vh] place-items-center overflow-auto p-3">
                <img src={doc.url} alt={`Scanned copy of ${licence.name}, ${licence.licenceNumber}`} className="max-h-[66vh] max-w-full rounded-lg object-contain shadow-card" />
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="flex min-w-0 items-center gap-2 text-sm text-ink-muted">
              <FileText className="h-4 w-4 shrink-0 text-navy-500" aria-hidden />
              <span className="truncate font-medium text-ink">{doc.name}</span>
              <span className="shrink-0">· {fmtSize(doc.size)}</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {actions}
              <a className="btn-secondary h-9" href={doc.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" /> Open in new tab
              </a>
            </div>
          </div>
          <p className="text-xs text-ink-subtle">The preview link is private and lasts 10 minutes; reopen the licence to get a fresh one.</p>
        </>
      )}
    </Modal>
  );
}

// ── Add / edit ──

interface FormState {
  name: string;
  category: string;
  licenceNumber: string;
  issuingAuthority: string;
  branchId: string;
  ownerUserId: string;
  issuedAt: string;
  expiresAt: string;
  renewalLeadDays: string;
  renewalFee: string;
  notes: string;
  active: boolean;
}

const EMPTY: FormState = { name: "", category: "TRADE", licenceNumber: "", issuingAuthority: "", branchId: "", ownerUserId: "", issuedAt: "", expiresAt: "", renewalLeadDays: "90", renewalFee: "", notes: "", active: true };

function fromLicence(l: Licence): FormState {
  return {
    name: l.name,
    category: l.category,
    licenceNumber: l.licenceNumber,
    issuingAuthority: l.issuingAuthority,
    branchId: l.branch.id,
    ownerUserId: l.owner?.id ?? "",
    issuedAt: l.issuedAt ?? "",
    expiresAt: l.expiresAt,
    renewalLeadDays: String(l.renewalLeadDays),
    renewalFee: l.renewalFee === null ? "" : String(l.renewalFee),
    notes: l.notes ?? "",
    active: l.active,
  };
}

const ROLE_HINT: Record<string, string> = { COMPLIANCE_OFFICER: "Compliance", BRANCH_ADMIN: "Office admin", HEAD_OFFICE_ADMIN: "Head office", EXECUTIVE: "Leadership" };

/** Add a licence to the register, or edit one. Every change is kept in the licence's history. */
export function LicenceFormModal({ open, onClose, licence, onSaved }: { open: boolean; onClose: () => void; licence?: Licence; onSaved: (result: Licence | { id: string; movedOutOfScope: true }) => void }) {
  const editing = !!licence;
  const offices = useLicenceOffices();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [idemKey, setIdemKey] = useState(newKey);
  // Reset when the dialog opens — not when a background refetch hands over a fresh copy of the same licence.
  const licenceId = licence?.id;
  useEffect(() => {
    if (!open) return;
    setForm(licence ? fromLicence(licence) : EMPTY);
    setIdemKey(newKey());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, licenceId]);

  const owners = useQuery({
    queryKey: ["licences", "owners", form.branchId],
    queryFn: () => api.get<LicenceOwnerOption[]>(`/licences/owners${qs({ branchId: form.branchId })}`),
    enabled: open && !!form.branchId,
    staleTime: 60_000,
  });
  // An owner who cannot see the newly chosen office is cleared rather than silently refused.
  useEffect(() => {
    if (owners.data && form.ownerUserId && !owners.data.some((o) => o.id === form.ownerUserId)) setForm((f) => ({ ...f, ownerUserId: "" }));
  }, [owners.data, form.ownerUserId]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));
  const suggestions = LICENCE_AUTHORITY_SUGGESTIONS[form.category as LicenceCategory] ?? [];
  const listId = `authorities-${useId().replace(/:/g, "")}`;

  const save = useMutation({
    mutationFn: () => {
      const num = (v: string) => (v.trim() === "" ? null : Number(v.replace(/[,\s]/g, "")));
      if (editing) {
        return api.patch<Licence | { id: string; movedOutOfScope: true }>(`/licences/${licence!.id}`, {
          name: form.name,
          category: form.category,
          licenceNumber: form.licenceNumber,
          issuingAuthority: form.issuingAuthority,
          branchId: form.branchId,
          ownerUserId: form.ownerUserId || null,
          issuedAt: form.issuedAt || null,
          expiresAt: form.expiresAt,
          renewalLeadDays: num(form.renewalLeadDays) ?? 90,
          renewalFee: num(form.renewalFee),
          notes: form.notes.trim() || null,
          active: form.active,
        });
      }
      return api.post<Licence>(
        "/licences",
        {
          name: form.name,
          category: form.category,
          licenceNumber: form.licenceNumber,
          issuingAuthority: form.issuingAuthority,
          branchId: form.branchId,
          ownerUserId: form.ownerUserId || undefined,
          issuedAt: form.issuedAt || undefined,
          expiresAt: form.expiresAt,
          renewalLeadDays: num(form.renewalLeadDays) ?? undefined,
          renewalFee: num(form.renewalFee) ?? undefined,
          notes: form.notes.trim() || undefined,
        },
        idemKey,
      );
    },
    onSuccess: (result) => {
      save.reset();
      onSaved(result);
    },
  });
  const close = () => {
    save.reset();
    onClose();
  };
  const ready = form.name.trim().length >= 2 && form.licenceNumber.trim() && form.issuingAuthority.trim().length >= 2 && form.branchId && form.expiresAt;

  return (
    <Modal
      open={open}
      onClose={close}
      title={editing ? "Edit licence" : "Add licence"}
      subtitle={editing ? "Correct the details. Changing the expiry date restarts its alerts; to record a renewal use Mark renewed." : "Add a licence, permit or certificate the office must hold. Alerts start automatically as expiry nears."}
      width="max-w-2xl"
      footer={
        <>
          <button className="btn-ghost" onClick={close}>
            Cancel
          </button>
          <button className="btn-primary" disabled={!ready || save.isPending} onClick={() => save.mutate()}>
            {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />} {editing ? "Save changes" : "Add licence"}
          </button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Kind of licence">
          {(id) => (
            <select
              id={id}
              className="input"
              value={form.category}
              onChange={(e) => {
                const category = e.target.value;
                setForm((f) => ({
                  ...f,
                  category,
                  // Offer the usual name and authority when they are still blank or untouched.
                  name: !f.name || f.name === LICENCE_CATEGORY_LABEL[f.category as LicenceCategory] ? (category === "OTHER" ? f.name : LICENCE_CATEGORY_LABEL[category as LicenceCategory]) : f.name,
                  issuingAuthority: !f.issuingAuthority || (LICENCE_AUTHORITY_SUGGESTIONS[f.category as LicenceCategory] ?? []).includes(f.issuingAuthority) ? (LICENCE_AUTHORITY_SUGGESTIONS[category as LicenceCategory]?.length === 1 ? LICENCE_AUTHORITY_SUGGESTIONS[category as LicenceCategory][0] : "") : f.issuingAuthority,
                }));
              }}
            >
              {Object.entries(LICENCE_CATEGORY_LABEL).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field label="Name">{(id) => <input id={id} className="input" value={form.name} maxLength={LICENCE_LIMITS.nameMax} placeholder="e.g. Fire licence" onChange={(e) => set("name", e.target.value)} />}</Field>
        <Field label="Licence number" hint="Exactly as printed on the certificate.">
          {(id) => <input id={id} className="input mono" value={form.licenceNumber} maxLength={LICENCE_LIMITS.numberMax} placeholder="e.g. FSCD/GAZ/LIC/2020/2206" onChange={(e) => set("licenceNumber", e.target.value)} />}
        </Field>
        <Field label="Issuing authority">
          {(id) => (
            <>
              <input id={id} className="input" list={listId} value={form.issuingAuthority} maxLength={LICENCE_LIMITS.authorityMax} placeholder="e.g. Fire Service & Civil Defence" onChange={(e) => set("issuingAuthority", e.target.value)} />
              <datalist id={listId}>
                {suggestions.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </>
          )}
        </Field>
        <Field label="Office">
          {(id) => (
            <select id={id} className="input" value={form.branchId} onChange={(e) => set("branchId", e.target.value)}>
              <option value="">Choose an office…</option>
              {(offices.data ?? []).map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name} ({o.code})
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field label="Owner" hint="Responsible for keeping it valid; receives every alert.">
          {(id) => (
            <select id={id} className="input" value={form.ownerUserId} disabled={!form.branchId || owners.isLoading} onChange={(e) => set("ownerUserId", e.target.value)}>
              <option value="">{!form.branchId ? "Choose the office first" : owners.isLoading ? "Loading…" : "No owner yet"}</option>
              {(owners.data ?? []).map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                  {o.designation ? ` — ${o.designation}` : ""}
                  {o.roles.map((r) => ROLE_HINT[r]).filter(Boolean).length ? ` (${o.roles.map((r) => ROLE_HINT[r]).filter(Boolean).join(", ")})` : ""}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field label="Issued on (optional)">{(id) => <input id={id} type="date" className="input" value={form.issuedAt} onChange={(e) => set("issuedAt", e.target.value)} />}</Field>
        <Field label="Expires on">{(id) => <input id={id} type="date" className="input" value={form.expiresAt} onChange={(e) => set("expiresAt", e.target.value)} />}</Field>
        <Field label="Renewal window (days before expiry)" hint="The 90- and 60-day alerts wait until the window opens.">
          {(id) => <input id={id} type="number" inputMode="numeric" min={LICENCE_LIMITS.minLeadDays} max={LICENCE_LIMITS.maxLeadDays} className="input tabular" value={form.renewalLeadDays} onChange={(e) => set("renewalLeadDays", e.target.value)} />}
        </Field>
        <Field label="Renewal fee, Tk (optional)">
          {(id) => <input id={id} type="number" inputMode="numeric" min={0} className="input tabular" value={form.renewalFee} placeholder="e.g. 15000" onChange={(e) => set("renewalFee", e.target.value)} />}
        </Field>
        <Field label="Notes (optional)" className="sm:col-span-2">
          {(id) => <textarea id={id} className="input min-h-[72px] py-2.5" maxLength={LICENCE_LIMITS.noteMax} placeholder="Conditions, what the renewal needs, where the original is kept…" value={form.notes} onChange={(e) => set("notes", e.target.value)} />}
        </Field>
        {editing && (
          <div className="flex items-start justify-between gap-4 rounded-xl border border-line bg-surface/60 px-4 py-3 sm:col-span-2">
            <div>
              <p className="text-sm font-semibold text-ink">In use</p>
              <p className="text-xs text-ink-muted">Turn off when the office no longer needs this licence. It leaves the register and its alerts stop; the history is kept.</p>
            </div>
            <Toggle checked={form.active} onChange={(v) => set("active", v)} label="Licence in use" />
          </div>
        )}
      </div>
      <ErrorNote error={save.error} />
    </Modal>
  );
}
