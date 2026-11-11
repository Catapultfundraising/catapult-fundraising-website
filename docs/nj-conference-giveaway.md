# NJ Conference giveaway, November 12, 2026

Public QR target: `https://www.catapultfr.com/nj-conference`. Unlisted/noindex.
Prize: one $50 Starbucks gift card. Cutoff is strictly before
`2026-11-12T20:15:00.000Z` (3:15 p.m. Eastern).

## Persistence and privacy

`POST /api/nj-conference` uses the existing `HUBSPOT_PRIVATE_APP_TOKEN` and notes
scope, the same API as existing partner forms. Unlike those content gates, this
form **fails closed** if durable persistence cannot be confirmed. HTTP 200 only
follows a successful notes POST with a returned note ID. Ambiguous network errors
invite a retry with the same email. No live synthetic entrants are needed for QA.
There are no notification emails, contact changes, marketing subscriptions,
public reads, participant exports, or draw endpoints.

Each submission creates one **standalone append-only note**, not a contact
property that could change later. The exact body is `CATAPULT_GIVEAWAY_V1\n`
followed by JSON:

```
{
  "schemaVersion": 1,
  "eventId": "nj-conference-2026-11-12",
  "entryKey": "SHA256(eventId + newline + normalized lowercase trimmed email)",
  "acceptedAt": "server-generated ISO UTC timestamp immediately before POST",
  "cutoff": "2026-11-12T20:15:00.000Z",
  "firstName": "...", "lastName": "...", "email": "...",
  "organization": "...", "phone": "",
  "serviceInterest": "", "marketingConsent": false
}
```

The note's `hs_timestamp` equals `acceptedAt`; HubSpot also supplies its own
`createdAt`. The receipt snapshot, not the contact's current email, determines
eligibility. No participant-provided timestamp is trusted. Required: name,
email, organization. Phone, one configured service interest, and separate
unchecked marketing consent are optional. Neither interest nor consent changes
eligibility. Consent is evidence only: this release does not subscribe anyone.
Internal/reserved QA domains are rejected server-side and excluded again at draw.

HubSpot notes do not provide a uniqueness constraint. **Retries and concurrent
submissions may create multiple receipts but never multiple chances**: normalize
and deduplicate by email/entryKey during the private draw, retaining the earliest
complete receipt (note ID tie-breaker). Avoid a misleading search-then-insert
check against HubSpot's eventually consistent search index.

## Exact private retrieval and freeze

Use the parent's authenticated HubSpot integration, not a public website route:

1. At 20:15Z entries close. Let in-flight writes settle for 30 seconds
   (POST timeout is 10 seconds), then start retrieval. An accepted receipt can
   finish persisting just after cutoff; its server `acceptedAt` determines
   eligibility. Never admit receipts with `acceptedAt >= cutoff`.
2. GET `https://api.hubapi.com/crm/v3/objects/notes?limit=100&properties=hs_note_body,hs_timestamp`.
   Keep each complete parsed response in an ordered JSON array.
3. Follow **every** `paging.next.after`, requesting the same properties and
   `limit=100&after=<cursor>`, until `paging.next` is absent. Do not use contact
   searches, note-search indexing, a single first page, or modified contacts.
   Do not set `archived=true`. Notes for this event must not be edited/deleted.
4. Save these pages in private workspace storage (PII), outside this public
   Git repository. Run:

   `node scripts/freeze-nj-conference.cjs /private/all-notes-pages.json /private/frozen-entrants.json`

   The offline script verifies event snapshots, cutoff, timestamps and identity,
   excludes staff/QA, deduplicates email, sorts deterministically, records a
   SHA256, and refuses to overwrite an existing freeze. **Malformed event-tagged
   records or incomplete pagination stop the draw**, rather than silently
   excluding a person. Fetching all pages from the first page is an operator
   prerequisite (the API does not sign a complete export).
5. Keep both source pages and frozen JSON as the audit trail. Do not subsequently
   append later entries or redraw because contact details changed. If count is
   zero, stop and report no eligible entrants. Parent chooses one index with
   cryptographic `randomInt(count)` and records selected note ID, entryKey,
   frozen hash and draw time, then privately emails `gwenp@catapultfr.com`.
   Winner notification is not implemented by the website.

## Verification and release

`npx tsx scripts/test-nj-conference.ts` mocks every network request.
`node --test scripts/test-nj-conference-freeze.cjs` tests the offline roster.
`npm run build` includes TypeScript checks. No production test lead is created.
Preview needs Anthony's approval before merge; the production QR is not active
until the approved branch is merged and deployed. Do not add this page to nav,
the sitemap, webinar promotions, or any general mailing.
