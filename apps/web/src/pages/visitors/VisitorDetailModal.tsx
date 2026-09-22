import { VisitorStatus } from "@bsc/shared";
import { Modal } from "../../components/ui/Modal";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { Button } from "../../components/ui/Button";
import { useVisitor, useVisitorAuditLog, useCheckInVisitor, useCheckOutVisitor } from "../../api/visitors";
import { useToast } from "../../components/ui/Toast";

export function VisitorDetailModal({ visitorId, onClose }: { visitorId: string | null; onClose: () => void }) {
  const { data: visitor } = useVisitor(visitorId);
  const { data: auditLog } = useVisitorAuditLog(visitorId);
  const checkIn = useCheckInVisitor();
  const checkOut = useCheckOutVisitor();
  const { push } = useToast();

  if (!visitorId || !visitor) return null;

  async function doCheckIn() {
    try {
      await checkIn.mutateAsync(visitor!.id);
      push(`${visitor!.name} checked in.`);
    } catch {
      push("Check-in failed.", "danger");
    }
  }

  async function doCheckOut() {
    try {
      await checkOut.mutateAsync(visitor!.id);
      push(`${visitor!.name} checked out.`);
    } catch {
      push("Check-out failed.", "danger");
    }
  }

  return (
    <Modal open={!!visitorId} onClose={onClose} title={visitor.name}>
      <div className="space-y-4 text-sm">
        <div className="flex items-center justify-between">
          <StatusBadge status={visitor.status} />
          <span className="text-text-dim">{visitor.category}{visitor.escortRequired ? " · Escort required" : ""}</span>
        </div>

        <div className="rounded-md bg-surface-2 p-3">
          <div className="text-xs uppercase text-text-dimmer">Host</div>
          <div className="text-text">{visitor.host}</div>
        </div>
        <div className="rounded-md bg-surface-2 p-3">
          <div className="text-xs uppercase text-text-dimmer">Purpose</div>
          <div className="text-text">{visitor.purpose}</div>
        </div>

        {visitor.checkInTime && (
          <div className="text-text-dim">Checked in: <span className="text-text">{new Date(visitor.checkInTime).toLocaleString()}</span></div>
        )}
        {visitor.checkOutTime && (
          <div className="text-text-dim">Checked out: <span className="text-text">{new Date(visitor.checkOutTime).toLocaleString()}</span></div>
        )}

        <div>
          <div className="mb-1.5 text-xs uppercase tracking-wide text-text-dimmer">QR visitor pass</div>
          <code className="block rounded-md bg-surface-2 px-3 py-1.5 text-xs text-text-dim">{visitor.qrPassCode}</code>
        </div>

        <div className="flex flex-wrap gap-2 border-t border-border-soft pt-3">
          {visitor.status === VisitorStatus.EXPECTED && (
            <Button variant="secondary" onClick={doCheckIn} disabled={checkIn.isPending}>Check in</Button>
          )}
          {visitor.status === VisitorStatus.CHECKED_IN && (
            <Button variant="secondary" onClick={doCheckOut} disabled={checkOut.isPending}>Check out</Button>
          )}
          {visitor.status === VisitorStatus.CHECKED_OUT && (
            <span className="text-text-dim">Visit complete.</span>
          )}
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
