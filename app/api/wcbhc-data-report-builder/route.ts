import { isWcbhcDataAuthed } from "@/lib/wcbhc-data-auth";
import { getWcbhcRecords } from "@/lib/wcbhc-data-store";
import { getWcbhcTracking } from "@/lib/wcbhc-tracking";
import { reportRoute } from "@/lib/portal-v2/report-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Self-service report builder (field selection + filters). Shared logic in lib/portal-v2/report-route.ts.
export const { POST } = reportRoute("wcbhc", isWcbhcDataAuthed, getWcbhcRecords as never, getWcbhcTracking as never);
