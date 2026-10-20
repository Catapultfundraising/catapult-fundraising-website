import { isJagDataAuthed } from "@/lib/jag-data-auth";
import { getJagTracking, saveJagTracking } from "@/lib/jag-tracking";
import { trackingRoute } from "@/lib/tracking-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Committee updates + history notes (add / edit / delete). Shared logic in lib/tracking-route.ts.
export const { GET, POST } = trackingRoute("jag", isJagDataAuthed, getJagTracking, saveJagTracking);
