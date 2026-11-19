import "server-only";
import { get, put } from "@vercel/blob";
import type { ReadyStore } from "./dashboard-ready-cache.server";

export const readyBlobStore: ReadyStore | null = process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID ? {
  async read(path) {
    const r = await get(path, { access: "private", useCache: false });
    if (!r) return null;
    if (!r.stream || !r.blob.etag) throw Error("Ready blob metadata unavailable");
    return { body: Buffer.from(await new Response(r.stream).arrayBuffer()), etag: r.blob.etag };
  },
  async put(path, body, expected) {
    const result = await put(path, body, {
      access: "private", addRandomSuffix: false,
      ...(expected === null ? { allowOverwrite: false } : { ifMatch: expected }),
      contentType: path.endsWith(".json") ? "application/json" : "application/octet-stream",
      multipart: body.length > 50_000_000,
    });
    if (!result.etag) throw Error("Ready blob ETag unavailable");
    return result.etag;
  },
} : null;
