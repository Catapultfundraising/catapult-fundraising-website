import { getPvasSnapshot } from "@/lib/pvas-data-store";
import { PvasDataDashboard } from "@/components/pvas-data-dashboard";
import { pvasCanonicalEnabled, PVAS_SQL_ROUTING_MARKER } from "@/lib/portal-v2/pvas-canonical";

export const metadata = { title: "PVAS Data Portal | Catapult Fundraising", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function PvasDataPage() {
  const enabled = pvasCanonicalEnabled("pvas");
  const data = await getPvasSnapshot();
  return <>
    <meta name={PVAS_SQL_ROUTING_MARKER} content={enabled ? "1" : "0"} />
    {data ? <PvasDataDashboard data={data} /> : <main className="mx-auto max-w-3xl p-10">PVAS data snapshot is not available yet.</main>}
  </>;
}
