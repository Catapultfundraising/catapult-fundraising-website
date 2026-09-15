import { StudyDashboard } from "@/components/study-dashboard";
import { getJagDashboardData } from "@/lib/jag-data";
import { STUDY_PORTALS } from "@/lib/study-portals";

export const metadata = {
  title: "JAG Nevada Interview Tracker | Catapult Fundraising",
  description:
    "JAG Nevada Donor Assessment Study — weekly interview and calling status, prepared by Catapult Fundraising.",
  robots: { index: false, follow: false },
};

// Re-rendered on every request so the quotes are freshly randomized each time
// someone loads the page, and so the latest data (synced from VanillaSoft, or
// saved by hand from /jag-admin) always shows without needing a redeploy.
export const dynamic = "force-dynamic";

export default async function JagDashboardPage() {
  const portal = STUDY_PORTALS.jag;
  const data = await getJagDashboardData(portal.dataPath);

  return (
    <StudyDashboard
      data={data}
      eyebrow={portal.eyebrow}
      title="Weekly Interview &amp; Calling Status"
      description={`Live tracker of prospect outreach, completed interviews, and donor signals for the JAG Nevada donor assessment study. Updated ${data.reportDate}.`}
      pdfPath={portal.pdfPath}
    />
  );
}
