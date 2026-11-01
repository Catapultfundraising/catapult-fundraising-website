# Dashboard Help: source-to-topic map

The Help panel content is in `lib/dashboard-help.ts`; the UI is in `components/dashboard-help.tsx`. Each dashboard mounts it with `<DashboardHelp client="…" currentTab={tab} />`.

**When you change a dashboard,** update the matching topic and run `npx tsx lib/dashboard-help.test.ts`. The test fails when a dashboard's `TABS` list and `DASHBOARD_TABS` no longer match. Then run `scripts/qa-dashboard-help.ts`, the synthetic Playwright harness at `/dev/dashboard-help-harness`, which is dev-only.

Use synthetic examples only. Do not put passwords, internal systems or donor names in Help text.

| Topic | Verified against |
|---|---|
| Tab index (per client) | `components/{jag,csnf,pvas,wcbhc,baq}-data-dashboard.tsx`: `TABS` + `"Prospect Ratings"` and the `tab === …` panels |
| Getting started | Dashboard header ("Source data as of" / "Snapshot refreshed"); `components/portal-v2.tsx` (Client ID field); `report-fields.ts` capacity help |
| Donor Lookup / Open and edit a record | `Lookup` sub-text in each dashboard; `components/*-data-crm.tsx` (Escape closes the record in all five; Log a contact or visit); `components/record-tools.tsx` (`ContactSection`: Edit contact, old values kept, Monday refresh; `WealthSection`: Edited / From PIR / DonorSearch, Undo edit) |
| Overview, Gift Pyramid, Gift Chart + GC2P, Prospects, Board/Committee, Portfolio/Campaign Prospects, Givebutter/Campaign Gifts, Calling, Feasibility, Alumni, Database Health | The section components in each dashboard (`H` titles/subtitles, `Stat` click handlers, "Click to list the prospects" titles) |
| Reports, Build and download a report | `components/report-builder.tsx` (Choose fields, Add filter, MM/DD/YYYY, top-rows box, PDF/Excel); `lib/portal-v2/report-fields.ts` (field help, `PDF_MAX_ROWS`, `XLSX_MAX_ROWS`) |
| Saved report lists, Troubleshooting | `components/report-builder.tsx` (Shared saved lists, Save as new list, Update list, Rename, Delete list, Import, error messages); `lib/portal-v2/report-lists.ts` |
| Campaign Donors, Gifts versus pledges | `components/portal-v2.tsx` (`CampaignProgress`, `GiftForm`, `AllGifts` Edit/Void); `record-tools.tsx` `GiftsByYear` (grey amounts excluded); `report-fields.ts` (Lifetime excludes campaign pledges) |
| Add + Upload | `components/portal-v2.tsx` (`AddProspect` incl. automatic screening request, `UploadClientFile` Preview → Confirm and save, `DuplicatesPanel`, `AuditLog` undo); `lib/portal-v2/server.ts` (screening queued for new individuals with name + state) |
| Merge, delete and restore | `record-tools.tsx` (`MergeDeleteButtons`, `RecordBanners` Restore record, `DuplicatesPanel` merge and delete history) |
| PDF notes | `components/prospect-documents.tsx` (20 MB each, delete confirmation) |
| Prospect Ratings | `components/board-review/admin.tsx`, `staff-tab.tsx`, `app/api/board-review/staff/route.ts` (employee dashboard login). One review list per dashboard; separate from saved report lists. |

**Not covered on purpose (open requirements):**
- MG score filtering
- multiple Prospect Ratings lists
- what "unassigned" means in the PVAS cross-reference
