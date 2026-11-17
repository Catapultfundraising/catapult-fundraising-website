import "server-only";
import { pvasCanonicalEnabled } from "./pvas-canonical";
import {pvasImportPlan,pvasImportReceipt,pvasImportApproval}from"./pvas-import-wire";
import type { PortalClient } from "./clients";
import { isJagDataAuthed } from "../jag-data-auth";
import { isCsnfDataAuthed } from "../csnf-data-auth";
import { isPvasDataAuthed } from "../pvas-data-auth";
import { isWcbhcDataAuthed } from "../wcbhc-data-auth";
import { isBaqDataAuthed } from "../baq-data-auth";
import { NextRequest, NextResponse } from "next/server";
import { buildProfile } from "./source-mapping-profile";
import { parseKeyOf } from "./source-keys";
import { fileInfo, inspectSourceFile, originalBytes, type ParseSettings } from "./source-file-preview";
import { exactOoxmlNumber } from "./source-ooxml-values";
import { strictTrackingFor } from "./direct-tracking-reader.server";
import { projectTrackingManual, type StrictTracking } from "./direct-tracking-state";
import { observeSolicitorInventory } from "./direct-solicitor-inventory.server";
import { directLaneEnabled } from "./direct-registration.server";
import { directSourceCall, readBoundedStream } from "./direct-source-transport.server";
import {
  DIRECT_FILE_MAX_BYTES, DIRECT_FILE_MAX_CELLS, DIRECT_MANUAL_TTL_SECONDS, DIRECT_MANUAL_MAX_BYTES,
  compileDirectSolicitors, normalizeDirectSolicitor, signDirectSolicitorContext, type DirectSolicitorInventory,
  directFileHash, signDirectManualContext, type DirectFileBatch, type DirectFileCapabilities,
  type DirectFileContext, type DirectManualObservation, type DirectManualPayload,
  type DirectResolveResult, type DirectFileApproval,
} from "./directFileProtocol";

export class GatewayError extends Error {
  constructor(public code: string, public status = 400, public exceptions: Exception[] = []) { super(code); }
}
type Exception = { ordinal: number; line: number; source: string; reason: string };
type FileInput = { requestId: string; template: string; fileName: string; bytes: string; sourceDate: string; actor: string;
  parseSettings: ParseSettings; mapping: Record<string, string>; verifyCptidColumn: string | null; noteResolutions: Record<string, "new-event"> };
export interface GatewayDeps {
  call(client: PortalClient, op: string, body?: Record<string, unknown>): Promise<{ status: number; body: Record<string, unknown> }>;
  tracking(client: PortalClient): Promise<StrictTracking>;
  secret(): string; now(): number;
  /** Complete server-observed website inventory; null is unavailable, never empty authority. */
  inventory(client: PortalClient): Promise<DirectSolicitorInventory | null>;
  enabled(client: PortalClient): boolean;
  verifyView?(client: PortalClient): Promise<Record<string, unknown>>;
}
const defaults: GatewayDeps = {
  call: directSourceCall, tracking: strictTrackingFor,
  secret: () => process.env.PORTAL_WRITE_SECRET ?? "", now: () => Math.floor(Date.now() / 1000),
  inventory: observeSolicitorInventory,
  enabled: directLaneEnabled,
};
const object = (x: unknown): x is Record<string, unknown> => !!x && typeof x === "object" && !Array.isArray(x);
const hex = (x: unknown) => typeof x === "string" && /^[a-f0-9]{64}$/.test(x);
const plain = (x: unknown, max: number) => typeof x === "string" && x.length <= max && !Array.from(x).some(c => c.charCodeAt(0) < 32 || (c.charCodeAt(0) >= 127 && c.charCodeAt(0) <= 159));
const validDate = (s: unknown): s is string => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && Number.isFinite(Date.parse(s)) && new Date(s).toISOString().slice(0, 10) === s;
const requestId = (s: unknown): s is string => typeof s === "string" && /^[a-f0-9]{32}$/.test(s);
function exact(o: Record<string, unknown>, keys: string[]) { return Object.keys(o).length === keys.length && keys.every(k => Object.prototype.hasOwnProperty.call(o, k)); }
async function boundedJson(req: NextRequest): Promise<unknown> {
  let bytes: Buffer;
  try {
    bytes = await readBoundedStream(req.body, 2_900_000, 10_000);
  } catch { throw new GatewayError("request-body-unavailable-or-too-large", 413); }
  return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
}
async function call(deps: GatewayDeps, client: PortalClient, op: string, body?: Record<string, unknown>) {
  let r; try { r = await deps.call(client, op, body); } catch { throw new GatewayError("source-unavailable", 503); }
  if (r.status < 200 || r.status >= 300) {
    const code = typeof r.body.code === "string" && /^[a-z0-9-]{1,100}$/.test(r.body.code) ? r.body.code : "source-unavailable";
    throw new GatewayError(code, r.status);
  }
  return r.body;
}
function solicitorContext(client: PortalClient, op: string, body: Record<string, unknown>, inventory: DirectSolicitorInventory | null, deps: GatewayDeps) {
  if (!inventory) return {};
  const secret = deps.secret();
  if (secret.length < 24) throw new GatewayError("manual-proof-unavailable", 503);
  const issuedAt = deps.now();
  return { solicitorContext: signDirectSolicitorContext({ v: 1, client, operationHash: directFileHash({ op, client, ...body }),
    revision: inventory.revision, names: inventory.names, issuedAt, expiresAt: issuedAt + DIRECT_MANUAL_TTL_SECONDS }, secret) };
}
function validAliases(raw: unknown, inventory: DirectSolicitorInventory | null) {
  return object(raw) && directFileHash(raw) === directFileHash(inventory ? compileDirectSolicitors(inventory.names) : { status: "unavailable", revision: null, entries: [] });
}
export async function gatewayCapabilities(client: PortalClient, deps = defaults, observedInventory?: DirectSolicitorInventory | null): Promise<DirectFileCapabilities> {
  const inventory = observedInventory === undefined ? await deps.inventory(client) : observedInventory;
  const c = await call(deps, client, "directFileCapabilities", solicitorContext(client, "directFileCapabilities", {}, inventory, deps));
  if (c.protocol !== "direct-file-v1" || c.client !== client || !["known", "unavailable"].includes(String(c.status)) || typeof c.applyEnabled !== "boolean" ||
      !validAliases(c.solicitorAliases, inventory) || !Array.isArray(c.templates) || c.templates.length > 100 || !c.templates.every(t => object(t) && plain(t.template, 100) && hex(t.revision) &&
        Array.isArray(t.fields) && t.fields.every(f => ["ask", "primarySolicitor", "secondarySolicitor", "note"].includes(String(f))) && object(t.cutovers)))
    throw new GatewayError("invalid-capabilities", 503);
  return { ...c, applyEnabled: c.applyEnabled && deps.enabled(client), ...(deps.enabled(client) ? {} : { reason: "website-integration-off" }) } as unknown as DirectFileCapabilities;
}
export function parseFileInput(value: unknown): FileInput {
  if (!object(value) || !exact(value, ["requestId", "template", "fileName", "bytes", "sourceDate", "actor", "parseSettings", "mapping", "verifyCptidColumn", "noteResolutions"]) ||
      !requestId(value.requestId) || !plain(value.template, 100) || !String(value.template).trim() ||
      !plain(value.fileName, 200) || !/\.(csv|xlsx)$/i.test(String(value.fileName)) ||
      !validDate(value.sourceDate) || !plain(value.actor, 100) || !String(value.actor).trim() || String(value.actor).trim() !== value.actor ||
      typeof value.bytes !== "string" || !object(value.parseSettings) || !object(value.mapping) ||
      !(value.verifyCptidColumn === null || plain(value.verifyCptidColumn, 200)) || !object(value.noteResolutions) ||
      Object.entries(value.noteResolutions).some(([k, v]) => !/^[1-9]\d{0,2}$/.test(k) || Number(k) > 500 || v !== "new-event"))
    throw new GatewayError("invalid-file-request");
  const raw = originalBytes(value.bytes);
  if (raw.length > DIRECT_FILE_MAX_BYTES) throw new GatewayError("whole-file-byte-limit", 413);
  const format = String(value.fileName).toLowerCase().endsWith(".xlsx") ? "xlsx" : "csv";
  if (value.parseSettings.format !== format) throw new GatewayError("file-format-mismatch");
  return value as unknown as FileInput;
}
export async function buildGatewayBatch(client: PortalClient, input: FileInput, deps: GatewayDeps = defaults) {
  // Always original bytes. Not a client-normalized CSV/digest, and not cached browser preview rows.
  const parsed = inspectSourceFile(input.bytes, input.parseSettings), solicitorInventory = await deps.inventory(client);
  const caps = await gatewayCapabilities(client, deps, solicitorInventory);
  if (parsed.headers.includes("@source-date")) throw new GatewayError("reserved-source-date-header");
  const virtualDate = Object.prototype.hasOwnProperty.call(input.mapping, "@source-date");
  if (virtualDate && input.mapping["@source-date"] !== "noteDate") throw new GatewayError("invalid-virtual-date-mapping");
  const template = caps.templates.find(t => t.template === input.template);
  if (caps.status !== "known" || !caps.applyEnabled || !template) throw new GatewayError("no-approved-template", 503);
  const targets = ["clientId", "ask", "primarySolicitor", "secondarySolicitor", "note", "noteDate", "eventId"] as const;
  const profile = buildProfile({ client, table: input.template, registryRev: template.revision, keyCol: "clientId", keyKind: "text",
    dests: targets.map(col => ({ col, ty: col === "ask" ? "decimal" : "nvarchar", st: "candidate", key: col === "clientId" ? col : "" })),
    preparedDigest: null, allocatorDigest: null, insertPolicyDigest: null }, [...parsed.headers, ...(virtualDate ? ["@source-date"] : [])], input.mapping);
  const mapping = profile.mapping.map(([source, target]) => ({ source, target: target as DirectFileBatch["mapping"][number]["target"] }));
  const writes = mapping.filter(m => ["ask", "primarySolicitor", "secondarySolicitor", "note"].includes(m.target));
  if (!writes.length || writes.some(m => !template.fields.includes(m.target as "ask"))) throw new GatewayError("field-not-approved");
  const reviewCells = parsed.rows.length * writes.length;
  if (reviewCells > DIRECT_FILE_MAX_CELLS) throw new GatewayError("whole-file-cell-limit", 413);
  const column = (target: string) => mapping.find(m => m.target === target)?.source;
  const index = (target: string) => parsed.headers.indexOf(column(target) ?? "");
  if (input.verifyCptidColumn !== null && (!parsed.headers.includes(input.verifyCptidColumn) || mapping.some(m => m.source === input.verifyCptidColumn)))
    throw new GatewayError("invalid-verification-column");
  if (parsed.headers.includes("CPTID") && input.verifyCptidColumn !== "CPTID") throw new GatewayError("template-cptid-verification-required");
  if (writes.some(m => m.target === "note") && (!column("noteDate") || /historical\s*notes/i.test(column("note") ?? ""))) throw new GatewayError("note-date-or-new-notes-mapping-required");
  const errors: Exception[] = [];
  const invalid = (r: number, source: string, reason: string) => { errors.push({ ordinal: r + 1, line: parsed.lines[r], source, reason }); };
  const textValue = (r: number, c: number, purpose: string) => {
    const slot = `${r}|${c}`;
    if (parsed.formulaSlots.has(slot)) { invalid(r, parsed.headers[c], `formula-${purpose}`); return ""; }
    if (parsed.otherSlots.has(slot)) { invalid(r, parsed.headers[c], `unsupported-${purpose}`); return ""; }
    return parsed.rows[r][c] ?? "";
  };
  const identities = parsed.rows.map((_, r) => {
    const c = index("clientId"), slot = `${r}|${c}`;
    let clientId = textValue(r, c, "identity");
    if (parsed.numericSlots.has(slot)) {
      if (input.parseSettings.format !== "xlsx" || input.parseSettings.clientIdFormat !== "integer") invalid(r, parsed.headers[c], "numeric-client-id-requires-declared-integer-crosswalk");
      else { const n = exactOoxmlNumber(parsed.numericLexemes.get(slot) ?? "", "clientId-integer"); if (n.ok) clientId = n.value; else invalid(r, parsed.headers[c], n.reason); }
    }
    if (typeof parseKeyOf("text", clientId) !== "string" || clientId.length > 100) invalid(r, parsed.headers[c], "invalid-exact-client-id");
    let verifyCptid: number | null = null;
    if (input.verifyCptidColumn !== null) {
      const v = parsed.headers.indexOf(input.verifyCptidColumn), value = textValue(r, v, "verification");
      if (value) { const n = exactOoxmlNumber(parsed.numericLexemes.get(`${r}|${v}`) ?? value, "cptid"); if (n.ok) verifyCptid = Number(n.value); else invalid(r, parsed.headers[v], n.reason); }
    }
    return { clientId, verifyCptid };
  });
  const unique = [...new Map(identities.map(x => [JSON.stringify(x), x])).values()];
  let resolved: DirectResolveResult | null = null;
  if (!errors.length) {
    const base = { template: input.template, sourceDate: input.sourceDate, ids: unique };
    const result = await call(deps, client, "directFileResolve", { ...base, ...solicitorContext(client, "directFileResolve", base, solicitorInventory, deps) });
    if (result.protocol !== "direct-file-v1" || result.status !== "known" || result.client !== client || result.template !== input.template ||
        result.registrationRevision !== template.revision || !validAliases(result.solicitorAliases, solicitorInventory) || !Array.isArray(result.matches) || result.matches.length !== unique.length)
      throw new GatewayError("invalid-identity-response", 503);
    resolved = result as unknown as DirectResolveResult;
  }
  const cells: DirectFileBatch["cells"] = [];
  for (let r = 0; r < parsed.rows.length; r++) {
    const identity = identities[r], matches = resolved?.matches.filter(m => m.clientId === identity.clientId && m.verifyCptid === identity.verifyCptid) ?? [];
    const match = matches.length === 1 ? matches[0] : null;
    if (resolved && (!match || match.reason !== null || !Number.isInteger(match.cptid) || Number(match.cptid) <= 0 || Number(match.cptid) > 2147483647 || (identity.verifyCptid !== null && identity.verifyCptid !== match.cptid)))
      invalid(r, column("clientId")!, match?.reason ?? "identity-response-mismatch");
    for (const m of writes) {
      const c = parsed.headers.indexOf(m.source), slot = `${r}|${c}`;
      let value = textValue(r, c, m.target);
      const numeric = parsed.numericSlots.has(slot);
      if (m.target === "ask" && value) {
        const n = exactOoxmlNumber(parsed.numericLexemes.get(slot) ?? value, "askAmount");
        if (n.ok) value = n.value; else invalid(r, m.source, n.reason);
      } else if (numeric) invalid(r, m.source, `numeric-${m.target}-unsupported`);
      if (m.target === "note" ? value.length > 4000 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/.test(value) : !plain(value, 300) || (!["primarySolicitor", "secondarySolicitor"].includes(m.target) && value !== value.trim())) invalid(r, m.source, "invalid-field-text");
      let noteDate: string | null = null, eventId: string | null = null, noteResolution: "new-event" | "hold" | null = null;
      if (m.target === "note") {
        const d = index("noteDate"), e = index("eventId");
        noteDate = virtualDate ? input.sourceDate : textValue(r, d, "note-date");
        if ((!virtualDate && parsed.numericSlots.has(`${r}|${d}`)) || !validDate(noteDate)) invalid(r, virtualDate ? "@source-date" : parsed.headers[d], "exact-iso-note-date-required");
        if (e >= 0) { eventId = textValue(r, e, "event-id") || null; if (parsed.numericSlots.has(`${r}|${e}`) || (eventId !== null && (!plain(eventId, 200) || eventId.trim() !== eventId))) invalid(r, parsed.headers[e], "exact-text-event-id-required"); }
        noteResolution = input.noteResolutions[String(r + 1)] ?? "hold";
      }
      if (match?.cptid) cells.push({ ordinal: r + 1, clientId: identity.clientId, cptid: match.cptid, field: m.target as "ask" | "primarySolicitor" | "secondarySolicitor" | "note", value, eventId, noteDate, noteResolution });
    }
  }
  const scalarKeys = new Set<string>(), eventKeys = new Set<string>();
  for (const cell of cells) {
    const key = cell.field === "note" ? cell.eventId : `${cell.cptid}:${cell.field}`;
    const keys = cell.field === "note" ? eventKeys : scalarKeys;
    if (key !== null && keys.has(key)) invalid(cell.ordinal - 1, column(cell.field) ?? cell.field, cell.field === "note" ? "duplicate-note-event-id" : "duplicate-scalar-cell");
    if (key !== null) keys.add(key);
  }
  if (errors.length) throw new GatewayError("whole-file-held", 422, errors);
  const parse = { format: input.parseSettings.format, sheet: input.parseSettings.format === "xlsx" ? input.parseSettings.sheet : null,
    headerRow: input.parseSettings.format === "xlsx" ? input.parseSettings.headerRow : 1, delimiter: input.parseSettings.format === "csv" ? "," as const : null };
  const fileContext: DirectFileContext = { v: 1, ...parse, clientIdFormat: input.parseSettings.format === "xlsx" && input.parseSettings.clientIdFormat === "integer" ? "declared-integer" : "text",
    verifyCptidColumn: input.verifyCptidColumn, fileBytes: parsed.byteLength, dataRows: parsed.rows.length, reviewCells };
  const batch: DirectFileBatch = { requestId: input.requestId, client, template: input.template, fileDigest: parsed.fileDigest, mappingDigest: directFileHash({ parse, mapping }),
    fileName: input.fileName, sourceDate: input.sourceDate, actor: input.actor, cells, parse, mapping, fileContextHash: directFileHash(fileContext) };
  if (Buffer.byteLength(JSON.stringify(batch), "utf8") > DIRECT_FILE_MAX_BYTES) throw new GatewayError("whole-file-batch-byte-limit", 413);
  return { batch, fileContext, registrationRevision: template.revision, solicitorInventory };
}
async function manualContext(client: PortalClient, phase: "preview" | "commit", built: Awaited<ReturnType<typeof buildGatewayBatch>>, deps: GatewayDeps) {
  const ids = [...new Set(built.batch.cells.map(c => c.cptid))].sort((a, b) => a - b), tracking = await deps.tracking(client);
  const manual = projectTrackingManual(tracking, ids);
  if (!manual) throw new GatewayError("manual-state-unavailable", 503);
  const observations: DirectManualObservation[] = ids.map(cptid => {
    const m = manual[cptid];
    return { cptid, revision: m.revision, historicalRevision: null,
      fields: { ask: { present: m.fields.ask.present }, primarySolicitor: { present: m.fields.primarySolicitor.present }, secondarySolicitor: { present: m.fields.secondarySolicitor.present } },
      notesCoverage: "tracking-only", notes: m.notes.map(n => ({ date: n.date, body: n.body })) };
  });
  const issuedAt = deps.now();
  const payload: DirectManualPayload = { v: 1, phase, requestId: built.batch.requestId, client, template: built.batch.template, registrationRevision: built.registrationRevision,
    batchHash: directFileHash(built.batch), fileContextHash: built.batch.fileContextHash, issuedAt, expiresAt: issuedAt + DIRECT_MANUAL_TTL_SECONDS, observations,
    ...(built.solicitorInventory ? { solicitorAliases: built.solicitorInventory } : {}) };
  const context = signDirectManualContext(payload, deps.secret());
  if (Buffer.byteLength(JSON.stringify(context), "utf8") > DIRECT_MANUAL_MAX_BYTES) throw new GatewayError("manual-context-byte-limit", 413);
  return context;
}
function publicReceipt(raw: Record<string, unknown>, client: PortalClient, original: string, expected?: { payloadHash: string; previewHash: string; cells: number }) {
  const required = ["protocol", "requestId", "client", "status", "saved", "held", "unchanged", "payloadHash", "previewHash", "effect", "effectiveChanges", "publication"];
  if (raw.replay !== undefined) required.push("replay");
  if (!exact(raw, required) || raw.protocol !== "direct-file-v1" || raw.status !== "committed" || raw.client !== client || raw.requestId !== original ||
      raw.effect !== "source-state-only" || raw.effectiveChanges !== "not-asserted" || raw.publication !== "not-requested" ||
      !hex(raw.payloadHash) || !hex(raw.previewHash) || !["saved", "held", "unchanged"].every(k => Number.isSafeInteger(raw[k]) && Number(raw[k]) >= 0 && Number(raw[k]) <= DIRECT_FILE_MAX_CELLS) ||
      Number(raw.saved) + Number(raw.held) + Number(raw.unchanged) < 1 || Number(raw.saved) + Number(raw.held) + Number(raw.unchanged) > DIRECT_FILE_MAX_CELLS ||
      (raw.replay !== undefined && typeof raw.replay !== "boolean") ||
      (expected && (raw.payloadHash !== expected.payloadHash || raw.previewHash !== expected.previewHash || Number(raw.saved) + Number(raw.held) + Number(raw.unchanged) !== expected.cells)))
    throw new GatewayError("invalid-source-receipt", 503);
  return raw;
}
/** Same fixed-client authorization owner as established dashboard/manual-write APIs.
 * Existing research and automation access stays valid; another dashboard cookie never grants this client. */
const DASHBOARD_AUTH: Record<PortalClient, (req: NextRequest) => Promise<boolean>> = {
  jag: isJagDataAuthed, csnf: isCsnfDataAuthed, pvas: isPvasDataAuthed, wcbhc: isWcbhcDataAuthed, baq: isBaqDataAuthed,
};
export const dashboardDataAuthed = (client: PortalClient, req: NextRequest) => DASHBOARD_AUTH[client](req);
export function directFileGateway(client: PortalClient, deps: GatewayDeps = defaults) {
  return async (req: NextRequest) => {
    if (!(await dashboardDataAuthed(client, req))) return NextResponse.json({ error: "Dashboard sign-in required", dashboardLogin: `/${client}/data-dashboard/login`, code: "dashboard-auth-required" }, { status: 401 });
    if (req.headers.get("origin") !== req.nextUrl.origin || req.headers.get("sec-fetch-site") === "cross-site") return NextResponse.json({ code: "same-origin-required" }, { status: 403 });
    if (!req.headers.get("content-type")?.startsWith("application/json") || Number(req.headers.get("content-length") ?? 0) > 2_900_000) return NextResponse.json({ code: "invalid-request-envelope" }, { status: 413 });
    let commitAttempt: string | null = null;
    try {
      const body = await boundedJson(req);
      if (!object(body) || typeof body.op !== "string") throw new GatewayError("invalid-operation");
      let result: unknown;
      if (body.op === "capabilities" && exact(body, ["op"])) result = await gatewayCapabilities(client, deps);
      else if ((body.op === "status" || body.op === "verifyView") && exact(body, ["op", "requestId"]) && requestId(body.requestId)) {
        const stored = await call(deps, client, "directFileStatus", { requestId: body.requestId });
        if(pvasCanonicalEnabled(client)){
          if(body.op==="verifyView")throw new GatewayError("refresh-canonical-dashboard-separately",503);
          if(stored.v!==1||stored.requestId!==body.requestId||!["committed","pending","legacy","not-found"].includes(String(stored.status)))throw new GatewayError("invalid-canonical-status",503);
          return NextResponse.json(stored,{headers:{"Cache-Control":"no-store"}});
        }
        if (stored.status === "committed") result = publicReceipt(stored, client, body.requestId);
        else if (stored.protocol === "direct-file-v1" && stored.status === "not-found" && stored.client === client && stored.requestId === body.requestId && typeof stored.note === "string")
          result = { protocol: stored.protocol, status: stored.status, client, requestId: body.requestId, note: stored.note };
        else throw new GatewayError("invalid-source-status", 503);
        if (body.op === "verifyView") {
          if (stored.status !== "committed") throw new GatewayError("source-commit-not-reconciled", 409);
          result = await (deps.verifyView ?? (async c => (await import("./direct-view-verification.server")).verifyCurrentDirectView(c)))(client);
        }
      }
      else if (body.op === "inspect" && exact(body, ["op", "bytes", "format", "parseSettings"])) {
        if (typeof body.bytes !== "string" || !["csv", "xlsx"].includes(String(body.format)) || originalBytes(body.bytes).length > DIRECT_FILE_MAX_BYTES) throw new GatewayError("whole-file-byte-limit", 413);
        const info = fileInfo(body.bytes, body.format as "csv" | "xlsx");
        const parsed = body.parseSettings ? inspectSourceFile(body.bytes, body.parseSettings as ParseSettings) : null;
        result = { ...info, ...(parsed ? { headers: parsed.headers, dataRows: parsed.rows.length, fileDigest: parsed.fileDigest } : {}) };
      } else if ((body.op === "preview" && exact(body, ["op", "file"])) || (body.op === "commit" && exact(body, ["op", "file", "approval"]))) {
        const input = parseFileInput(body.file), built = await buildGatewayBatch(client, input, deps);
        const manual = await manualContext(client, body.op, built, deps);
        // Do not change DirectFileBatch/file-context hash domains. Canonical
        // source-import independently binds these original bytes to its plan.
        const transport = { batch: built.batch, fileContext: built.fileContext, manualContext: manual,
          ...(body.op === "commit" ? { approval: body.approval } : {}),
          ...(pvasCanonicalEnabled(client) ? { originalBytesBase64: input.bytes } : {}) };
        if (pvasCanonicalEnabled(client) && Buffer.byteLength(JSON.stringify({ op: body.op === "commit" ? "directFileCommit" : "directFilePreview", ...transport }), "utf8") > 2_000_000)
          throw new GatewayError("original-bytes-and-batch-too-large", 413);
        if (body.op === "commit") {
          if(pvasCanonicalEnabled(client)){
            if(!pvasImportApproval(body.approval))throw new GatewayError("invalid-canonical-approval");
          }else if (!object(body.approval) || !exact(body.approval, ["previewHash", "expiresAt", "proof"]) || !hex(body.approval.previewHash) || !hex(body.approval.proof) || !Number.isSafeInteger(body.approval.expiresAt)) throw new GatewayError("invalid-approval");
          commitAttempt = input.requestId;
          result = await call(deps, client, "directFileCommit", transport);
          if(pvasCanonicalEnabled(client))return NextResponse.json(pvasImportReceipt(result,{requestId:input.requestId,payloadHash:String((body.approval as Record<string,unknown>).payloadHash),operation:"import-direct"}),{headers:{"Cache-Control":"no-store"}});
          result = publicReceipt(result as Record<string, unknown>, client, input.requestId, { payloadHash: directFileHash(built.batch), previewHash: String((body.approval as Record<string,unknown>).previewHash), cells: built.batch.cells.length });
        } else {
          const preview = await call(deps, client, "directFilePreview", transport);
          if(pvasCanonicalEnabled(client))return NextResponse.json(pvasImportPlan(preview,input.requestId),{headers:{"Cache-Control":"no-store"}});
          const p = preview.plan;
          if (!exact(preview, ["protocol", "status", "plan"]) || preview.protocol !== "direct-file-v1" || preview.status !== "previewed" || !object(p) ||
              !exact(p, ["payloadHash", "previewHash", "decisions", "expiresAt", "proof"]) || p.payloadHash !== directFileHash(built.batch) ||
              !hex(p.previewHash) || !hex(p.proof) || !Number.isSafeInteger(p.expiresAt) || !Array.isArray(p.decisions) || p.decisions.length !== built.batch.cells.length ||
              !p.decisions.every((d, i) => object(d) && exact(d, ["ordinal", "cptid", "field", "before", "after", "action", "reason", "eventKey"]) &&
                d.ordinal === built.batch.cells[i].ordinal && d.cptid === built.batch.cells[i].cptid && d.field === built.batch.cells[i].field &&
                (d.after === built.batch.cells[i].value || (d.action !== "held" &&
                  ["primarySolicitor", "secondarySolicitor"].includes(built.batch.cells[i].field) && typeof d.after === "string" &&
                  plain(d.after, 300) && d.after === d.after.trim().replace(/\s+/g, " ") &&
                  normalizeDirectSolicitor(d.after) === normalizeDirectSolicitor(built.batch.cells[i].value))) && (d.before === null || typeof d.before === "string") &&
                ["set", "advance", "append", "unchanged", "held"].includes(String(d.action)) && (d.reason === null || typeof d.reason === "string") && (d.eventKey === null || hex(d.eventKey))))
            throw new GatewayError("invalid-source-preview", 503);
          result = preview;
        }
      } else throw new GatewayError("invalid-operation");
      return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
    } catch (e) {
      if (commitAttempt) return NextResponse.json({ error: "UNCONFIRMED: check the original request status; do not resend", code: "unconfirmed", requestId: commitAttempt, statusOp: "directFileStatus" }, { status: 503, headers: { "Cache-Control": "no-store" } });
      if (e instanceof GatewayError) return NextResponse.json({ error: e.code === "private-receipt-too-large" ? "Complete audit exceeds storage limit; nothing saved." : e.code, code: e.code, exceptions: e.exceptions }, { status: e.status, headers: { "Cache-Control": "no-store" } });
      return NextResponse.json({ error: "File/context unavailable or invalid; no success asserted", code: "invalid-or-unavailable" }, { status: 400, headers: { "Cache-Control": "no-store" } });
    }
  };
}
