import { isBaqDataAuthed } from "@/lib/baq-data-auth";
import { getBaqTracking, saveBaqTracking } from "@/lib/baq-tracking";
import { trackingRoute } from "@/lib/tracking-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Committee updates + history notes (add / edit / delete). Shared logic in lib/tracking-route.ts.
export const { GET, POST } = trackingRoute("baq", isBaqDataAuthed, getBaqTracking, saveBaqTracking);
