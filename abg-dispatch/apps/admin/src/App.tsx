import { useEffect, type ReactNode } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth, type Profile } from "./lib/auth";
import { api } from "./lib/api";
import { Layout } from "./components/Layout";
import { LoginPage } from "./pages/Login";
import { DashboardPage } from "./pages/Dashboard";
import { ExecutiveDashboardPage } from "./pages/ExecutiveDashboard";
import { TourDetailPage, ToursPage } from "./pages/tours";
import { CarRequisitionDetailPage, PoolCarPage, VehiclePassPage } from "./pages/fleet";
import { VisitDetailPage, VisitorPassPage, VisitorsPage } from "./pages/visitors";
import { LicenceDetailPage, LicencesPage } from "./pages/licences";
import { NoticeDetailPage, NoticesPage } from "./pages/notices";
import { ParcelsPage } from "./pages/Parcels";
import { ParcelDetailPage } from "./pages/ParcelDetail";
import { IncidentsPage } from "./pages/Incidents";
import { IncidentDetailPage } from "./pages/IncidentDetail";
import { AnalyticsPage } from "./pages/Analytics";
import { ReportsPage } from "./pages/Reports";
import { ConfigPage } from "./pages/Config";
import { PeoplePage } from "./pages/People";
import { AuditPage } from "./pages/Audit";
import { IntegrationsPage } from "./pages/Integrations";
import { SecurityPage } from "./pages/Security";
import { LabelPrintPage } from "./pages/LabelPrint";
import { QrLandingPage } from "./pages/QrLanding";

function RequireAuth({ children, bare }: { children: ReactNode; bare?: boolean }) {
  const token = useAuth((s) => s.accessToken);
  const enrollment = useAuth((s) => s.mfaEnrollmentRequired);
  const location = useLocation();
  // Keep the profile (roles, capabilities) fresh after role changes.
  const me = useQuery({ queryKey: ["me"], queryFn: () => api.get<Profile>("/auth/me"), enabled: !!token, staleTime: 60_000 });
  useEffect(() => {
    if (me.data) useAuth.getState().set({ profile: me.data });
  }, [me.data]);

  if (!token) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (enrollment && location.pathname !== "/security") return <Navigate to="/security" replace />;
  return bare ? <>{children}</> : <Layout>{children}</Layout>;
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/print/label/:id" element={<RequireAuth bare><LabelPrintPage /></RequireAuth>} />
      <Route path="/" element={<RequireAuth><ExecutiveDashboardPage /></RequireAuth>} />
      <Route path="/parcels/control-room" element={<RequireAuth><DashboardPage /></RequireAuth>} />
      <Route path="/parcels" element={<RequireAuth><ParcelsPage /></RequireAuth>} />
      <Route path="/parcels/:id" element={<RequireAuth><ParcelDetailPage /></RequireAuth>} />
      <Route path="/incidents" element={<RequireAuth><IncidentsPage /></RequireAuth>} />
      <Route path="/incidents/:id" element={<RequireAuth><IncidentDetailPage /></RequireAuth>} />
      <Route path="/tours" element={<RequireAuth><ToursPage /></RequireAuth>} />
      <Route path="/tours/:id" element={<RequireAuth><TourDetailPage /></RequireAuth>} />
      <Route path="/pool-car" element={<RequireAuth><PoolCarPage /></RequireAuth>} />
      <Route path="/pool-car/pass/:token" element={<RequireAuth><VehiclePassPage /></RequireAuth>} />
      <Route path="/pool-car/:id" element={<RequireAuth><CarRequisitionDetailPage /></RequireAuth>} />
      <Route path="/visitors" element={<RequireAuth><VisitorsPage /></RequireAuth>} />
      <Route path="/visitors/pass/:token" element={<RequireAuth><VisitorPassPage /></RequireAuth>} />
      <Route path="/visitors/:id" element={<RequireAuth><VisitDetailPage /></RequireAuth>} />
      <Route path="/licences" element={<RequireAuth><LicencesPage /></RequireAuth>} />
      <Route path="/licences/:id" element={<RequireAuth><LicenceDetailPage /></RequireAuth>} />
      <Route path="/notices" element={<RequireAuth><NoticesPage /></RequireAuth>} />
      <Route path="/notices/:id" element={<RequireAuth><NoticeDetailPage /></RequireAuth>} />
      <Route path="/analytics" element={<RequireAuth><AnalyticsPage /></RequireAuth>} />
      <Route path="/reports" element={<RequireAuth><ReportsPage /></RequireAuth>} />
      <Route path="/config" element={<RequireAuth><ConfigPage /></RequireAuth>} />
      <Route path="/people" element={<RequireAuth><PeoplePage /></RequireAuth>} />
      <Route path="/audit" element={<RequireAuth><AuditPage /></RequireAuth>} />
      <Route path="/integrations" element={<RequireAuth><IntegrationsPage /></RequireAuth>} />
      <Route path="/q/:token" element={<RequireAuth><QrLandingPage /></RequireAuth>} />
      <Route path="/security" element={<RequireAuth><SecurityPage /></RequireAuth>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
