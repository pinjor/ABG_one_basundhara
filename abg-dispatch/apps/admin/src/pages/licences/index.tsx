/** The regulatory licence register. App.tsx routes to the pages exported here; split into more files in this folder as needed. */
import { PageHeader } from "../../components/ui";

export function LicencesPage() {
  return <PageHeader title="Regulatory Licence Register" />;
}

export function LicenceDetailPage() {
  return <PageHeader title="Licence" />;
}
