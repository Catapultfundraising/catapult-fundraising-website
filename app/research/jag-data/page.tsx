import { DashboardSnapshotUnavailable } from "@/components/dashboard-snapshot-unavailable";
import { getJagSnapshot } from "@/lib/jag-data-store";
import { JagDataDashboard } from "@/components/jag-data-dashboard";

export const metadata = { title: "JAG Data Portal | Catapult Fundraising", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function JagDataPage() {
  const data = await getJagSnapshot();
  if (!data) return <DashboardSnapshotUnavailable client="JAG" />;
  return <JagDataDashboard data={data} />;
}
