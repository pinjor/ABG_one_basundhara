import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Globe, Loader2, MapPin, Plus, Search, Send, TriangleAlert, UserCheck, X } from "lucide-react";
import {
  PASSPORT_NUMBER_PATTERN,
  TOUR_LIMITS,
  TOUR_PURPOSE_LABEL,
  TRANSPORT_MODE_LABEL,
  TourType,
  TransportMode,
  formatTaka,
  passportNeedsRenewal,
  tourDurationDays,
} from "@abg-dispatch/shared";
import { api, newKey, qs } from "../../lib/api";
import { dhakaDay } from "../../lib/format";
import { toast } from "../../components/toast";
import { ErrorNote, Field, Modal, cx } from "../../components/ui";
import type { DirectoryPerson, MeWithManager, Tour } from "./types";

interface Approver {
  employeeId: string;
  name: string;
  designation: string | null;
}

const COUNTRIES = ["India", "China", "Singapore", "United Arab Emirates", "Saudi Arabia", "Qatar", "Malaysia", "Thailand", "Germany", "Italy", "Netherlands", "United Kingdom", "United States", "Japan", "South Korea", "Turkey"];

function addDays(day: string, n: number): string {
  return new Date(new Date(`${day}T00:00:00Z`).getTime() + n * 86_400_000).toISOString().slice(0, 10);
}

/** Whole Taka from a text box ("4,85,000" → 485000). */
function taka(raw: string): number | null {
  const digits = raw.replace(/[^\d]/g, "");
  return digits ? Number(digits) : null;
}

export function NewTourModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const today = dhakaDay();
  const me = useQuery({ queryKey: ["me"], queryFn: () => api.get<MeWithManager>("/auth/me"), enabled: open, staleTime: 60_000 });
  const manager = me.data?.employee?.manager ?? null;

  const [idemKey, setIdemKey] = useState(newKey);
  const [type, setType] = useState<string>(TourType.LOCAL);
  const [purpose, setPurpose] = useState("PLANT_VISIT");
  const [title, setTitle] = useState("");
  const [destination, setDestination] = useState("");
  const [country, setCountry] = useState("");
  const [startDate, setStartDate] = useState(addDays(today, 7));
  const [endDate, setEndDate] = useState(addDays(today, 9));
  const [transport, setTransport] = useState<string>(TransportMode.AIR);
  const [coTravellers, setCoTravellers] = useState<string[]>([]);
  const [coDraft, setCoDraft] = useState("");
  const [budget, setBudget] = useState("");
  const [advance, setAdvance] = useState("");
  const [passportNumber, setPassportNumber] = useState("");
  const [passportExpiry, setPassportExpiry] = useState("");
  const [description, setDescription] = useState("");
  const [approver, setApprover] = useState<Approver | null>(null);
  const [picking, setPicking] = useState(false);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const foreign = type === TourType.FOREIGN;

  // Default approver: the line manager, once the profile has loaded.
  useEffect(() => {
    if (open && !approver && manager?.userId) setApprover({ employeeId: manager.employeeId, name: manager.fullName, designation: manager.designation });
  }, [open, manager, approver]);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 250);
    return () => clearTimeout(t);
  }, [search]);
  useEffect(() => {
    if (foreign && transport === TransportMode.POOL_CAR) setTransport(TransportMode.AIR);
  }, [foreign, transport]);

  const people = useQuery({
    queryKey: ["directory", "employees", debounced],
    queryFn: () => api.get<DirectoryPerson[]>(`/directory/employees${qs({ q: debounced })}`),
    enabled: picking && debounced.length >= 2,
  });

  const reset = () => {
    setIdemKey(newKey());
    setType(TourType.LOCAL);
    setPurpose("PLANT_VISIT");
    setTitle("");
    setDestination("");
    setCountry("");
    setStartDate(addDays(today, 7));
    setEndDate(addDays(today, 9));
    setTransport(TransportMode.AIR);
    setCoTravellers([]);
    setCoDraft("");
    setBudget("");
    setAdvance("");
    setPassportNumber("");
    setPassportExpiry("");
    setDescription("");
    setApprover(null);
    setPicking(false);
    setSearch("");
  };
  // The modal refocuses its first field whenever onClose changes, so keep it stable.
  const closeRef = useRef<() => void>(() => undefined);
  closeRef.current = () => {
    reset();
    submit.reset();
    onClose();
  };
  const close = useCallback(() => closeRef.current(), []);

  const estimated = taka(budget);
  const advanceValue = taka(advance) ?? 0;
  const passportNo = passportNumber.replace(/\s+/g, "").toUpperCase();
  const passportExpired = foreign && !!passportExpiry && passportExpiry <= endDate;
  const passportWarning = foreign && !!passportExpiry && !passportExpired && passportNeedsRenewal(passportExpiry, endDate);
  const days = startDate && endDate && endDate >= startDate ? tourDurationDays(startDate, endDate) : null;

  const problems = useMemo(() => {
    const p: string[] = [];
    if (title.trim().length < TOUR_LIMITS.titleMin) p.push("Give the tour a short title.");
    if (destination.trim().length < 2) p.push("Say where you are going.");
    if (foreign && country.trim().length < 2) p.push("Give the destination country.");
    if (!startDate || startDate < today) p.push("The tour cannot start in the past.");
    if (endDate < startDate) p.push("The return date must be on or after the start date.");
    if (estimated === null) p.push("Enter the estimated budget in Taka.");
    if (estimated !== null && advanceValue > estimated) p.push("The advance cannot be more than the budget.");
    if (foreign && !PASSPORT_NUMBER_PATTERN.test(passportNo)) p.push("Enter the passport number as printed.");
    if (foreign && !passportExpiry) p.push("Enter the passport expiry date.");
    if (passportExpired) p.push("The passport expires before you return.");
    if (!approver) p.push("Choose who approves this tour.");
    return p;
  }, [title, destination, foreign, country, startDate, endDate, today, estimated, advanceValue, passportNo, passportExpiry, passportExpired, approver]);

  const submit = useMutation({
    mutationFn: () =>
      api.post<Tour>(
        "/tours",
        {
          type,
          purpose,
          title: title.trim(),
          description: description.trim() || undefined,
          destination: destination.trim(),
          country: foreign ? country.trim() : undefined,
          startDate,
          endDate,
          transportMode: transport,
          coTravellers,
          estimatedBudget: estimated ?? 0,
          advanceRequested: advanceValue,
          passportNumber: foreign ? passportNo : undefined,
          passportExpiry: foreign ? passportExpiry : undefined,
          approverEmployeeId: approver?.employeeId,
        },
        idemKey,
      ),
    onSuccess: (tour) => {
      toast.success(`${tour.referenceNumber} sent to ${tour.approver.name} for approval.`);
      void qc.invalidateQueries({ queryKey: ["tours"] });
      close();
      navigate(`/tours/${tour.id}`);
    },
  });

  const addCoTraveller = () => {
    const name = coDraft.replace(/\s+/g, " ").trim();
    if (name.length >= 2 && coTravellers.length < TOUR_LIMITS.maxCoTravellers && !coTravellers.some((c) => c.toLowerCase() === name.toLowerCase())) setCoTravellers([...coTravellers, name]);
    setCoDraft("");
  };

  return (
    <Modal
      open={open}
      onClose={close}
      width="max-w-2xl"
      title="New tour request"
      subtitle="Goes to your head of department first, then HR & Finance. Overseas tours also need the MD's or Chairman's sanction."
      footer={
        <>
          <button className="btn-ghost" onClick={close}>
            Cancel
          </button>
          <button className="btn-primary" disabled={submit.isPending || problems.length > 0} onClick={() => submit.mutate()} title={problems[0]}>
            {submit.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Submit request
          </button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-2 rounded-xl bg-surface p-1" role="radiogroup" aria-label="Tour type">
        {[
          { value: TourType.LOCAL, label: "Local", hint: "Within Bangladesh", Icon: MapPin },
          { value: TourType.FOREIGN, label: "Foreign", hint: "Needs MD / Chairman sanction", Icon: Globe },
        ].map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={type === o.value}
            onClick={() => setType(o.value)}
            className={cx("flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition", type === o.value ? "bg-navy text-white shadow-card" : "text-ink-muted hover:bg-white")}
          >
            <o.Icon className="h-5 w-5 shrink-0" aria-hidden />
            <span className="min-w-0">
              <span className="block text-sm font-bold">{o.label}</span>
              <span className={cx("block truncate text-[11px]", type === o.value ? "text-platinum" : "text-ink-subtle")}>{o.hint}</span>
            </span>
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Purpose">
          {(id) => (
            <select id={id} className="input" value={purpose} onChange={(e) => setPurpose(e.target.value)}>
              {Object.entries(TOUR_PURPOSE_LABEL).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field label="Title">{(id) => <input id={id} className="input" value={title} maxLength={TOUR_LIMITS.titleMax} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Compressor vendor audit" />}</Field>
        <Field label={foreign ? "City / site" : "Destination"}>
          {(id) => <input id={id} className="input" value={destination} maxLength={TOUR_LIMITS.destinationMax} onChange={(e) => setDestination(e.target.value)} placeholder={foreign ? "e.g. Frankfurt" : "e.g. Chattogram LPG refinery"} />}
        </Field>
        {foreign ? (
          <Field label="Country">
            {(id) => (
              <>
                <input id={id} className="input" list="tour-countries" value={country} maxLength={TOUR_LIMITS.countryMax} onChange={(e) => setCountry(e.target.value)} placeholder="e.g. Germany" />
                <datalist id="tour-countries">
                  {COUNTRIES.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </>
            )}
          </Field>
        ) : (
          <Field label="Transport">
            {(id) => (
              <select id={id} className="input" value={transport} onChange={(e) => setTransport(e.target.value)}>
                {Object.entries(TRANSPORT_MODE_LABEL).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            )}
          </Field>
        )}
        <Field label="Start date">
          {(id) => (
            <input
              id={id}
              type="date"
              className="input"
              min={today}
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                if (endDate < e.target.value) setEndDate(e.target.value);
              }}
            />
          )}
        </Field>
        <Field label="Return date" hint={days ? `${days} day${days === 1 ? "" : "s"} away` : undefined}>
          {(id) => <input id={id} type="date" className="input" min={startDate || today} value={endDate} onChange={(e) => setEndDate(e.target.value)} />}
        </Field>
        {foreign && (
          <Field label="Transport">
            {(id) => (
              <select id={id} className="input" value={transport} onChange={(e) => setTransport(e.target.value)}>
                {Object.entries(TRANSPORT_MODE_LABEL)
                  .filter(([v]) => v !== TransportMode.POOL_CAR)
                  .map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
              </select>
            )}
          </Field>
        )}
        <Field label="Estimated budget (৳)" hint={estimated ? formatTaka(estimated) : "Fares, hotel, per diem and local transport"}>
          {(id) => <input id={id} className="input tabular" inputMode="numeric" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="e.g. 485000" />}
        </Field>
        <Field label="Advance requested (৳)" hint={advanceValue ? formatTaka(advanceValue) : "Optional"}>
          {(id) => <input id={id} className="input tabular" inputMode="numeric" value={advance} onChange={(e) => setAdvance(e.target.value)} placeholder="0" />}
        </Field>
      </div>

      {foreign && (
        <div className="rounded-xl border border-line bg-surface/60 p-4">
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-ink-subtle">Passport</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Passport number">{(id) => <input id={id} className="input mono uppercase" value={passportNumber} maxLength={20} onChange={(e) => setPassportNumber(e.target.value)} placeholder="A01234567" autoComplete="off" />}</Field>
            <Field label="Expiry date">{(id) => <input id={id} type="date" className="input" value={passportExpiry} onChange={(e) => setPassportExpiry(e.target.value)} />}</Field>
          </div>
          {(passportWarning || passportExpired) && (
            <p className={cx("mt-3 flex items-start gap-2 rounded-lg px-3 py-2 text-sm", passportExpired ? "bg-danger-soft text-danger" : "bg-pending-soft text-pending")} role="alert">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              {passportExpired
                ? "This passport expires before you return. Renew it before applying."
                : `Most countries need ${TOUR_LIMITS.passportValidityMonths} months' validity after the return date. You can still apply, but start the renewal now.`}
            </p>
          )}
        </div>
      )}

      <Field label="Co-travellers" hint={`Colleagues on the same trip (up to ${TOUR_LIMITS.maxCoTravellers}). Press Enter to add.`}>
        {(id) => (
          <div>
            <div className="flex gap-2">
              <input
                id={id}
                className="input"
                value={coDraft}
                maxLength={TOUR_LIMITS.coTravellerNameMax}
                onChange={(e) => setCoDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCoTraveller();
                  }
                }}
                placeholder="Name"
              />
              <button type="button" className="btn-secondary shrink-0" onClick={addCoTraveller} disabled={coDraft.trim().length < 2} aria-label="Add co-traveller">
                <Plus className="h-4 w-4" />
              </button>
            </div>
            {coTravellers.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {coTravellers.map((c) => (
                  <span key={c} className="inline-flex items-center gap-1 rounded-full bg-platinum-bright py-1 pl-3 pr-1 text-xs font-semibold text-navy">
                    {c}
                    <button type="button" className="rounded-full p-0.5 hover:bg-white" onClick={() => setCoTravellers(coTravellers.filter((x) => x !== c))} aria-label={`Remove ${c}`}>
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </Field>

      <Field label="Details (optional)">
        {(id) => <textarea id={id} className="input min-h-[80px] py-2.5" maxLength={TOUR_LIMITS.descriptionMax} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Agenda, people you will meet, what the company gains" />}
      </Field>

      <div>
        <p className="label">Approver (head of department)</p>
        {!picking ? (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-line px-3 py-2.5">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-platinum-bright text-navy-500">
                <UserCheck className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                {approver ? (
                  <>
                    <p className="truncate text-sm font-semibold text-ink">{approver.name}</p>
                    <p className="truncate text-xs text-ink-muted">{approver.designation ?? "Approver"}</p>
                  </>
                ) : (
                  <p className="text-sm text-ink-muted">{me.isLoading ? "Loading your line manager…" : manager && !manager.userId ? `${manager.fullName} has no ABG ONE account — choose someone else.` : "No line manager on record — choose an approver."}</p>
                )}
              </div>
            </div>
            <button type="button" className="btn-ghost h-9 shrink-0 px-3 text-xs" onClick={() => setPicking(true)}>
              {approver ? "Change" : "Choose"}
            </button>
          </div>
        ) : (
          <div className="rounded-xl border border-line p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subtle" aria-hidden />
              <input className="input pl-9" autoFocus value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, ID or designation" aria-label="Search approver" />
            </div>
            <ul className="mt-2 max-h-56 overflow-y-auto">
              {debounced.length < 2 && <li className="px-3 py-2 text-xs text-ink-subtle">Type at least two letters.</li>}
              {people.isFetching && <li className="px-3 py-2 text-xs text-ink-subtle">Searching…</li>}
              {(people.data ?? [])
                .filter((p) => !p.isMe)
                .map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      disabled={!p.hasAccount}
                      onClick={() => {
                        setApprover({ employeeId: p.id, name: p.fullName, designation: p.designation });
                        setPicking(false);
                        setSearch("");
                      }}
                      className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-ink">{p.fullName}</span>
                        <span className="block truncate text-xs text-ink-muted">{[p.designation, p.department?.name, p.branch?.name].filter(Boolean).join(" · ")}</span>
                      </span>
                      {!p.hasAccount && <span className="shrink-0 text-[11px] text-ink-subtle">No account</span>}
                    </button>
                  </li>
                ))}
            </ul>
            <div className="mt-1 text-right">
              <button type="button" className="btn-ghost h-8 px-3 text-xs" onClick={() => setPicking(false)}>
                Done
              </button>
            </div>
          </div>
        )}
      </div>

      {problems.length > 0 && (title || destination || budget) && <p className="text-xs text-ink-subtle">To submit: {problems[0]}</p>}
      <ErrorNote error={submit.error} />
    </Modal>
  );
}
