import { TESTIMONIALS } from "@/lib/testimonials";
import { TestimonialQuote } from "@/components/testimonial-quote";

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
            <TestimonialQuote key={t.id} t={t} compact />
          ))}
        </div>
        <p className="mt-10 text-[15px] text-[rgb(var(--ink))]/40">
          Shared with client permission.
        </p>
      </div>
    </section>
  );
}
