# 2027 webinar series

- Route: `/webinars`; standard site header, `PageHero`, footer and contact CTA.
- Public copy, dates, presenters, learning objectives, service connections and
  registration URLs: `lib/webinar-series-2027.json`.
- Source: Anthony's approved public 2027 program roster. No private calendars,
  credentials, prices or recording promises are included.
- All twelve `registration_url` fields contain Anthony's approved, API-verified
  Zoom webinar registration links. Each renders a session-specific accessible
  external link. The page remains unpublished pending Anthony's website approval.
- The component continues to support `registration_url: null`: if a future
  registration is unavailable, it renders non-interactive “Registration opens
  soon” text, not a fake link or disabled anchor. This fallback is fixture-tested.
- There are no dedicated Prospect Research, Capacity Building, Major Gift
  Initiatives or Campaign Connect service routes today. Relevant sessions link
  to existing broader services or contact with clear labels rather than inventing
  URLs. The approved service names and next-step copy are preserved.
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
