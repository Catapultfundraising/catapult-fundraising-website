import { createHash, timingSafeEqual } from "node:crypto";
import { get, put, list, BlobNotFoundError } from "@vercel/blob";
import { SurveyConflictError, validateSurvey, SUBMITTED_REVISION, type SurveyResponse, type SurveyWrite } from "@/lib/csnf-online-survey";

// V2 is isolated from the earlier anonymous schema and from preview storage.
const prefix = () => `csnf-survey/v2/${process.env.VERCEL_ENV === "preview" ? "preview" : "production"}/sessions/`;
interface Owner { tokenHash: string; createdAt: string }
interface Receipt extends SurveyResponse { digest: string }
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const digest = (value: unknown) => hash(JSON.stringify(value));
async function readJson<T>(path: string): Promise<T | null> {
  try {
    const result = await get(path, { access: "private", useCache: false });
    if (!result) return null;
    if (result.statusCode !== 200 || !result.stream) throw new Error("Survey receipt unavailable");
    return JSON.parse(await new Response(result.stream).text()) as T;
  } catch (error) {
    if (error instanceof BlobNotFoundError) return null;
    throw error;
  }
}
async function createOnly<T>(path: string, value: T, verify: (existing: T) => void) {
  const existing = await readJson<T>(path);
  if (existing) { verify(existing); return existing; }
  try {
    await put(path, JSON.stringify(value), { access: "private", contentType: "application/json", addRandomSuffix: false, allowOverwrite: false });
    return value;
  } catch (error) {
    // Both concurrent create and lost successful acknowledgement are resolved
    // by verifying the actual immutable object, never caller-supplied hashes.
    const saved = await readJson<T>(path);
    if (!saved) throw error;
    verify(saved);
    return saved;
  }
}
function payload(valid: SurveyWrite) {
  const { writeToken: _secret, ...data } = valid;
  return data;
}
function receiptPayload(r: SurveyResponse) {
  return {
    id: r.id, revision: r.revision, status: r.status, surveyVersion: r.surveyVersion,
    firstName: r.firstName, lastName: r.lastName, telephone: r.telephone, answers: r.answers,
  };
}
function verifyReceipt(r: Receipt) {
  if (digest({ ...receiptPayload(r), createdAt: r.createdAt, updatedAt: r.updatedAt, submittedAt: r.submittedAt }) !== r.digest || !validTimestamp(r.createdAt) || !validTimestamp(r.updatedAt) ||
    (r.status === "submitted" ? r.submittedAt !== r.updatedAt || r.revision !== SUBMITTED_REVISION : r.submittedAt !== null) ||
    r.createdAt > r.updatedAt) throw new Error("Invalid survey receipt");
  // Reuse all field/option constraints without storing or exporting a capability.
  validateSurvey({ ...receiptPayload(r), writeToken: "0".repeat(64) });
}
function validTimestamp(value: string) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) &&
    Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
}

export async function saveSurvey(input: unknown) {
  const valid = validateSurvey(input);
  const base = `${prefix()}${valid.id}/`;
  const tokenHash = hash(`csnf-survey-write-v2:${valid.writeToken}`);
  const owner = await createOnly<Owner>(`${base}owner.json`, { tokenHash, createdAt: new Date().toISOString() }, existing => {
    if (typeof existing.tokenHash !== "string" || existing.tokenHash.length !== tokenHash.length ||
      !timingSafeEqual(Buffer.from(existing.tokenHash), Buffer.from(tokenHash))) throw new SurveyConflictError("This survey session cannot be updated.");
  });
  if (!validTimestamp(owner.createdAt)) throw new Error("Invalid session");
  const finalPath = `${base}submitted.json`;
  const terminal = await readJson<Receipt>(finalPath);
  const data = payload(valid), fingerprint = digest(data);
  const verifySame = (existing: Receipt) => {
    verifyReceipt(existing);
    if (digest(receiptPayload(existing)) !== fingerprint) throw new SurveyConflictError("This survey revision has already been saved with different information.");
  };
  if (terminal) {
    verifySame(terminal);
    return { id: terminal.id, revision: terminal.revision, status: terminal.status, updatedAt: terminal.updatedAt };
  }
  const now = new Date().toISOString();
  const record = {
    ...data, createdAt: owner.createdAt, updatedAt: now,
    submittedAt: valid.status === "submitted" ? now : null,
  };
  const receipt: Receipt = { ...record, digest: digest(record) };
  const path = valid.status === "submitted" ? finalPath : `${base}revision-${String(valid.revision).padStart(7, "0")}.json`;
  const saved = await createOnly<Receipt>(path, receipt, verifySame);
  return { id: saved.id, revision: saved.revision, status: saved.status, updatedAt: saved.updatedAt };
}

// Project once per session AFTER filtering by cutoff. A Saturday edit cannot
// erase a Friday partial response. Final status always wins over late drafts,
// including a draft whose network request began before finalization.
export async function listSurveyResponses(asOf: Date = new Date()): Promise<SurveyResponse[]> {
  if (!Number.isFinite(asOf.getTime())) throw new Error("Invalid survey cutoff");
  const sessions = new Map<string, Receipt>();
  let cursor: string | undefined;
  do {
    const page = await list({ prefix: prefix(), cursor, limit: 1000 });
    const paths = page.blobs.filter(b => /\/(?:revision-\d{7}|submitted)\.json$/.test(b.pathname));
    for (let i = 0; i < paths.length; i += 10) {
      const batch = await Promise.all(paths.slice(i, i + 10).map(async blob => {
        const receipt = await readJson<Receipt>(blob.pathname);
        if (!receipt) throw new Error("Survey receipt missing");
        verifyReceipt(receipt);
        if (blob.pathname !== `${prefix()}${receipt.id}/${receipt.status === "submitted" ? "submitted" : `revision-${String(receipt.revision).padStart(7, "0")}`}.json`) throw new Error("Survey receipt path mismatch");
        return receipt;
      }));
      for (const r of batch) {
        if (Date.parse(r.updatedAt) > asOf.getTime()) continue;
        const previous = sessions.get(r.id);
        if (!previous || r.revision > previous.revision) sessions.set(r.id, r);
      }
    }
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return [...sessions.values()].map(({ digest: _internal, ...r }) => r)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
}
