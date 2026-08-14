import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft, User, Building2, Landmark } from "lucide-react";
import { ResearchProfileForm } from "@/components/research-profile-form";

export const metadata = {
  title: "New Research Profile | Catapult Fundraising",
  robots: { index: false, follow: false },
};

const TYPES = [
  {
    href: "/research/new/individual",
    icon: User,
    title: "Individual",
    description:
      "A full donor/prospect profile: wealth summary, biographical detail, giving history, real estate, boards, and more.",
  },
  {
    href: "/research/new/corporate",
    icon: Building2,
    title: "Corporate",
    description:
      "A company profile: overview, financials, giving history to the client, Key People, and Company Foundation details.",
  },
  {
    href: "/research/new/foundation",
    icon: Landmark,
    title: "Foundation",
    description:
      "A grantmaking foundation profile: mission, program areas, Executives, application process, and selected grants.",
  },
] as const;

function TypeChooser() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-14 lg:px-10 lg:py-16">
      <Link
        href="/research"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[rgb(var(--ink))]/50 hover:text-[rgb(var(--navy))]"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        My Profiles
      </Link>

      <p className="mt-3 text-[13px] font-semibold uppercase tracking-wider text-[rgb(var(--brass))]">
        Internal Tool
      </p>
      <h1 className="mt-1 font-display text-3xl text-[rgb(var(--navy))]">New Research Profile</h1>
      <p className="mt-3 text-sm leading-relaxed text-[rgb(var(--ink))]/60">
        Choose which kind of profile you&rsquo;re building. Each type has its own tailored field set,
        but shares the same Catapult Fundraising branding once generated as a PDF.
      </p>

      <div className="mt-8 grid gap-5 sm:grid-cols-3">
        {TYPES.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="group flex flex-col rounded-2xl border border-[rgb(var(--line))] p-6 transition-colors hover:border-[rgb(var(--brass))]"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[rgb(var(--brass))]/10 text-[rgb(var(--brass))]">
              <t.icon className="h-5 w-5" />
            </div>
            <p className="mt-4 font-display text-xl text-[rgb(var(--navy))]">{t.title}</p>
            <p className="mt-2 text-sm leading-relaxed text-[rgb(var(--ink))]/60">{t.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

// Every profile saved before Corporate/Foundation existed is an Individual
// profile, so a bare "?id=..." link (old bookmarks, other pages' links)
// must keep opening the Individual editor directly rather than showing the
// chooser -- otherwise those existing links would silently break.
// Next.js 15: `searchParams` on a page is a Promise and must be awaited.
export default async function ResearchNewPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const params = await searchParams;
  return (
    <Suspense fallback={null}>
      {params?.id ? <ResearchProfileForm /> : <TypeChooser />}
    </Suspense>
  );
}
