import { NextResponse } from "next/server";
import { getStore, currentSession } from "@/lib/campaign-platform/server";
import type { TenantRecord } from "@/lib/campaign-platform/tenant";

export const dynamic = "force-dynamic";
// The tenant always comes from the signed session, never from the request.
export async function GET() {
  const s = await currentSession(); if (!s) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  return NextResponse.json({ campaigns: await (await getStore()).listCampaigns(s) });
}
export async function POST(req: Request) {
  const s = await currentSession(); if (!s) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const c = (await req.json().catch(() => null)) as TenantRecord | null;
  if (!c || typeof c.id !== "string" || !c.id || c.id.length > 64 || typeof c.name !== "string" || !Array.isArray(c.gifts)) return NextResponse.json({ error: "Invalid campaign" }, { status: 400 });
  await (await getStore()).saveCampaign(s, c);
  return NextResponse.json({ ok: true });
}
