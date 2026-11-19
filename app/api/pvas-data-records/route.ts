import { getPvasTracking } from "@/lib/pvas-tracking";
import { isPvasDataAuthed } from "@/lib/pvas-data-auth";
import { readPvasRecordsView, pvasBuildIdentity } from "@/lib/pvas-data-store";
import { recordsRoute } from "@/lib/portal-v2/records-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET ?id=<CPTID> -> one donor record; no id -> lookup index (incl. dashboard-added prospects).
export const { GET } = recordsRoute("pvas", isPvasDataAuthed, readPvasRecordsView as never, getPvasTracking, undefined, pvasBuildIdentity);
