import { useState, type FormEvent } from "react";
import { VisitorCategory } from "@bsc/shared";
import { Modal } from "../../components/ui/Modal";
import { Field, TextInput, SelectInput } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";
import { useCreateVisitor } from "../../api/visitors";
import { useToast } from "../../components/ui/Toast";

export function VisitorFormModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState("");
  const [host, setHost] = useState("");
  const [purpose, setPurpose] = useState("");
  const [category, setCategory] = useState<string>(VisitorCategory.GUEST);
  const [escortRequired, setEscortRequired] = useState(false);
  const createVisitor = useCreateVisitor();
  const { push } = useToast();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      await createVisitor.mutateAsync({ name, host, purpose, category, escortRequired });
      push(`${name} registered.`);
      onClose();
    } catch {
      push("Could not register visitor.", "danger");
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Register visitor">
      <form onSubmit={onSubmit}>
        <Field label="Visitor / party name">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} required />
        </Field>
        <Field label="Host">
          <TextInput value={host} onChange={(e) => setHost(e.target.value)} required />
        </Field>
        <Field label="Purpose">
          <TextInput value={purpose} onChange={(e) => setPurpose(e.target.value)} required />
        </Field>
        <Field label="Category">
          <SelectInput value={category} onChange={(e) => setCategory(e.target.value)}>
            {Object.values(VisitorCategory).map((c) => <option key={c} value={c}>{c}</option>)}
          </SelectInput>
        </Field>
        <label className="mb-3 flex items-center gap-2 text-sm text-text-dim">
          <input type="checkbox" checked={escortRequired} onChange={(e) => setEscortRequired(e.target.checked)} />
          Escort required
        </label>
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={createVisitor.isPending}>
            {createVisitor.isPending ? "Saving…" : "Register"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
