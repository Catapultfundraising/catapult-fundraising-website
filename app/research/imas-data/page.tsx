import { DashboardSnapshotUnavailable } from "@/components/dashboard-snapshot-unavailable";
import { getImasSnapshot } from "@/lib/imas-data-store";
import { ImasDataDashboard } from "@/components/imas-data-dashboard";

export const metadata = { title: "IMAS Data Portal | Catapult Fundraising", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function ImasDataPage() {
  const data = await getImasSnapshot();
  if (!data) return <DashboardSnapshotUnavailable client="IMAS" />;
  return <ImasDataDashboard data={data} />;
}
