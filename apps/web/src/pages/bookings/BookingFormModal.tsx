import { useState, type FormEvent } from "react";
import { BookingType, type FacilityDto } from "@bsc/shared";
import { Modal } from "../../components/ui/Modal";
import { Field, TextInput, SelectInput } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";
import { useCreateBooking } from "../../api/bookings";
import { useToast } from "../../components/ui/Toast";

export function BookingFormModal({ open, onClose, facilities }: { open: boolean; onClose: () => void; facilities: FacilityDto[] }) {
  const [facilityId, setFacilityId] = useState(facilities[0]?.id ?? "");
  const [customerName, setCustomerName] = useState("");
  const [type, setType] = useState<string>(BookingType.PUBLIC);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [timeSlotStart, setTimeSlotStart] = useState("18:00");
  const [timeSlotEnd, setTimeSlotEnd] = useState("19:00");
  const [amount, setAmount] = useState(0);
  const createBooking = useCreateBooking();
  const { push } = useToast();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      await createBooking.mutateAsync({ facilityId, customerName, type, date, timeSlotStart, timeSlotEnd, amount: Number(amount) });
      push(`Booking created for ${customerName}.`);
      onClose();
    } catch (err: any) {
      push(err?.response?.data?.message ?? "Could not create booking.", "danger");
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="New booking">
      <form onSubmit={onSubmit}>
        <Field label="Facility">
          <SelectInput value={facilityId} onChange={(e) => setFacilityId(e.target.value)} required>
            {facilities.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </SelectInput>
        </Field>
        <Field label="Customer / party name">
          <TextInput value={customerName} onChange={(e) => setCustomerName(e.target.value)} required />
        </Field>
        <Field label="Booking type">
          <SelectInput value={type} onChange={(e) => setType(e.target.value)}>
            {Object.values(BookingType).map((t) => <option key={t} value={t}>{t}</option>)}
          </SelectInput>
        </Field>
        <Field label="Date">
          <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Start time">
            <TextInput type="time" value={timeSlotStart} onChange={(e) => setTimeSlotStart(e.target.value)} required />
          </Field>
          <Field label="End time">
            <TextInput type="time" value={timeSlotEnd} onChange={(e) => setTimeSlotEnd(e.target.value)} required />
          </Field>
        </div>
        <Field label="Amount (৳)">
          <TextInput type="number" min={0} value={amount} onChange={(e) => setAmount(Number(e.target.value))} required />
        </Field>
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={createBooking.isPending}>
            {createBooking.isPending ? "Saving…" : "Create booking"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
