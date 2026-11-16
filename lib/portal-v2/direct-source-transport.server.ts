import "server-only";
import type { PortalClient } from "./clients";
/** Existing source-import transport configuration owner, never portal-v2 or a caller URL.
 * No configuration values, fallback host, credentials or retry are introduced. */
export class DirectTransportError extends Error {
  constructor(public code: string, public unconfirmed: boolean) { super(code); }
}
const SOURCE_OPS = ["directFileCapabilities", "directFileResolve", "directFilePreview", "directFileCommit", "directFileStatus", "directFileState"];
export async function readBoundedStream(stream: ReadableStream<Uint8Array> | null, limit: number, timeoutMs: number) {
  const reader = stream?.getReader();
  if (!reader) throw new Error("missing-body");
  const chunks: Uint8Array[] = []; let length = 0, timedOut = false, timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => { timer = setTimeout(() => { timedOut = true; reject(new Error("body-deadline")); void reader.cancel().catch(() => {}); }, timeoutMs); });
  try {
    while (true) {
      const r = await Promise.race([reader.read(), deadline]);
      if (timedOut) throw new Error("body-deadline");
      if (r.done) break;
      length += r.value.byteLength;
      if (length > limit) { void reader.cancel().catch(() => {}); throw new Error("body-too-large"); }
      chunks.push(r.value);
    }
    return Buffer.concat(chunks);
  } finally { clearTimeout(timer); reader.releaseLock(); }
}
export async function directSourceCall(client: PortalClient, op: string, body: Record<string, unknown> = {}, fetchImpl = fetch, env = process.env): Promise<{ status: number; body: Record<string, unknown> }> {
  const committing = op === "directFileCommit";
  if (!SOURCE_OPS.includes(op) || Object.prototype.hasOwnProperty.call(body, "op") || Object.prototype.hasOwnProperty.call(body, "client")) throw new DirectTransportError("invalid-source-envelope", false);
  const url = env.ENGAGE_SOURCE_IMPORT_URL?.trim(), secret = env.PORTAL_WRITE_SECRET;
  if (!url || !secret || secret.length < 24) throw new DirectTransportError("source-unconfigured", false);
  let target: URL; try { target = new URL(url); } catch { throw new DirectTransportError("source-unconfigured", false); }
  if (target.protocol !== "https:" || target.pathname !== "/api/source-import" || target.search || target.hash || target.username || target.password) throw new DirectTransportError("source-unconfigured", false);
  const envelope = op === "directFilePreview" || op === "directFileCommit" ? { op, ...body } : { op, client, ...body };
  try {
    const response = await fetchImpl(url, { method: "POST", redirect: "error", cache: "no-store", signal: AbortSignal.timeout(125_000),
      headers: { "content-type": "application/json", authorization: `Bearer ${secret}` }, body: JSON.stringify(envelope) });
    const raw = await readBoundedStream(response.body, 2_000_000, 10_000), parsed: unknown = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(raw));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed) || response.status >= 500) throw new DirectTransportError("source-response-unconfirmed", committing);
    return { status: response.status, body: parsed as Record<string, unknown> };
  } catch (e) {
    if (e instanceof DirectTransportError) throw e;
    throw new DirectTransportError("source-response-unconfirmed", committing);
  }
}
