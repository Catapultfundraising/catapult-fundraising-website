# Effective campaign ask display

The five employee data dashboards use `lib/portal-v2/effective-ask.ts` for read-time campaign asks. Never rewrite weekly snapshot/base asks to imitate a dashboard edit.

Precedence:
1. Latest saved `portal_updates.field = ask` on the surviving CPTID (including zero or an intentional blank).
2. A nonzero campaign ask on the survivor's base portfolio (or an active campaign-ask board row for JAG/CSNF/PVAS).
3. An unambiguous ask inherited through the complete merge chain. Each source's saved edit supersedes its own base. Conflicting source asks are flagged, never summed or arbitrarily chosen. An explicit survivor ask resolves the conflict.

A missing/zero base ask is eligible for merge fallback; an explicit saved zero/blank is not. Source portfolio metadata is inherited only when no survivor portfolio exists and source portfolios are unambiguous. Contact/wealth/outcome overlays and historical giving are independent.

Consumers:
- `records-route.ts`: effective `campaignAsk`, portfolio and active campaign-ask board rows.
- `server.ts` getAsk: same merge-aware resolver and audit provenance; setAsk rejects merged/deleted stale CPTIDs.
- `components/portal-v2.tsx`: overlays snapshot pool/portfolio/campaign board rows using the existing authenticated portal state; successful edits reload the record and shared state.
- All five GC2P engines and report routes: saved asks (including zero/blank), with explicit committee `tracking.level` pins still winning. JAG/CSNF unedited capacity rules and WCBHC unedited curated seats remain unchanged.

Do not overlay Stewardship/committed ask fields: those are commitment amounts. BAQ/WCBHC board ask fields are pledges, so those rows are not campaign-ask targets either. No gift, pledge, cash or lifetime total is changed by this feature.

Regression command: `node scripts/test-effective-campaign-ask.cjs` (mocked stores/gateway, synthetic fixtures only). Also run `node scripts/test-dashboard-outcomes.cjs`, `npx tsc --noEmit`, and `npm run build`.
