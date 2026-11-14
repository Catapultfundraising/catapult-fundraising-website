# CSNF survey: identified autosave, preview and operations

## Source and approved scope

`/csnf-survey` is unlisted/noindex and uses the existing CSN Foundation logo,
blue, yellow rule and sans-serif typography. The logo now aligns with the
paragraph column; question headings sit fully inside white cards.

The original ten questions, Q4 options/multiple selection and all comment
prompts remain verbatim from **CSNF Donor Assessment Study Online Questions.docx**
(Tina Romero's November 13 attachment; SharePoint item
`01AY5622EDLSZZ7556SZGY2BOB7NKAE7HM`). The printed November19 date is a
placeholder, not a launch date, and is omitted.

During preview review Anthony explicitly authorized **required first/last
name, optional telephone, and identified autosave including unfinished
surveys**. Those fields are additions approved by Anthony, not attributed to
the original questionnaire. The disclosure is visible before the identity
fields. Survey questions remain optional, including on final submission.
Names are trimmed/nonblank, max120 characters each; telephone optional/max80
without a country-specific format rule. Controls are rejected in identity
strings. Written answers max2000 characters each.

The concise case summary links to `/csnf#case-for-support` and `/csnf#faq`.
`/csnf` resource mode hides its two invitation/scheduling blocks and the
interview-only final FAQ. Substantive case and first11 FAQ answers are
unchanged (rendered-mode identity is regression-tested). `/csnfvip` retains
its original invitation experience. No launch, outreach or public release
is scheduled by this implementation.

## Private provider and deployment gate

Uses installed `@vercel/blob`2.6.1 with the project's existing OIDC route:
`BLOB_STORE_ID` is configured for preview+production; Vercel OIDC is enabled
with team issuer. The existing `Catapultprofiles` store,
`store_e7SitofNOvoFTa0p`, is private/available/iad1 and bound to this project
for both environments, verified via read-only metadata. No new provider,
subscription, SQL permission or `BLOB_READ_WRITE_TOKEN` is required.
`CRON_SECRET` exists as an encrypted key for preview+production.

Public collection requires **`CSNF_SURVEY_ENABLED=true`** in approved
production. Leave unset until Anthony approves release.
`VERCEL_ENV=preview` **always refuses public POST**, even if enabled.
Preview UI labels collection as disabled. All private reads also use a
separate preview namespace as defense in depth.

## Autosave lifecycle and durability

* One random UUID session and256-bit write capability per mounted page.
  Capability stays in browser memory, is sent only in JSON body, and is
  domain-separated/hashed server-side. No public response GET, identity/capability
  URL, raw capability export/log/storage or browser localStorage persistence.
  Browser reload/resume is not implemented; a reload starts a new session.
  No per-human/name uniqueness or cross-session merging is claimed.
* Before both trimmed names are present, no save occurs. Afterward identity
  and optional/partial answers autosave after1second of inactivity and on
  text-field blur. Clearing a name shows that latest edits are not saved,
  keeps edits locally pending, and does not delete a previously saved draft.
* Ordinary writes serialize and coalesce newer edits. A failed ambiguous
  revision retains its exact payload for retry; newer local edits remain
  editable and are saved afterward at a higher revision. Server400 means
  known-not-persisted invalid input, so corrected data can advance without
  getting stuck replaying invalid input. No infinite background retry loop.
  Ordinary requests have a15-second AbortController timeout; a hung request
  becomes an ambiguous retryable save, not an indefinitely blocked queue.
* `visibilitychange` to hidden and `pagehide` flush the latest valid state
  with fetch keepalive, reserving a higher immutable draft revision if an
  ordinary save is in flight. Lifecycle flush is **best effort**, subject to
  network/browser keepalive limits. No guaranteed close/offline save claim.
* “Saved” appears only after matching server acknowledgement for the latest
  local state. Old acknowledgements cannot mark newer edits saved.
* Submit freezes the final payload and retries it unchanged if ambiguous.
  It marks a terminal submitted state, not first persistence. No further
  autosaves occur after confirmed submission.
  A known-not-persisted final400 unlocks correction/autosave/resubmission;
  ambiguous network/5xx failures keep the final payload frozen for safe retry.

Immutable private objects:

```
csnf-survey/v2/{production|preview}/sessions/{uuid}/owner.json
csnf-survey/v2/{production|preview}/sessions/{uuid}/revision-0000001.json
csnf-survey/v2/{production|preview}/sessions/{uuid}/submitted.json
```

Owner holds only capability hash+createdAt. Revision/final snapshots contain
identity/answers, status, server timestamps and a recomputed integrity digest.
All creates use private access, fixed paths, `allowOverwrite:false`.
Same ID/revision plus changed actual normalized payload is409, never overwrite.
Missing/wrong capability cannot update that session. Concurrent create and
lost acknowledgements are resolved by verifying the stored immutable object.

Draft revisions are integers1–1000000. Submitted revision is the reserved
terminal **1000001**, always above any draft even if an earlier draft request
lands late. The final object is create-only and authoritative; a second
different final snapshot is rejected. Private roster reads fail on corrupted
or unavailable snapshots instead of returning apparent zero.

Public POST also checks same origin, JSON content type, honeypot, strict
schema/options and streaming128KiB body limit. Errors expose no private
payload/provider diagnostics. Identified drafts are retained as study data;
no automatic deletion policy was invented.

## Export contract: schemaVersion2

`GET /api/csnf-survey/export` requires exact server-side
`Authorization: Bearer $CRON_SECRET`, not a dashboard cookie. Responses/errors
are `Cache-Control:no-store`; unauthenticated401. Example:

```json
{
  "schemaVersion": 2,
  "surveyVersion": "csnf-2026-11-v2",
  "identityFields": [
    {"id":"firstName","label":"First name","required":true},
    {"id":"lastName","label":"Last name","required":true},
    {"id":"telephone","label":"Telephone","required":false}
  ],
  "questions": [{"id":"q1","label":"…","type":"single","options":["…"]}],
  "responses": [{
    "id":"<uuid-v4>",
    "status":"draft",
    "revision":1,
    "surveyVersion":"csnf-2026-11-v2",
    "createdAt":"2026-11-13T21:00:00.000Z",
    "updatedAt":"2026-11-13T21:00:00.000Z",
    "submittedAt":null,
    "firstName":"…","lastName":"…","telephone":"",
    "answers":{"q1":"","q1_comments":"","q4":[]}
  }]
}
```

One current record per session, not one row per autosave.19 question keys:
q1–q9, q1_comments–q9_comments, q10. All keys are present; blank strings/arrays
mean unanswered. Comments have `commentFor` metadata. Submitted has
status=`submitted`, revision1000001, submittedAt=updatedAt (UTC millisecond
canonical ISO); drafts have submittedAt=null. createdAt<=updatedAt.
No capability, capability hash or integrity digest is returned.

Private listing paginates; projection picks highest eligible revision and is
sorted by createdAt/ID. Export failure503 is not a successful empty roster.
V2 storage is isolated from the earlier anonymous schema; no real source
records were migrated or invented.

Parent provisioned the safe Excel exporter separately and verified/migrated
only its own original exact-source blank0-row response workbook to v2 in CSNF
**Interview Question Responses**, retaining the workbook link/item. It now
supports identified drafts/finals, latest managed-row projection, observed
revision history and preserved staff notes, with conditional ETag updates.
No original questionnaire/interview/source document was replaced and no fake
rows were inserted. Hourly `/client/csnf-survey-excel-export` remains **PAUSED**
and `config.launchApproved=false`. Activation/full-path check await approved
release; this website does not pretend to have SharePoint Graph credentials.

## Monday dashboard / PDF

Existing CSNF Monday sync is reused, with prior Friday end in
America/Los_Angeles (DST-aware) for survey results; manual/forced refresh uses
current time. Snapshots are filtered by cutoff **before session projection**:
a Saturday edit/final submission cannot erase Friday's in-progress answers.
The survey section displays its own through-timestamp.

`surveyResults.responseCount/questions` describe submitted sessions.
`partialResponseCount/partialQuestions` describe in-progress/not-submitted
sessions, including their answer breakdowns. Both are independent of interview
counts/signals. The dashboard and existing CSNF-only gated PDF show each
question once with Submitted/In-progress columns and separate answered
denominators. Multi-select totals can exceed100%. No names, telephone,
individual records or written comments enter either aggregate/cohort.
Storage/list/validation failures abort snapshot publication, not false zero.
Other clients, donor data dashboards and PDF authentication are unchanged.

## Verification

```
node scripts/test-csnf-online-survey.cjs
npx tsc --noEmit
npm run build
```

Hermetic tests mock every provider/network boundary: names gate, partial
without Submit, editable failed-save/coalescing/retry, exit/ordinary write and
ack races, immutable capability-authorized revisions, terminal uniqueness,
historical cutoff, no-PII cohorts and export auth. Local Playwright QA scripts
intercept every submit/autosave and cover desktop/mobile layout and lifecycle
behavior. `scripts/proof-csnf-survey-pdf.cjs` renders an actual fixture-only PDF
and checks both cohorts and absence of private fixture identity/comments.
No live donor submission or receipt write is needed/allowed for QA.

Repo `npm run lint` still opens interactive Next ESLint setup because no ESLint
configuration exists. No unrelated configuration/dependencies were added.
