import { PageHero } from "@/components/page-hero";
import { ContactForm } from "@/components/contact-form";
import { Phone, Mail, MapPin } from "lucide-react";
import { FIRM_PHONE, FIRM_PHONE_HREF, FIRM_EMAIL, FIRM_ADDRESS_LINES } from "@/lib/constants";

const SITE_URL = "https://www.catapultfr.com";

export const metadata = {
  title: "Contact | Catapult Fundraising",
  description:
    "Start a conversation about capital campaign counsel, annual fund calling, mid-level donor engagement, or legacy giving with Catapult Fundraising.",
  keywords: [
    "contact fundraising consultant",
    "nonprofit fundraising consultation",
    "Henderson NV fundraising firm",
  ],
  alternates: { canonical: "/contact" },
};

const FAQS = [
  {
    question: "How quickly does Catapult Fundraising respond to inquiries?",
    answer:
      "We respond to every inquiry within one business day, whether you're exploring a feasibility study, launching a public-phase calling program, or building a mid-level donor pipeline.",
  },
  {
    question: "What areas does Catapult Fundraising serve?",
    answer:
      "Catapult Fundraising is headquartered in Henderson, Nevada, with additional locations in New Jersey and Texas, and we work with nonprofit clients nationwide on capital campaigns, legacy giving, donor engagement, and annual fund calling.",
  },
  {
    question: "What should I include when reaching out to Catapult?",
    answer:
      "Let us know your organization's mission, the type of program you're considering (capital campaign, legacy giving, donor engagement, or annual fund calling), and your rough timeline so we can point you to the right consultant.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "ContactPage",
      "@id": `${SITE_URL}/contact#webpage`,
      url: `${SITE_URL}/contact`,
      name: "Contact | Catapult Fundraising",
      isPartOf: { "@id": `${SITE_URL}/#organization` },
      about: { "@id": `${SITE_URL}/#organization` },
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "Contact", item: `${SITE_URL}/contact` },
      ],
    },
    {
      "@type": "FAQPage",
      mainEntity: FAQS.map((f) => ({
        "@type": "Question",
        name: f.question,
        acceptedAnswer: { "@type": "Answer", text: f.answer },
      })),
    },
  ],
};

export default function ContactPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PageHero
        eyebrow="Contact"
        title="Let's talk about growing your donor base."
        description="Whether you're exploring a feasibility study, launching a public-phase calling program, building a mid-level donor pipeline, or growing legacy gifts, we respond to every inquiry within one business day."
      />

      <section className="mx-auto max-w-7xl px-6 py-14 lg:px-10 lg:py-16">
        <div className="grid gap-14 lg:grid-cols-3">
          <div className="space-y-8 lg:col-span-1">
            <div className="flex items-start gap-3">
              <Phone className="mt-1 h-5 w-5 shrink-0 text-[rgb(var(--brass))]" />
              <div>
                <p className="text-[17.5px] font-semibold uppercase tracking-wider text-[rgb(var(--ink))]/50">Call us</p>
                <a href={`tel:${FIRM_PHONE_HREF}`} className="font-display text-[25px] text-[rgb(var(--navy))]">
                  {FIRM_PHONE}
                </a>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Mail className="mt-1 h-5 w-5 shrink-0 text-[rgb(var(--brass))]" />
              <div>
                <p className="text-[17.5px] font-semibold uppercase tracking-wider text-[rgb(var(--ink))]/50">Email us</p>
                <a href={`mailto:${FIRM_EMAIL}`} className="font-display text-[25px] text-[rgb(var(--navy))]">
                  {FIRM_EMAIL}
                </a>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="mt-1 h-5 w-5 shrink-0 text-[rgb(var(--brass))]" />
              <div>
                <p className="text-[17.5px] font-semibold uppercase tracking-wider text-[rgb(var(--ink))]/50">Visit us</p>
                <p className="font-display text-lg text-[rgb(var(--navy))]">
                  {FIRM_ADDRESS_LINES.map((line) => (
                    <span key={line} className="block">
                      {line}
                    </span>
                  ))}
                </p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <ContactForm />
          </div>
        </div>
      </section>
    </>
  );
}
