import { NextRequest, NextResponse } from "next/server";
import { isResearchAuthed } from "@/lib/research-auth";
import { getMagicaRunStatus } from "@/lib/magica-client";

export const runtime = "nodejs";
export const maxDuration = 30;

function parseModelJson(text: string): Record<string, any> {
  const cleaned = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  return JSON.parse(cleaned);
}

// Narrative fields are meant to read as one flowing paragraph in the
// generated PDF. The extraction model sometimes echoes the source
// document's own visual line wrap as a literal newline mid-sentence, which
// the PDF renderer then reproduces as a real forced break. Same fix as the
// individual importer: collapse any whitespace run containing a line break
// down to a single space. Deliberately NOT applied to officersDirectors,
// which is a genuinely newline-separated list.
function collapse(raw: string | undefined | null): string {
  if (!raw) return "";
  return String(raw)
    .replace(/[ \t]*\n+[ \t]*/g, " ")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : v == null ? "" : String(v);
}

// Normalizes an EIN to XX-XXXXXXX when the model returns nine bare digits.
function normalizeEin(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length !== 9) return raw;
  return `${digits.slice(0, 2)}-${digits.slice(2)}`;
}

function keepNewlines(raw: string | undefined | null): string {
  if (!raw) return "";
  return String(raw).replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

function normalizeGrants(rows: unknown, fallbackYear: string) {
  if (!Array.isArray(rows)) return [];
  return rows
    .map((row: any) => ({
      year: str(row?.year) || fallbackYear,
      grantee: collapse(str(row?.grantee)),
      amount: str(row?.amount),
    }))
    .filter((row) => row.grantee || row.amount);
}

function normalizeExecutives(rows: unknown) {
  if (!Array.isArray(rows)) return [];
  return rows
    .map((row: any) => ({
      photo: "",
      name: collapse(str(row?.name)),
      title: collapse(str(row?.title)),
      contactInfo: collapse(str(row?.contactInfo)),
      bio: collapse(str(row?.bio)),
    }))
    .filter((row) => row.name || row.title);
}

export async function GET(req: NextRequest) {
  try {
    // This route spends paid model credits, so gate it on the same
    // /research cookie the builder page itself is behind. API routes are not
    // covered by the middleware page gate, so each one checks independently.
    if (!(await isResearchAuthed(req))) {
      return NextResponse.json({ error: "Not authorized." }, { status: 401 });
    }
    const { searchParams } = new URL(req.url);
    const runId = searchParams.get("runId");
    const kind = searchParams.get("kind") === "grants" ? "grants" : "profile";
    if (!runId) {
      return NextResponse.json({ error: "Missing runId." }, { status: 400 });
    }

    const run = await getMagicaRunStatus(runId);

    if (run.status === "FAILED" || run.status === "CANCELED") {
      return NextResponse.json(
        {
          status: run.status,
          error: `Magica run ended with status ${run.status}: ${JSON.stringify(run.error ?? "")}`,
        },
        { status: 500 }
      );
    }
    if (run.status !== "COMPLETED") {
      return NextResponse.json({ status: run.status || "PROCESSING" });
    }

    // The completed run's payload shape isn't fully documented, so try the
    // same set of plausible output locations the individual importer uses.
    const candidateTexts: unknown[] = [
      run.output?.output,
      run.output,
      run.output?.text,
      run.response?.output,
      run.response,
      run.response?.text,
      run.result?.output,
      run.result,
      run.result?.text,
      run.data?.output,
      run.data,
      run.data?.text,
    ];
    let rawText = "";
    for (const candidate of candidateTexts) {
      if (typeof candidate === "string" && candidate.trim()) {
        rawText = candidate;
        break;
      }
    }
    if (!rawText) {
      // Drop the echoed input first: it holds the whole base64 PDF and would
      // otherwise consume the entire diagnostic slice.
      const { input: _omittedInput, ...runWithoutInput } = run;
      return NextResponse.json(
        {
          error: `The completed run did not contain recognizable text output. Raw run object (input omitted): ${JSON.stringify(runWithoutInput).slice(0, 3000)}`,
        },
        { status: 500 }
      );
    }

    let extracted: Record<string, any>;
    try {
      extracted = parseModelJson(rawText);
    } catch {
      return NextResponse.json(
        {
          error: `The model's output could not be parsed as JSON. Raw output (first 1500 chars): ${rawText.slice(0, 1500)}`,
        },
        { status: 500 }
      );
    }

    if (kind === "grants") {
      const taxYear = str(extracted.taxYear);
      const grants = normalizeGrants(extracted.selectedGrants, taxYear);
      return NextResponse.json({
        status: "COMPLETED",
        kind,
        grantCount: grants.length,
        data: {
          name: collapse(str(extracted.name)),
          ein: normalizeEin(str(extracted.ein)),
          address: collapse(str(extracted.address)),
          phone: str(extracted.phone),
          financialData: keepNewlines(str(extracted.financialData)),
          officersDirectors: keepNewlines(str(extracted.officersDirectors)),
          geographicFocus: collapse(str(extracted.geographicFocus)),
          limitations: collapse(str(extracted.limitations)),
          applicationInformation: collapse(str(extracted.applicationInformation)),
          dueDate: str(extracted.dueDate),
          potentialGrantRange: str(extracted.potentialGrantRange),
          selectedGrants: grants,
        },
      });
    }

    const executives = normalizeExecutives(extracted.executives);
    return NextResponse.json({
      status: "COMPLETED",
      kind,
      execCount: executives.length,
      data: {
        name: collapse(str(extracted.name)),
        ein: normalizeEin(str(extracted.ein)),
        address: collapse(str(extracted.address)),
        phone: str(extracted.phone),
        website: str(extracted.website),
        missionPurpose: collapse(str(extracted.missionPurpose)),
        history: collapse(str(extracted.history)),
        officersDirectors: keepNewlines(str(extracted.officersDirectors)),
        financialData: keepNewlines(str(extracted.financialData)),
        geographicFocus: collapse(str(extracted.geographicFocus)),
        fieldsOfInterest: collapse(str(extracted.fieldsOfInterest)),
        programAreas: collapse(str(extracted.programAreas)),
        typesOfSupport: collapse(str(extracted.typesOfSupport)),
        potentialGrantRange: str(extracted.potentialGrantRange),
        limitations: collapse(str(extracted.limitations)),
        dueDate: str(extracted.dueDate),
        applicationInformation: collapse(str(extracted.applicationInformation)),
        relationshipToOrg: collapse(str(extracted.relationshipToOrg)),
        givingHistoryToClient: collapse(str(extracted.givingHistoryToClient)),
        executives,
      },
    });
  } catch (err: any) {
    console.error("foundation-pdf-import status error", err);
    return NextResponse.json(
      { error: err?.message || "Failed to check the import status. Please try again." },
      { status: 500 }
    );
  }
}
