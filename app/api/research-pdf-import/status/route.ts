import { NextResponse } from "next/server";
import { getMagicaRunStatus } from "@/lib/magica-client";

export const runtime = "nodejs";
export const maxDuration = 30;

const MARITAL_STATUS_OPTIONS = ["Single", "Married", "Divorced", "Implied Divorced", "Widowed", "Dating", "Unknown"];

function normalizeMaritalStatus(raw: string): string {
  const lower = (raw || "").toLowerCase();
  if (MARITAL_STATUS_OPTIONS.some((opt) => lower === opt.toLowerCase())) {
    const match = MARITAL_STATUS_OPTIONS.find((opt) => lower === opt.toLowerCase());
    return match || "Unknown";
  }
  if (lower.includes("widow")) return "Widowed";
  if (lower.includes("divorced")) return "Divorced";
  if (lower.includes("spouse") || lower.includes("married")) return "Married";
  if (lower.includes("single")) return "Single";
  if (lower.includes("dating") || lower.includes("partner")) return "Dating";
  return "Unknown";
}

function parseModelJson(text: string): Record<string, any> {
  // Strip markdown code fences if the model wrapped its JSON in them anyway.
  const cleaned = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  return JSON.parse(cleaned);
}

// A single, fast status check for a previously-started run (see
// /api/research-pdf-import). The client polls this on an interval instead
// of one call blocking until the model finishes -- keeps every request
// short-lived so no gateway/proxy idle timeout can ever truncate it.
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const runId = searchParams.get("runId");
    if (!runId) {
      return NextResponse.json({ error: "Missing runId." }, { status: 400 });
    }

    const run = await getMagicaRunStatus(runId);

    if (run.status === "FAILED" || run.status === "CANCELED") {
      return NextResponse.json(
        { status: run.status, error: `Magica run ended with status ${run.status}: ${JSON.stringify(run.error ?? "")}` },
        { status: 500 }
      );
    }

    if (run.status !== "COMPLETED") {
      // Still processing -- tell the client to keep polling.
      return NextResponse.json({ status: run.status || "PROCESSING" });
    }

    // The completed run's payload shape isn't fully documented, so try a
    // handful of plausible locations for the model's text output before
    // giving up -- and if none work, surface the actual run object (not
    // just a bare "Unexpected end of JSON input") so the real shape is
    // visible instead of having to guess blind.
    const candidateTexts: unknown[] = [
      run.output,
      run.output?.text,
      run.response,
      run.response?.text,
      run.result,
      run.result?.text,
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
      // Exclude the echoed "input" field before dumping the run object --
      // it contains the entire base64-encoded PDF we sent, which would
      // otherwise eat the whole diagnostic slice before reaching the
      // actually useful output field.
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
    const maritalStatus = normalizeMaritalStatus(extracted.maritalStatusRaw || "");

    return NextResponse.json({
      status: "COMPLETED",
      data: {
        name: extracted.name || "",
        homeAddress: extracted.homeAddress || "",
        born: extracted.born || "",
        maritalStatus,
        estimatedNetWorth: extracted.estimatedNetWorth || "",
        estimatedIncome: extracted.estimatedIncome || "",
        givingCapacity: extracted.givingCapacity || "",
        wealthRating: extracted.wealthRating || "",
        relationshipToOrg: extracted.relationshipToOrg || "",
        additionalInformation: extracted.additionalInformation || "",
        boards: extracted.boards || "",
        businessAddresses: extracted.businessAddresses || "",
        childrenRows: Array.isArray(extracted.childrenRows) ? extracted.childrenRows : [],
        educationEntries: Array.isArray(extracted.educationEntries) ? extracted.educationEntries : [],
        realEstate: Array.isArray(extracted.realEstate) ? extracted.realEstate : [],
        otherGiving: Array.isArray(extracted.otherGiving) ? extracted.otherGiving : [],
        fecGiving: Array.isArray(extracted.fecGiving) ? extracted.fecGiving : [],
        totalCharitableGiving: extracted.totalCharitableGiving || "",
      },
    });
  } catch (err: any) {
    console.error("research-pdf-import status error", err);
    return NextResponse.json(
      { error: err?.message || "Failed to check the import status. Please try again." },
      { status: 500 }
    );
  }
}
