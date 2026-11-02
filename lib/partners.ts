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
  serviceChoiceGroups?: { label: string; prefix: string }[];
  followUpChoices?: { label: string; notify?: string[] }[];
  privacyNotice?: string;
  deck?: { href: string; title: string; description: string };
  leadSource?: string;
  assignOwnerId?: string;
}

export const PARTNERS: Partner[] = [
  {
    slug: "endowment-partners",
    name: "Catapult + Endowment Partners CGA webinar",
    firm: "Catapult Fundraising and Endowment Partners",
    hubspotValue: "endowment_partners_cga",
    assignOwnerId: "36164952",
    notify: ["anthonya@catapultfr.com"],
    leadSource: "Turning Donor Relationships into Charitable Gift Annuities | November 4, 2026",
    intro:
      "Thank you for joining Anthony Alonso and Diane Tuntland. Get the presentation, explore free fundraising tools, and start building your CGA program. Tell us which services interest you and whether you would like either firm to follow up.",
    serviceChoices: [
      "Catapult: Legacy Call / Planned Giving",
      "Catapult: CGA Prospect Identification and Donor Outreach",
      "Catapult: Mid-Level Donor Engagement",
      "Catapult: Annual Fund Calling",
      "Catapult: Capital Campaigns and Feasibility Studies",
      "Catapult: Board Development",
      "Endowment Partners: CGA Program Setup and Administration",
      "Endowment Partners: Investment Management",
      "Endowment Partners: Investment Consulting",
      "Endowment Partners: Governance",
      "Endowment Partners: Donor Stewardship",
    ],
    serviceChoiceGroups: [
      { label: "Catapult Fundraising", prefix: "Catapult: " },
      { label: "Endowment Partners", prefix: "Endowment Partners: " },
    ],
    followUpChoices: [
      { label: "Catapult Fundraising" },
      { label: "Endowment Partners", notify: ["diane@endowmentpartners.com"] },
      { label: "Both", notify: ["diane@endowmentpartners.com"] },
    ],
    privacyNotice:
      "Catapult Fundraising will receive your details and service interests to provide these resources and respond to your requests. If you select Endowment Partners or Both for follow-up, your details and selections will also be shared with Diane Tuntland at Endowment Partners. Follow-up is optional and is not required to download the slides.",
    deck: {
      href: "/downloads/turning-donor-relationships-into-charitable-gift-annuities.pdf",
      title: "Turning Donor Relationships into Charitable Gift Annuities",
      description: "The joint presentation from Catapult Fundraising and Endowment Partners, available as a PDF.",
    },
  },

  {
    slug: "wayne-olson",
    name: "Wayne Olson",
    firm: "Wayne Olson Consulting",
    hubspotValue: "wayne_olson",
    notify: ["anthonya@catapultfr.com", "jeffg@catapultfr.com", "wayne@wayneolson.com"],
    intro:
      "Thanks for joining Wayne's webinar. Sign up below for free access to Catapult's fundraising articles and free planning tools, and book a time to talk through your own program.",
  },
  {
    slug: "afpnj-middle-market",
    name: "AFP-NJ Middle Market webinar",
    firm: "AFP New Jersey",
    hubspotValue: "afpnj_middle_market",
    assignOwnerId: "36164952",
    notify: ["anthonya@catapultfr.com", "jeffg@catapultfr.com"],
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
    notify: ["anthonya@catapultfr.com", "gwenp@catapultfr.com", "jeffg@catapultfr.com"],
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
