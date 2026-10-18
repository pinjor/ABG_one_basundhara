import { VIP_STATUS_TRANSITIONS } from "@bsc/shared";
import { Modal } from "../../components/ui/Modal";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { Button } from "../../components/ui/Button";
import { useVipGuest, useVipGuestAuditLog, useSetVipGuestStatus } from "../../api/vipGuests";
import { useToast } from "../../components/ui/Toast";

export function VipGuestDetailModal({ guestId, onClose }: { guestId: string | null; onClose: () => void }) {
  const { data: guest } = useVipGuest(guestId);
  const { data: auditLog } = useVipGuestAuditLog(guestId);
  const setStatus = useSetVipGuestStatus();
  const { push } = useToast();

  if (!guestId || !guest) return null;

  const nextStatuses = VIP_STATUS_TRANSITIONS[guest.status] ?? [];

  async function transition(status: string) {
    try {
      await setStatus.mutateAsync({ id: guest!.id, status });
      push(`${guest!.name} moved to ${status}.`);
    } catch {
      push("That transition isn't allowed.", "danger");
    }
  }

  return (
    <Modal open={!!guestId} onClose={onClose} title={guest.name}>
      <div className="space-y-4 text-sm">
        <div className="flex items-center justify-between">
          <StatusBadge status={guest.status} />
          <span className="text-text-dim">{guest.classification}{guest.designation ? ` · ${guest.designation}` : ""}</span>
        </div>

        {guest.privacyFlag && (
          <div className="rounded-md border border-gold/30 bg-gold/10 px-3 py-2 text-xs text-gold">
            Privacy-flagged — only visible to Protocol Officers and Super Admin.
          </div>
        )}

        <div className="rounded-md bg-surface-2 p-3">
          <div className="text-xs uppercase text-text-dimmer">Arrival</div>
          <div className="font-display text-lg text-text">{new Date(guest.arrivalDatetime).toLocaleString()}</div>
        </div>

        <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-3">
          <div className="rounded-md bg-surface-2 p-3">
            <div className="uppercase text-text-dimmer">Lounge</div>
            <div className="mt-1 text-text">{guest.loungeAssignment ?? "—"}</div>
          </div>
          <div className="rounded-md bg-surface-2 p-3">
            <div className="uppercase text-text-dimmer">Seat</div>
            <div className="mt-1 text-text">{guest.seatAllocation ?? "—"}</div>
          </div>
          <div className="rounded-md bg-surface-2 p-3">
            <div className="uppercase text-text-dimmer">Meal</div>
            <div className="mt-1 text-text">{guest.mealPreference ?? "—"}</div>
          </div>
        </div>

        <div>
          <div className="mb-1.5 text-xs uppercase tracking-wide text-text-dimmer">Status transitions</div>
          <div className="flex flex-wrap gap-2">
            {nextStatuses.length === 0 && <span className="text-text-dim">Visit complete.</span>}
            {nextStatuses.map((s) => (
              <Button key={s} variant="secondary" onClick={() => transition(s)} disabled={setStatus.isPending}>
                Mark {s}
              </Button>
            ))}
          </div>
        </div>

        {auditLog && auditLog.length > 0 && (
          <div>
            <div className="mb-1.5 text-xs uppercase tracking-wide text-text-dimmer">Audit trail</div>
            <ul className="max-h-32 space-y-1 overflow-y-auto text-xs text-text-dim">
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
