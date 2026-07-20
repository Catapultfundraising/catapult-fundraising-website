const QUOTES = [
  {
    quote:
      "Catapult treated every prospect like a major donor-in-waiting. Our participation rate, and our base of new donors, grew faster than in any prior campaign.",
    name: "Board Chair",
    org: "Regional Human Services Nonprofit",
  },
  {
    quote:
      "They were the only firm willing to stay with us from the feasibility study all the way through the public phase calling. One team, one accountable partner.",
    name: "Executive Director",
    org: "Community Foundation Client",
  },
  {
    quote:
      "The digital stewardship layer, texts, ringless voicemail, thank-you emails, made our donors feel cared for at every touchpoint, not just asked.",
    name: "Development Director",
    org: "Faith-Based Capital Campaign",
  },
];

export function TestimonialStrip() {
  return (
    <section className="border-y border-[rgb(var(--line))] bg-white py-14 lg:py-16">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <p className="font-display text-xl sm:text-[22.5px] uppercase tracking-[0.25em] text-[rgb(var(--brass))]">
          What Clients Say
        </p>
        <div className="mt-12 grid gap-10 lg:grid-cols-3">
          {QUOTES.map((t) => (
            <figure key={t.name} className="flex flex-col justify-between">
              <blockquote className="font-display text-[25px] leading-snug text-[rgb(var(--navy))] text-balance">
                &ldquo;{t.quote}&rdquo;
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
          Representative feedback shared with client permission. Named case studies available on request.
        </p>
      </div>
    </section>
  );
}
