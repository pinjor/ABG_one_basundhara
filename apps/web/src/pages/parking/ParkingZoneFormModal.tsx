import { useState, type FormEvent } from "react";
import { ParkingZoneType, type ZoneDto } from "@bsc/shared";
import { Modal } from "../../components/ui/Modal";
import { Field, TextInput, SelectInput } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";
import { useCreateParkingZone } from "../../api/parking";
import { useToast } from "../../components/ui/Toast";

export function ParkingZoneFormModal({ open, onClose, zones }: { open: boolean; onClose: () => void; zones: ZoneDto[] }) {
  const [name, setName] = useState("");
  const [type, setType] = useState<string>(ParkingZoneType.PUBLIC);
  const [zoneId, setZoneId] = useState(zones[0]?.id ?? "");
  const [capacity, setCapacity] = useState(100);
  const createZone = useCreateParkingZone();
  const { push } = useToast();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      await createZone.mutateAsync({ name, type, zoneId, capacity: Number(capacity) });
      push(`${name} added.`);
      onClose();
    } catch {
      push("Could not create parking zone.", "danger");
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="New parking zone">
      <form onSubmit={onSubmit}>
        <Field label="Name">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} required />
        </Field>
        <Field label="Type">
          <SelectInput value={type} onChange={(e) => setType(e.target.value)}>
            {Object.values(ParkingZoneType).map((t) => <option key={t} value={t}>{t}</option>)}
          </SelectInput>
        </Field>
        <Field label="Complex zone">
          <SelectInput value={zoneId} onChange={(e) => setZoneId(e.target.value)} required>
            {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
          </SelectInput>
        </Field>
        <Field label="Capacity">
          <TextInput type="number" min={0} value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} required />
        </Field>
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={createZone.isPending}>{createZone.isPending ? "Saving…" : "Add zone"}</Button>
        </div>
      </form>
    </Modal>
  );
}
