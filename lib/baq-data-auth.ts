import { NextRequest } from "next/server";
import { isResearchAuthed } from "@/lib/research-auth";

// BAQ data portal (/baq/data-dashboard) has its own password (BAQ_DATA_PASSWORD)
// and cookie. Catapult staff with the research cookie and Viktor (Bearer
// CRON_SECRET) can also read it.
export const BAQ_DATA_COOKIE = "catapult_baq_data_auth";

export async function baqDataCookieValue(): Promise<string> {
  const password = process.env.BAQ_DATA_PASSWORD ?? "";
  const secret = process.env.BAQ_DATA_AUTH_SECRET || process.env.RESEARCH_AUTH_SECRET || "";
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`baq-data:${password}:${secret}`));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function isBaqCookieValid(cookie: string | undefined): Promise<boolean> {
  if (!cookie || !process.env.BAQ_DATA_PASSWORD) return false;
  return cookie === (await baqDataCookieValue());
}

export async function isBaqDataAuthed(req: NextRequest): Promise<boolean> {
  const cron = process.env.CRON_SECRET;
  if (cron && req.headers.get("authorization") === `Bearer ${cron}`) return true;
  if (await isBaqCookieValid(req.cookies.get(BAQ_DATA_COOKIE)?.value)) return true;
  return isResearchAuthed(req);
}
