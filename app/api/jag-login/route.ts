import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "catapult_jag_auth";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

async function expectedCookieValue(): Promise<string> {
  const password = process.env.JAG_DASHBOARD_PASSWORD ?? "";
  const secret = process.env.JAG_DASHBOARD_AUTH_SECRET ?? "";
  const enc = new TextEncoder();
  const data = enc.encode(`${password}:${secret}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const submitted = typeof body?.password === "string" ? body.password : "";
  const correctPassword = process.env.JAG_DASHBOARD_PASSWORD ?? "";

  if (!correctPassword || submitted !== correctPassword) {
    return NextResponse.json({ ok: false, error: "Incorrect password." }, { status: 401 });
  }

  const value = await expectedCookieValue();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, value, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
  return res;
}
