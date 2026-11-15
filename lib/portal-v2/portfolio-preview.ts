// Simulation adapter for the existing guarded source importer. No transport, SQL, Blob or durable writes.
// Business targets here are NOT approved SQL columns or field-authority cutovers.
import { createHash } from "node:crypto";
import { parseKeyOf } from "./source-keys";
import { buildProfile, checkProfile, type ProfileContext } from "./source-mapping-profile";
import { inspectSourceFile, type ParseSettings } from "./source-file-preview";
import { exactOoxmlNumber } from "./source-ooxml-values";

export const PREVIEW_CLIENTS = ["pvas", "csnf", "jag", "wcbhc", "baq"] as const;
export const TARGETS = ["clientId", "verifyCptid", "note", "askAmount", "portfolio", "secondarySolicitor"] as const;
export type Target = typeof TARGETS[number];
export type Note = { id: string; text: string; sourceDate: string; source: string; actor: string };
export type Person = { cptid: number; askAmount: string; portfolio: string; secondarySolicitor: string; manual: string[]; notes: Note[] };
export type Simulation = { client: string; version: number; people: Person[] };
export type PreviewRequest = {
  client: string; fileName: string; bytes: string; sourceDate: string; actor: string;
  mapping: Record<string, string>; state: Simulation; parseSettings?: ParseSettings;
};
const sha = (x: string | Buffer) => createHash("sha256").update(x).digest("hex");
const canonical = (x: unknown): unknown => Array.isArray(x) ? x.map(canonical) : x && typeof x === "object" ? Object.fromEntries(Object.keys(x).sort().map(k => [k, canonical((x as Record<string, unknown>)[k])])) : x;
const hash = (x: unknown) => sha(JSON.stringify(canonical(x)));
const fail = (message: string): never => { throw new Error(message); };
// Notes may contain tab/LF/CR; scalar portfolio fields may not. Reject remaining C0, DEL and C1.
// Numeric codepoints make the NUL boundary explicit in source-review tools that elide escaped NUL.
const invalidControls = (value: string, note: boolean) => Array.from(value).some(char => {
  const code = char.codePointAt(0)!;
  return (code < 32 && !(note && [9, 10, 13].includes(code))) || (code >= 127 && code <= 159);
});
export function previewAvailable(env: Record<string, string | undefined> = process.env) {
  return env.VERCEL_ENV === "preview" || (!env.VERCEL_ENV && env.NODE_ENV !== "production");
}
export function fixture(client: string): Simulation {
  if (!(PREVIEW_CLIENTS as readonly string[]).includes(client)) fail("Choose a supported client");
  return { client, version: 0, people: [
    { cptid: 900001, askAmount: "1000.00", portfolio: "Synthetic team A", secondarySolicitor: "Synthetic secondary A", manual: [], notes: [{ id: "historical", text: "Existing manual note — preserve verbatim.", sourceDate: "2026-01-01", source: "manual", actor: "Fictional staff" }] },
    { cptid: 900002, askAmount: "2500.00", portfolio: "Manual solicitor", secondarySolicitor: "Manual secondary", manual: ["askAmount", "portfolio", "secondarySolicitor"], notes: [] },
  ] };
}
// Fictional client-scoped crosswalk, deliberately includes unknown and ambiguous cases.
// Never use it for real matching, and never infer identity from a donor's name.
const CROSSWALK: Record<string, number[]> = { "0001": [900001], "1": [], "0002": [900002], "0003": [900001, 900002] };
// Separate declared INTEGER source format; it never aliases "1" to text ID "0001".
const INTEGER_CROSSWALK: Record<string, number[]> = { "101": [900001], "102": [900002], "103": [900001, 900002] };
// Real template header names only; every data value below is invented. Workbook row-7 layout is NOT supported.
export const SAMPLE = [
  "CPTID,Client_ID,Primary Solicitor,Secondary Solicitor,Previous Campaign Ask,Campaign Ask,New Notes,Historical Notes,Task,Due Date,FY2024,FY2025,FY2026",
  "900001,0001,Synthetic team B,,1000,1500,Follow up after the synthetic visit,Historical text - do not append,,,,,",
  "900002,0002,New solicitor,,2500,3000,Second distinct note,Historical text - do not append,,,,,",
  ",0003,,,,4000,Ambiguous identity,,,,,,",
  ",9999,,,,,Unknown identity,,,,,,",
  "900001,0001,,,,,A different note on the same date,,,,,,",
  "900002,0001,,,,,Contradictory IDs must be held,,,,,,",
].join("\r\n") + "\r\n";
export function profileContext(client: string, parseSettings: ParseSettings = { format: "csv" }): ProfileContext {
  fixture(client);
  return { client, table: "SIMULATION_portfolio_notes", registryRev: hash(["portfolio-simulation/v3-exact-ooxml", parseSettings]), keyCol: "clientId", keyKind: "text",
    dests: TARGETS.map(col => ({ col, ty: "nvarchar", st: "candidate", key: col === "clientId" ? col : "" })),
    preparedDigest: null, allocatorDigest: null, insertPolicyDigest: null };
}
export const inspect = inspectSourceFile;
export function mappingProfile(client: string, bytes: string, mapping: Record<string, string>, profile?: string, settings?: ParseSettings) {
  const { headers, parseSettings } = inspect(bytes, settings);
  return profile === undefined ? buildProfile(profileContext(client, parseSettings), headers, mapping) : checkProfile(profile, profileContext(client, parseSettings), headers);
}
export type ReviewRow = { line: number; clientId: string; cptid: number | null; fields: { target: string; before: string; after: string; outcome: string; numericLexeme?: string }[]; reason?: string };
export function plan(input: PreviewRequest) {
  const { client, bytes, mapping, sourceDate, actor, fileName } = input;
  fixture(client);
  if (typeof fileName !== "string" || !fileName.trim() || fileName.length > 200) fail("File name required");
  if (typeof actor !== "string" || !actor.trim() || actor.length > 100) fail("Enter staff attribution for this simulation");
  if (typeof sourceDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(sourceDate) || !Number.isFinite(Date.parse(sourceDate)) || new Date(sourceDate).toISOString().slice(0, 10) !== sourceDate) fail("Provide the verified source-as-of date (YYYY-MM-DD)");
  const staged = inspect(bytes, input.parseSettings);
  mappingProfile(client, bytes, mapping, undefined, input.parseSettings); // existing profile owner validates headers, business targets and unique mapping
  const state = input.state;
  if (!state || state.client !== client || !Number.isSafeInteger(state.version) || state.version < 0 || !Array.isArray(state.people) || state.people.length !== 2) fail("Reset this client's simulation");
  // Only fictional fixture identities may be carried into the in-memory simulation.
  const base = fixture(client);
  for (let i = 0; i < base.people.length; i++) {
    const p = state.people[i];
    if (!p || p.cptid !== base.people[i].cptid || typeof p.askAmount !== "string" || typeof p.portfolio !== "string" || typeof p.secondarySolicitor !== "string" || JSON.stringify(p.manual) !== JSON.stringify(base.people[i].manual) || !Array.isArray(p.notes) || p.notes.length > 2000 || p.notes.some(n => !n || ["id", "text", "sourceDate", "source", "actor"].some(k => typeof n[k as keyof Note] !== "string"))) fail("Invalid simulation state; reset");
    if (!base.people[i].notes.every(n => p.notes.some(x => JSON.stringify(x) === JSON.stringify(n)))) fail("Historical notes must remain intact");
  }
  const next: Simulation = structuredClone(state);
  const reviews: ReviewRow[] = [];
  let changes = 0;
  const idHeader = Object.keys(mapping).find(h => mapping[h] === "clientId")!;
  const slotOf = (i: number, header: string) => `${i}|${staged.headers.indexOf(header)}`;
  const integerIds = staged.parseSettings.format === "xlsx" && staged.parseSettings.clientIdFormat === "integer";
  function identity(i: number, values: Record<string, string>) {
    const slot = slotOf(i, idHeader), raw = values[idHeader];
    let key = raw;
    if (staged.formulaSlots.has(slot) || staged.otherSlots.has(slot)) return { key, matches: [] as number[], reason: "Held: formula or unsupported client-ID cell" };
    if (staged.numericSlots.has(slot)) {
      if (!integerIds) return { key, matches: [] as number[], reason: "Held: numeric client ID requires a declared integer source format and its verified crosswalk; no leading-zero inference" };
      const exact = exactOoxmlNumber(staged.numericLexemes.get(slot) ?? "", "clientId-integer");
      if (!exact.ok) return { key, matches: [] as number[], reason: `Held: client ID ${exact.reason}` };
      key = exact.value;
    } else if (integerIds && !/^[1-9][0-9]{0,31}$/.test(raw)) return { key, matches: [] as number[], reason: "Held: client ID is not canonical text for the declared integer source format" };
    return { key, matches: parseKeyOf("text", key) === null ? [] : (integerIds ? INTEGER_CROSSWALK : CROSSWALK)[key] ?? [], reason: undefined };
  }
  // Conflicting repeated scalar values hold the scalar, while independent notes can append.
  const scalarValues = new Map<string, Set<string>>();
  for (const [i, row] of staged.rows.entries()) {
    const values = Object.fromEntries(staged.headers.map((h, i) => [h, row[i]]));
    const person = identity(i, values);
    for (const [h, t] of Object.entries(mapping)) if (["askAmount", "portfolio", "secondarySolicitor"].includes(t) && values[h]?.trim()) {
      const key = `${person.key}|${t}`;
      let value = values[h].trim();
      if (t === "askAmount" && staged.numericSlots.has(slotOf(i, h))) { const exact = exactOoxmlNumber(staged.numericLexemes.get(slotOf(i, h)) ?? "", "askAmount"); if (!exact.ok) continue; value = exact.value; }
      else if (t === "askAmount" && /^(0|[1-9]\d{0,9})(\.\d{1,2})?$/.test(value)) { const [whole, cents = ""] = value.split("."); value = `${whole}.${cents.padEnd(2, "0")}`; }
      const set = scalarValues.get(key) ?? new Set<string>(); set.add(value); scalarValues.set(key, set);
    }
  }
  staged.rows.forEach((row, i) => {
    const values = Object.fromEntries(staged.headers.map((h, j) => [h, row[j]]));
    const id = values[idHeader], resolved = identity(i, values), matches = resolved.matches;
    const r: ReviewRow = { line: staged.lines[i], clientId: id, cptid: matches.length === 1 ? matches[0] : null, fields: [] }; reviews.push(r);
    const slot = (header: string) => `${i}|${staged.headers.indexOf(header)}`;
    if (resolved.reason) { r.cptid = null; r.reason = resolved.reason; return; }
    if (r.cptid === null) { r.reason = matches.length > 1 ? "Held: ambiguous client ID" : "Held: unknown or invalid client ID (exact text required)"; return; }
    const internalHeader = Object.keys(mapping).find(h => mapping[h] === "verifyCptid");
    // Known CPTID remains a verification assertion even when unmapped, never an identity fallback.
    for (const header of new Set([internalHeader, ...(staged.headers.includes("CPTID") ? ["CPTID"] : [])])) {
      if (header === undefined) continue;
      if (staged.formulaSlots.has(slot(header)) || staged.otherSlots.has(slot(header))) { r.reason = "Held: formula or unsupported internal-ID verification cell"; return; }
      let supplied = values[header];
      if (staged.numericSlots.has(slot(header))) {
        const exact = exactOoxmlNumber(staged.numericLexemes.get(slot(header)) ?? "", "cptid");
        if (!exact.ok) { r.reason = `Held: internal CPTID ${exact.reason}`; return; }
        supplied = exact.value;
      }
      if (supplied && supplied !== String(r.cptid)) { r.reason = "Held: supplied internal CPTID contradicts the verified client-ID match"; return; }
    }
    const person = next.people.find(p => p.cptid === r.cptid)!;
    for (const [header, target] of Object.entries(mapping)) {
      if (!target || target === "clientId" || target === "verifyCptid") continue;
      let value = values[header].trim();
      const before = target === "note" ? `${person.notes.length} existing notes` : person[target as "askAmount" | "portfolio" | "secondarySolicitor"];
      const f: ReviewRow["fields"][number] = { target, before, after: value, outcome: "Blank — no change" }; r.fields.push(f);
      if (staged.formulaSlots.has(slot(header)) || staged.otherSlots.has(slot(header))) { f.outcome = "Held: formula or unsupported cell — cached value not used"; continue; }
      if (staged.numericSlots.has(slot(header))) {
        f.numericLexeme = staged.numericLexemes.get(slot(header)) ?? "";
        if (target !== "askAmount") { f.outcome = "Held: numeric value is not a text note or solicitor"; continue; }
        const exact = exactOoxmlNumber(f.numericLexeme, "askAmount");
        if (!exact.ok) { f.outcome = `Held: ${exact.reason}`; continue; }
        value = exact.value; f.after = value;
      }
      if (!value) continue;
      if (value.length > (target === "note" ? 4000 : 200) || invalidControls(value, target === "note")) { f.outcome = "Held: invalid or oversized value"; continue; }
      if (target === "note") {
        const id = hash(["direct-note/v1", client, person.cptid, sourceDate, "designated-direct-file", value]);
        if (person.notes.some(n => n.id === id)) { f.outcome = "Duplicate note — no change"; continue; }
        person.notes.push({ id, text: value, sourceDate, source: "designated-direct-file (SIMULATION)", actor: actor.trim() });
        f.outcome = "Would append note"; changes++; continue;
      }
      if (person.manual.includes(target)) { f.outcome = "Held: protected manual edit"; continue; }
      if ((scalarValues.get(`${resolved.key}|${target}`)?.size ?? 0) > 1) { f.outcome = "Held: conflicting values for this client ID"; continue; }
      let after = value;
      if (target === "askAmount") {
        if (!/^(0|[1-9]\d{0,9})(\.\d{1,2})?$/.test(value)) { f.outcome = "Held: ask must be a nonnegative amount with at most two decimals"; continue; }
        const [whole, cents = ""] = value.split("."); after = `${whole}.${cents.padEnd(2, "0")}`;
      }
      f.after = after;
      if (before === after) { f.outcome = "Unchanged"; continue; }
      person[target as "askAmount" | "portfolio" | "secondarySolicitor"] = after; f.outcome = "Would update"; changes++;
    }
  });
  if (changes) next.version++;
  const binding = hash({ v: 2, client, fileName, digest: staged.fileDigest, parseSettings: staged.parseSettings, sourceDate, actor, mapping, state, reviews });
  return { simulation: true as const, binding, fileDigest: staged.fileDigest, byteLength: staged.byteLength, parseSettings: staged.parseSettings, sourceDate, changes, reviews, next };
}
export function simulate(input: PreviewRequest, binding: string) {
  const p = plan(input);
  if (p.binding !== binding) fail("Stale preview: file, mapping, source date, attribution or simulation state changed; preview again");
  return { ...p, receipt: { simulation: true, sqlCommitted: false, published: false, sourceDate: input.sourceDate, simulatedAt: new Date().toISOString(), fileDigest: p.fileDigest, parseSettings: p.parseSettings, previewBinding: binding, changes: p.changes } };
}
