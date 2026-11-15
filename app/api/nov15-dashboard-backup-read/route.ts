import { createHash, timingSafeEqual } from "node:crypto";
import { get } from "@vercel/blob";

// Temporary preview-only preservation reader. No publication or SQL operations.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
const STORE = "store_e7SitofNOvoFTa0p";
const PREFIX = "DASHBOARD_BACKUP_READ_NOV15_";
const CLIENTS = ["baq", "csnf", "jag", "pvas", "wcbhc"];
const KINDS = ["snapshot", "records", "pirs", "ids"];
const CHUNK_BYTES = 2 * 1024 * 1024;
const MAX_BYTES = 64 * 1024 * 1024;
const READ_MS = 30_000;
const headers = {
  "Cache-Control": "private, no-store, max-age=0",
  "CDN-Cache-Control": "no-store",
  "Vercel-CDN-Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};
const sha = (value: string | Uint8Array) => createHash("sha256").update(value).digest();
const fail = (status: number, error: string) => Response.json({ error }, { status, headers });

// Date.parse alone normalizes impossible dates. Require the exact UTC calendar.
function timestamp(value: string | undefined): number {
  if (!value || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)) return NaN;
  const time = Date.parse(value);
  const canonical = value.includes(".") ? value : value.replace("Z", ".000Z");
  return Number.isFinite(time) && new Date(time).toISOString() === canonical ? time : NaN;
}

export async function GET(request: Request): Promise<Response> {
  if (request.method !== "GET") return fail(405, "METHOD_NOT_ALLOWED");
  if (process.env.VERCEL_ENV !== "preview" || process.env[`${PREFIX}ENABLED`] !== "true") return fail(404, "DISABLED");
  const start = timestamp(process.env[`${PREFIX}STARTS_AT`]);
  const end = timestamp(process.env[`${PREFIX}EXPIRES_AT`]);
  const now = Date.now();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start || end - start > 90 * 60_000) return fail(403, "INVALID_WINDOW");
  if (now < start || now >= end) return fail(403, "INACTIVE_WINDOW");
  const secret = process.env.PORTAL_WRITE_SECRET;
  const auth = request.headers.get("authorization") ?? "";
  if (!secret || auth.length > 8192 || !timingSafeEqual(sha(auth), sha(`Bearer ${secret}`))) return fail(401, "UNAUTHORIZED");
  const query = new URL(request.url).searchParams;
  if ([...query.keys()].some((key) => !["client", "kind", "chunk"].includes(key) || query.getAll(key).length !== 1)) return fail(400, "INVALID_QUERY");
  const client = query.get("client") ?? "", kind = query.get("kind") ?? "", rawChunk = query.get("chunk") ?? "";
  if (!CLIENTS.includes(client) || !KINDS.includes(kind) || !/^(?:0|[1-9]\d?)$/.test(rawChunk) || Number(rawChunk) >= MAX_BYTES / CHUNK_BYTES) return fail(400, "INVALID_QUERY");
  // Never silently select a different store or fall back to a read/write token.
  if (process.env.BLOB_STORE_ID !== STORE || process.env.BLOB_READ_WRITE_TOKEN ||
      process.env.VERCEL_BLOB_API_URL || process.env.NEXT_PUBLIC_VERCEL_BLOB_API_URL) return fail(503, "STORE_MISMATCH");
  if (request.signal.aborted) return fail(499, "READ_ABORTED");
  const path = `${client}-data/${kind}.json`;
  const controller = new AbortController();
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let reason = "READ_FAILED";
  const deadline = Math.min(end, now + READ_MS);
  const cancel = () => {
    controller.abort();
    void reader?.cancel().catch(() => {});
  };
  let onAbort: () => void = () => {};
  try {
    const interrupted = new Promise<never>((_, reject) => {
      const stop = (code: string) => { reason = code; cancel(); reject(new Error(code)); };
      timer = setTimeout(() => stop("READ_TIMEOUT"), Math.max(0, deadline - Date.now()));
      onAbort = () => stop("READ_ABORTED");
      request.signal.addEventListener("abort", onAbort, { once: true });
      if (request.signal.aborted) onAbort();
    });
    // Exactly one uncached, private OIDC read per call, with a fixed store/path.
    const blob = await Promise.race([get(path, { access: "private", useCache: false, storeId: STORE, abortSignal: controller.signal }), interrupted]);
    if (!blob) return fail(404, kind === "snapshot" || kind === "records" ? "REQUIRED_BLOB_MISSING" : "OPTIONAL_BLOB_MISSING");
    if (blob.statusCode !== 200 || !blob.stream) return fail(502, "INVALID_BLOB");
    reader = blob.stream.getReader();
    if (blob.blob.pathname !== path) return fail(502, "INVALID_BLOB");
    if (!Number.isSafeInteger(blob.blob.size) || blob.blob.size < 0 || blob.blob.size > MAX_BYTES) return fail(413, "BLOB_TOO_LARGE");
    const parts: Uint8Array[] = [];
    let size = 0;
    const digest = createHash("sha256");
    while (true) {
      const part = await Promise.race([reader.read(), interrupted]);
      if (Date.now() >= deadline) { reason = "READ_TIMEOUT"; throw new Error(reason); }
      if (part.done) break;
      size += part.value.byteLength;
      if (size > MAX_BYTES) return fail(413, "BLOB_TOO_LARGE");
      digest.update(part.value);
      parts.push(part.value);
    }
    if (size !== blob.blob.size) return fail(502, "SIZE_MISMATCH");
    if (Date.now() >= end) return fail(403, "INACTIVE_WINDOW");
    const count = Math.max(1, Math.ceil(size / CHUNK_BYTES));
    const chunk = Number(rawChunk);
    if (chunk >= count) return fail(416, "CHUNK_OUT_OF_RANGE");
    // Fixed <=2MiB response avoids Vercel's buffered-response size limit.
    // Re-read/hash the full object on each call; callers must require stable
    // full hash + size + ETag across chunks before reassembly/JSON parsing.
    const bytes = Buffer.concat(parts, size).subarray(chunk * CHUNK_BYTES, (chunk + 1) * CHUNK_BYTES);
    const commit = process.env.VERCEL_GIT_COMMIT_SHA ?? "";
    return new Response(bytes, { headers: {
      ...headers,
      "Content-Type": "application/octet-stream",
      "Content-Length": String(bytes.length),
      "X-Content-SHA256": sha(bytes).toString("hex"),
      "X-Blob-SHA256": digest.digest("hex"),
      "X-Blob-Bytes": String(size),
      "X-Blob-ETag-SHA256": sha(blob.blob.etag).toString("hex"),
      "X-Chunk-Index": String(chunk),
      "X-Chunk-Count": String(count),
      "X-Chunk-Bytes": String(CHUNK_BYTES),
      ...( /^[a-f0-9]{40}$/.test(commit) ? { "X-Deployment-SHA": commit } : {}),
    } });
  } catch {
    return fail(reason === "READ_TIMEOUT" ? 504 : reason === "READ_ABORTED" ? 499 : 502, reason);
  } finally {
    if (timer) clearTimeout(timer);
    request.signal.removeEventListener("abort", onAbort);
    cancel();
  }
}

// Explicitly deny HEAD: Next's implicit HEAD would otherwise execute GET.
export const HEAD = () => fail(405, "METHOD_NOT_ALLOWED");
export const POST = HEAD;
export const PUT = HEAD;
export const PATCH = HEAD;
export const DELETE = HEAD;
export const OPTIONS = HEAD;
