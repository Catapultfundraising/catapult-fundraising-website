import { TESTIMONIALS } from "@/lib/testimonials";

// The full "What Clients Say" grid, shown on /results so every client quote is
// represented in one place. Sources directly from lib/testimonials.ts (the single
// shared testimonial list) so new quotes added there automatically appear here too.
export function TestimonialStrip() {
  return (
    <section className="border-y border-[rgb(var(--line))] bg-white py-14 lg:py-16">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <p className="font-display text-xl sm:text-[22.5px] uppercase tracking-[0.25em] text-[rgb(var(--brass))]">
          What Clients Say
        </p>
        <div className="mt-12 grid gap-10 sm:grid-cols-2">
          {TESTIMONIALS.map((t) => (
            <figure key={t.id} className="flex flex-col justify-between">
              <blockquote className="space-y-4 font-display text-[25px] leading-snug text-[rgb(var(--navy))]">
                {t.quote.map((para, i) => (
                  <p key={i}>
                    {i === 0 && "“"}
                    {para}
                    {i === t.quote.length - 1 && "”"}
                  </p>
                ))}
              </blockquote>
              <figcaption className="mt-6 text-[17.5px] text-[rgb(var(--ink))]/60">
                <span className="font-semibold text-[rgb(var(--navy))]">{t.name}</span>
                <br />
                {t.org}
              </figcaption>
            </figure>
          ))}
        </div>
        <p className="mt-10 text-[15px] text-[rgb(var(--ink))]/40">
          Shared with client permission. Capital campaign case study coming soon.
        </p>
      </div>
    </section>
  );
}
