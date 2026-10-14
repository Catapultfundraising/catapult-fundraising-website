import { NextRequest, NextResponse } from "next/server";
import { WCBHC_DATA_COOKIE, wcbhcDataCookieValue } from "@/lib/wcbhc-data-auth";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const submitted = typeof body?.password === "string" ? body.password : "";
  const correct = process.env.WCBHC_DATA_PASSWORD ?? "";
  if (!correct || submitted !== correct) {
    return NextResponse.json({ ok: false, error: "Incorrect password." }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(WCBHC_DATA_COOKIE, await wcbhcDataCookieValue(), { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
  return res;
}
