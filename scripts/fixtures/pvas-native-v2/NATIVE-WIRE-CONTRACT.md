# PVAS native financial wire v2 — manual-retirement revision, HELD

2026-11-17. **No capability issuer, public route binding, native write executor,
receipt protocol, compiler v2, DDL execution or activation exists in this step.**
Existing event-v1/API authentication/pools remain unchanged while off.
Do not enable mixed-schema operation from this document.

## Owner / source selection

- Existing `pvas.giving_history_overview` and `pvas.calendar_year_giving` remain
  sole owners of original aggregate presentations. Website
  `lib/portal-refresh/pvas.ts:buildCanonicalPvas` must restore their fixed reads
  and remove synthetic received-event aggregate overrides. Never sum old
  aggregates with individual/history/campaign/provider amounts.
- Individual native/admitted records are typed columns in `pvas.gifts`.
  `pvas.gift_source_links` supplies exact immutable aliases. No Engage read or
  archived JSON fallback. Provider tables retain their original activity role.
- `native-history` → historical detail; `native-campaign` → old campaign feed.
  `admitted-event` → only the existing scope-specific surfaces (`historical`
  detail or `campaign` feed), with strict event fields, never a native-default
  status. No cross-class matching, deduplication or cash arithmetic.

## Capability / routing boundary

`readNativeGiftPageV2(run, request, assertCapability?)` is a pool-free internal
owner function. The default trusted callback throws `native-runtime-unwired`
before SQL. No issuer is provided. A future trusted server callback—not request
data—must verify current reviewed compiler/schema fingerprint, full source/order
closure and paired acceptance in the same read context before allowing SQL.
Its caller must provide one consistent read transaction for all three queries.
The callback receives the complete exact `PVAS_NATIVE_GIFT_SCHEMA_V2` contract,
not just numeric2. It binds fresh007 source and ordered schema-descriptor hashes,
revision and snapshot/lifecycle versions. Source hashes are necessary but are
NOT live catalog acceptance; see `NATIVE-SCHEMA-V2.md`.

`requireGiftWireVersion(requested, schemaVersion)` permits only2/2. Under the
native-v2 capability, routing to any event-v1 SQL reader/totals/decoder must HOLD,
not return an incomplete event subset. Existing v1 functions themselves remain
unchanged and are **not mixed-schema safe**; this routing is still a mandatory
integration/acceptance gate, not a claim implemented in current public routes.
No native DDL may be activated until that gate is implemented and proved.

## Read request / response

Reserved future transport envelope, **not currently a registered public op**:

```json
{"op":"nativeGiftPageV2","client":"pvas","request":{"v":2,"lane":"campaign","view":"current","after":null,"limit":100}}
```

Exact outer keys:op,client,request. Internal request exact keys:v,lane,view,after,limit.
v must be2; lane is `history|campaign`; limit integer1..500; after null or a
canonical nonnegative BIGINT decimal **string**. No SQL/identifier/requestId.
view is `current|provenance`. Current campaign excludes only retired native
manual memberships; provenance retains their full typed records. Neither view
filters native-history's original statuses. Unknown/missing view HOLDs.

Implemented internal success object exact keys:v,lane,view,records,next,done:

```json
{"v":2,"lane":"campaign","view":"current","records":[],"next":null,"done":true}
```

Each record has giftId,cptid,version as positive int32; order as exact nonnegative
BIGINT string; sources as unique `{system,key}` immutable links. These are
internal gift IDs, not original source BIGINT values.

### Native campaign record

Exact root keys:giftId,cptid,version,order,sources,representation,source,native,membership,legacy.
source is `{system:"website_db"|"portal_gifts",key:<exact original alias/ID>}`.
`native` and `legacy` preserve the same exact old row properties/types/presence.
membership is exact `{state:"active"|"retired",retiredByRequestId:string|null}`.
Active requires null cause; retired requires a32lowerhex actual new canonical
root undo request and source.system=portal_gifts. Website aliases cannot retire.

```json
{"giftId":902,"cptid":9,"version":1,"order":"0","sources":[{"system":"website_db","key":"db|Stewardship|9|pledge|"}],"representation":"native-campaign","source":{"system":"website_db","key":"db|Stewardship|9|pledge|"},"native":{"id":-1,"cptid":9,"donor_name":"Fictional","kind":"pledge","amount":0.3,"gift_date":null,"key":"db|Stewardship|9|pledge|","note":"Original memo"},"membership":{"state":"active","retiredByRequestId":null},"legacy":{"id":-1,"cptid":9,"donor_name":"Fictional","kind":"pledge","amount":0.3,"gift_date":null,"key":"db|Stewardship|9|pledge|","note":"Original memo"}}
```

Required native/legacy keys:id,cptid,donor_name,kind,amount,gift_date.
Allowed optional keys:client_id,note,source,batch_id,created_by,created_at,key,
status,corrected. Unknown properties HOLD, never drop silently.
- id is exact safe integer Number for legacy synthetic IDs or an exact original
  manual source-ID string; manual IDs beyond safe Number remain strings.
- amount is finite native FLOAT/Number; no decimal/string/received conversion.
- gift_date is original text|null, not newly parsed chronology.
- Optional string fields retain absence/null/blank separately; status is not
  manufactured. Optional corrected is exact `{by:string,at:string,from:number}`,
  preserving original already-applied correction provenance.
- Website may extract legacy rows for the old feed, but must keep giftId/version/
  source metadata separately for correction targeting. Never regenerate keys
  or apply saved overrides again.

### Native history record

Exact root keys:giftId,cptid,version,order,sources,representation,source,native,legacy.
No membership property. source.system=`client_gift_history`;
source.key is exact original positive BIGINT decimal string. native exact keys:
amount,date,year,status,campaign,fund,type,recordType,note,loadedAt.
amount is signed fixed-two-decimal **string** (including zero); status is original
string|null; date ISO DATE|null; year independent original int32|null. No date
from year, status mapping, currency/credit defaults or negative-amount cash policy.
loadedAt is SQL DATETIME2 projected as full seven fractional digits, no `Z`:
`2026-10-23T12:00:00.1234567`. Do not round it through JavaScript Date.

legacy exact keys:id,cptid,date,amount,status,campaign,fund,type,year,note,record_type.
id=source.key, amount remains a decimal string. This is a versioned historical
detail adapter, not admission to `PvasGiftValue`.

### Admitted event record

Exact root keys:giftId,cptid,version,order,sources,representation,event,voidReason.
representation=`admitted-event`; no native/source/legacy property.
event exact unchanged strict PvasGiftValue keys:amount,currency,date,year,kind,
status,scope,credit,campaign,fund,type,note,donorName. Amount is positive decimal
string; existing event status/void checks unchanged. No Number conversion here.
This is a typed source page, not an active-only presentation query: existing
admitted-event void/status presentation filters still apply at their original
consumer. Advance the page cursor even if such filtering hides the whole page.
Never apply received/void filters to native-history's original status strings,
and never treat absent native-campaign status as an admitted received event.

## Stable ordering and pagination — compiler prerequisite

Fresh007 requires presentation_order BIGINT NOT NULL and computed presentation_lane
with unique index on `(presentation_lane,presentation_order)`. Held006 remains
an unchanged structural-only draft, not the v2 compiler source.
- Initial native campaign ordinals MUST be exact composed old array ordinals
  **0..42** from the proved17+26 feed, before ID allocation. Do not sort by alias,
  donor, date, amount, internal gift ID or class.
- History order must be explicitly bound by the producer to reviewed original
  source ordering, without unsafe numeric source-ID conversion.
- Any future admitted inserts must reserve unique next scope-lane order under
  the same locked transaction; allocator integration remains unfinished.
- Every admitted row needs a reviewed order too. Fresh CREATE has no representation
  default, nullable order or v1 insert compatibility. Defensive NULL-order
  preflight still fails closed; no v1 writer may run against activated v2 schema.
- SQL predicates and ORDER BY use raw qualified `g.presentation_order`, not its
  varchar projection. Source links are fetched for the same exact page IDs.
  Missing/foreign/duplicate aliases or nonincreasing orders HOLD.
next is last order iff page is full; caller must continue until done=true,
including the possible final empty page. No cache/polling added by this owner.

## Native campaign amount/note correction — PLAN ONLY

Reserved future envelope (not registered; no successful write response exists):

```json
{"op":"nativeCampaignCorrectionV2","client":"pvas","command":{"requestId":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","cptid":9,"target":{"giftId":902,"expectedVersion":1,"source":{"system":"website_db","key":"db|Stewardship|9|pledge|"}},"patch":{"amount":25.555,"note":"Updated memo"}}}
```

Exact transport keys:op,client,command. Public command exact keys:requestId,
cptid,target,patch. Existing authenticated server injects actor, never accepts a
client-controlled actor. Internal validator additionally requires actor.
target exact keys:giftId,expectedVersion,source; source exact keys:system,key
(only website_db|portal_gifts). patch is nonempty and has only amount and/or note.
No create/void/reattribution/kind/date/status/history-edit operation is added.

amount is a finite positive native Number; normalization uses the unchanged old
correction formula Math.round(amount*100)/100. Actual pre-round validated command
is payload-hashed. note is explicit string|null, max1,000,000 UTF16 units with
existing safe newline/tab controls. For manual portal_gifts blank maps to null
as old manual edit did; website_db blank remains blank. Null explicitly clears
native note; no old overlay fallback. All other native fields, class, source
aliases, presence of status and original corrected provenance remain unchanged.
New correction actor/version/before-after belongs in canonical audit/history;
original legacy corrected metadata remains original provenance, not relabelled.
Only active native campaign records may be corrected; retired membership HOLDs.

`planNativeCampaignCorrectionV2(command, strictDecodedLockedCurrent)` returns
exact keys:held,executable,accepted,v,operation,command,payloadHash,changed,before,
after,parameters,hooksRequired. held=true/executable=false/accepted=false.
There is intentionally **no receipt**. Changed values increment version, preserve
order/aliases, and produce fixed SQL update/audit/history parameters. Update
guards class, source link, optimistic version and expected amount/note/mask.

Executor integration still required: existing auth + trusted capability, one
SERIALIZABLE transaction, original request lookup and actual-payload replay check,
locked source/current read, reviewed v2 receipt schema and existing request
reservation, exactly-one guarded UPDATE, strict SQL readback, append audit/history
using `{v:2,gift:<full record>}`, finalize receipt, COMMIT. Do not reuse event-v1
receipt/history decoder for this shape. No-op handling and receipt reconciliation
must be finalized with that owner; no automatic retry after uncertain commit.

## Internal manual creation-membership retirement — PLAN ONLY

Not a public operation or redo/restore API. The complete verified legacy batch
owner may call `planNativeCampaignRetirementV2(command, strictDecodedCurrent,
sourceBinding)`. Exact command keys:v,requestId,cptid,actor,target,cause.
target exact keys:giftId,expectedVersion,source; source must be exact portal_gifts
identity. cause exact keys:kind,batchRef,rootRequestId,indexDigest,undoRevision.
kind=`legacy-batch-undo`; batchRef exact `{kind:"legacy-engage",id:<positive
BIGINT string>}`. Child requestId and truthful new rootRequestId are distinct
32lowerhex IDs. Digests are64lowerhex. No caller-supplied inverses or status.

Source binding comes ONLY from the separately verified full489-entry index:
indexDigest,undoRevision,originalGiftWire,originalGiftWireSha256,
originalBatchWire,originalBatchWireSha256,rootOperation.
It must bind exact original SQL UTF16 wire, raw active manual occurrence and
not-originally-undone header, exact client+BIGINT row/batch IDs and CPTID.
rootOperation=`legacy-batch-undo-v2`. This child checks those raw facts and
current immutable source/native batch metadata; it does not verify/approve the
complete index, P(R) projector or root operation's actual persisted ledger.
Those remain trusted enclosing-owner hooks and activation blockers.

Output is held/executablefalse/acceptedfalse, operation=nativeCampaignRetire,
command,payloadHash,before,after,parameters,claimDependency,hooksRequired.
After changes only membership active→retired and version+1. Original native
amount/note/in-place corrections/status absence/aliases/order are unchanged.
No native-history/website alias target; no originally voided original or
already-retired membership; no public reactivation. Current campaign hides it;
provenance/history retains it. It is NOT an old staff-void audit entry.

The root owner claims exactly one namespaced batch in
pvas.legacy_batch_retirements, including metadata-only success. Child plans
depend on that same root claim and use distinct truthful new child requests.
Original18 undone headers do not become fabricated claims. The baseline has
43 active native campaign rows;4 originally voided manual rows stay raw archives,
not restoration candidates. Full contributor-chain retirement for prospects/
updates is separate; undoA whileB wins then undoB must skipA. Neither batch undo
nor this child reverses original overrides or in-place corrections.

## Not accepted / remaining

This contract allows website preparation, not activation. Needs coordinated
v2 schema fingerprint/compiler/producer proof, native-aware route/version
selection and history decoding, canonical order allocation, correction executor/
retirement root/child receipt/status/undo parity, website aggregate-read restoration, actual SQL-engine
validation and paired frozen acceptance. No new raw import, Access/PIR/provider
matching or runtime-owned Engage donor tables.
