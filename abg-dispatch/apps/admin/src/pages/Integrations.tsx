import { useQuery } from "@tanstack/react-query";
import { Bell, Database, HardDrive, MessageSquareText, RefreshCw, Timer, Truck, type LucideIcon } from "lucide-react";
import { api } from "../lib/api";
import { ago } from "../lib/format";
import { Card, ErrorNote, HealthBadge, PageHeader, Pill, Spinner } from "../components/ui";

interface Health {
  services: { key: string; name: string; status: string; detail: string }[];
  couriers: { id: string; code: string; name: string; enabled: boolean; apiEnabled: boolean; webhookEnabled: boolean; webhookSecretConfigured: boolean; status: string; detail: string | null; checkedAt: string | null; events24h: Record<string, number> }[];
}

const ICON: Record<string, LucideIcon> = { database: Database, storage: HardDrive, fcm: Bell, sms: MessageSquareText, sla: Timer };

export function IntegrationsPage() {
  const q = useQuery({ queryKey: ["admin", "integrations"], queryFn: () => api.get<Health>("/admin/integrations"), refetchInterval: 60_000 });
  return (
    <div className="space-y-6">
      <PageHeader
        overline="Administration"
        title="Integrations"
        subtitle="Health of the services ABG ONE depends on. Counts cover the last 24 hours."
        actions={
          <button className="btn-secondary" onClick={() => q.refetch()} disabled={q.isFetching}>
            <RefreshCw className={`h-4 w-4 ${q.isFetching ? "animate-spin" : ""}`} /> Refresh
          </button>
        }
      />
      <ErrorNote error={q.error} />
      {!q.data ? (
        <Spinner />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {q.data.services.map((s) => {
              const Icon = ICON[s.key] ?? Database;
              return (
                <div key={s.key} className="card p-4">
                  <div className="flex items-center justify-between">
                    <span className="grid h-9 w-9 place-items-center rounded-lg bg-navy text-platinum">
                      <Icon className="h-4 w-4" />
                    </span>
                    <HealthBadge status={s.status} />
                  </div>
                  <p className="mt-3 text-sm font-semibold text-navy">{s.name}</p>
                  <p className="mt-0.5 text-xs leading-snug text-ink-muted">{s.detail}</p>
                </div>
              );
            })}
          </div>
          <Card title="Courier companies" padded={false}>
            <ul className="divide-y divide-line">
              {q.data.couriers.map((c) => (
                <li key={c.id} className="grid gap-3 px-5 py-4 md:grid-cols-[1.2fr_1fr_1.2fr] md:items-center">
                  <div className="flex items-center gap-3">
                    <span className="grid h-9 w-9 place-items-center rounded-lg bg-platinum-bright text-navy-500">
                      <Truck className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-navy">{c.name}</p>
                      <p className="mono text-[11px] text-ink-subtle">{c.code}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <HealthBadge status={c.status} />
                    {c.webhookEnabled && <Pill tone={c.webhookSecretConfigured ? "success" : "danger"}>{c.webhookSecretConfigured ? "Webhook secret set" : "Webhook secret missing"}</Pill>}
                    {c.apiEnabled && <Pill tone="active">API polling</Pill>}
                  </div>
                  <div className="text-xs text-ink-muted">
                    {Object.keys(c.events24h).length ? (
                      <span className="flex flex-wrap gap-1.5">
                        {Object.entries(c.events24h).map(([k, n]) => (
                          <Pill key={k} tone={k === "APPLIED" ? "success" : k === "REJECTED" || k === "INVALID_SIGNATURE" ? "danger" : "neutral"}>
                            {k.replace(/_/g, " ").toLowerCase()}: {n}
                          </Pill>
                        ))}
                      </span>
                    ) : (
                      "No courier updates in 24 h"
                    )}
                    {c.detail && <p className="mt-1">{c.detail}</p>}
                    {c.checkedAt && <p className="mt-0.5 text-ink-subtle">Checked {ago(c.checkedAt)}</p>}
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}
    </div>
  );
}
