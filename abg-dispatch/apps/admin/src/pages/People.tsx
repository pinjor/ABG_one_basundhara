import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Loader2, LogOut, Pencil, Plus, Search, ShieldCheck, ShieldOff, Upload, UserPlus, UserX } from "lucide-react";
import { Capability, EmployeeStatus, ROLE_LABEL, RoleCode } from "@abg-dispatch/shared";
import { api } from "../lib/api";
import { useAuth, useCan } from "../lib/auth";
import { ago } from "../lib/format";
import { useBranches } from "../lib/lookups";
import { Card, Empty, ErrorNote, Field, Modal, PageHeader, Pill, Spinner, Tabs } from "../components/ui";
import { EntityForm } from "../components/EntityForm";
import { toast } from "../components/toast";

interface Employee {
  id: string;
  employeeCode: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  designation: string | null;
  status: string;
  branchId: string;
  departmentId: string | null;
  department: { id: string; name: string } | null;
  branch: { id: string; name: string; code: string };
  user: { id: string; email: string | null; active: boolean; lastLoginAt: string | null; roles: { role: string; branchId: string | null }[] } | null;
}
interface UserRow {
  id: string;
  displayName: string;
  email: string | null;
  active: boolean;
  lastLoginAt: string | null;
  lockedUntil: string | null;
  mfaEnabled: boolean;
  activeSessions: number;
  roles: { role: string; branchId: string | null; branch: { id: string; name: string; code: string } | null }[];
  employee: { employeeCode: string; designation: string | null; branch: { name: string } | null; department: { name: string } | null; status: string } | null;
}
interface ImportResult {
  dryRun: boolean;
  rows: number;
  created: number;
  updated: number;
  valid: number;
  errors: { line: number; message: string }[];
}

const BRANCH_SCOPED: string[] = [RoleCode.DISPATCH_OFFICER, RoleCode.BRANCH_ADMIN];
const STATUS_TONE: Record<string, "success" | "pending" | "neutral" | "danger"> = { ACTIVE: "success", ON_LEAVE: "pending", INACTIVE: "neutral", TERMINATED: "danger" };
const words = (s: string) => s.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());

function RoleEditor({ value, onChange }: { value: { role: string; branchId?: string }[]; onChange: (v: { role: string; branchId?: string }[]) => void }) {
  const branches = useBranches();
  return (
    <div className="space-y-2">
      {value.map((r, i) => (
        <div key={i} className="flex gap-2">
          <select className="input" value={r.role} onChange={(e) => onChange(value.map((x, j) => (j === i ? { ...x, role: e.target.value } : x)))} aria-label="Role">
            {Object.values(RoleCode).map((role) => (
              <option key={role} value={role}>
                {ROLE_LABEL[role]}
              </option>
            ))}
          </select>
          {BRANCH_SCOPED.includes(r.role) ? (
            <select className="input" value={r.branchId ?? ""} onChange={(e) => onChange(value.map((x, j) => (j === i ? { ...x, branchId: e.target.value || undefined } : x)))} aria-label="Office scope">
              <option value="">Their own office</option>
              {branches.data?.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          ) : (
            <span className="input flex items-center text-ink-subtle">{r.role === RoleCode.HEAD_OFFICE_ADMIN || r.role === RoleCode.AUDITOR || r.role === RoleCode.SUPER_ADMIN ? "All offices" : "Own parcels"}</span>
          )}
          <button className="btn-ghost h-10 px-3 text-danger" onClick={() => onChange(value.filter((_, j) => j !== i))} aria-label="Remove role">
            ✕
          </button>
        </div>
      ))}
      <button className="btn-ghost h-9 px-2 text-sm" onClick={() => onChange([...value, { role: RoleCode.EMPLOYEE }])}>
        <Plus className="h-4 w-4" /> Add role
      </button>
    </div>
  );
}

export function PeoplePage() {
  const qc = useQueryClient();
  const me = useAuth((s) => s.profile)!;
  const canManage = useCan(Capability.USERS_MANAGE);
  const branches = useBranches();
  const [tab, setTab] = useState<"employees" | "users">("employees");
  const [q, setQ] = useState("");
  const [branchId, setBranchId] = useState("");
  const [editEmployee, setEditEmployee] = useState<Partial<Employee> | null>(null);
  const [accountFor, setAccountFor] = useState<Employee | null>(null);
  const [rolesFor, setRolesFor] = useState<UserRow | null>(null);
  const [resetFor, setResetFor] = useState<UserRow | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [form, setForm] = useState<{ email: string; password: string; roles: { role: string; branchId?: string }[] }>({ email: "", password: "", roles: [{ role: RoleCode.EMPLOYEE }] });
  const [csv, setCsv] = useState("");
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const employees = useQuery({ queryKey: ["admin", "employees", q, branchId], queryFn: () => api.get<Employee[]>(`/admin/employees?${new URLSearchParams({ ...(q ? { q } : {}), ...(branchId ? { branchId } : {}) })}`), enabled: tab === "employees" });
  const users = useQuery({ queryKey: ["admin", "users", q], queryFn: () => api.get<UserRow[]>(`/admin/users${q ? `?q=${encodeURIComponent(q)}` : ""}`), enabled: tab === "users" && canManage });
  const departments = useQuery({ queryKey: ["admin", "departments"], queryFn: () => api.get<{ id: string; name: string; branchId: string; branch: { code: string } }[]>("/admin/departments") });

  const done = (msg: string) => {
    toast.success(msg);
    void qc.invalidateQueries({ queryKey: ["admin"] });
  };
  const createUser = useMutation({
    mutationFn: () => api.post("/admin/users", { employeeId: accountFor!.id, email: form.email, password: form.password, roles: form.roles }),
    onSuccess: () => (done(`Account created for ${accountFor!.fullName}`), setAccountFor(null)),
  });
  const saveRoles = useMutation({
    mutationFn: () => api.put(`/admin/users/${rolesFor!.id}/roles`, { roles: form.roles }),
    onSuccess: () => (done(`Roles updated for ${rolesFor!.displayName}. They get the new access on their next request.`), setRolesFor(null)),
  });
  const reset = useMutation({
    mutationFn: () => api.post(`/admin/users/${resetFor!.id}/reset-password`, { password: form.password }),
    onSuccess: () => (done(`Password reset for ${resetFor!.displayName}; their sessions were signed out`), setResetFor(null)),
  });
  const userAction = useMutation({
    mutationFn: ({ id, op }: { id: string; op: "deactivate" | "activate" | "revoke-sessions" }) => api.post(`/admin/users/${id}/${op}`),
    onSuccess: (_r, v) => done(v.op === "revoke-sessions" ? "All sessions signed out" : v.op === "deactivate" ? "Account deactivated and signed out everywhere" : "Account re-activated"),
    onError: toast.error,
  });
  const runImport = useMutation({
    mutationFn: (dryRun: boolean) => api.post<ImportResult>("/admin/employees/import", { csv, dryRun }),
    onSuccess: (r) => {
      setImportResult(r);
      if (!r.dryRun) done(`Imported: ${r.created} added, ${r.updated} updated`);
    },
  });

  const branchOpts = (branches.data ?? []).map((b) => ({ value: b.id, label: b.name }));
  const deptOpts = (departments.data ?? []).map((d) => ({ value: d.id, label: `${d.name} · ${d.branch.code}` }));

  return (
    <div className="space-y-6">
      <PageHeader
        overline="Administration"
        title="People & access"
        subtitle="The employee directory from HR, and who can sign in with which role. Deactivating someone signs them out everywhere."
        actions={
          canManage && tab === "employees" ? (
            <>
              <button className="btn-secondary" onClick={() => (setImportOpen(true), setImportResult(null))}>
                <Upload className="h-4 w-4" /> Import CSV
              </button>
              <button className="btn-primary" onClick={() => setEditEmployee({ status: "ACTIVE" })}>
                <UserPlus className="h-4 w-4" /> Add employee
              </button>
            </>
          ) : null
        }
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
            { value: "employees", label: "Employees" },
            ...(canManage ? [{ value: "users" as const, label: "Accounts & roles" }] : []),
          ]}
        />
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          <div className="relative w-full sm:w-auto">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subtle" />
            <input className="input w-full pl-9 sm:w-72" placeholder="Name, employee ID, phone or email" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search people" />
          </div>
          {tab === "employees" && (
            <select className="input w-full sm:w-52" value={branchId} onChange={(e) => setBranchId(e.target.value)} aria-label="Office">
              <option value="">All offices</option>
              {branchOpts.map((b) => (
                <option key={b.value} value={b.value}>
                  {b.label}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {tab === "employees" && (
        <Card padded={false}>
          <ErrorNote error={employees.error} />
          {!employees.data ? <Spinner /> : employees.data.length === 0 ? <Empty title="No employees match" /> : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="border-b border-line bg-surface/70 text-xs text-ink-muted">
                  <tr>
                    <th className="px-5 py-2.5 font-semibold">Employee</th>
                    <th className="px-5 py-2.5 font-semibold">Department · office</th>
                    <th className="px-5 py-2.5 font-semibold">Phone</th>
                    <th className="px-5 py-2.5 font-semibold">Status</th>
                    <th className="px-5 py-2.5 font-semibold">Account</th>
                    <th className="px-5 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {employees.data.map((e) => (
                    <tr key={e.id}>
                      <td className="px-5 py-3">
                        <p className="font-medium text-ink">
                          {e.fullName} <span className="mono text-xs text-ink-muted">{e.employeeCode}</span>
                        </p>
                        <p className="text-xs text-ink-muted">{e.designation ?? "—"}</p>
                      </td>
                      <td className="px-5 py-3 text-ink-muted">
                        {e.department?.name ?? "—"} · {e.branch.name}
                      </td>
                      <td className="tabular px-5 py-3 text-ink-muted">{e.phone ?? "—"}</td>
                      <td className="px-5 py-3">
                        <Pill tone={STATUS_TONE[e.status] ?? "neutral"}>{words(e.status)}</Pill>
                      </td>
                      <td className="px-5 py-3">
                        {e.user ? (
                          <div className="flex flex-wrap gap-1">
                            {e.user.roles.map((r, i) => (
                              <Pill key={i} tone="active">
                                {ROLE_LABEL[r.role as RoleCode] ?? r.role}
                              </Pill>
                            ))}
                            {!e.user.active && <Pill tone="danger">Deactivated</Pill>}
                          </div>
                        ) : canManage && e.status === "ACTIVE" ? (
                          <button className="text-xs font-semibold text-active hover:underline" onClick={() => (setAccountFor(e), setForm({ email: e.email ?? "", password: "", roles: [{ role: RoleCode.EMPLOYEE }] }))}>
                            Create account
                          </button>
                        ) : (
                          <span className="text-xs text-ink-subtle">No account</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right">
                        {canManage && (
                          <button className="rounded-lg p-1.5 text-ink-subtle hover:bg-surface hover:text-navy" onClick={() => setEditEmployee(e)} aria-label={`Edit ${e.fullName}`}>
                            <Pencil className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {tab === "users" && (
        <Card padded={false}>
          <ErrorNote error={users.error} />
          {!users.data ? <Spinner /> : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="border-b border-line bg-surface/70 text-xs text-ink-muted">
                  <tr>
                    <th className="px-5 py-2.5 font-semibold">Account</th>
                    <th className="px-5 py-2.5 font-semibold">Roles</th>
                    <th className="px-5 py-2.5 font-semibold">Security</th>
                    <th className="px-5 py-2.5 font-semibold">Last sign-in</th>
                    <th className="px-5 py-2.5 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {users.data.map((u) => (
                    <tr key={u.id} className={u.active ? undefined : "bg-surface/60"}>
                      <td className="px-5 py-3">
                        <p className="font-medium text-ink">
                          {u.displayName} {u.employee && <span className="mono text-xs text-ink-muted">{u.employee.employeeCode}</span>}
                        </p>
                        <p className="text-xs text-ink-muted">{u.email}</p>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex flex-wrap gap-1">
                          {u.roles.map((r, i) => (
                            <Pill key={i} tone={r.role === RoleCode.SUPER_ADMIN ? "danger" : r.role === RoleCode.EMPLOYEE ? "neutral" : "active"}>
                              {ROLE_LABEL[r.role as RoleCode] ?? r.role}
                              {r.branch ? ` · ${r.branch.code}` : ""}
                            </Pill>
                          ))}
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {u.mfaEnabled ? (
                            <Pill tone="success">
                              <ShieldCheck className="h-3 w-3" /> 2FA on
                            </Pill>
                          ) : (
                            <Pill>
                              <ShieldOff className="h-3 w-3" /> 2FA off
                            </Pill>
                          )}
                          {!u.active && <Pill tone="danger">Deactivated</Pill>}
                          {u.lockedUntil && new Date(u.lockedUntil) > new Date() && <Pill tone="pending">Locked</Pill>}
                          <span className="text-xs text-ink-subtle">
                            {u.activeSessions} session{u.activeSessions === 1 ? "" : "s"}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-xs text-ink-muted">{u.lastLoginAt ? ago(u.lastLoginAt) : "Never"}</td>
                      <td className="px-5 py-3">
                        <div className="flex justify-end gap-1">
                          <button className="btn-ghost h-8 px-2 text-xs" onClick={() => (setRolesFor(u), setForm({ email: "", password: "", roles: u.roles.map((r) => ({ role: r.role, branchId: r.branchId ?? undefined })) }))}>
                            Roles
                          </button>
                          <button className="btn-ghost h-8 px-2 text-xs" onClick={() => (setResetFor(u), setForm((f) => ({ ...f, password: "" })))} title="Reset password">
                            <KeyRound className="h-3.5 w-3.5" />
                          </button>
                          <button className="btn-ghost h-8 px-2 text-xs" disabled={!u.activeSessions} onClick={() => userAction.mutate({ id: u.id, op: "revoke-sessions" })} title="Sign out everywhere">
                            <LogOut className="h-3.5 w-3.5" />
                          </button>
                          {u.id !== me.id && (
                            <button className={`btn-ghost h-8 px-2 text-xs ${u.active ? "text-danger" : "text-success"}`} onClick={() => userAction.mutate({ id: u.id, op: u.active ? "deactivate" : "activate" })} title={u.active ? "Deactivate" : "Activate"}>
                              <UserX className="h-3.5 w-3.5" /> {u.active ? "Deactivate" : "Activate"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {editEmployee && (
        <EntityForm
          title={editEmployee.id ? `Edit ${editEmployee.fullName}` : "Add employee"}
          initial={editEmployee as Record<string, unknown>}
          onClose={() => setEditEmployee(null)}
          invalidate={[["admin", "employees"]]}
          successMessage="Employee saved"
          fields={[
            { key: "employeeCode", label: "Employee ID", required: true, lockedOnEdit: true, placeholder: "ABG-2041" },
            { key: "fullName", label: "Full name", required: true },
            { key: "designation", label: "Designation" },
            { key: "phone", label: "Mobile" },
            { key: "email", label: "Email" },
            { key: "branchId", label: "Office", type: "select", required: true, options: branchOpts },
            { key: "departmentId", label: "Department", type: "select", options: deptOpts },
            { key: "status", label: "Status", type: "select", required: true, options: Object.values(EmployeeStatus).map((s) => ({ value: s, label: words(s) })), hint: "Inactive or terminated employees are signed out and cannot sign in." },
          ]}
          save={(body) => (editEmployee.id ? api.patch(`/admin/employees/${editEmployee.id}`, body) : api.post("/admin/employees", body))}
        />
      )}

      <Modal
        open={!!accountFor}
        onClose={() => setAccountFor(null)}
        title={`Create account for ${accountFor?.fullName ?? ""}`}
        subtitle="They sign in with this email or their employee ID."
        footer={
          <button className="btn-primary" disabled={!form.email || form.password.length < 10 || !form.roles.length || createUser.isPending} onClick={() => createUser.mutate()}>
            {createUser.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Create account
          </button>
        }
      >
        <Field label="Email">{(id) => <input id={id} className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />}</Field>
        <Field label="Temporary password" hint="At least 10 characters. Share it privately.">{(id) => <input id={id} className="input" type="text" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />}</Field>
        <div>
          <p className="label">Roles</p>
          <RoleEditor value={form.roles} onChange={(roles) => setForm({ ...form, roles })} />
        </div>
        <ErrorNote error={createUser.error} />
      </Modal>

      <Modal
        open={!!rolesFor}
        onClose={() => setRolesFor(null)}
        title={`Roles — ${rolesFor?.displayName ?? ""}`}
        subtitle="Dispatch officers and branch admins only see parcels for their office."
        footer={
          <button className="btn-primary" disabled={!form.roles.length || saveRoles.isPending} onClick={() => saveRoles.mutate()}>
            Save roles
          </button>
        }
      >
        <RoleEditor value={form.roles} onChange={(roles) => setForm({ ...form, roles })} />
        <ErrorNote error={saveRoles.error} />
      </Modal>

      <Modal
        open={!!resetFor}
        onClose={() => setResetFor(null)}
        title={`Reset password — ${resetFor?.displayName ?? ""}`}
        subtitle="Their current sessions are signed out."
        footer={
          <button className="btn-danger" disabled={form.password.length < 10 || reset.isPending} onClick={() => reset.mutate()}>
            Reset password
          </button>
        }
      >
        <Field label="New temporary password" hint="At least 10 characters.">{(id) => <input id={id} className="input" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />}</Field>
        <ErrorNote error={reset.error} />
      </Modal>

      <Modal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        width="max-w-2xl"
        title="Import employees from HR"
        subtitle="Columns: employee_id, full_name, phone, email, department_code, designation, branch_code, status, manager_employee_id. Existing employee IDs are updated."
        footer={
          <>
            <button className="btn-secondary" disabled={csv.length < 10 || runImport.isPending} onClick={() => runImport.mutate(true)}>
              Check file (dry run)
            </button>
            <button className="btn-primary" disabled={!importResult?.dryRun || importResult.errors.length > 0 || runImport.isPending} onClick={() => runImport.mutate(false)}>
              {runImport.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Import {importResult?.valid ?? ""} employees
            </button>
          </>
        }
      >
        <input
          type="file"
          accept=".csv,text/csv"
          className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-navy file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (f) (setCsv(await f.text()), setImportResult(null));
          }}
        />
        <textarea className="input mono h-40 py-2 text-xs font-normal" placeholder="…or paste CSV here" value={csv} onChange={(e) => (setCsv(e.target.value), setImportResult(null))} />
        {importResult && (
          <div className={`rounded-xl border p-3 text-sm ${importResult.errors.length ? "border-danger/25 bg-danger-soft/50" : "border-success/25 bg-success-soft/60"}`}>
            <p className="font-semibold text-ink">
              {importResult.dryRun ? "Dry run" : "Imported"}: {importResult.rows} rows · {importResult.valid} valid
              {!importResult.dryRun && ` · ${importResult.created} added · ${importResult.updated} updated`}
            </p>
            {importResult.errors.length > 0 && (
              <ul className="mt-2 max-h-32 list-disc overflow-y-auto pl-5 text-xs text-danger">
                {importResult.errors.map((er, i) => (
                  <li key={i}>
                    {er.line ? `Line ${er.line}: ` : ""}
                    {er.message}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        <ErrorNote error={runImport.error} />
      </Modal>
    </div>
  );
}
