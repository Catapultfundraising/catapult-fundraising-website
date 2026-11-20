import { NextRequest } from "next/server";
import { isResearchAuthed } from "@/lib/research-auth";

// IMAS data portal (/imas/data-dashboard) has its own password (IMAS_DATA_PASSWORD)
// and cookie. Catapult staff with the research cookie and Viktor (Bearer
// CRON_SECRET) can also read it.
export const IMAS_DATA_COOKIE = "catapult_imas_data_auth";

export async function imasDataCookieValue(): Promise<string> {
  const password = process.env.IMAS_DATA_PASSWORD ?? "";
  const secret = process.env.IMAS_DATA_AUTH_SECRET || process.env.RESEARCH_AUTH_SECRET || "";
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`imas-data:${password}:${secret}`));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function isImasCookieValid(cookie: string | undefined): Promise<boolean> {
  if (!cookie || !process.env.IMAS_DATA_PASSWORD) return false;
  return cookie === (await imasDataCookieValue());
}

export async function isImasDataAuthed(req: NextRequest): Promise<boolean> {
  const cron = process.env.CRON_SECRET;
  if (cron && req.headers.get("authorization") === `Bearer ${cron}`) return true;
  if (await isImasCookieValid(req.cookies.get(IMAS_DATA_COOKIE)?.value)) return true;
  return isResearchAuthed(req);
}
