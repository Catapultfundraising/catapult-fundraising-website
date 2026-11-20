import { isImasDataAuthed } from "@/lib/imas-data-auth";
import { getImasRecords } from "@/lib/imas-data-store";
import { getImasTracking } from "@/lib/imas-tracking";
import { buildBrandedXlsx } from "@/lib/imas-brand-xlsx";
import { reportRoute } from "@/lib/portal-v2/report-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Self-service report builder (field selection + filters). Shared logic in lib/portal-v2/report-route.ts.
export const { POST } = reportRoute("imas", isImasDataAuthed, getImasRecords as never, getImasTracking as never,
  { clientName: "International Museum of Art & Science", filePrefix: "IMAS", build: buildBrandedXlsx as never });
