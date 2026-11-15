# Direct portfolio / notes: first working preview

**Simulation only. No SQL save, durable import or dashboard publication.**

Authority: Anthony Teams1794764206627 / proposal1794764020883 (2026-11-15). Branch starts at website PR141 `1999b0889d8b858805bd21fdcd9d07c10d4b79f2`, paired backend PR92 `083b7a9c61773ec75cb799a456945be7b51c99fa`. These remain MOCK-PAIRED / DISABLED-LOCAL. This delta does not activate either.

## Try it

On a feature preview, sign into existing employee `/research` access, then open `/research/source-import/portfolio-preview`. Download the synthetic CSV or XLSX; supply a source-as-of date and staff attribution; upload. For XLSX, explicitly select `Capital_Campaign_Portfolio` and header row `7`, then read the selected sheet. Review the suggested business-field mapping; preview; simulate. Preview the file again to see note deduplication. Download mapping metadata, review/exceptions and the explicitly simulated receipt.

Local: `npm install`, then run with locally invented `RESEARCH_PASSWORD`, `RESEARCH_AUTH_SECRET` and `npm run dev`. Do not copy production credentials into the worker. Production page and API both refuse. Feature Vercel previews are allowed by `VERCEL_ENV=preview`; the simulation adapter has no external transport imports or calls.

## What is reused / what is deliberately not enabled

- Nested in the existing `/research/source-import` surface, with the existing research authentication and same-origin API boundary.
- Existing strict `csv-parse`, `source-keys` exact text key rules and `source-mapping-profile` metadata/hash/context checks. Profiles are simulation-context-specific and cannot authorize SQL fields or bypass current live registry checks.
- The new planner is a pure business-field **simulation adapter**, not a replacement source loader or live apply path. No new SQL mapping, approval list, transport flag or field authority is enabled.
- Original bytes are read via `arrayBuffer`, base64-transferred, SHA-256 hashed before fatal UTF-8 decoding; no text re-encoding masquerades as original-byte identity. Private durable staging is NOT implemented here. Files are computed on the preview server and discarded; synthetic rows/state stay in the browser tab.
- XLSX uses the already-installed SheetJS owner with explicit sheet/header-row selection. The original XLSX byte digest, format, exact sheet and header row are all bound independently; a normalized CSV digest is never substituted. Profiles are parse-context-bound too.
- Preview binds actual file bytes, filename, scope, mapping, source date, actor and entire current fictional state. Simulation recomputes the full plan. This integrity binding is **not a signed server approval**, and client-held state is not authoritative audit or concurrency proof.
- Notes append with dated/source/actor attribution, distinct from scalar asks and portfolios. Identity/date/source/content fingerprint prevents repeated note appends, including renamed uploads; different same-day notes survive. Existing manual note remains verbatim.
- Exact text Client_ID crosswalk; leading zeros preserved. Unknown, ambiguous, supplied-internal-ID contradictions and contradictory repeated scalar values held. CPTID is verification only, never identity fallback. Manual asks and portfolio values held. Blank means no change; explicit zero is not blank.
- Five selectable clients share fictional fixtures only. This is all-five shared-flow regression, **not** evidence that their different live schemas or crosswalks have been approved.

## Format boundaries

CSV UTF-8, header row 1, or XLSX with explicit worksheet/header row 1–100; <=2 MB / 500 data rows. XLS/XLSM are not supported. XLSX ZIPs have bounded actual expansion (8 MB per entry /24 MB total), exact local/central size/CRC agreement, entry limits, and refusal of descriptors, EOCD comments, ZIP64, encryption, macros, external links and embedded/ActiveX payloads. These restrictions deliberately reject some otherwise-valid workbooks. This is a preview bound, not a complete spreadsheet-security certification; the existing SheetJS dependency and all production parsing assumptions still require security review before live release.

The synthetic XLSX has the real portfolio's 47 header names on row 7, an instructions sheet, an alternate sheet for binding tests, and invented rows only. Its CPTIDs (900001/900002) and ask (1500.25) are ordinary numeric Excel cells. Their exact original OOXML numeric lexemes are read with the maintained namespace-aware `saxes` dependency, after the existing protected ZIP preflight. Bounded decimal/scientific expansion uses string arithmetic, not SheetJS's converted JS numbers. Asks must be nonnegative, at most 10 integer digits and two exact decimal places; excess precision is held, never rounded. CPTIDs must be exact positive SQL integers. Formula status comes from original XML; formula headers refuse, formula identity rows and mapped formula cells hold, and cached results are ignored. No formula is executed.

All XML parts refuse DTD/entity declarations, processing instructions, malformed UTF-8/XML, and excess nesting/attributes/nodes. Workbook/worksheet namespaces, internal relationships, normalized part paths and unique sheet/relationship/cell references are checked before SheetJS decodes ordinary text. External workbook relationships and traversal are refused. This bounded preview deliberately rejects unsupported OOXML, rather than claiming complete workbook compatibility.

Client_ID is exact text by default. Numeric client IDs require an explicit **declared integer source format** and a separately approved crosswalk; the demo exposes distinct fictional integer IDs 101/102, not an alias of text IDs 0001/0002. Number formatting never authorizes leading-zero inference. The format declaration is bound alongside original bytes, sheet and header row, and invalidates prior approval/profiles if changed. Numeric notes/solicitors and other unsupported cell types remain held. Dates are neither inferred from serials nor fabricated. Numeric support resolves the former blanket numeric-cell adapter gap, but does not certify or import the actual Jeff workbook, approve its mappings/crosswalk or satisfy live SQL gates.

New Notes is the append target. Historical Notes, tasks, previous asks and cumulative FY totals are ignored by default. Primary (`portfolio`) and secondary (`secondarySolicitor`) are independent targets with independent manual protection; neither is silently substituted for the other. Transaction gifts and nonadditive summary snapshots remain visibly distinct future modes.

## Design / content structure

Existing Catapult app shell and navy/brass/paper tokens retained; no redesign. Workflow order: scope/file → mapping → before/after review → explicitly simulated receipt → fictional current records. Calm, evidence-first app surface. The prominent persistent simulation banner is the signature safety element. Existing source-import's workflow and current dashboard record display are the visual/interaction anchors; we borrow density and form alignment, not a new visual identity.

## Next actual-import milestone — still gated

Keep the approved future authority transition field/client/template-specific: manual > approved designated direct file > Access fallback. Nothing here makes that globally active. Existing general multipart applyBatch is not a shortcut.

After review, connect approved business targets to the **existing** saved-profile, private staging/job, server-bound preview and guarded durable audit paths. Notes need append-only storage/deduplication distinct from scalar per-field provenance. Verify each client's actual crosswalk and schema independently (PVAS contacts/raw, distinct JAG/CSNF, curated WCBHC/BAQ); do not infer a universal MASTER mapping or donor identity from a name/CPTID collision.

Required before real apply: reviewed source provenance, exact signed server approval/expiry, durable immutable staging/audit/status, locked manual ownership checks and concurrent-edit safety, idempotent atomic SQL, conditional undo preserving later edits, interruption reconciliation, all-five schema coverage and real hosted publication failure recovery. Existing actualSQL/hosted/source/owner-tradeoff/writer-fence/drain/release gates remain outstanding. No old temporary routes rearmed; no grants, firewall, secret, resource, real SQL/data or production changes.

Monthly gifts are next, with stable transaction identity, reconciled currency/count totals and explicit refund/correction policy. Cumulative giving must never be synthesized into gift transactions.
