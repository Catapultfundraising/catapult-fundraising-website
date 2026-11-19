import { pvasCanonicalEnabled } from "@/lib/portal-v2/pvas-canonical";
import { readyFailureStage, readyFailureDetails } from "@/lib/dashboard-ready-cache.server";
import { cacheTtlMs } from "@/lib/pvas-shared-cache.server";
import { NextRequest, NextResponse } from "next/server";
import { READY_CLIENTS, readyClient, refreshDashboardReady } from "@/lib/dashboard-ready.server";
export const runtime = "nodejs", dynamic = "force-dynamic", maxDuration = 300;
async function refresh(req: NextRequest, manual: boolean) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const preview = process.env.VERCEL_ENV === "preview";
  if (preview && (!manual || req.headers.get("x-dashboard-ready-prewarm") !== "1"))
    return NextResponse.json({ error: "Preview publication requires explicit authenticated prewarm" }, { status: 403 });
  if (cacheTtlMs() === 0 || !(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID))
    return NextResponse.json({ ok: true, mode: "uncached", outcomes: [] }, { headers: { "Cache-Control": "no-store" } });
  const selected = req.nextUrl.searchParams.get("client");
  if (selected && !readyClient(selected)) return NextResponse.json({ error: "Unknown dashboard" }, { status: 400 });
  const clients = selected ? [selected as typeof READY_CLIENTS[number]] : READY_CLIENTS;
  const outcomes = await Promise.all(clients.map(async client => {
    if (client === "pvas" && !pvasCanonicalEnabled(client)) return { client, status: "owner-mode-disabled" };
    try { await refreshDashboardReady(client, preview && manual); return { client, status: "ready" }; }
    catch (error) { return { client, status: "refresh-failed", stage: readyFailureStage(error) ?? "unavailable",
      details: readyFailureDetails(error) }; }
  }));
  return NextResponse.json({ ok: outcomes.every(x => x.status === "ready"), outcomes },
    { status: outcomes.every(x => x.status === "ready") ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
export const GET = (req: NextRequest) => refresh(req, false);
export const POST = (req: NextRequest) => refresh(req, true);
