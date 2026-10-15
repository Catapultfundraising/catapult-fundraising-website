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
    hubspotValue: "",
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
  {
    slug: "philly-pg-day",
    name: "Philadelphia Planned Giving Day",
    firm: "Philadelphia Planned Giving Day",
    hubspotValue: "",
    assignOwnerId: "36164952",
    notify: ["anthonya@catapultfr.com", "gwenp@catapultfr.com"],
    leadSource: "Philly PG Day: Legacy Giving as the Catalyst in Fundraising Strategies (Gwen Paxon)",
    intro:
      "Thanks for joining Gwen Paxon's session at Philadelphia Planned Giving Day. Leave your details for free access to the slides, our planned giving articles, and free tools. You can also tell us which services you'd like to hear more about.",
    serviceChoices: [
      "Legacy Call / Planned Giving",
      "Mid-Level Donor Engagement",
      "Annual Fund Calling",
      "Capital Campaigns",
      "Feasibility Studies",
      "Board Development",
    ],
    deck: {
      href: "/downloads/legacy-giving-catalyst-philly-pg-day.pdf",
      title: "Legacy Giving as the Catalyst: presentation slides",
      description:
        "Download the presentation PDF from Gwen Paxon's Philadelphia Planned Giving Day session.",
    },
  },
];

export function getPartner(slug: string): Partner | undefined {
  return PARTNERS.find((p) => p.slug === slug);
}

export const BOOKING_URL = "https://go.catapultfr.com/meetings/anthonya";
