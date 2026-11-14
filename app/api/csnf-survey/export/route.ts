import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { listSurveyResponses } from "@/lib/csnf-survey-store";
import { SURVEY_QUESTIONS, SURVEY_VERSION, SURVEY_SCHEMA_VERSION, IDENTITY_FIELDS } from "@/lib/csnf-online-survey";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;
export async function GET(req: NextRequest) {
  const expected = process.env.CRON_SECRET && `Bearer ${process.env.CRON_SECRET}`;
  const supplied = req.headers.get("authorization") ?? "";
  const headers = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" };
  if (!expected || Buffer.byteLength(expected) !== Buffer.byteLength(supplied) ||
    !timingSafeEqual(Buffer.from(expected), Buffer.from(supplied))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers });
  }
  try {
    return NextResponse.json({
      schemaVersion: SURVEY_SCHEMA_VERSION, surveyVersion: SURVEY_VERSION, questions: SURVEY_QUESTIONS, identityFields: IDENTITY_FIELDS,
      responses: await listSurveyResponses(),
    }, { headers });
  } catch {
    return NextResponse.json({ error: "Survey export unavailable; retry later." }, { status: 503, headers });
  }
}
