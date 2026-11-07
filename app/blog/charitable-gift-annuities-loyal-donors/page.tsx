import Link from "next/link";
import Image from "next/image";
import { Fragment, type ReactNode } from "react";
import { PageHero } from "@/components/page-hero";
import { CtaBand } from "@/components/cta-band";
import { ShareButtons } from "@/components/share-buttons";
import article from "./article-content.json";

const SITE_URL = "https://www.catapultfr.com";
const SLUG = "charitable-gift-annuities-loyal-donors";
const IMG = `/blog/${SLUG}`;
const DATE = "2026-11-06";
const DESCRIPTION = "Anthony Alonso and Diane Tuntland on finding CGA prospects with Catapult’s calling services and building a sustainable program with Endowment Partners.";
const GRAPHICS: Record<string, { file: string; alt: string }> = {
  "Lifetime Promise": { file: "graphic-lifetime-promise.jpg", alt: "A gift today, fixed lifetime payments and future mission support, subject to the gift agreement." },
  "Loyalty Signals": { file: "graphic-loyalty-signals.jpg", alt: "Look at years of giving, gift frequency, lifetime support and mission involvement." },
  "Catapult Calling": { file: "graphic-catapult-calling.jpg", alt: "Review the donor file, thank and qualify interest, connect with a specialist, and follow through and steward." },
  "Endowment Services": { file: "graphic-endowment-services.jpg", alt: "Endowment Partners supports program design, investment management, payments and reporting, and ongoing administration." },
  "Fit Review": { file: "graphic-fit-review.jpg", alt: "Assess donor opportunity, staff capacity, program costs and financial readiness before committing." },
};

export const metadata = {
  title: { absolute: "Charitable Gift Annuities: Start With Loyal Donors | Catapult" },
  description: DESCRIPTION,
  keywords: ["charitable gift annuity", "CGA calling services", "planned giving donor outreach", "gift annuity administration", "Endowment Partners"],
  alternates: { canonical: `/blog/${SLUG}` },
  openGraph: {
    type: "article",
    title: article.title,
    description: DESCRIPTION,
    url: `${SITE_URL}/blog/${SLUG}`,
    publishedTime: DATE,
    images: [{ url: `${SITE_URL}${IMG}/og-cga.jpg`, width: 1200, height: 630, alt: article.title }],
  },
  twitter: { card: "summary_large_image", title: article.title, description: DESCRIPTION, images: [`${SITE_URL}${IMG}/og-cga.jpg`] },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  headline: article.title,
  datePublished: DATE,
  dateModified: DATE,
  description: DESCRIPTION,
  image: `${SITE_URL}${IMG}/og-cga.jpg`,
  author: {
    "@type": "Person", name: "Anthony R. Alonso", jobTitle: "President and CEO",
    url: `${SITE_URL}/our-team`, worksFor: { "@id": `${SITE_URL}/#organization` },
  },
  contributor: { "@type": "Person", name: "Diane Tuntland", url: "https://www.endowmentpartners.com/about-us" },
  publisher: {
    "@type": "Organization", name: "Catapult Fundraising",
    logo: { "@type": "ImageObject", url: "https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/3b507e74-308f-4ba5-aaac-554b31247f7e.png" },
  },
  mainEntityOfPage: `${SITE_URL}/blog/${SLUG}`,
};

// Reuse the existing article's typography and floated 4:3 / 3:2 figures.
function Figure({ src, alt, hero = false }: { src: string; alt: string; hero?: boolean }) {
  return (
    <figure className="mb-6 mt-6 w-full shrink-0 sm:float-right sm:mb-4 sm:ml-8 sm:w-72 md:w-80">
      <div className={`relative ${hero ? "aspect-[4/3]" : "aspect-[3/2]"} w-full overflow-hidden rounded-2xl`}>
        <Image src={src} alt={alt} fill className="object-cover" sizes="(min-width: 768px) 320px, 100vw" priority={hero} />
      </div>
      {hero && <figcaption className="mt-2 text-xs leading-relaxed text-[rgb(var(--ink))]/60">{article.hero_caption}</figcaption>}
    </figure>
  );
}

function P({ children }: { children: ReactNode }) {
  return <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--ink))]/70">{children}</p>;
}

function InlineLinks({ text }: { text: string }) {
  const parts = text.split(/(\[[^\]]+\]\([^)]+\))/g);
  return <>{parts.map((part, i) => {
    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    return link ? <a key={i} href={link[2]} className="underline decoration-[rgb(var(--brass))]/60 underline-offset-4 hover:decoration-[rgb(var(--brass))]">{link[1]}</a> : <Fragment key={i}>{part}</Fragment>;
  })}</>;
}

function WebinarReplay() {
  return (
    <figure className="clear-both my-10" aria-label="Watch the webinar">
      <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-[rgb(var(--navy))] shadow-sm">
        <video className="absolute inset-0 h-full w-full object-contain" controls playsInline preload="metadata"
          poster={`${IMG}/webinar-poster.jpg`}
          aria-label="Turning Donor Relationships into Charitable Gift Annuities, Anthony Alonso and Diane Tuntland">
          <source src={`${IMG}/cga-webinar-replay.mp4`} type="video/mp4" />
          Your browser does not support embedded video. <a href={`${IMG}/cga-webinar-replay.mp4`}>Open the webinar recording</a>.
        </video>
      </div>
      <figcaption className="mt-3 text-sm leading-relaxed text-[rgb(var(--ink))]/60">
        Anthony Alonso and Diane Tuntland · 64 minutes. Recorded November 4, 2026.
      </figcaption>
    </figure>
  );
}

export default function CharitableGiftAnnuitiesPost() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <PageHero eyebrow="Insights" title={article.title} description={article.dek} />
      <article className="mx-auto max-w-4xl px-6 py-14 lg:px-10 lg:py-16">
        <ShareButtons url={`/blog/${SLUG}`} title={article.title} />
        <p className="text-sm font-semibold uppercase tracking-wider text-[rgb(var(--brass))]">{article.byline}</p>
        <Figure src={`${IMG}/hero-susan.jpg`} alt="Original photograph used to portray Susan, the illustrative donor in the CGA webinar" hero />
        {article.blocks.map(([kind, text], i) => {
          if (kind === "h2") return <Fragment key={i}><div className="clear-both" /><h2 className="mt-12 font-display text-3xl text-[rgb(var(--navy))] sm:text-[34px]">{text}</h2></Fragment>;
          if (kind === "graphic") {
            const graphic = GRAPHICS[text];
            return <Figure key={i} src={`${IMG}/${graphic.file}`} alt={graphic.alt} />;
          }
          if (kind === "video") return <WebinarReplay key={i} />;
          return <P key={i}><InlineLinks text={text} /></P>;
        })}
        <div className="clear-both" />
        <div className="mt-10 grid gap-6 rounded-2xl border border-[rgb(var(--line))] bg-white/60 p-6 sm:grid-cols-2">
          {article.service_ctas.map((cta) => (
            <section key={cta.url}>
              <h3 className="font-display text-2xl text-[rgb(var(--navy))]"><a href={cta.url} className="underline decoration-[rgb(var(--brass))]/60 underline-offset-4">{cta.label}</a></h3>
              <p className="mt-3 text-base leading-relaxed text-[rgb(var(--ink))]/70">{cta.description}</p>
              <a href={cta.url} className="mt-5 inline-flex rounded-full bg-[rgb(var(--navy))] px-5 py-3 text-sm font-semibold text-[rgb(var(--paper))]">Start a conversation</a>
              <p className="mt-4 text-sm"><Link href={cta.secondary_url} className="underline underline-offset-4">{cta.secondary_label}</Link></p>
            </section>
          ))}
        </div>
      </article>
      <CtaBand />
    </>
  );
}
