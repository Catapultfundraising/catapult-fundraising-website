# November 16 client-services changes

## Access dashboard refresh

Automatic Monday Access/Azure base-data refresh is disabled for JAG, CSNF,
PVAS, WCBHC and BAQ. All five `/api/portal-data-refresh` Vercel schedules
are removed. Authenticated non-dry GET returns410 before any SQL builder or
Blob write, protecting against stale cron configuration.

Explicit authenticated `GET ?client=...&dry=1` diagnostics and manual POST
(including dry-run) remain available with their existing bearer authorization.
POST is not scheduled in this repository; use only after explicit operational
authorization. The separate VanillaSoft CSNF `/api/portal-sync` cron is unchanged.
No data refresh or external SQL/Blob write was performed for this change.

## Survey and gifts

The survey heading/browser title is Online Survey. Q1–Q9 are required only
on final submission; Q4 needs one selection. Comments/Q10 are optional.
Identified partial autosave and legacy receipt reads are retained, as are the
question definitions, v2 schema/version, export and collection-enable gates.
Survey Results is the final section of the CSNF study dashboard.
Monthly gift import has a label-only rename; campaign-only behavior/help stays.

## Solicitor rename/merge: deliberately deferred

The website has per-record assignment overlays, an observed client-scoped
solicitor inventory, and signed direct-upload alias context. The current
registration maps are empty; the protocol supports capabilities/resolve/
prepare/commit/receipt for file imports, not an audited rename/merge operation.
There is no durable staff-facing alias-mutation contract here.

A safe implementation requires an Engage-owned, client-scoped reviewed-mapping
transaction with inventory revision/conflict checks; preservation of primary/
secondary assignment precedence (including explicit clears) across native data,
tracking and SQL overlays; durable alias resolution for future uploads; audit,
idempotent receipt and rollback/conflict behavior. First-name inference is not
acceptable. No merge or guessed alias was implemented.
