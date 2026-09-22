import { useState } from "react";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { Field, TextInput } from "../../components/ui/Field";
import { useParkingZone, useVehicleEntry, useVehicleExit } from "../../api/parking";
import { useToast } from "../../components/ui/Toast";

export function ParkingZoneDetailModal({ zoneId, onClose }: { zoneId: string | null; onClose: () => void }) {
  const { data: zone } = useParkingZone(zoneId);
  const vehicleEntry = useVehicleEntry();
  const vehicleExit = useVehicleExit();
  const { push } = useToast();
  const [plate, setPlate] = useState("");

  if (!zoneId || !zone) return null;

  async function doEntry() {
    if (!plate.trim()) return;
    try {
      await vehicleEntry.mutateAsync({ id: zone!.id, plateNumber: plate, type: zone!.type });
      push(`${plate} entered ${zone!.name}.`);
      setPlate("");
    } catch (err: any) {
      push(err?.response?.data?.message ?? "Entry failed.", "danger");
    }
  }

  async function doExit(plateNumber: string) {
    try {
      await vehicleExit.mutateAsync({ id: zone!.id, plateNumber });
      push(`${plateNumber} exited ${zone!.name}.`);
    } catch {
      push("Exit failed.", "danger");
    }
  }

  const pct = zone.capacity > 0 ? Math.round((zone.occupied / zone.capacity) * 100) : 0;

  return (
    <Modal open={!!zoneId} onClose={onClose} title={zone.name}>
      <div className="space-y-4 text-sm">
        <div className="rounded-md bg-surface-2 p-3">
          <div className="text-xs uppercase text-text-dimmer">Occupancy</div>
          <div className="font-display text-2xl text-text">{zone.occupied} / {zone.capacity} ({pct}%)</div>
        </div>

        <div className="rounded-md border border-border-soft p-3">
          <div className="mb-2 text-xs uppercase tracking-wide text-text-dimmer">Vehicle entry</div>
          <div className="flex gap-2">
            <TextInput placeholder="Plate number" value={plate} onChange={(e) => setPlate(e.target.value)} />
            <Button onClick={doEntry} disabled={vehicleEntry.isPending || !plate.trim() || zone.occupied >= zone.capacity}>
              Log entry
            </Button>
          </div>
          {zone.occupied >= zone.capacity && <p className="mt-2 text-xs text-red">Zone is at full capacity.</p>}
        </div>

        <div>
          <div className="mb-1.5 text-xs uppercase tracking-wide text-text-dimmer">Vehicles currently parked</div>
          <ul className="max-h-48 space-y-1.5 overflow-y-auto">
            {zone.vehicleLogs?.length === 0 && <p className="text-xs text-text-dimmer">No vehicles currently parked.</p>}
            {zone.vehicleLogs?.map((log: any) => (
              <li key={log.id} className="flex items-center justify-between rounded-md bg-surface-2 px-3 py-1.5">
                <span className="text-text">{log.plateNumber}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-dimmer">{new Date(log.entryTime).toLocaleTimeString()}</span>
                  <Button variant="secondary" className="px-2 py-1 text-xs" onClick={() => doExit(log.plateNumber)} disabled={vehicleExit.isPending}>
                    Exit
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Modal>
  );
}
