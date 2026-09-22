import { useState } from "react";
import { AccessMethod, GateStatus } from "@bsc/shared";
import { Modal } from "../../components/ui/Modal";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { Button } from "../../components/ui/Button";
import { Field, TextInput, SelectInput } from "../../components/ui/Field";
import { useGate, useGateAuditLog, useToggleGate, useScanGate } from "../../api/gates";
import { useToast } from "../../components/ui/Toast";

export function GateDetailModal({ gateId, onClose }: { gateId: string | null; onClose: () => void }) {
  const { data: gate } = useGate(gateId);
  const { data: auditLog } = useGateAuditLog(gateId);
  const toggleGate = useToggleGate();
  const scanGate = useScanGate();
  const { push } = useToast();

  const [personRef, setPersonRef] = useState("");
  const [method, setMethod] = useState<string>(AccessMethod.QR);

  if (!gateId || !gate) return null;

  async function doToggle() {
    try {
      const updated = await toggleGate.mutateAsync(gate!.id);
      push(`${gate!.name} is now ${updated.status}.`);
    } catch {
      push("Could not toggle gate.", "danger");
    }
  }

  async function doScan() {
    if (!personRef.trim()) return;
    try {
      const entry = await scanGate.mutateAsync({ id: gate!.id, personRef, method });
      push(entry.result === "Approved" ? `${personRef} approved at ${gate!.name}.` : `${personRef} denied at ${gate!.name}.`, entry.result === "Approved" ? "success" : "danger");
      setPersonRef("");
    } catch {
      push("Scan failed.", "danger");
    }
  }

  return (
    <Modal open={!!gateId} onClose={onClose} title={gate.name}>
      <div className="space-y-4 text-sm">
        <div className="flex items-center justify-between">
          <StatusBadge status={gate.status} />
          <span className="text-text-dim">{gate.type} · {gate.zone?.name}</span>
        </div>

        <div className="rounded-md bg-surface-2 p-3">
          <div className="text-xs uppercase text-text-dimmer">Entries today</div>
          <div className="font-display text-2xl text-text">{gate.entriesToday.toLocaleString()}</div>
        </div>

        <div className="flex gap-2 border-t border-border-soft pt-3">
          <Button variant={gate.status === GateStatus.ONLINE ? "danger" : "secondary"} onClick={doToggle} disabled={toggleGate.isPending}>
            {gate.status === GateStatus.ONLINE ? "Take offline" : "Bring online"}
          </Button>
        </div>

        <div className="rounded-md border border-border-soft p-3">
          <div className="mb-2 text-xs uppercase tracking-wide text-text-dimmer">Simulate a reader scan</div>
          <div className="flex gap-2">
            <TextInput placeholder="Person / credential ref" value={personRef} onChange={(e) => setPersonRef(e.target.value)} />
            <SelectInput className="w-32" value={method} onChange={(e) => setMethod(e.target.value)}>
              {Object.values(AccessMethod).map((m) => <option key={m} value={m}>{m}</option>)}
            </SelectInput>
            <Button onClick={doScan} disabled={scanGate.isPending || !personRef.trim()}>Scan</Button>
          </div>
          {gate.status === GateStatus.OFFLINE && (
            <p className="mt-2 text-xs text-red">Gate is offline — every scan will be denied until it's back online.</p>
          )}
        </div>

        {gate.accessLogs?.length > 0 && (
          <div>
            <div className="mb-1.5 text-xs uppercase tracking-wide text-text-dimmer">Recent activity at this gate</div>
            <ul className="max-h-40 space-y-1.5 overflow-y-auto">
              {gate.accessLogs.map((entry: any) => (
                <li key={entry.id} className="flex items-center justify-between rounded-md bg-surface-2 px-3 py-1.5 text-xs">
                  <span className="text-text">{entry.personRef} · {entry.method}</span>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={entry.result} />
                    <span className="text-text-dimmer">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {auditLog && auditLog.length > 0 && (
          <div>
            <div className="mb-1.5 text-xs uppercase tracking-wide text-text-dimmer">Audit trail</div>
            <ul className="max-h-24 space-y-1 overflow-y-auto text-xs text-text-dim">
              {auditLog.map((entry: any) => (
                <li key={entry.id}>{entry.action} · {entry.user?.name} · {new Date(entry.createdAt).toLocaleString()}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Modal>
  );
}
