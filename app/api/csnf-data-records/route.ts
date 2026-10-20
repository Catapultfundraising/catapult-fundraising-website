import { isCsnfDataAuthed } from "@/lib/csnf-data-auth";
import { getCsnfRecords } from "@/lib/csnf-data-store";
import { recordsRoute } from "@/lib/portal-v2/records-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET ?id=<CPTID> -> one donor record; no id -> lookup index (incl. dashboard-added prospects).
export const { GET } = recordsRoute("csnf", isCsnfDataAuthed, getCsnfRecords as never);
