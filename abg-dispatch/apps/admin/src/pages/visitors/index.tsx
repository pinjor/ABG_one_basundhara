/** Factory and office visitor management. App.tsx routes to the pages exported here; split into more files in this folder as needed. */
import { PageHeader } from "../../components/ui";

export function VisitorsPage() {
  return <PageHeader title="Factory Visitor Management" />;
}

export function VisitDetailPage() {
  return <PageHeader title="Visitor" />;
}

export function VisitorPassPage() {
  return <PageHeader title="Visitor gate pass" />;
}
