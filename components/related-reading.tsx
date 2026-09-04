import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { ANSWERS, type Answer } from "@/lib/answers";
import { POSTS, type Post } from "@/lib/posts";

interface RelatedReadingProps {
  /** Heading for the block. */
  heading?: string;
  intro?: string;
  /** Article slugs to feature, in order. Falls back to service/pillar matching. */
  postSlugs?: string[];
  /** Service key (e.g. "capital-campaign") used to pick matching articles. */
  service?: string;
  /** Answer-library pillars whose questions should be linked. */
  pillars?: string[];
  /** Specific answer slugs to link, in order (overrides pillars). */
  answerSlugs?: string[];
  /** Max answer links shown. */
  answerLimit?: number;
}

/**
 * Internal linking block: puts real, crawlable links from important pages
 * (homepage, service pages) to individual articles and /answers questions.
 * Those pages were previously orphaned, reachable only from /blog and
 * /answers, which is why they picked up impressions but no rankings.
 */
export function RelatedReading({
  heading = "Keep reading",
  intro,
  postSlugs,
  service,
  pillars,
  answerSlugs,
  answerLimit = 6,
}: RelatedReadingProps) {
  let posts: Post[] = [];
  if (postSlugs?.length) {
    posts = postSlugs
      .map((slug) => POSTS.find((p) => p.slug === slug))
      .filter((p): p is Post => Boolean(p));
  } else if (service) {
    posts = POSTS.filter((p) => p.services.includes(service)).slice(0, 3);
  } else if (pillars?.length) {
    posts = POSTS.filter((p) => p.pillars.some((x) => pillars.includes(x))).slice(0, 3);
  }

  let answers: Answer[] = [];
  if (answerSlugs?.length) {
    answers = answerSlugs
      .map((slug) => ANSWERS.find((a) => a.slug === slug))
      .filter((a): a is Answer => Boolean(a));
  } else if (pillars?.length) {
    answers = ANSWERS.filter((a) => pillars.includes(a.pillar));
  } else {
    answers = ANSWERS;
  }
  answers = answers.slice(0, answerLimit);

  if (posts.length === 0 && answers.length === 0) return null;

  return (
    <section className="border-t border-[rgb(var(--line))] bg-[rgb(var(--paper))] py-14 lg:py-16">
      <div className="mx-auto max-w-5xl px-6 lg:px-10">
        <p className="font-display text-xl uppercase tracking-[0.25em] text-[rgb(var(--brass))] sm:text-[22.5px]">
          Related Reading
        </p>
        <h2 className="mt-4 max-w-3xl font-display text-4xl tracking-tight text-[rgb(var(--navy))] sm:text-5xl">
          {heading}
        </h2>
        {intro ? (
          <p className="mt-6 max-w-3xl text-lg leading-relaxed text-[rgb(var(--ink))]/70">{intro}</p>
        ) : null}

        {posts.length > 0 ? (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="group flex flex-col overflow-hidden rounded-2xl border border-[rgb(var(--line))] bg-white transition-colors hover:border-[rgb(var(--brass))]"
              >
                <div className="relative aspect-[3/2] w-full overflow-hidden">
                  <Image
                    src={post.image}
                    alt={post.alt}
                    fill
                    sizes="(max-width: 640px) 100vw, 320px"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <p className="text-sm font-semibold uppercase tracking-wider text-[rgb(var(--brass))]">
                    {post.readTime}
                  </p>
                  <h3 className="mt-3 font-display text-xl leading-snug text-[rgb(var(--navy))]">
                    {post.title}
                  </h3>
                  <span className="mt-auto pt-5 inline-flex items-center gap-2 text-sm font-semibold text-[rgb(var(--navy))]">
                    Read the article
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : null}

        {posts.length > 0 ? (
          <Link
            href="/blog"
            className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-[rgb(var(--navy))] underline decoration-[rgb(var(--brass))]/60 underline-offset-8 hover:text-[rgb(var(--brass))]"
          >
            Read all articles
            <ArrowRight className="h-4 w-4" />
          </Link>
        ) : null}

        {answers.length > 0 ? (
          <div className="mt-12">
            <h3 className="font-display text-2xl text-[rgb(var(--navy))]">
              Questions we answer in full
            </h3>
            <div className="mt-2 h-[2px] w-14 bg-[rgb(var(--brass))]" />
            <ul className="mt-6 grid gap-4 sm:grid-cols-2">
              {answers.map((a) => (
                <li key={a.slug}>
                  <Link
                    href={`/answers/${a.slug}`}
                    className="group flex items-start gap-3 leading-snug text-[rgb(var(--navy))]/85 hover:text-[rgb(var(--navy))]"
                  >
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[rgb(var(--brass))]" />
                    <span className="underline decoration-[rgb(var(--brass))]/40 decoration-2 underline-offset-4 group-hover:decoration-[rgb(var(--brass))]">
                      {a.question}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <Link
              href="/answers"
              className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-[rgb(var(--navy))] underline decoration-[rgb(var(--brass))]/60 underline-offset-8 hover:text-[rgb(var(--brass))]"
            >
              Browse all fundraising questions
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : null}
      </div>
    </section>
  );
}
