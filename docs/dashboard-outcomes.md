# Dashboard record outcomes

Approved scope: one optional Outcome per record on JAG, CSNF, PVAS, WCBHC and BAQ. This is dashboard metadata, **not an Engage calling disposition**.

- Exact choices: Deceased, Not interested, Moved, Can’t afford, Committed elsewhere, Other.
- Unedited records start blank. Selecting the empty choice or **Clear outcome**, then **Save outcome**, saves a blank value.
- Other requires a short explanation, limited to 300 characters on both client and server. Other explanations are discarded when another choice is selected or the outcome is cleared.
- Staff attribution is required. Saving does not delete, merge, suppress or filter a donor.

## Ownership and persistence

`components/record-tools.tsx` owns the shared editor. Each `components/{client}-data-crm.tsx` mounts it once. The editor is keyed by component/client/CPTID; modals are keyed by client/CPTID, ignore stale fetch responses, and late saves cannot reload another record.

`lib/portal-v2/outcome.ts` owns the enum and validation. The authenticated, client-bound `setOutcome` operation in `server.ts` validates the record against that client's master index, portal-added prospects and campaign-only donors, rejecting deleted or merged targets until reloaded.

One atomic JSON value `{value,note}` is appended as `dashboard:outcome` in the existing Engage SQL `portal_updates` ledger via `applyBatch`. A clear is explicit JSON with empty value and note. The latest row wins. The old value is read from the server ledger, not trusted from the browser. No schema migration or Engage change is needed: the existing generic batch accepts the namespaced field. It inserts no gifts/prospects and calls no calling-disposition operation.

`record-overlay.ts` recognizes this as a dashboard-only overlay; `records-route.ts` applies it on each full-record read. This is separate from refreshed base snapshots, so a base refresh does not erase the value. No index visibility/filtering rules change. Existing merge behavior remains: merged source records redirect to the survivor; no outcome is automatically copied between identities. Concurrent staff edits use existing last-append-wins ledger semantics, not conflict detection.

## Safe tests

Never use preview saves for QA: preview SQL is production SQL.

```sh
node scripts/test-dashboard-outcomes.cjs
npx tsc --noEmit
npm run build
node scripts/test-prospect-documents.cjs
npx tsx lib/portal-v2/report-builder.test.ts
npx tsx lib/portal-v2/report-lists.test.ts
npx tsx lib/dashboard-help.test.ts
npx tsx scripts/test-study-dates.ts
```

The outcome regression runs real route/overlay code against an in-memory, client-separated gateway and fake stores. It covers all five routes, auth, invalid inputs, exact options, clear, 300-character limits, added/campaign-only records, reload/base refresh, all outcomes retaining index membership, unchanged calling history, and failed writes/reads. No real network calls are permitted.

Rendered shared-component QA uses temporary dependencies, not repository dependency changes:

```sh
npm install --prefix /tmp/outcome-qa --no-package-lock playwright esbuild
/tmp/outcome-qa/node_modules/.bin/playwright install chromium
OUTCOME_QA_MODULES=/tmp/outcome-qa/node_modules OUTCOME_CAPTURE_DIR=/tmp/outcome-captures node scripts/qa-dashboard-outcomes.cjs
```

Optionally set `OUTCOME_BASE_COMPONENT` to an exact base `record-tools.tsx` for a genuine before Contact panel. Captures are synthetic component fixtures with the site's CSS, not authenticated full dashboard screenshots. The browser test checks each client binding, blank/save/clear/Other, attribution, note cap, failed-save uncertainty, late-save isolation and duplicate-sibling absence. It uses a loopback-only server and mocked fetch; no production data or credentials.
