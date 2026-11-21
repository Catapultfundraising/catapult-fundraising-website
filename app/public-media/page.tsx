import type { Metadata } from "next";
import Image from "next/image";
import { ArrowRight, ClipboardList, Headphones, HeartHandshake, MessageCircle, Search, Users } from "lucide-react";
import styles from "./public-media.module.css";

const TITLE = "Beyond Membership. Toward Major Gifts. | Catapult Fundraising";
const DESCRIPTION = "Personal donor engagement, prospect research, coaching and training for public media development teams. Build the relationships behind your station’s next major gifts.";
const CTA = "Schedule a 20-minute conversation.";
const REQUEST_URL = `mailto:jeffg@catapultfr.com?subject=${encodeURIComponent("Request a 20-minute public media conversation")}&body=${encodeURIComponent("Hi Jeff,\n\nI’d like to schedule a 20-minute conversation about our station’s donor engagement and major gift pipeline.\n\nStation:\nA few times that work for me:\n\nThank you!")}`;
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
const PARTNERS = ["Rocky Mountain Public Media", "WUCF", "KVIE", "PBS SoCal", "Vegas PBS", "WLRN", "WPBS"];
const JOURNEY = [
  { Icon: Headphones, title: "Listen", detail: "Personal donor outreach" },
  { Icon: ClipboardList, title: "Document", detail: "Interests & giving signals" },
  { Icon: HeartHandshake, title: "Connect", detail: "Qualified prospect handoff" },
  { Icon: MessageCircle, title: "Cultivate & ask", detail: "Led by your station" },
];
const SUPPORT = [
  { Icon: Search, title: "Major Gift Prospect Research", body: "In-depth donor profiles help your station identify and prioritize its strongest major gift prospects." },
  { Icon: MessageCircle, title: "Fundraising Coaching", body: "Practical guidance prepares your development team for donor conversations, cultivation and solicitation." },
  { Icon: Users, title: "Board and Staff Training", body: "Build confidence with Everyone is a Fundraiser, Making The Ask, and What to Say When." },
];

function ConversationLink() {
  return <a className={styles.cta} href={REQUEST_URL}>{CTA}<ArrowRight size={19} aria-hidden="true" /></a>;
}

export default function PublicMediaPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.wrap}>
          <Image src="/public-media/catapult-logo.png" alt="Catapult Fundraising" width={720} height={169} priority sizes="245px" className={styles.logo} />
          <span className={styles.headerLabel}>For public media</span>
        </div>
      </header>

      <section className={styles.hero} aria-labelledby="public-media-title">
        <div className={`${styles.wrap} ${styles.heroGrid}`}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>Public media · Donor engagement</p>
            <h1 id="public-media-title">Beyond Membership.<br /><span>Toward Major Gifts.</span></h1>
            <p className={styles.lead}>Your members believe in your mission.<br className={styles.desktopBreak} /> Let’s build on that relationship.</p>
            <p className={styles.intro}>Catapult helps PBS and NPR station development teams turn loyal support into deeper donor relationships—with personal engagement and qualified prospects for your major gift officers.</p>
            <ConversationLink />
            <p className={styles.ctaNote}>Connect with Jeff Grandy, Vice President.<br />Opens an email to request a time.</p>
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
          <ul>{PARTNERS.map((partner) => <li key={partner}>{partner}</li>)}</ul>
        </div>
      </section>

      <section className={styles.engagement} aria-labelledby="engagement-title">
        <div className={styles.wrap}>
          <div className={styles.sectionHeading}>
            <p className={styles.eyebrow}>The work between membership and major gifts</p>
            <h2 id="engagement-title">We do the engagement.<br />Your station builds on what we learn.</h2>
            <p>Our Engagement Officers carry out the outreach, document donor interests and help move qualified prospects to your major gift officers. Your team leads cultivation and makes the major-gift ask.</p>
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
            <div className={styles.ownership}><span>Catapult: engagement, insight & handoff</span><span>Your station: relationship & ask</span></div>
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

      <section className={styles.closing} aria-labelledby="closing-title">
        <div className={styles.wrap}>
          <p className={styles.eyebrow}>Let’s talk about your station</p>
          <h2 id="closing-title">Who’s ready for a deeper conversation?</h2>
          <p>Tell us about your members, your development team and where you want your major gift pipeline to go.</p>
          <ConversationLink />
          <p className={styles.ctaNote}>Email Jeff Grandy to find a time that works.</p>
        </div>
      </section>
      <footer className={styles.footer}><div className={styles.wrap}><span>Catapult Fundraising</span><span>Growing your donor base at every stage of the giving journey.</span></div></footer>
    </div>
  );
}
