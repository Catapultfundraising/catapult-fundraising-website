import { createHash, timingSafeEqual } from "node:crypto";
import { get } from "@vercel/blob";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Temporary approved original-byte extraction. Remove after collection.
// Absolute expiry: never renewed by cold starts or redeployments.
const EXPIRES_AT = Date.parse("2026-11-18T14:00:00.000Z");
const MAX_OBJECT = 64 * 1024 * 1024;
const MAX_CHUNK = 262144;
const PATHS = new Map([
  ["snapshot", "pvas-data/snapshot.json"],
  ["records", "pvas-data/records.json"],
  ["tracking", "pvas-data/tracking.json"],
  ["pirs", "pvas-data/pirs.json"],
  ["ids", "pvas-data/ids.json"],
]);
const PRIVATE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  "CDN-Cache-Control": "no-store",
  "Vercel-CDN-Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
};
function failure(status: number, error: string) {
  return Response.json({ error }, { status, headers: PRIVATE_HEADERS });
}
function integer(value: string | null): number | null {
  if (value === null || !/^(0|[1-9][0-9]{0,8})$/.test(value)) return null;
  const n = Number(value);
  return Number.isSafeInteger(n) ? n : null;
}
function strongEtag(value: string | null): value is string {
  return value !== null && /^"[\x21\x23-\x7e]{1,200}"$/.test(value);
}

// Only the <=256KiB chunk mode retains bytes; metadata hashes incrementally.
async function consume(stream: ReadableStream<Uint8Array>, expected: number, retain: boolean, signal: AbortSignal) {
  const reader = stream.getReader(), hash = createHash("sha256"), chunks: Buffer[] = [];
  let bytes = 0;
  let onAbort: () => void = () => {};
  const aborted = new Promise<never>((_, reject) => {
    onAbort = () => reject(new Error("aborted"));
    signal.addEventListener("abort", onAbort, { once: true });
    if (signal.aborted) onAbort();
  });
  try {
    const reading = (async () => {
      while (true) {
        const result = await reader.read();
        if (result.done) break;
        bytes += result.value.byteLength;
        if (bytes > expected) throw new Error("length");
        hash.update(result.value);
        if (retain) chunks.push(Buffer.from(result.value));
      }
      if (bytes !== expected) throw new Error("length");
      return { bytes, sha256: hash.digest("hex"), body: retain ? Buffer.concat(chunks) : null };
    })();
    return await Promise.race([reading, aborted]);
  } finally {
    signal.removeEventListener("abort", onAbort);
    void reader.cancel().catch(() => {});
  }
}

export async function GET(req: Request) {
  if (process.env.VERCEL_ENV !== "production" || Date.now() >= EXPIRES_AT) return failure(404, "unavailable");
  const secret = process.env.CRON_SECRET;
  const supplied = Buffer.from(req.headers.get("authorization") || "");
  const expected = Buffer.from(`Bearer ${secret || ""}`);
  if (!secret || supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return failure(401, "unauthorized");
  if (req.method !== "GET") return failure(405, "method");

  const query = new URL(req.url).searchParams;
  const part = query.get("part") || "", path = PATHS.get(part), mode = query.get("mode");
  if (!path || (mode !== "metadata" && mode !== "chunk")) return failure(400, "parameters");
  const allowed = mode === "metadata" ? ["part", "mode"] : ["part", "mode", "offset", "length", "etag", "total"];
  if (query.size !== allowed.length || allowed.some(key => query.getAll(key).length !== 1) ||
      [...query.keys()].some(key => !allowed.includes(key))) return failure(400, "parameters");

  let offset = 0, length = 0, total = 0, etag = "";
  if (mode === "chunk") {
    const o = integer(query.get("offset")), l = integer(query.get("length")), t = integer(query.get("total"));
    const e = query.get("etag");
    if (o === null || l === null || t === null || l < 1 || l > MAX_CHUNK ||
        t < 1 || t > MAX_OBJECT || o >= t || o + l > t || !strongEtag(e)) return failure(400, "parameters");
    offset = o; length = l; total = t; etag = e;
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45000);
  let stream: ReadableStream<Uint8Array> | null = null;
  try {
    const blob = await get(path, {
      access: "private", useCache: false, abortSignal: controller.signal,
      headers: { "Accept-Encoding": "identity",
        ...(mode === "chunk" ? { Range: `bytes=${offset}-${offset + length - 1}`, "If-Match": etag } : {}) },
    });
    if (!blob) return failure(404, "missing");
    if (blob.statusCode !== 200) return failure(409, "source_changed");
    stream = blob.stream;
    const h = blob.headers, sourceEtag = h.get("etag"), size = integer(h.get("content-length"));
    if (!strongEtag(sourceEtag) || blob.blob.etag !== sourceEtag || blob.blob.pathname !== path ||
        size === null || blob.blob.size !== size ||
        (h.get("content-encoding") !== null && h.get("content-encoding") !== "identity")) return failure(409, "source_invalid");
    if (mode === "metadata") {
      if (size > MAX_OBJECT || h.has("content-range")) return failure(409, "source_invalid");
      const result = await consume(stream, size, false, controller.signal);
      const lastModified = h.get("last-modified");
      return Response.json({ part, bytes: result.bytes, sha256: result.sha256, etag: sourceEtag,
        ...(lastModified ? { lastModified } : {}) }, { headers: PRIVATE_HEADERS });
    }
    // SDK reports successful statusCode200 even for upstream206.
    // Require exact range evidence; never fall back to a full read.
    if (sourceEtag !== etag || size !== length ||
        h.get("content-range") !== `bytes ${offset}-${offset + length - 1}/${total}`) return failure(409, "source_changed");
    const result = await consume(stream, length, true, controller.signal);
    return new Response(new Uint8Array(result.body!), { status: 206, headers: {
      ...PRIVATE_HEADERS, "Content-Type": "application/octet-stream", "Content-Length": String(length),
      "Content-Range": `bytes ${offset}-${offset + length - 1}/${total}`, ETag: sourceEtag,
      "X-Content-SHA256": result.sha256, "X-PVAS-Part": part, "X-PVAS-Offset": String(offset),
      "X-PVAS-Total": String(total),
    } });
  } catch {
    // No upstream errors, credentials or source content enter logs/responses.
    return failure(503, "storage_unavailable");
  } finally {
    clearTimeout(timer);
    controller.abort();
    if (stream && !stream.locked) void stream.cancel().catch(() => {});
  }
}

// Override automatic method responses so failures also remain no-store.
export const HEAD = GET;
export const POST = GET;
export const PUT = GET;
export const PATCH = GET;
export const DELETE = GET;
export const OPTIONS = GET;
