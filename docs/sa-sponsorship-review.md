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

Each explicit per-company save carries an operation UUID and monotonic revision.
The operation is bound to the authenticated member, allowlisted roster/version,
choice A/B/C/D/O and at most 2,000 comment characters. The server timestamps saves.
Operation claims and response revision receipts are immutable. Exact payload replays
return the original receipt; conflicting operation/revision replays return 409.
A failed/ambiguous save preserves its payload and operation ID until acknowledged;
controls lock to prevent accidentally replacing the retry with different content.
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
    revision: integer, choice: "A"|"B"|"C"|"D"|"O", comment: string,
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
