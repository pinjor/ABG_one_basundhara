import { useState, type FormEvent } from "react";
import type { ZoneDto } from "@bsc/shared";
import { Modal } from "../../components/ui/Modal";
import { Field, TextInput, SelectInput } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";
import { useCreateLounge } from "../../api/lounges";
import { useToast } from "../../components/ui/Toast";

export function LoungeFormModal({ open, onClose, zones }: { open: boolean; onClose: () => void; zones: ZoneDto[] }) {
  const [name, setName] = useState("");
  const [zoneId, setZoneId] = useState(zones[0]?.id ?? "");
  const [capacity, setCapacity] = useState(30);
  const createLounge = useCreateLounge();
  const { push } = useToast();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      await createLounge.mutateAsync({ name, zoneId, capacity: Number(capacity) });
      push(`${name} added.`);
      onClose();
    } catch {
      push("Could not create lounge.", "danger");
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="New lounge">
      <form onSubmit={onSubmit}>
        <Field label="Name">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} required />
        </Field>
        <Field label="Zone">
          <SelectInput value={zoneId} onChange={(e) => setZoneId(e.target.value)} required>
            {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
          </SelectInput>
        </Field>
        <Field label="Capacity">
          <TextInput type="number" min={0} value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} required />
        </Field>
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={createLounge.isPending}>{createLounge.isPending ? "Saving…" : "Add lounge"}</Button>
        </div>
      </form>
    </Modal>
  );
}
