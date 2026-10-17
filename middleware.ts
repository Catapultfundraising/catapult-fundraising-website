import { isResearchAuthed as brStaff } from "@/lib/research-auth";
import { isJagCookieValid, JAG_DATA_COOKIE } from "@/lib/jag-data-auth";
import { isPvasCookieValid, PVAS_DATA_COOKIE } from "@/lib/pvas-data-auth";
import { isWcbhcCookieValid, WCBHC_DATA_COOKIE } from "@/lib/wcbhc-data-auth";
import { isBaqCookieValid, BAQ_DATA_COOKIE } from "@/lib/baq-data-auth";
import { isCsnfCookieValid, CSNF_DATA_COOKIE } from "@/lib/csnf-data-auth";
import { BR_MEMBER_COOKIE, verifyMemberToken } from "@/lib/board-review/auth";
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
    // Same gate as /csnf-dashboard, for the same reason as the JAG PDF above:
    // the printable summary holds the same private interview data.
    matchPrefix: "/api/csnf-summary-pdf",
    loginPath: "/csnf-dashboard/login",
    apiPath: "/api/csnf-login",
    cookieName: "catapult_csnf_auth",
    passwordEnv: "CSNF_DASHBOARD_PASSWORD",
    secretEnv: "CSNF_DASHBOARD_AUTH_SECRET",
  },
  {
    // CSNF feasibility study portal. Same tracker as /jag-dashboard, its own
    // password so each client only ever reaches their own study.
    matchPrefix: "/csnf-dashboard",
    loginPath: "/csnf-dashboard/login",
    apiPath: "/api/csnf-login",
    cookieName: "catapult_csnf_auth",
    passwordEnv: "CSNF_DASHBOARD_PASSWORD",
    secretEnv: "CSNF_DASHBOARD_AUTH_SECRET",
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
    // Sales deck portal: the four service decks with pricing/process detail.
    // Shared password, given out to the team and to prospects on the road.
    matchPrefix: "/decks",
    loginPath: "/decks/login",
    apiPath: "/api/decks-login",
    cookieName: "catapult_decks_auth",
    passwordEnv: "DECKS_PASSWORD",
    secretEnv: "DECKS_AUTH_SECRET",
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

  // Board Prospect Review. /{client}/data-dashboard/board-review = Catapult setup + results
  // (research cookie only; client dashboard passwords do NOT open it).
  // /{client}/data-dashboard/review = board/committee member form (member cookie for THAT client).
  // Members only ever get the member cookie, so every other dashboard page and API stays closed to them.
  const br = pathname.match(/^\/(jag|csnf|pvas|wcbhc|baq)\/data-dashboard\/(board-review|review)(\/login)?\/?$/i);
  if (br) {
    const client = br[1].toLowerCase();
    if (br[2].toLowerCase() === "board-review") {
      if (await brStaff(req)) return NextResponse.next();
      const loginUrl = new URL(`/${client}/data-dashboard/login`, req.url);
      return NextResponse.redirect(loginUrl);
    }
    if (br[3]) return NextResponse.next();
    const t = await verifyMemberToken(req.cookies.get(BR_MEMBER_COOKIE)?.value);
    if (t && t.client === client) return NextResponse.next();
    return NextResponse.redirect(new URL(`/${client}/data-dashboard/review/login`, req.url));
  }
  // Belt and braces: a board member session can never call dashboard data APIs or the
  // board-review admin API (each API also checks its own auth).
  if (/^\/api\/([a-z]+-data-|board-review\/admin|portal-)/.test(pathname) && !pathname.endsWith("-data-login") && req.cookies.get(BR_MEMBER_COOKIE)?.value) {
    const rc = req.cookies.get("catapult_research_auth")?.value;
    const rExp = rc ? await expectedCookieValue("RESEARCH_PASSWORD", "RESEARCH_AUTH_SECRET") : "";
    const staff = (rc && rExp && rc === rExp) || req.headers.get("authorization") || [JAG_DATA_COOKIE, PVAS_DATA_COOKIE, WCBHC_DATA_COOKIE, BAQ_DATA_COOKIE, CSNF_DATA_COOKIE].some((n) => req.cookies.get(n));
    if (!staff) return NextResponse.json({ error: "Not available for board review logins" }, { status: 403 });
  }

  // Client data portals live at /{client}/data-dashboard (e.g. /csnf/data-dashboard),
  // served from /research/{client}-data behind the research password.
  const dash = pathname.match(/^\/([A-Za-z0-9-]+)\/data-dashboard\/?$/);
  const oldDash = pathname.match(/^\/research\/([a-z0-9-]+)-data\/?$/);
  if (oldDash) {
    return NextResponse.redirect(new URL(`/${oldDash[1]}/data-dashboard`, req.url));
  }
  if (dash) {
    const client = dash[1].toLowerCase();
    if (client === "jag") {
      // JAG data portal: its own password (JAG_DATA_PASSWORD) and cookie.
      // Catapult staff with the research cookie get in too.
      const jagOk = await isJagCookieValid(req.cookies.get(JAG_DATA_COOKIE)?.value);
      const rc = req.cookies.get("catapult_research_auth")?.value;
      const rExp = rc ? await expectedCookieValue("RESEARCH_PASSWORD", "RESEARCH_AUTH_SECRET") : "";
      if (jagOk || (rc && rExp && rc === rExp)) {
        return NextResponse.rewrite(new URL("/research/jag-data", req.url));
      }
      return NextResponse.redirect(new URL("/jag/data-dashboard/login", req.url));
    }
    if (client === "pvas") {
      // PVAS data portal: its own password (PVAS_DATA_PASSWORD) and cookie.
      const pvasOk = await isPvasCookieValid(req.cookies.get(PVAS_DATA_COOKIE)?.value);
      const rc = req.cookies.get("catapult_research_auth")?.value;
      const rExp = rc ? await expectedCookieValue("RESEARCH_PASSWORD", "RESEARCH_AUTH_SECRET") : "";
      if (pvasOk || (rc && rExp && rc === rExp)) {
        return NextResponse.rewrite(new URL("/research/pvas-data", req.url));
      }
      return NextResponse.redirect(new URL("/pvas/data-dashboard/login", req.url));
    }
    if (client === "wcbhc") {
      // WCBHC data portal: its own password (WCBHC_DATA_PASSWORD) and cookie.
      const wcbhcOk = await isWcbhcCookieValid(req.cookies.get(WCBHC_DATA_COOKIE)?.value);
      const rc = req.cookies.get("catapult_research_auth")?.value;
      const rExp = rc ? await expectedCookieValue("RESEARCH_PASSWORD", "RESEARCH_AUTH_SECRET") : "";
      if (wcbhcOk || (rc && rExp && rc === rExp)) {
        return NextResponse.rewrite(new URL("/research/wcbhc-data", req.url));
      }
      return NextResponse.redirect(new URL("/wcbhc/data-dashboard/login", req.url));
    }
    if (client === "baq") {
      // BAQ data portal: its own password (BAQ_DATA_PASSWORD) and cookie.
      const baqOk = await isBaqCookieValid(req.cookies.get(BAQ_DATA_COOKIE)?.value);
      const rc = req.cookies.get("catapult_research_auth")?.value;
      const rExp = rc ? await expectedCookieValue("RESEARCH_PASSWORD", "RESEARCH_AUTH_SECRET") : "";
      if (baqOk || (rc && rExp && rc === rExp)) {
        return NextResponse.rewrite(new URL("/research/baq-data", req.url));
      }
      return NextResponse.redirect(new URL("/baq/data-dashboard/login", req.url));
    }
    if (client === "csnf") {
      // CSNF data portal: its own password (CSNF_DATA_PASSWORD) and cookie.
      const csnfOk = await isCsnfCookieValid(req.cookies.get(CSNF_DATA_COOKIE)?.value);
      const rc = req.cookies.get("catapult_research_auth")?.value;
      const rExp = rc ? await expectedCookieValue("RESEARCH_PASSWORD", "RESEARCH_AUTH_SECRET") : "";
      if (csnfOk || (rc && rExp && rc === rExp)) {
        return NextResponse.rewrite(new URL("/research/csnf-data", req.url));
      }
      return NextResponse.redirect(new URL("/csnf/data-dashboard/login", req.url));
    }
    const cookie = req.cookies.get("catapult_research_auth")?.value;
    const expected = await expectedCookieValue("RESEARCH_PASSWORD", "RESEARCH_AUTH_SECRET");
    if (cookie && expected && cookie === expected) {
      return NextResponse.rewrite(new URL(`/research/${client}-data`, req.url));
    }
    const loginUrl = new URL("/research/login", req.url);
    loginUrl.searchParams.set("redirect", `/${client}/data-dashboard`);
    return NextResponse.redirect(loginUrl);
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
