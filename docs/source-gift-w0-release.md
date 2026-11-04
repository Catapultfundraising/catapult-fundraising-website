# W0 release notes: source-gift activation and one-way database-gift edit latch

Status: draft, default OFF. `GIFT_IMPORT_APPROVALS` and `GIFT_EDIT_DENY_LATCH` (backend `lib/giftActivation.ts`) are both EMPTY.
The website holds no policy; it only reads the backend's `databaseGiftEditsAvailable` value (anything except `true` = off).
Mock and synthetic tests do not prove any of the gates below.

## What W0 does
- A native gift source import, or `applyGiftCommit`, runs only for a client in `GIFT_IMPORT_APPROVALS`. Validation order:
  request validation → request lookup/replay → expiry/job → activation → override check → raw locks/writes.
  A committed same-body replay still returns its stored outcome after approval removal. Status lookups never read the lists.
- Database-key (snapshot) gift edit/void is refused before any SQL, DDL or transaction for any client in latch ∪ approvals.
  A malformed policy refuses database-key edits for every client. Edits/voids by positive id are never affected.
- A positive id plus a `key` property (any value, including null) is refused for every client, on both the website and the backend.
- A record must name a server-known client: an existing registry client, an approved prepared client with a `native_gift` table,
  or (for `applyGiftCommit`) an approved gift registration. Approval ids must match `^[A-Za-z0-9._-]{8,80}$`.

## Gates that block release (operator evidence, not timing)
1. **Before turning on gift-source import for a client:**
   - fence every old PORTAL writer deployment, so that no deployment without W0 can still accept a database-key edit/void;
   - provide reviewed SQL evidence that any portal transaction already in progress on `engage.portal_gift_overrides`
     (queued, retried or unknown-COMMIT) has drained or been aborted.
   Elapsed `maxDuration` or one empty query is NOT evidence. Incomplete evidence => refuse.
2. **Before any future un-latch (re-enabling database-key edits):**
   - first turn gift-source apply off;
   - fence every old IMPORT writer deployment;
   - provide reviewed SQL evidence that import transactions (queued, retried, unknown-COMMIT) have drained or been aborted;
   - then make a separate reviewed change to `GIFT_EDIT_DENY_LATCH`.
   Removing a client from `GIFT_IMPORT_APPROVALS` never re-enables edits. No code path re-enables them automatically.
3. Deploy order: backend first, then the website. A website without the backend projection hides database-gift edit
   controls (fail closed).
4. The owner must accept temporarily losing database-gift corrections for activated clients. Real SQL acceptance of W0 and
   populating the lists are separate approvals.
