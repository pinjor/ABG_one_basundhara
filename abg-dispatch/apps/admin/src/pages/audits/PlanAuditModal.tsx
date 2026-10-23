import { useCallback, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Send, UserCheck, X } from "lucide-react";
import { AUDIT_LIMITS, AUDIT_TYPE_LABEL, AuditType } from "@abg-dispatch/shared";
import { api, newKey } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { useOffices } from "../../lib/lookups";
import { dhakaDay } from "../../lib/format";
import { toast } from "../../components/toast";
import { ErrorNote, Field, Modal } from "../../components/ui";
import { PersonPicker, type PickedPerson } from "../../components/PersonPicker";
import type { Audit } from "./types";

const addDays = (d: string, n: number) => new Date(new Date(`${d}T00:00:00Z`).getTime() + n * 86_400_000).toISOString().slice(0, 10);

export function PlanAuditModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const profile = useAuth((s) => s.profile);
  const branches = useOffices();
  const today = dhakaDay();
  const [idemKey, setIdemKey] = useState(newKey);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<string>(AuditType.INTERNAL);
  const [branchId, setBranchId] = useState("");
  const [start, setStart] = useState(addDays(today, 7));
  const [end, setEnd] = useState(addDays(today, 7));
  const [externalBody, setExternalBody] = useState("");
  const [scope, setScope] = useState("");
  const [team, setTeam] = useState<string[]>([]);
  const [teamDraft, setTeamDraft] = useState("");
  const [lead, setLead] = useState<PickedPerson | null>(null);

  const reset = () => {
    setIdemKey(newKey());
    setTitle("");
    setType(AuditType.INTERNAL);
    setBranchId("");
    setStart(addDays(today, 7));
    setEnd(addDays(today, 7));
    setExternalBody("");
    setScope("");
    setTeam([]);
    setTeamDraft("");
    setLead(null);
  };
  const submit = useMutation({
    mutationFn: () =>
      api.post<Audit>(
        "/admin/audits",
        { title: title.trim(), type, branchId, plannedStart: start, plannedEnd: end < start ? start : end, externalBody: externalBody.trim() || undefined, scope: scope.trim() || undefined, team, leadUserId: lead?.userId ?? undefined },
        idemKey,
      ),
    onSuccess: (a) => {
      toast.success(`${a.referenceNumber} planned at ${a.branch.name}.`);
      void qc.invalidateQueries({ queryKey: ["audits"] });
      closeRef.current();
      navigate(`/audits/${a.id}`);
    },
  });
  const closeRef = useRef<() => void>(() => undefined);
  closeRef.current = () => {
    reset();
    submit.reset();
    onClose();
  };
  const close = useCallback(() => closeRef.current(), []);
  const addMember = () => {
    const name = teamDraft.replace(/\s+/g, " ").trim();
    if (name.length >= 2 && team.length < AUDIT_LIMITS.teamMax && !team.some((t) => t.toLowerCase() === name.toLowerCase())) setTeam([...team, name]);
    setTeamDraft("");
  };
  const ok = title.trim().length >= AUDIT_LIMITS.titleMin && !!branchId && !!start;

  return (
    <Modal
      open={open}
      onClose={close}
      title="Plan an audit"
      subtitle="The office's admins are told. Findings are recorded once the audit starts."
      width="max-w-2xl"
      footer={
        <>
          <button className="btn-ghost" onClick={close}>
            Cancel
          </button>
          <button className="btn-primary" disabled={submit.isPending || !ok} onClick={() => submit.mutate()}>
            {submit.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Plan audit
          </button>
        </>
      }
    >
      <Field label="Title">{(id) => <input id={id} className="input" maxLength={AUDIT_LIMITS.titleMax} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Buyer social-compliance audit — Factory B" />}</Field>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Type">
          {(id) => (
            <select id={id} className="input" value={type} onChange={(e) => setType(e.target.value)}>
              {Object.values(AuditType).map((t) => (
                <option key={t} value={t}>
                  {AUDIT_TYPE_LABEL[t]}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field label="Office audited">
          {(id) => (
            <select id={id} className="input" value={branchId} onChange={(e) => setBranchId(e.target.value)}>
              <option value="">Choose…</option>
              {(branches.data ?? []).map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field label="Fieldwork starts">{(id) => <input id={id} type="date" className="input" value={start} onChange={(e) => setStart(e.target.value)} />}</Field>
        <Field label="Fieldwork ends">{(id) => <input id={id} type="date" className="input" min={start} value={end} onChange={(e) => setEnd(e.target.value)} />}</Field>
      </div>
      <Field label="Outside body or firm (optional)" hint="e.g. Bureau Veritas, TÜV SÜD, Fire Service & Civil Defence, Department of Environment">
        {(id) => <input id={id} className="input" maxLength={AUDIT_LIMITS.bodyMax} value={externalBody} onChange={(e) => setExternalBody(e.target.value)} />}
      </Field>
      <Field label="Scope (optional)">{(id) => <textarea id={id} className="input min-h-[72px] py-2.5" maxLength={AUDIT_LIMITS.scopeMax} value={scope} onChange={(e) => setScope(e.target.value)} placeholder="What the audit covers" />}</Field>
      <div>
        <p className="label">Audit team (optional)</p>
        <div className="flex gap-2">
          <input className="input" value={teamDraft} onChange={(e) => setTeamDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addMember())} placeholder="Name, then Enter" aria-label="Auditor's name" />
          <button type="button" className="btn-secondary h-10 shrink-0" onClick={addMember} disabled={teamDraft.trim().length < 2}>
            <Plus className="h-4 w-4" /> Add
          </button>
        </div>
        {team.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-2">
            {team.map((t) => (
              <li key={t} className="inline-flex items-center gap-1.5 rounded-full bg-platinum-bright py-1 pl-3 pr-1 text-sm font-medium text-navy">
                {t}
                <button type="button" className="rounded-full p-1 hover:bg-white" onClick={() => setTeam(team.filter((x) => x !== t))} aria-label={`Remove ${t}`}>
                  <X className="h-3 w-3" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <PersonPicker label="Audit lead" value={lead} onChange={setLead} needsAccount allowMe optional icon={UserCheck} emptyText={`You (${profile?.displayName ?? "me"})`} />
      <ErrorNote error={submit.error} />
    </Modal>
  );
}
