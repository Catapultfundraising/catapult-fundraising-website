const QUOTES = [
  {
    quote:
      "They were the only firm willing to stay with us from the feasibility study all the way through the public phase calling. One team, one accountable partner from start to finish.",
    name: "Executive Director",
    org: "Capital Campaign Client",
  },
  {
    quote:
      "Legacy Call was a gamechanger for us. As a small shop, it helped us reach a much wider audience of planned giving donors, and the response was incredible: several new gifts and a full pool of new prospects.",
    name: "Colleen Schulman, CFRE, CSPG",
    org: "Chief Philanthropy Officer, PBS KVIE",
  },
  {
    quote:
      "Catapult's fractional officers seamlessly amplified our staff capacity. We grew our total donor households, increased funds raised from our mid-level base, and strengthened our major gifts pipeline. True partners, not just a vendor.",
    name: "Christine Ann Stevens",
    org: "VP of Development, LA Opera; former Sr. Director of Development, Houston Symphony",
  },
  {
    quote:
      "Catapult's multi-channel outreach, phone, text, and email woven into one plan, increased both donor participation and dollars raised. Their callers are exceptionally well-trained, authentic, and a true extension of our advancement team.",
    name: "Erica Kobbe",
    org: "Sr. Annual Giving Officer, Sacramento State University",
  },
];

export function TestimonialStrip() {
  return (
    <section className="border-y border-[rgb(var(--line))] bg-white py-14 lg:py-16">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <p className="font-display text-xl sm:text-[22.5px] uppercase tracking-[0.25em] text-[rgb(var(--brass))]">
          What Clients Say
        </p>
        <div className="mt-12 grid gap-10 sm:grid-cols-2">
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
          Shared with client permission. Capital campaign case study coming soon.
        </p>
      </div>
    </section>
  );
}