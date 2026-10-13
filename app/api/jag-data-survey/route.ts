import { NextRequest, NextResponse } from "next/server";
import { isJagDataAuthed } from "@/lib/jag-data-auth";
import { getJagSurvey } from "@/lib/jag-survey";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET ?id=<CPTID>&name=<record name> -> feasibility study interview answers.
export async function GET(req: NextRequest) {
  const cron = process.env.CRON_SECRET;
  const bearer = cron && req.headers.get("authorization") === `Bearer ${cron}`;
  if (!bearer && !(await isJagDataAuthed(req))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const id = req.nextUrl.searchParams.get("id") ?? "";
  const name = req.nextUrl.searchParams.get("name") ?? "";
  const interviews = await getJagSurvey(id, name);
  return NextResponse.json({ interviews }, { headers: { "Cache-Control": "private, max-age=300" } });
}
