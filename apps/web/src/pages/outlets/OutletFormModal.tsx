import { useState, type FormEvent } from "react";
import { OutletType, type ZoneDto } from "@bsc/shared";
import { Modal } from "../../components/ui/Modal";
import { Field, TextInput, SelectInput } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";
import { useCreateOutlet } from "../../api/outlets";
import { useToast } from "../../components/ui/Toast";

export function OutletFormModal({ open, onClose, zones }: { open: boolean; onClose: () => void; zones: ZoneDto[] }) {
  const [name, setName] = useState("");
  const [type, setType] = useState<string>(OutletType.RESTAURANT);
  const [zoneId, setZoneId] = useState(zones[0]?.id ?? "");
  const createOutlet = useCreateOutlet();
  const { push } = useToast();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      await createOutlet.mutateAsync({ name, type, zoneId });
      push(`${name} added.`);
      onClose();
    } catch {
      push("Could not create outlet.", "danger");
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="New outlet">
      <form onSubmit={onSubmit}>
        <Field label="Name">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} required />
        </Field>
        <Field label="Type">
          <SelectInput value={type} onChange={(e) => setType(e.target.value)}>
            {Object.values(OutletType).map((t) => <option key={t} value={t}>{t}</option>)}
          </SelectInput>
        </Field>
        <Field label="Zone">
          <SelectInput value={zoneId} onChange={(e) => setZoneId(e.target.value)} required>
            {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
          </SelectInput>
        </Field>
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={createOutlet.isPending}>{createOutlet.isPending ? "Saving…" : "Add outlet"}</Button>
        </div>
      </form>
    </Modal>
  );
}
