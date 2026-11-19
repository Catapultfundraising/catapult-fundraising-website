import "server-only";
import { get, put, BlobPreconditionFailedError, BlobAccessError, BlobServiceNotAvailable,
  BlobServiceRateLimited, BlobNotFoundError, BlobError } from "@vercel/blob";
import type { ReadyStore } from "./dashboard-ready-cache.server";

function failure(error: unknown, operation: "read" | "write", etag = "", contentEncoded = false, representation = false) {
  const providerError = representation ? "representation" :
    error instanceof BlobPreconditionFailedError ? "precondition" :
    error instanceof BlobAccessError ? "access" :
    error instanceof BlobServiceNotAvailable ? "unavailable" :
    error instanceof BlobServiceRateLimited ? "rate-limited" :
    error instanceof BlobNotFoundError ? "not-found" :
    error instanceof BlobError ? "provider" : "unknown";
  return Object.assign(Error("Ready blob unavailable"), { readyBlobFailure: {
    operation, providerError, etagQuoted: etag.startsWith('"') && etag.endsWith('"'),
    etagWeak: etag.startsWith("W/"), contentEncoded,
  } });
}
export const readyBlobStore: ReadyStore | null = process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID ? {
  async read(path) {
    let etag = "", contentEncoded = false;
    try {
      // CAS needs the stored object's validator, not a compressed HTTP
      // representation validator. Preserve the opaque identity ETag verbatim.
      const r = await get(path, { access: "private", useCache: false,
        headers: { "accept-encoding": "identity" } });
      if (!r) return null;
      etag = r.blob.etag;
      const encoding = r.headers.get("content-encoding");
      contentEncoded = !!encoding && encoding.toLowerCase() !== "identity";
      if (contentEncoded || etag.startsWith("W/"))
        throw failure(undefined, "read", etag, contentEncoded, true);
      if (!r.stream || !etag) throw Error("Ready blob metadata unavailable");
      return { body: Buffer.from(await new Response(r.stream).arrayBuffer()), etag };
    } catch (error) {
      if (error && typeof error === "object" && "readyBlobFailure" in error) throw error;
      throw failure(error, "read", etag, contentEncoded);
    }
  },
  async put(path, body, expected) {
    try {
      if (expected?.startsWith("W/")) throw failure(undefined, "write", expected, false, true);
      const result = await put(path, body, {
        access: "private", addRandomSuffix: false,
        ...(expected === null ? { allowOverwrite: false } : { allowOverwrite: true, ifMatch: expected }),
        contentType: path.endsWith(".json") ? "application/json" : "application/octet-stream",
        multipart: body.length > 50_000_000,
      });
      if (!result.etag) throw Error("Ready blob ETag unavailable");
      return result.etag;
    } catch (error) {
      if (error && typeof error === "object" && "readyBlobFailure" in error) throw error;
      throw failure(error, "write", expected ?? "");
    }
  },
} : null;
