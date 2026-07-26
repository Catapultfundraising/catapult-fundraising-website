import Link from "next/link";
import Image from "next/image";
import { Phone, Mail, MapPin } from "lucide-react";
import { FIRM_PHONE, FIRM_PHONE_HREF, FIRM_EMAIL, FIRM_ADDRESS_LINES } from "@/lib/constants";

export function SiteFooter() {
  return (
    <footer className="border-t border-[rgb(var(--line))] bg-[rgb(var(--navy))] text-[rgb(var(--paper))]">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-16 lg:grid-cols-5 lg:px-10">
        <div className="lg:col-span-2">
          <Image
            src="https://galaxy-prod.tlcdn.com/gen/user_35qqBV71YqPhG02PJcVxttmFcLs/3b507e74-308f-4ba5-aaac-554b31247f7e.png"
            alt="Catapult Fundraising"
            width={880}
            height={760}
            className="h-64 w-auto"
          />
          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
            <p className="max-w-sm text-sm leading-relaxed text-[rgb(var(--paper))]/70">
              Full-service capital campaign counsel and donor engagement programs
              for nonprofits ready to catapult their giving to the next level,
              from feasibility study through the final pledge.
            </p>
            <Link
              href="/apply"
              className="group inline-flex shrink-0 items-center gap-2 self-start rounded-full bg-[rgb(var(--brass))] px-6 py-3 text-sm font-semibold text-[rgb(var(--navy-deep))] transition-transform hover:scale-[1.02] hover:bg-[rgb(var(--brass-light))]"
            >
              Apply for a Job
            </Link>
          </div>
        </div>

        <div>
          <h3 className="font-display text-base sm:text-lg uppercase tracking-widest text-[rgb(var(--brass-light))]">
            Services
          </h3>
          <ul className="mt-4 space-y-3 text-sm text-[rgb(var(--paper))]/70">
            <li><Link href="/services/capital-campaign" className="hover:text-[rgb(var(--paper))]">Capital Campaign Counsel</Link></li>
            <li><Link href="/services/legacy-giving" className="hover:text-[rgb(var(--paper))]">Legacy &amp; Planned Giving</Link></li>
            <li><Link href="/services/donor-engagement" className="hover:text-[rgb(var(--paper))]">Mid-Level Donor Engagement</Link></li>
            <li><Link href="/services/annual-fund" className="hover:text-[rgb(var(--paper))]">Annual Fund Calling</Link></li>
            <li><Link href="/about" className="hover:text-[rgb(var(--paper))]">About Catapult</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="font-display text-base sm:text-lg uppercase tracking-widest text-[rgb(var(--brass-light))]">
            Insights
          </h3>
          <ul className="mt-4 space-y-3 text-sm text-[rgb(var(--paper))]/70">
            <li><Link href="/insights" className="hover:text-[rgb(var(--paper))]">All Insights</Link></li>
            <li><Link href="/blog" className="hover:text-[rgb(var(--paper))]">Articles</Link></li>
            <li><Link href="/insights/case-studies" className="hover:text-[rgb(var(--paper))]">Case Studies</Link></li>
            <li><Link href="/results" className="hover:text-[rgb(var(--paper))]">Results Overview</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="font-display text-base sm:text-lg uppercase tracking-widest text-[rgb(var(--brass-light))]">
            Get in Touch
          </h3>
          <ul className="mt-4 space-y-3 text-sm text-[rgb(var(--paper))]/70">
            <li className="flex items-start gap-2">
              <Phone className="mt-0.5 h-4 w-4 shrink-0 text-[rgb(var(--brass-light))]" />
              <a href={`tel:${FIRM_PHONE_HREF}`} className="hover:text-[rgb(var(--paper))]">{FIRM_PHONE}</a>
            </li>
            <li className="flex items-start gap-2">
              <Mail className="mt-0.5 h-4 w-4 shrink-0 text-[rgb(var(--brass-light))]" />
              <a href={`mailto:${FIRM_EMAIL}`} className="hover:text-[rgb(var(--paper))]">{FIRM_EMAIL}</a>
            </li>
            <li className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[rgb(var(--brass-light))]" />
              <span>
                {FIRM_ADDRESS_LINES.map((line) => (
                  <span key={line} className="block">
                    {line}
                  </span>
                ))}
              </span>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-[rgb(var(--paper))]/10 px-6 py-6 lg:px-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-[rgb(var(--paper))]/50">
            &copy; {new Date().getFullYear()} Catapult Fundraising. All rights reserved.
          </p>
          <ul className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-[rgb(var(--paper))]/50">
            <li><Link href="/services/capital-campaign" className="hover:text-[rgb(var(--paper))]">Services</Link></li>
            <li><Link href="/insights" className="hover:text-[rgb(var(--paper))]">Insights</Link></li>
            <li><Link href="/cookie-policy" className="hover:text-[rgb(var(--paper))]">Cookie Policy</Link></li>
            <li><Link href="/data-privacy" className="hover:text-[rgb(var(--paper))]">Data Privacy</Link></li>
            <li><Link href="/data-privacy#addendum-3" className="hover:text-[rgb(var(--paper))]">Privacy Policy</Link></li>
            <li><Link href="/sms-terms" className="hover:text-[rgb(var(--paper))]">SMS Terms</Link></li>
          </ul>
          <p className="text-xs text-[rgb(var(--paper))]/50">
            Offices in: Nevada &middot; New Jersey &middot; Texas
          </p>
        </div>
      </div>
    </footer>
  );
}
