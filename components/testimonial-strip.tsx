const QUOTES = [
  {
    quote:
      "Loma Linda University Health has partnered with Catapult Fundraising for several years, and the results have consistently exceeded our expectations. Catapult has generated qualified leads that have developed into meaningful planned gifts, delivering a strong return on our investment. Maria Healy has been exceptional to work with, responsive, attentive, and highly professional. She communicates with our team regularly and ensures that every detail is carefully managed and implemented. Our partnership has now expanded to include the scheduling of Zoom and face-to-face donor appointments, helping us deepen relationships with prospective donors and advance more meaningful conversations. I highly recommend Catapult Fundraising for its professionalism, service, and proven results.",
    name: "Bill LaBore",
    org: "Director of Planned Giving, Loma Linda University Health | Philanthropy",
  },
  {
    quote:
      "Catapult Fundraising has been a fantastic partner in relaunching and growing UMGC's Annual Giving telemarketing program. Since restarting the program in FY24, their team's personalized approach has helped us steadily strengthen our annual fund by increasing both our average gift and pledge rate year over year. Beyond the numbers, Catapult's team consistently delivers thoughtful, donor-centered conversations that reflect well on our institution, and the team is responsive, collaborative, and genuinely invested in our success. We're grateful for the partnership and look forward to continuing to grow this program together.",
    name: "Matthew Talley",
    org: "Assistant Director of Annual Giving, University of Maryland Global Campus",
  },
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
    org: "Former Sr. Director of Development, Houston Symphony",
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