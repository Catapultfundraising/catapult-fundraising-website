// LOCAL FICTIONAL QA HARNESS ONLY (W0 rendered checks). 404 unless demoAllowed(): NODE_ENV!=production, no VERCEL_ENV,
// CSV_UPDATES_DEMO=1. Renders the shared portal gift table; the QA script intercepts /api/wcbhc-data-v2 with fictional data.
import { notFound } from "next/navigation";
import { demoAllowed } from "@/lib/portal-v2/csv-updates";
import { GiftEditDemo } from "./demo";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

export default function Page() {
  if (!demoAllowed()) notFound();
  return <main className="mx-auto max-w-6xl p-4 md:p-8"><GiftEditDemo /></main>;
}
