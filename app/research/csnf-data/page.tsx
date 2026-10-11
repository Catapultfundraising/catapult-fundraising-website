import { getCsnfSnapshot } from "@/lib/csnf-data-store";
import { CsnfDataDashboard } from "@/components/csnf-data-dashboard";

export const metadata = { title: "CSNF Donor Data | Catapult Fundraising", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function CsnfDataPage() {
  const data = await getCsnfSnapshot();
  if (!data) return <main className="mx-auto max-w-3xl p-10">CSNF data snapshot is not available yet.</main>;
  return <CsnfDataDashboard data={data} />;
}
