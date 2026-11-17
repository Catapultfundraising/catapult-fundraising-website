/** OFFLINE ONLY. Consumes frozen byte files and reviewed mapping/crosswalk
 * decisions. No SQL, HTTP, Blob, environment gate changes, or writes.
 * Output uses migration/MANIFEST-CONTRACT.md v1, not a parallel schema. */
import "server-only";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import { composeDirectData, validateDirectState, directClientView } from "./direct-source-state.server.precutover";
import { currentRecordProjection } from "./records-route.precutover";
import { currentDashboardSnapshot } from "./current-dashboard-snapshot.precutover";
import { readStrictTracking } from "./direct-tracking-state";
import { buildOverlay, type UpdateRow } from "./record-overlay";
import { OUTCOME_FIELD, validateOutcome } from "./outcome";
import type { PortalState } from "./clients";
import type { PvasSnapshot, PvasRecords } from "../pvas-data-store";
import type { PvasTracking as Tracking } from "../pvas-tracking-types";

export const PRE_CUTOVER_COMMIT = "452a90b47ed74be1dc3b982943bf3d3e9bb8e895";
export const EXTRACTOR_VERSION = "pvas-frozen-effective-v1";
const HASHES: Record<string, string> = {
  "lib/portal-v2/current-dashboard-snapshot.precutover.ts": "21343ef575e0a7ad0865ef7853e0f1d94bc6a899ce565519a8f0cb95e7f2f4a0",
  "lib/portal-v2/direct-source-state.server.precutover.ts": "c4b04940b12cee5231c4cf70e59fdb6a261d9c17eb7ce0a27b5f9160fdd332a2",
  "lib/portal-v2/records-route.precutover.ts": "7f363458c9844a34314a543472ee11f5be0338f66a6061bb15341453d6ce863a",
  "lib/portal-v2/direct-snapshot.ts": "99ecc91eb0d462dfa82ea44a5b12c06570e6932a541cf07102e1e230f1dd6aaf",
  "lib/portal-v2/effective-ask.ts": "fd5da88ab6eb5eb1546dd3a260416fcbadd42c77f27fe873709ae111acf9e8c5",
  "lib/portal-v2/effective-assignment.ts": "1a7c10e6e9d4008b4bc9d280f8a8ce0d8b61d941a62b589ae61890a430d0da14",
  "lib/portal-v2/record-overlay.ts": "9a262b0a5bcf5c8f7c4c145e1ace317a9f3395ee90865d08582ff17611fc63f3",
  "lib/portal-v2/campaign-records.ts": "a325c4876eaacfd357194076c46485d3c780f61783fd0015496555dc7505222c",
  "lib/portal-v2/direct-effective-state.ts": "130a9690655ed43ebae2a97e131d9677ac9a7cba89c5e5f6aee8326b21aae49e",
  "lib/portal-v2/direct-tracking-state.ts": "752285bf6a9dd4868566df6ebd272318844780f16917a8e36e60e235148e2f19",
  "lib/portal-v2/directFileProtocol.ts": "befecc51c3fb72d2f8f243795619255d295176430bf01122929893b7332e0fe4",
  "lib/portal-v2/direct-wire.ts": "c3337d2f341ac582bb3d185c32860da6300f0c9f3de0f992bc2337b6c5543b7a",
};
const FIELDS = "fullName firstName middleName lastName street street2 city state zip phone phone2 email email2 spouseFirstName spouseMiddleName spouseLastName ask primarySolicitor secondarySolicitor phone3 phone4 dsRating wealthCapacity majorGiftScore realEstate stock status outcome".split(" ");
const ROOTS = "version client target freeze capture sources tracking contacts effective notes noteAliases gifts coverage".split(" ");
type Obj = Record<string, any>;
const object = (x: unknown): x is Obj => !!x && typeof x === "object" && !Array.isArray(x);
const need = (ok: unknown, code: string): void => { if (!ok) throw new Error(`PVAS capture HOLD: ${code}`); };
const sha = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
const json = (bytes: Uint8Array) => JSON.parse(new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes));
const exactKeys = (x: Obj, keys: string[]) => isDeepStrictEqual(Object.keys(x).sort(), [...keys].sort());
export type FrozenCaptureInput = {
  /** Migration compiler's draft manifest, including approved exact field/note/
   * gift plans. This function NEVER guesses a missing identity or crosswalk. */
  manifest: unknown;
  parts: { snapshot: Uint8Array; records: Uint8Array; tracking: Uint8Array; pirs: Uint8Array; ids: Uint8Array; portalState: Uint8Array; directState: Uint8Array };
};

export async function assertPrecutoverCode(root: string): Promise<void> {
  // HASHES remains the ORIGINAL source-owner identity, including original7f36.
  // The separately pinned frozen copy adds an inert record-only scope; default
  // output/proof is unchanged. Never pass off its modified bytes as original.
  const frozen = { ...HASHES, "lib/portal-v2/records-route.precutover.ts": OWN_SOURCE_RECORD_SHA256 };
  for (const [file, expected] of Object.entries(frozen)) need(sha(await readFile(path.join(root, file))) === expected, "precedence-code-drift");
}

const OWN_SOURCE_RECORD_SHA256 = "3da1b08dc65db164859c1254dbd6443474aef8c3b23e7e0013b0b40d85ffd8aa";
export type OwnSourceOptions = { includeOwnMergedSources?: false } | {
  includeOwnMergedSources: true;
  /** Exact byte bindings only, NOT a claim that SQL/source correspondence or
   * complete schema visibility has been verified. Upstream receipts still gate. */
  ownSourceEvidence: { sources: Uint8Array; schema: Uint8Array };
};

export type FrozenCaptureParts = FrozenCaptureInput["parts"];

/** One pinned old-precedence path shared by projection and final validation.
 * Pure/offline: callers provide every original byte part, never live readers. */
async function composeFrozenParts(parts: FrozenCaptureParts) {
  const strict = await readStrictTracking("pvas", async () => ({ kind: "bytes", bytes: parts.tracking }));
  need(strict.kind === "present", "original-tracking-invalid");
  if (strict.kind !== "present") throw new Error("PVAS capture HOLD");
  const tracking = { ...strict.document, pirs: json(parts.pirs) } as unknown as Tracking;
  const data = json(parts.records) as PvasRecords, snapshot = json(parts.snapshot) as PvasSnapshot, state = json(parts.portalState) as PortalState;
  need(object(data.records) && Array.isArray(data.index) && Array.isArray(state.prospects) && Array.isArray(state.gifts) && Array.isArray(state.updates) && Array.isArray(state.batches) && Array.isArray(json(parts.ids)), "complete-legacy-reads");
  const source = validateDirectState(json(parts.directState), "pvas");
  need(!state.prospects.some(p => [...source.values, ...source.notes].some(s => s.cptid === p.cptid)), "ambiguous-direct-prospect-identity");
  const observed = { state: source, tracking: strict, sql: { updates: state.updates as unknown as Obj[], prospects: state.prospects as unknown as Obj[] } };
  const effectiveData = composeDirectData(data, "records", observed);
  const effectiveTracking = { ...tracking, directAssignments: directClientView(observed), directSourceNotes: source.notes };
  const projection = currentRecordProjection("pvas", effectiveData as never, state, effectiveTracking);
  const visibleSnapshot = currentDashboardSnapshot("pvas", composeDirectData(snapshot, "snapshot", observed), projection.index, effectiveTracking, state.updates);
  return { data, state, source, tracking, effectiveData, effectiveTracking, projection, visibleSnapshot };
}

/** Offline manifest-assembly input, NOT an accepted capture. In particular no
 * identity/note/gift/source-universe/coverage claims are inferred here.
 * All values are JSON-safe; original bytes are bound by proof.partDigests.
 * The assembler must preserve those bytes and still call captureFrozenPvas
 * with its complete reviewed manifest before treating the capture as sealed. */
export async function projectFrozenPvas(root: string, parts: FrozenCaptureParts, options?: OwnSourceOptions) {
  await assertPrecutoverCode(root);
  const composed = await composeFrozenParts(parts);
  const { state, effectiveData, effectiveTracking, projection, visibleSnapshot } = composed;
  const overlay = buildOverlay(state.updates as unknown as UpdateRow[]);
  const sidecar = options?.includeOwnMergedSources === true ?
    { ownSourceView: await ownMergedSourceView(root, parts, composed, options.ownSourceEvidence) } : {};
  return {
    held: true as const,
    effectiveView: { records: projection.index.map(r => projection.record(r.cptid)),
      index: projection.index, snapshot: visibleSnapshot, tracking: effectiveTracking },
    effectiveData,
    // Complete relative to the supplied original portalState.updates bytes.
    // External inventory completeness remains a separate manifest gate.
    identityState: { complete: true as const, source: "portalState.updates" as const,
      sourceSha256: sha(parts.portalState),
      mergedInto: [...overlay.mergedInto.entries()].sort(([a], [b]) => a - b),
      deleted: [...overlay.deleted.entries()].sort(([a], [b]) => a - b) },
    proof: { sourceCommit: PRE_CUTOVER_COMMIT, extractorVersion: EXTRACTOR_VERSION,
      sourceHashes: { ...HASHES },
      partDigests: Object.fromEntries(Object.entries(parts).map(([name, bytes]) => [name, sha(bytes)])) },
    ...sidecar,
  };
}

/** Derived closure, not a second winner parser. All donor-local rows are
 * exported in the SAME stable order consumed by the original folds; complete
 * supplied parts remain byte-bound. No single-event authority is invented. */
async function ownMergedSourceView(root: string, parts: FrozenCaptureParts,
  composed: Awaited<ReturnType<typeof composeFrozenParts>>, evidence: {sources:Uint8Array;schema:Uint8Array}) {
  need(object(evidence) && evidence.sources instanceof Uint8Array && evidence.schema instanceof Uint8Array &&
    evidence.sources.byteLength > 0 && evidence.schema.byteLength > 0, "own-source-evidence-bytes");
  const { data, state, source, tracking, effectiveData, effectiveTracking } = composed;
  const updates = state.updates as unknown as Obj[];
  const id = (v: unknown) => Number.isInteger(v) && Number(v) > 0 && Number(v) <= 2147483647;
  need(updates.every(u => object(u) && Number.isSafeInteger(u.id) && u.id > 0 && id(u.cptid) &&
    typeof u.field === "string" && (u.new_value === null || typeof u.new_value === "string")) &&
    new Set(updates.map(u=>u.id)).size === updates.length, "own-source-update-order-identity");
  const overlay = buildOverlay(updates as UpdateRow[]);
  need([...overlay.mergedInto].every(([from,to])=>id(from)&&id(to)), "own-source-merge-identity");
  const donorIds: number[] = [], excludedMergedIds: number[] = [];
  const originalEntries = Object.entries(data.records) as [string,Obj][];
  for (const c of [...overlay.mergedInto.keys()].sort((a,b)=>a-b)) {
    need(id(c), "own-source-merge-identity");
    const records = originalEntries.filter(([key,r]) => key === String(c) || r?.cptid === c);
    const index = data.index.map((r,i)=>({ordinal:i,row:r})).filter(r=>r.row.cptid===c);
    if (!records.length && !index.length) { excludedMergedIds.push(c); continue; }
    need(records.length === 1 && records[0][0] === String(c) && object(records[0][1]) &&
      records[0][1].cptid === c && index.length === 1, "own-source-original-identity");
    donorIds.push(c);
  }
  const own = currentRecordProjection("pvas", effectiveData as never, state, effectiveTracking, {recordScope:"own-source"});
  const records: Obj[] = [], fieldStates: Obj[] = [], donors: Obj[] = [];
  const property = (base: unknown, keys: string[]) => {
    let value = base;
    for (const key of keys) {
      if (!object(value) || !Object.hasOwn(value,key)) return {path:keys,present:false,state:"absent"};
      value = value[key];
    }
    return {path:keys,present:true,state:value===undefined?"undefined":value===null?"null":"value",
      ...(value===undefined?{}:{value})};
  };
  const ordered = updates.map((row,ordinal)=>({key:String(row.id),ordinal,row})).sort((a,b)=>a.row.id-b.row.id);
  for (const c of donorIds) {
    const key = String(c), record = own.record(c) as Obj;
    need(record && record.cptid===c, "own-source-record");
    records.push(record);
    const paths: Record<string,string[]> = {fullName:["name"],ask:["campaignAsk","ask"],
      primarySolicitor:["assignment","solicitor"],secondarySolicitor:["assignment","solicitor2"],outcome:["outcome","value"]};
    for (const name of ["street","city","state","zip","phone","phone2","phone3","email","email2"]) paths[name]=["contact",name];
    const fields = Object.fromEntries(Object.entries(paths).map(([name,p])=>[name,property(record,p)]));
    fields.status = property(tracking as unknown,["prospects",key,"status"]);
    fieldStates.push({cptid:c,fields});
    const local = ordered.filter(u=>u.row.cptid===c);
    // Reuse the ORIGINAL outcome validator for EACH event, without selecting
    // another winner or inferring a clear from its rendered blank/default.
    const outcomeEvents = local.filter(u=>u.row.field===OUTCOME_FIELD).map(u=>{
      try {
        const raw = JSON.parse(u.row.new_value ?? "null");
        return {key:u.key,valid:true,validated:validateOutcome(raw?.value,raw?.note)};
      } catch { return {key:u.key,valid:false}; }
    });
    const semanticStates = Object.fromEntries(["campaignAsk","outcome","assignment","wealth"].map(name=>[name,
      Object.fromEntries(Object.keys(record[name]??{}).map(k=>[k,property(record,[name,k])]))]));
    donors.push({cptid:c,originalRecordKey:key,semanticStates,
      originalRecord:data.records[key],effectiveBase:effectiveData.records[key],
      originalIndexEntries:data.index.map((row,ordinal)=>({ordinal,row})).filter(x=>x.row.cptid===c),
      prospects:state.prospects.map((row,ordinal)=>({ordinal,row})).filter(x=>x.row.cptid===c),
      tracking:{prospect:property(tracking as unknown,["prospects",key]),
        activity:tracking.activity.map((row,ordinal)=>({ordinal,row})).filter(x=>x.row.cptid===c),
        removed:(tracking.removed??[]).map((row,ordinal)=>({ordinal,row})).filter(x=>x.row.cptid===c)},
      updates:local,outcomeEvents,
      directValues:source.values.map((row,ordinal)=>({key:`${row.cptid}:${row.field}`,ordinal,row})).filter(x=>x.row.cptid===c),
      directNotes:source.notes.map((row,ordinal)=>({key:row.event_key,ordinal,row})).filter(x=>x.row.cptid===c)});
  }
  const moduleSha256: Record<string,string> = {};
  for (const file of [...Object.keys(HASHES),"lib/portal-v2/outcome.ts","lib/portal-v2/pvas-precutover-capture.server.ts"])
    moduleSha256[file] = sha(await readFile(path.join(root,file)));
  need(moduleSha256["lib/portal-v2/outcome.ts"] === "594dce417037d9e0ab34adc97d2cffbbe32026deb22dfa472f6afdc9c83e5a83", "own-source-outcome-code-drift");
  return {version:"old-own-source-projection-v1",scope:"donor-local-pre-merge",
    semantics:"preservation candidate; NOT historical visible HTTP response",
    held:true,accepted:false,frozen:false,approved:false,activated:false,
    donorIds,donorIdsSha256:sha(Buffer.from(JSON.stringify(donorIds),"utf8")),records,fieldStates,
    foldEvidence:{kind:"complete-donor-local-derived-closure-v1",extractorVersion:EXTRACTOR_VERSION,
      originalSourceCommit:PRE_CUTOVER_COMMIT,originalSourceHashes:{...HASHES},moduleSha256,
      partDigests:Object.fromEntries(Object.entries(parts).map(([name,bytes])=>[name,sha(bytes)])),
      byteBindings:{sources:{sha256:sha(evidence.sources),bytes:evidence.sources.byteLength},
        schema:{sha256:sha(evidence.schema),bytes:evidence.schema.byteLength}},
      sourceSchemaCorrespondence:"NOT verified here; upstream source/part/state receipts required",
      cohort:"original records AND unique original index identities intersect actual mergedInto keys",
      excludedMergedIds,donors}};
}

/** Returns exact manifest bytes and companion original-byte attachments.
 * Caller persists locally only after success; caller must never log donor data. */
export async function captureFrozenPvas(root: string, input: FrozenCaptureInput) {
  await assertPrecutoverCode(root);
  const m = structuredClone(input.manifest) as Obj;
  need(object(m) && exactKeys(m, ROOTS) && m.version === 1 && m.client === "pvas", "manifest-envelope");
  need(isDeepStrictEqual(m.target, { database: "Catapult-clients", server: "catapultadmin" }), "manifest-target");
  need(object(m.freeze) && m.freeze.frozen === true && /^[a-f0-9]{32}$/.test(m.freeze.marker), "freeze-marker");
  need(object(m.capture) && typeof m.capture.schemaWire === "string" && sha(Buffer.from(m.capture.schemaWire, "utf16le")) === m.capture.schemaSha256, "schema-wire");
  need(object(m.coverage) && ["approved", "identitiesComplete", "effectiveComplete", "notesComplete", "giftsComplete", "receiptsComplete"].every(k => m.coverage[k] === true), "reviewed-coverage");
  need(object(m.coverage.sourceKeys) && object(m.coverage.externalDigests), "source-key-manifest");
  need(object(m.sources), "source-inventory");
  const catalog = json(await readFile(path.join(root, "scripts/fixtures/pvas-capture-catalog.json"))) as Obj[];
  const tables = new Map<string, Obj[]>();
  for (const c of catalog) { const t = `${c.TABLE_SCHEMA}.${c.TABLE_NAME}`; tables.set(t, [...(tables.get(t) ?? []), c]); }
  need(tables.size === 30 && exactKeys(m.sources, [...tables.keys()]), "exact-catalog-inventory");
  const sourceLookup = new Map<string, Obj>();
  for (const [table, columns] of tables) {
    const source = m.sources[table], keys = m.coverage.sourceKeys[table];
    need(object(source) && Array.isArray(source.rows) && source.count === source.rows.length && Array.isArray(keys) && keys.length === source.count && new Set(keys).size === keys.length, "source-count-keys");
    for (let i = 0; i < source.rows.length; i++) {
      const entry = source.rows[i];
      need(object(entry) && object(entry.value) && typeof entry.wire === "string" && typeof keys[i] === "string" && keys[i], "source-row");
      // JS enumerates integer-named columns (portfolio 2024/2025/2026)
      // before other properties regardless of their SQL ordinal. Normalize
      // the expected enumeration only; original wire bytes stay untouched.
      const expectedKeys = Object.keys(Object.fromEntries(columns.map(c => [c.COLUMN_NAME, null])));
      need(isDeepStrictEqual(Object.keys(entry.value), expectedKeys), "raw-column-order");
      const parsed = JSON.parse(entry.wire);
      // SQL JSON original wire is retained unchanged. Reject ambiguous JS
      // integer coercion; no bigint IDs are reconstructed from rounded Numbers.
      for (const col of columns) {
        const v = parsed[col.COLUMN_NAME];
        if (col.DATA_TYPE === "int" && typeof v === "number") need(Number.isSafeInteger(v), "unsafe-raw-integer");
        if(col.DATA_TYPE==="bigint"&&entry.value[col.COLUMN_NAME]!==null){
          // The parent's capture_sources.py normalizer intentionally emits ALL
          // BIGINT values as strings. Compare exact ORIGINAL numeric lexeme;
          // JSON.parse's rounded Number must never become integer authority.
          const expected=entry.value[col.COLUMN_NAME],escaped=String(col.COLUMN_NAME).replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
          const token=entry.wire.match(new RegExp(`"${escaped}"\\s*:\\s*(-?\\d+)(?=\\s*[,}])`));
          need((typeof expected==="string"&&/^(?:0|-?[1-9]\d*)$/.test(expected)||typeof expected==="number"&&Number.isSafeInteger(expected))&&
            token&&BigInt(token[1])===BigInt(expected),"exact-bigint-wire-value");
          parsed[col.COLUMN_NAME]=expected;
        }
        if (col.DATA_TYPE === "decimal" && entry.value[col.COLUMN_NAME] !== null) {
          need(typeof entry.value[col.COLUMN_NAME] === "string" && /^-?\d+\.\d{2}$/.test(entry.value[col.COLUMN_NAME]), "raw-decimal-string");
          const escaped=String(col.COLUMN_NAME).replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
          const token=entry.wire.match(new RegExp(`"${escaped}"\\s*:\\s*(-?\\d+(?:\\.\\d{1,2})?)(?=\\s*[,}])`));
          need(token,"decimal-wire-token");
          const cents=(s:string)=>{const negative=s.startsWith("-"),[whole,fraction=""]=s.replace(/^-/,"").split(".");return BigInt(`${negative?"-":""}${whole}${fraction.padEnd(2,"0")}`);};
          need(cents(token![1])===cents(entry.value[col.COLUMN_NAME]),"exact-decimal-wire-value");
          // Preserve SQL JSON original wire; never round/re-encode it.
          parsed[col.COLUMN_NAME] = entry.value[col.COLUMN_NAME];
        }
      }
      need(isDeepStrictEqual(parsed, entry.value), "wire-value");
      if (!table.startsWith("pvas.")) need(entry.value.client === "pvas", "cross-client-source");
      sourceLookup.set(`${table}\0${keys[i]}`, entry.value);
    }
  }
  const requests = new Set(m.sources["source_import.requests"].rows.map((x: Obj) => x.value.request_id));
  for (const table of ["audit", "direct_note", "direct_value", "import_log"]) for (const entry of m.sources[`source_import.${table}`].rows)
    need(requests.has(entry.value.request_id), "request-closure");
  const { data, state, source, tracking, effectiveTracking, projection, visibleSnapshot } = await composeFrozenParts(input.parts);
  const universe = new Set<number>([...Object.keys(data.records).map(Number), ...data.index.map(r => r.cptid), ...state.prospects.map(r => r.cptid)]);
  for (const rows of Object.values(m.sources) as Obj[]) for (const { value } of rows.rows) {
    const id = value.CPTID ?? value.cptid;
    if (id !== null && id !== undefined) { need(typeof id === "number" && Number.isInteger(id) && id > 0 && id <= 2147483647, "ambiguous-raw-donor-id"); universe.add(id); }
  }
  need(Array.isArray(m.contacts) && Array.isArray(m.effective), "contacts-effective");
  const identities = new Map<number, Obj>(m.contacts.map((x: Obj) => [x.cptid, x]));
  for (const contact of m.contacts) {
    need(object(contact) && exactKeys(contact, ["cptid","client_id","is_prospect","deleted","merged_into","extension_doc","delete_reason","version","created_by","created_at"]) &&
      Number.isInteger(contact.cptid) && contact.cptid > 0 && contact.cptid <= 2147483647 &&
      (contact.client_id === null || typeof contact.client_id === "string" && contact.client_id.length <= 32) &&
      typeof contact.is_prospect === "boolean" && typeof contact.deleted === "boolean" && object(contact.extension_doc) &&
      (contact.delete_reason === null || typeof contact.delete_reason === "string" && contact.delete_reason.length <= 500) &&
      Number.isInteger(contact.version) && contact.version >= 0 && contact.version <= 2147483647 &&
      (contact.created_by === null || typeof contact.created_by === "string" && contact.created_by.length <= 200) &&
      typeof contact.created_at === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,7})?$/.test(contact.created_at), "contact-shape");
    need(!FIELDS.some(f => Object.hasOwn(contact.extension_doc,f)), "owned-field-in-extension");
  }
  need(identities.size === m.contacts.length && isDeepStrictEqual([...identities.keys()].sort((a,b)=>a-b), [...universe].sort((a,b)=>a-b)), "full-identity-universe");
  const effective = new Map<number, Obj>(m.effective.map((x: Obj) => [x.cptid, x]));
  need(effective.size === identities.size && m.effective.length === identities.size, "effective-keyset");
  const visible = new Set(projection.index.map(r => r.cptid));
  for (const [id, contact] of identities) {
    need(contact.merged_into === null || identities.has(contact.merged_into) && contact.merged_into !== id, "merge-identity");
    const row = effective.get(id); need(row && object(row.fields) && exactKeys(row.fields, FIELDS), "28-effective-cells");
    const record = visible.has(id) ? projection.record(id) as Obj | null : null;
    const t = tracking.prospects[String(id)];
    const view: Obj = record ? { fullName: record.name, street: record.contact?.street ?? null, city: record.contact?.city ?? null,
      state: record.contact?.state ?? null, zip: record.contact?.zip ?? null, phone: record.contact?.phone ?? null, phone2: record.contact?.phone2 ?? null,
      phone3: record.contact?.phone3 ?? null, email: record.contact?.email ?? null, email2: record.contact?.email2 ?? null,
      ask: record.campaignAsk?.ask ?? record.portfolio?.ask ?? null, primarySolicitor: record.assignment?.solicitor ?? null,
      secondarySolicitor: record.assignment?.solicitor2 ?? null, status: t?.status ?? null } : {};
    for (const field of FIELDS) {
      const cell = row!.fields[field];
      need(object(cell) && ["null","value"].includes(cell.state) && typeof cell.clear === "boolean" && (cell.state === "null") === (cell.value === null), "missing-effective-cell");
      need(object(cell.source) && typeof cell.source.key === "string" && cell.source.key && cell.source.winner, "cell-provenance");
      if (Object.hasOwn(view, field)) need(isDeepStrictEqual(view[field], cell.value), "old-effective-value-mismatch");
      if (cell.clear) need(cell.value === null || cell.value === "", "zero-is-not-blank-clear");
      const p = cell.source;
      if (p.table === "website_effective") { need(p.key === String(id) && p.field === field && isDeepStrictEqual(p.raw, cell.value), "derived-provenance"); continue; }
      let original: Obj | undefined;
      if (p.table === "tracking") {
        const [kind, key] = p.key.split(":");
        if (kind === "prospects") original = tracking.prospects[key];
        else if (kind === "activity" || kind === "removed") original = (kind==="activity"?tracking.activity:tracking.removed)?.find(a => a.id === key);
      } else original = sourceLookup.get(`${p.table}\0${p.key}`);
      need(original, "missing-source-binding");
      let raw: unknown = original;
      for (const part of String(p.field).split(".")) {
        if (typeof raw === "string") raw = JSON.parse(raw);
        need(object(raw) && Object.hasOwn(raw, part), "missing-raw-property");
        raw = (raw as Obj)[part];
      }
      need(isDeepStrictEqual(raw, p.raw), "raw-provenance-mismatch");
    }
  }
  need(Array.isArray(m.notes) && Array.isArray(m.noteAliases), "note-plan");
  const noteIds = new Set(m.notes.map((n:Obj) => n.ID));
  need(noteIds.size === m.notes.length && m.notes.every((n:Obj) => Number.isInteger(n.ID) && n.ID > 0 &&
    n.ID <= 2147483647 && identities.has(n.CPTID)), "note-id-closure");
  need(m.noteAliases.every((n:Obj) => typeof n.source_system === "string" && typeof n.source_key === "string" &&
    noteIds.has(n.note_id)), "note-alias-closure");
  const aliases = new Set(m.noteAliases.map((x: Obj) => `${x.source_system}\0${x.source_key}`));
  need(aliases.size === m.noteAliases.length, "duplicate-note-alias");
  for (const [kind, rows] of [["activity",tracking.activity],["removed",tracking.removed ?? []]] as const) {
    need(new Set(rows.map(r=>r.id)).size === rows.length, "ambiguous-tracking-note-id");
    for (const r of rows) need(aliases.has(`tracking.${kind}\0${r.id}`), "tracking-occurrence-alias");
  }
  for (const e of m.sources["pvas.notes"].rows) need(aliases.has(`pvas.notes\0${e.value.ID}`), "raw-note-alias");
  for (const e of m.sources["pvas.portfolio"].rows) for (const f of ["New_Notes","Historical_Notes"])
    if (e.value[f] !== null && e.value[f] !== "") need(aliases.has(`portfolio.${f}\0${e.value.CPTID}`), "portfolio-note-alias");
  for (const n of source.notes) need(aliases.has(`source_import.direct_note\0${n.event_key}`), "direct-note-alias");
  need(m.gifts?.schemaDigest && object(m.gifts.tables) && Array.isArray(m.gifts.crosswalk) && Array.isArray(m.gifts.reconciliation), "gift-crosswalk-incomplete");
  const attachments = Object.fromEntries(Object.entries(input.parts).map(([name, bytes]) => [name, { bytes: Buffer.from(bytes).toString("base64"), sha256: sha(bytes) }]));
  for (const [name, attachment] of Object.entries(attachments)) {
    const key = `pvas-precutover/${name}`;
    need(!Object.hasOwn(m.coverage.externalDigests,key) || m.coverage.externalDigests[key] === attachment.sha256, "external-byte-drift");
    m.coverage.externalDigests[key] = attachment.sha256;
  }
  m.capture = { ...m.capture, commit: PRE_CUTOVER_COMMIT, extractorVersion: EXTRACTOR_VERSION };
  m.tracking = { encoding: "base64", ...attachments.tracking };
  const manifestBytes = Buffer.from(JSON.stringify(m), "utf8");
  return { manifestBytes, sha256: sha(manifestBytes), attachments, held: true as const,
    effectiveView: { records: projection.index.map(r => projection.record(r.cptid)), snapshot: visibleSnapshot, tracking: effectiveTracking },
    proof: { sourceCommit: PRE_CUTOVER_COMMIT, extractorVersion: EXTRACTOR_VERSION, sourceHashes: HASHES, donorCount: identities.size } };
}
