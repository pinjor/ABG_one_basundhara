import { useState, type FormEvent } from "react";
import { FleetVehicleType } from "@bsc/shared";
import { Modal } from "../../components/ui/Modal";
import { Field, TextInput, SelectInput } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";
import { useCreateFleetVehicle } from "../../api/fleet";
import { useToast } from "../../components/ui/Toast";

export function FleetVehicleFormModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [type, setType] = useState<string>(FleetVehicleType.BUGGY);
  const [driverName, setDriverName] = useState("");
  const [currentLocation, setCurrentLocation] = useState("");
  const createVehicle = useCreateFleetVehicle();
  const { push } = useToast();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      await createVehicle.mutateAsync({ type, driverName: driverName || undefined, currentLocation: currentLocation || undefined });
      push("Vehicle added to fleet.");
      onClose();
    } catch {
      push("Could not add vehicle.", "danger");
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="New fleet vehicle">
      <form onSubmit={onSubmit}>
        <Field label="Type">
          <SelectInput value={type} onChange={(e) => setType(e.target.value)}>
            {Object.values(FleetVehicleType).map((t) => <option key={t} value={t}>{t}</option>)}
          </SelectInput>
        </Field>
        <Field label="Driver">
          <TextInput value={driverName} onChange={(e) => setDriverName(e.target.value)} placeholder="Optional" />
        </Field>
        <Field label="Current location">
          <TextInput value={currentLocation} onChange={(e) => setCurrentLocation(e.target.value)} placeholder="Optional" />
        </Field>
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={createVehicle.isPending}>{createVehicle.isPending ? "Saving…" : "Add vehicle"}</Button>
        </div>
      </form>
    </Modal>
  );
}
