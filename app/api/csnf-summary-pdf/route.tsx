import { buildSummaryPdf } from "@/lib/study-summary-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// CSNF's copy of the weekly summary PDF. A separate route so the middleware can
// put it behind the CSNF password rather than JAG's.
export async function GET() {
  return buildSummaryPdf("csnf");
}
