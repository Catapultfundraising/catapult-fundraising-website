# Public media landing page — approval draft

Route: `/public-media`. Do not merge or publish without Anthony's approval.

## Source and claims

- Brief: Jeff Grandy's email to Anthony, November 20, 2026, “public media outreach landing page.”
- Uses the exact theme “Beyond Membership. Toward Major Gifts.” and the four requested offering names.
- The seven-station roster is sourced to that brief. No claims about each station's program, results or endorsement are made.
- Catapult carries out personal donor engagement, documents interests, and coordinates qualified handoffs. The station develops the major-gift relationship and makes the major-gift ask.
- No competitor comparison, invented outcomes or testimonials.

## Conversion

One action, repeated twice: “Schedule a 20-minute conversation.”

The CTA intentionally opens an email to `jeffg@catapultfr.com` with a prefilled request for a 20-minute public media conversation. Jeff's current booking page offers 30/45/60-minute choices, not 20 minutes. Replace the mailto with a verified 20-minute booking flow only after one is available; the page explicitly says that it opens an email request.

## Design and assets

- Reuses the site's locally hosted Fraunces and Manrope fonts and navy/paper/brass tokens.
- Reuses real photography already published at `/services/board-development/hero-board-meeting.jpg`; this is contextual photography, not an assertion that the subjects are Catapult employees or public-media clients.
- The official Catapult navy/gold logo comes from the workspace's approved 2026 asset, proportionally resized without redrawing.
- The donor journey is live, accessible HTML with lucide SVG line icons, short labels and thin gold rules, based on the inspected `is-the-phonathon-dead/what-works.png` graphic. It stacks into a vertical journey on mobile.
- The RNL transition landing page was inspected for structure; its university-specific claims, testimonials and results were not reused.

## Draft safeguards

- `noindex, nofollow`, including the Googlebot directive.
- Disallowed in robots.txt.
- Deliberately not added to navigation, footer links or sitemap.
- Existing `BareRoute` mechanism hides global navigation and renders the page's focused brand header/footer.
- No submission endpoint, lead-storage change or new integration.
- Noindex and unlisted are not access controls. Keep Vercel preview protection on for approval review.

## Verification

- `node scripts/test-public-media.cjs`
- `npm run build` (production build includes TypeScript verification)
- Browser QA at 1440, 900, 390 and 320 CSS pixels: HTTP 200, no horizontal overflow, all images decoded, no page errors, noindex present, both CTAs target the same 20-minute email request, minimum 44px CTA targets.
- Desktop and mobile full-page screenshots plus rendered-page PDF proof supplied separately.

The repository's `npm run lint` invokes `next lint` and prompts to configure ESLint because there is no existing configuration. It did not complete a lint analysis; no unrelated lint configuration was added for this draft.
