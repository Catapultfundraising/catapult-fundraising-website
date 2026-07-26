import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/page-hero";

export const metadata: Metadata = {
  title: "SMS Terms & Conditions",
  description:
    "Catapult Fundraising, Inc.'s SMS Terms & Conditions: message frequency, opt-out and help instructions, and message/data rate disclosures.",
  alternates: { canonical: "/sms-terms" },
};

export default function SmsTermsPage() {
  return (
    <>
      <PageHero
        eyebrow="Legal"
        title="SMS Terms & Conditions"
        description="What to expect when you opt in to receive SMS messages from Catapult Fundraising, Inc."
      />
      <section className="mx-auto max-w-3xl px-6 py-16 lg:px-10">
        <div className="prose prose-neutral max-w-none space-y-10 text-[rgb(var(--ink))] [&_h2]:mt-10 [&_p]:mt-4 [&_p:first-child]:mt-0">
          <p className="text-sm text-[rgb(var(--ink))]/60">Effective Date: June 23, 2026</p>

          <p>
            By providing your mobile number and opting in to receive SMS messages from Catapult
            Fundraising Inc, you agree to receive conversational messages from us.
          </p>

          <div>
            <h2 className="font-display text-2xl">Message Frequency</h2>
            <p>Message frequency may vary. On average, you may receive 1&ndash;2 messages per month.</p>
          </div>

          <div>
            <h2 className="font-display text-2xl">Opt-Out Instructions</h2>
            <p>You can opt out of receiving SMS messages at any time by replying:</p>
            <p className="font-display text-xl tracking-widest">STOP</p>
            <p>After opting out, you may receive one final confirmation message.</p>
          </div>

          <div>
            <h2 className="font-display text-2xl">Help Instructions</h2>
            <p>For help, reply:</p>
            <p className="font-display text-xl tracking-widest">HELP</p>
            <p>You may also contact us using the information provided in our Privacy Policy.</p>
          </div>

          <div>
            <h2 className="font-display text-2xl">Privacy Policy</h2>
            <p>
              <Link href="/data-privacy" className="underline underline-offset-2">
                https://www.catapultfr.com/data-privacy
              </Link>
            </p>
          </div>

          <div>
            <h2 className="font-display text-2xl">Message and Data Rates</h2>
            <p>Message and data rates may apply depending on your mobile carrier plan.</p>
          </div>
        </div>
      </section>
    </>
  );
}
