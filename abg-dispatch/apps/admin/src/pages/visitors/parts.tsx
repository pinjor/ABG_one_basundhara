import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import QRCode from "qrcode";
import {
  Ban,
  Briefcase,
  CalendarClock,
  CircleHelp,
  ClipboardCheck,
  DoorOpen,
  GraduationCap,
  HardHat,
  HeartHandshake,
  Landmark,
  Loader2,
  LogOut,
  Search,
  TimerOff,
  Truck,
  UserRound,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  ID_LAST4_PATTERN,
  VISITOR_LIMITS,
  VISIT_PURPOSE_HINT,
  VISIT_PURPOSE_LABEL,
  VISIT_PURPOSE_ORDER,
  VISIT_STATUS_LABEL,
  VISIT_STATUS_TONE,
  VisitStatus,
  isBdMobile,
  normalizeBdMobile,
  type StatusTone,
  type VisitPurpose,
} from "@abg-dispatch/shared";
import { api, newKey, qs } from "../../lib/api";
import { dhakaDay } from "../../lib/format";
import { useAuth } from "../../lib/auth";
import { ErrorNote, Field, Modal, cx } from "../../components/ui";
import type { Visit, VisitSummary } from "./types";

// ── Vocabulary ──

const TONE_CLASS: Record<StatusTone, string> = {
  active: "bg-active-soft text-active ring-active/15",
  pending: "bg-pending-soft text-pending ring-pending/20",
  success: "bg-success-soft text-success ring-success/15",
  danger: "bg-danger-soft text-danger ring-danger/15",
  neutral: "bg-neutral-soft text-neutral ring-neutral/15",
};

export const VISIT_STATUS_ICON: Record<VisitStatus, LucideIcon> = {
  EXPECTED: CalendarClock,
  CHECKED_IN: DoorOpen,
  CHECKED_OUT: LogOut,
  CANCELLED: Ban,
  EXPIRED: TimerOff,
};

export const PURPOSE_ICON: Record<VisitPurpose, LucideIcon> = {
  MEETING: Briefcase,
  INTERVIEW: GraduationCap,
  VENDOR_SUPPLIER: HeartHandshake,
  CONTRACTOR: HardHat,
  AUDIT_INSPECTION: ClipboardCheck,
  GOVERNMENT_OFFICIAL: Landmark,
  DELIVERY: Truck,
  PERSONAL: UserRound,
  OTHER: CircleHelp,
};

export const purposeLabel = (p: string) => VISIT_PURPOSE_LABEL[p as VisitPurpose] ?? p;
export const statusLabel = (s: string) => VISIT_STATUS_LABEL[s as VisitStatus] ?? s;

/** Status is never colour alone: icon + the shared label. */
export function VisitStatusBadge({ status, size = "md" }: { status: string; size?: "sm" | "md" }) {
  const Icon = VISIT_STATUS_ICON[status as VisitStatus] ?? CircleHelp;
  return (
    <span className={cx("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full font-semibold ring-1 ring-inset", TONE_CLASS[VISIT_STATUS_TONE[status as VisitStatus] ?? "neutral"], size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs")}>
      <Icon className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} aria-hidden />
      {statusLabel(status)}
    </span>
  );
}

export function PurposeIcon({ purpose, className }: { purpose: string; className?: string }) {
  const Icon = PURPOSE_ICON[purpose as VisitPurpose] ?? CircleHelp;
  return <Icon className={className} aria-hidden />;
}

export function OverstayTag() {
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-md bg-pending-soft px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-pending">
      <TimerOff className="h-3 w-3" aria-hidden /> Past expected time
    </span>
  );
}

// ── Time (always Asia/Dhaka) ──

const tz = "Asia/Dhaka";
const timeFmt = new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit" });
const dateFmt = new Intl.DateTimeFormat("en-GB", { timeZone: tz, weekday: "short", day: "numeric", month: "short" });
const longDateFmt = new Intl.DateTimeFormat("en-GB", { timeZone: tz, weekday: "long", day: "numeric", month: "long", year: "numeric" });

export const timeOf = (iso: string) => timeFmt.format(new Date(iso));
export const dateOf = (iso: string) => dateFmt.format(new Date(iso));
export const longDateOf = (iso: string) => longDateFmt.format(new Date(iso));
export const isToday = (iso: string) => dhakaDay(new Date(iso)) === dhakaDay();

/** "2:30 PM – 4:30 PM", with the day when it is not today. */
export function windowLabel(from: string, until: string | null, withDay = !isToday(from)): string {
  const span = until ? `${timeOf(from)} – ${timeOf(until)}` : timeOf(from);
  return withDay ? `${dateOf(from)} · ${span}` : span;
}

export function stay(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined) return "—";
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  return minutes % 60 ? `${h} h ${minutes % 60} m` : `${h} h`;
}

/** "in 40 min", "15 min late". */
export function relativeTo(iso: string): string {
  const mins = Math.round((new Date(iso).getTime() - Date.now()) / 60_000);
  if (Math.abs(mins) < 2) return "now";
  return mins > 0 ? `in ${stay(mins)}` : `${stay(-mins)} late`;
}

export const initials = (name: string) =>
  name
    .replace(/^(Md\.|Engr\.|Dr\.|Station Officer|Inspector|SI)\s+/i, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");

// ── Data ──

/** The live board's counts — refreshed every 30 seconds. */
export const useVisitSummary = (branchId?: string, enabled = true) =>
  useQuery({
    queryKey: ["admin", "visitors", "summary", branchId ?? ""],
    queryFn: () => api.get<VisitSummary>(`/admin/visitors/summary${qs({ branchId })}`),
    refetchInterval: 30_000,
    enabled,
  });

export interface Office {
  id: string;
  name: string;
  code: string;
  city: string | null;
}

/** Offices from the directory; `mine` limits them to the offices this person covers at the gate. */
export function useOffices() {
  const profile = useAuth((s) => s.profile);
  const all = useQuery({ queryKey: ["directory", "branches"], queryFn: () => api.get<Office[]>("/directory/branches"), staleTime: 5 * 60_000 });
  const orgWide = !!profile?.roles.some((r) => r === "SUPER_ADMIN" || r === "HEAD_OFFICE_ADMIN" || r === "AUDITOR");
  const scoped = profile?.scopedBranchIds ?? [];
  const mine = useMemo(() => (all.data ?? []).filter((b) => orgWide || scoped.includes(b.id)), [all.data, orgWide, scoped]);
  return { all: all.data ?? [], mine, orgWide, homeBranchId: profile?.employee?.branch.id ?? null, loading: all.isLoading };
}

// ── The digital gate pass ──

export function useQrSvg(payload?: string | null) {
  const [svg, setSvg] = useState("");
  useEffect(() => {
    if (!payload) return setSvg("");
    let live = true;
    void QRCode.toString(payload, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#0C1727", light: "#FFFFFF" } }).then((s) => live && setSvg(s));
    return () => {
      live = false;
    };
  }, [payload]);
  return svg;
}

function PassRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-subtle">{label}</dt>
      <dd className="mt-0.5 break-words text-[13px] font-semibold leading-snug text-navy">{children}</dd>
    </div>
  );
}

/**
 * The pass as the visitor and the gate see it. The QR holds only an opaque
 * token link; the gate reads everything else from ABG ONE after scanning.
 */
export function GatePassCard({ visit }: { visit: Visit }) {
  const svg = useQrSvg(visit.pass?.payload);
  const closed = visit.status === VisitStatus.CANCELLED || visit.status === VisitStatus.EXPIRED || visit.status === VisitStatus.CHECKED_OUT;
  return (
    <article className="visitor-pass mx-auto w-full max-w-[400px] overflow-hidden rounded-[22px] border border-line bg-white shadow-raised" style={{ printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" }} aria-label={`Gate pass ${visit.passNumber}`}>
      <header className="flex items-center justify-between bg-hero px-5 py-4">
        <img src="/brand/abg-logo-light.png" alt="ABG" className="h-9" />
        <div className="text-right">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-platinum">Visitor gate pass</p>
          <p className="text-[11px] text-platinum-deep">{visit.branch.name}</p>
        </div>
      </header>
      <div className="relative px-6 pb-5 pt-6">
        {closed && (
          <div className="absolute inset-x-6 top-6 z-10 grid aspect-square place-items-center rounded-xl bg-white/80 backdrop-blur-[1px]">
            <span className="-rotate-12 rounded-lg border-2 border-neutral px-3 py-1 text-sm font-extrabold uppercase tracking-[0.2em] text-neutral">{statusLabel(visit.status)}</span>
          </div>
        )}
        <div className="mx-auto aspect-square w-full max-w-[236px] [&>svg]:h-full [&>svg]:w-full" role="img" aria-label={`QR code for pass ${visit.passNumber}`} dangerouslySetInnerHTML={{ __html: svg }} />
        <p className="mono mt-4 text-center text-[17px] tracking-[0.06em] text-navy">{visit.passNumber}</p>
        <p className="mt-0.5 text-center text-[11px] text-ink-subtle">Valid {isToday(visit.expectedAt) ? "today" : `on ${dateOf(visit.expectedAt)}`} only · show at the gate in and out</p>
        <div className="mt-5 border-t-2 border-navy pt-4">
          <p className="font-display text-[20px] font-extrabold leading-tight text-navy">{visit.visitorName}</p>
          {visit.company && <p className="text-sm text-ink-muted">{visit.company}</p>}
          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
            <PassRow label="Host">{visit.host.name}</PassRow>
            <PassRow label="Purpose">{purposeLabel(visit.purpose)}</PassRow>
            <PassRow label="Office · area">{visit.location ? visit.location.name : visit.branch.name}</PassRow>
            <PassRow label="Time">{windowLabel(visit.expectedAt, visit.expectedUntil, true)}</PassRow>
            <PassRow label="Party">{visit.partySize === 1 ? "1 person" : `${visit.partySize} people`}</PassRow>
            <PassRow label="Vehicle">{visit.vehicleNumber ?? "None"}</PassRow>
            {visit.carrying && (
              <div className="col-span-2">
                <PassRow label="Carrying">{visit.carrying}</PassRow>
              </div>
            )}
          </dl>
        </div>
      </div>
      <footer className="border-t border-line bg-surface/70 px-6 py-3 text-[10.5px] leading-snug text-ink-muted">Wear your badge while on site and return it at the gate. Issued by ABG ONE · Anvir Bashundhara Group.</footer>
    </article>
  );
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

/** Renders the pass as a 1000 × 1560 PNG the host can forward to the visitor (WhatsApp, email). */
export async function downloadPassPng(visit: Visit) {
  if (!visit.pass) return;
  await document.fonts?.ready;
  const W = 1000;
  const H = 1560;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const navy = "#0C1727";
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, W, H);

  // Header band on the brand field.
  const grad = ctx.createLinearGradient(0, 0, W, 220);
  grad.addColorStop(0, "#071225");
  grad.addColorStop(0.55, "#0B1A31");
  grad.addColorStop(1, "#142238");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, 220);
  const logo = await loadImage("/brand/abg-logo-light.png");
  if (logo) {
    const h = 96;
    ctx.drawImage(logo, 64, (220 - h) / 2, (logo.width / logo.height) * h, h);
  }
  ctx.textAlign = "right";
  ctx.fillStyle = "#CAD0D8";
  ctx.font = "700 26px Inter, system-ui, sans-serif";
  ctx.fillText("VISITOR GATE PASS", W - 64, 100);
  ctx.fillStyle = "#9AA4B2";
  ctx.font = "500 26px Inter, system-ui, sans-serif";
  ctx.fillText(visit.branch.name, W - 64, 142);

  // QR.
  const qr = document.createElement("canvas");
  await QRCode.toCanvas(qr, visit.pass.payload, { margin: 0, width: 520, errorCorrectionLevel: "M", color: { dark: navy, light: "#FFFFFF" } });
  ctx.drawImage(qr, (W - 520) / 2, 280);

  ctx.textAlign = "center";
  ctx.fillStyle = navy;
  ctx.font = "700 46px Inter, system-ui, sans-serif";
  ctx.fillText(visit.passNumber, W / 2, 875);
  ctx.fillStyle = "#5B6678";
  ctx.font = "500 24px Inter, system-ui, sans-serif";
  ctx.fillText(`Valid on ${longDateOf(visit.expectedAt)} only · show at the gate in and out`, W / 2, 918);

  ctx.fillStyle = navy;
  ctx.fillRect(64, 960, W - 128, 4);
  ctx.textAlign = "left";
  ctx.font = "800 50px Manrope, Inter, system-ui, sans-serif";
  ctx.fillText(visit.visitorName, 64, 1036);
  if (visit.company) {
    ctx.fillStyle = "#5B6678";
    ctx.font = "500 28px Inter, system-ui, sans-serif";
    ctx.fillText(visit.company, 64, 1080);
  }

  const rows: [string, string][] = [
    ["HOST", visit.host.name],
    ["PURPOSE", purposeLabel(visit.purpose)],
    ["OFFICE · AREA", visit.location?.name ?? visit.branch.name],
    ["TIME", windowLabel(visit.expectedAt, visit.expectedUntil, false)],
    ["PARTY", visit.partySize === 1 ? "1 person" : `${visit.partySize} people`],
    ["VEHICLE", visit.vehicleNumber ?? "None"],
  ];
  const colW = (W - 128 - 40) / 2;
  rows.forEach(([label, value], i) => {
    const x = 64 + (i % 2) * (colW + 40);
    const y = 1140 + Math.floor(i / 2) * 92;
    ctx.fillStyle = "#8A94A6";
    ctx.font = "700 20px Inter, system-ui, sans-serif";
    ctx.fillText(label, x, y);
    ctx.fillStyle = navy;
    ctx.font = "600 28px Inter, system-ui, sans-serif";
    ctx.fillText(wrap(ctx, value, colW)[0] ?? "", x, y + 38);
  });
  if (visit.carrying) {
    ctx.fillStyle = "#8A94A6";
    ctx.font = "700 20px Inter, system-ui, sans-serif";
    ctx.fillText("CARRYING", 64, 1416);
    ctx.fillStyle = navy;
    ctx.font = "600 28px Inter, system-ui, sans-serif";
    ctx.fillText(wrap(ctx, visit.carrying, W - 128)[0] ?? "", 64, 1454);
  }
  ctx.fillStyle = "#F7F9FC";
  ctx.fillRect(0, H - 70, W, 70);
  ctx.fillStyle = "#5B6678";
  ctx.font = "500 21px Inter, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Wear your badge while on site and return it at the gate · Issued by ABG ONE · Anvir Bashundhara Group", W / 2, H - 28);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${visit.passNumber}.png`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Prints only the pass: everything else on the page is hidden while printing. */
export function PrintPassStyles() {
  return (
    <style>{`@media print {
      @page { size: A5 portrait; margin: 10mm; }
      body * { visibility: hidden !important; }
      .visitor-pass, .visitor-pass * { visibility: visible !important; }
      .visitor-pass { position: absolute; left: 0; right: 0; top: 0; margin: 0 auto; box-shadow: none !important; }
    }`}</style>
  );
}

// ── Registering a visitor ──

interface DirectoryEmployee {
  id: string;
  employeeCode: string;
  fullName: string;
  designation: string | null;
  department: { name: string } | null;
  branch: { id: string; name: string; code: string };
  hasAccount: boolean;
}

function HostPicker({ value, onChange }: { value: DirectoryEmployee | null; onChange: (e: DirectoryEmployee | null) => void }) {
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);
  const results = useQuery({
    queryKey: ["directory", "employees", debounced],
    queryFn: () => api.get<DirectoryEmployee[]>(`/directory/employees${qs({ q: debounced })}`),
    enabled: debounced.length >= 2 && !value,
  });
  if (value) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-line bg-surface px-3 py-2.5">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-navy text-xs font-bold text-white">{initials(value.fullName)}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink">
            {value.fullName} <span className="mono text-[11px] text-ink-subtle">{value.employeeCode}</span>
          </p>
          <p className="truncate text-xs text-ink-muted">{[value.designation, value.department?.name, value.branch.name].filter(Boolean).join(" · ")}</p>
          {!value.hasAccount && <p className="mt-0.5 text-[11px] font-semibold text-pending">Not on ABG ONE — tell them in person; no notification is sent.</p>}
        </div>
        <button type="button" className="btn-ghost h-8 px-2 text-xs" onClick={() => onChange(null)}>
          Change
        </button>
      </div>
    );
  }
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-[20px] h-4 w-4 -translate-y-1/2 text-ink-subtle" aria-hidden />
      <input className="input pl-9" placeholder="Search name, employee ID or department…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search for the host" />
      {debounced.length >= 2 && (
        <ul className="mt-1.5 max-h-56 overflow-y-auto rounded-xl border border-line bg-white shadow-card" role="listbox">
          {results.isLoading ? (
            <li className="flex items-center gap-2 px-3 py-2.5 text-sm text-ink-muted">
              <Loader2 className="h-4 w-4 animate-spin" /> Searching…
            </li>
          ) : (results.data ?? []).length === 0 ? (
            <li className="px-3 py-2.5 text-sm text-ink-muted">Nobody matches “{debounced}”.</li>
          ) : (
            results.data!.map((e) => (
              <li key={e.id}>
                <button type="button" role="option" aria-selected={false} className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-surface focus-visible:bg-surface focus-visible:outline-none" onClick={() => onChange(e)}>
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-platinum-bright text-[11px] font-bold text-navy-500">{initials(e.fullName)}</span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-ink">{e.fullName}</span>
                    <span className="block truncate text-xs text-ink-muted">{[e.employeeCode, e.designation, e.branch.name].filter(Boolean).join(" · ")}</span>
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

const pad = (n: number) => String(n).padStart(2, "0");
/** Now in Dhaka as the parts of <input type="date|time">. */
function dhakaNowParts(offsetMinutes = 0) {
  const d = new Date(Date.now() + offsetMinutes * 60_000 + 6 * 3_600_000);
  return { date: `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`, time: `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}` };
}
const dhakaIso = (date: string, time: string) => new Date(`${date}T${time}:00+06:00`).toISOString();

/** A rounded time ~30 minutes ahead: a sensible default for "expected at". */
function defaultStart() {
  const d = new Date(Date.now() + 30 * 60_000);
  d.setUTCMinutes(Math.ceil(d.getUTCMinutes() / 15) * 15, 0, 0);
  return dhakaNowParts((d.getTime() - Date.now()) / 60_000);
}

/**
 * Pre-register (host = you, visitor gets an SMS) or register a walk-in at the
 * gate (checked in at once, host told). One idempotency key per opening, so
 * a double click never creates two passes.
 */
export function VisitFormModal({ mode, open, onClose, onCreated }: { mode: "invite" | "walkin"; open: boolean; onClose: () => void; onCreated: (v: Visit) => void }) {
  const offices = useOffices();
  const walkIn = mode === "walkin";
  const [idemKey, setIdemKey] = useState(newKey);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [purpose, setPurpose] = useState<string>("");
  const [detail, setDetail] = useState("");
  const [branchId, setBranchId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [date, setDate] = useState(defaultStart().date);
  const [time, setTime] = useState(defaultStart().time);
  const [until, setUntil] = useState("");
  const [party, setParty] = useState(1);
  const [vehicle, setVehicle] = useState("");
  const [carrying, setCarrying] = useState("");
  const [idLast4, setIdLast4] = useState("");
  const [notes, setNotes] = useState("");
  const [badge, setBadge] = useState("");
  const [host, setHost] = useState<DirectoryEmployee | null>(null);
  const [hostName, setHostName] = useState("");
  const [hostNotListed, setHostNotListed] = useState(false);
  const [touched, setTouched] = useState(false);

  const choices = walkIn ? offices.mine : offices.all;
  useEffect(() => {
    if (!open) return;
    const start = defaultStart();
    setIdemKey(newKey());
    setBranchId("");
    setName("");
    setPhone("");
    setCompany("");
    setPurpose("");
    setDetail("");
    setLocationId("");
    setDate(start.date);
    setTime(start.time);
    setUntil("");
    setParty(1);
    setVehicle("");
    setCarrying("");
    setIdLast4("");
    setNotes("");
    setBadge("");
    setHost(null);
    setHostName("");
    setHostNotListed(false);
    setTouched(false);
  }, [open]);
  useEffect(() => {
    if (!open || branchId) return;
    const home = choices.find((b) => b.id === offices.homeBranchId);
    if (home) setBranchId(home.id);
    else if (choices[0]) setBranchId(choices[0].id);
  }, [open, branchId, choices, offices.homeBranchId]);

  const locations = useQuery({
    queryKey: ["directory", "locations", branchId],
    queryFn: () => api.get<{ id: string; name: string; path: string; type: string }[]>(`/directory/locations${qs({ branchId })}`),
    enabled: open && !!branchId,
    staleTime: 5 * 60_000,
  });

  const problems: string[] = [];
  if (name.trim().length < VISITOR_LIMITS.nameMin) problems.push("Enter the visitor's name.");
  if (!isBdMobile(phone)) problems.push("Enter a Bangladeshi mobile number, e.g. 01711 223344.");
  if (!purpose) problems.push("Choose the purpose of the visit.");
  if (idLast4 && !ID_LAST4_PATTERN.test(idLast4)) problems.push("ID: only the last 4 digits or letters.");
  if (!walkIn) {
    const start = date && time ? new Date(`${date}T${time}:00+06:00`) : null;
    if (!start || Number.isNaN(start.getTime())) problems.push("Choose the date and time.");
    else if (start.getTime() < Date.now() - VISITOR_LIMITS.pastGraceMinutes * 60_000) problems.push("That time has already passed.");
    if (until && until <= time) problems.push("The visit must end after it starts.");
  } else {
    if (!host && !(hostNotListed && hostName.trim().length >= 2)) problems.push("Say who the visitor has come to see.");
    if (until && until <= dhakaNowParts().time) problems.push("The expected leaving time has already passed.");
  }

  const submit = useMutation({
    mutationFn: () => {
      const common = {
        visitorName: name.trim(),
        visitorPhone: normalizeBdMobile(phone),
        company: company.trim() || undefined,
        purpose,
        purposeDetail: detail.trim() || undefined,
        partySize: party,
        vehicleNumber: vehicle.trim() || undefined,
        carrying: carrying.trim() || undefined,
        idLast4: idLast4.trim() || undefined,
        branchId: branchId || undefined,
        locationId: locationId || undefined,
        notes: notes.trim() || undefined,
      };
      if (walkIn) {
        return api.post<Visit>(
          "/visitors/walk-in",
          {
            ...common,
            hostEmployeeId: host?.id,
            hostName: host ? undefined : hostName.trim(),
            badgeNumber: badge.trim() || undefined,
            expectedUntil: until ? dhakaIso(dhakaNowParts().date, until) : undefined,
          },
          idemKey,
        );
      }
      return api.post<Visit>("/visitors", { ...common, expectedAt: dhakaIso(date, time), expectedUntil: until ? dhakaIso(date, until) : undefined }, idemKey);
    },
    onSuccess: (v) => onCreated(v),
  });
  const send = () => {
    setTouched(true);
    if (!problems.length) submit.mutate();
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        submit.reset();
        onClose();
      }}
      width="max-w-2xl"
      title={walkIn ? "Register a walk-in" : "Pre-register a visitor"}
      subtitle={walkIn ? "For someone who arrived without a pass. They are checked in now and their host is told they are at the gate." : "You are the host. The visitor gets the pass number by SMS; you can share the QR pass from the visit page."}
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={send} disabled={submit.isPending}>
            {submit.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : walkIn ? <DoorOpen className="h-4 w-4" /> : <CalendarClock className="h-4 w-4" />}
            {walkIn ? "Register and check in" : "Create gate pass"}
          </button>
        </>
      }
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Visitor's name *">{(id) => <input id={id} className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={VISITOR_LIMITS.nameMax} placeholder="e.g. Rakibul Hasan" autoComplete="off" />}</Field>
          <Field label="Mobile number *" hint="The pass number is texted here.">
            {(id) => <input id={id} className="input" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01711 223344" autoComplete="off" />}
          </Field>
          <Field label="Company or organisation" className="sm:col-span-2">
            {(id) => <input id={id} className="input" value={company} onChange={(e) => setCompany(e.target.value)} maxLength={VISITOR_LIMITS.companyMax} placeholder="e.g. Akij Packaging Ltd, DIFE Narayanganj" />}
          </Field>
        </div>

        <fieldset>
          <legend className="label">Purpose *</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {VISIT_PURPOSE_ORDER.map((p) => (
              <button
                key={p}
                type="button"
                aria-pressed={purpose === p}
                onClick={() => setPurpose(p)}
                className={cx(
                  "flex min-h-[52px] items-center gap-2.5 rounded-xl border px-3 py-2 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-active",
                  purpose === p ? "border-navy bg-navy text-white shadow-card" : "border-line bg-white text-ink hover:border-line-strong hover:bg-surface",
                )}
              >
                <PurposeIcon purpose={p} className={cx("h-4 w-4 shrink-0", purpose === p ? "text-platinum" : "text-navy-500")} />
                <span className="min-w-0">
                  <span className="block text-[13px] font-semibold leading-tight">{VISIT_PURPOSE_LABEL[p]}</span>
                  <span className={cx("block truncate text-[11px]", purpose === p ? "text-platinum-deep" : "text-ink-subtle")}>{VISIT_PURPOSE_HINT[p]}</span>
                </span>
              </button>
            ))}
          </div>
        </fieldset>
        <Field label="What for (optional)">{(id) => <input id={id} className="input" value={detail} onChange={(e) => setDetail(e.target.value)} maxLength={VISITOR_LIMITS.purposeDetailMax} placeholder="e.g. Carton sample approval, boiler repair, QA Officer interview" />}</Field>

        {walkIn && (
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="label mb-0">Here to see *</span>
              <button type="button" className="text-xs font-semibold text-active hover:underline" onClick={() => (setHostNotListed(!hostNotListed), setHost(null))}>
                {hostNotListed ? "Search the directory" : "Not in the directory?"}
              </button>
            </div>
            {hostNotListed ? (
              <input className="input" value={hostName} onChange={(e) => setHostName(e.target.value)} placeholder="Name of the person or team being visited" aria-label="Host name" />
            ) : (
              <HostPicker value={host} onChange={setHost} />
            )}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Office">
            {(id) => (
              <select id={id} className="input" value={branchId} onChange={(e) => (setBranchId(e.target.value), setLocationId(""))} disabled={walkIn && choices.length <= 1}>
                {choices.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field label="Area (optional)">
            {(id) => (
              <select id={id} className="input" value={locationId} onChange={(e) => setLocationId(e.target.value)}>
                <option value="">Anywhere in the office</option>
                {(locations.data ?? [])
                  .filter((l) => l.type !== "SITE" && l.type !== "GATE")
                  .map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.path.split(" › ").slice(1).join(" › ") || l.name}
                    </option>
                  ))}
              </select>
            )}
          </Field>
        </div>

        {walkIn ? (
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Badge number">{(id) => <input id={id} className="input uppercase" value={badge} onChange={(e) => setBadge(e.target.value.replace(/[^A-Za-z0-9-]/g, "").slice(0, VISITOR_LIMITS.badgeMax))} placeholder="e.g. FCA-V15" />}</Field>
            <Field label="Expected to leave by">{(id) => <input id={id} type="time" className="input" value={until} onChange={(e) => setUntil(e.target.value)} />}</Field>
            <Field label="Party size">{(id) => <input id={id} type="number" min={1} max={VISITOR_LIMITS.maxPartySize} className="input" value={party} onChange={(e) => setParty(Math.min(VISITOR_LIMITS.maxPartySize, Math.max(1, Number(e.target.value) || 1)))} />}</Field>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-4">
            <Field label="Date *" className="sm:col-span-2">{(id) => <input id={id} type="date" className="input" value={date} min={dhakaNowParts().date} onChange={(e) => setDate(e.target.value)} />}</Field>
            <Field label="From *">{(id) => <input id={id} type="time" className="input" value={time} onChange={(e) => setTime(e.target.value)} />}</Field>
            <Field label="Until">{(id) => <input id={id} type="time" className="input" value={until} onChange={(e) => setUntil(e.target.value)} />}</Field>
            <Field label="Party size" className="sm:col-span-2">{(id) => <input id={id} type="number" min={1} max={VISITOR_LIMITS.maxPartySize} className="input" value={party} onChange={(e) => setParty(Math.min(VISITOR_LIMITS.maxPartySize, Math.max(1, Number(e.target.value) || 1)))} />}</Field>
            <Field label="ID — last 4 only" hint="Never the full NID number." className="sm:col-span-2">
              {(id) => <input id={id} className="input uppercase tracking-[0.3em]" value={idLast4} onChange={(e) => setIdLast4(e.target.value.replace(/[^A-Za-z0-9]/g, "").slice(0, 4))} placeholder="4417" inputMode="numeric" />}
            </Field>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Vehicle number">{(id) => <input id={id} className="input" value={vehicle} onChange={(e) => setVehicle(e.target.value)} maxLength={VISITOR_LIMITS.vehicleMax} placeholder="e.g. Dhaka Metro-Ga 25-7781" />}</Field>
          <Field label="Carrying">{(id) => <input id={id} className="input" value={carrying} onChange={(e) => setCarrying(e.target.value)} maxLength={VISITOR_LIMITS.carryingMax} placeholder="e.g. Laptop, tools, samples" />}</Field>
          {walkIn && (
            <Field label="ID — last 4 only" hint="Never the full NID number.">
              {(id) => <input id={id} className="input uppercase tracking-[0.3em]" value={idLast4} onChange={(e) => setIdLast4(e.target.value.replace(/[^A-Za-z0-9]/g, "").slice(0, 4))} placeholder="4417" />}
            </Field>
          )}
          <Field label="Note for the gate" className={walkIn ? undefined : "sm:col-span-2"}>
            {(id) => <input id={id} className="input" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={VISITOR_LIMITS.noteMax} placeholder="e.g. Escort to the Quality Lab" />}
          </Field>
        </div>
        <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
      </form>
      {touched && problems.length > 0 && (
        <div className="flex items-start gap-2 rounded-xl border border-pending/25 bg-pending-soft px-4 py-3 text-sm text-pending" role="alert">
          <X className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>{problems[0]}</span>
        </div>
      )}
      <ErrorNote error={submit.error} />
    </Modal>
  );
}
