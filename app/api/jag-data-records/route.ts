import { isJagDataAuthed } from "@/lib/jag-data-auth";
import { getJagRecords } from "@/lib/jag-data-store";
import { recordsRoute } from "@/lib/portal-v2/records-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET ?id=<CPTID> -> one donor record; no id -> lookup index (incl. dashboard-added prospects).
export const { GET } = recordsRoute("jag", isJagDataAuthed, getJagRecords as never);
