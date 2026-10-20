import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Play, Plus } from "lucide-react";
import { BranchType, CARRIER_TYPE_LABEL, CLASSIFICATION_LABEL, Capability, LocationType, PRIORITY_LABEL, SlaAudience, SlaStage } from "@abg-dispatch/shared";
import { api } from "../lib/api";
import { useCan } from "../lib/auth";
import { minutes } from "../lib/format";
import { useBranches, useCategories, useProviders, type Branch, type Category, type Provider } from "../lib/lookups";
import { Card, ErrorNote, HealthBadge, PageHeader, Pill, Spinner, Tabs, Toggle } from "../components/ui";
import { EntityForm, type FieldDef } from "../components/EntityForm";
import { toast } from "../components/toast";

type Tab = "offices" | "locations" | "departments" | "categories" | "sla" | "couriers";
const words = (s: string) => s.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
const opts = (o: Record<string, string>) => Object.values(o).map((v) => ({ value: v, label: words(v) }));
const labelled = (o: Record<string, string>) => Object.entries(o).map(([value, label]) => ({ value, label }));

interface Location {
  id: string;
  branchId: string;
  parentId: string | null;
  type: string;
  name: string;
  code: string | null;
  path: string;
  active: boolean;
}
interface Department {
  id: string;
  branchId: string;
  name: string;
  code: string;
  active: boolean;
  branch: { name: string; code: string };
  location: { path: string } | null;
  _count: { employees: number };
}
interface SlaPolicy {
  id: string;
  name: string;
  stage: string;
  thresholdMinutes: number;
  audience: string[];
  marksOverdue: boolean;
  active: boolean;
  priority: string | null;
  classification: string | null;
  deliveryMethod: string | null;
  _count: { escalations: number };
}

function Table({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="border-b border-line bg-surface/70 text-xs text-ink-muted">
          <tr>
            {head.map((h, i) => (
              <th key={h + i} className="px-5 py-2.5 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
    </div>
  );
}

function EditButton({ onClick, show }: { onClick: () => void; show: boolean }) {
  if (!show) return null;
  return (
    <button className="rounded-lg p-1.5 text-ink-subtle hover:bg-surface hover:text-navy" onClick={onClick} aria-label="Edit">
      <Pencil className="h-4 w-4" />
    </button>
  );
}

export function ConfigPage() {
  const qc = useQueryClient();
  const canEdit = useCan(Capability.CONFIG_MANAGE);
  const canIntegrations = useCan(Capability.INTEGRATIONS_MANAGE);
  const [tab, setTab] = useState<Tab>("offices");
  const [editing, setEditing] = useState<{ kind: Tab; record: Record<string, unknown> } | null>(null);
  const [locBranch, setLocBranch] = useState("");

  const branches = useBranches();
  const categories = useCategories();
  const providers = useProviders();
  const locations = useQuery({ queryKey: ["admin", "locations", locBranch], queryFn: () => api.get<Location[]>(`/admin/locations${locBranch ? `?branchId=${locBranch}` : ""}`), enabled: tab === "locations" });
  const departments = useQuery({ queryKey: ["admin", "departments"], queryFn: () => api.get<Department[]>("/admin/departments"), enabled: tab === "departments" });
  const sla = useQuery({ queryKey: ["admin", "sla-policies"], queryFn: () => api.get<SlaPolicy[]>("/admin/sla-policies"), enabled: tab === "sla" });
  const branchOpts = (branches.data ?? []).map((b) => ({ value: b.id, label: b.name }));

  const toggle = useMutation({
    mutationFn: ({ path, body }: { path: string; body: Record<string, unknown> }) => api.patch(path, body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["admin"] }),
    onError: toast.error,
  });
  const runSla = useMutation({
    mutationFn: () => api.post<{ evaluated?: number; triggered?: number }>("/admin/sla/run"),
    onSuccess: (r) => toast.success(`SLA check complete${r?.triggered !== undefined ? ` — ${r.triggered} reminder(s) or escalation(s) sent` : ""}`),
    onError: toast.error,
  });

  const FORMS: Record<Tab, { title: string; fields: FieldDef[]; path: string; message: string }> = {
    offices: {
      title: "Office",
      path: "/admin/branches",
      message: "Office saved",
      fields: [
        { key: "name", label: "Name", required: true },
        { key: "code", label: "Code", required: true, lockedOnEdit: true, hint: "2–6 capitals, used in tracking IDs (e.g. HO, FCA)." },
        { key: "type", label: "Type", type: "select", required: true, options: opts(BranchType) },
        { key: "city", label: "City" },
        { key: "address", label: "Address", span: 2 },
        { key: "phone", label: "Phone" },
        { key: "active", label: "Active", type: "toggle" },
      ],
    },
    locations: {
      title: "Location",
      path: "/admin/locations",
      message: "Location saved",
      fields: [
        { key: "branchId", label: "Office", type: "select", required: true, options: branchOpts, lockedOnEdit: true },
        { key: "parentId", label: "Inside", type: "select", options: (locations.data ?? []).map((l) => ({ value: l.id, label: l.path })), lockedOnEdit: true },
        { key: "name", label: "Name", required: true },
        { key: "type", label: "Type", type: "select", required: true, options: opts(LocationType) },
        { key: "code", label: "Code" },
        { key: "active", label: "Active", type: "toggle" },
      ],
    },
    departments: {
      title: "Department",
      path: "/admin/departments",
      message: "Department saved",
      fields: [
        { key: "branchId", label: "Office", type: "select", required: true, options: branchOpts, lockedOnEdit: true },
        { key: "name", label: "Name", required: true },
        { key: "code", label: "Code", required: true, lockedOnEdit: true, placeholder: "FIN" },
        { key: "active", label: "Active", type: "toggle" },
      ],
    },
    categories: {
      title: "Category",
      path: "/admin/categories",
      message: "Category saved",
      fields: [
        { key: "name", label: "Name", required: true },
        { key: "code", label: "Code", required: true, lockedOnEdit: true, placeholder: "LEGAL_DOCUMENT" },
        { key: "description", label: "Description", type: "textarea" },
        { key: "sortOrder", label: "Sort order", type: "number" },
        { key: "active", label: "Active", type: "toggle" },
      ],
    },
    sla: {
      title: "SLA rule",
      path: "/admin/sla-policies",
      message: "SLA rule saved",
      fields: [
        { key: "name", label: "Name", required: true, span: 2 },
        { key: "stage", label: "Stage", type: "select", required: true, options: opts(SlaStage), hint: "Pickup: booked → picked up. Delivery: picked up → arrived. Receipt: arrived → received." },
        { key: "thresholdMinutes", label: "After (minutes)", type: "number", required: true },
        { key: "priority", label: "Only for priority", type: "select", options: labelled(PRIORITY_LABEL) },
        { key: "classification", label: "Only for classification", type: "select", options: labelled(CLASSIFICATION_LABEL) },
        { key: "deliveryMethod", label: "Only for carrier type", type: "select", options: labelled(CARRIER_TYPE_LABEL) },
        { key: "originBranchId", label: "Only from office", type: "select", options: branchOpts },
        { key: "audience", label: "Notify", type: "multi", required: true, options: opts(SlaAudience) },
        { key: "marksOverdue", label: "Marks the parcel overdue", type: "toggle" },
        { key: "active", label: "Active", type: "toggle" },
      ],
    },
    couriers: {
      title: "Courier company",
      path: "/admin/courier-providers",
      message: "Courier settings saved",
      fields: [
        { key: "name", label: "Name", required: true },
        { key: "trackingUrlTemplate", label: "Tracking link template", hint: "Use {tracking} where the tracking number goes.", span: 2 },
        { key: "enabled", label: "Available for booking", type: "toggle" },
        { key: "apiEnabled", label: "Status API polling", type: "toggle" },
        { key: "webhookEnabled", label: "Accept webhooks", type: "toggle" },
      ],
    },
  };

  const openNew = (kind: Tab, defaults: Record<string, unknown> = {}) => setEditing({ kind, record: { active: true, ...defaults } });
  const addButton = (kind: Tab, defaults?: Record<string, unknown>) =>
    canEdit && kind !== "couriers" ? (
      <button className="btn-primary h-9" onClick={() => openNew(kind, defaults)}>
        <Plus className="h-4 w-4" /> Add {kind === "sla" ? "SLA rule" : FORMS[kind].title.toLowerCase()}
      </button>
    ) : null;

  return (
    <div className="space-y-6">
      <PageHeader overline="Administration" title="Offices & rules" subtitle={canEdit ? "Every change is written to the audit log with before and after values." : "Read-only for your role. A super administrator can change these settings."} />
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { value: "offices", label: "Offices", count: branches.data?.length },
          { value: "locations", label: "Locations" },
          { value: "departments", label: "Departments" },
          { value: "categories", label: "Parcel categories", count: categories.data?.length },
          { value: "sla", label: "SLA & escalation" },
          { value: "couriers", label: "Courier companies", count: providers.data?.length },
        ]}
      />

      {tab === "offices" && (
        <Card title="Offices" action={addButton("offices", { type: "FACTORY" })} padded={false}>
          {!branches.data ? <Spinner /> : (
            <Table head={["Office", "Code", "Type", "City", "People", "Locations", "Active", ""]}>
              {branches.data.map((b: Branch) => (
                <tr key={b.id}>
                  <td className="px-5 py-3 font-medium text-ink">{b.name}</td>
                  <td className="mono px-5 py-3 text-navy-500">{b.code}</td>
                  <td className="px-5 py-3 text-ink-muted">{words(b.type)}</td>
                  <td className="px-5 py-3 text-ink-muted">{b.city ?? "—"}</td>
                  <td className="tabular px-5 py-3">{b._count?.employees}</td>
                  <td className="tabular px-5 py-3">{b._count?.locations}</td>
                  <td className="px-5 py-3">
                    <Toggle checked={b.active} disabled={!canEdit} label={`${b.name} active`} onChange={(active) => toggle.mutate({ path: `/admin/branches/${b.id}`, body: { active } })} />
                  </td>
                  <td className="px-5 py-3 text-right">
                    <EditButton show={canEdit} onClick={() => setEditing({ kind: "offices", record: { ...b } })} />
                  </td>
                </tr>
              ))}
            </Table>
          )}
        </Card>
      )}

      {tab === "locations" && (
        <Card
          title="Locations"
          action={
            <div className="flex gap-2">
              <select className="input h-9 w-56" value={locBranch} onChange={(e) => setLocBranch(e.target.value)} aria-label="Office">
                <option value="">All offices</option>
                {branchOpts.map((b) => (
                  <option key={b.value} value={b.value}>
                    {b.label}
                  </option>
                ))}
              </select>
              {addButton("locations", { type: "OFFICE", branchId: locBranch })}
            </div>
          }
          padded={false}
        >
          <ErrorNote error={locations.error} />
          {!locations.data ? <Spinner /> : (
            <Table head={["Location", "Type", "Code", "Active", ""]}>
              {locations.data.map((l) => (
                <tr key={l.id}>
                  <td className="px-5 py-2.5 text-ink">{l.path}</td>
                  <td className="px-5 py-2.5 text-ink-muted">{words(l.type)}</td>
                  <td className="mono px-5 py-2.5 text-ink-muted">{l.code ?? "—"}</td>
                  <td className="px-5 py-2.5">
                    <Toggle checked={l.active} disabled={!canEdit} label={`${l.name} active`} onChange={(active) => toggle.mutate({ path: `/admin/locations/${l.id}`, body: { active } })} />
                  </td>
                  <td className="px-5 py-2.5 text-right">
                    <EditButton show={canEdit} onClick={() => setEditing({ kind: "locations", record: { ...l } })} />
                  </td>
                </tr>
              ))}
            </Table>
          )}
        </Card>
      )}

      {tab === "departments" && (
        <Card title="Departments" action={addButton("departments")} padded={false}>
          {!departments.data ? <Spinner /> : (
            <Table head={["Department", "Code", "Office", "Location", "People", "Active", ""]}>
              {departments.data.map((d) => (
                <tr key={d.id}>
                  <td className="px-5 py-2.5 font-medium text-ink">{d.name}</td>
                  <td className="mono px-5 py-2.5 text-ink-muted">{d.code}</td>
                  <td className="px-5 py-2.5 text-ink-muted">{d.branch.name}</td>
                  <td className="px-5 py-2.5 text-ink-muted">{d.location?.path ?? "—"}</td>
                  <td className="tabular px-5 py-2.5">{d._count.employees}</td>
                  <td className="px-5 py-2.5">
                    <Toggle checked={d.active} disabled={!canEdit} label={`${d.name} active`} onChange={(active) => toggle.mutate({ path: `/admin/departments/${d.id}`, body: { active } })} />
                  </td>
                  <td className="px-5 py-2.5 text-right">
                    <EditButton show={canEdit} onClick={() => setEditing({ kind: "departments", record: { ...d } })} />
                  </td>
                </tr>
              ))}
            </Table>
          )}
        </Card>
      )}

      {tab === "categories" && (
        <Card title="Parcel categories" action={addButton("categories", { sortOrder: 50 })} padded={false}>
          {!categories.data ? <Spinner /> : (
            <Table head={["Category", "Code", "Description", "Parcels", "Active", ""]}>
              {categories.data.map((c: Category) => (
                <tr key={c.id}>
                  <td className="px-5 py-2.5 font-medium text-ink">{c.name}</td>
                  <td className="mono px-5 py-2.5 text-xs text-ink-muted">{c.code}</td>
                  <td className="max-w-[320px] truncate px-5 py-2.5 text-ink-muted">{c.description ?? "—"}</td>
                  <td className="tabular px-5 py-2.5">{c._count?.parcels}</td>
                  <td className="px-5 py-2.5">
                    <Toggle checked={c.active} disabled={!canEdit} label={`${c.name} active`} onChange={(active) => toggle.mutate({ path: `/admin/categories/${c.id}`, body: { active } })} />
                  </td>
                  <td className="px-5 py-2.5 text-right">
                    <EditButton show={canEdit} onClick={() => setEditing({ kind: "categories", record: { ...c } })} />
                  </td>
                </tr>
              ))}
            </Table>
          )}
        </Card>
      )}

      {tab === "sla" && (
        <Card
          title="SLA & escalation rules"
          action={
            <div className="flex gap-2">
              {canEdit && (
                <button className="btn-secondary h-9" onClick={() => runSla.mutate()} disabled={runSla.isPending}>
                  <Play className="h-4 w-4" /> Run check now
                </button>
              )}
              {addButton("sla", { stage: "RECEIPT", thresholdMinutes: 60, audience: ["RECEIVER"], marksOverdue: false })}
            </div>
          }
          padded={false}
        >
          {!sla.data ? <Spinner /> : (
            <Table head={["Rule", "Stage", "After", "Applies to", "Notifies", "Overdue", "Fired", "Active", ""]}>
              {sla.data.map((r) => (
                <tr key={r.id} className="align-top">
                  <td className="px-5 py-3 font-medium text-ink">{r.name}</td>
                  <td className="px-5 py-3 text-ink-muted">{words(r.stage)}</td>
                  <td className="tabular whitespace-nowrap px-5 py-3">{minutes(r.thresholdMinutes)}</td>
                  <td className="px-5 py-3 text-xs text-ink-muted">{[r.priority && PRIORITY_LABEL[r.priority as keyof typeof PRIORITY_LABEL], r.classification && CLASSIFICATION_LABEL[r.classification as keyof typeof CLASSIFICATION_LABEL], r.deliveryMethod && CARRIER_TYPE_LABEL[r.deliveryMethod as keyof typeof CARRIER_TYPE_LABEL]].filter(Boolean).join(" · ") || "All parcels"}</td>
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap gap-1">
                      {r.audience.map((a) => (
                        <Pill key={a}>{words(a)}</Pill>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-3">{r.marksOverdue ? <Pill tone="danger">Marks overdue</Pill> : <span className="text-xs text-ink-subtle">Reminder only</span>}</td>
                  <td className="tabular px-5 py-3">{r._count.escalations}</td>
                  <td className="px-5 py-3">
                    <Toggle checked={r.active} disabled={!canEdit} label={`${r.name} active`} onChange={(active) => toggle.mutate({ path: `/admin/sla-policies/${r.id}`, body: { active } })} />
                  </td>
                  <td className="px-5 py-3 text-right">
                    <EditButton show={canEdit} onClick={() => setEditing({ kind: "sla", record: { ...r } })} />
                  </td>
                </tr>
              ))}
            </Table>
          )}
        </Card>
      )}

      {tab === "couriers" && (
        <Card title="Courier companies" padded={false}>
          {!providers.data ? <Spinner /> : (
            <Table head={["Company", "Code", "Health", "Booking", "API", "Webhooks", ""]}>
              {providers.data.map((p: Provider) => (
                <tr key={p.id}>
                  <td className="px-5 py-3 font-medium text-ink">{p.name}</td>
                  <td className="mono px-5 py-3 text-xs text-ink-muted">{p.code}</td>
                  <td className="px-5 py-3">
                    <HealthBadge status={!p.enabled ? "DISABLED" : p.apiEnabled || p.webhookEnabled ? p.healthStatus : "MANUAL"} />
                  </td>
                  {(["enabled", "apiEnabled", "webhookEnabled"] as const).map((k) => (
                    <td key={k} className="px-5 py-3">
                      <Toggle checked={p[k]} disabled={!canIntegrations} label={`${p.name} ${k}`} onChange={(v) => toggle.mutate({ path: `/admin/courier-providers/${p.id}`, body: { [k]: v } })} />
                    </td>
                  ))}
                  <td className="px-5 py-3 text-right">
                    <EditButton show={canIntegrations} onClick={() => setEditing({ kind: "couriers", record: { ...p } })} />
                  </td>
                </tr>
              ))}
            </Table>
          )}
          <p className="border-t border-line px-5 py-3 text-xs text-ink-muted">API keys and webhook secrets are set as server environment variables, never here. A courier's “delivered” status still needs the receiver's confirmation.</p>
        </Card>
      )}

      {editing && (
        <EntityForm
          title={`${editing.record.id ? "Edit" : "New"} ${editing.kind === "sla" ? "SLA rule" : FORMS[editing.kind].title.toLowerCase()}`}
          fields={FORMS[editing.kind].fields}
          initial={editing.record}
          onClose={() => setEditing(null)}
          invalidate={[["admin"]]}
          successMessage={FORMS[editing.kind].message}
          save={(body) => (editing.record.id ? api.patch(`${FORMS[editing.kind].path}/${editing.record.id}`, body) : api.post(FORMS[editing.kind].path, body))}
        />
      )}
    </div>
  );
}
