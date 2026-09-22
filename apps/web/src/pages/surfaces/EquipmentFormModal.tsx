import { useState, type FormEvent } from "react";
import { EquipmentCategory } from "@bsc/shared";
import { Modal } from "../../components/ui/Modal";
import { Field, TextInput, SelectInput } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";
import { useCreateEquipment } from "../../api/surfaces";
import { useToast } from "../../components/ui/Toast";

export function EquipmentFormModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<string>(EquipmentCategory.BALLS);
  const [quantity, setQuantity] = useState(1);
  const createEquipment = useCreateEquipment();
  const { push } = useToast();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      await createEquipment.mutateAsync({ name, category, quantity: Number(quantity) });
      push(`${name} added to inventory.`);
      onClose();
    } catch {
      push("Could not add equipment.", "danger");
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="New equipment">
      <form onSubmit={onSubmit}>
        <Field label="Name">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} required />
        </Field>
        <Field label="Category">
          <SelectInput value={category} onChange={(e) => setCategory(e.target.value)}>
            {Object.values(EquipmentCategory).map((c) => <option key={c} value={c}>{c}</option>)}
          </SelectInput>
        </Field>
        <Field label="Quantity">
          <TextInput type="number" min={0} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} required />
        </Field>
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={createEquipment.isPending}>{createEquipment.isPending ? "Saving…" : "Add equipment"}</Button>
        </div>
      </form>
    </Modal>
  );
}
