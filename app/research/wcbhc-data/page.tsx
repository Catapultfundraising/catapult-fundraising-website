import { getWcbhcSnapshot } from "@/lib/wcbhc-data-store";
import { WcbhcDataDashboard } from "@/components/wcbhc-data-dashboard";

export const metadata = { title: "WCBHC Data Portal | Catapult Fundraising", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function WcbhcDataPage() {
  const data = await getWcbhcSnapshot();
  if (!data) return <main className="mx-auto max-w-3xl p-10">WCBHC data snapshot is not available yet.</main>;
  return <WcbhcDataDashboard data={data} />;
}
