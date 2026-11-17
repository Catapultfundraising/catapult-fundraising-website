# PVAS SQL-source website slice — held, not activated

## Release boundary

`lib/portal-v2/pvas-canonical.ts` deliberately exports
`PVAS_CANONICAL_ACCEPTED = false`. It is a source-code acceptance gate, not a
new environment flag. While false the exact old snapshot/records, builder and
tracking owners remain in `.legacy.ts`; production behavior has NOT switched.
The `.precutover.ts` pure owners are pinned byte-for-byte to website main
`452a90b47ed74be1dc3b982943bf3d3e9bb8e895` for frozen effective-state capture.

No cron, PR172/survey source collection, SQL provisioning, namespace-only table
rewrite, grants, environment, deployments or migrations are changed here.
Do not enable/deploy this as a standalone migration.

## Prepared canonical read path

* Snapshot and records run the existing PVAS builder against live read-only SQL
  plus authenticated canonical Engage feeds. Single-flight five-minute cache
  starts BEFORE the build; callers receive clones. No Blob/local fallback,
  stale-on-error, partial feed or failed-promise caching. Generation invalidation
  prevents an older pending build from replacing a new cache.
* Contacts are the FULL canonical universe, not portfolio membership. All28 raw
  owner values plus extension/identity metadata survive under `_canonicalContact`.
  Present NULL, blank, false and zero do not resurrect old fallback values.
* Canonical `pvasFinancials` owns giving totals, not old overview/calendar rows.
  Decimal money remains exact strings and bigint cents; UI numeric projections
  require safe exact-cent roundtrip or hold. Unknown-year received/count/pledged
  buckets survive. No Jan1/today dates or calendar-summary synthetic gifts.
* Gifts retain `_canonicalGift:{gift,source}` immutable identity/version.
  USD hard-credit received activity is counted; non-USD, soft, void and other
  buckets remain separately inspectable rather than silently converted/dropped.
* Direct/manual source state is NOT reapplied over canonical reads. Historical
  contact/ask/assignment/wealth/outcome edits do not mask current owners.
  Current canonical merge/delete state is projected only for existing UI
  compatibility. Duplicate exclusions remain canonical backend state.
* `readIds`, pages, CRM/drills, records/reports, gift charts and authoritative
  table/index/record/report exports share SQL-built owners. The optional old
  direct-source transport is not a prerequisite for canonical reads/exports.
* Tracking/PIR comes from Engage SQL. Canonical notes render once through tracking;
  raw baseline New_Notes/Historical_Notes/client notes remain provenance.
  Display kind is current `notes.Source`, NULL/blank presented as `Note`;
  `tracking_kind` is not authority. Raw free-text dates are preserved and marked
  undated/source-date honestly. Canonical note IDs are stable `sql:<noteId>`.
* Feeds follow next/done up to4096 pages; nonadvancing, malformed or exhausted
  pagination fails closed. Tracking is uncached. Independent reads are NOT a
  transactionally consistent cross-feed snapshot; out-of-band changes can take
  at most five minutes on a warm process and require browser refetch.

Freshness is **next page load/full Reload current SQL view**, not push or
background polling, and there is no focus-refetch timer. The force-dynamic page
reloads the snapshot; CRM loads paired index/tracking on mount and on the
existing crm-index-refresh event, record panels fetch on open/local save, and
campaign state loads on mount/local save/campaign-ask-refresh. These HTTP reads
use no-store. Snapshot/records/contact/giving feeds inside the builder share its
five-minute per-process cache; tracking/PIR and campaign state gateway reads are
uncached. A confirmed in-process canonical command invalidates the builder
generation, but another warm process can still retain up to five minutes.
No change waits for a weekly import. An already-open untouched browser does not
automatically redraw merely because SQL changed.

## Prepared writes and recovery

Existing authentication/URLs/secrets remain. Website forwards exact commands to
existing `/api/portal-v2`: `pvasFields`, `pvasContact`, `pvasNote`, `pvasGift`,
`pvasBatch`, `pvasBatchUndo`, `pvasRequestStatus`. Actor must equal `by`.
Browser32hex action identity and action time are generated once per exact
logical payload, kept across uncertain responses/reload, and never regenerated
by server retry. Storage contains digest/random identity only, not donor payload.
A reused action checks original status first. Malformed200 is unconfirmed, not
success. No automatic mutating retries; a status miss is not rollback proof.

* Field/contact/prospect editors retain ORIGINAL unformatted expected values,
  including extension absence versus NULL/blank. Prospect-only client-ID edits
  preserve exact original expectation. Identity delete/restore/unmerge compares
  displayed deleted/reason/mergedInto/version. Notdup uses sorted numeric keys.
* Merge is ONE `pvasBatch` with `contactStates`, including unchanged survivor
  expected/version guard, never a sequence of independently committed contacts.
  Guarded batch undo uses `pvasBatchUndo`. Contacts do not create portfolio rows.
* Gift create uses exact string amount plus durable manual occurrence ID, not
  amount/date/name matching. Edit/void uses frozen raw gift/source/version.
  No legacy numeric/tuple gift identity adapter is permitted.
* Tracking sends original revision/requestId/by in ONE `setTracking`; SQL owns
  atomic status/assignments/note deltas and optimistic409. Edit/removal retains
  exact `_canonical` expected metadata. Physical purgeTest is403.
* Direct/monthly retain existing owning parsers, nested batch/request hashes,
  authenticated manual/file proof and gates. Original bytes travel as OUTER
  `originalBytesBase64`, unchanged preview->commit. Combined bytes+parsed request
  >2MB is held before submission, never a digest-only fallback.
  Canonical raw preview is `{v:1,status:"preview",requestId,payloadHash,planHash,
  batch,held,metadata,links}`; approval is exactly
  `{confirm:true,payloadHash,planHash}`. Any held row prevents complete commit.
  Raw root receipts and status wrappers are validated separately from legacy
  signed-plan UI. Canonical review freezes original file in memory; reload
  retains original request/hash for status only, never auto-resubmission.

Legacy string-normalizing mutation operations remain503 in the canonical lane;
their current UI equivalents use the typed commands above. Old multipart
spreadsheet upload is503 (use bounded direct/monthly typed import). Live
DonorSearch request remains503 until a verified consumer polls canonical
screeningRequest; it must not falsely report queued.

## Runnable PRE-cutover effective capture — offline, no SQL/HTTP execution

```sh
node scripts/capture-pvas-precutover.cjs /secure/pvas-capture-config.json \
  /secure/NEW-pvas-precutover-capture
```

Config (paths only, never credentials):

```json
{"manifest":"/secure/reviewed-migration-draft.json","parts":{
  "snapshot":"/secure/snapshot.original","records":"/secure/records.original",
  "tracking":"/secure/tracking.original","pirs":"/secure/pirs.original",
  "ids":"/secure/ids.original","portalState":"/secure/state.original",
  "directState":"/secure/direct-state.original"}}
```

All inputs must be captured during the SAME approved write freeze, BEFORE any
canonical switch, from existing authorities. Snapshot/records/tracking/PIR/ids
are ORIGINAL private Blob bytes, not a browser export or reserialized text.
`portalState` is the complete old authenticated PVAS portal-v2 state, including
manual prospects/updates/gift corrections/batches; `directState` is complete OLD
whole-client directFileState with old source precedence, not canonical requested
IDs and not an invented empty state. Preserve original response bytes.

The parent migration package's catalog-backed read-only `capture-sources.sql`
and offline normalizer produce the manifest's exact30-source
`{count,rows:[{value,wire}]}` inventory. `wire` is ORIGINAL SQL JSON text with
INCLUDE_NULL_VALUES and catalog column order. `value` retains DECIMAL as exact
fixed-two-decimal strings, not JS Number; original wire is never re-encoded.
Shared engage/source_import tables must be explicitly scoped client=pvas with
complete request/audit closure; pvas tables use full table. Capture original
schemaWire/schemaSha256 using the parent `capture-schema.sql`.
After the authorized read-only extraction has saved lossless driver rows:

```sh
umask 077
python migration/capture_sources.py --normalize /secure/source-table-wires.ndjson \
  --out /secure/NEW-sources.json
```

The normalizer accepts a JSON array or NDJSON of `{source_table,wire}`, including
the SQL NULL empty-table sentinel. Use the resulting object unchanged as
`manifest.sources`; supply separately reviewed sourceKeys/provenance/crosswalks.
BIGINT strings are checked against original raw numeric wire tokens, never a
rounded JSON.parse Number.

This CLI is NOT a second live collector/setup framework and executes no SQL or
network. Existing approved read-only SQL access, existing private Blob access and
existing authenticated portal/source read gateways belong to the coordinated
operator extraction step. Do not put credentials in config, logs or Git.

The reviewed manifest MUST supply full identities,28 effective cells with
winner/clear/raw-source provenance, note-occurrence aliases and evidence-backed
gift crosswalk/reconciliation. Split/spouse names, hidden fields and ambiguous
gift/note identities are reviewed decisions; the producer does NOT infer them
from name/date/amount. Missing/partial mappings hold instead of generating a
fictional complete migration.

The producer verifies pinned OLD precedence code hashes, raw source inventory/
wire/value/order/count/key closure, full donor universe, visible old effective
cells including direct0/manual precedence and explicit blank clears, note alias
closure, original tracking/PIR/other byte digests. It writes held manifest,
original attachments, exact recomposed effective view and proof to a NEW0700
directory with0600 files; it refuses overwrite. Logs contain only held/count/
hash. Parent migration compiler/schema/independent acceptance STILL must pass.
No actual production frozen capture was executed by this branch.

## Targeted checks and remaining acceptance

```sh
node scripts/test-pvas-sql-source.cjs
node scripts/test-pvas-action-capture.cjs
node scripts/test-bounded-direct-integration.cjs
node scripts/test-effective-campaign-ask.cjs
npx tsc --noEmit
```

All fixtures are synthetic; no SQL, Blob/hosted writes or donor data. The bounded
suite retains all-five old read/export/auth behavior under false gate and checks
new canonical import envelopes, approvals and original-byte budget. Action/
capture suite exercises reload identity, status-first recovery, OLD precedence,
real CLI permissions and overwrite refusal. These are not real SQL Server
transactions, hosted browser/rendered tests, grant checks or migrated-data proof.

Release remains held for approved freeze/source-byte capture and reviewed
crosswalks, compiler/migration reconciliation, actual SQL syntax/locks/grants,
paired endpoint and hosted browser acceptance (especially raw plans, receipts,
tracking concurrency/notes), exact financial parity, live-screening consumer and
independent review. Keep acceptance false until coordinated release approval.

## Bounded independent-review corrections (2026-11-17)

Recovered the exact held patch from website commit
`b52c998c5036106aa9f4a89fae4e6af39760b878` onto main
`8c38212b38ebe3818e541b26090c638d5f768d20` (PR172/survey and PR173
preserved), without accessing the cancelled owner's private worker.

* Six canonical command operations now send exactly `{op,client,command}`.
  The original ID stays in `command.requestId`; the public browser action and
  receipt-status recovery retain their existing original outer request ID.
* Tracking accepts the backend's calendar-valid `M/D/YYYY` as well as padded
  and ISO dates, without mutating `_canonical.date`. Unparseable/invalid dates
  remain undated with their honest raw `sourceDate`.
* Numeric PVAS money compatibility now checks the actual downstream shared
  rounding projection too. Cent-unstable large values fail closed, while exact
  decimal-string/bigint support and other clients' rounding remain unchanged.

Regression: `node scripts/test-pvas-reviewed-contract.cjs`. It composes the
actual route, gateway and identity owner with exact backend envelope/date
excerpts pinned in `scripts/fixtures/pvas-reviewed-backend.json` to backend
`a1f128f7fe396b18bbda0b11dfb25bfff7f50ad2`.
This is synthetic contract evidence, not SQL transaction or production proof.
Synthetic capture tests passing do not establish execution/acceptance of a
complete-schema frozen production capture. Both activation gates stay false;
paired independent review, full capture/reconciliation and release acceptance
remain required.
# Offline projection interface — held assembly input only

Module: `lib/portal-v2/pvas-precutover-capture.server.ts`

```ts
type FrozenCaptureParts = {
  snapshot: Uint8Array;
  records: Uint8Array;
  tracking: Uint8Array;
  pirs: Uint8Array;
  ids: Uint8Array;
  portalState: Uint8Array;
  directState: Uint8Array;
};
projectFrozenPvas(root: string, parts: FrozenCaptureParts): Promise<{
  held: true;
  effectiveView: {
    records: unknown[]; // displayed records, same order as visible index
    index: unknown[];   // visible only: NOT the donor universe
    snapshot: unknown;
    tracking: unknown;
  };
  effectiveData: unknown; // full composeDirectData(records) before visible projection
  identityState: {
    complete: true; // relative to supplied portalState.updates, not external inventory
    source: "portalState.updates";
    sourceSha256: string; // SHA256 of exact original portalState bytes
    mergedInto: [number, number][]; // sorted donor -> target, not transitive flattening
    deleted: [number, {reason: string; by: string; at: string}][];
  };
  proof: {
    sourceCommit: string;
    extractorVersion: string;
    sourceHashes: Record<string, string>;
    partDigests: Record<string, string>; // SHA256 of exact original bytes
  };
}>;
```

This invokes the SAME extracted internal `composeFrozenParts` used by
`captureFrozenPvas`, not new precedence code. It validates pinned source hashes,
strict original tracking, legacy record/state arrays and direct source state,
then invokes the original pinned `composeDirectData`, `currentRecordProjection`
and `currentDashboardSnapshot`. It does not require any manifest.

`effectiveData.records`/`.index` retain the complete provided record data before
hidden/deleted/merged filtering. `effectiveView.records`/`.index` are the visible
projection only. Neither is an independent proof of the full raw SQL identity
universe: the assembler must union raw inventory, original records and state,
retain hidden source/identity facts, and validate the complete manifest.
`identityState` serializes the pinned `buildOverlay` maps to sorted arrays,
including deletion reasons/stamps and latest restore/unmerge effects. An absent
map entry proves absence only relative to the exact bound original update feed;
complete collection/inventory must be independently established.

Return is JSON-safe and held. `proof.partDigests` binds the seven original parts
without decoding/re-encoding their source bytes. Preserve original parts as
separate attachments; do not reconstruct them from this projection.

Assembly must not assert accepted coverage from projection alone. Complete
reviewed identity/28-cell/provenance/note/gift/receipt/source inventory must still
pass `captureFrozenPvas(root, {manifest, parts})` and the migration validator.
Synthetic tests are not evidence of a complete-schema live frozen capture.

Focused test in `scripts/test-pvas-action-capture.cjs`: manifest-free empty
projection; source/part digests and byte immutability; JSON serialization;
invalid tracking/unpinned root refusal; direct zero, manual five, explicit
assignment clear and full snapshot/tracking parity with final capture.
