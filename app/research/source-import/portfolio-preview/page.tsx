import { notFound } from "next/navigation";
import { previewAvailable } from "@/lib/portal-v2/portfolio-preview";
import PortfolioPreview from "./PortfolioPreview";
export const dynamic = "force-dynamic";
export default function Page() {
  if (!previewAvailable()) notFound();
  return <PortfolioPreview />;
}
