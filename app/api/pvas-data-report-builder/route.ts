import { isPvasDataAuthed } from "@/lib/pvas-data-auth";
import { getPvasRecords } from "@/lib/pvas-data-store";
import { getPvasTracking } from "@/lib/pvas-tracking";
import { reportRoute } from "@/lib/portal-v2/report-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Self-service report builder (field selection + filters). Shared logic in lib/portal-v2/report-route.ts.
export const { POST } = reportRoute("pvas", isPvasDataAuthed, getPvasRecords as never, getPvasTracking as never);
