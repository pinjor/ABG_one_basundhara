import { Link } from "react-router-dom";
import { canWriteModule } from "@bsc/shared";
import { useDeskRecords, type DeskModule } from "../../api/desk";
import { useActiveFeature } from "../../hooks/useActiveFeature";
import { useAuthStore } from "../../store/auth";
import { ErrorState } from "../../components/ui/States";
import { apiErrorMessage } from "../../lib/apiError";
import { FeatureRegister } from "./FeatureRegister";

export function SpecModulePage() {
  const { module, feature } = useActiveFeature();
  const role = useAuthStore((s) => s.user?.role);
  const features = module?.features ?? [];
  const path = module?.path ?? "";
  const moduleKey = (module?.key ?? "finance") as DeskModule;
  const records = useDeskRecords(moduleKey);
  const counts = new Map<string, number>();
  for (const row of records.data ?? []) counts.set(row.featureKey, (counts.get(row.featureKey) ?? 0) + 1);
  const canWrite = canWriteModule(role, module?.key ?? "");

  return (
    <div>
      <header className="mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--brand-gold)]">{module?.label}</p>
        <h2 className="mt-1 font-display text-4xl uppercase text-[var(--brand-gold)]">{feature?.label ?? module?.label}</h2>
      </header>
      {feature ? (
        <>
          <FeatureRegister
            key={feature.key}
            module={moduleKey}
            featureKey={feature.key}
            featureLabel={feature.label}
            canWrite={canWrite}
          />
          <Link to={path} className="inline-flex min-h-11 items-center text-sm text-[var(--brand-gold)]">All features</Link>
        </>
      ) : records.isError ? (
        <ErrorState message={apiErrorMessage(records.error, "Could not load records.")} onRetry={() => void records.refetch()} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((item) => (
            <Link key={item.key} to={`${path}?feature=${item.key}`} className="panel block min-h-11 p-4">
              <span className="font-display text-lg uppercase">{item.label}</span>
              <span className="mt-1 block text-sm text-text-dim">{counts.get(item.key) ?? 0} records</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
