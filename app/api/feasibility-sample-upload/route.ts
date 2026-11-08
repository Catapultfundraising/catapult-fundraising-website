import { createHash, timingSafeEqual } from "node:crypto";
import { get, issueSignedToken, presignUrl } from "@vercel/blob";
import { SAMPLE_PREFIX, sampleAsset } from "@/lib/feasibility-sample";
import manifest from "@/lib/feasibility-sample-assets.json";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Provisioning only: CRON_SECRET, never the prospect-facing sales password.
// Delegates PUT for one immutable allowlisted object for five minutes; never GET,
// DELETE, wildcards or overwrite. Uploaded bytes can then be independently verified.
export async function POST(req: Request) {
  const headers = { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow, noarchive" };
  const secret = process.env.CRON_SECRET;
  const supplied = Buffer.from(req.headers.get("authorization") || "");
  const expected = Buffer.from(`Bearer ${secret || ""}`);
  if (!secret || supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return Response.json({ ok: false }, { status: 401, headers });
  const text = await req.text();
  if (text.length > 1024) return Response.json({ ok: false }, { status: 413, headers });
  let body; try { body = JSON.parse(text); } catch { return Response.json({ ok: false }, { status: 400, headers }); }
  const name = typeof body?.name === "string" ? body.name : "";
  const asset = sampleAsset(name);
  const entry = Object.hasOwn(manifest, name) ? manifest[name as keyof typeof manifest] : null;
  if (!asset || !entry || !["prepare", "verify"].includes(body.op)) return Response.json({ ok: false }, { status: 400, headers });
  const pathname = SAMPLE_PREFIX + name;
  try {
    if (body.op === "verify") {
      const blob = await get(pathname, { access: "private", useCache: false });
      if (!blob || blob.statusCode !== 200) return Response.json({ ok: false }, { status: 404, headers });
      const bytes = Buffer.from(await new Response(blob.stream).arrayBuffer());
      const ok = bytes.length === entry.bytes && createHash("sha256").update(bytes).digest("hex") === entry.sha256;
      return Response.json({ ok, name }, { status: ok ? 200 : 409, headers });
    }
    const validUntil = Date.now() + 5 * 60 * 1000;
    const token = await issueSignedToken({ pathname, operations: ["put"], allowedContentTypes: [asset.contentType], maximumSizeInBytes: entry.bytes, validUntil });
    const { presignedUrl } = await presignUrl(token, { operation: "put", pathname, access: "private", validUntil,
      allowedContentTypes: [asset.contentType], maximumSizeInBytes: entry.bytes, addRandomSuffix: false, allowOverwrite: false });
    return Response.json({ presignedUrl, contentType: asset.contentType, bytes: entry.bytes, sha256: entry.sha256, validUntil }, { headers });
  } catch { return Response.json({ ok: false, error: "Private storage unavailable." }, { status: 503, headers }); }
}
