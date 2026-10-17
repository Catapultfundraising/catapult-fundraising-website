import { NextRequest, NextResponse } from "next/server";
import { catapultClient } from "@/lib/board-review/server";

// Tells a dashboard whether the viewer is Catapult staff (employee dashboard login),
// using the same check as the board-review admin API.
export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  const c = await catapultClient(req, req.nextUrl.searchParams.get("client"));
  return NextResponse.json({ staff: !!c }, { headers: { "Cache-Control": "no-store" } });
}
