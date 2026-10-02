import { NextRequest, NextResponse } from "next/server";
import { isResearchAuthed } from "@/lib/research-auth";
import { getMagicaRunStatus } from "@/lib/magica-client";
import { smartTitleCase, smartSentenceCase } from "@/lib/title-case";

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
// down to a single space. Deliberately NOT applied to companyAffiliations,
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

function keepNewlines(raw: string | undefined | null): string {
  if (!raw) return "";
  return String(raw).replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

// Some company documents shout in all caps. tc() fixes
// names/addresses/list lines; sc() fixes prose boxes. Both no-op on text that
// already contains lowercase letters, so filer-cased text is never touched.
function tc(raw: string | undefined | null): string {
  return smartTitleCase(raw);
}
function sc(raw: string | undefined | null): string {
  return smartSentenceCase(raw);
}

function normalizeFoundations(rows: unknown) {
  if (!Array.isArray(rows)) return [];
  return rows
    .map((row: any) => ({
      name: tc(collapse(str(row?.name))),
      address: tc(collapse(str(row?.address))),
      phone: str(row?.phone),
      email: str(row?.email),
      website: str(row?.website),
      netAssetsYear: str(row?.netAssetsYear),
      netAssetsAmount: str(row?.netAssetsAmount),
    }))
    .filter((row) => row.name);
}

function normalizeExecutives(rows: unknown) {
  if (!Array.isArray(rows)) return [];
  return rows
    .map((row: any) => ({
      photo: "",
      name: tc(collapse(str(row?.name))),
      title: tc(collapse(str(row?.title))),
      contactInfo: collapse(str(row?.contactInfo)),
      bio: sc(collapse(str(row?.bio))),
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

    const keyPeople = normalizeExecutives(extracted.keyPeople);
    const foundations = normalizeFoundations(extracted.foundations);
    return NextResponse.json({
      status: "COMPLETED",
      peopleCount: keyPeople.length,
      data: {
        name: tc(collapse(str(extracted.name))),
        address: tc(collapse(str(extracted.address))),
        phone: str(extracted.phone),
        website: str(extracted.website),
        relationshipToOrg: sc(collapse(str(extracted.relationshipToOrg))),
        firstGiftAmount: str(extracted.firstGiftAmount),
        lastGiftAmount: str(extracted.lastGiftAmount),
        largestGiftAmount: str(extracted.largestGiftAmount),
        revenueYear: str(extracted.revenueYear),
        revenueAmount: str(extracted.revenueAmount),
        companyHeritage: sc(collapse(str(extracted.companyHeritage))),
        keyInformation: sc(collapse(str(extracted.keyInformation))),
        productsOperations: sc(collapse(str(extracted.productsOperations))),
        values: sc(collapse(str(extracted.values))),
        corporateGiving: sc(collapse(str(extracted.corporateGiving))),
        companyAffiliations: tc(keepNewlines(str(extracted.companyAffiliations))),
        relevantFindings: sc(collapse(str(extracted.relevantFindings))),
        foundations,
        keyPeople,
      },
    });
  } catch (err: any) {
    console.error("corporate-pdf-import status error", err);
    return NextResponse.json(
      { error: err?.message || "Failed to check the import status. Please try again." },
      { status: 500 }
    );
  }
}
