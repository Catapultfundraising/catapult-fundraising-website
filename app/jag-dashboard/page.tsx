import { PageHero } from "@/components/page-hero";

export const metadata = {
  title: "JAG Nevada Interview Tracker | Catapult Fundraising",
  description:
    "JAG Nevada Donor Assessment Study — weekly interview and calling status, prepared by Catapult Fundraising.",
  robots: { index: false, follow: false },
};

export default function JagDashboardPage() {
  return (
    <>
      <PageHero
        eyebrow="JAG Nevada · Donor Assessment Study"
        title="Weekly Interview &amp; Calling Status"
        description="Live tracker of prospect outreach, completed interviews, and feedback trends for the JAG Nevada donor assessment study."
      />
      <section className="mx-auto max-w-7xl px-6 py-10 lg:px-10 lg:py-14">
        <div className="overflow-hidden rounded-2xl border border-black/10 shadow-sm">
          <iframe
            src="https://jag-nevada-tracker.vercel.app"
            title="JAG Nevada Interview Tracker"
            className="h-[2400px] w-full border-0"
            loading="lazy"
          />
        </div>
      </section>
    </>
  );
}
