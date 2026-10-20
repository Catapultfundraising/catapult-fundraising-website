import { isPvasDataAuthed } from "@/lib/pvas-data-auth";
import { getPvasTracking, savePvasTracking } from "@/lib/pvas-tracking";
import { trackingRoute } from "@/lib/tracking-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Committee updates + history notes (add / edit / delete). Shared logic in lib/tracking-route.ts.
export const { GET, POST } = trackingRoute("pvas", isPvasDataAuthed, getPvasTracking, savePvasTracking);
