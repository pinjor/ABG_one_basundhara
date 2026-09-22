import { useState, type FormEvent } from "react";
import { FacilityType, FacilityStatus, type FacilityDto, type ZoneDto } from "@bsc/shared";
import { Modal } from "../../components/ui/Modal";
import { Field, TextInput, SelectInput } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";
import { useCreateFacility, useUpdateFacility } from "../../api/facilities";
import { useToast } from "../../components/ui/Toast";

interface FacilityFormModalProps {
  open: boolean;
  onClose: () => void;
  facility?: FacilityDto | null;
  zones: ZoneDto[];
}

export function FacilityFormModal({ open, onClose, facility, zones }: FacilityFormModalProps) {
  const isEdit = !!facility;
  const [name, setName] = useState(facility?.name ?? "");
  const [zoneId, setZoneId] = useState(facility?.zoneId ?? zones[0]?.id ?? "");
  const [type, setType] = useState<string>(facility?.type ?? FacilityType.TRAINING_GROUND);
  const [capacity, setCapacity] = useState(facility?.capacity ?? 0);
  const [status, setStatus] = useState<string>(facility?.status ?? FacilityStatus.AVAILABLE);
  const createFacility = useCreateFacility();
  const updateFacility = useUpdateFacility();
  const { push } = useToast();

  const saving = createFacility.isPending || updateFacility.isPending;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const payload = { name, zoneId, type, capacity: Number(capacity), status };
    try {
      if (isEdit && facility) {
        await updateFacility.mutateAsync({ id: facility.id, payload });
        push(`${name} updated.`);
      } else {
        await createFacility.mutateAsync(payload);
        push(`${name} created.`);
      }
      onClose();
    } catch {
      push("Could not save facility.", "danger");
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "Edit facility" : "New facility"}>
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
            {Object.values(FacilityType).map((t) => <option key={t} value={t}>{t}</option>)}
          </SelectInput>
        </Field>
        <Field label="Capacity">
          <TextInput type="number" min={0} value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} required />
        </Field>
        <Field label="Status">
          <SelectInput value={status} onChange={(e) => setStatus(e.target.value)}>
            {Object.values(FacilityStatus).map((s) => <option key={s} value={s}>{s}</option>)}
          </SelectInput>
        </Field>
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save facility"}</Button>
        </div>
      </form>
    </Modal>
  );
}
