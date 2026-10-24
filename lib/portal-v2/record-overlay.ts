// Dashboard-origin record edits saved in Engage SQL (engage.portal_updates, latest row per cptid+field wins).
// The weekly refresh never writes these, so they always win over client-database data:
//   contact:<key>   edited contact field (old_value = what it replaced -> "Old contact information")
//   wealth:capacity / wealth:rating   staff override of the wealth screening
//   wealth:request  DonorSearch screening requested (JSON of the search inputs); processed by Viktor's screening job
//   wealth:ds       DonorSearch screening result (JSON) written by that job
//   merged_into     this record was merged into another CPTID ("" = unmerged)
//   deleted         record deleted from the dashboard (new_value = reason, "" = restored)
//   notdup          "not a duplicate" decisions (new_value = group key)

export const CONTACT_KEYS = ["street", "city", "state", "zip", "phone", "mobile", "phone2", "phone3", "email", "email2", "email3", "workEmail"] as const;
export type ContactKey = (typeof CONTACT_KEYS)[number];
export const CONTACT_LABELS: Record<ContactKey, string> = {
  street: "Street address", city: "City", state: "State", zip: "ZIP", phone: "Phone", mobile: "Mobile", phone2: "Phone 2", phone3: "Phone 3", email: "Email", email2: "Email 2", email3: "Email 3", workEmail: "Work email",
};
export const OVERLAY_FIELD = (f: string) => f.startsWith("contact:") || f.startsWith("wealth:") || f === "merged_into" || f === "deleted" || f === "notdup";

export type UpdateRow = { id?: number; cptid: number; field: string; old_value: string | null; new_value: string | null; created_by?: string | null; created_at?: string | null };
export type Stamp = { by: string; at: string };
export type ContactChange = { key: string; label: string; from: string; to: string } & Stamp;
export type DsResult = { status: "matched" | "no_match" | "error"; fields?: Record<string, string>; quality?: number; message?: string; inputs?: Record<string, string> };

export interface Overlay {
  contact: Map<number, Partial<Record<ContactKey, string>>>;
  contactHistory: Map<number, ContactChange[]>;
  wealth: Map<number, { capacity?: { value: string; from: string } & Stamp; rating?: { value: string; from: string } & Stamp }>;
  ds: Map<number, DsResult & Stamp>;
  request: Map<number, { inputs: Record<string, string> } & Stamp>;
  mergedInto: Map<number, number>;
  deleted: Map<number, { reason: string } & Stamp>;
  notdup: Set<string>;
  log: ({ cptid: number; action: "merged" | "unmerged" | "deleted" | "restored"; target?: number; reason?: string } & Stamp)[];
}

const st = (u: UpdateRow): Stamp => ({ by: u.created_by ?? "", at: u.created_at ? String(u.created_at) : "" });
const json = <T,>(v: string | null): T | null => { try { return v ? (JSON.parse(v) as T) : null; } catch { return null; } };

export function buildOverlay(updates: UpdateRow[]): Overlay {
  const o: Overlay = { contact: new Map(), contactHistory: new Map(), wealth: new Map(), ds: new Map(), request: new Map(), mergedInto: new Map(), deleted: new Map(), notdup: new Set(), log: [] };
  const rows = [...updates].filter((u) => OVERLAY_FIELD(u.field)).sort((a, b) => (Number(a.id) || 0) - (Number(b.id) || 0));
  for (const u of rows) {
    const c = Number(u.cptid);
    if (u.field.startsWith("contact:")) {
      const key = u.field.slice(8) as ContactKey;
      if (!(CONTACT_KEYS as readonly string[]).includes(key)) continue;
      const cur = o.contact.get(c) ?? {}; cur[key] = u.new_value ?? ""; o.contact.set(c, cur);
      const h = o.contactHistory.get(c) ?? []; h.push({ key, label: CONTACT_LABELS[key], from: u.old_value ?? "", to: u.new_value ?? "", ...st(u) }); o.contactHistory.set(c, h);
    } else if (u.field === "wealth:capacity" || u.field === "wealth:rating") {
      const k = u.field.slice(7) as "capacity" | "rating";
      const cur = o.wealth.get(c) ?? {};
      if (u.new_value) cur[k] = { value: u.new_value, from: u.old_value ?? "", ...st(u) }; else delete cur[k];
      o.wealth.set(c, cur);
    } else if (u.field === "wealth:ds") {
      const r = json<DsResult>(u.new_value); if (r) o.ds.set(c, { ...r, ...st(u) });
    } else if (u.field === "wealth:request") {
      o.request.set(c, { inputs: json<Record<string, string>>(u.new_value) ?? {}, ...st(u) });
    } else if (u.field === "merged_into") {
      const t = Number(u.new_value);
      if (t > 0) { o.mergedInto.set(c, t); o.log.push({ cptid: c, action: "merged", target: t, ...st(u) }); }
      else { o.mergedInto.delete(c); o.log.push({ cptid: c, action: "unmerged", target: Number(u.old_value) || undefined, ...st(u) }); }
    } else if (u.field === "deleted") {
      if (u.new_value) { o.deleted.set(c, { reason: u.new_value, ...st(u) }); o.log.push({ cptid: c, action: "deleted", reason: u.new_value, ...st(u) }); }
      else { o.deleted.delete(c); o.log.push({ cptid: c, action: "restored", ...st(u) }); }
    } else if (u.field === "notdup") {
      if (u.new_value) o.notdup.add(u.new_value);
    }
  }
  return o;
}

/** Final surviving CPTID after merge chains (A -> B -> C gives C). Cycles stop at the first repeat. */
export function finalId(o: Overlay, cptid: number): number {
  let cur = cptid; const seen = new Set<number>();
  while (o.mergedInto.has(cur) && !seen.has(cur)) { seen.add(cur); cur = o.mergedInto.get(cur)!; }
  return cur;
}
/** CPTIDs merged (directly or through a chain) into `target`. */
export function mergedSources(o: Overlay, target: number): number[] {
  return [...o.mergedInto.keys()].filter((c) => c !== target && finalId(o, c) === target);
}
/** A screening request is pending until a result newer than it exists. */
export function screeningPending(o: Overlay, cptid: number): boolean {
  const r = o.request.get(cptid); if (!r) return false;
  const d = o.ds.get(cptid);
  return !d || String(d.at) < String(r.at);
}

// ---- likely duplicates ----
const NICK: string[][] = [
  ["william", "bill", "billy", "will", "willie", "liam"], ["robert", "bob", "bobby", "rob", "robbie", "bert"], ["richard", "dick", "rick", "ricky", "rich", "ricardo"],
  ["james", "jim", "jimmy", "jamie"], ["michael", "mike", "mikey", "mick"], ["katherine", "kathy", "kate", "katie", "kathleen", "kat", "catherine", "cathy"],
  ["elizabeth", "liz", "beth", "betty", "lisa", "eliza", "libby"], ["thomas", "tom", "tommy"], ["charles", "chuck", "charlie", "chas"], ["joseph", "joe", "joey"],
  ["daniel", "dan", "danny"], ["david", "dave", "davey"], ["steven", "stephen", "steve"], ["anthony", "tony"], ["susan", "sue", "suzy", "susie"],
  ["patricia", "pat", "patty", "trish"], ["patrick", "pat"], ["edward", "ed", "eddie", "ted", "eduardo"], ["kenneth", "ken", "kenny"], ["lawrence", "larry"],
  ["ronald", "ron", "ronnie"], ["donald", "don", "donnie"], ["gerald", "jerry"], ["gregory", "greg"], ["matthew", "matt"], ["christopher", "chris"],
  ["christine", "chris", "christy", "tina"], ["nicholas", "nick", "nicolas", "nico"], ["samuel", "sam", "sammy"], ["benjamin", "ben", "benny"], ["andrew", "andy", "drew"],
  ["alexander", "alex", "alejandro"], ["jennifer", "jen", "jenny"], ["margaret", "peggy", "maggie", "meg", "marge"], ["deborah", "debbie", "deb", "debra"],
  ["frederick", "fred", "freddy"], ["albert", "al"], ["alfred", "al"], ["francisco", "frank", "paco", "pancho"], ["francis", "frank"], ["jose", "joe", "pepe"],
  ["guillermo", "william", "memo"], ["roberto", "robert", "beto"], ["alberto", "albert", "beto"], ["jesus", "chuy"], ["manuel", "manny"], ["enrique", "henry", "kike"],
  ["henry", "hank", "harry"], ["harold", "harry", "hal"], ["raymond", "ray"], ["timothy", "tim"], ["jeffrey", "jeff", "geoffrey"], ["douglas", "doug"],
  ["phillip", "philip", "phil"], ["victoria", "vicky", "tori"], ["rebecca", "becky", "becca"], ["cynthia", "cindy"], ["sandra", "sandy"], ["pamela", "pam"],
];
const NICKMAP = new Map<string, Set<string>>();
for (const g of NICK) for (const n of g) { const s = NICKMAP.get(n) ?? new Set<string>(); g.forEach((x) => s.add(x)); NICKMAP.set(n, s); }
const STOP = new Set(["and", "the", "mr", "mrs", "ms", "dr", "jr", "sr", "ii", "iii", "family", "&"]);
const words = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter((w) => w && !STOP.has(w));
const normStreet = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\b(street|st|road|rd|drive|dr|avenue|ave|lane|ln|boulevard|blvd|court|ct|circle|cir|place|pl|apt|unit|suite|ste)\b/g, "").replace(/\bnorth\b/g, "n").replace(/\bsouth\b/g, "s").replace(/\beast\b/g, "e").replace(/\bwest\b/g, "w").replace(/\s+/g, " ").trim();
const firstOk = (a: string[], b: string[]) => a.some((x) => b.some((y) => x === y || NICKMAP.get(x)?.has(y) || (x.length === 1 && y.startsWith(x)) || (y.length === 1 && x.startsWith(y))));

/** dupOf = CPTID the client's own database marks this record a duplicate of (e.g. PVAS MASTER "DELETE" = "Duplicate 3604"). */
export type DupCandidate = { cptid: number; name: string; city?: string; street?: string; lifetime?: number; kind?: string; dupOf?: number };
export type DupGroup = { key: string; reason: string; strength: number; members: DupCandidate[] };

/** Likely duplicate pairs/groups: same last name AND (same street, or same city with matching/nickname/contained first names), or identical names. */
export function findDuplicates(cands: DupCandidate[], notdup: Set<string>, max = 400): DupGroup[] {
  type C = DupCandidate & { w: string[]; f: string[]; s: string; c: string; n: string };
  const byLast = new Map<string, C[]>();
  const byId = new Map<number, C>();
  for (const x of cands) {
    const w = words(x.name);
    const c: C = { ...x, w, f: w.slice(0, -1), s: normStreet(x.street ?? ""), c: (x.city ?? "").trim().toLowerCase(), n: w.join(" ") };
    byId.set(c.cptid, c);
    if (!w.length) continue;
    const last = w[w.length - 1]; if (last.length < 2) continue;
    (byLast.get(last) ?? byLast.set(last, []).get(last)!).push(c);
  }
  const pairs: { a: C; b: C; reason: string; strength: number }[] = [];
  for (const a of byId.values()) {
    const b = a.dupOf ? byId.get(a.dupOf) : undefined;
    if (b && b.cptid !== a.cptid) pairs.push({ a, b, reason: "Marked as a duplicate in the client's database", strength: 95 });
  }
  for (const list of byLast.values()) {
    if (list.length < 2 || list.length > 2500) continue;
    for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
      const a = list[i], b = list[j];
      const sameName = a.n === b.n;
      const sameStreet = a.s.length > 4 && a.s === b.s;
      const sameCity = !!a.c && a.c === b.c;
      const noConflict = !a.c || !b.c;
      const firstMatch = a.f.length > 0 && b.f.length > 0 && firstOk(a.f, b.f);
      const contained = a.f.length > 0 && b.f.length > 0 && (a.f.every((x) => b.f.includes(x)) || b.f.every((x) => a.f.includes(x)));
      let reason = "", strength = 0;
      if (sameName) { reason = sameStreet ? "Same name and address" : sameCity ? "Same name and city" : "Same name"; strength = sameStreet ? 100 : sameCity ? 85 : (!a.c || !b.c) ? 75 : 40; }
      else if (sameStreet && (firstMatch || contained)) { reason = "Same last name and address"; strength = 90; }
      else if (sameCity && contained) { reason = "Same last name and city, one name includes the other"; strength = 70; }
      else if (sameCity && firstMatch) { reason = "Same last name and city, matching first name or nickname"; strength = 60; }
      else if (noConflict && contained && !(a.s && b.s && a.s !== b.s)) { reason = "Same last name, one name includes the other"; strength = 62; }
      else if (noConflict && firstMatch) { reason = "Same last name, matching first name or nickname (no address to compare)"; strength = 50; }
      else if (contained && a.f.length !== b.f.length) { reason = "Same last name, one name includes the other (different address)"; strength = 30; }
      if (strength) pairs.push({ a, b, reason, strength });
    }
  }
  const parent = new Map<number, number>();
  const find = (x: number): number => { const p = parent.get(x) ?? x; if (p === x) return x; const r = find(p); parent.set(x, r); return r; };
  for (const p of pairs) { const ra = find(p.a.cptid), rb = find(p.b.cptid); if (ra !== rb) parent.set(ra, rb); }
  const byRoot = new Map<number, typeof pairs>();
  for (const p of pairs) { const r = find(p.a.cptid); (byRoot.get(r) ?? byRoot.set(r, []).get(r)!).push(p); }
  const strip = (c: C): DupCandidate => ({ cptid: c.cptid, name: c.name, city: c.city, street: c.street, lifetime: c.lifetime, kind: c.kind });
  const out: DupGroup[] = [];
  const emit = (members: C[], reason: string, strength: number) => {
    const key = members.map((m) => m.cptid).sort((x, y) => x - y).join("|");
    if (notdup.has(key)) return;
    out.push({ key, reason, strength, members: members.map(strip).sort((x, y) => (y.lifetime ?? 0) - (x.lifetime ?? 0)) });
  };
  for (const ps of byRoot.values()) {
    const ids = new Map<number, C>(); for (const p of ps) { ids.set(p.a.cptid, p.a); ids.set(p.b.cptid, p.b); }
    const best = ps.reduce((m, p) => (p.strength > m.strength ? p : m), ps[0]);
    if (ids.size <= 5) emit([...ids.values()], best.reason, best.strength);
    else for (const p of ps) emit([p.a, p.b], p.reason, p.strength);
  }
  return out.sort((x, y) => y.strength - x.strength || (y.members[0].lifetime ?? 0) - (x.members[0].lifetime ?? 0)).slice(0, max);
}
