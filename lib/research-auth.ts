import { NextRequest } from "next/server";

const COOKIE_NAME = "catapult_research_auth";

async function expectedCookieValue(): Promise<string> {
  const password = process.env.RESEARCH_PASSWORD ?? "";
  const secret = process.env.RESEARCH_AUTH_SECRET ?? "";
  const enc = new TextEncoder();
  const data = enc.encode(`${password}:${secret}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Verifies that the incoming request carries a valid /research auth cookie.
 * Used by API routes under /api/research-* which are NOT covered by the
 * middleware's page-level gate (middleware only matches page paths starting
 * with /research, not /api routes), so each route must check independently.
 */
export async function isResearchAuthed(req: NextRequest): Promise<boolean> {
  const cookie = req.cookies.get(COOKIE_NAME)?.value;
  if (!cookie) return false;
  const expected = await expectedCookieValue();
  if (!expected) return false;
  return cookie === expected;
}
