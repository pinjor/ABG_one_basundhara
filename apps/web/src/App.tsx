import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { NAV, COMMAND_CENTRE } from "@bsc/shared";
import { useAuthStore } from "./store/auth";
import { AppShell } from "./components/layout/AppShell";
import { Login } from "./pages/Login";
import { CommandCentre } from "./pages/CommandCentre";
import { ZonesPage } from "./pages/zones/ZonesPage";
import { FacilitiesPage } from "./pages/facilities/FacilitiesPage";
import { PlaceholderModule } from "./pages/PlaceholderModule";

function RequireAuth({ children }: { children: ReactNode }) {
  const token = useAuthStore((s) => s.token);
  const location = useLocation();
  if (!token) return <Navigate to="/login" state={{ from: location }} replace />;
  return <>{children}</>;
}

const MODULE_TITLES: Record<string, string> = {
  [COMMAND_CENTRE.path]: COMMAND_CENTRE.label,
};
for (const group of NAV) {
  for (const mod of group.modules) {
    MODULE_TITLES[mod.path] = mod.label;
  }
}

function ModulePage({ path, children }: { path: string; children: ReactNode }) {
  return <AppShell title={MODULE_TITLES[path] ?? ""}>{children}</AppShell>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <ModulePage path="/">
              <CommandCentre />
            </ModulePage>
          </RequireAuth>
        }
      />
      <Route
        path="/zones"
        element={
          <RequireAuth>
            <ModulePage path="/zones">
              <ZonesPage />
            </ModulePage>
          </RequireAuth>
        }
      />
      <Route
        path="/facilities"
        element={
          <RequireAuth>
            <ModulePage path="/facilities">
              <FacilitiesPage />
            </ModulePage>
          </RequireAuth>
        }
      />
      {NAV.flatMap((g) => g.modules)
        .filter((m) => m.phase > 1)
        .map((mod) => (
          <Route
            key={mod.key}
            path={mod.path}
            element={
              <RequireAuth>
                <ModulePage path={mod.path}>
                  <PlaceholderModule label={mod.label} phase={mod.phase} />
                </ModulePage>
              </RequireAuth>
            }
          />
        ))}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
