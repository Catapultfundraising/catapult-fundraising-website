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
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Server-to-server access (used by Viktor's stored connection): the
 * X-Research-Key header must equal RESEARCH_PASSWORD. Browser users keep
 * using the login page and cookie.
 */
function hasValidKeyHeader(req: NextRequest): boolean {
  const key = req.headers.get("x-research-key");
  const password = process.env.RESEARCH_PASSWORD ?? "";
  if (!key || !password) return false;
  return safeEqual(key, password);
}

export async function isResearchAuthed(req: NextRequest): Promise<boolean> {
  if (hasValidKeyHeader(req)) return true;
  const cookie = req.cookies.get(COOKIE_NAME)?.value;
  if (!cookie) return false;
  const expected = await expectedCookieValue();
  if (!expected) return false;
  return cookie === expected;
}
