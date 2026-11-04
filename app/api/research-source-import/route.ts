import type { NextRequest } from "next/server";
import { handleResearchSourceImport, prodDeps } from "@/lib/portal-v2/research-source-import-handler";

// Staff-only source CSV reconciliation (/research/source-import). Raw source writes stay OFF until a reviewed
// transport/migration and real-SQL acceptance exist. Logic lives in lib/portal-v2/research-source-import-handler.ts;
// this route always passes the real per-request production deps.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Engage /api/source-import has maxDuration 120 s and each request is capped by write statements (~45 s measured budget);
// this route waits up to 125 s for Engage (then reports UNCONFIRMED, never success) and must outlive that wait.
export const maxDuration = 150;

export async function POST(req: NextRequest) {
  return handleResearchSourceImport(req, prodDeps());
}
