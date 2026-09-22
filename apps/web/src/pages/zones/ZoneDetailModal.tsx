import { ZoneStatus } from "@bsc/shared";
import { Modal } from "../../components/ui/Modal";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { Button } from "../../components/ui/Button";
import { useZone, useZoneAuditLog, useSetZoneStatus } from "../../api/zones";
import { useToast } from "../../components/ui/Toast";

export function ZoneDetailModal({ zoneId, onClose, onEdit }: { zoneId: string | null; onClose: () => void; onEdit: () => void }) {
  const { data: zone } = useZone(zoneId);
  const { data: auditLog } = useZoneAuditLog(zoneId);
  const setStatus = useSetZoneStatus();
  const { push } = useToast();

  if (!zoneId || !zone) return null;

  const occupancyPct = zone.capacity > 0 ? Math.round((zone.liveOccupancy / zone.capacity) * 100) : 0;

  async function transition(status: string) {
    try {
      await setStatus.mutateAsync({ id: zone!.id, status });
      push(`${zone!.name} moved to ${status}.`);
    } catch {
      push("Could not update zone status.", "danger");
    }
  }

  return (
    <Modal open={!!zoneId} onClose={onClose} title={zone.name}>
      <div className="space-y-4 text-sm">
        <div className="flex items-center justify-between">
          <StatusBadge status={zone.status} />
          <span className="text-text-dim">{zone.type}{zone.building ? ` · ${zone.building}` : ""}</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-md bg-surface-2 p-3">
            <div className="text-xs uppercase text-text-dimmer">Capacity</div>
            <div className="font-display text-xl text-text">{zone.capacity.toLocaleString()}</div>
          </div>
          <div className="rounded-md bg-surface-2 p-3">
            <div className="text-xs uppercase text-text-dimmer">Live occupancy</div>
            <div className="font-display text-xl text-text">{occupancyPct}%</div>
          </div>
        </div>

        {zone.facilities?.length > 0 && (
          <div>
            <div className="mb-1.5 text-xs uppercase tracking-wide text-text-dimmer">Facilities in this zone</div>
            <ul className="space-y-1">
              {zone.facilities.map((f: any) => (
                <li key={f.id} className="flex items-center justify-between rounded-md bg-surface-2 px-3 py-1.5">
                  <span>{f.name}</span>
                  <StatusBadge status={f.status} />
                </li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <div className="mb-1.5 text-xs uppercase tracking-wide text-text-dimmer">Status transitions</div>
          <div className="flex flex-wrap gap-2">
            {Object.values(ZoneStatus)
              .filter((s) => s !== zone.status)
              .map((s) => (
                <Button key={s} variant="secondary" onClick={() => transition(s)} disabled={setStatus.isPending}>
                  Move to {s}
                </Button>
              ))}
          </div>
        </div>

        {auditLog && auditLog.length > 0 && (
          <div>
            <div className="mb-1.5 text-xs uppercase tracking-wide text-text-dimmer">Audit trail</div>
            <ul className="max-h-32 space-y-1 overflow-y-auto text-xs text-text-dim">
              {auditLog.map((entry: any) => (
                <li key={entry.id}>
                  {entry.action} · {entry.user?.name} · {new Date(entry.createdAt).toLocaleString()}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex justify-end gap-2 border-t border-border-soft pt-3">
          <Button variant="secondary" onClick={onEdit}>Edit details</Button>
        </div>
      </div>
    </Modal>
  );
}
