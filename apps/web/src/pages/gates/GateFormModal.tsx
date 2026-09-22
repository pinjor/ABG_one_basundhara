import { useState, type FormEvent } from "react";
import { GateType, type ZoneDto } from "@bsc/shared";
import { Modal } from "../../components/ui/Modal";
import { Field, TextInput, SelectInput } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";
import { useCreateGate } from "../../api/gates";
import { useToast } from "../../components/ui/Toast";

export function GateFormModal({ open, onClose, zones }: { open: boolean; onClose: () => void; zones: ZoneDto[] }) {
  const [name, setName] = useState("");
  const [zoneId, setZoneId] = useState(zones[0]?.id ?? "");
  const [type, setType] = useState<string>(GateType.MAIN);
  const createGate = useCreateGate();
  const { push } = useToast();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      await createGate.mutateAsync({ name, zoneId, type });
      push(`${name} added.`);
      onClose();
    } catch {
      push("Could not create gate.", "danger");
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="New gate">
      <form onSubmit={onSubmit}>
        <Field label="Name">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} required />
        </Field>
        <Field label="Zone">
          <SelectInput value={zoneId} onChange={(e) => setZoneId(e.target.value)} required>
            {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
          </SelectInput>
        </Field>
        <Field label="Type">
          <SelectInput value={type} onChange={(e) => setType(e.target.value)}>
            {Object.values(GateType).map((t) => <option key={t} value={t}>{t}</option>)}
          </SelectInput>
        </Field>
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={createGate.isPending}>{createGate.isPending ? "Saving…" : "Add gate"}</Button>
        </div>
      </form>
    </Modal>
  );
}
