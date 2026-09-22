import { useState, type FormEvent } from "react";
import { MembershipTier } from "@bsc/shared";
import { Modal } from "../../components/ui/Modal";
import { Field, TextInput, SelectInput } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";
import { useCreateMember } from "../../api/members";
import { useToast } from "../../components/ui/Toast";

const oneYearFromNow = () => {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
};

export function MemberFormModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [tier, setTier] = useState<string>(MembershipTier.INDIVIDUAL);
  const [expiryDate, setExpiryDate] = useState(oneYearFromNow());
  const createMember = useCreateMember();
  const { push } = useToast();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      await createMember.mutateAsync({ name, email, phone: phone || undefined, tier, expiryDate });
      push(`${name} added as a member.`);
      onClose();
    } catch (err: any) {
      push(err?.response?.data?.message ?? "Could not create member.", "danger");
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="New member">
      <form onSubmit={onSubmit}>
        <Field label="Name">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} required />
        </Field>
        <Field label="Email">
          <TextInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </Field>
        <Field label="Phone">
          <TextInput value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Optional" />
        </Field>
        <Field label="Tier">
          <SelectInput value={tier} onChange={(e) => setTier(e.target.value)}>
            {Object.values(MembershipTier).map((t) => <option key={t} value={t}>{t}</option>)}
          </SelectInput>
        </Field>
        <Field label="Expiry date">
          <TextInput type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} required />
        </Field>
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={createMember.isPending}>
            {createMember.isPending ? "Saving…" : "Add member"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
