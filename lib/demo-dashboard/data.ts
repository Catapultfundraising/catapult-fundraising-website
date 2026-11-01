// Synthetic, fully fictional data for the client-facing sample dashboard (/demo-dashboard).
// Nothing here comes from a client, prospect, screening or CRM. Names are invented; emails use the
// reserved .example domain; phone numbers use the fictional 202-555-01xx range; no street addresses.
// The generator is deterministic (fixed seed) so every visitor sees the same story.

export const DEMO_ORG = "Harbor Light Community Arts";
export const DEMO_ORG_LABEL = `${DEMO_ORG} (fictional)`;
export const DEMO_AS_OF = "10/31/2026";
export const DEMO_GOAL = 5_000_000;
export const DEMO_CAMPAIGN = "Light the Harbor Campaign";

export type DonorType = "Individual" | "Household" | "Foundation" | "Corporation";
export type Stage = "Identified" | "Qualified" | "Cultivation" | "Solicitation" | "Pledged" | "Stewardship" | "Declined";
export const STAGES: readonly Stage[] = ["Identified", "Qualified", "Cultivation", "Solicitation", "Pledged", "Stewardship", "Declined"];

export interface Gift { date: string; amount: number; kind: "Annual Fund" | "Gala" | "Event" | "Memorial" | "Capital" }
export interface Payment { date: string; amount: number }
export interface Pledge { amount: number; date: string; years: number; payments: Payment[] }
export interface Note { id: string; cptid: number; date: string; kind: string; note: string; by: string; at: string; editedBy?: string; editedAt?: string }
export interface Donor {
  cptid: number;
  name: string;
  type: DonorType;
  city: string;
  email: string;
  phone: string;
  stage: Stage;
  solicitor: string;
  capacity: number;
  capacityLabel: string;
  rating: string;
  committee?: string;
  ask: number;
  gifts: Gift[];
  pledge: Pledge | null;
  notes: Note[];
  flags: string[];
}

// ---------- deterministic PRNG ----------
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CITIES = ["Harborview", "Lantern Bay", "North Quay", "Millbrook Falls", "Cedar Point", "Westhaven"];
export const SOLICITORS = ["Dana Whitlock", "Marcus Ellery", "Priya Ostrander", "Tom Brightwell", "Staff: Executive Director"];
const COMMITTEE: Record<string, string> = {
  "Dana Whitlock": "Campaign Chair", "Marcus Ellery": "Vice Chair", "Priya Ostrander": "Leadership Gifts", "Tom Brightwell": "Community Gifts",
  "Celia Marchetti": "Member", "Owen Strand": "Member",
};

// [name, type, campaign pledge (0 = none), stage, capacity, ask for open prospects]
type Seed = [string, DonorType, number, Stage, number, number];
const SEEDS: Seed[] = [
  // Committed: 36 commitments totalling exactly $4,600,000.
  ["Larkspur Family Foundation", "Foundation", 1_000_000, "Stewardship", 5_000_000, 0],
  ["Dana & Robert Whitlock", "Household", 750_000, "Stewardship", 2_500_000, 0],
  ["Brightwater Charitable Trust", "Foundation", 500_000, "Pledged", 2_500_000, 0],
  ["Marcus Ellery", "Individual", 350_000, "Pledged", 1_000_000, 0],
  ["Cobalt Ridge Engineering", "Corporation", 250_000, "Pledged", 1_000_000, 0],
  ["Priya & Sam Ostrander", "Household", 250_000, "Stewardship", 1_000_000, 0],
  ["Tidemark Savings Bank", "Corporation", 150_000, "Pledged", 500_000, 0],
  ["Eleanor Vasquez-Hale", "Individual", 150_000, "Stewardship", 500_000, 0],
  ["Quarry Lane Fund", "Foundation", 150_000, "Pledged", 500_000, 0],
  ["Tom & Alice Brightwell", "Household", 100_000, "Pledged", 500_000, 0],
  ["Celia Marchetti", "Individual", 100_000, "Stewardship", 250_000, 0],
  ["Northlight Medical Group", "Corporation", 100_000, "Pledged", 500_000, 0],
  ["Owen Strand", "Individual", 100_000, "Pledged", 250_000, 0],
  ["Heron Point Partners", "Corporation", 100_000, "Stewardship", 250_000, 0],
  ["Gwen & Arthur Pellerin", "Household", 50_000, "Pledged", 250_000, 0],
  ["Ravi Castellano", "Individual", 50_000, "Pledged", 100_000, 0],
  ["Silverleaf Insurance", "Corporation", 50_000, "Stewardship", 250_000, 0],
  ["June Okafor-Lind", "Individual", 50_000, "Pledged", 100_000, 0],
  ["Mariner's Rest Foundation", "Foundation", 50_000, "Pledged", 250_000, 0],
  ["Felix & Rosa Dunmore", "Household", 50_000, "Stewardship", 100_000, 0],
  ["Harriet Penwick", "Individual", 25_000, "Stewardship", 100_000, 0],
  ["Lantern Bay Rotary Club", "Corporation", 25_000, "Pledged", 50_000, 0],
  ["Isaac & Mina Thorvald", "Household", 25_000, "Pledged", 100_000, 0],
  ["Beatrice Calloway", "Individual", 25_000, "Stewardship", 50_000, 0],
  ["Driftwood Coffee Roasters", "Corporation", 25_000, "Pledged", 50_000, 0],
  ["Noah Feld", "Individual", 25_000, "Pledged", 50_000, 0],
  ["Lucia & Ben Arkwright", "Household", 25_000, "Stewardship", 100_000, 0],
  ["Westhaven Garden Club", "Corporation", 25_000, "Pledged", 50_000, 0],
  ["Clara Moorcroft", "Individual", 10_000, "Stewardship", 25_000, 0],
  ["Desmond & Ivy Rook", "Household", 10_000, "Stewardship", 25_000, 0],
  ["Sunil Barrowe", "Individual", 10_000, "Pledged", 25_000, 0],
  ["Patience Holloway", "Individual", 5_000, "Stewardship", 10_000, 0],
  ["Gregor & Lena Fairweather", "Household", 5_000, "Stewardship", 25_000, 0],
  ["Ada Quill", "Individual", 5_000, "Stewardship", 10_000, 0],
  ["Milo Ashgrove", "Individual", 2_500, "Stewardship", 10_000, 0],
  ["Rhea & Colm Tansy", "Household", 2_500, "Stewardship", 10_000, 0],
  // Open prospects (no commitment yet). Asks are proposals, not money.
  ["Kingfisher Family Foundation", "Foundation", 0, "Solicitation", 1_000_000, 250_000],
  ["Victor & Elise Marlowe", "Household", 0, "Solicitation", 1_000_000, 150_000],
  ["Abernathy Shipyards", "Corporation", 0, "Cultivation", 500_000, 100_000],
  ["Simone Achterberg", "Individual", 0, "Solicitation", 500_000, 100_000],
  ["Fenwick & Joy Larue", "Household", 0, "Cultivation", 250_000, 50_000],
  ["Pinecrest Community Fund", "Foundation", 0, "Qualified", 500_000, 50_000],
  ["Hollis Varga", "Individual", 0, "Cultivation", 250_000, 50_000],
  ["Saltmarsh Outfitters", "Corporation", 0, "Qualified", 100_000, 25_000],
  ["Corinne Delacroix-Wynn", "Individual", 0, "Cultivation", 100_000, 25_000],
  ["Elias & Nora Bramble", "Household", 0, "Identified", 250_000, 25_000],
  ["Theo Langridge", "Individual", 0, "Qualified", 100_000, 25_000],
  ["Morrow Valley Credit Union", "Corporation", 0, "Identified", 100_000, 10_000],
  ["Iris Penhallow", "Individual", 0, "Identified", 50_000, 10_000],
  ["Jasper & Wren Holt", "Household", 0, "Qualified", 50_000, 10_000],
  ["Opal Kettering", "Individual", 0, "Declined", 100_000, 25_000],
  // Annual donors and lapsed donors (giving history only, not campaign prospects).
  ["Rosalind Achebe-Moss", "Individual", 0, "Identified", 25_000, 0],
  ["Calvin Dunstable", "Individual", 0, "Identified", 10_000, 0],
  ["Maeve & Hugo Sterling", "Household", 0, "Identified", 25_000, 0],
  ["Winifred Coyle", "Individual", 0, "Identified", 10_000, 0],
  ["Basil Orcutt", "Individual", 0, "Identified", 5_000, 0],
  ["Lorna & Dev Pike", "Household", 0, "Identified", 10_000, 0],
  ["Ezra Mallory", "Individual", 0, "Identified", 5_000, 0],
  ["Stella Fairbanks", "Individual", 0, "Identified", 5_000, 0],
  ["Quentin Ashby", "Individual", 0, "Identified", 10_000, 0],
];

const capacityLabel = (c: number) => (c >= 1e6 ? `$${c / 1e6}M+` : `$${Math.round(c / 1e3)}K+`);
const ratingFor = (c: number) => (c >= 2_500_000 ? "1 - Transformational" : c >= 1_000_000 ? "2 - Principal" : c >= 250_000 ? "3 - Major" : c >= 50_000 ? "4 - Mid-level" : "5 - Annual");
const slug = (s: string) => s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, ".").replace(/^\.|\.$/g, "");
const iso = (y: number, m: number, d: number) => `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
const roundTo = (n: number, step: number) => Math.max(step, Math.round(n / step) * step);

function build(): Donor[] {
  const rnd = mulberry32(20261101);
  const pick = <T,>(a: readonly T[]) => a[Math.floor(rnd() * a.length)];
  return SEEDS.map(([name, type, pledgeAmt, stage, capacity, ask], i) => {
    const cptid = 900101 + i;
    const committeeName = Object.keys(COMMITTEE).find((k) => name.includes(k.split(" ")[0]) && name.includes(k.split(" ").slice(-1)[0]));
    const solicitor = committeeName === "Dana Whitlock" ? "Staff: Executive Director" : SOLICITORS[i % SOLICITORS.length];
    // Historical (pre-campaign and annual) giving, separate from the campaign.
    const gifts: Gift[] = [];
    const lapsed = i >= SEEDS.length - 4;
    const firstYear = 2014 + Math.floor(rnd() * 6);
    const lastYear = lapsed ? 2021 + Math.floor(rnd() * 2) : 2025 + (rnd() < 0.6 ? 1 : 0);
    const base = Math.max(100, capacity * (type === "Foundation" || type === "Corporation" ? 0.01 : 0.004));
    for (let y = firstYear; y <= lastYear; y++) {
      if (rnd() < 0.18) continue;
      const kind = pick(["Annual Fund", "Annual Fund", "Gala", "Event", "Memorial"] as const);
      gifts.push({ date: iso(y, 1 + Math.floor(rnd() * 12), 1 + Math.floor(rnd() * 27)), amount: roundTo(base * (0.6 + rnd() * 0.9), base >= 1000 ? 250 : 25), kind });
    }
    if (!gifts.length) gifts.push({ date: iso(2024, 6, 12), amount: roundTo(base, 25), kind: "Annual Fund" });
    gifts.sort((a, b) => a.date.localeCompare(b.date));

    let pledge: Pledge | null = null;
    if (pledgeAmt) {
      const years = pledgeAmt >= 250_000 ? 5 : pledgeAmt >= 50_000 ? 3 : 1;
      const py = 2024 + (i % 3 === 0 ? 0 : 1);
      const date = iso(py, 1 + (i % 12), 5 + (i % 20));
      const per = pledgeAmt / years;
      const payments: Payment[] = [];
      // Installments due by the as-of date (10/31/2026); a few are behind schedule.
      for (let k = 0; k < years; k++) {
        const due = py + k;
        if (due > 2026) break;
        if (due === 2026 && i % 4 === 1) break; // this year's installment still outstanding
        payments.push({ date: iso(due, 1 + (i % 12), 5 + (i % 20)), amount: per });
      }
      pledge = { amount: pledgeAmt, date, years, payments };
    }

    const notes: Note[] = [];
    const nKinds = ["Visit", "Call", "Email", "Event", "Proposal"];
    const nCount = stage === "Identified" ? 0 : 1 + (i % 3);
    for (let k = 0; k < nCount; k++) {
      const d = iso(2026, 3 + k * 2 + (i % 2), 3 + (i % 24));
      notes.push({
        id: `seed-${cptid}-${k}`, cptid, date: d, kind: nKinds[(i + k) % nKinds.length],
        note: SAMPLE_NOTES[(i + k) % SAMPLE_NOTES.length], by: solicitor.replace("Staff: ", ""), at: `${d}T15:00:00Z`,
      });
    }

    const flags: string[] = [];
    if (i % 9 === 4) flags.push("Missing email");
    if (i % 13 === 6) flags.push("Possible duplicate");
    if (lapsed) flags.push("Lapsed donor");

    const isPerson = type === "Individual" || type === "Household";
    return {
      cptid, name, type, city: CITIES[i % CITIES.length],
      email: flags.includes("Missing email") ? "" : `${slug(name).split(".")[0]}${isPerson ? "." + slug(name).split(".").slice(-1)[0] : ""}@demo-donor.example`,
      phone: `202-555-01${String(i % 100).padStart(2, "0")}`,
      stage, solicitor, capacity, capacityLabel: capacityLabel(capacity), rating: ratingFor(capacity),
      committee: committeeName ? COMMITTEE[committeeName] : undefined,
      ask, gifts, pledge, notes, flags,
    };
  });
}

const SAMPLE_NOTES = [
  "Toured the new gallery wing; very interested in the youth studio naming opportunity.",
  "Thank-you call after the pledge payment. Asked for an update on construction timeline.",
  "Sent proposal for the education endowment with recognition options.",
  "Met for coffee. Prefers a multi-year pledge aligned with their fiscal year.",
  "Attended the hard-hat preview event with family; follow up in two weeks.",
  "Board member introduction made. Next step: lunch with Campaign Chair.",
];

export const DEMO_DONORS: Donor[] = build();

// ---------- derived figures ----------
export const sum = (a: number[]) => a.reduce((s, n) => s + n, 0);
export const lifetime = (d: Donor) => sum(d.gifts.map((g) => g.amount));
export const paid = (d: Donor) => (d.pledge ? sum(d.pledge.payments.map((p) => p.amount)) : 0);
export const outstanding = (d: Donor) => (d.pledge ? d.pledge.amount - paid(d) : 0);
export const lastGift = (d: Donor) => d.gifts[d.gifts.length - 1]?.date ?? "";

export function campaignTotals(donors: Donor[] = DEMO_DONORS) {
  const pledged = donors.filter((d) => d.pledge);
  const committed = sum(pledged.map((d) => d.pledge!.amount));
  const received = sum(pledged.map(paid));
  return {
    goal: DEMO_GOAL,
    committed,
    received,
    outstanding: committed - received,
    remaining: Math.max(0, DEMO_GOAL - committed),
    pct: committed / DEMO_GOAL,
    commitments: pledged.length,
    openAsks: sum(donors.filter((d) => !d.pledge && d.ask && d.stage !== "Declined").map((d) => d.ask)),
  };
}

export function givingByYear(donors: Donor[] = DEMO_DONORS) {
  const m = new Map<number, { total: number; donors: Set<number> }>();
  for (const d of donors) for (const g of d.gifts) {
    const y = +g.date.slice(0, 4);
    const e = m.get(y) ?? { total: 0, donors: new Set<number>() };
    e.total += g.amount; e.donors.add(d.cptid); m.set(y, e);
  }
  const years = [...m.keys()].sort();
  return years.map((y) => {
    const prev = m.get(y - 1)?.donors;
    const cur = m.get(y)!.donors;
    const retained = prev ? [...prev].filter((id) => cur.has(id)).length : 0;
    return { year: y, total: m.get(y)!.total, donors: cur.size, retention: prev && prev.size ? Math.round((retained / prev.size) * 100) : 0 };
  });
}

export const PYRAMID_BANDS: { band: string; min: number; max: number }[] = [
  { band: "$1M+", min: 1_000_000, max: Infinity },
  { band: "$250K-$999K", min: 250_000, max: 999_999 },
  { band: "$100K-$249K", min: 100_000, max: 249_999 },
  { band: "$25K-$99K", min: 25_000, max: 99_999 },
  { band: "$10K-$24K", min: 10_000, max: 24_999 },
  { band: "$1K-$9K", min: 1_000, max: 9_999 },
  { band: "Under $1K", min: 0, max: 999 },
];
/** Lifetime value used for the pyramid: historical giving + campaign commitment. */
export const lifetimeWithCampaign = (d: Donor) => lifetime(d) + (d.pledge?.amount ?? 0);
export const bandOf = (n: number) => PYRAMID_BANDS.find((b) => n >= b.min && n <= b.max)!.band;
