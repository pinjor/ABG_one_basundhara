import { useState } from "react";
import { ZoneType, ZoneStatus, Role, type ZoneDto } from "@bsc/shared";
import { ModuleHeader } from "../../components/layout/ModuleHeader";
import { Button } from "../../components/ui/Button";
import { SelectInput, TextInput } from "../../components/ui/Field";
import { DataTable, type Column } from "../../components/ui/DataTable";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { StatTile } from "../../components/ui/StatTile";
import { useZones } from "../../api/zones";
import { useAuthStore } from "../../store/auth";
import { ZoneMap } from "./ZoneMap";
import { ZoneFormModal } from "./ZoneFormModal";
import { ZoneDetailModal } from "./ZoneDetailModal";

export function ZonesPage() {
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<ZoneDto | null>(null);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);

  const { data: zones = [], isLoading } = useZones({ type: type || undefined, status: status || undefined, search: search || undefined });
  const role = useAuthStore((s) => s.user?.role);
  const canManage = role === Role.SUPER_ADMIN || role === Role.VENUE_FACILITY_MANAGER;

  const totalCapacity = zones.reduce((sum, z) => sum + z.capacity, 0);
  const totalOccupancy = zones.reduce((sum, z) => sum + z.liveOccupancy, 0);
  const restrictedCount = zones.filter((z) => z.status === ZoneStatus.RESTRICTED).length;

  const columns: Column<ZoneDto>[] = [
    { header: "Zone", accessor: (z) => <span className="font-medium">{z.name}</span> },
    { header: "Type", accessor: (z) => z.type },
    { header: "Building", accessor: (z) => z.building ?? "—" },
    { header: "Capacity", accessor: (z) => z.capacity.toLocaleString() },
    {
      header: "Occupancy",
      accessor: (z) => (z.capacity > 0 ? `${Math.round((z.liveOccupancy / z.capacity) * 100)}%` : "—"),
    },
    { header: "Status", accessor: (z) => <StatusBadge status={z.status} /> },
  ];

  return (
    <div>
      <ModuleHeader
        purpose="Complex master data, zones and the indoor/outdoor map — the backbone every other module references."
        action={canManage && <Button onClick={() => setCreateOpen(true)}>+ New zone</Button>}
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Total zones" value={zones.length} tone="gold" />
        <StatTile label="Total capacity" value={totalCapacity} />
        <StatTile label="Live occupancy" value={totalOccupancy} tone="teal" />
        <StatTile label="Restricted zones" value={restrictedCount} tone="red" />
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ZoneMap zones={zones} onSelect={(z) => setSelectedZoneId(z.id)} />
        </div>
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
          <h3 className="font-display text-base font-semibold text-text">Filters</h3>
          <TextInput placeholder="Search zones…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <SelectInput value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">All types</option>
            {Object.values(ZoneType).map((t) => <option key={t} value={t}>{t}</option>)}
          </SelectInput>
          <SelectInput value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            {Object.values(ZoneStatus).map((s) => <option key={s} value={s}>{s}</option>)}
          </SelectInput>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-text-dim">Loading zones…</p>
      ) : (
        <DataTable columns={columns} rows={zones} keyFor={(z) => z.id} onRowClick={(z) => setSelectedZoneId(z.id)} />
      )}

      <ZoneFormModal open={createOpen} onClose={() => setCreateOpen(false)} />
      <ZoneFormModal
        open={!!editingZone}
        onClose={() => setEditingZone(null)}
        zone={editingZone}
      />
      <ZoneDetailModal
        zoneId={selectedZoneId}
        onClose={() => setSelectedZoneId(null)}
        onEdit={() => {
          const z = zones.find((zz) => zz.id === selectedZoneId) ?? null;
          setEditingZone(z);
          setSelectedZoneId(null);
        }}
      />
    </div>
  );
}
