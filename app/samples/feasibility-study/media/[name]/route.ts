import { sampleAuthorized } from "@/lib/feasibility-sample-auth";
import { SAMPLE_PDF_NAME, sampleAsset } from "@/lib/feasibility-sample";
import { readSampleAsset } from "@/lib/feasibility-sample-store";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(req: Request, ctx: { params: Promise<{ name: string }> }) {
  const headers = { "Cache-Control": "private, no-store", "Vary": "Cookie", "X-Robots-Tag": "noindex, nofollow, noarchive", "X-Content-Type-Options": "nosniff" };
  if (!(await sampleAuthorized())) return new Response("Unauthorized", { status: 401, headers });
  const { name } = await ctx.params;
  const asset = sampleAsset(name);
  if (!asset) return new Response("Not found", { status: 404, headers });
  try {
    const stream = await readSampleAsset(name);
    if (!stream) throw new Error("Unavailable");
    const pdf = asset.contentType === "application/pdf";
    const download = new URL(req.url).searchParams.get("download") === "1";
    return new Response(stream, { headers: { ...headers, "Content-Type": asset.contentType,
      ...(pdf ? { "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${SAMPLE_PDF_NAME}"` } : {}) } });
  } catch { return new Response("Sample temporarily unavailable. Please contact Catapult.", { status: 503, headers }); }
}
