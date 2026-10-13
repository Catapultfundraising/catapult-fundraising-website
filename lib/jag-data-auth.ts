import { NextRequest } from "next/server";
import { isResearchAuthed } from "@/lib/research-auth";

// JAG data portal (/jag/data-dashboard) has its own password (JAG_DATA_PASSWORD)
// and cookie. Catapult staff with the research cookie and Viktor (Bearer
// CRON_SECRET) can also read it.
export const JAG_DATA_COOKIE = "catapult_jag_data_auth";

export async function jagDataCookieValue(): Promise<string> {
  const password = process.env.JAG_DATA_PASSWORD ?? "";
  const secret = process.env.JAG_DATA_AUTH_SECRET || process.env.RESEARCH_AUTH_SECRET || "";
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`jag-data:${password}:${secret}`));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function isJagCookieValid(cookie: string | undefined): Promise<boolean> {
  if (!cookie || !process.env.JAG_DATA_PASSWORD) return false;
  return cookie === (await jagDataCookieValue());
}

export async function isJagDataAuthed(req: NextRequest): Promise<boolean> {
  const cron = process.env.CRON_SECRET;
  if (cron && req.headers.get("authorization") === `Bearer ${cron}`) return true;
  if (await isJagCookieValid(req.cookies.get(JAG_DATA_COOKIE)?.value)) return true;
  return isResearchAuthed(req);
}
