import type { Testimonial } from "@/lib/testimonials";
import { ClientLogo } from "@/components/client-logo";

// One full client quote as shown on the service pages and /results: the quote,
// the attribution, and the client's logo floated left with the quote text
// wrapping around it (no card).
export function TestimonialQuote({ t, compact = false }: { t: Testimonial; compact?: boolean }) {
  return (
    <figure className="relative flow-root">
      {t.logo && (
        <div className={`float-left mb-3 mt-1 ${compact ? "mr-5" : "mr-7"}`}>
          <ClientLogo logo={t.logo} maxH={compact ? 44 : 56} maxW={compact ? 110 : 150} />
        </div>
      )}
      <blockquote
        className="space-y-4 font-display text-[25px] leading-snug text-[rgb(var(--navy))]"
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
