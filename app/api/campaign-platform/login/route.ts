import { NextResponse } from "next/server";
import { getStore, secret, COOKIE, currentSession } from "@/lib/campaign-platform/server";
import { signSession } from "@/lib/campaign-platform/store";

export const dynamic = "force-dynamic";
export async function GET() { const s = await currentSession(); return NextResponse.json({ email: s?.email ?? null }); }
export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  const s = await (await getStore()).verify(String(b.email ?? ""), String(b.password ?? ""));
  if (!s) return NextResponse.json({ error: "Email or password not recognized" }, { status: 401 });
  const res = NextResponse.json({ email: s.email });
  res.cookies.set(COOKIE, signSession(s, secret()), { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 12 * 3600 });
  return res;
}
export async function DELETE() { const res = NextResponse.json({ ok: true }); res.cookies.delete(COOKIE); return res; }
