import { StudyDashboard } from "@/components/study-dashboard";
import { getJagDashboardData } from "@/lib/jag-data";
import { STUDY_PORTALS } from "@/lib/study-portals";

export const metadata = {
  title: "CSNF Interview Tracker | Catapult Fundraising",
  description:
    "CSNF Feasibility Study — weekly interview and calling status, prepared by Catapult Fundraising.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function CsnfDashboardPage() {
  const portal = STUDY_PORTALS.csnf;
  const data = await getJagDashboardData(portal.dataPath);
  const started = data.stats.totalProspects > 0;

  return (
    <StudyDashboard
      data={data}
      eyebrow={portal.eyebrow}
      title="Weekly Interview &amp; Calling Status"
      description={
        started
          ? `Live tracker of prospect outreach, completed interviews, and donor signals for the CSNF feasibility study. Updated ${data.reportDate}.`
          : "Live tracker of prospect outreach, completed interviews, and donor signals for the CSNF feasibility study. Figures appear here automatically once calling begins."
      }
      pdfPath={started ? portal.pdfPath : undefined}
    />
  );
}
