/** Official tour requests. App.tsx routes to the pages exported here; split into more files in this folder as needed. */
import { PageHeader } from "../../components/ui";

export function ToursPage() {
  return <PageHeader title="Official Tour Requests" />;
}

export function TourDetailPage() {
  return <PageHeader title="Tour request" />;
}
