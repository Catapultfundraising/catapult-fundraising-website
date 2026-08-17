import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CtaBand } from "@/components/cta-band";
import { ANSWERS, getAnswerBySlug } from "@/lib/answers";

const SITE_URL = "https://www.catapultfr.com";

export function generateStaticParams() {
  return ANSWERS.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const a = getAnswerBySlug(slug);
  if (!a) return {};
  return {
    title: a.question,
    description: a.answer[0],
    alternates: { canonical: `/answers/${a.slug}` },
  };
}

export default async function AnswerPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const a = getAnswerBySlug(slug);
  if (!a) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: a.question,
            acceptedAnswer: { "@type": "Answer", text: a.answer.join(" ") },
          },
        ],
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "Fundraising Questions, Answered", item: `${SITE_URL}/answers` },
          { "@type": "ListItem", position: 3, name: a.question, item: `${SITE_URL}/answers/${a.slug}` },
        ],
      },
    ],
  };

  // A handful of other questions in the same pillar, so answer engines and
  // human readers alike have a next place to go without needing the (not
  // present) nav menu.
  const more = ANSWERS.filter((x) => x.pillar === a.pillar && x.slug !== a.slug).slice(0, 4);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <section className="bg-[rgb(var(--navy))] py-10 text-[rgb(var(--paper))] lg:py-14">
        <div className="mx-auto max-w-4xl px-6 lg:px-10">
          <p className="font-display text-base uppercase tracking-[0.25em] text-[rgb(var(--brass-light))] sm:text-lg">
            {a.pillar}
          </p>
          <h1 className="mt-4 font-display text-4xl tracking-tight text-balance sm:text-5xl">{a.question}</h1>
        </div>
      </section>

      <article className="mx-auto max-w-3xl px-6 py-14 lg:px-10 lg:py-16">
        <Link
          href="/answers"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[rgb(var(--navy))]/60 hover:text-[rgb(var(--navy))]"
        >
          <ArrowLeft className="h-4 w-4" />
          More fundraising questions, answered
        </Link>

        <div className="mt-8 space-y-5">
          {a.answer.map((para, i) => (
            <p key={i} className="text-lg leading-relaxed text-[rgb(var(--ink))]/75">
              {para}
            </p>
          ))}
        </div>

        {a.related.length > 0 && (
          <div className="mt-12 rounded-2xl border border-[rgb(var(--line))] bg-white p-8">
            <p className="text-xs font-semibold uppercase tracking-wider text-[rgb(var(--brass))]">
              Related
            </p>
            <ul className="mt-3 space-y-2">
              {a.related.map((r) => (
                <li key={r.href}>
                  <Link
                    href={r.href}
                    className="text-[17px] font-semibold text-[rgb(var(--navy))] underline decoration-[rgb(var(--brass))]/40 decoration-2 underline-offset-4 hover:decoration-[rgb(var(--brass))]"
                  >
                    {r.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {more.length > 0 && (
          <div className="mt-10">
            <p className="text-xs font-semibold uppercase tracking-wider text-[rgb(var(--brass))]">
              More on {a.pillar}
            </p>
            <ul className="mt-3 space-y-2">
              {more.map((m) => (
                <li key={m.slug}>
                  <Link
                    href={`/answers/${m.slug}`}
                    className="text-[17px] text-[rgb(var(--navy))]/80 underline decoration-[rgb(var(--brass))]/30 decoration-2 underline-offset-4 hover:text-[rgb(var(--navy))] hover:decoration-[rgb(var(--brass))]"
                  >
                    {m.question}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </article>

      <CtaBand />
    </>
  );
}
