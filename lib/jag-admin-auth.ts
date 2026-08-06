import { NextRequest } from "next/server";

const COOKIE_NAME = "catapult_jag_admin_auth";

async function expectedCookieValue(): Promise<string> {
  const password = process.env.JAG_ADMIN_PASSWORD ?? "";
  const secret = process.env.JAG_ADMIN_AUTH_SECRET ?? "";
  const enc = new TextEncoder();
  const data = enc.encode(`${password}:${secret}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Verifies that the incoming request carries a valid /jag-admin auth cookie.
 * This is a SEPARATE password from JAG_DASHBOARD_PASSWORD (the client-facing
 * /jag-dashboard gate) — the two must never share a password, since the
 * client should never be able to reach the data-upload tool.
 */
export async function isJagAdminAuthed(req: NextRequest): Promise<boolean> {
  const cookie = req.cookies.get(COOKIE_NAME)?.value;
  if (!cookie) return false;
  const expected = await expectedCookieValue();
  if (!expected) return false;
  return cookie === expected;
}
