import { getBaqSnapshot } from "@/lib/baq-data-store";
import { BaqDataDashboard } from "@/components/baq-data-dashboard";

export const metadata = { title: "BAQ Data Portal | Catapult Fundraising", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function BaqDataPage() {
  const data = await getBaqSnapshot();
  if (!data) return <main className="mx-auto max-w-3xl p-10">BAQ data snapshot is not available yet.</main>;
  return <BaqDataDashboard data={data} />;
}
