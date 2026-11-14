import { NextRequest, NextResponse } from "next/server";
import { saveSurvey } from "@/lib/csnf-survey-store";
import { SurveyValidationError, SurveyConflictError } from "@/lib/csnf-online-survey";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const json = (body: object, status: number) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
export async function POST(req: NextRequest) {
  // Preview and production may share a Blob token: NEVER collect preview rows
  // into the live study. Enable production explicitly only after approval.
  if (process.env.CSNF_SURVEY_ENABLED !== "true" || process.env.VERCEL_ENV === "preview") {
    return json({ error: "The survey is not accepting responses yet." }, 503);
  }
  if (req.headers.get("origin") !== req.nextUrl.origin) return json({ error: "Invalid origin." }, 403);
  if (!req.headers.get("content-type")?.startsWith("application/json")) return json({ error: "JSON required." }, 415);
  const reader = req.body?.getReader();
  if (!reader) return json({ error: "Response required." }, 400);
  try {
    const chunks: Uint8Array[] = [];
    let length = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > 131072) { await reader.cancel(); return json({ error: "Response too large." }, 413); }
      chunks.push(value);
    }
    let body: unknown;
    try { body = JSON.parse(Buffer.concat(chunks).toString("utf8")); }
    catch { return json({ error: "Invalid response." }, 400); }
    const receipt = await saveSurvey(body);
    return json({ ok: true, id: receipt.id }, 200);
  } catch (error) {
    if (error instanceof SurveyValidationError) return json({ error: error.message }, 400);
    if (error instanceof SurveyConflictError) return json({ error: error.message }, 409);
    // No donor payloads, PII or provider diagnostics in logs or public errors.
    return json({ error: "We could not confirm your response was saved. Please retry using the same form." }, 503);
  }
}
