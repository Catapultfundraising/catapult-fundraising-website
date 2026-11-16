import "server-only";
import { NextRequest, NextResponse } from "next/server";
import type { PortalClient } from "./clients";
import { dashboardDataAuthed } from "./direct-file-gateway.server";
import { engageCall, readIds } from "./server";
import { fileInfo, inspectSourceFile, originalBytes, type ParseSettings } from "./source-file-preview";
import { readBoundedStream } from "./direct-source-transport.server";
import { buildMonthlyRequest, MonthlyFileError, parseMonthlyFile, type MonthlyIdentity } from "./monthly-file.server";
import { confirmedMonthlyPlan, confirmedMonthlyReceipt, monthlyExact, monthlyHex, monthlyId, monthlyObject } from "./monthly-wire";
type Deps = { call: typeof engageCall; identities(client: PortalClient): Promise<MonthlyIdentity[] | null> };
const defaults: Deps = { call: engageCall, identities: readIds };
/** Same established employee authorization and portal-v2 SQL owner; never legacy tuple-dedup upload. */
export function monthlyGiftGateway(client: PortalClient, deps: Deps = defaults) {
  return async (req: NextRequest) => {
    if (!(await dashboardDataAuthed(client, req))) return NextResponse.json({ error: "Matching employee dashboard sign-in required", dashboardLogin: `/${client}/data-dashboard/login` }, { status: 401 });
    if (req.headers.get("origin") !== req.nextUrl.origin || req.headers.get("sec-fetch-site") === "cross-site") return NextResponse.json({ error: "Same origin required" }, { status: 403 });
    if (!req.headers.get("content-type")?.startsWith("application/json")) return NextResponse.json({ error: "Use bounded JSON" }, { status: 415 });
    let uncertain: string | null = null, localRequestId: string | null = null;
    try {
      const raw = await readBoundedStream(req.body, 2_900_000, 10_000), body: unknown = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(raw));
      if (!monthlyObject(body)) throw new Error("Invalid monthly operation");
      if (body.op === "inspect" && monthlyExact(body, ["op", "bytes", "format", "parseSettings"])) {
        if (typeof body.bytes !== "string" || originalBytes(body.bytes).length > 2_000_000 || !["csv", "xlsx"].includes(String(body.format))) throw new Error("Choose CSV/XLSX up to2MB");
        const info = fileInfo(body.bytes, body.format as "csv" | "xlsx"), parsed = body.parseSettings ? inspectSourceFile(body.bytes, body.parseSettings as ParseSettings, 1000) : null;
        return NextResponse.json({ ...info, ...(parsed ? { headers: parsed.headers, dataRows: parsed.rows.length, fileDigest: parsed.fileDigest } : {}) }, { headers: { "Cache-Control": "no-store" } });
      }
      if (body.op === "status" && monthlyExact(body, ["op", "requestId"]) && monthlyId(body.requestId)) {
        const result = await deps.call(client, "monthlyStatus", { requestId: body.requestId });
        if (result.status !== 200) throw new Error("Monthly status unavailable");
        const value = result.body;
        if (value.status === "committed") return NextResponse.json(confirmedMonthlyReceipt(value, client, body.requestId), { headers: { "Cache-Control": "no-store" } });
        if (!monthlyExact(value, ["v", "status", "requestId", "client"]) || value.v !== 1 || value.status !== "not-found" || value.requestId !== body.requestId || value.client !== client) throw new Error("Invalid monthly status");
        return NextResponse.json(value, { headers: { "Cache-Control": "no-store" } });
      }
      if (!((body.op === "preview" && monthlyExact(body, ["op", "file"])) || (body.op === "commit" && monthlyExact(body, ["op", "file", "approval"])))) throw new Error("Invalid monthly operation");
      if (monthlyObject(body.file) && monthlyId(body.file.requestId)) localRequestId = body.file.requestId;
      const file = parseMonthlyFile(body.file), identities = await deps.identities(client);
      if (!identities) throw new MonthlyFileError("Current exact client-ID crosswalk unavailable; nothing submitted.");
      const built = buildMonthlyRequest(client, file, identities);
      if (body.op === "commit") {
        if (!monthlyObject(body.approval) || !monthlyExact(body.approval, ["planHash", "expiresAt", "proof", "confirm"]) || !monthlyHex(body.approval.planHash) || !monthlyHex(body.approval.proof) || !Number.isSafeInteger(body.approval.expiresAt) || body.approval.confirm !== true) throw new Error("Explicit reviewed approval required");
        uncertain = file.requestId;
      }
      const result = await deps.call(client, body.op === "commit" ? "monthlyCommit" : "monthlyPreview", { request: built.request, ...(body.op === "commit" ? { approval: body.approval } : {}) });
      if (result.status !== 200) {
        const code = typeof result.body.code === "string" && /^[a-z-]{1,80}$/.test(result.body.code) ? result.body.code : "monthly-unavailable";
        if (uncertain) throw new Error(code);
        return NextResponse.json({ error: code, code }, { status: result.status >= 400 && result.status < 500 ? result.status : 503 });
      }
      if (body.op === "preview") {
        if (result.body.status === "committed") return NextResponse.json({ receipt: confirmedMonthlyReceipt(result.body, client, file.requestId, built.payloadHash, built.request.rows.length) }, { headers: { "Cache-Control": "no-store" } });
        const plan = confirmedMonthlyPlan(result.body, file.requestId, built.payloadHash, built.request.rows);
        return NextResponse.json({ plan, review: { fileDigest: built.request.fileDigest, source: file.source, sourceDate: file.sourceDate, period: file.period, parseSettings: file.parseSettings, dateSystem: file.dateSystem, mapping: file.mapping, unmapped: built.unmapped, campaignOnly: true, basis: "received-cash", currency: "USD" } }, { headers: { "Cache-Control": "no-store" } });
      }
      return NextResponse.json(confirmedMonthlyReceipt(result.body, client, file.requestId, built.payloadHash, built.request.rows.length), { headers: { "Cache-Control": "no-store" } });
    } catch (e) {
      if (uncertain) return NextResponse.json({ error: "UNCONFIRMED: keep the original request ID and check status. Do not resend.", code: "monthly-outcome-unconfirmed", requestId: uncertain, statusOp: "monthlyStatus", unconfirmed: true, retry: false }, { status: 503 });
      const unsent = localRequestId ? { requestId: localRequestId, unconfirmed: false, retry: false, stage: "website-before-submission" } : {};
      if (e instanceof MonthlyFileError) return NextResponse.json({ error: e.message, exceptions: e.exceptions, ...unsent }, { status: 422 });
      return NextResponse.json({ error: "Monthly file/context unavailable or invalid; no success asserted", code: "monthly-unavailable", ...unsent }, { status: 400 });
    }
  };
}
