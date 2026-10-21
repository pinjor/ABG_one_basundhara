/** Pool car requisitions and the fleet register. App.tsx routes to the pages exported here; split into more files in this folder as needed. */
import { PageHeader } from "../../components/ui";

export function PoolCarPage() {
  return <PageHeader title="Pool Car Requisition" />;
}

export function CarRequisitionDetailPage() {
  return <PageHeader title="Pool car request" />;
}

export function VehiclePassPage() {
  return <PageHeader title="Vehicle gate pass" />;
}
