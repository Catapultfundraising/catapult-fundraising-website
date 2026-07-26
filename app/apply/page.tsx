import type { Metadata } from "next";
import { PageHero } from "@/components/page-hero";
import { JobApplicationForm } from "@/components/job-application-form";
import { Phone, Mail } from "lucide-react";
import { FIRM_PHONE, FIRM_PHONE_HREF, FIRM_EMAIL } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Apply for a Job",
  description:
    "Join the Catapult Fundraising team. Submit your application and resume for open roles in capital campaign counsel, donor engagement, and client services.",
  alternates: { canonical: "/apply" },
};

export default function ApplyPage() {
  return (
    <>
      <PageHero
        eyebrow="Careers"
        title="Join the team behind the ask."
        description="Catapult is built on people who believe a well-run campaign can change what a community thinks is possible. Tell us about yourself below."
      />

      <section className="mx-auto max-w-5xl px-6 py-14 lg:px-10 lg:py-16">
        <div className="grid gap-12 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <h2 className="font-display text-3xl text-[rgb(var(--navy))]">
              Why work at Catapult
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">
              We're a full-service fundraising consulting firm, which means our
              team gets exposure to every phase of a campaign, from feasibility
              study through public-phase calling, not just one narrow slice of
              the work.
            </p>
            <ul className="mt-6 space-y-4 text-base leading-relaxed text-[rgb(var(--ink))]/70">
              <li className="flex gap-3">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[rgb(var(--brass))]" />
                Direct mentorship from consultants with decades of nonprofit
                and capital campaign experience.
              </li>
              <li className="flex gap-3">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[rgb(var(--brass))]" />
                Real client-facing responsibility early, not years of
                back-office work before you touch a campaign.
              </li>
              <li className="flex gap-3">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[rgb(var(--brass))]" />
                A firm that measures success the way donors do: by trust
                built, not just dollars closed.
              </li>
            </ul>

            <div className="mt-10 space-y-3 rounded-2xl border border-[rgb(var(--line))] bg-white p-6">
              <p className="text-sm font-semibold uppercase tracking-wider text-[rgb(var(--brass))]">
                Questions about a role?
              </p>
              <p className="flex items-center gap-2 text-sm text-[rgb(var(--ink))]/70">
                <Phone className="h-4 w-4 text-[rgb(var(--brass))]" />
                <a href={`tel:${FIRM_PHONE_HREF}`} className="hover:text-[rgb(var(--navy))]">
                  {FIRM_PHONE}
                </a>
              </p>
              <p className="flex items-center gap-2 text-sm text-[rgb(var(--ink))]/70">
                <Mail className="h-4 w-4 text-[rgb(var(--brass))]" />
                <a href={`mailto:${FIRM_EMAIL}`} className="hover:text-[rgb(var(--navy))]">
                  {FIRM_EMAIL}
                </a>
              </p>
            </div>
          </div>

          <div className="lg:col-span-3">
            <JobApplicationForm />
          </div>
        </div>
      </section>
    </>
  );
}
