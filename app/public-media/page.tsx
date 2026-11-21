import type { Metadata } from "next";
import Image from "next/image";
import { ArrowRight, ClipboardList, Headphones, HeartHandshake, MessageCircle, Search, Users } from "lucide-react";
import { PageHero } from "@/components/page-hero";
import { ClientLogo } from "@/components/client-logo";
import comparison from "./comparison.json";
import styles from "./public-media.module.css";

const TITLE = "Beyond Membership. Toward Major Gifts. | Catapult Fundraising";
const DESCRIPTION = "Personal donor engagement, prospect research, coaching and training for public media development teams. Build the relationships behind your station’s next major gifts.";
const CTA = "Schedule a 20-minute conversation.";
const BOOKING_URL = "https://go.catapultfr.com/meetings/jeff-grandy?uuid=c244f9ea-42be-4acb-88ff-83abefb9b1c6";
const BOOKING_NOTE = "Jeff’s calendar currently offers 30-, 45- and 60-minute slots.";
const HERO = "/services/board-development/hero-board-meeting.jpg";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  // Approval draft: deliberately absent from navigation and sitemap.
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
  alternates: { canonical: "/public-media" },
  openGraph: { title: TITLE, description: DESCRIPTION, type: "website", url: "/public-media", images: [{ url: HERO, width: 1568, height: 882, alt: "A thoughtful conversation around a meeting table" }] },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION, images: [HERO] },
};

// Station names supplied by Jeff Grandy in his November 20, 2026 page brief.
// This roster makes no program-specific outcome or testimonial claims.
const PARTNERS = [
  { src: "/public-media/rocky-mountain-public-media.png", alt: "Rocky Mountain Public Media", width: 1513, height: 352 },
  { src: "/public-media/wucf.png", alt: "WUCF", width: 120, height: 37 },
  { src: "/clients/pbs-kvie.svg", alt: "PBS KVIE", width: 93619, height: 21600 },
  { src: "/public-media/pbs-socal.svg", alt: "PBS SoCal", width: 164, height: 36 },
  { src: "/public-media/vegas-pbs.png", alt: "Vegas PBS", width: 200, height: 45 },
  { src: "/public-media/wlrn.png", alt: "WLRN", width: 600, height: 467 },
  { src: "/public-media/wpbs.png", alt: "WPBS", width: 272, height: 51 },
];
const JOURNEY = [
  { Icon: Headphones, title: "Listen", detail: "Personal donor outreach" },
  { Icon: ClipboardList, title: "Document", detail: "Interests & giving signals" },
  { Icon: HeartHandshake, title: "Connect", detail: "Personal relationship building" },
  { Icon: MessageCircle, title: "Cultivate & ask", detail: "Catapult-led donor conversations" },
];
const SUPPORT = [
  { Icon: Search, title: "Major Gift Prospect Research", body: "In-depth donor profiles help your station identify and prioritize its strongest major gift prospects." },
  { Icon: MessageCircle, title: "Fundraising Coaching", body: "Practical guidance prepares your development team for donor conversations, cultivation and solicitation." },
  { Icon: Users, title: "Board and Staff Training", body: "Build confidence with Everyone is a Fundraiser, Making The Ask, and What to Say When." },
];

function ConversationLink() {
  return <a className={styles.cta} href={BOOKING_URL} target="_blank" rel="noopener noreferrer">{CTA}<ArrowRight size={19} aria-hidden="true" /></a>;
}

export default function PublicMediaPage() {
  return (
    <div className={styles.page}>
      <PageHero eyebrow="Public media · Donor engagement" title="Beyond Membership. Toward Major Gifts." description="Hands-on donor engagement for PBS and NPR station development teams." />

      <section className={styles.hero} aria-labelledby="public-media-title">
        <div className={`${styles.wrap} ${styles.heroGrid}`}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>Build on your members’ loyalty</p>
            <h2 id="public-media-title">Your members believe in your mission.<br /><span>Let’s build on that relationship.</span></h2>
            <p className={styles.intro}>Catapult helps PBS and NPR station development teams turn loyal support into deeper donor relationships, with personal engagement and qualified prospects for your major gift officers.</p>
            <ConversationLink />
            <p className={styles.ctaNote}>Connect with Jeff Grandy, Vice President for Client Development.<br />{BOOKING_NOTE}</p>
          </div>
          <figure className={styles.heroFigure}>
            <div className={styles.photoFrame}>
              <Image src={HERO} alt="Professionals listening and taking notes during a conversation around a table" fill priority sizes="(min-width: 1024px) 48vw, 100vw" className={styles.photo} />
            </div>
            <figcaption>Personal conversations.<br /><strong>Stronger donor relationships.</strong></figcaption>
          </figure>
        </div>
      </section>

      <section className={styles.partners} aria-label="Public media partnerships">
        <div className={styles.wrap}>
          <p className={styles.eyebrow}>Our public media partnerships include</p>
          <ul>{PARTNERS.map((partner) => <li key={partner.alt} className={["WLRN", "PBS SoCal"].includes(partner.alt) ? styles.darkLogo : undefined}><ClientLogo logo={partner} maxW={145} maxH={52} eager /></li>)}</ul>
        </div>
      </section>

      <section className={styles.engagement} aria-labelledby="engagement-title">
        <div className={styles.wrap}>
          <div className={styles.sectionHeading}>
            <p className={styles.eyebrow}>The work between membership and major gifts</p>
            <h2 id="engagement-title">We do the engagement.<br />And help your station build a stronger pipeline.</h2>
            <p>Our Engagement Officers carry out the outreach, document donor interests, cultivate relationships and make asks within the engagement program. We coordinate qualified major-gift prospects with your team.</p>
          </div>
          <figure className={styles.journey} aria-labelledby="journey-caption">
            <figcaption id="journey-caption">From loyal member to a more personal relationship</figcaption>
            <ol>
              {JOURNEY.map(({ Icon, title, detail }, index) => (
                <li key={title}>
                  <span className={styles.stepNumber}>0{index + 1}</span>
                  <Icon size={60} strokeWidth={1.4} aria-hidden="true" />
                  <h3>{title}</h3>
                  <p>{detail}</p>
                  {index < 3 && <ArrowRight className={styles.journeyArrow} size={23} aria-hidden="true" />}
                </li>
              ))}
            </ol>
            <div className={styles.ownership}><span>Catapult: engagement, cultivation & asks</span><span>Qualified major-gift handoffs to your team</span></div>
          </figure>
        </div>
      </section>

      <section className={styles.offerings} aria-labelledby="offerings-title">
        <div className={`${styles.wrap} ${styles.offerGrid}`}>
          <div className={styles.offeringIntro}>
            <p className={styles.eyebrow}>Four ways we support your team</p>
            <h2 id="offerings-title">More capacity.<br />More personal connection.</h2>
            <p>Bring hands-on engagement and practical fundraising support to the work your station is already doing.</p>
            <div className={styles.featured}>
              <Headphones size={37} strokeWidth={1.5} aria-hidden="true" />
              <h3>Mid-Level Donor Engagement</h3>
              <p>Our Engagement Officers personally connect with donors, learn their interests, provide ongoing stewardship and identify opportunities for increased giving.</p>
            </div>
          </div>
          <div className={styles.supportList}>
            {SUPPORT.map(({ Icon, title, body }) => <article key={title}>
              <Icon size={33} strokeWidth={1.5} aria-hidden="true" />
              <div><h3>{title}</h3><p>{body}</p></div>
            </article>)}
          </div>
        </div>
      </section>

      <section className={styles.clientProof} aria-labelledby="kvie-proof-title">
        <div className={styles.wrap}>
          <p className={styles.eyebrow} id="kvie-proof-title">Public media experience: Legacy Call at PBS KVIE</p>
          <figure>
            <div className={styles.quoteLogo}><ClientLogo logo={PARTNERS[2]} maxW={185} maxH={60} /></div>
            <blockquote>“Thanks to Legacy Call, we were able to reach out to a wider audience of potential donors. The response was incredible. Not only did we secure several new planned gifts, but we also identified a pool of prospective donors.”</blockquote>
            <figcaption><strong>Colleen Schulman, CFRE, CSPG</strong><br />Chief Philanthropy Officer, PBS KVIE</figcaption>
          </figure>
        </div>
      </section>

      <section className={styles.comparison} aria-labelledby="comparison-title">
        <div className={styles.wrap}>
          <p className={styles.eyebrow}>Catapult & Veritus Group</p>
          <h2 id="comparison-title">{comparison.title}</h2>
          <p className={styles.comparisonIntro}>{comparison.intro}</p>
          <div className={styles.comparisonTable} role="table" aria-label="Catapult and Veritus Group published service models">
            <div className={styles.comparisonHead} role="row">
              <div role="columnheader">Capability</div><div role="columnheader">Catapult</div><div role="columnheader">Veritus Group</div>
            </div>
            {comparison.rows.map((row) => <div className={styles.comparisonRow} role="row" key={row.capability}>
              <div role="rowheader">{row.capability}</div>
              <div role="cell"><span className={styles.mobileCompany}>Catapult</span>{row.catapult}</div>
              <div role="cell"><span className={styles.mobileCompany}>Veritus Group</span>{row.veritus}</div>
            </div>)}
          </div>
          <p className={styles.comparisonNote}>{comparison.note}</p>
          <p className={styles.sourceLinks}>Sources: {comparison.sources.map((source, index) => <span key={source.url}>{index > 0 && " · "}<a href={source.url} target="_blank" rel="noopener noreferrer">{source.label}</a></span>)}</p>
        </div>
      </section>

      <section className={styles.closing} aria-labelledby="closing-title">
        <div className={styles.wrap}>
          <p className={styles.eyebrow}>Let’s talk about your station</p>
          <h2 id="closing-title">Who’s ready for a deeper conversation?</h2>
          <p>Tell us about your members, your development team and where you want your major gift pipeline to go.</p>
          <ConversationLink />
          <p className={styles.ctaNote}>{BOOKING_NOTE}</p>
        </div>
      </section>
    </div>
  );
}
