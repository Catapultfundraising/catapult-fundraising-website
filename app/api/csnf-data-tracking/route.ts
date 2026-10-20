import { isCsnfDataAuthed } from "@/lib/csnf-data-auth";
import { getCsnfTracking, saveCsnfTracking } from "@/lib/csnf-tracking";
import { trackingRoute } from "@/lib/tracking-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Committee updates + history notes (add / edit / delete). Shared logic in lib/tracking-route.ts.
export const { GET, POST } = trackingRoute("csnf", isCsnfDataAuthed, getCsnfTracking, saveCsnfTracking);
