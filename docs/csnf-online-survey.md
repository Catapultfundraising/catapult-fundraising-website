# CSNF online survey — preview and operations

## Scope and source

New unlisted `/csnf-survey`, styled with the existing CSN Foundation page's
logo, blue `#004990`, yellow rule `#FFD51D`, white ground and sans-serif type.
The narrative is: source introduction → concise case summary → full case/FAQ
links → the questionnaire → durable receipt. This is a working survey, not a
new marketing template. Existing `/csnf` and `/csnfvip` keep their approved
interview invitation/scheduling copy; the only change there is a case anchor.

Questions and options: **CSNF Donor Assessment Study Online Questions.docx**,
SharePoint item `01AY5622EDLSZZ7556SZGY2BOB7NKAE7HM`, modified November 13,
2026. The ten questions, all options, Q4 multiple selection and comment
prompts are transcribed into `lib/csnf-online-survey.ts`. The printed November
19 date is a placeholder and is deliberately not displayed as a launch date.
There are no source identity questions, so no invented name/email fields.
Questions are optional; an entirely blank response is rejected. Comments have
a 2,000-character UI/server bound.

Case summary and FAQ links derive from existing `/csnf` and the final
September 15 client documents (case item `01AY5622DP2MMSS6YH2JDIO2KNKMSZBCQM`,
FAQ item `01AY5622DP4N6Q6GUSPZB3ZS2RARGBN4G5`). The FAQ remains the approved
original on `/csnf#faq`, including its interview-specific final question;
no unapproved rewrite of other pages is included. The survey itself contains
no interview or scheduling invitation. No outreach or launch date is scheduled.

## Storage and privacy

Uses the already-installed `@vercel/blob` private store, not a new provider,
SQL permission, subscription or Engage endpoint.

* Existing server-only `BLOB_READ_WRITE_TOKEN` is required.
* New `CSNF_SURVEY_ENABLED=true` explicitly enables production collection.
  Leave unset until Anthony approves release.
* `VERCEL_ENV=preview` **always refuses public POST**, even if enabled and
  sharing the production Blob token. All previews remain review-only.
* One immutable private JSON receipt per browser-generated UUID v4 under
  `csnf-survey/production/responses/<uuid>.json`. Preview reads are isolated
  under `csnf-survey/preview/responses/`. No public response URLs are returned.
* Create-only writes prevent lost-update races. Stored SHA-256 canonical
  payload digest is recomputed on replay; same ID/different answers gets 409.
  A successful POST means a durable write or verified existing receipt, never
  just an email/CRM attempt or an in-memory queue. Ambiguous write errors
  re-read the receipt before acknowledging.
* The mounted form freezes and retains the exact payload/UUID across retries;
  it disables double submission. Reloading is a new form, not a respondent
  identity/deduplication mechanism. No name/email is available for per-person
  uniqueness. There is no claim of one response per human.
* Public POST checks origin, JSON content type, a honeypot, strict question
  IDs/options/types and a streaming 128 KiB body cap. No paid CAPTCHA added.
* Failures do not log response bodies/provider diagnostics. No raw responses,
  respondent identifiers or comments enter the dashboard or summary PDF.

## Export / Excel contract

`GET /api/csnf-survey/export` requires **only** an exact server-side
`Authorization: Bearer $CRON_SECRET`; a client dashboard login is insufficient.
Responses and errors are `Cache-Control: no-store`. There is no public raw
response listing. Example structure:

```json
{
  "schemaVersion": 1,
  "surveyVersion": "csnf-2026-11",
  "questions": [
    {"id":"q1","label":"…","type":"single","options":["Very good","Good","Average","Problematic","Don’t know"]},
    {"id":"q1_comments","label":"Comments:","type":"text","commentFor":"q1"}
  ],
  "responses": [
    {"id":"<uuid-v4>","submittedAt":"<server-ISO-timestamp>","surveyVersion":"csnf-2026-11","answers":{"q1":"Good","q1_comments":"…","q4":["Other"]}}
  ]
}
```

Nineteen schema keys: `q1`–`q9`, `q1_comments`–`q9_comments`, `q10`. Every
response contains all keys, blank strings/empty arrays for skipped questions.
Schema order is canonical. Full exports paginate the private Blob listing and
sort by timestamp then ID; consumers must deduplicate by immutable ID, not row
number. Export failures are 503, never a falsely successful empty response.
Stored digests are not returned. The optional `commentFor` property is metadata.

**SharePoint delivery is a separate integration**, not implemented by
pretending this website has Graph credentials. The parent task supplied the
safe append/dedup Excel exporter and verified SharePoint write access by
creating a new exact-source blank response workbook in the CSNF study's
**Interview Question Responses** folder. No source questionnaire or interview
workbook was replaced. Its scheduled exporter must remain activation-gated
until approved launch. Deployment approval, server-side export authentication
and an approved full-path check are still required before claiming active
end-to-end response delivery.

## Separate weekly reporting

The existing `/api/portal-sync?project=csnf` Monday Pacific gate now attaches
`surveyResults` to the **same** saved dashboard snapshot. It does not modify
VanillaSoft interviews, interview counts, interview signals or donor CRM data.

Scheduled non-forced CRON saves include online submissions through the prior
Friday's final millisecond in **America/Los_Angeles**, DST-aware. Manual or
`force=1` refresh uses current time. Each survey section displays its own
through-timestamp, independently of the existing interview report date.
Survey list/read/validation errors abort publication rather than showing zero.
Existing Monday scheduling is reused; no duplicate refresh cron is needed.

The gated `/csnf-dashboard` and its existing CSNF-only
`/api/csnf-summary-pdf` show **Survey Results** separately, with count and
fixed-choice breakdowns/answered denominators. Multiple-selection percentages
may sum above 100%; free text/individual responses are excluded. Until a first
successful refresh, the section says results have not been published.
Other clients and existing PDF middleware authentication are unchanged.

## Verification

```sh
node scripts/test-csnf-online-survey.cjs
npx tsc --noEmit
npm run build
```

The test suite replaces all provider/network access with fixtures and verifies
storage failures, immutable receipts/concurrency/replays/corruption, validation,
preview guard, export auth, aggregation privacy, Pacific cutoff/DST and
independent reporting. No live test donor submissions are needed or allowed.

Local UI QA (Playwright installed outside the checkout) uses
`scripts/qa-csnf-online-survey.cjs`. It expects a credential-free local server
at port 3100, collection enabled locally, and fixture dashboard auth environment
values shown in that script. All submit requests are intercepted in the browser.
It blocks external browser requests, checks mobile/desktop rendering and retry
behavior, and saves screenshots under `/workspace/csnf-proof`.
Set `CHROMIUM_EXECUTABLE` for a different local browser installation.

Repository `npm run lint` currently invokes interactive Next ESLint setup
because this repo has no ESLint configuration. No unrelated lint setup or
package dependency change is included.
