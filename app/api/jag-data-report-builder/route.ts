import { isJagDataAuthed } from "@/lib/jag-data-auth";
import { getJagRecords } from "@/lib/jag-data-store";
import { getJagTracking } from "@/lib/jag-tracking";
import { buildBrandedXlsx } from "@/lib/jag-brand-xlsx";
import { reportRoute } from "@/lib/portal-v2/report-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Self-service report builder (field selection + filters). Shared logic in lib/portal-v2/report-route.ts.
export const { POST } = reportRoute("jag", isJagDataAuthed, getJagRecords as never, getJagTracking as never,
  { clientName: "JAG Nevada (Jobs for Nevada's Graduates)", filePrefix: "JAG", build: buildBrandedXlsx as never });
