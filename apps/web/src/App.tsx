import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { NAV, COMMAND_CENTRE, canAccessModule, findModuleByPath, roleHomePath } from "@bsc/shared";
import { useAuthStore } from "./store/auth";
import { AppShell } from "./components/layout/AppShell";
import { useActiveFeature } from "./hooks/useActiveFeature";
import { FeatureWorkspace } from "./features/FeatureWorkspace";
import { ModuleHub } from "./features/ModuleHub";
import { Login } from "./pages/Login";
import { CommandCentre } from "./pages/CommandCentre";
import { ZonesPage } from "./pages/zones/ZonesPage";
import { FacilitiesPage } from "./pages/facilities/FacilitiesPage";
import { BookingsPage } from "./pages/bookings/BookingsPage";
import { MembershipPage } from "./pages/membership/MembershipPage";
import { GatesPage } from "./pages/gates/GatesPage";
import { VisitorsPage } from "./pages/visitors/VisitorsPage";
import { VipPage } from "./pages/vip/VipPage";
import { LoungesPage } from "./pages/lounges/LoungesPage";
import { OutletsPage } from "./pages/outlets/OutletsPage";
import { ParkingPage } from "./pages/parking/ParkingPage";
import { FleetPage } from "./pages/fleet/FleetPage";
import { SurfacesPage } from "./pages/surfaces/SurfacesPage";
import { CalendarPage } from "./pages/operations/CalendarPage";
import { TasksPage } from "./pages/operations/TasksPage";
import { ApprovalsPage } from "./pages/operations/ApprovalsPage";
import { PlaceholderModule } from "./pages/PlaceholderModule";
import { TicketsHome, EventsListPage } from "./pages/tickets/TicketsHome";
import { EventPage } from "./pages/tickets/EventPage";
import { CheckoutPage } from "./pages/tickets/CheckoutPage";
import { HelpPage, MyBookingsPage, OrderPage } from "./pages/tickets/OrderPages";
import { TicketingEventsPage, TicketingOrdersPage, TicketingOverview, TicketingPaymentsPage, TicketingReportsPage } from "./pages/ticketing/TicketingOps";
import { GateScanPage } from "./pages/ticketing/GateScanPage";

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

/** Built module pages, keyed by nav path. Anything not listed here falls back to the Phase-N placeholder. */
const MODULE_PAGES: Record<string, () => JSX.Element> = {
  "/zones": ZonesPage,
  "/facilities": FacilitiesPage,
  "/bookings": BookingsPage,
  "/membership": MembershipPage,
  "/gates": GatesPage,
  "/visitors": VisitorsPage,
  "/vip": VipPage,
  "/lounges": LoungesPage,
  "/outlets": OutletsPage,
  "/parking": ParkingPage,
  "/fleet": FleetPage,
  "/surfaces": SurfacesPage,
  "/calendar": CalendarPage,
  "/tasks": TasksPage,
  "/approvals": ApprovalsPage,
  "/ticketing": TicketingOverview,
  "/ticketing/events": TicketingEventsPage,
  "/ticketing/orders": TicketingOrdersPage,
  "/ticketing/payments": TicketingPaymentsPage,
  "/ticketing/scan": GateScanPage,
  "/ticketing/reports": TicketingReportsPage,
};

function RequireModule({ path, children }: { path: string; children: ReactNode }) {
  const role = useAuthStore((s) => s.user?.role);
  if (path === "/") return <>{children}</>;
  const module = findModuleByPath(path);
  if (module && !canAccessModule(role, module.key)) {
    return <Navigate to={roleHomePath(role)} replace />;
  }
  return <>{children}</>;
}

function ModulePage({ path, children }: { path: string; children: ReactNode }) {
  const { feature, featureKey } = useActiveFeature();
  const base = MODULE_TITLES[path] ?? "";
  const title = feature?.label ? `${base} · ${feature.label}` : base;
  const commandDesk = path === "/calendar" || path === "/tasks" || path === "/approvals" || path.startsWith("/ticketing");
  return (
    <AppShell title={title}>
      {path === "/" ? (
        children
      ) : commandDesk ? (
        children
      ) : featureKey ? (
        <FeatureWorkspace key={featureKey} />
      ) : (
        <ModuleHub />
      )}
    </AppShell>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/tickets" element={<TicketsHome />} />
      <Route path="/tickets/events" element={<EventsListPage />} />
      <Route path="/tickets/events/:id" element={<EventPage />} />
      <Route path="/tickets/orders/:reference/checkout" element={<CheckoutPage />} />
      <Route path="/tickets/orders/:reference" element={<OrderPage />} />
      <Route path="/tickets/my" element={<MyBookingsPage />} />
      <Route path="/tickets/help" element={<HelpPage />} />
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
      {NAV.flatMap((g) => g.modules).map((mod) => {
        const Page = MODULE_PAGES[mod.path];
        return (
          <Route
            key={mod.key}
            path={mod.path}
            element={
              <RequireAuth>
                <RequireModule path={mod.path}>
                  <ModulePage path={mod.path}>
                    {Page ? <Page /> : <PlaceholderModule label={mod.label} phase={mod.phase} />}
                  </ModulePage>
                </RequireModule>
              </RequireAuth>
            }
          />
        );
      })}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
