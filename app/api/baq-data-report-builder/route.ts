import { isBaqDataAuthed } from "@/lib/baq-data-auth";
import { getBaqRecords } from "@/lib/baq-data-store";
import { getBaqTracking } from "@/lib/baq-tracking";
import { reportRoute } from "@/lib/portal-v2/report-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Self-service report builder (field selection + filters). Shared logic in lib/portal-v2/report-route.ts.
export const { POST } = reportRoute("baq", isBaqDataAuthed, getBaqRecords as never, getBaqTracking as never);
