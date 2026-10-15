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
  serviceChoices?: string[];
  deck?: { href: string; title: string; description: string };
  leadSource?: string;
  assignOwnerId?: string;
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
  {
    slug: "afpnj-middle-market",
    name: "AFP-NJ Middle Market webinar",
    firm: "AFP New Jersey",
    hubspotValue: "afpnj_middle_market",
    assignOwnerId: "36164952",
    notify: ["anthonya@catapultfr.com"],
    leadSource: "AFP-NJ Pre-Conference Webinar: Unlocking the Middle",
    intro:
      "How to Build a High-Performing Mid-Level Donor Program. Thanks for joining AFP-NJ's webinar. Leave your details for free access to the slides, practical fundraising tools, and a short reading list. You can also tell us which services you'd like to hear more about.",
    serviceChoices: [
      "Mid-Level Donor Engagement",
      "Annual Fund Calling",
      "Legacy Call / Planned Giving",
      "Capital Campaigns",
      "Feasibility Studies",
      "Board Development",
    ],
    deck: {
      href: "/downloads/unlocking-the-middle-afp-nj-webinar.pdf",
      title: "Unlocking the Middle: webinar slides",
      description:
        "Download the presentation PDF from Anthony's AFP-NJ Middle Market webinar.",
    },
  },
];

export function getPartner(slug: string): Partner | undefined {
  return PARTNERS.find((p) => p.slug === slug);
}

export const BOOKING_URL = "https://go.catapultfr.com/meetings/anthonya";
