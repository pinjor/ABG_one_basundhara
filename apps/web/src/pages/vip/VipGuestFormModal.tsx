import { useState, type FormEvent } from "react";
import { VIPClassification } from "@bsc/shared";
import { Modal } from "../../components/ui/Modal";
import { Field, TextInput, SelectInput } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";
import { useCreateVipGuest } from "../../api/vipGuests";
import { useToast } from "../../components/ui/Toast";

function defaultArrival() {
  const d = new Date(Date.now() + 3600_000);
  return d.toISOString().slice(0, 16);
}

export function VipGuestFormModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState("");
  const [designation, setDesignation] = useState("");
  const [classification, setClassification] = useState<string>(VIPClassification.CORPORATE);
  const [arrivalDatetime, setArrivalDatetime] = useState(defaultArrival());
  const [loungeAssignment, setLoungeAssignment] = useState("");
  const [seatAllocation, setSeatAllocation] = useState("");
  const [mealPreference, setMealPreference] = useState("");
  const [privacyFlag, setPrivacyFlag] = useState(false);
  const createVipGuest = useCreateVipGuest();
  const { push } = useToast();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      await createVipGuest.mutateAsync({
        name,
        designation: designation || undefined,
        classification,
        arrivalDatetime: new Date(arrivalDatetime).toISOString(),
        loungeAssignment: loungeAssignment || undefined,
        seatAllocation: seatAllocation || undefined,
        mealPreference: mealPreference || undefined,
        privacyFlag,
      });
      push(`${name} added to the protocol list.`);
      onClose();
    } catch {
      push("Could not add VIP guest.", "danger");
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="New VIP guest">
      <form onSubmit={onSubmit}>
        <Field label="Name">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} required />
        </Field>
        <Field label="Designation">
          <TextInput value={designation} onChange={(e) => setDesignation(e.target.value)} placeholder="Optional" />
        </Field>
        <Field label="Classification">
          <SelectInput value={classification} onChange={(e) => setClassification(e.target.value)}>
            {Object.values(VIPClassification).map((c) => <option key={c} value={c}>{c}</option>)}
          </SelectInput>
        </Field>
        <Field label="Arrival date & time">
          <TextInput type="datetime-local" value={arrivalDatetime} onChange={(e) => setArrivalDatetime(e.target.value)} required />
        </Field>
        <Field label="Lounge assignment">
          <TextInput value={loungeAssignment} onChange={(e) => setLoungeAssignment(e.target.value)} placeholder="Optional" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Seat allocation">
            <TextInput value={seatAllocation} onChange={(e) => setSeatAllocation(e.target.value)} placeholder="Optional" />
          </Field>
          <Field label="Meal preference">
            <TextInput value={mealPreference} onChange={(e) => setMealPreference(e.target.value)} placeholder="Optional" />
          </Field>
        </div>
        <label className="mb-3 flex items-center gap-2 text-sm text-text-dim">
          <input type="checkbox" checked={privacyFlag} onChange={(e) => setPrivacyFlag(e.target.checked)} />
          Privacy-flagged (visible only to Protocol Officers and Super Admin)
        </label>
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={createVipGuest.isPending}>
            {createVipGuest.isPending ? "Saving…" : "Add guest"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
