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

// --- Money parsing / normalization ------------------------------------------
//
// Wealth-screening PDFs write dollar amounts as shorthand like "$590K" or
// "$60M-120M". Before we can do arithmetic on these (giving capacity = annual
// giving x 5, or picking the midpoint of a net-worth range) we need to turn
// that shorthand into real numbers -- "$590K" means 590000, not 590.

function parseMoneyToNumber(raw: string | undefined | null): number | null {
  if (!raw) return null;
  const s = String(raw).trim();
  if (!s) return null;

  // Find every "$123,456.78" / "850K" / "1.2M" style token in the string, in
  // order. A range like "$60M-120M" or "$600K to $850K" yields two tokens.
  const tokenRe = /\$?\s*([\d,]*\.?\d+)\s*([KkMmBb])?/g;
  const matches: { num: number; suffix: string | null }[] = [];
  let m: RegExpExecArray | null;
  while ((m = tokenRe.exec(s)) !== null) {
    const numStr = m[1];
    if (!numStr || !/\d/.test(numStr)) continue;
    matches.push({ num: parseFloat(numStr.replace(/,/g, "")), suffix: m[2] ? m[2].toUpperCase() : null });
  }
  if (!matches.length) return null;

  // If an earlier number in a range has no unit suffix but a later one does
  // (e.g. "$600-850K"), assume they share the same unit.
  for (let i = 0; i < matches.length; i++) {
    if (!matches[i].suffix) {
      for (let j = i + 1; j < matches.length; j++) {
        if (matches[j].suffix) {
          matches[i].suffix = matches[j].suffix;
          break;
        }
      }
    }
  }

  const multiplier = (suffix: string | null) =>
    suffix === "K" ? 1e3 : suffix === "M" ? 1e6 : suffix === "B" ? 1e9 : 1;
  const values = matches.map((mm) => mm.num * multiplier(mm.suffix));

  if (values.length >= 2) {
    // A range -- use the midpoint of the first two numbers found.
    return (values[0] + values[1]) / 2;
  }
  return values[0];
}

function formatMoneyDisplay(n: number): string {
  if (n == null || !isFinite(n)) return "";
  const trim = (x: number) => x.toFixed(2).replace(/\.?0+$/, "");
  const abs = Math.abs(n);
  if (abs >= 1e9) return `$${trim(n / 1e9)}B`;
  if (abs >= 1e6) return `$${trim(n / 1e6)}M`;
  if (abs >= 1e3) return `$${trim(n / 1e3)}K`;
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

// If estimatedNetWorth is a range (e.g. "$60M-120M"), replace it with the
// midpoint (e.g. "$90M") so downstream math and display use a single real
// number instead of a range. Single values are left exactly as extracted.
function normalizeNetWorth(raw: string): string {
  if (!raw) return raw;
  const tokenRe = /\$?\s*([\d,]*\.?\d+)\s*([KkMmBb])?/g;
  let count = 0;
  let m: RegExpExecArray | null;
  while ((m = tokenRe.exec(raw)) !== null) {
    if (m[1] && /\d/.test(m[1])) count++;
  }
  if (count < 2) return raw; // not a range -- leave as-is
  const mid = parseMoneyToNumber(raw);
  if (mid == null) return raw;
  return formatMoneyDisplay(mid);
}

// Estimated giving capacity (5 years) = estimated ANNUAL giving x 5, with "K"
// / "M" shorthand translated into real numbers first. Falls back to whatever
// the source document directly states as a giving-capacity figure only if no
// annual giving amount could be found or parsed.
function computeGivingCapacity(annualRaw: string | undefined, fallbackRaw: string | undefined): string {
  const annual = parseMoneyToNumber(annualRaw);
  if (annual != null && annual > 0) {
    return formatMoneyDisplay(annual * 5);
  }
  return fallbackRaw || "";
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
    const estimatedNetWorth = normalizeNetWorth(extracted.estimatedNetWorth || "");
    const givingCapacity = computeGivingCapacity(extracted.estimatedAnnualGiving, extracted.givingCapacity);

    return NextResponse.json({
      status: "COMPLETED",
      data: {
        name: extracted.name || "",
        homeAddress: extracted.homeAddress || "",
        born: extracted.born || "",
        maritalStatus,
        estimatedNetWorth,
        estimatedIncome: extracted.estimatedIncome || "",
        givingCapacity,
        wealthRating: extracted.wealthRating || "",
        relationshipToOrg: extracted.relationshipToOrg || "",
        additionalInformation: extracted.additionalInformation || "",
        boards: extracted.boards || "",
        businessAddresses: extracted.businessAddresses || "",
        childrenRows: Array.isArray(extracted.childrenRows) ? extracted.childrenRows : [],
        educationEntries: Array.isArray(extracted.educationEntries) ? extracted.educationEntries : [],
        realEstate: Array.isArray(extracted.realEstate) ? extracted.realEstate : [],
        otherAssets: Array.isArray(extracted.otherAssets) ? extracted.otherAssets : [],
        estimatedLiquidity: extracted.estimatedLiquidity || "",
        liquidityExplanation: extracted.liquidityExplanation || "",
        spouseName: extracted.spouseName || "",
        parentsNames: extracted.parentsNames || "",
        hobbiesInterests: extracted.hobbiesInterests || "",
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
