import type { Metadata } from "next";
import { Coffee, Clock } from "lucide-react";
import { NjConferenceForm } from "@/components/nj-conference-form";

export const metadata: Metadata = {
  title: "NJ Conference Giveaway | Catapult Fundraising",
  description: "Visit Catapult at the NJ Conference on Philanthropy and enter for a chance to win a $50 Starbucks gift card.",
  alternates: { canonical: "/nj-conference" },
  robots: { index: false, follow: false },
};

export default function NjConferencePage() {
  return (
    <section className="bg-[rgb(var(--paper))] py-8 sm:py-14">
      <div className="mx-auto grid max-w-5xl gap-8 px-5 lg:grid-cols-[0.9fr_1.1fr] lg:gap-12 lg:px-10">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[rgb(var(--navy))]">NJ Conference on Philanthropy · November 12, 2026</p>
          <Coffee aria-hidden="true" className="mt-4 h-10 sm:mt-6 sm:h-12 w-12 text-[rgb(var(--brass))]" strokeWidth={1.5} />
          <h1 className="mt-4 font-display text-4xl leading-tight text-[rgb(var(--navy))] sm:text-5xl">Your next coffee<br className="hidden sm:block" /> could be on us.</h1>
          <p className="mt-3 text-lg sm:mt-5 leading-relaxed text-[rgb(var(--navy))]">Enter for a chance to win a <strong>$50 Starbucks gift card.</strong></p>
          <p className="mt-3 leading-relaxed sm:mt-4">Thanks for stopping by Catapult Fundraising. Leave your details and we&apos;ll include you in our conference drawing.</p>
          <div className="mt-4 flex gap-3 sm:mt-6 border-y border-[rgb(var(--line))] py-4 sm:py-5">
            <Clock aria-hidden="true" className="mt-1 h-5 w-5 shrink-0 text-[rgb(var(--brass))]" />
            <p><strong>Drawing: 3:15 p.m. Eastern</strong><br /><span className="text-sm">Thursday, November 12, 2026</span></p>
          </div>
          <div className="hidden lg:block"><GiveawayRules /></div>
        </div>
        <NjConferenceForm />
        <div className="lg:hidden"><GiveawayRules /></div>
      </div>
    </section>
  );
}

function GiveawayRules() {
  return (<>
          <p className="mt-5 text-sm leading-relaxed">No purchase necessary. Conference attendees only. One entry per email. Entries close at 3:15 p.m. Eastern on November 12. One winner will be selected at random from eligible entries. Your odds depend on the number of eligible entries. Catapult staff and test entries are excluded.</p>
          <p className="mt-4 text-xs leading-relaxed">Sponsored by Catapult Fundraising. Starbucks is not a sponsor of or affiliated with this giveaway.</p>
  </>);
}
