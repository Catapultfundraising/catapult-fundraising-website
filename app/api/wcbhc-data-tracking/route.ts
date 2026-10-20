import { isWcbhcDataAuthed } from "@/lib/wcbhc-data-auth";
import { getWcbhcTracking, saveWcbhcTracking } from "@/lib/wcbhc-tracking";
import { trackingRoute } from "@/lib/tracking-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Committee updates + history notes (add / edit / delete). Shared logic in lib/tracking-route.ts.
export const { GET, POST } = trackingRoute("wcbhc", isWcbhcDataAuthed, getWcbhcTracking, saveWcbhcTracking);
