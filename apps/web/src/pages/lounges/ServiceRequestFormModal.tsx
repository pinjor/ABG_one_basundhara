import { useState, type FormEvent } from "react";
import type { LoungeDto } from "@bsc/shared";
import { Modal } from "../../components/ui/Modal";
import { Field, TextInput, SelectInput } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";
import { useCreateServiceRequest } from "../../api/lounges";
import { useToast } from "../../components/ui/Toast";

export function ServiceRequestFormModal({ open, onClose, lounges }: { open: boolean; onClose: () => void; lounges: LoungeDto[] }) {
  const [loungeId, setLoungeId] = useState(lounges[0]?.id ?? "");
  const [partyRef, setPartyRef] = useState("");
  const [item, setItem] = useState("");
  const createRequest = useCreateServiceRequest();
  const { push } = useToast();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      await createRequest.mutateAsync({ loungeId, partyRef, item });
      push("Service request logged.");
      onClose();
    } catch {
      push("Could not log request.", "danger");
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="New service request">
      <form onSubmit={onSubmit}>
        <Field label="Lounge">
          <SelectInput value={loungeId} onChange={(e) => setLoungeId(e.target.value)} required>
            {lounges.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </SelectInput>
        </Field>
        <Field label="Guest / party">
          <TextInput value={partyRef} onChange={(e) => setPartyRef(e.target.value)} required />
        </Field>
        <Field label="Item requested">
          <TextInput value={item} onChange={(e) => setItem(e.target.value)} required />
        </Field>
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={createRequest.isPending}>{createRequest.isPending ? "Saving…" : "Log request"}</Button>
        </div>
      </form>
    </Modal>
  );
}
