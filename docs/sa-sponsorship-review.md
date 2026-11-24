# Salvation Army sponsorship review — preview, do not merge or launch

New standalone `/salvation-army/sponsorship-review`. No Catapult header/footer,
menu/sitemap entry, cookie-consent UI, Apollo or consented marketing scripts.
No-index/no-referrer/no-store and same-origin CSP are applied at middleware and
private APIs. No roster is bundled, prerendered, committed or served as an asset.
The only public asset is the approved, unmodified official national lockup.

## Owners / boundaries
- UI: `components/sa-sponsorship-review.tsx`, route-scoped `review.css`.
- Private schemas, security and storage: `lib/sa-sponsorship/`.
- Dedicated APIs: `/api/sa-sponsorship/{session,review,admin}`.
- Existing board-review/SQL clients are unchanged. Only `BR_CHOICES` is imported
  for the exact Washoe response wording. No outreach, exclusive assignment or
  invented due date.

## Explicit setup and launch controls
No secrets are provided in source. Inherited `BLOB_STORE_ID` OIDC works; the
alternative is `BLOB_READ_WRITE_TOKEN`. Signing uses `BOARD_REVIEW_SECRET`, falling
back to `RESEARCH_AUTH_SECRET`. Access requires `SA_SPONSORSHIP_ACCESS_CODE`.
`CRON_SECRET` separately gates private import/export; member cookies grant no
staff/research access.

Vercel preview requires **branch-scoped** `SA_SPONSORSHIP_PREVIEW_ENABLED=true`.
Production remains closed unless **separately approved** `SA_SPONSORSHIP_ENABLED=true`.
This PR does not set either flag or credentials, merge, deploy production, import
contacts or activate exports. Private import/export also fail closed when disabled.

Blob paths are `sa-sponsorship/v1/{preview|production|local}/`. Namespace selection
is server-side, never a request parameter. Preview and production cannot share
identities, roster pointers, responses or throttle buckets. Local fixture storage
is allowed only with an absolute `SA_SPONSORSHIP_LOCAL_DIR`, no `VERCEL` and
non-production Node mode; never falls back silently from Blob errors.

### Private roster import
`POST /api/sa-sponsorship/admin` with `Authorization: Bearer <CRON_SECRET>`,
`Content-Type: application/json`, and `Origin` equal to the deployment origin.
Body: the exact agreed `{schemaVersion:1,version,checkedAt,prospects:[...]}` roster.
Missing, duplicate, unexpected fields, unsafe URLs, malformed dates and IDs fail.
All prospect/portal fields are required strings (blank means unavailable). Sources
are explanatory text, not interpreted as HTML. URLs must be HTTPS, no credentials.

The roster version object and initial active pointer are create-only. Reimporting
exact content is idempotent; different content for a version or replacing the
active version returns 409. A new active roster requires an explicit reviewed
migration/new namespace strategy; this preview never silently replaces a roster.
No admin import form is exposed. Real roster data must travel through this private
endpoint, never through a public fixture file, PR, screenshot or build artifact.

### Identity and response semantics
Members self-assert name/email plus the shared access code. It is **not verified
email authentication**. A fresh login always creates a random UUID, including when
an email repeats; no member/email lookup or account recovery exists. The same
browser resumes using the signed HttpOnly Secure SameSite=Strict cookie, 30 days.
The identity hash is checked against the private persisted member record. Cookie
name `sa_sponsorship_member` is unique and uses `/` solely to reach the dedicated
API path. It does not authenticate any other tool. Logout clears only the cookie.

Login attempts are limited durably to 64 per 15-minute hashed-IP bucket (Vercel's
forwarded client IP), with create-only atomic slot claims across instances. Local
QA uses one local bucket. Retention/cleanup of old buckets is a separate operation;
this implementation never deletes records. Uniform code failures reveal no identity.

Each automatic per-company save carries an operation UUID and monotonic revision.
The operation is bound to the authenticated member, allowlisted roster/version,
choice A/B/C/D/O and at most 2,000 comment characters. The server timestamps saves.
Operation claims and response revision receipts are immutable. Exact payload replays
return the original receipt; conflicting operation/revision replays return 409.
A failed/ambiguous save preserves its payload and operation ID until acknowledged;
the pending operation remains fixed while newer edits stay editable and queue behind it.
Draft edits remain mounted across search/paging; closing/reloading before a save
is acknowledged is warned against. Unsaved edits are not stored in localStorage.

### Private exporter contract
`GET /api/sa-sponsorship/admin`, bearer `CRON_SECRET`, returns:

```text
{
  schemaVersion: 1,
  rosterVersion: string,
  prospects: Prospect[], // exact imported roster rows
  members: [{ id: UUID, name: string, email: string, createdAt: ISO8601 }],
  responses: [{ operationId: UUID, rosterVersion: string, prospectId: string,
    revision: integer, choice: ""|"A"|"B"|"C"|"D"|"O", comment: string,
    memberId: UUID, savedAt: ISO8601 }]
}
```
All historical response revisions are exported. Project the highest revision per
`(memberId,prospectId)` for current results; keep receipts for history. Identity
hashes, access codes, cookies and operation-claim internals are never exported.
Parent owns the separately approved OneDrive workbook pipeline and activation.

## Design / references
App surface, mood: trustworthy, practical, mission-led. Considered directions:
red immersive campaign, dense spreadsheet, restrained mission-branded review;
selected the last so board members can scan and answer on phones without training.
Sequence: official identity → purpose/privacy → access gate → member progress /
search → company evidence / giving timing → exact role choices → explicit receipt.
Borrowed orientation/typographic hierarchy from the official Southwest Division
page (`salvationarmyusa.org/usa-western-territory/southwest/`, verified by parent),
and explicit form labels/focus targets/surface separation from Material/Apple app
baseline. Deliberate deviation: open two-column contact/giving evidence rather than
admin-dashboard cards; stacked on mobile. No decorative photography on a work tool.

Official national guide tokens supplied by parent: red `#EF3E42`, ink `#000000`,
light `#F5F6F2`, rules `#EBEBEB`, muted `#5A646E`, white `#FFFFFF`; accessible
text/action red is a darkened derivative. Proxima Nova if installed/licensed,
Arial/Helvetica/system sans fallback, no downloaded client font. Type scale
14/16/18/24/28/34/44px, 4px spacing rhythm, sharp edges, no card shadows. Unmodified
national horizontal lockup with separate Southwest Division text; no Catapult
brand substitution. Clear unavailable text; no contact inference. Direct/mobile
semicolon lists become separate links only when each segment is a clean 7–15-digit
phone; annotated office provenance remains text instead of guessed dialing.

## Proof
- `node scripts/test-sa-sponsorship.cjs` — bounded hermetic actual route/store tests.
- `python scripts/qa-sa-sponsorship.py /tmp/sa-proof` — actual Next + Chromium,
  synthetic private import and login only, desktop/mobile screenshots, tracking,
  session isolation, retry/resume, pagination, phone links and no overflow.
- `npx tsc --noEmit` and `npm run build` use repository default ES2017 target.
- Existing `npm run lint` may invoke first-run Next ESLint configuration; no global
  lint/dependency configuration is introduced for this isolated feature.

Before: route/API did not exist (404). After: protected standalone workflow, with
no sample roster automatically installed in deployments. Test fixture is generated
only by scripts and never imported into application code. No production mutations
or live member responses are part of QA.


## Narrow preview-only source-label redaction migration

Source/provenance labels are neutralized server-side on import and every roster
read/export. Organization/contact identity, titles, emails, actual direct phone
numbers, company website, member records and response receipts are not rewritten.
Annotated office-phone provenance may change wording, never its numeric phone.
Provider-host source links are removed, not replaced with invented citations.

For an already-shared immutable preview deployment, changing getter code alone is
insufficient. The following separately authorized migration updates only the
active private roster blob, so its old deployment code reads neutral labels too.
General imports and the active pointer remain create-only.

1. Authenticated `GET /api/sa-sponsorship/admin` keeps the exact five JSON keys
   unchanged and adds `X-SA-Roster-Raw-SHA256`. This is lowercase SHA256 of **exact
   stored bytes**, including whitespace, not reserialized export JSON. No digest
   or migration metadata is exposed through member APIs.
2. Send same-origin `PATCH /api/sa-sponsorship/admin` with CRON bearer and JSON:
   `{action:"redact-source-labels",operationId:<UUIDv4>,expectedRawDigest:<header>}`.
   No roster body, path, arbitrary patch or extra keys are accepted.
3. Only Vercel **preview** allows this migration (production/local-file modes
   refuse). It pins the active version/path and verifies the supplied raw digest.
   It creates immutable `source-redactions/<operationId>/original.json` (exact raw
   bytes as base64 plus SHA256), `intent.json`, and after confirmation `receipt.json`.
   All audit objects stay private in the same environment-isolated namespace.
4. Exactly one roster write uses installed Blob SDK `ifMatch:<original ETag>`;
   no blind overwrite or general overwrite permission is introduced. Concurrent
   edits fail 409. A lost acknowledgement is resolved only by rereading the exact
   intended target-byte digest. Members/answers/operation receipts are untouched.
5. Response `{action,operationId,rosterVersion,originalRawDigest,
   redactedRawDigest,authorizedAt}` contains no contact data. An identical replay
   returns the existing receipt; changed operation/digest conflicts. `authorizedAt`
   is the server-created immutable migration-intent timestamp.

After a 409, reread the authenticated header and inspect before starting a **new**
operation ID. Do not guess/reconstruct the raw digest from the exported JSON. The
original private audit backup may retain provider provenance for integrity, but
it is never included in member or admin display exports. No live migration is
performed by repository tests or this implementation task.

Conditional-write failures expose only a bounded admin diagnostic: stage
`conditional-put`, allowlisted SDK error class (or `UnknownError`), optional integer
HTTP status100–599, and ETag format `quoted|weak|bare|missing`. Raw provider messages,
ETag bytes, secrets and contact data are never included. Installed Blob SDK
`createPutHeaders` already implies `x-allow-overwrite:1` when `ifMatch` is supplied;
GET passes its response ETag unchanged, and PUT forwards it unchanged as
`x-if-match`. Diagnostics do not weaken or retry the conditional write.

The deployed CDN GET was observed to return a weak ETag, unsuitable for `ifMatch`.
Migration now binds exact uncached raw bytes to provider-canonical private
`head()` metadata before and after GET. Canonical ETags must be identical, nonempty
and non-weak; all metadata paths match the pinned roster, and both canonical sizes
match actual byte length. Only the provider's unchanged canonical ETag is used for
`ifMatch`; no stripping/guessing or blind overwrite. Existing raw-digest and
immutable intent/UUID/target checks are unchanged. Unstable metadata fails before
any migration audit/write. Admin export raw-digest behavior remains unchanged.


## Automatic saving and navigation (follow-up)
- Role changes save immediately; comments debounce600ms and flush on blur.
- No routine Save button. Saving/Saved/Notes saved/error state is acknowledged by
  matching immutable receipts; exceptional `Retry saving` preserves the exact
  pending UUID/revision/body. Inputs remain editable while saving. Latest edits
  coalesce behind the pending operation and use the next revision only after ack.
- Empty choice `""` is additive and means **No role selected**, never Other. Notes
  save without a role. Clearing a saved note-only comment creates the next revision
  with empty choice/comment. Initial blank no-ops create no receipts. Reviewed
  counts include only actual A/B/C/D/O roles; notes-only badges say Notes saved.
- Next/Previous, search/filter and ending the session first drain every dirty
  prospect. Failure blocks navigation, retains typed text and the exact retry
  operation, and preserves the page-close warning. Search text stays pending until
  saves confirm. Next/Previous scroll to page top only after successful navigation.
- The input fields are not disabled for ordinary saves or retries. Only actual
  session deletion briefly disables editing after its final flush.
- Protocol keys, rosterVersion, endpoint paths, identity/session rules and existing
  immutable A/B/C/D/O history are unchanged. Parent exporter accepts choice `""`.
- Focused proofs: `node scripts/test-sa-sponsorship-autosave.cjs` (deterministic
  controller debounce/races/replay); existing route/store test adds note-only,
  clearing, notes-to-role, no-op rejection; existing HTTPS browser script now tests
  real React held/lost response races, editable focus, blocked navigation/search,
  scroll-top, notes-only persistence and logout flush with fictional data only.


## Private member-view contact / Top20 inclusion
The canonical roster, IDs, version, complete admin export and all immutable
member/response histories are unchanged. A separately installed private per-roster
presentation config controls the member view only.

Authenticated same-origin `PUT /api/sa-sponsorship/admin` accepts exactly
`{rosterVersion,topProspectIds:[20 unique IDs from the active canonical roster]}`.
Requires existing CRON bearer and JSON. Private path
`sa-sponsorship/v1/{environment}/presentation/{rosterVersion}.json` is create-only;
exact replay is idempotent, a different list/order/version conflicts409. No actual
ranked IDs are committed. Response summary is
`{rosterVersion,topProspectCount,visibleProspectCount,canonicalProspectCount}` for an
administrator's private expected-count check without a fake member response.

Without config, existing full-member-view behavior is preserved until metadata
is explicitly installed. With config, member GET includes any Top20 prospect OR
one with valid main work email, valid shared/public portal contact email, usable
direct/mobile number, or usable general office number. A name, website or ask/
application URL alone is insufficient. No contact field is rewritten or inferred.
Phone detection strips only a trailing alphabetic provenance annotation (before
splitting, since annotation text can contain semicolons); each remaining number
segment must be entirely optional plus/digits/spaces/parentheses/hyphens and7–15
digits. Numeric area-code parentheses survive; years, ISO dates, status text and
source URLs are not dialable contact evidence.

Member responses/progress/pagination are limited to visible IDs. Complete private
histories and full admin five-key export remain intact. POST saves still validate
against the full canonical roster so an older open page can finish an in-flight
save for a newly excluded prospect without data loss. A later refresh receives
the filtered view. No delete, roster mutation, presentation overwrite or source
workbook change occurs. Parent owns private config installation and live visible/canonical
count verification after approved deployment; tests use synthetic IDs only.

Existing focused route tests cover strict config/auth/Origin/idempotence/conflict,
known phone formats and non-phone rejection, contact-less Top20 exceptions,
portal-email/office/main-email inclusion, no-config fallback, filtered histories,
full admin export and saveability of excluded old-page IDs. Focused browser mode
`SA_MEMBER_FILTER_PROOF=1 python scripts/qa-sa-sponsorship.py <out>` verifies22/24
synthetic visible rows, correct22-count/3-page pagination/search, no excluded rows
in the browser, and preserved full24 admin history. Earlier autosave race proofs
are reused unchanged rather than rerunning broad layers.
