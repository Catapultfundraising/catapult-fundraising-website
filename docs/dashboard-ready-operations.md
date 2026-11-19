# Employee dashboard ready views

SQL remains authoritative. These private Blob generations are disposable,
validated read models, not write validation or a replacement database.

## Owners and dependency coverage

- PVAS: canonical SQL builder, complete native campaign state (merged/deleted
  identities, current campaign occurrences and source links, updates, current
  uploads and audit), complete historical upload archive, strict SQL tracking.
  This is **not** the snapshot's committed/history-only campaign lane.
- CSNF/JAG/WCBHC/BAQ: their existing SQL builders, actual portal campaign state,
  original database gift/Stewardship composition, strict SQL tracking adjusted
  using the in-progress records, and existing direct-source composition.
- Each fingerprint discovers and fully hashes its own schema's non-retired
  tables. Full row JSON includes NULL and unlimited text, SHA2_256 per row and
  sorted table hashes. SQL statements are batched below the portal's 20KB cap.
- PVAS additionally includes `pvas.legacy_engage_portal_batches`; this is the
  historical upload reader dependency otherwise excluded by the legacy prefix.
- When the other four clients' direct lane is enabled, the fingerprint also
  includes the validated existing `directFileState.revision`: backend hashes
  registrations, values and full notes, including joined request actor, file
  name/digest and authority revision. No direct SELECT on
  `source_import.requests` or extra SQL permission is needed. `observedAt` is
  deliberately excluded. The same enabled predicate gates actual composition.
- Independent documents, saved lists, ratings and report-specific read owners
  remain separate; this does not claim to pin every export/drill endpoint.

## Compatibility, atomicity and scheduling

Native Vercel cron calls `/api/dashboard-ready-refresh` every two minutes with
the existing `CRON_SECRET`; the unrelated daily portal-sync cron is preserved.
Per-client durable ETag leases prevent overlap; expiry is 330 seconds, beyond
the route's 300-second budget. Immutable gzip/V8 generation data and metadata
are completed before an ETag-conditional pointer swap.

Compatibility is explicit code version **and owner mode**:
`sql-ready-v1-canonical` for PVAS, `sql-ready-v1-direct-on` or
`sql-ready-v1-direct-off` for the four clients. Bump the code version whenever
serialized shape, owner/projection semantics, read capabilities or runtime
serialization compatibility change. PVAS canonical-off ready reads use explicit
uncached mode; that mode cannot publish a canonical ready generation.

Publication requires equal complete fingerprints before and after collection,
the same lease and pointer ETags, and a durable edit marker checked after build
and immediately before publication. A mismatch retains last good; no hot loop.
SQL-only changes may temporarily retain the last validated generation, clearly
timestamped. Confirmed edit markers forbid pre-edit generations, including
explicitly pinned detail requests.

Compatible releases reuse durable views across idle instances. Today's Vercel
auto-promotion is unchanged: this is **not** a before-visitor deployment gate.
An incompatible version needs a deliberately controlled warm/promotion process.
Preview GET cron is forbidden. Authorized preview POST additionally requires
`x-dashboard-ready-prewarm: 1`; only reviewed matching owner modes share views.
Implicit visitor publication is production-only.

## Read/warm contract and failure behavior

- Authenticated `GET /api/dashboard-ready?client=pvas` returns one paired
  `generation`, `freshness`, `index`, `tracking`, and full `state`.
- Safe acceptance metadata: generation; freshness builtAt/verifiedAt/stale and
  optional failedAt; state.dashboardGeneration; response status. Do not log
  payloads, donor IDs/values, raw integration errors, SQL or credentials.
- `&known=<generation>` returns only unchanged/generation/freshness when equal.
- Details carry `&generation=<displayed generation>`; exact older generations
  remain readable across SQL-only swaps, never across an edit marker.
- There is no time-based generation expiry in this release. Immutable data and
  metadata currently accumulate. Bounded cache-owned retention/cleanup is a
  follow-up; do not remove an active pointer or recently pinned generation.
- Authorized warm: `POST /api/dashboard-ready-refresh?client=pvas` with Bearer
  CRON_SECRET; omit client for all five. Outcomes contain only client/status and
  an allowlisted stage on failure. Parent/operator owns real warm acceptance.
- Manual "Reload current SQL view" keeps the existing authenticated cache route,
  advancing durable invalidation and scheduling refresh. No mutation is required.
- TTL=0 or genuinely absent Blob configuration explicitly restores original
  guarded uncached routes. Transient store errors never masquerade as disabled.
- Mutation invalidation retries marker CAS three times with fresh reads and no
  sleep. A failed marker after SQL commit preserves committed receipt/request ID
  and exact strict receipt JSON, adds `X-Dashboard-Refresh: unconfirmed` and a
  server timestamp header. It is **not** SQL rollback or permission to resend.
  Tracking does not fabricate a current view in that response.
- Shared action, native campaign, direct import, multipart and tracking clients
  absorb the header. A local barrier/visible warning prevents a retained read
  being labelled current until a later SQL verification. No cross-instance
  marker-delivery guarantee is possible during a store outage; cron recovery
  independently detects SQL changes. Never retry a non-idempotent SQL write
  merely because cache refresh is unconfirmed.

All local tests use fictional state and mocked transport; they do not write SQL,
production Blob, environment variables or permissions.
