import { NextRequest, NextResponse } from "next/server";
import { buildBrandedXlsx } from "@/lib/jag-brand-xlsx";
import { reportRoute } from "@/lib/portal-v2/report-route";
import { QA_DATA, QA_STATE, QA_TRACKING } from "@/lib/portal-v2/report-qa-fixture";

// Local QA only: synthetic fixture through the real report route. 404 on any deployment or production build.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const make = (unavailable: boolean) => reportRoute("jag", async () => true, async () => QA_DATA as never, async () => QA_TRACKING,
  { clientName: "Synthetic Test Client", filePrefix: "QA", build: buildBrandedXlsx as never }, async () => (unavailable ? null : QA_STATE));
export async function POST(req: NextRequest, ctx: { params: Promise<{ client: string }> }) {
  if (process.env.NODE_ENV === "production" || process.env.VERCEL_ENV) return NextResponse.json({ error: "not found" }, { status: 404 });
  const { client } = await ctx.params;
  return make(client === "pvas").POST(req);
}
