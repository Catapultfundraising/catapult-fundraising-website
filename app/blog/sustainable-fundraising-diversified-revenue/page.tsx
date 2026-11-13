import Link from "next/link";
import Image from "next/image";
import { Fragment, type ReactNode } from "react";
import { PageHero } from "@/components/page-hero";
import { CtaBand } from "@/components/cta-band";
import { ShareButtons } from "@/components/share-buttons";
import article from "./article-content.json";

const SITE_URL = "https://www.catapultfr.com";
const SLUG = "sustainable-fundraising-diversified-revenue";
const IMG = `/blog/${SLUG}`;
const DATE = "2026-11-17";
const DESCRIPTION = "Anthony R. Alonso shares Nexus panel insights on diversified revenue, individual donor relationships and corporate partnerships for sustainable fundraising.";
const GRAPHICS: Record<string, { file: string; alt: string }> = {
  "Funding mix": { file: "funding-mix.png", alt: "Review revenue concentration, plan ahead and build a broader funding base." },
  "Donor path": { file: "donor-path.png", alt: "Give individual donors a path to deeper involvement through personal relationships." },
  "Partnerships": { file: "partnerships.png", alt: "Build corporate partnerships around shared priorities and a clear next step." },
};

export const metadata = {
  title: { absolute: "Sustainable Fundraising: Diversified Revenue | Catapult" },
  description: DESCRIPTION,
  keywords: ["sustainable fundraising", "diversified nonprofit revenue", "individual giving", "corporate partnerships", "Nexus Marketing"],
  alternates: { canonical: `/blog/${SLUG}` },
  openGraph: {
    type: "article",
    title: article.title,
    description: DESCRIPTION,
    url: `${SITE_URL}/blog/${SLUG}`,
    publishedTime: DATE,
    images: [{ url: `${SITE_URL}${IMG}/social-card.png`, width: 1200, height: 630, alt: article.title }],
  },
  twitter: { card: "summary_large_image", title: article.title, description: DESCRIPTION, images: [`${SITE_URL}${IMG}/social-card.png`] },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  headline: article.title,
  datePublished: DATE,
  dateModified: DATE,
  description: DESCRIPTION,
  image: `${SITE_URL}${IMG}/social-card.png`,
  author: {
    "@type": "Person", name: "Anthony R. Alonso", jobTitle: "President and CEO",
    url: `${SITE_URL}/our-team`, worksFor: { "@id": `${SITE_URL}/#organization` },
  },
  contributor: [
    { "@type": "Person", name: "Heather Nelson", url: "https://www.bridgeraise.com/" },
    { "@type": "Person", name: "Kia Croom", url: "https://kiacroom.com/" },
    { "@type": "Person", name: "Patrice Davis", url: "https://grantwinconsulting.com/" },
    { "@type": "Person", name: "Ron Smith", url: "https://www.vitreogroup.ca/" },
    { "@type": "Person", name: "Andrea Saynes", url: "https://nexusmarketing.com/" },
  ],
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
      <video className="block h-auto w-full" controls playsInline preload="metadata"
        poster={`${IMG}/panel-poster.jpg`}
        aria-label="Sustainable Fundraising: Building Diversified Revenue Streams, Nexus Marketing panel">
        <source src={`${IMG}/nexus-panel-replay-2026-11-13.mp4`} type="video/mp4" />
        Your browser does not support embedded video. <a href={`${IMG}/nexus-panel-replay-2026-11-13.mp4`}>Open the webinar recording</a>.
      </video>
      <figcaption className="mt-3 text-sm leading-relaxed text-[rgb(var(--ink))]/60">
        Nonprofit Growth Summit, presented by Nexus Marketing · Approximately 54 minutes. Recorded November 6, 2026.
        <a href={`${IMG}/nexus-panel-replay-2026-11-13.mp4`} target="_blank" rel="noopener noreferrer"
          className="mt-2 block underline underline-offset-4">Open the recording in a new tab</a>
      </figcaption>
    </figure>
  );
}

export default function SustainableFundraisingPost() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <PageHero eyebrow="Insights" title={article.title} description={article.dek} />
      <article className="mx-auto max-w-4xl px-6 py-14 lg:px-10 lg:py-16">
        <ShareButtons url={`/blog/${SLUG}`} title={article.title} />
        <p className="text-sm font-semibold uppercase tracking-wider text-[rgb(var(--brass))]">{article.byline}</p>
        <Figure src={`${IMG}/panel-hero.jpg`} alt="All six speakers on the Sustainable Fundraising panel, from the original recording" hero />
        {article.blocks.map(([kind, text], i) => {
          if (kind === "h2") return <Fragment key={i}><div className="clear-both" /><h2 className="mt-12 font-display text-3xl text-[rgb(var(--navy))] sm:text-[34px]">{text}</h2></Fragment>;
          if (kind === "h3") return <h3 key={i} className="mt-8 font-display text-2xl text-[rgb(var(--navy))]">{text}</h3>;
          if (kind === "label") return <p key={i} className="mt-8 text-lg font-bold text-[rgb(var(--navy))]">{text}</p>;
          if (kind === "li") return <ul key={i} className="mt-2 list-disc pl-6 text-lg leading-relaxed text-[rgb(var(--ink))]/70"><li><InlineLinks text={text} /></li></ul>;
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
