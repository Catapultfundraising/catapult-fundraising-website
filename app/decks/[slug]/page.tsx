import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Download } from "lucide-react";
import { PageHero } from "@/components/page-hero";
import { CtaBand } from "@/components/cta-band";
import { DeckViewer } from "@/components/deck-viewer";
import { DECKS, deckQuotes, deckSlides, getDeck } from "@/lib/decks";

export function generateStaticParams() {
  return DECKS.map((deck) => ({ slug: deck.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const deck = getDeck(slug);
  if (!deck) return { title: "Sales Decks | Catapult Fundraising" };
  return {
    title: `${deck.name} Deck | Catapult Fundraising`,
    description: deck.summary,
    robots: { index: false, follow: false },
  };
}

export default async function DeckPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const deck = getDeck(slug);
  if (!deck) notFound();

  const slides = deckSlides(deck);
  const quotes = deckQuotes(deck);

  return (
    <>
      <PageHero eyebrow={`${deck.name} Deck`} title={deck.promise} description={deck.summary} />

      <section className="mx-auto max-w-5xl px-6 py-12 lg:px-10 lg:py-14">
        <DeckViewer slides={slides} deckName={deck.name} />

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/decks"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[rgb(var(--navy))] underline-offset-4 hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            All decks
          </Link>
          <div className="flex flex-wrap items-center gap-4">
            <Link
              href={deck.serviceHref}
              className="inline-flex items-center gap-2 text-sm font-semibold text-[rgb(var(--navy))] underline-offset-4 hover:underline"
            >
              Service page
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href={`/decks/${deck.slug}/deck.pdf`}
              className="inline-flex items-center gap-2 rounded-full bg-[rgb(var(--navy))] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[rgb(var(--navy-deep))]"
            >
              <Download className="h-4 w-4" />
              Download PDF
            </a>
          </div>
        </div>
      </section>

      {quotes.length > 0 && (
        <section className="border-t border-[rgb(var(--line))] bg-[rgb(var(--paper))]">
          <div className="mx-auto max-w-5xl px-6 py-14 lg:px-10 lg:py-16">
            <p className="font-display text-sm uppercase tracking-[0.25em] text-[rgb(var(--brass))]">
              In Their Words
            </p>
            <h2 className="mt-3 font-display text-3xl tracking-tight text-[rgb(var(--navy))] sm:text-4xl">
              What clients say about this work
            </h2>

            <div className="mt-10 space-y-8">
              {quotes.map((quote) => (
                <figure
                  key={quote.id}
                  className="rounded-2xl border border-[rgb(var(--line))] bg-white p-7 shadow-sm"
                >
                  <blockquote className="space-y-4 border-l-2 border-[rgb(var(--brass))] pl-5 text-[rgb(var(--ink))]/80">
                    {quote.quote.map((paragraph, i) => (
                      <p key={i} className="leading-relaxed">
                        {paragraph}
                      </p>
                    ))}
                  </blockquote>
                  <figcaption className="mt-5 pl-5 text-sm">
                    <span className="font-semibold text-[rgb(var(--navy))]">{quote.name}</span>
                    <span className="block text-[rgb(var(--ink))]/60">{quote.org}</span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}

      <CtaBand />
    </>
  );
}
