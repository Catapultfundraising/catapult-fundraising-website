import { redirect } from "next/navigation";
import { sampleAuthorized } from "@/lib/feasibility-sample-auth";
import { SAMPLE_PATH } from "@/lib/feasibility-sample";
import { FeasibilityFlipbook } from "@/components/feasibility-flipbook";
export const dynamic = "force-dynamic";
export default async function SamplePage() {
  if (!(await sampleAuthorized())) redirect(`${SAMPLE_PATH}/login`);
  return <FeasibilityFlipbook />;
}
