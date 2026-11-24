import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, CalendarDays, Clock3 } from "lucide-react";
import { PageHero } from "@/components/page-hero";
import { CtaBand } from "@/components/cta-band";
import { WEBINARS_2027, formatWebinarDate } from "@/lib/webinar-series-2027";
import { WebinarRegistration } from "@/components/webinar-registration";
import { presenterProfileFor } from "@/lib/team-presenter-profiles";

export const metadata: Metadata = {
  title: "2027 Nonprofit Fundraising Webinar Series",
  description: "Explore twelve 2027 webinars on capital campaigns, donor engagement, legacy giving and prospect research with Anthony Alonso, Jeff Grandy and Gwen Paxon.",
  alternates: { canonical: "/webinars" },
  openGraph: {
    title: "2027 Nonprofit Fundraising Webinar Series",
    description: "Twelve practical sessions for nonprofit fundraising teams. Explore the schedule and learning objectives.",
    url: "https://www.catapultfr.com/webinars",
    type: "website",
  },
};

export default function WebinarsPage() {
  return (
    <>
      <PageHero
        eyebrow="2027 Webinar Series"
        title="Practical conversations for stronger fundraising."
        description="Twelve sessions for nonprofit leaders and fundraising teams, covering campaign readiness, annual giving, mid-level donors, legacy giving and prospect research."
      />

      <section aria-labelledby="series-overview" className="border-b border-[rgb(var(--line))] bg-white">
        <div className="mx-auto max-w-7xl px-6 py-10 lg:px-10">
          <div className="grid gap-8 lg:grid-cols-[1fr_1fr] lg:gap-16">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-[rgb(var(--navy))]/70">Plan your year</p>
              <h2 id="series-overview" className="mt-3 font-display text-3xl text-[rgb(var(--navy))]">One hour. A focused fundraising topic.</h2>
              <p className="mt-4 leading-relaxed text-[rgb(var(--ink))]/80">
                Join Anthony Alonso, Jeff Grandy and Gwen Paxon for practical sessions with three learning objectives and time for audience Q&amp;A.
              </p>
              <a href="#schedule" className="mt-6 inline-flex min-h-11 items-center gap-2 font-semibold text-[rgb(var(--navy))] underline decoration-[rgb(var(--brass))] underline-offset-8">
                Explore all twelve sessions <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </a>
            </div>
            <div className="border-l-2 border-[rgb(var(--brass))] pl-6">
              <p className="flex items-center gap-2 font-semibold text-[rgb(var(--navy))]"><Clock3 aria-hidden="true" className="h-5 w-5" /> Every session · 60 minutes</p>
              <p className="mt-3 leading-7 text-[rgb(var(--ink))]/80">
                11:30am–12:30pm Pacific<br />
                1:30–2:30pm Central<br />
                2:30–3:30pm Eastern
              </p>
              <p className="mt-4 text-sm leading-relaxed text-[rgb(var(--ink))]/80">
                Register for each session below. Each session has its own registration link.
              </p>
            </div>
          </div>
          <nav aria-label="Jump to a webinar month" className="mt-8 flex flex-wrap gap-3">
            {WEBINARS_2027.map((session) => (
              <a key={session.slug} href={`#${session.slug}`} className="inline-flex h-[88px] w-[88px] flex-none shrink-0 items-center justify-center rounded-full border border-[rgb(var(--line))] text-center text-sm font-semibold text-[rgb(var(--navy))] transition-colors hover:border-[rgb(var(--brass))] hover:bg-[rgb(var(--paper))]">
                {session.month}
              </a>
            ))}
          </nav>
        </div>
      </section>

      <section id="schedule" aria-labelledby="schedule-heading" className="mx-auto max-w-7xl scroll-mt-48 px-6 py-14 lg:px-10">
        <h2 id="schedule-heading" className="font-display text-4xl text-[rgb(var(--navy))]">The 2027 schedule</h2>
        <div className="mt-10 divide-y divide-[rgb(var(--line))]">
          {WEBINARS_2027.map((session) => {
            const presenter = presenterProfileFor(session.presenter);
            const bioHref = `/our-team#${presenter.id}`;
            return (
            <article key={session.slug} id={session.slug} aria-labelledby={`${session.slug}-title`} className="grid scroll-mt-48 gap-6 py-10 first:pt-0 lg:grid-cols-[200px_1fr] lg:gap-12 lg:py-12">
              <div>
                <p className="font-display text-3xl text-[rgb(var(--navy))]">{session.month}</p>
                <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-[rgb(var(--navy))]">
                  <CalendarDays aria-hidden="true" className="h-4 w-4 shrink-0" />
                  <time dateTime={session.start}>{formatWebinarDate(session.date)}</time>
                </p>
                <p className="mt-3 text-sm leading-relaxed text-[rgb(var(--ink))]/80">11:30am–12:30pm Pacific<br />1:30–2:30pm Central<br />2:30–3:30pm Eastern</p>
                <p className="mt-3 text-sm leading-relaxed text-[rgb(var(--ink))]/80">{session.format}</p>
              </div>
              <div className="min-w-0">
                <div className="mb-5 flex items-center gap-4">
                  <Link href={bioHref} aria-label={`Read ${session.presenter_name}'s biography`} className="shrink-0 rounded-full ring-2 ring-[rgb(var(--line))]">
                    <Image src={presenter.photo} alt={session.presenter_name} width={80} height={80} sizes="80px" className="h-20 w-20 rounded-full object-cover" />
                  </Link>
                  <div className="min-w-0">
                    <p className="text-sm text-[rgb(var(--navy))]/75">Presented by</p>
                    <Link href={bioHref} className="inline-flex min-h-11 items-center font-semibold text-[rgb(var(--navy))] underline decoration-[rgb(var(--brass))] underline-offset-4">{session.presenter_name}</Link>
                    <p className="text-sm leading-relaxed text-[rgb(var(--ink))]/80">{presenter.role}</p>
                  </div>
                </div>
                <h3 id={`${session.slug}-title`} className="mt-3 max-w-4xl font-display text-3xl leading-tight text-[rgb(var(--navy))] sm:text-4xl">{session.title}</h3>
                <p className="mt-5 max-w-4xl leading-relaxed text-[rgb(var(--ink))]/80">{session.description}</p>
                <div className="mt-6 border-l-2 border-[rgb(var(--brass))] pl-5">
                  <h4 className="font-semibold text-[rgb(var(--navy))]">What you’ll learn</h4>
                  <ul className="mt-3 list-disc space-y-2 pl-5 leading-relaxed text-[rgb(var(--ink))]/80">
                    {session.learning_objectives.map((objective) => <li key={objective}>{objective}</li>)}
                  </ul>
                </div>
                <div className="mt-5"><WebinarRegistration title={session.title} registrationUrl={session.registration_url} /></div>
              </div>
            </article>
            );
          })}
        </div>
      </section>
      <CtaBand heading="Put the conversation to work." description="Have a question about a session or your organization’s fundraising priorities? Tell us what you’re working on." contactLabel="Contact Catapult" />
    </>
  );
}
