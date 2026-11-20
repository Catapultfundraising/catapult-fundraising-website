import { isImasDataAuthed } from "@/lib/imas-data-auth";
import { getImasTracking, saveImasTracking } from "@/lib/imas-tracking";
import { trackingRoute } from "@/lib/tracking-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Committee updates + history notes (add / edit / delete). Shared logic in lib/tracking-route.ts.
export const { GET, POST } = trackingRoute("imas", isImasDataAuthed, getImasTracking, saveImasTracking);
