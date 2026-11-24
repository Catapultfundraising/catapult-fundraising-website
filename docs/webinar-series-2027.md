# 2027 webinar series

- Route: `/webinars`; standard site header, `PageHero`, footer and contact CTA.
- Public copy, dates, presenters, learning objectives, service connections and
  registration URLs: `lib/webinar-series-2027.json`.
- Source: Anthony's approved public 2027 program roster. No private calendars,
  credentials, prices or recording promises are included.
- This is a **series preview**. All `registration_url` fields are `null`.
  The page renders non-interactive “Registration opens soon” text, not fake links
  or disabled anchors. Replace a field with the approved HTTPS registration URL
  when that session's registration exists; the component then renders a
  session-specific accessible external link.
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
