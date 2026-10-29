import { documentsRoute } from "@/lib/portal-v2/documents-route";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;
export const { GET, POST } = documentsRoute("baq");
