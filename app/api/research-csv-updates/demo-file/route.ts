import { NextRequest, NextResponse } from "next/server";
import { isResearchAuthed } from "@/lib/research-auth";
import { demoAllowed } from "@/lib/portal-v2/csv-updates";

// Fictional demo CSV for local review only (404 in production / on Vercel).
export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  if (!demoAllowed()) return new NextResponse("Not found", { status: 404 });
  if (!process.env.RESEARCH_PASSWORD || !process.env.RESEARCH_AUTH_SECRET || !(await isResearchAuthed(req))) return new NextResponse("unauthorized", { status: 401 });
  const { DEMO_CSV } = await import("@/lib/portal-v2/csv-updates-demo");
  return new NextResponse(DEMO_CSV, { headers: { "content-type": "text/csv; charset=utf-8", "cache-control": "no-store" } });
}
