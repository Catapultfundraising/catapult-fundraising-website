import { portalV2Route } from "@/lib/portal-v2/server";

// Portal v2 (add prospect, client-file upload, campaign gifts/pledges). Client is fixed by the route.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;
export const { GET, POST } = portalV2Route("pvas");
