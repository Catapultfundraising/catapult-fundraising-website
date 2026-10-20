import { isWcbhcDataAuthed } from "@/lib/wcbhc-data-auth";
import { getWcbhcRecords } from "@/lib/wcbhc-data-store";
import { recordsRoute } from "@/lib/portal-v2/records-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET ?id=<CPTID> -> one donor record; no id -> lookup index (incl. dashboard-added prospects).
export const { GET } = recordsRoute("wcbhc", isWcbhcDataAuthed, getWcbhcRecords as never);
