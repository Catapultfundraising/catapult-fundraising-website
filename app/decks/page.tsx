import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Download } from "lucide-react";
import { PageHero } from "@/components/page-hero";
import { CtaBand } from "@/components/cta-band";
import { DECKS } from "@/lib/decks";

export const metadata = {
  title: "Sales Decks | Catapult Fundraising",
  description:
    "Password-protected hub for the four Catapult Fundraising service decks, with client quotes and downloadable PDFs.",
  robots: { index: false, follow: false },
};

export default function DecksIndexPage() {
  return (
    <>
      <PageHero
        eyebrow="Sales Library"
        title="Every deck, one link."
        description="The four service decks, ready to present from any browser, with the client quotes that back them up and a PDF for when the wifi gives out."
      />

      <section className="mx-auto max-w-6xl px-6 py-14 lg:px-10 lg:py-16">
        <div className="grid gap-8 sm:grid-cols-2">
          {DECKS.map((deck) => (
            <div
              key={deck.slug}
              className="group flex flex-col overflow-hidden rounded-2xl border border-[rgb(var(--line))] bg-white shadow-sm transition-shadow hover:shadow-md"
            >
              <Link href={`/decks/${deck.slug}`} className="relative block aspect-[16/9] bg-[rgb(var(--navy))]">
                <Image
                  src={`/decks/${deck.slug}/01.png`}
                  alt={`${deck.name} deck, first slide`}
                  fill
                  sizes="(max-width: 640px) 100vw, 520px"
                  className="object-contain"
                />
              </Link>
              <div className="flex flex-1 flex-col p-6">
                <h2 className="font-display text-2xl text-[rgb(var(--navy))]">{deck.name}</h2>
                <p className="mt-1 text-sm font-semibold text-[rgb(var(--brass))]">{deck.promise}</p>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-[rgb(var(--ink))]/70">
                  {deck.summary}
                </p>
                <div className="mt-5 flex flex-wrap items-center gap-4">
                  <Link
                    href={`/decks/${deck.slug}`}
                    className="inline-flex items-center gap-2 rounded-full bg-[rgb(var(--navy))] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[rgb(var(--navy-deep))]"
                  >
                    Present
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                  <a
                    href={`/decks/${deck.slug}/deck.pdf`}
                    className="inline-flex items-center gap-2 text-sm font-semibold text-[rgb(var(--navy))] underline-offset-4 hover:underline"
                  >
                    <Download className="h-4 w-4" />
                    PDF
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-10 text-sm text-[rgb(var(--ink))]/55">
          This page is password protected and is not indexed by search engines. Share the link and the
          password only with people you want seeing our pricing and process.
        </p>
      </section>

      <CtaBand />
    </>
  );
}
