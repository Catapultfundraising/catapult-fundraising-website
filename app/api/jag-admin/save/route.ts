import { NextRequest, NextResponse } from "next/server";
import { isJagAdminAuthed } from "@/lib/jag-admin-auth";
import { getJagDashboardData, saveJagDashboardData, type JagDashboardData } from "@/lib/jag-data";

export const runtime = "nodejs";

function isValidData(data: any): data is JagDashboardData {
  return (
    data &&
    typeof data.reportDate === "string" &&
    data.stats &&
    typeof data.stats.totalProspects === "number" &&
    Array.isArray(data.completedInterviews) &&
    Array.isArray(data.scheduledInterviews) &&
    Array.isArray(data.toBeRescheduled) &&
    Array.isArray(data.declined) &&
    Array.isArray(data.deceased) &&
    Array.isArray(data.feasibilitySignals) &&
    Array.isArray(data.missionThemes) &&
    Array.isArray(data.quotes)
  );
}

export async function POST(req: NextRequest) {
  if (!(await isJagAdminAuthed(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!isValidData(body)) {
    return NextResponse.json(
      { error: "The data doesn't look right (missing a required field or table). Nothing was saved." },
      { status: 400 }
    );
  }

  try {
    // Snapshot the stats that were live immediately before this save, so the
    // tracker can show "+N vs. last report" deltas going forward — captured
    // automatically each time, the data manager never has to enter it by hand.
    const previous = await getJagDashboardData();
    const previousStats = previous?.stats
      ? {
          totalProspects: previous.stats.totalProspects,
          completed: previous.stats.completed,
          scheduled: previous.stats.scheduled,
          toBeRescheduled: previous.stats.toBeRescheduled,
          declined: previous.stats.declined,
          deceased: previous.stats.deceased,
          inCallingProcess: previous.stats.inCallingProcess,
          dials: previous.stats.dials,
          emailsSent: previous.stats.emailsSent,
        }
      : undefined;

    await saveJagDashboardData({ ...body, previousStats, updatedAt: new Date().toISOString() });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("jag-admin save error", err);
    return NextResponse.json({ error: "Failed to save. Please try again." }, { status: 500 });
  }
}
