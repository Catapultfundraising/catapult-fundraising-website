# Feasibility study sales sample (preview only)

Unlisted URL: `/samples/feasibility-study`. No navigation, sitemap or existing deck changes.
All content is a fictional sales sample. No identity mappings are used or uploaded.

## Design

The document is the centerpiece, not another sales-card grid. Keep existing site navigation,
Fraunces/Manrope and navy/paper/brass tokens. A quiet title/meeting link leads into a compact
toolbar, then a navy reading desk with the actual document. A document-first spread borrows the
existing deck viewer's neutral controls and native PDF viewer's explicit pagination/zoom.
Candidate alternatives (full-screen immersive viewer and sales landing page with an embedded
book) were rejected: prospects need context, readable pages and a direct meeting link.
36/28px heading, 14px controls, 44px minimum controls, 16/28px reading-desk padding.
No new global design tokens. Mobile is single-page; reduced motion replaces page-flip with
an immediate single-page image, not just a shorter animation.

## Authorization and storage

Uses existing `DECKS_PASSWORD` and `DECKS_AUTH_SECRET` only. Dedicated 8-hour HMAC session,
domain-separated from every other gate, HttpOnly, Secure, SameSite=Strict, path restricted to
`/samples/feasibility-study`. This cookie cannot authorize decks, research or client dashboards.
A valid existing sales-deck cookie may also read the sample and its media (one-way only), so
visitors coming from the protected `/decks` library do not enter the same password twice.
Missing either setting fails closed. Password/secret rotation invalidates sessions.
Page and every media route authorize server-side; private, no-store responses. No manifest
endpoint is exposed. Public metadata JSON contains only exact byte counts and SHA-256 hashes.
Do not add assets to this public repo, even outside public/.

Private Blob uses the existing Vercel OIDC + `BLOB_STORE_ID` project connection, consistent
with the portal document storage owner. No new environment secret is required.
`FEASIBILITY_SAMPLE_LOCAL_DIR` is for local QA only and ignored whenever `VERCEL` is set.
It must point OUTSIDE the checkout. Original PDF bytes are retained unchanged.

Generate assets using `python scripts/prepare-feasibility-sample.py source.pdf /private/output`
(pypdfium2 and Pillow). Expected PDF SHA-256 is pinned in the script and library.
200 dpi WebP quality 88 provides readable 2x zoom. 126 DOM placeholders, but at most seven
nearby full-resolution images initially; later pages load on demand.
The `page-flip` 2.0.7 library is MIT (copyright 2020 Nodlik); its npm package retains LICENSE.

## Provisioning (parent/operator only)

`POST /api/feasibility-sample-upload` with `Authorization: Bearer <existing CRON_SECRET>`
and JSON `{ "op": "prepare", "name": "page-001.webp" }` returns a five-minute private PUT
URL for exactly that allowlisted path/type/maximum byte count. Never log the returned URL.
PUT the raw bytes with the returned content type. No overwrite is permitted.
Then POST `{ "op": "verify", "name": "page-001.webp" }`: server checks exact bytes + SHA-256.
Repeat for `document.pdf` and all 126 images in the generated manifest.
No upload can be delegated using a sales-session cookie. No broad store credentials returned.
HTTP callback/multipart protocols are not needed; upload large PDF directly to Blob, not Vercel.
Verify all 127 assets before calling a hosted preview ready.
The gate rate limiter is best-effort per instance; use Vercel edge rate limits for sustained abuse.
Do not merge or expose publicly without Anthony's preview approval.
