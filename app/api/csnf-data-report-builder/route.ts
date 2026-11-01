import { isCsnfDataAuthed } from "@/lib/csnf-data-auth";
import { getCsnfRecords } from "@/lib/csnf-data-store";
import { getCsnfTracking } from "@/lib/csnf-tracking";
import { buildBrandedXlsx } from "@/lib/csnf-brand-xlsx";
import { reportRoute } from "@/lib/portal-v2/report-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Self-service report builder (field selection + filters). Shared logic in lib/portal-v2/report-route.ts.
export const { POST } = reportRoute("csnf", isCsnfDataAuthed, getCsnfRecords as never, getCsnfTracking as never,
  { clientName: "College of Southern Nevada Foundation", filePrefix: "CSNF", build: buildBrandedXlsx as never });
