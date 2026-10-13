import { getJagSnapshot } from "@/lib/jag-data-store";
import { JagDataDashboard } from "@/components/jag-data-dashboard";

export const metadata = { title: "JAG Data Portal | Catapult Fundraising", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function JagDataPage() {
  const data = await getJagSnapshot();
  if (!data) return <main className="mx-auto max-w-3xl p-10">JAG data snapshot is not available yet.</main>;
  return <JagDataDashboard data={data} />;
}
