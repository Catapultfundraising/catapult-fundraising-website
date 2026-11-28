import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { getStore } from "@/lib/campaign-platform/server";

export const dynamic = "force-dynamic";
// Catapult staff create client logins (no self sign-up). Requires the CP_ADMIN_TOKEN bearer token.
export async function POST(req: Request) {
  const want = process.env.CP_ADMIN_TOKEN ?? ""; const got = (req.headers.get("authorization") ?? "").replace(/^Bearer /, "");
  if (want.length < 24 || got.length !== want.length || !timingSafeEqual(Buffer.from(got), Buffer.from(want))) return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  const b = await req.json().catch(() => ({}));
  if (!b.email || !b.password || !/^[a-z0-9-]{2,64}$/.test(String(b.tenantId ?? ""))) return NextResponse.json({ error: "email, password, tenantId (a-z, 0-9, -) required" }, { status: 400 });
  try { await (await getStore()).createAccount(String(b.email), String(b.password), String(b.tenantId)); } catch (e) { return NextResponse.json({ error: (e as Error).message }, { status: 400 }); }
  return NextResponse.json({ ok: true });
}
