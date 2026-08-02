import Link from "next/link";
import { ArrowRight } from "lucide-react";

export interface QaLinkItem {
  question: string;
  answer: string;
  link?: { href: string; label: string };
}

interface QaLinksSectionProps {
  eyebrow?: string;
  heading: string;
  intro?: string;
  items: QaLinkItem[];
  /** Unique id so multiple instances on the site don't collide when both emit FAQPage JSON-LD. */
  idSuffix: string;
}

/**
 * Reusable "how we do things" Q&A block used for AEO (answer-engine
 * optimization): each question is answered in plain, quotable language and
 * paired with a direct link to the page that covers it in full depth, so
 * both users and AI answer engines can navigate straight to the relevant
 * section. Emits FAQPage structured data for the exact questions shown.
 */
export function QaLinksSection({ eyebrow = "How We Do Things", heading, intro, items, idSuffix }: QaLinksSectionProps) {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `https://www.catapultfr.com/#faq-${idSuffix}`,
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  return (
    <section className="border-t border-[rgb(var(--line))] bg-white py-14 lg:py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <div className="mx-auto max-w-4xl px-6 lg:px-10">
        <p className="font-display text-xl uppercase tracking-[0.25em] text-[rgb(var(--brass))] sm:text-[22.5px]">
          {eyebrow}
        </p>
        <h2 className="mt-4 max-w-3xl font-display text-5xl tracking-tight text-[rgb(var(--navy))] sm:text-6xl">
          {heading}
        </h2>
        {intro ? (
          <p className="mt-6 max-w-3xl text-lg leading-relaxed text-[rgb(var(--ink))]/70">{intro}</p>
        ) : null}

        <div className="mt-12 space-y-8">
          {items.map((item) => (
            <div key={item.question} className="border-b border-[rgb(var(--line))] pb-8 last:border-b-0">
              <h3 className="font-display text-2xl text-[rgb(var(--navy))]">{item.question}</h3>
              <p className="mt-3 text-lg leading-relaxed text-[rgb(var(--ink))]/70">{item.answer}</p>
              {item.link ? (
                <Link
                  href={item.link.href}
                  className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[rgb(var(--brass))] hover:text-[rgb(var(--navy))]"
                >
                  {item.link.label}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
