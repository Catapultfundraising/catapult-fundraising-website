# 2027 webinar series

- Route: `/webinars`; standard site header, `PageHero`, footer and contact CTA.
- Public copy, dates, presenters, learning objectives and
  registration URLs: `lib/webinar-series-2027.json`.
- Source: Anthony's approved public 2027 program roster. No private calendars,
  credentials, prices or recording promises are included.
- All twelve `registration_url` fields contain Anthony's approved, API-verified
  Zoom webinar registration links. Each renders a session-specific accessible
  external link. The page remains unpublished pending Anthony's website approval.
- The component continues to support `registration_url: null`: if a future
  registration is unavailable, it renders non-interactive “Registration opens
  soon” text, not a fake link or disabled anchor. This fallback is fixture-tested.
- Presenter roles, existing portrait URLs and real bio card IDs are shared in
  `lib/team-presenter-profiles.ts` with `/our-team`. Names and portraits link
  directly to the existing biographies with sticky-header scroll clearance.
- Each session has a simple “Learn more:” section linking to relevant existing
  service pages via `service_links`. Internal service tags and next-step prose
  remain omitted from both public entries and their JSON source.
- There are no standalone prospect research, AI/capacity-building or major gift
  service routes. June links to planned giving and capital campaign consulting;
  July and November link to capital campaign planning/research. These use real broader
  service pages and labels, not invented routes or contact-only substitutes.
- Month navigation uses identical 88px circles with flex shrink disabled.
- This does not reuse `lib/webinars.ts`, restore retired CGA registration, or add
  a global promo bar.

## Checks

```sh
npx tsx scripts/test-webinar-series-2027.tsx
node scripts/test-cga-webinar-retirement.cjs
npx tsc --noEmit
npm run build
```

The focused test covers all twelve dates, 36 objectives, Pacific/Central/Eastern
time conversion across DST, registration null/link states and discovery wiring.
The external link uses a fictional fixture URL only in the test.
