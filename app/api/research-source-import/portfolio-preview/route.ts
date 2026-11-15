import { NextRequest, NextResponse } from "next/server";
import { isResearchAuthed } from "@/lib/research-auth";
import { fixture, inspect, mappingProfile, plan, previewAvailable, simulate, SAMPLE } from "@/lib/portal-v2/portfolio-preview";
import { fileInfo, FilePreviewError } from "@/lib/portal-v2/source-file-preview";
import { syntheticPortfolioWorkbook } from "@/lib/portal-v2/portfolio-preview-fixture";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Dedicated synthetic adapter: intentionally NO imports of server.ts, transport, SQL or Blob.
export async function POST(req: NextRequest) {
  const reply = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "cache-control": "no-store" } });
  if (!previewAvailable()) return reply({ error: "Not found" }, 404);
  if (!process.env.RESEARCH_PASSWORD || !process.env.RESEARCH_AUTH_SECRET || !(await isResearchAuthed(req))) return reply({ error: "Unauthorized" }, 401);
  const origin = req.headers.get("origin"), host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  try { if (!origin || new URL(origin).host !== host || !req.headers.get("content-type")?.startsWith("application/json")) return reply({ error: "Same-origin JSON required" }, 403); }
  catch { return reply({ error: "Same-origin JSON required" }, 403); }
  if (Number(req.headers.get("content-length") || 0) > 3_500_000) return reply({ error: "Request too large" }, 413);
  const text = await req.text();
  if (Buffer.byteLength(text) > 3_500_000) return reply({ error: "Request too large" }, 413);
  try {
    const b = JSON.parse(text);
    if (b.op === "context") return reply({ state: fixture(b.client), sample: SAMPLE });
    if (b.op === "sampleXlsx") return reply({ bytes: syntheticPortfolioWorkbook().toString("base64") });
    if (b.op === "fileInfo") return reply(fileInfo(b.bytes, b.format));
    if (b.op === "inspect") return reply({ headers: inspect(b.bytes, b.parseSettings).headers });
    if (b.op === "profile") return reply(mappingProfile(b.client, b.bytes, b.mapping, b.profile, b.parseSettings));
    if (b.op === "preview") return reply(plan(b.input));
    if (b.op === "simulate") return reply(simulate(b.input, b.binding));
    return reply({ error: "Unknown simulation operation" }, 400);
  } catch (error) { return reply({ error: error instanceof FilePreviewError ? error.message : "Simulation refused: check file headers, worksheet/header row, exact client scope, required mapping, source date and staff attribution. If inputs changed, preview again or reset." }, 400); }
}
