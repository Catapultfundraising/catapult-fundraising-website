import { TESTIMONIALS } from "@/lib/testimonials";

// A continuously auto-scrolling marquee of short client-quote excerpts, sitting
// directly under the "What Clients Say" grid (components/testimonial-strip.tsx).
// The list is rendered twice back-to-back and animated exactly -50% so the loop
// is seamless. Respects prefers-reduced-motion via the `motion-reduce:` variant
// (Tailwind's built-in media-query modifier) by disabling the animation and
// letting the row wrap normally for anyone who has that OS/browser setting on.
export function ScrollingQuoteBanner() {
  const quotes = TESTIMONIALS;
  const track = [...quotes, ...quotes];

  return (
    <section className="overflow-hidden border-b border-[rgb(var(--line))] bg-[rgb(var(--paper))] py-10">
      <div
        className="group flex w-max gap-6 motion-reduce:flex-wrap motion-reduce:w-full animate-marquee motion-reduce:animate-none hover:[animation-play-state:paused]"
        aria-hidden={false}
      >
        {track.map((t, i) => (
          <figure
            key={`${t.id}-${i}`}
            aria-hidden={i >= quotes.length}
            className="flex w-[380px] shrink-0 flex-col justify-between rounded-2xl border border-[rgb(var(--line))] bg-white p-6"
          >
            <blockquote className="text-[15px] leading-relaxed text-[rgb(var(--ink))]/75">
              &ldquo;{t.excerpt}&rdquo;
            </blockquote>
            <figcaption className="mt-4 text-sm text-[rgb(var(--ink))]/55">
              <span className="font-semibold text-[rgb(var(--navy))]">{t.name}</span>
              <br />
              {t.org}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
