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
  /**
   * Testimonial ids to push to the bottom of this deck's quote section,
   * without touching the shared order in lib/testimonials.ts (which other
   * pages rely on). Listed ids run last, in the order given here.
   */
  quotesLast?: string[];
  /** Matching public service page for prospects who want more detail. */
  serviceHref?: string;
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
    serviceHref: "/services/planned-giving",
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
        "Every study client gets a private dashboard updated weekly while the study is underway: prospect tiers, dials and emails, interviews completed and scheduled, decline reasons, donor sentiment, and named contact status, plus the weekly PDF summary. This is an anonymized sample of a study in progress.",
    },
    samples: [
      {
        name: "Individual Prospect",
        description:
          "Separate income, net worth, liquidity, and five-year capacity estimates, plus family and biography, education, real estate, boards, giving history, and the donor's relationship to the client.",
        href: "/decks/capital-campaign/samples/individual-prospect-profile.pdf",
      },
      {
        name: "Corporate Prospect",
        description:
          "Company operations and revenue, leadership, giving priorities and channels, how decisions get made and when, and the giving history and approach to work.",
        href: "/decks/capital-campaign/samples/corporate-prospect-profile.pdf",
      },
      {
        name: "Foundation Prospect",
        description:
          "Three years of financials, leadership, eligibility and limitations, deadlines, the full application process, and selected grants, with how the client fits.",
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
    serviceHref: "/services/telefundraising",
  },
  {
    slug: "mid-level-engagement",
    name: "Mid-Level Engagement",
    promise: "Move mid-level donors up before they quietly lapse.",
    summary:
      "A seven stage donor journey built for the giving level most organizations neglect. Personal contact, weekly online reporting, and bi-weekly strategy meetings that turn steady mid-level givers into major gift prospects.",
    slideCount: 5,
    quoteService: "donor-engagement",
    serviceHref: "/services/mid-level-donor-program",
  },
  {
    slug: "board-development",
    name: "Board Development",
    promise: "Build a board that gives, gets, and leads.",
    summary:
      "Board assessment, prospect research, recruitment, orientation, and activation. We define the roles and expectations, build and vet the candidate pipeline, support the asks, and help new members start contributing from their first meeting.",
    slideCount: 6,
    quoteService: "board-development",
    serviceHref: "/services/board-development",
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
  const quotes = testimonialsFor(deck.quoteService);
  const last = deck.quotesLast;
  if (!last?.length) return quotes;
  const held = last
    .map((id) => quotes.find((q) => q.id === id))
    .filter((q): q is Testimonial => Boolean(q));
  return [...quotes.filter((q) => !last.includes(q.id)), ...held];
}
