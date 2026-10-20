import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { ErrorNote, Field, Modal, Toggle } from "./ui";
import { toast } from "./toast";

export interface FieldDef {
  key: string;
  label: string;
  type?: "text" | "number" | "select" | "textarea" | "toggle" | "multi";
  options?: { value: string; label: string }[];
  required?: boolean;
  hint?: string;
  placeholder?: string;
  /** Shown but not editable once the record exists (codes used in tracking numbers). */
  lockedOnEdit?: boolean;
  span?: 2;
}

type Values = Record<string, unknown>;

/** Create / edit dialog for simple reference records. Sends only the fields shown. */
export function EntityForm({ title, fields, initial, onClose, save, invalidate, successMessage }: { title: string; fields: FieldDef[]; initial: Values; onClose: () => void; save: (v: Values) => Promise<unknown>; invalidate: unknown[][]; successMessage: string }) {
  const qc = useQueryClient();
  const editing = !!initial.id;
  const [values, setValues] = useState<Values>(initial);
  const set = (k: string, v: unknown) => setValues((s) => ({ ...s, [k]: v }));
  const missing = fields.some((f) => f.required && (values[f.key] === undefined || values[f.key] === "" || (Array.isArray(values[f.key]) && !(values[f.key] as unknown[]).length)));

  const mutation = useMutation({
    mutationFn: () => {
      const body: Values = {};
      for (const f of fields) {
        if (editing && f.lockedOnEdit) continue;
        const v = values[f.key];
        if (v === "" || v === undefined) {
          if (editing && f.type === "select" && !f.required) body[f.key] = null;
          continue;
        }
        body[f.key] = f.type === "number" ? Number(v) : v;
      }
      return save(body);
    },
    onSuccess: () => {
      toast.success(successMessage);
      for (const key of invalidate) void qc.invalidateQueries({ queryKey: key });
      onClose();
    },
  });

  return (
    <Modal
      open
      onClose={onClose}
      title={title}
      width="max-w-2xl"
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" disabled={missing || mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />} {editing ? "Save changes" : "Create"}
          </button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {fields.map((f) => {
          const locked = editing && f.lockedOnEdit;
          const value = values[f.key];
          const label = `${f.label}${f.required ? "" : " (optional)"}`;
          if (f.type === "toggle")
            return (
              <div key={f.key} className="flex items-center justify-between gap-3 rounded-xl border border-line px-3 py-2.5">
                <span className="text-sm font-medium text-ink">{f.label}</span>
                <Toggle checked={!!value} onChange={(v) => set(f.key, v)} label={f.label} />
              </div>
            );
          if (f.type === "multi")
            return (
              <fieldset key={f.key} className="sm:col-span-2">
                <legend className="label">{label}</legend>
                <div className="flex flex-wrap gap-2">
                  {f.options!.map((o) => {
                    const list = (value as string[] | undefined) ?? [];
                    const on = list.includes(o.value);
                    return (
                      <label key={o.value} className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 text-sm ${on ? "border-navy bg-navy text-white" : "border-line text-ink"}`}>
                        <input type="checkbox" className="sr-only" checked={on} onChange={() => set(f.key, on ? list.filter((x) => x !== o.value) : [...list, o.value])} />
                        {o.label}
                      </label>
                    );
                  })}
                </div>
                {f.hint && <p className="mt-1 text-xs text-ink-subtle">{f.hint}</p>}
              </fieldset>
            );
          return (
            <Field key={f.key} label={label} hint={locked ? "Cannot change once in use." : f.hint} className={f.span === 2 || f.type === "textarea" ? "sm:col-span-2" : undefined}>
              {(id) =>
                f.type === "select" ? (
                  <select id={id} className="input" disabled={locked} value={(value as string) ?? ""} onChange={(e) => set(f.key, e.target.value)}>
                    <option value="">{f.required ? "Choose…" : "Any"}</option>
                    {f.options!.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                ) : f.type === "textarea" ? (
                  <textarea id={id} className="input h-20 py-2" value={(value as string) ?? ""} onChange={(e) => set(f.key, e.target.value)} />
                ) : (
                  <input id={id} className="input" type={f.type === "number" ? "number" : "text"} disabled={locked} placeholder={f.placeholder} value={(value as string | number) ?? ""} onChange={(e) => set(f.key, e.target.value)} />
                )
              }
            </Field>
          );
        })}
      </div>
      <ErrorNote error={mutation.error} />
    </Modal>
  );
}
