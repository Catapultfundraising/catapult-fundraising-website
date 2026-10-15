import type { Testimonial } from "@/lib/testimonials";
import { ClientLogo } from "@/components/client-logo";

// One full client quote as shown on the service pages and /results: the quote,
// the attribution, and the client's logo inside the quote card, top-right.
export function TestimonialQuote({ t, compact = false }: { t: Testimonial; compact?: boolean }) {
  return (
    <figure className={`relative rounded-2xl border border-[rgb(var(--line))] bg-white ${compact ? "p-6" : "p-8 sm:p-10"}`}>
      {t.logo && (
        <div className="mb-4 flex justify-end sm:absolute sm:right-8 sm:top-8 sm:mb-0">
          <ClientLogo logo={t.logo} maxH={compact ? 44 : 56} maxW={compact ? 110 : 150} />
        </div>
      )}
      <blockquote
        className={`space-y-4 font-display text-[25px] leading-snug text-[rgb(var(--navy))] ${t.logo ? (compact ? "sm:pr-32" : "sm:pr-44") : ""}`}
      >
        {t.quote.map((para, i) => (
          <p key={i}>
            {i === 0 && "\u201C"}
            {para}
            {i === t.quote.length - 1 && "\u201D"}
          </p>
        ))}
      </blockquote>
      <figcaption className="mt-6 text-[17.5px] text-[rgb(var(--ink))]/60">
        <span className="font-semibold text-[rgb(var(--navy))]">{t.name}</span>
        <br />
        {t.org}
      </figcaption>
    </figure>
  );
}
