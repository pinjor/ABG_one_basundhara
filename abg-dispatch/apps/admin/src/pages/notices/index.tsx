/** The official notice board. App.tsx routes to the pages exported here; split into more files in this folder as needed. */
import { PageHeader } from "../../components/ui";

export function NoticesPage() {
  return <PageHeader title="Official Notice Board" />;
}

export function NoticeDetailPage() {
  return <PageHeader title="Notice" />;
}
