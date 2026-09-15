import { buildSummaryPdf } from "@/lib/study-summary-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The JAG weekly summary. The study is closed, so this renders the numbers the
// portal was delivered with and nothing refreshes them.
export async function GET() {
  return buildSummaryPdf("jag");
}
