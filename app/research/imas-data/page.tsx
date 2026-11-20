import { getImasSnapshot } from "@/lib/imas-data-store";
import { ImasDataDashboard } from "@/components/imas-data-dashboard";

export const metadata = { title: "IMAS Data Portal | Catapult Fundraising", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function ImasDataPage() {
  const data = await getImasSnapshot();
  if (!data) return <main className="mx-auto max-w-3xl p-10">IMAS data snapshot is not available yet.</main>;
  return <ImasDataDashboard data={data} />;
}
