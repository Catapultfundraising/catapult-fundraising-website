import { NextRequest, NextResponse } from "next/server";

const GATES = [
  {
    matchPrefix: "/assets",
    loginPath: "/assets/login",
    apiPath: "/api/assets-login",
    cookieName: "catapult_assets_auth",
    passwordEnv: "ASSETS_PASSWORD",
    secretEnv: "ASSETS_AUTH_SECRET",
  },
  {
    matchPrefix: "/jag-dashboard",
    loginPath: "/jag-dashboard/login",
    apiPath: "/api/jag-login",
    cookieName: "catapult_jag_auth",
    passwordEnv: "JAG_DASHBOARD_PASSWORD",
    secretEnv: "JAG_DASHBOARD_AUTH_SECRET",
  },
];

async function expectedCookieValue(passwordEnv: string, secretEnv: string): Promise<string> {
  const password = process.env[passwordEnv] ?? "";
  const secret = process.env[secretEnv] ?? "";
  const enc = new TextEncoder();
  const data = enc.encode(`${password}:${secret}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const gate = GATES.find((g) => pathname.startsWith(g.matchPrefix));
  if (!gate) {
    return NextResponse.next();
  }

  // Never gate the login page itself or its API route.
  if (pathname.startsWith(gate.loginPath) || pathname.startsWith(gate.apiPath)) {
    return NextResponse.next();
  }

  const cookie = req.cookies.get(gate.cookieName)?.value;
  const expected = await expectedCookieValue(gate.passwordEnv, gate.secretEnv);

  if (cookie && expected && cookie === expected) {
    return NextResponse.next();
  }

  const loginUrl = new URL(gate.loginPath, req.url);
  loginUrl.searchParams.set("redirect", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/assets", "/assets/:path*", "/jag-dashboard", "/jag-dashboard/:path*"],
};
