import { NextRequest } from "next/server";
import { isResearchAuthed } from "@/lib/research-auth";

// CSNF data portal (/csnf/data-dashboard) has its own password (CSNF_DATA_PASSWORD)
// and cookie. Catapult staff with the research cookie and Viktor (Bearer
// CRON_SECRET) can also read it.
export const CSNF_DATA_COOKIE = "catapult_csnf_data_auth";

export async function csnfDataCookieValue(): Promise<string> {
  const password = process.env.CSNF_DATA_PASSWORD ?? "";
  const secret = process.env.CSNF_DATA_AUTH_SECRET || process.env.RESEARCH_AUTH_SECRET || "";
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`csnf-data:${password}:${secret}`));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function isCsnfCookieValid(cookie: string | undefined): Promise<boolean> {
  if (!cookie || !process.env.CSNF_DATA_PASSWORD) return false;
  return cookie === (await csnfDataCookieValue());
}

export async function isCsnfDataAuthed(req: NextRequest): Promise<boolean> {
  const cron = process.env.CRON_SECRET;
  if (cron && req.headers.get("authorization") === `Bearer ${cron}`) return true;
  if (await isCsnfCookieValid(req.cookies.get(CSNF_DATA_COOKIE)?.value)) return true;
  return isResearchAuthed(req);
}
