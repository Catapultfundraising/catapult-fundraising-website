import { liveBuildIdentity } from "@/lib/client-live-data.server";
import { getImasTracking } from "@/lib/imas-tracking";
import { isImasDataAuthed } from "@/lib/imas-data-auth";
import { getImasRecords } from "@/lib/imas-data-store";
import { recordsRoute } from "@/lib/portal-v2/records-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET ?id=<CPTID> -> one donor record; no id -> lookup index (incl. dashboard-added prospects).
export const { GET } = recordsRoute("imas", isImasDataAuthed, getImasRecords as never, getImasTracking, undefined, (generation) => liveBuildIdentity("imas", generation));
