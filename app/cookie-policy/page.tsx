import type { Metadata } from "next";
import { PageHero } from "@/components/page-hero";
import { FIRM_EMAIL } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Cookie Policy",
  description:
    "How Catapult Fundraising uses cookies on catapultfr.com, what data they capture, and how to manage your preferences.",
  alternates: { canonical: "/cookie-policy" },
};

export default function CookiePolicyPage() {
  return (
    <>
      <PageHero
        eyebrow="Legal"
        title="Cookie Policy"
        description="What cookies this site uses, why, and how you can control them."
      />
      <section className="mx-auto max-w-3xl px-6 py-16 lg:px-10">
        <div className="prose prose-neutral max-w-none space-y-8 text-[rgb(var(--ink))]">
          <p className="text-sm text-[rgb(var(--ink))]/60">
            Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
          </p>

          <div>
            <h2 className="font-display text-2xl">What are cookies?</h2>
            <p>
              Cookies are small text files placed on your device when you visit a website.
              They let a site remember information about your visit, such as your
              preferences and how you found us, and help us understand how visitors use
              catapultfr.com so we can improve it.
            </p>
          </div>

          <div>
            <h2 className="font-display text-2xl">Cookies we use</h2>
            <p>We use two categories of cookies on this site:</p>
            <ul className="list-disc space-y-2 pl-6">
              <li>
                <strong>Necessary cookies</strong> keep the site functioning correctly
                (for example, remembering your cookie preference itself). These are
                always active and cannot be switched off.
              </li>
              <li>
                <strong>Analytics cookies (HubSpot)</strong> are set only if you choose
                "Accept All" in our cookie banner. HubSpot's tracking script records
                pages visited, time on site, referral source, and return visits so we
                can understand how prospective clients find and use our site, and so
                we can follow up appropriately with visitors who submit our contact
                or assessment forms. HubSpot cookies may include <code>hubspotutk</code>,{" "}
                <code>__hstc</code>, and <code>__hssc</code>.
              </li>
            </ul>
          </div>

          <div>
            <h2 className="font-display text-2xl">What we don't do</h2>
            <p>
              We do not use third-party advertising or retargeting cookies, and we do
              not sell visitor data. Information submitted through our contact or
              prospect assessment forms is used only to respond to your inquiry and
              is stored in our HubSpot CRM.
            </p>
          </div>

          <div>
            <h2 className="font-display text-2xl">Managing your preference</h2>
            <p>
              When you first visit, a banner lets you choose "Accept All" or
              "Necessary Only." You can change your choice at any time by clearing
              your browser's cookies for this site and reloading the page, which
              will show the banner again. Most browsers also let you block or delete
              cookies directly in your browser settings.
            </p>
          </div>

          <div>
            <h2 className="font-display text-2xl">Questions</h2>
            <p>
              If you have questions about this policy, contact us at{" "}
              <a href={`mailto:${FIRM_EMAIL}`} className="underline underline-offset-2">
                {FIRM_EMAIL}
              </a>
              .
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
