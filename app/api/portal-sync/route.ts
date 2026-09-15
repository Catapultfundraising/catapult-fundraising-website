import { NextRequest, NextResponse } from "next/server";
import { isJagAdminAuthed } from "@/lib/jag-admin-auth";
import { getJagDashboardData, saveJagDashboardData } from "@/lib/jag-data";
import { getStudyPortal, STUDY_PORTALS } from "@/lib/study-portals";
import { buildPortalDataFromVanillaSoft } from "@/lib/vs-sync";

export const runtime = "nodejs";
export const maxDuration = 300;

// ---------------------------------------------------------------------------
// Refreshes a study portal straight from VanillaSoft.
//
//   GET  /api/portal-sync?project=jag&preview=1   -> compute and return, save nothing
//   POST /api/portal-sync?project=jag             -> compute and save
//
// Authorised either by the /jag-admin cookie (a person clicking Refresh) or by
// `Authorization: Bearer $CRON_SECRET` (the weekly Vercel cron). The weekly
// cadence is deliberate: clients see a stable weekly snapshot, the same rhythm
// as the old PDF report, not a number that moves while they are looking at it.
// ---------------------------------------------------------------------------

// Vercel's Hobby plan ignores weekly cron expressions and fires daily, so the
// Monday-morning cadence is enforced here instead. A person hitting Refresh in
// /jag-admin is never gated; only the cron is.
function isMondayInPacific(): boolean {
  const day = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    weekday: "short",
  }).format(new Date());
  return day === "Mon";
}

function isCronRequest(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  const header = req.headers.get("authorization");
  return Boolean(secret && header === `Bearer ${secret}`);
}

async function isAuthorised(req: NextRequest): Promise<boolean> {
  const secret = process.env.CRON_SECRET;
  const header = req.headers.get("authorization");
  if (secret && header === `Bearer ${secret}`) return true;
  return isJagAdminAuthed(req);
}

async function run(req: NextRequest, save: boolean) {
  if (!(await isAuthorised(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (save && isCronRequest(req) && !isMondayInPacific()) {
    return NextResponse.json({ ok: true, saved: false, skipped: "not Monday in America/Los_Angeles" });
  }

  const slug = req.nextUrl.searchParams.get("project") ?? "jag";
  const portal = getStudyPortal(slug);
  if (!portal) {
    return NextResponse.json(
      { error: `Unknown project "${slug}". Known: ${Object.keys(STUDY_PORTALS).join(", ")}` },
      { status: 400 }
    );
  }

  try {
    const previous = await getJagDashboardData(portal.dataPath);
    const { data, meta } = await buildPortalDataFromVanillaSoft(portal, {
      previous,
      persistContacts: save,
    });

    if (save) await saveJagDashboardData(data, portal.dataPath);

    return NextResponse.json({ ok: true, saved: save, project: portal.slug, meta, data });
  } catch (err) {
    console.error("portal-sync error", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Sync failed. Nothing was saved." },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const preview = req.nextUrl.searchParams.get("preview") === "1";
  return run(req, !preview);
}

export async function POST(req: NextRequest) {
  return run(req, true);
}
