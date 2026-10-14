import { getPvasSnapshot } from "@/lib/pvas-data-store";
import { PvasDataDashboard } from "@/components/pvas-data-dashboard";

export const metadata = { title: "PVAS Data Portal | Catapult Fundraising", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function PvasDataPage() {
  const data = await getPvasSnapshot();
  if (!data) return <main className="mx-auto max-w-3xl p-10">PVAS data snapshot is not available yet.</main>;
  return <PvasDataDashboard data={data} />;
}
