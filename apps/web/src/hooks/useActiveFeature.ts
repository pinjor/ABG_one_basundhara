import { useLocation, useSearchParams } from "react-router-dom";
import { findFeature, findModuleByPath } from "@bsc/shared";

export function useActiveFeature() {
  const location = useLocation();
  const [params] = useSearchParams();
  const featureKey = params.get("feature");
  const module = findModuleByPath(location.pathname);
  const feature = findFeature(location.pathname, featureKey);

  return { featureKey, feature, module };
}
