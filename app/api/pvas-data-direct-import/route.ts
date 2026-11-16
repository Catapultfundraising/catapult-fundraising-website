import { directFileGateway } from "@/lib/portal-v2/direct-file-gateway.server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 150;
export const POST = directFileGateway("pvas");
