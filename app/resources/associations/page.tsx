import { PageHero } from "@/components/page-hero";

export const metadata = {
  title: "Nonprofit Association Resources | Catapult Fundraising",
  description:
    "A working reference list of professional fundraising and nonprofit-sector associations, certifications, and publications.",
  robots: { index: false, follow: false },
};

interface AssociationLink {
  name: string;
  url: string;
  description: string;
}

interface AssociationGroup {
  heading: string;
  items: AssociationLink[];
}

const GROUPS: AssociationGroup[] = [
  {
    heading: "Professional Fundraising Associations & Certification",
    items: [
      {
        name: "Association of Fundraising Professionals (AFP Global)",
        url: "https://afpglobal.org/",
        description:
          "The largest professional association for individual fundraisers, offering education, the Code of Ethical Standards, and a global chapter network.",
      },
      {
        name: "AFP Las Vegas Chapter",
        url: "https://afplasvegas.org/",
        description:
          "Local Nevada chapter of AFP, established 1991. Monthly programs, CFRE prep courses, and networking for Southern Nevada fundraising professionals.",
      },
      {
        name: "Association for Healthcare Philanthropy (AHP)",
        url: "https://www.ahp.org/",
        description:
          "The professional association for healthcare philanthropy, serving hospital foundations and grateful-patient fundraising programs.",
      },
      {
        name: "CASE — Council for Advancement and Support of Education",
        url: "https://www.case.org/",
        description:
          "Global association for advancement professionals at educational institutions, covering fundraising, alumni relations, and communications.",
      },
      {
        name: "National Association of Charitable Gift Planners (CGP)",
        url: "https://charitablegiftplanners.org/",
        description:
          "Formerly the Partnership for Philanthropic Planning. Education, research, and advocacy for planned and legacy giving professionals.",
      },
      {
        name: "Grant Professionals Association (GPA)",
        url: "https://grantprofessionals.org/",
        description:
          "International membership organization for grant researchers, writers, and managers, including GrantSchool training and local chapters.",
      },
      {
        name: "CFRE International",
        url: "https://www.cfre.org/",
        description:
          "Administers the Certified Fund Raising Executive (CFRE) credential, the globally recognized ethical and professional standard in fundraising.",
      },
    ],
  },
  {
    heading: "Sector & Advocacy Organizations",
    items: [
      {
        name: "National Council of Nonprofits",
        url: "https://www.councilofnonprofits.org/",
        description:
          "The largest network of nonprofits in North America, providing policy advocacy and nonprofit management resources.",
      },
      {
        name: "Independent Sector",
        url: "https://independentsector.org/",
        description:
          "National membership organization advocating for a strong, trusted charitable and philanthropic sector.",
      },
      {
        name: "Giving USA Foundation",
        url: "https://givingusa.org/",
        description:
          "Publisher of the annual Giving USA report, the longest-running and most comprehensive study of American philanthropy.",
      },
    ],
  },
  {
    heading: "Philanthropy News & Research",
    items: [
      {
        name: "The Chronicle of Philanthropy",
        url: "https://www.philanthropy.com/",
        description:
          "Leading news source covering nonprofit leadership, fundraising trends, and the philanthropic sector.",
      },
      {
        name: "Nonprofit Quarterly",
        url: "https://nonprofitquarterly.org/",
        description:
          "Independent nonprofit media outlet covering nonprofit management, equity, and civil society issues.",
      },
    ],
  },
];

export default function AssociationsResourcesPage() {
  return (
    <>
      <PageHero
        eyebrow="Internal Reference"
        title="Nonprofit Association Resources"
        description="A working reference list of professional fundraising associations, certifications, and publications, for internal use and client conversations."
      />
      <section className="py-16 md:py-20">
        <div className="mx-auto max-w-4xl px-6">
          {GROUPS.map((group) => (
            <div key={group.heading} className="mb-14 last:mb-0">
              <h2 className="font-display mb-6 text-2xl font-semibold text-[rgb(var(--navy))] md:text-3xl">
                {group.heading}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {group.items.map((item) => (
                  <a
                    key={item.url}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group rounded-md border border-[rgb(var(--line))] bg-white/60 p-5 transition-colors hover:border-[rgb(var(--brass))] hover:bg-white"
                  >
                    <h3 className="font-display text-lg font-medium text-[rgb(var(--navy))] group-hover:text-[rgb(var(--brass))]">
                      {item.name}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-[rgb(var(--ink))]/80">
                      {item.description}
                    </p>
                    <span className="mt-3 inline-block text-xs font-medium uppercase tracking-wide text-[rgb(var(--brass))]">
                      Visit site &rarr;
                    </span>
                  </a>
                ))}
              </div>
            </div>
          ))}
          <p className="mt-8 text-xs text-[rgb(var(--ink))]/50">
            This page is intentionally excluded from search indexing and site navigation. Links are provided for reference only; Catapult Fundraising is not affiliated with or endorsed by the organizations listed unless otherwise noted.
          </p>
        </div>
      </section>
    </>
  );
}
