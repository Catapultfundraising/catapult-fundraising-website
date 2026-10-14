import { NextRequest } from "next/server";
import { isResearchAuthed } from "@/lib/research-auth";

// WCBHC data portal (/wcbhc/data-dashboard) has its own password (WCBHC_DATA_PASSWORD)
// and cookie. Catapult staff with the research cookie and Viktor (Bearer
// CRON_SECRET) can also read it.
export const WCBHC_DATA_COOKIE = "catapult_wcbhc_data_auth";

export async function wcbhcDataCookieValue(): Promise<string> {
  const password = process.env.WCBHC_DATA_PASSWORD ?? "";
  const secret = process.env.WCBHC_DATA_AUTH_SECRET || process.env.RESEARCH_AUTH_SECRET || "";
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`wcbhc-data:${password}:${secret}`));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function isWcbhcCookieValid(cookie: string | undefined): Promise<boolean> {
  if (!cookie || !process.env.WCBHC_DATA_PASSWORD) return false;
  return cookie === (await wcbhcDataCookieValue());
}

export async function isWcbhcDataAuthed(req: NextRequest): Promise<boolean> {
  const cron = process.env.CRON_SECRET;
  if (cron && req.headers.get("authorization") === `Bearer ${cron}`) return true;
  if (await isWcbhcCookieValid(req.cookies.get(WCBHC_DATA_COOKIE)?.value)) return true;
  return isResearchAuthed(req);
}
