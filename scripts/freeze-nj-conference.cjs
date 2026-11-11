#!/usr/bin/env node
/**
 * PRIVATE/OFFLINE ONLY. Input: JSON array of complete HubSpot GET notes pages.
 * No network calls, secrets, public route, or email. Output contains entrant PII.
 */
const fs = require("node:fs");
const crypto = require("node:crypto");
const EVENT = "nj-conference-2026-11-12";
const PREFIX = "CATAPULT_GIVEAWAY_V1\n";
const CUTOFF = "2026-11-12T20:15:00.000Z";
const SERVICES = ["Capital campaign planning", "Legacy Call / planned giving", "Mid-level donor programs", "Annual fund / donor calling"];
const hash = value => crypto.createHash("sha256").update(value).digest("hex");
const excluded = email => {
  const domain = email.split("@")[1];
  return domain === "catapultfr.com" || domain.endsWith(".catapultfr.com") ||
    ["example.com", "example.org", "example.net", "test.com", "localhost"].includes(domain) ||
    /\.(invalid|test|localhost|example)$/.test(domain);
};
function fail(message) { throw new Error(message); }
function freeze(pages, now = Date.now()) {
  // Allow in-flight POSTs (10 second timeout) to settle, then retrieve all pages.
  if (now < Date.parse(CUTOFF) + 30000) fail("Wait until 20:15:30Z before starting the complete notes retrieval.");
  if (!Array.isArray(pages) || !pages.length) fail("Input must be all notes pages, starting with the first page.");
  const seenNotes = new Set();
  const byEmail = new Map();
  let receipts = 0, ineligible = 0;
  for (let index = 0; index < pages.length; index++) {
    const page = pages[index];
    if (!page || !Array.isArray(page.results)) fail("Invalid notes page.");
    const next = page.paging?.next?.after;
    if (index < pages.length - 1 && (next === undefined || next === null)) fail("Extra page after pagination ended.");
    if (index === pages.length - 1 && next !== undefined && next !== null) fail("Incomplete pagination: fetch every next.after.");
    for (const note of page.results) {
      const body = note?.properties?.hs_note_body;
      if (typeof body !== "string") fail("A note body is missing. Request hs_note_body,hs_timestamp on every page.");
      // An event marker anywhere without the exact machine prefix is suspicious,
      // not a reason to silently discard a potentially eligible person.
      if (!body.includes(EVENT) && !body.startsWith(PREFIX)) continue;
      if (!body.startsWith(PREFIX)) fail(`Malformed event-tagged note ${note.id}.`);
      let row;
      try { row = JSON.parse(body.slice(PREFIX.length)); } catch { fail(`Malformed event JSON in note ${note.id}.`); }
      if (row.eventId !== EVENT) fail(`Unexpected event ID in note ${note.id}.`);
      if (typeof note.id !== "string" || seenNotes.has(note.id)) fail("Duplicate/missing note ID; re-run stable full pagination.");
      seenNotes.add(note.id);
      const requiredText = (key, max, required = true) => {
        const value = row[key];
        return typeof value === "string" && value === value.trim() && (!required || value.length > 0) &&
          value.length <= max && !/[\u0000-\u001f\u007f<>]/.test(value);
      };
      if (row.schemaVersion !== 1 || row.cutoff !== CUTOFF ||
        !requiredText("firstName", 80) || !requiredText("lastName", 80) ||
        !requiredText("email", 254) || !requiredText("organization", 160) ||
        !requiredText("phone", 40, false) || !requiredText("serviceInterest", 100, false) ||
        typeof row.marketingConsent !== "boolean" ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email) ||
        row.email !== row.email.toLowerCase() ||
        (row.serviceInterest && !SERVICES.includes(row.serviceInterest)) ||
        row.entryKey !== hash(`${EVENT}\n${row.email}`) ||
        typeof row.acceptedAt !== "string" || !Number.isFinite(Date.parse(row.acceptedAt)) ||
        new Date(row.acceptedAt).toISOString() !== row.acceptedAt ||
        Date.parse(row.acceptedAt) < Date.parse("2026-11-11T00:00:00.000Z") ||
        !note.createdAt || !Number.isFinite(Date.parse(note.createdAt)) ||
        Date.parse(note.createdAt) < Date.parse(row.acceptedAt) - 60000 ||
        Date.parse(note.createdAt) > Date.parse(row.acceptedAt) + 30000 ||
        Date.parse(note.properties.hs_timestamp) !== Date.parse(row.acceptedAt)) {
        fail(`Invalid event snapshot in note ${note.id}; do not draw until resolved.`);
      }
      receipts++;
      if (excluded(row.email) || Date.parse(row.acceptedAt) >= Date.parse(CUTOFF)) { ineligible++; continue; }
      const entry = { ...row, noteId: note.id, noteCreatedAt: note.createdAt };
      const prior = byEmail.get(row.email);
      if (!prior || entry.acceptedAt < prior.acceptedAt ||
        (entry.acceptedAt === prior.acceptedAt && entry.noteId.localeCompare(prior.noteId, "en", { numeric: true }) < 0)) byEmail.set(row.email, entry);
    }
  }
  const entrants = [...byEmail.values()].sort((a, b) => a.entryKey.localeCompare(b.entryKey));
  return {
    eventId: EVENT, cutoff: CUTOFF, frozenAt: new Date(now).toISOString(),
    receipts, ineligible, duplicateReceipts: receipts - ineligible - entrants.length,
    count: entrants.length, entrants,
    entrantsSha256: hash(JSON.stringify(entrants)),
  };
}
module.exports = { freeze };
if (require.main === module) {
  const [input, output] = process.argv.slice(2);
  if (!input || !output) { console.error("Usage: node scripts/freeze-nj-conference.cjs PRIVATE-all-notes-pages.json PRIVATE-frozen-entrants.json"); process.exit(1); }
  try {
    const result = freeze(JSON.parse(fs.readFileSync(input, "utf8")));
    // Never overwrite a previously frozen roster.
    fs.writeFileSync(output, JSON.stringify(result, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    console.log(`Frozen ${result.count} entrants; ${result.duplicateReceipts} duplicate receipts; ${result.ineligible} excluded; SHA256 ${result.entrantsSha256}`);
  } catch (error) { console.error(error.message); process.exit(1); }
}
