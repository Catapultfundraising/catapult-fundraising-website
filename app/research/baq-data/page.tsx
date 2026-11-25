import { DashboardSnapshotUnavailable } from "@/components/dashboard-snapshot-unavailable";
import { getBaqSnapshot } from "@/lib/baq-data-store";
import { BaqDataDashboard } from "@/components/baq-data-dashboard";

export const metadata = { title: "BAQ Data Portal | Catapult Fundraising", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function BaqDataPage() {
  const data = await getBaqSnapshot();
  if (!data) return <DashboardSnapshotUnavailable client="BAQ" />;
  return <BaqDataDashboard data={data} />;
}
