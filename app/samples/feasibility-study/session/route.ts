import { NextRequest, NextResponse } from "next/server";
import { samplePasswordValid, sampleToken, SAMPLE_TTL } from "@/lib/feasibility-sample-auth";
import { SAMPLE_COOKIE, SAMPLE_PATH } from "@/lib/feasibility-sample";
export const runtime = "nodejs";
// Best-effort abuse friction only; not a replacement for edge rate limiting.
const attempts = new Map<string, { count: number; until: number }>();
export async function POST(req: NextRequest) {
  const headers = { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow, noarchive" };
  if (req.headers.get("origin") !== req.nextUrl.origin) return NextResponse.json({ ok: false }, { status: 403, headers });
  if (Number(req.headers.get("content-length")) > 2048) return NextResponse.json({ ok: false }, { status: 413, headers });
  const key = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const now = Date.now();
  for (const [k, v] of attempts) if (v.until <= now) attempts.delete(k);
  if (attempts.size > 10000) return NextResponse.json({ ok: false }, { status: 429, headers });
  const entry = attempts.get(key) || { count: 0, until: now + 60000 };
  if (++entry.count > 10) return NextResponse.json({ ok: false }, { status: 429, headers });
  attempts.set(key, entry);
  const text = await req.text();
  if (text.length > 2048) return NextResponse.json({ ok: false }, { status: 413, headers });
  let body; try { body = JSON.parse(text); } catch { return NextResponse.json({ ok: false }, { status: 400, headers }); }
  if (typeof body?.password !== "string" || !samplePasswordValid(body.password)) return NextResponse.json({ ok: false }, { status: 401, headers });
  const token = sampleToken();
  if (!token) return NextResponse.json({ ok: false }, { status: 503, headers });
  const res = NextResponse.json({ ok: true }, { headers });
  res.cookies.set(SAMPLE_COOKIE, token, { httpOnly: true, secure: true, sameSite: "strict", path: SAMPLE_PATH, maxAge: SAMPLE_TTL });
  return res;
}
