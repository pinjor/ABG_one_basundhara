import { useState, type FormEvent } from "react";
import type { OutletDto } from "@bsc/shared";
import { Modal } from "../../components/ui/Modal";
import { Field, TextInput, SelectInput } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";
import { useCreateOrder } from "../../api/outlets";
import { useToast } from "../../components/ui/Toast";

export function OrderFormModal({ open, onClose, outlets }: { open: boolean; onClose: () => void; outlets: OutletDto[] }) {
  const [outletId, setOutletId] = useState(outlets[0]?.id ?? "");
  const [itemName, setItemName] = useState("");
  const [qty, setQty] = useState(1);
  const [amount, setAmount] = useState(0);
  const createOrder = useCreateOrder();
  const { push } = useToast();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      await createOrder.mutateAsync({ outletId, items: [{ name: itemName, qty: Number(qty) }], amount: Number(amount) });
      push("Order placed.");
      onClose();
    } catch (err: any) {
      push(err?.response?.data?.message ?? "Could not place order.", "danger");
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="New order">
      <form onSubmit={onSubmit}>
        <Field label="Outlet">
          <SelectInput value={outletId} onChange={(e) => setOutletId(e.target.value)} required>
            {outlets.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </SelectInput>
        </Field>
        <Field label="Item">
          <TextInput value={itemName} onChange={(e) => setItemName(e.target.value)} required />
        </Field>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Quantity">
            <TextInput type="number" min={1} value={qty} onChange={(e) => setQty(Number(e.target.value))} required />
          </Field>
          <Field label="Amount (৳)">
            <TextInput type="number" min={0} value={amount} onChange={(e) => setAmount(Number(e.target.value))} required />
          </Field>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={createOrder.isPending}>{createOrder.isPending ? "Placing…" : "Place order"}</Button>
        </div>
      </form>
    </Modal>
  );
}
