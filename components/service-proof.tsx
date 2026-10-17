import Link from "next/link";

export type ProofStat = { value: string; label: string };
export type ProofStory = { title: string; body: string; href?: string };

export function ServiceProof({
  eyebrow = "Results From Our Programs",
  heading,
  stats,
  stories,
}: {
  eyebrow?: string;
  heading: string;
  stats: ProofStat[];
  stories: ProofStory[];
}) {
  return (
    <section className="bg-[rgb(var(--paper))] py-14 lg:py-16">
      <div className="mx-auto max-w-5xl px-6 lg:px-10">
        <p className="font-display text-xl uppercase tracking-[0.25em] text-[rgb(var(--brass))] sm:text-[22.5px]">
          {eyebrow}
        </p>
        <h2 className="mt-4 font-display text-3xl text-[rgb(var(--navy))] sm:text-4xl">{heading}</h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="border-t-2 border-[rgb(var(--brass))] pt-4">
              <p className="font-display text-4xl text-[rgb(var(--navy))]">{s.value}</p>
              <p className="mt-2 text-base leading-snug text-[rgb(var(--ink))]/70">{s.label}</p>
            </div>
          ))}
        </div>
        <div className="mt-12 grid gap-8 lg:grid-cols-2">
          {stories.map((st) => (
            <article key={st.title} className="border border-[rgb(var(--line))] bg-white p-6">
              <h3 className="font-display text-2xl text-[rgb(var(--navy))]">{st.title}</h3>
              <p className="mt-3 text-lg leading-relaxed text-[rgb(var(--ink))]/75">{st.body}</p>
              {st.href ? (
                <Link href={st.href} className="mt-4 inline-block font-semibold text-[rgb(var(--brass))] hover:underline">
                  Read the case study →
                </Link>
              ) : null}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function ServiceFaq({ heading, faqs }: { heading: string; faqs: { question: string; answer: string }[] }) {
  return (
    <section className="border-t border-[rgb(var(--line))] bg-white py-14 lg:py-16">
      <div className="mx-auto max-w-4xl px-6 lg:px-10">
        <h2 className="font-display text-3xl text-[rgb(var(--navy))] sm:text-4xl">{heading}</h2>
        <dl className="mt-8 space-y-8">
          {faqs.map((f) => (
            <div key={f.question}>
              <dt className="font-display text-2xl text-[rgb(var(--navy))] sm:text-[28px]">{f.question}</dt>
              <dd className="mt-3 text-xl leading-relaxed text-[rgb(var(--ink))]/70">{f.answer}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
