import { put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import { CSNF_DATA_PATH, CSNF_RECORDS_PATH } from "@/lib/csnf-data-store";
import { CSNF_PIRS_PATH } from "@/lib/csnf-tracking";
import { JAG_DATA_PATH, JAG_RECORDS_PATH } from "@/lib/jag-data-store";
import { JAG_PIRS_PATH } from "@/lib/jag-tracking";
import { closePool } from "@/lib/portal-refresh/common";
import { buildCsnf } from "@/lib/portal-refresh/csnf";
import { buildJag } from "@/lib/portal-refresh/jag";
import { buildPvas } from "@/lib/portal-refresh/pvas";
import { PVAS_DATA_PATH, PVAS_RECORDS_PATH } from "@/lib/pvas-data-store";
import { PVAS_PIRS_PATH } from "@/lib/pvas-tracking";

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";
// Static IPs are per region; pin to the project's function region (iad1) so egress uses the allow-listed IP.
export const preferredRegion = "iad1";

// ---------------------------------------------------------------------------
// Weekly Azure SQL -> data-portal refresh (replaces Viktor's Access-file scripts).
//
//   GET|POST /api/portal-data-refresh?client=all|csnf|jag|pvas[&dry=1]
//
// Auth: Authorization: Bearer $CRON_SECRET (Vercel cron sends this on GET).
// Reads Azure SQL (env AZURE_SQL_SERVER/DB/USER/PASSWORD, read-only login
// portal_reader) through the project's Secure Compute static IP and rewrites
// {client}-data/snapshot.json, records.json and pirs.json. tracking.json is
// never touched. dry=1 builds and returns counts without writing blobs.
// ---------------------------------------------------------------------------

const TARGETS = {
  csnf: { build: buildCsnf, paths: { snapshot: CSNF_DATA_PATH, records: CSNF_RECORDS_PATH, pirs: CSNF_PIRS_PATH } },
  jag: { build: buildJag, paths: { snapshot: JAG_DATA_PATH, records: JAG_RECORDS_PATH, pirs: JAG_PIRS_PATH } },
  pvas: { build: buildPvas, paths: { snapshot: PVAS_DATA_PATH, records: PVAS_RECORDS_PATH, pirs: PVAS_PIRS_PATH } },
} as const;
type Client = keyof typeof TARGETS;

async function run(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const p = req.nextUrl.searchParams;
  const which = p.get("client") ?? "all";
  const dry = p.get("dry") === "1";
  const clients: Client[] = which === "all" ? ["csnf", "jag", "pvas"] : which in TARGETS ? [which as Client] : [];
  if (!clients.length) return NextResponse.json({ error: "client must be all|csnf|jag|pvas" }, { status: 400 });

  const results: Record<string, unknown> = {};
  let failed = false;
  try {
    for (const c of clients) {
      try {
        const { snapshot, records, pirs } = await TARGETS[c].build();
        const summary = {
          asOf: snapshot.asOf, gifts: snapshot.kpi.gifts, total: snapshot.kpi.total, donors: snapshot.kpi.donors,
          constituents: snapshot.health.constituents, records: records.index.length, pirs: Object.keys(pirs).length,
          pool: snapshot.pool.length, highWealth: snapshot.highWealthCount,
        };
        // Guard: never overwrite a live portal with an empty build (e.g. a half-finished reload).
        if (!snapshot.kpi.gifts || !records.index.length) throw new Error(`empty build: ${JSON.stringify(summary)}`);
        if (!dry) {
          const opts = { access: "private" as const, contentType: "application/json", addRandomSuffix: false, allowOverwrite: true };
          const P = TARGETS[c].paths;
          await put(P.snapshot, JSON.stringify(snapshot), opts);
          await put(P.records, JSON.stringify(records), opts);
          // Keep the existing PIR blob if the table is empty (PIR matching is still run by Viktor).
          if (Object.keys(pirs).length) await put(P.pirs, JSON.stringify(pirs), opts);
        }
        results[c] = { ok: true, saved: !dry, ...summary };
      } catch (e) {
        failed = true;
        results[c] = { ok: false, error: e instanceof Error ? e.message : String(e) };
      }
    }
  } finally {
    await closePool().catch(() => undefined);
  }
  console.log("portal-data-refresh", JSON.stringify(results));
  return NextResponse.json({ ok: !failed, dry, results }, { status: failed ? 500 : 200 });
}

export const GET = run;
export const POST = run;
