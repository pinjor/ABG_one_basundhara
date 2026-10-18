import { MEMBER_STATUS_TRANSITIONS, MemberStatus } from "@bsc/shared";
import { Modal } from "../../components/ui/Modal";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { Button } from "../../components/ui/Button";
import { useMember, useMemberAuditLog, useSetMemberStatus, useCheckInMember, useRenewMember } from "../../api/members";
import { useToast } from "../../components/ui/Toast";

export function MemberDetailModal({ memberId, onClose }: { memberId: string | null; onClose: () => void }) {
  const { data: member } = useMember(memberId);
  const { data: auditLog } = useMemberAuditLog(memberId);
  const setStatus = useSetMemberStatus();
  const checkIn = useCheckInMember();
  const renew = useRenewMember();
  const { push } = useToast();

  if (!memberId || !member) return null;

  const nextStatuses = MEMBER_STATUS_TRANSITIONS[member.status] ?? [];
  const isExpired = new Date(member.expiryDate) < new Date();

  async function transition(status: string) {
    try {
      await setStatus.mutateAsync({ id: member!.id, status });
      push(`${member!.name} moved to ${status}.`);
    } catch {
      push("That transition isn't allowed from the current status.", "danger");
    }
  }

  async function doCheckIn() {
    try {
      await checkIn.mutateAsync(member!.id);
      push(`${member!.name} checked in.`);
    } catch (err: any) {
      push(err?.response?.data?.message ?? "Check-in failed.", "danger");
    }
  }

  async function doRenew() {
    try {
      await renew.mutateAsync({ id: member!.id });
      push(`${member!.name}'s membership renewed.`);
    } catch {
      push("Renewal failed.", "danger");
    }
  }

  return (
    <Modal open={!!memberId} onClose={onClose} title={member.name}>
      <div className="space-y-4 text-sm">
        <div className="flex items-center justify-between">
          <StatusBadge status={member.status} />
          <span className="text-text-dim">{member.tier} · {member.email}</span>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-md bg-surface-2 p-3">
            <div className="text-xs uppercase text-text-dimmer">Expiry date</div>
            <div className={`font-display text-lg ${isExpired ? "text-red" : "text-text"}`}>
              {new Date(member.expiryDate).toLocaleDateString()}
            </div>
          </div>
          <div className="rounded-md bg-surface-2 p-3">
            <div className="text-xs uppercase text-text-dimmer">Check-ins</div>
            <div className="font-display text-lg text-text">{member.checkInCount}</div>
          </div>
        </div>

        {member.lockerId && (
          <div className="text-text-dim">Locker: <span className="text-text">{member.lockerId}</span></div>
        )}
        {member.lastCheckIn && (
          <div className="text-text-dim">Last check-in: <span className="text-text">{new Date(member.lastCheckIn).toLocaleString()}</span></div>
        )}

        <div className="flex flex-wrap gap-2 border-t border-border-soft pt-3">
          <Button variant="secondary" onClick={doCheckIn} disabled={checkIn.isPending || member.status !== MemberStatus.ACTIVE}>
            Check in
          </Button>
          <Button variant="secondary" onClick={doRenew} disabled={renew.isPending}>
            Renew membership
          </Button>
        </div>

        <div>
          <div className="mb-1.5 text-xs uppercase tracking-wide text-text-dimmer">Status transitions</div>
          <div className="flex flex-wrap gap-2">
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
      </div>
    </Modal>
  );
}
