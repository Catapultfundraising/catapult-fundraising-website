import Image from "next/image";
import type { ReactNode } from "react";
import { PageHero } from "@/components/page-hero";
import { CtaBand } from "@/components/cta-band";
import { ShareButtons } from "@/components/share-buttons";

const SITE_URL = "https://www.catapultfr.com";
const SLUG = "dont-ask-at-the-party-cultivation-events-major-donors";
const IMG = `/blog/${SLUG}`;
const HEADLINE = "Don’t Ask at the Party: How to Run a Cultivation Event That Builds Major Donors";
const DESCRIPTION = "A cultivation event isn't a fundraiser with the ask removed. It requires a different approach to the guest list, the program and, perhaps most importantly, what happens after everyone goes home.";

export const metadata = {
  title: { absolute: "Cultivation Events That Build Major Donors | Catapult" },
  description: "Anthony R. Alonso on planning cultivation events that build major donor relationships, from the guest list and personal invitations to follow-up within a week.",
  keywords: ["cultivation event", "donor cultivation events", "major donor cultivation", "major gift strategy", "nonprofit event planning"],
  alternates: { canonical: `/blog/${SLUG}` },
  openGraph: {
    type: "article", title: HEADLINE, description: DESCRIPTION,
    url: `${SITE_URL}/blog/${SLUG}`,
    publishedTime: "2026-10-30T00:00:00-07:00",
    authors: ["Anthony R. Alonso"],
    images: [{ url: `${SITE_URL}${IMG}/social-cultivation-events-v2.jpg`, width: 1200, height: 630, alt: "Don’t Ask at the Party. By Anthony R. Alonso, President & CEO, Catapult Fundraising." }],
  },
};

const jsonLd = {
  "@context": "https://schema.org", "@type": "BlogPosting",
  headline: HEADLINE, description: DESCRIPTION,
  datePublished: "2026-10-30", dateModified: "2026-10-30",
  image: `${SITE_URL}${IMG}/hero-reception-v2.jpg`,
  author: {
    "@type": "Person", name: "Anthony R. Alonso", jobTitle: "President and CEO",
    url: `${SITE_URL}/our-team`, worksFor: { "@id": `${SITE_URL}/#organization` },
  },
  publisher: {
    "@type": "Organization", name: "Catapult Fundraising",
    logo: { "@type": "ImageObject", url: "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/3b507e74-308f-4ba5-aaac-554b31247f7e.png" },
  },
  mainEntityOfPage: `${SITE_URL}/blog/${SLUG}`,
};

const FEATHER = {
  WebkitMaskImage: "radial-gradient(ellipse farthest-corner at center, black 70%, transparent 100%)",
  maskImage: "radial-gradient(ellipse farthest-corner at center, black 70%, transparent 100%)",
  WebkitMaskSize: "100% 100%",
  maskSize: "100% 100%",
  WebkitMaskRepeat: "no-repeat",
  maskRepeat: "no-repeat",
} as const;

function Figure({
  src,
  alt,
  aspect = "aspect-[3/2]",
  priority = false,
}: {
  src: string;
  alt: string;
  aspect?: string;
  priority?: boolean;
}) {
  return (
    <div className="mb-6 w-full shrink-0 sm:float-right sm:mb-4 sm:ml-8 sm:w-72 md:w-80">
      <div className={`relative ${aspect} w-full overflow-hidden rounded-2xl`} style={FEATHER}>
        <Image src={src} alt={alt} fill className="object-cover" sizes="(min-width: 768px) 320px, 100vw" priority={priority} />
      </div>
    </div>
  );
}

function P({ children, className = "mt-4" }: { children: ReactNode; className?: string }) {
  return <p className={`${className} text-lg leading-relaxed text-[rgb(var(--ink))]/70`}>{children}</p>;
}

function H2({ children }: { children: ReactNode }) {
  return <h2 className="mt-12 font-display text-3xl text-[rgb(var(--navy))] sm:text-[34px]">{children}</h2>;
}

function Script({ children }: { children: ReactNode }) {
  return (
    <blockquote className="mt-6 border-l-4 border-[rgb(var(--brass))] pl-6 font-display text-xl italic leading-snug text-[rgb(var(--navy))]">
      {children}
    </blockquote>
  );
}

const Clear = () => <div className="clear-both" />;

export default function CultivationEventPost() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <PageHero eyebrow="Insights" title={HEADLINE} description={DESCRIPTION} />
      <article className="mx-auto max-w-4xl px-6 py-14 lg:px-10 lg:py-16">
        <ShareButtons url={`/blog/${SLUG}`} title={HEADLINE} />
        <p className="text-sm font-semibold uppercase tracking-wider text-[rgb(var(--brass))]">
          By Anthony R. Alonso, President and CEO, Catapult Fundraising
        </p>
        <div className="relative mb-8 mt-6 aspect-[3/2] w-full overflow-hidden rounded-2xl">
          <Image src={`${IMG}/hero-reception-v2.jpg`} alt="Guests arriving and mingling at an indoor reception with refreshments and event staff" fill className="object-cover" sizes="(min-width: 896px) 816px, 100vw" priority />
        </div>
        <P>{"This fall, I've been working with two clients on very different events. One is planning a small, invitation-only reception. The other is putting together a lunch for approximately 190 people."}</P>
        <P>{"The events have little in common in terms of size or format. But in both planning meetings, we kept coming back to the same point: this is a cultivation event, not a fundraiser."}</P>
        <P>{"That distinction matters more than many organizations realize."}</P>
        <P>{"I've seen organizations spend months planning a cultivation event, only to fall back on the same habits they use for their annual fundraising dinner. QR codes appear on the tables. Pledge cards are tucked under the programs. Someone gives a speech that eventually turns into an appeal for money."}</P>
        <P>{"There's nothing wrong with those things at a fundraising event. But when you've invited people to get to know your organization and its mission, asking them for money that evening can work against what you're trying to accomplish."}</P>
        <P>{"If you're trying to develop relationships with people who have the capacity to become major donors, you need to think about the entire experience differently."}</P>
        <Clear />
        <H2>{"First, understand what kind of event you're planning"}</H2>
        <Figure src={`${IMG}/purpose.jpg`} alt="Build relationships through the right guests, real conversations and next steps" />
        <P>{"A fundraising event and a cultivation event serve different purposes."}</P>
        <P>{"At a fundraising event, the results are fairly easy to measure. How much did you raise? How many tickets did you sell? Did the auction perform? What came in through the paddle raise?"}</P>
        <P>{"With a cultivation event, I look at different things."}</P>
        <P>{"Did the people we wanted to reach actually attend? Did they spend time with the right people? Did they hear something about the organization that made them want to learn more? And, just as important, does someone on the staff or board have a plan to continue the conversation?"}</P>
        <P>{"That last question is often overlooked."}</P>
        <P>{"A few things tell me an organization may be treating a cultivation event like a fundraiser:"}</P>
        <ul className="mt-6 list-disc space-y-3 pl-5 marker:text-[rgb(var(--brass))]">
          <li className="pl-2 text-lg leading-relaxed text-[rgb(var(--ink))]/70">{"QR codes, giving links or pledge cards on the tables."}</li>
          <li className="pl-2 text-lg leading-relaxed text-[rgb(var(--ink))]/70">{"A program that builds toward an opportunity to ask everyone for money."}</li>
          <li className="pl-2 text-lg leading-relaxed text-[rgb(var(--ink))]/70">{"Measuring success by how much was raised that evening."}</li>
          <li className="pl-2 text-lg leading-relaxed text-[rgb(var(--ink))]/70">{"A guest list designed primarily to fill the room."}</li>
        </ul>
        <P>{"These are perfectly reasonable approaches for a fundraising event. They're just not what I'd recommend here."}</P>
        <P>{"Most organizations need both types of events. The important thing is to decide which one you're planning before the invitations go out. Make sure the board, staff and event committee understand the purpose, too. Otherwise, people will naturally fall back on what they've always done."}</P>
        <Clear />
        <H2>{"Start with the guest list, not the invitation"}</H2>
        <Figure src={`${IMG}/guest-list.jpg`} alt="Invite prioritized guests in waves: first tier, second tier, then reserve" />
        <P>{"For a cultivation event, I spend a lot of time on the guest list before anyone starts worrying about invitations or centerpieces."}</P>
        <P>{"The question isn't how many people we can get into the room. It's who we want to meet, who we want to know us better and who might have a deeper interest in the organization's work."}</P>
        <P>{"One of the receptions we're working on this fall has room for approximately 20 guests, not including staff and the young people the organization serves."}</P>
        <P>{"The client initially identified more than 60 potential guests. We reviewed the list and ranked each person based on giving capacity and likelihood to engage."}</P>
        <P>{"Here's where we landed:"}</P>
        <ul className="mt-6 list-disc space-y-3 pl-5 marker:text-[rgb(var(--brass))]">
          <li className="pl-2 text-lg leading-relaxed text-[rgb(var(--ink))]/70">{"Approximately 25 names in the first tier."}</li>
          <li className="pl-2 text-lg leading-relaxed text-[rgb(var(--ink))]/70">{"16 in the second tier."}</li>
          <li className="pl-2 text-lg leading-relaxed text-[rgb(var(--ink))]/70">{"13 in the third tier."}</li>
        </ul>
        <P>{"There was also a separate group of prospects in another city. Rather than try to bring everyone together for one event, we decided to hold that group for a separate gathering."}</P>
        <P>{"The invitations will go out in waves. First-tier prospects get the initial invitation. As people decline, we release invitations to the next group. The third tier stays in reserve unless we need it."}</P>
        <P>{"We are aiming for approximately 25 acceptances for a room that holds 20. Anyone who has planned an event knows that cancellations happen, sometimes at the last minute."}</P>
        <P>{"One other decision: no plus-ones. This isn't a social gathering where people are encouraged to bring a friend. We want the people we've identified to attend, and the invitation should feel personal."}</P>
        <P>{"The larger lunch requires a different approach, but the same thinking applies."}</P>
        <P>{"Last year's room was crowded. This year, we're targeting approximately 190 guests, which gives everyone more room to move around and have conversations. We also went back through last year's invitation list. Some of the smaller-dollar donors who were invited previously aren't on this year's list."}</P>
        <P>{"That isn't a judgment about their importance to the organization. They deserve excellent stewardship. But this particular event has a specific purpose, and we want the room to include people who are likely to give at a significant level or have the potential to become major donors."}</P>
        <Clear />
        <H2>{"Don't just send invitations. Manage the RSVPs."}</H2>
        <Figure src={`${IMG}/rsvp.jpg`} alt="Manage RSVPs with personal invitations, calls and reminders" />
        <P>{"One thing I've learned over the years is that sending a beautiful invitation doesn't mean the right people will show up."}</P>
        <P>{"You need a plan for getting them there."}</P>
        <P>{"For the smaller reception, we're organizing the RSVP process almost like a campaign. The first invitations go to the top tier. About a week later, staff members begin making personal calls. There's a soft RSVP deadline, followed by another round of calls and a final email if needed."}</P>
        <P>{"Guests who confirm receive a reminder two days before the event with parking and access information. The client also receives an RSVP report every Monday."}</P>
        <P>{"There are two details I particularly want organizations to pay attention to."}</P>
        <P>{"First, track the declines. Don't just record that someone can't attend. Find out why. If someone is traveling that week, that's very different from someone who has no interest in attending. A scheduling conflict may be an opportunity to arrange coffee or a separate meeting."}</P>
        <P>{"Second, give guests a real person to contact. Put a staff member's name and telephone number on the invitation. A generic email address doesn't create the same personal connection."}</P>
        <P>{"Even the wording of an invitation can make a difference."}</P>
        <P>{"For one guest at the larger lunch, we recommended a personal note inviting him to join us at our table. We deliberately avoided language about a complimentary or free seat. There's a difference between making someone feel personally invited and making them feel as though you're trying to fill an empty chair."}</P>
        <Clear />
        <H2>{"Let the people you serve tell the story"}</H2>
        <Figure src={`${IMG}/story.jpg`} alt="Let the people you serve share their stories and the impact of the work" />
        <P>{"This is probably the most important part of the evening."}</P>
        <P>{"If you're not asking people for money, what should they hear?"}</P>
        <P>{"They should hear about the work. More importantly, they should hear from the people whose lives are being changed by it."}</P>
        <P>{"For the smaller reception, the host will open and close the evening. But the real program will feature four or five of the young people the organization serves."}</P>
        <P>{"We want their voices to be at least as prominent as those of the staff members speaking. They'll be prepared, of course, but I don't want their remarks to sound rehearsed or overly polished. Their own experiences are what make the difference."}</P>
        <P>{"We'll also have a few visual reminders of the organization's impact. One display will show what it costs to operate the program at one school for a year. Annual reports will be available, and some of the strongest outcome numbers will appear on the invitation and around the room."}</P>
        <P>{"What won't be there? QR codes, pledge cards or a request to make a gift that evening."}</P>
        <P>{"We're not hiding the fact that the organization needs financial support. We're giving people a chance to understand the work and decide for themselves whether they want to become more involved."}</P>
        <P>{"I've found that people who have the capacity to make significant gifts generally don't need to be pushed into a decision at a reception. They need to understand the opportunity and have a reason to want to learn more."}</P>
        <Clear />
        <H2>{"Pay attention to who sits next to whom"}</H2>
        <Figure src={`${IMG}/seating.jpg`} alt="Seat prospects with board members and program leaders to encourage conversation" />
        <P>{"Seating arrangements are another area where I see organizations miss opportunities."}</P>
        <P>{"At a traditional fundraiser, the priority is often accommodating sponsors and making sure everyone has a place. At a cultivation event, I want to know who is sitting next to whom and why."}</P>
        <P>{"For the larger lunch, we're reducing the number of high-value funder tables from six or seven last year to two or three this year. Those tables will be closer to the front, and each will have a specific purpose."}</P>
        <P>{"One will include prospective corporate sponsors. Another will bring together a few major donor prospects with board members and program staff who can speak knowledgeably and passionately about the mission."}</P>
        <P>{"We also look for opportunities to make introductions that might not happen otherwise. A prospect sitting next to a board member who shares his interests may lead to a conversation that continues well beyond lunch. A program leader can answer questions and offer a perspective that an executive director or development officer might not be able to provide."}</P>
        <P>{"Before the event, make sure everyone hosting a table knows who's coming, why they're there and what kind of conversation would be helpful."}</P>
        <P>{"This isn't about giving board members a list of people to solicit. It's about helping them make connections, ask questions and listen."}</P>
        <Clear />
        <H2>{"Sometimes the best corporate prospect is the one you stop asking for a sponsorship"}</H2>
        <Figure src={`${IMG}/corporate.jpg`} alt="Move from a one-time sponsorship transaction toward a long-term partnership" />
        <P>{"One of the more interesting decisions we've made with a client this fall involves corporate sponsorships."}</P>
        <P>{"There were several companies that had previously declined event sponsorship opportunities. The initial inclination was to approach them again about purchasing a table at the spring fundraiser."}</P>
        <P>{"We recommended a different approach."}</P>
        <P>{"Instead of asking them for another $25,000 event sponsorship, we're inviting them to attend the lunch as guests. The longer-term objective is to develop relationships that could lead to funding of $150,000 or more."}</P>
        <P>{"That's a very different conversation."}</P>
        <P>{"Another company made it clear that transactional sponsorships simply weren't part of its giving strategy. Rather than continue sending sponsorship proposals, we moved the company into a cultivation track. The next step is an invitation and a conversation over coffee, not another sponsorship deck."}</P>
        <P>{"This is worth remembering. Companies don't all approach philanthropy the same way. Some like event sponsorships. Others want to support programs, invest in communities or develop longer-term partnerships."}</P>
        <P>{"If a company keeps saying no to the sponsorship opportunity, it may be time to stop asking the same question."}</P>
        <P>{"Find out what kind of relationship they actually want to have with your organization."}</P>
        <Clear />
        <H2>{"What happens after the event matters just as much as the event itself"}</H2>
        <Figure src={`${IMG}/follow-up.jpg`} alt="Follow up within a week: assign an owner, record what you learn, and agree on a next step" />
        <P>{"I can't emphasize this enough. Don't wait until the event is over to figure out what you're going to do next."}</P>
        <P>{"Before the first guest arrives, everyone on the team should know who is responsible for following up with the most important prospects."}</P>
        <P>{"My recommendations are straightforward:"}</P>
        <ul className="mt-6 list-disc space-y-3 pl-5 marker:text-[rgb(var(--brass))]">
          <li className="pl-2 text-lg leading-relaxed text-[rgb(var(--ink))]/70">{"Assign each priority guest to a specific staff or board member before the event."}</li>
          <li className="pl-2 text-lg leading-relaxed text-[rgb(var(--ink))]/70">{"Make a personal call or arrange a meeting within a week."}</li>
          <li className="pl-2 text-lg leading-relaxed text-[rgb(var(--ink))]/70">{"Record what you learned while it's still fresh. Who did the guest speak with? What questions did they ask? What seemed to interest them?"}</li>
          <li className="pl-2 text-lg leading-relaxed text-[rgb(var(--ink))]/70">{"Identify a next step for each important guest. That might be a program tour, a coffee meeting, a visit with the executive director or a conversation about a particular project."}</li>
          <li className="pl-2 text-lg leading-relaxed text-[rgb(var(--ink))]/70">{"Follow up with people who declined the invitation, too. They may still be interested in learning more."}</li>
        </ul>
        <P>{"We recently attended a large networking event where about half the room left before the closing speaker. It was a good reminder that you can't assume everyone will stay until the end or that the most important conversations will happen during the formal program."}</P>
        <P>{"Our team followed up afterward with personal emails and LinkedIn messages to people we'd met. We referenced the conversations we'd actually had rather than sending a generic thank-you."}</P>
        <P>{"That's the kind of follow-up I want to see after a cultivation event."}</P>
        <Clear />
        <H2>{"Before you start planning, ask yourself one question"}</H2>
        <Figure src={`${IMG}/question.jpg`} alt="Decide whether the event is meant to raise money tonight or build a relationship" />
        <P>{"Are you trying to raise money that night, or are you trying to build relationships with people who could make a significant investment in your mission?"}</P>
        <P>{"There is nothing wrong with either objective. But they require different approaches."}</P>
        <P>{"If you're planning a cultivation event, spend your time identifying the right guests, making personal invitations, creating opportunities for meaningful conversations and deciding who will follow up afterward."}</P>
        <P>{"Don't worry about whether you raised money that evening. Pay attention to whether the people you wanted to reach left with a better understanding of your organization and a reason to stay connected."}</P>
        <P>{"And make sure someone on your team picks up the phone the following week."}</P>
        <P>{"That's how a small reception or a well-planned lunch can become the beginning of a major donor relationship."}</P>
        <P>{"Want to talk about how cultivation events fit into your major gift strategy? Connect with our team at "}<a href="https://go.catapultfr.com/meetings/anthonya" className="font-semibold text-[rgb(var(--navy))] underline">go.catapultfr.com/meetings/anthonya</a>{"."}</P>
        <Clear />
        <p className="mt-10 text-sm leading-relaxed text-[rgb(var(--ink))]/50">
          Photo: <a href="https://www.pexels.com/photo/elegant-indoor-gathering-with-smiling-guests-35688741/" className="underline">Filip Rankovic Grobgaard / Pexels</a>.
        </p>
      </article>
      <CtaBand />
    </>
  );
}
