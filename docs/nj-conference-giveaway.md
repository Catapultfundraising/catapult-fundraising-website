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
There are no marketing-subscription changes, public reads, participant exports,
or draw endpoints. Contact synchronization and staff notifications run only
**after** durable receipt acceptance (details below).

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
  "serviceInterest": "", "marketingConsent": true,
  "consentText": "By entering, you agree to receive emails from Catapult Fundraising. You can unsubscribe at any time.",
  "consentVersion": "entry-email-agreement-v1"
}
```

The note's `hs_timestamp` equals `acceptedAt`; HubSpot also supplies its own
`createdAt`. The receipt snapshot, not the contact's current email, determines
eligibility. No participant-provided timestamp is trusted. Required: name,
email, organization. Phone and one configured service interest are optional. The form displays:
"By entering, you agree to receive emails from Catapult Fundraising. You can unsubscribe at any time."
There is no consent checkbox. The server records `marketingConsent: true`,
the exact `consentText` and `consentVersion`, ignoring legacy/client consent
assertions rather than rejecting them. Consent is evidence only: this release
does not activate subscriptions, set marketing-contact status, or override
existing opt-outs. Prior schema-v1 receipts with `marketingConsent: false`
remain eligible; the freeze supports both historical and current receipts.
Neither service interest nor historical consent changes drawing odds.
Internal/reserved QA domains are rejected server-side and excluded again at draw.

HubSpot notes do not provide a uniqueness constraint. **Retries and concurrent
submissions may create multiple receipts but never multiple chances**: normalize
and deduplicate by email/entryKey during the private draw, retaining the earliest
complete receipt (note ID tie-breaker). Avoid a misleading search-then-insert
check against HubSpot's eventually consistent search index.

## Best-effort contact sync and entry notices

`lib/nj-conference-delivery.ts` uses the existing HubSpot contact-by-email and
Resend form-notification API patterns, with four-second timeouts per request.
These two independent operations run in parallel after a receipt is saved;
failure of either never turns an accepted entry into an error or changes its
snapshot/eligibility. The visitor's success message is unchanged.

- Resolve the normalized email through `GET contacts/{email}?idProperty=email`.
  Create an identity-only contact **only on 404**; a 409 race re-reads that same
  email, never creates again or parses upstream error text. Existing contacts
  receive **no property patches**, even if fields are blank (avoids read/fill
  races with staff). Owners, identity, lifecycle/lead status, marketing status
  and subscription opt-outs are untouched.
- Associate the saved note to the resolved contact without patching its body or
  timestamps. HubSpot's directional note-to-contact association is 202;
  contact-to-note is 201. Both label directions were verified through live
  read-only API calls. A failed association leaves the standalone receipt valid.
- With `RESEND_API_KEY`, notify **only** `anthonya@catapultfr.com` and
  `gwenp@catapultfr.com`, from the existing verified website sender. Include the
  submitted name, organization, email, optional phone/service interest, UTC
  acceptance time and receipt ID. No entrant confirmation, Jeff recipient,
  winner selection, or winner email. Client-supplied recipients are ignored.
  HTML values are escaped. Resend's idempotency key is scoped to the receipt ID;
  distinct retry/concurrent receipts may each generate a staff notice, while
  still giving the entrant exactly one drawing chance.
- Failures log only a static operation/stage and opaque numeric receipt ID,
  never entrant fields, tokens or upstream response/error bodies. Reconcile a
  failed contact sync or notice from that durable note privately. There is no
  automatic retry queue; do not infer delivery from accepted entry status.

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
`npx tsx scripts/test-nj-conference-delivery.ts` covers contact create/reuse/409
races, unchanged existing properties, independent staff notices, safe failures
and rejected-input isolation against the unchanged immutable draw format.
`node --test scripts/test-nj-conference-freeze.cjs` tests the offline roster.
`npm run build` includes TypeScript checks. No production test lead is created.
Preview needs Anthony's approval before merge; the production QR is not active
until the approved branch is merged and deployed. Do not add this page to nav,
the sitemap, webinar promotions, or any general mailing.
