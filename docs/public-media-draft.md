# Public media landing page: revised approval draft

Route: `/public-media`. **Do not merge or publish without Anthony's approval.**

## Current revision

Anthony requested standard site navigation, blue PageHero heading and full website-map footer; official station logos; the original PBS KVIE testimonial; a calendar-linked CTA; Catapult cultivation/asks in the journey; and a sourced visual comparison with Veritus Group.

The route remains noindex/nofollow and robots-disallowed, and is not added to navigation or sitemap. `BareRoute` does **not** hide standard site chrome on this page.

## Sources and claims

- Jeff Grandy's November 20, 2026 email, “public media outreach landing page,” supplies the theme, four offerings, training names, seven station names and hands-on engagement/handoff positioning.
- Anthony's explicit page revision clarifies that Catapult performs cultivation and asks within the engagement program, with qualified major-gift prospects coordinated with the station team. No implication that Catapult owns every client major-gift ask.
- Exact PBS KVIE quote is a contiguous excerpt from Colleen Schulman's April 5, 2023 “RE: Reference” email, forwarded by Anthony April 6, 2023 (“FW: Reference”). Existing website testimonial paraphrases are **not** used as literal quotations. The section explicitly labels the evidence “Legacy Call at PBS KVIE,” not mid-level program results.
- Comparison rows and citations were reviewed against the five Veritus primary service/learning pages on November 20, 2026. Data lives in `app/public-media/comparison.json`. Veritus coaching, training, management and donor-qualification services are acknowledged. The narrow standalone-research evidence gap is not stated as an absence of service.
- No invented testimonials, metrics, pricing, results or comparative outcome claims.

## CTA duration disclosure

The exact requested label “Schedule a 20-minute conversation.” opens Jeff's verified calendar URL from his signature. His live calendar currently offers 30/45/60-minute choices, not 20. A visible note at both CTAs discloses the available durations. Calendar configuration was not changed. Before outreach, a true 20-minute appointment type would remove that mismatch.

## Logo provenance

All original official marks, not fabricated text or recolored logos:

- Rocky Mountain Public Media: https://www.rmpm.org/assets/img/rmpm-logo-h.png (official rmpm.org header).
- WUCF: https://image.pbs.org/bento3-prod/wucf-bento-live-pbs/WUCF%202025/WUCF%20Logos/81b8093526_WUCF-Header-Logo.png (official wucf.org header).
- PBS KVIE: existing approved `public/clients/pbs-kvie.svg`.
- PBS SoCal: https://kcet.brightspotcdn.com/19/7a/14cab9d646178c92acb3ce057cd3/pbs-socal-logo-164.svg (official pbssocal.org header).
- Vegas PBS: https://image.pbs.org/bento3-prod/klvx-bento-live-pbs/vegas_pbs/logos/2020/6260846f8c_vegas-pbs-logo-200x45.png (official vegaspbs.org header).
- WLRN: https://npr-brightspot.s3.amazonaws.com/6a/df/d2313bd840e991cb307384d1dba7/wlrn-logo-white-pbs-npr.png (official wlrn.org header; white mark on navy backing).
- WPBS: https://www.wpbstv.org/wp-content/uploads/2025/01/wpbstv-logo.png (official header; same-origin canvas extraction at original 272×51 because direct HTTP download returns 403).

Original pixels/paths and aspect ratios preserved. Existing published real conversation photo is contextual, not represented as station donors or Catapult personnel.

## Verification and approval

- Focused source guards: `node scripts/test-public-media.cjs`.
- Production build: `npm run build` (includes default TypeScript verification).
- Real Chromium: desktop/mobile, images decoded, no horizontal overflow, correct calendar targets, duration notes, verified quote, five comparison rows, standard nav/footer and noindex.
- Refreshed proof screenshots and PDF accompany the approval handoff.
- Repository `npm run lint` prompts for initial ESLint configuration; no completed lint analysis is claimed.

Keep Vercel preview protection enabled. Unlisted/noindex is not access control. No merge, production publish, calendar settings, or backend integration changes are authorized by this draft.
