import { NextRequest } from "next/server";
import { isResearchAuthed } from "@/lib/research-auth";

// PVAS data portal (/pvas/data-dashboard) has its own password (PVAS_DATA_PASSWORD)
// and cookie. Catapult staff with the research cookie and Viktor (Bearer
// CRON_SECRET) can also read it.
export const PVAS_DATA_COOKIE = "catapult_pvas_data_auth";

export async function pvasDataCookieValue(): Promise<string> {
  const password = process.env.PVAS_DATA_PASSWORD ?? "";
  const secret = process.env.PVAS_DATA_AUTH_SECRET || process.env.RESEARCH_AUTH_SECRET || "";
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`pvas-data:${password}:${secret}`));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function isPvasCookieValid(cookie: string | undefined): Promise<boolean> {
  if (!cookie || !process.env.PVAS_DATA_PASSWORD) return false;
  return cookie === (await pvasDataCookieValue());
}

export async function isPvasDataAuthed(req: NextRequest): Promise<boolean> {
  const cron = process.env.CRON_SECRET;
  if (cron && req.headers.get("authorization") === `Bearer ${cron}`) return true;
  if (await isPvasCookieValid(req.cookies.get(PVAS_DATA_COOKIE)?.value)) return true;
  return isResearchAuthed(req);
}
