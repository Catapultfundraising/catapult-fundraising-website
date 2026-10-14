/**
 * Referral partners who promote Catapult (webinars, talks, newsletters).
 * Each partner gets an unlisted signup page at /partners/{slug}. Signups land
 * in HubSpot tagged with referral_partner = hubspotValue (multi-select in the
 * "Website Free Tools" group) and notify Anthony + the partner.
 */
export interface Partner {
  slug: string;
  name: string;
  firm: string;
  hubspotValue: string;
  notify: string[];
  intro: string;
}

export const PARTNERS: Partner[] = [
  {
    slug: "wayne-olson",
    name: "Wayne Olson",
    firm: "Wayne Olson Consulting",
    hubspotValue: "wayne_olson",
    notify: ["anthonya@catapultfr.com", "wayne@wayneolson.com"],
    intro:
      "Thanks for joining Wayne's webinar. Sign up below for free access to Catapult's fundraising articles and free planning tools, and book a time to talk through your own program.",
  },
];

export function getPartner(slug: string): Partner | undefined {
  return PARTNERS.find((p) => p.slug === slug);
}

export const BOOKING_URL = "https://go.catapultfr.com/meetings/anthonya";
