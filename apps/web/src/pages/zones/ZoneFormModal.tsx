import { useState, type FormEvent } from "react";
import { ZoneType, ZoneStatus, type ZoneDto } from "@bsc/shared";
import { Modal } from "../../components/ui/Modal";
import { Field, TextInput, SelectInput } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";
import { useCreateZone, useUpdateZone } from "../../api/zones";
import { useToast } from "../../components/ui/Toast";

interface ZoneFormModalProps {
  open: boolean;
  onClose: () => void;
  zone?: ZoneDto | null;
}

export function ZoneFormModal({ open, onClose, zone }: ZoneFormModalProps) {
  const isEdit = !!zone;
  const [name, setName] = useState(zone?.name ?? "");
  const [type, setType] = useState<string>(zone?.type ?? ZoneType.FACILITY);
  const [status, setStatus] = useState<string>(zone?.status ?? ZoneStatus.OPERATIONAL);
  const [capacity, setCapacity] = useState(zone?.capacity ?? 0);
  const [building, setBuilding] = useState(zone?.building ?? "");
  const createZone = useCreateZone();
  const updateZone = useUpdateZone();
  const { push } = useToast();

  const saving = createZone.isPending || updateZone.isPending;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const payload = { name, type, status, capacity: Number(capacity), building: building || undefined };
    try {
      if (isEdit && zone) {
        await updateZone.mutateAsync({ id: zone.id, payload });
        push(`${name} updated.`);
      } else {
        await createZone.mutateAsync(payload);
        push(`${name} created.`);
      }
      onClose();
    } catch {
      push("Could not save zone.", "danger");
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "Edit zone" : "New zone"}>
      <form onSubmit={onSubmit}>
        <Field label="Name">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} required />
        </Field>
        <Field label="Type">
          <SelectInput value={type} onChange={(e) => setType(e.target.value)}>
            {Object.values(ZoneType).map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Building">
          <TextInput value={building} onChange={(e) => setBuilding(e.target.value)} placeholder="Optional" />
        </Field>
        <Field label="Capacity">
          <TextInput type="number" min={0} value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} required />
        </Field>
        <Field label="Status">
          <SelectInput value={status} onChange={(e) => setStatus(e.target.value)}>
            {Object.values(ZoneStatus).map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </SelectInput>
        </Field>
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save zone"}</Button>
        </div>
      </form>
    </Modal>
  );
}
