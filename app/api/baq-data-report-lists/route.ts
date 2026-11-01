import { isBaqDataAuthed } from "@/lib/baq-data-auth";
import { reportListsRoute } from "@/lib/portal-v2/report-lists";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Shared saved report lists (SQL via Engage), scoped to this client's login only.
export const { GET, POST, PATCH, DELETE } = reportListsRoute("baq", isBaqDataAuthed);
