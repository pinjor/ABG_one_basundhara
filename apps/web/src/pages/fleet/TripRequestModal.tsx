import { useState, type FormEvent } from "react";
import { Modal } from "../../components/ui/Modal";
import { Field, TextInput } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";
import { useCreateTrip } from "../../api/fleet";
import { useToast } from "../../components/ui/Toast";

export function TripRequestModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [passengerRef, setPassengerRef] = useState("");
  const [fromLocation, setFromLocation] = useState("");
  const [toLocation, setToLocation] = useState("");
  const createTrip = useCreateTrip();
  const { push } = useToast();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      await createTrip.mutateAsync({ passengerRef, fromLocation, toLocation });
      push(`Trip requested for ${passengerRef} — nearest available vehicle dispatched.`);
      onClose();
    } catch (err: any) {
      push(err?.response?.data?.message ?? "Could not request trip.", "danger");
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Request a trip">
      <form onSubmit={onSubmit}>
        <Field label="Passenger / party">
          <TextInput value={passengerRef} onChange={(e) => setPassengerRef(e.target.value)} required />
        </Field>
        <Field label="Pickup location">
          <TextInput value={fromLocation} onChange={(e) => setFromLocation(e.target.value)} required />
        </Field>
        <Field label="Drop-off location">
          <TextInput value={toLocation} onChange={(e) => setToLocation(e.target.value)} required />
        </Field>
        <p className="mb-3 text-xs text-text-dimmer">The nearest Available vehicle is dispatched automatically.</p>
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={createTrip.isPending}>{createTrip.isPending ? "Requesting…" : "Request trip"}</Button>
        </div>
      </form>
    </Modal>
  );
}
