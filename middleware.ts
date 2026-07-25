import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "catapult_assets_auth";

async function expectedCookieValue(): Promise<string> {
  const password = process.env.ASSETS_PASSWORD ?? "";
  const secret = process.env.ASSETS_AUTH_SECRET ?? "";
  const enc = new TextEncoder();
  const data = enc.encode(`${password}:${secret}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Never gate the login page itself or its API route.
  if (pathname.startsWith("/assets/login") || pathname.startsWith("/api/assets-login")) {
    return NextResponse.next();
  }

  const cookie = req.cookies.get(COOKIE_NAME)?.value;
  const expected = await expectedCookieValue();

  if (cookie && expected && cookie === expected) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/assets/login", req.url);
  loginUrl.searchParams.set("redirect", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/assets", "/assets/:path*"],
};
