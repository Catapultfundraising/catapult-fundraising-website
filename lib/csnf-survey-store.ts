import { createHash } from "node:crypto";
import { get, put, list, BlobNotFoundError } from "@vercel/blob";
import { SurveyConflictError, validateSurvey, type SurveyResponse } from "@/lib/csnf-online-survey";

// Separate preview namespace as defense in depth; public POST is also disabled
// on preview deployments. No mutable shared response array / lost-update race.
const prefix = () => `csnf-survey/${process.env.VERCEL_ENV === "preview" ? "preview" : "production"}/responses/`;
interface Receipt extends SurveyResponse { digest: string }
const digest = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
async function readReceipt(path: string): Promise<Receipt | null> {
  try {
    const result = await get(path, { access: "private", useCache: false });
    if (!result) return null;
    if (result.statusCode !== 200 || !result.stream) throw new Error("Survey receipt unavailable");
    return JSON.parse(await new Response(result.stream).text()) as Receipt;
  } catch (error) {
    if (error instanceof BlobNotFoundError) return null;
    throw error; // Storage outages must never masquerade as an empty roster.
  }
}

export async function saveSurvey(input: unknown): Promise<{ id: string }> {
  const valid = validateSurvey(input);
  const fingerprint = digest(valid);
  const path = `${prefix()}${valid.id}.json`;
  const verify = (existing: Receipt) => {
    // Re-hash the actual stored payload as well as comparing the supplied one.
    const actual = digest({ id: existing.id, surveyVersion: existing.surveyVersion, answers: existing.answers });
    if (actual !== existing.digest || actual !== fingerprint) throw new SurveyConflictError("This submission ID has already been used.");
    return { id: existing.id };
  };
  const existing = await readReceipt(path);
  if (existing) return verify(existing);
  const receipt: Receipt = { ...valid, submittedAt: new Date().toISOString(), digest: fingerprint };
  try {
    await put(path, JSON.stringify(receipt), {
      access: "private", contentType: "application/json",
      addRandomSuffix: false, allowOverwrite: false,
    });
  } catch (error) {
    // Handles both concurrent create conflict and an ambiguous network failure
    // after a durable write. Never return success without observing the receipt.
    const saved = await readReceipt(path);
    if (saved) return verify(saved);
    throw error;
  }
  return { id: valid.id };
}

export async function listSurveyResponses(): Promise<SurveyResponse[]> {
  const responses: SurveyResponse[] = [];
  let cursor: string | undefined;
  do {
    const page = await list({ prefix: prefix(), cursor, limit: 1000 });
    for (let i = 0; i < page.blobs.length; i += 10) {
      const batch = await Promise.all(page.blobs.slice(i, i + 10).map(async blob => {
        const receipt = await readReceipt(blob.pathname);
        if (!receipt) throw new Error("Survey receipt missing");
        const valid = validateSurvey({ id: receipt.id, surveyVersion: receipt.surveyVersion, answers: receipt.answers });
        if (digest(valid) !== receipt.digest || !Number.isFinite(Date.parse(receipt.submittedAt))) throw new Error("Invalid survey receipt");
        return { ...valid, submittedAt: receipt.submittedAt };
      }));
      responses.push(...batch);
    }
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return responses.sort((a, b) => a.submittedAt.localeCompare(b.submittedAt) || a.id.localeCompare(b.id));
}
