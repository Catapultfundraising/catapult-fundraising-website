import { Testimonial, testimonialsFor } from "@/lib/testimonials";

// Sales decks published behind the /decks password gate (see middleware.ts).
// Slides are flat images exported from the source PowerPoint files, which live
// in Anthony's OneDrive under Personal/Anthony/Sales and Marketing/Sales Decks.
// When a deck is updated, re-export the slides to public/decks/{slug}/NN.png,
// regenerate deck.pdf, and bump `slideCount` if the deck length changed.
//
// Client quotes are NOT retyped here: each deck points at a service key and
// pulls from lib/testimonials.ts, so a quote added or corrected once shows up
// everywhere on the site at the same time.

export interface Deck {
  slug: string;
  name: string;
  /** Short outcome line shown under the deck title. */
  promise: string;
  /** Longer paragraph for the index card and page hero. */
  summary: string;
  slideCount: number;
  /** Which testimonial service bucket this deck's proof comes from. */
  quoteService: Testimonial["services"][number];
  /** Matching public service page for prospects who want more detail. */
  serviceHref: string;
  /** Optional sample deliverables shown under the deck. */
  samples?: DeckSample[];
  /** Optional link to a live sample dashboard elsewhere under /decks. */
  sampleDashboard?: { href: string; name: string; description: string };
}

export interface DeckSample {
  name: string;
  description: string;
  href: string;
}

export const DECKS: Deck[] = [
  {
    slug: "legacy-call",
    name: "Legacy Call",
    promise: "Find the planned gifts already sitting in your file.",
    summary:
      "Our planned giving qualification program. Trained officers call your longtime donors, uncover who already has you in their will and who is open to it, and hand your team qualified legacy conversations instead of a mailing list.",
    slideCount: 5,
    quoteService: "legacy-giving",
    serviceHref: "/services/legacy-giving",
  },
  {
    slug: "capital-campaign",
    name: "Capital Campaign",
    promise: "One accountable partner from study through public phase.",
    summary:
      "Feasibility study, campaign counsel, and the calling muscle to finish. A senior executive, creative writer, account manager, and prospect researchers on your campaign, across four phases and a 24 to 36 month arc.",
    slideCount: 5,
    quoteService: "capital-campaign",
    serviceHref: "/services/capital-campaign",
    sampleDashboard: {
      href: "/decks/sample-dashboard",
      name: "Live feasibility study dashboard",
      description:
        "Every study client gets a private dashboard updated weekly: prospect tiers, dials and emails, completed and scheduled interviews, decline reasons, donor sentiment, and named contact status. This is an anonymized sample of a real study in progress.",
    },
    samples: [
      {
        name: "Individual Prospect",
        description:
          "Wealth and giving capacity, real estate and stock holdings, giving history, biographical detail, and contact information for a single donor.",
        href: "/decks/capital-campaign/samples/individual-prospect-profile.pdf",
      },
      {
        name: "Corporate Prospect",
        description:
          "Company overview, revenue, giving history to the client, leadership, and the sponsorship or partnership angle to work.",
        href: "/decks/capital-campaign/samples/corporate-prospect-profile.pdf",
      },
      {
        name: "Foundation Prospect",
        description:
          "Foundation overview, EIN, grantmaking priorities, trustees and executives, and how the client fits the funding focus.",
        href: "/decks/capital-campaign/samples/foundation-prospect-profile.pdf",
      },
    ],
  },
  {
    slug: "annual-fund",
    name: "Annual Fund",
    promise: "Raise more from the donors you already have.",
    summary:
      "A turnkey annual giving program: multi-channel outreach, experienced and educated engagement officers, weekly reporting on pledged revenue and collected cash, and bi-weekly calls to review results and set strategy.",
    slideCount: 5,
    quoteService: "annual-fund",
    serviceHref: "/services/annual-fund",
  },
  {
    slug: "mid-level-engagement",
    name: "Mid-Level Engagement",
    promise: "Move mid-level donors up before they quietly lapse.",
    summary:
      "A seven stage donor journey built for the giving level most organizations neglect. Personal contact, weekly online reporting, and bi-weekly strategy meetings that turn steady mid-level givers into major gift prospects.",
    slideCount: 5,
    quoteService: "donor-engagement",
    serviceHref: "/services/donor-engagement",
  },
];

export function getDeck(slug: string): Deck | undefined {
  return DECKS.find((d) => d.slug === slug);
}

export function deckSlides(deck: Deck): string[] {
  return Array.from(
    { length: deck.slideCount },
    (_, i) => `/decks/${deck.slug}/${String(i + 1).padStart(2, "0")}.png`,
  );
}

export function deckQuotes(deck: Deck): Testimonial[] {
  return testimonialsFor(deck.quoteService);
}
