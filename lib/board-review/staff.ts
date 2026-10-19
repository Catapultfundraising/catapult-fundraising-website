import { NextRequest } from "next/server";
import { isResearchAuthed } from "@/lib/research-auth";
import { isJagCookieValid, JAG_DATA_COOKIE } from "@/lib/jag-data-auth";
import { isCsnfCookieValid, CSNF_DATA_COOKIE } from "@/lib/csnf-data-auth";
import { isPvasCookieValid, PVAS_DATA_COOKIE } from "@/lib/pvas-data-auth";
import { isWcbhcCookieValid, WCBHC_DATA_COOKIE } from "@/lib/wcbhc-data-auth";
import { isBaqCookieValid, BAQ_DATA_COOKIE } from "@/lib/baq-data-auth";

// Board Prospect Review setup/results = Catapult employees signed in with that
// client's data-dashboard login ({CLIENT}D2026!@), or Viktor (Bearer CRON_SECRET).
// The research login does NOT open it. Board members only ever hold the member cookie.
const CHECK: Record<string, (req: NextRequest) => Promise<boolean>> = {
  jag: (r) => isJagCookieValid(r.cookies.get(JAG_DATA_COOKIE)?.value),
  csnf: (r) => isCsnfCookieValid(r.cookies.get(CSNF_DATA_COOKIE)?.value),
  pvas: (r) => isPvasCookieValid(r.cookies.get(PVAS_DATA_COOKIE)?.value),
  wcbhc: (r) => isWcbhcCookieValid(r.cookies.get(WCBHC_DATA_COOKIE)?.value),
  baq: (r) => isBaqCookieValid(r.cookies.get(BAQ_DATA_COOKIE)?.value),
};

export async function isBoardReviewStaff(req: NextRequest, client: string): Promise<boolean> {
  const cron = process.env.CRON_SECRET;
  if (cron && req.headers.get("authorization") === `Bearer ${cron}`) return true;
  const f = CHECK[client.toLowerCase()];
  if (f && (await f(req))) return true;
  // Any Catapult staff login (research portal) counts too, so employees never sign in twice.
  return client.toLowerCase() in CHECK ? isResearchAuthed(req) : false;
}
