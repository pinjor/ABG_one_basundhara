import { useState, type FormEvent } from "react";
import { SurfaceType, type FacilityDto } from "@bsc/shared";
import { Modal } from "../../components/ui/Modal";
import { Field, TextInput, SelectInput } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";
import { useCreateSurface } from "../../api/surfaces";
import { useToast } from "../../components/ui/Toast";

export function SurfaceFormModal({ open, onClose, facilities }: { open: boolean; onClose: () => void; facilities: FacilityDto[] }) {
  const [facilityId, setFacilityId] = useState(facilities[0]?.id ?? "");
  const [surfaceType, setSurfaceType] = useState<string>(SurfaceType.NATURAL_GRASS);
  const [moisturePercent, setMoisturePercent] = useState(40);
  const createSurface = useCreateSurface();
  const { push } = useToast();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      await createSurface.mutateAsync({ facilityId, surfaceType, moisturePercent: Number(moisturePercent) });
      push("Surface profile added.");
      onClose();
    } catch {
      push("Could not create surface profile.", "danger");
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="New surface profile">
      <form onSubmit={onSubmit}>
        <Field label="Facility">
          <SelectInput value={facilityId} onChange={(e) => setFacilityId(e.target.value)} required>
            {facilities.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </SelectInput>
        </Field>
        <Field label="Surface type">
          <SelectInput value={surfaceType} onChange={(e) => setSurfaceType(e.target.value)}>
            {Object.values(SurfaceType).map((t) => <option key={t} value={t}>{t}</option>)}
          </SelectInput>
        </Field>
        <Field label="Moisture %">
          <TextInput type="number" min={0} max={100} value={moisturePercent} onChange={(e) => setMoisturePercent(Number(e.target.value))} />
        </Field>
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={createSurface.isPending}>{createSurface.isPending ? "Saving…" : "Add surface"}</Button>
        </div>
      </form>
    </Modal>
  );
}
