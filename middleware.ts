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
  {
    // Same gate as /jag-dashboard: the printable PDF summary contains the
    // same private interview data, so it needs the same cookie check rather
    // than being reachable directly by anyone who guesses the URL.
    matchPrefix: "/api/jag-summary-pdf",
    loginPath: "/jag-dashboard/login",
    apiPath: "/api/jag-login",
    cookieName: "catapult_jag_auth",
    passwordEnv: "JAG_DASHBOARD_PASSWORD",
    secretEnv: "JAG_DASHBOARD_AUTH_SECRET",
  },
  {
    // Separate, internal-only tool where the data manager uploads the
    // weekly report + survey files. Uses its own password (JAG_ADMIN_PASSWORD)
    // — deliberately NOT the same as JAG_DASHBOARD_PASSWORD, since the
    // client (who has the dashboard password) must never be able to reach
    // this page or edit the data behind it.
    matchPrefix: "/jag-admin",
    loginPath: "/jag-admin/login",
    apiPath: "/api/jag-admin-login",
    cookieName: "catapult_jag_admin_auth",
    passwordEnv: "JAG_ADMIN_PASSWORD",
    secretEnv: "JAG_ADMIN_AUTH_SECRET",
  },
  {
    matchPrefix: "/research",
    loginPath: "/research/login",
    apiPath: "/api/research-login",
    cookieName: "catapult_research_auth",
    passwordEnv: "RESEARCH_PASSWORD",
    secretEnv: "RESEARCH_AUTH_SECRET",
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

  // HubSpot's SEO crawl flagged several pages (homepage, /apply,
  // /data-privacy, /cookie-policy, /sms-terms) as reachable over plain
  // HTTP. Vercel terminates TLS and normally redirects bare HTTP requests
  // at the edge, but we enforce it here too as a belt-and-suspenders check
  // so every page — including ones fetched by crawlers that hit the origin
  // directly — always redirects to the HTTPS canonical URL.
  const proto = req.headers.get("x-forwarded-proto");
  if (proto === "http") {
    const httpsUrl = new URL(req.url);
    httpsUrl.protocol = "https:";
    return NextResponse.redirect(httpsUrl, 308);
  }

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
  matcher: [
    // Run on every page/route (except static assets & the Next internals)
    // so the HTTPS check above applies site-wide, not just on gated paths.
    "/((?!_next/static|_next/image|favicon.ico|apple-icon.png|icon.png).*)",
  ],
};
