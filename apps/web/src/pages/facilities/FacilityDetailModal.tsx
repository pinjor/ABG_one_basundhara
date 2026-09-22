import { FACILITY_STATUS_TRANSITIONS } from "@bsc/shared";
import { Modal } from "../../components/ui/Modal";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { Button } from "../../components/ui/Button";
import { useFacility, useFacilityAuditLog, useSetFacilityStatus } from "../../api/facilities";
import { useToast } from "../../components/ui/Toast";

export function FacilityDetailModal({
  facilityId,
  onClose,
  onEdit,
}: {
  facilityId: string | null;
  onClose: () => void;
  onEdit: () => void;
}) {
  const { data: facility } = useFacility(facilityId);
  const { data: auditLog } = useFacilityAuditLog(facilityId);
  const setStatus = useSetFacilityStatus();
  const { push } = useToast();

  if (!facilityId || !facility) return null;

  const nextStatuses = FACILITY_STATUS_TRANSITIONS[facility.status] ?? [];

  async function transition(status: string) {
    try {
      await setStatus.mutateAsync({ id: facility!.id, status });
      push(`${facility!.name} moved to ${status}.`);
    } catch {
      push("That transition isn't allowed from the current status.", "danger");
    }
  }

  return (
    <Modal open={!!facilityId} onClose={onClose} title={facility.name}>
      <div className="space-y-4 text-sm">
        <div className="flex items-center justify-between">
          <StatusBadge status={facility.status} />
          <span className="text-text-dim">{facility.type} · {facility.zone?.name}</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-md bg-surface-2 p-3">
            <div className="text-xs uppercase text-text-dimmer">Capacity</div>
            <div className="font-display text-xl text-text">{facility.capacity.toLocaleString()}</div>
          </div>
          <div className="rounded-md bg-surface-2 p-3">
            <div className="text-xs uppercase text-text-dimmer">Operating hours</div>
            <div className="font-display text-xl text-text">
              {facility.operatingHoursStart}–{facility.operatingHoursEnd}
            </div>
          </div>
        </div>

        {facility.surfaces?.length > 0 && (
          <div>
            <div className="mb-1.5 text-xs uppercase tracking-wide text-text-dimmer">Surfaces</div>
            <ul className="space-y-1">
              {facility.surfaces.map((s: any) => (
                <li key={s.id} className="flex items-center justify-between rounded-md bg-surface-2 px-3 py-1.5">
                  <span>{s.surfaceType}</span>
                  <StatusBadge status={s.condition} />
                </li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <div className="mb-1.5 text-xs uppercase tracking-wide text-text-dimmer">Status transitions</div>
          <div className="flex flex-wrap gap-2">
            {nextStatuses.length === 0 && <span className="text-text-dim">No transitions available.</span>}
            {nextStatuses.map((s) => (
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
