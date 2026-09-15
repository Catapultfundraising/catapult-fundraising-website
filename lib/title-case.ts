// Shared "de-shouting" helper for PDF-imported text.
//
// IRS 990 and 990-PF filings are wildly inconsistent about case: names,
// addresses, officer lists, and grantee names are often typed in ALL CAPS in
// one part of the return and in Title Case in another. Rather than let that
// land in a research profile, the importers run imported strings through
// smartTitleCase().
//
// Guiding rule: only text that is already SHOUTING gets rewritten. If a line
// contains any lowercase letter, the filer wrote it deliberately and it is
// left exactly as-is. That keeps the helper from mangling correctly cased
// sentences, mixed-case brand names ("McKnight", "eBay"), or narrative prose.

// Words that stay lowercase inside a title, unless first or last.
const SMALL_WORDS = new Set([
  "a", "an", "and", "as", "at", "but", "by", "for", "from", "in", "into", "nor",
  "of", "on", "or", "over", "per", "the", "to", "up", "via", "vs", "with",
]);

// Tokens that must stay fully uppercase. Includes org/legal abbreviations,
// common nonprofit acronyms, and the two-letter USPS state codes, which show
// up constantly in 990 addresses and in our "(City, ST)" grantee suffix.
const ACRONYMS = new Set([
  "LLC", "LLP", "LP", "PC", "PLLC", "INC", "USA", "US", "U.S.", "U.S.A.",
  "EIN", "IRS", "PO", "P.O.", "II", "III", "IV", "V", "VI", "VII", "VIII",
  "IX", "X", "XI", "XII", "YMCA", "YWCA", "NAACP", "ASPCA", "STEM", "STEAM",
  "PTA", "PTO", "ROTC", "AIDS", "HIV", "CPA", "CFO", "CEO", "COO", "CTO",
  "MD", "DDS", "DVM", "JD", "MBA", "RN", "BSA", "GSA", "FFA", "4-H",
]);

// Two-letter USPS state codes. Kept separate from ACRONYMS because several
// of them ("IN", "OR", "ME", "OH") are ordinary English words: they are safe
// to preserve in an address or a "(City, ST)" suffix, but not inside prose.
const STATE_CODES = new Set([
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID",
  "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS",
  "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK",
  "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV",
  "WI", "WY", "DC", "PR", "GU",
]);

// Used by the line-oriented title-case pass, where state codes are wanted.
const KEEP_UPPER = new Set([...ACRONYMS, ...STATE_CODES]);

// PhD-style mixed-case fixes applied after the generic pass.
const EXACT_FIXES: Record<string, string> = {
  Phd: "PhD",
  "Ph.d.": "Ph.D.",
  Dds: "DDS",
  Mba: "MBA",
  Cpa: "CPA",
};

// Proper nouns worth restoring after a shouted prose field is lowercased.
const PROPER_NOUNS = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado",
  "Connecticut", "Delaware", "Florida", "Georgia", "Hawaii", "Idaho",
  "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana", "Maine",
  "Maryland", "Massachusetts", "Michigan", "Minnesota", "Mississippi",
  "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey",
  "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio",
  "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina",
  "South Dakota", "Tennessee", "Texas", "Utah", "Vermont", "Virginia",
  "Washington", "West Virginia", "Wisconsin", "Wyoming",
  "United States", "America", "American", "Canada", "Puerto Rico",
  "January", "February", "March", "April", "May", "June", "July", "August",
  "September", "October", "November", "December",
];
const PROPER_NOUN_MAP: Record<string, string> = Object.fromEntries(
  PROPER_NOUNS.map((n) => [n.toLowerCase(), n])
);
// Longest-first so "West Virginia" wins over "Virginia".
const PROSE_PROPER_NOUNS = new RegExp(
  "\\b(" +
    [...PROPER_NOUNS]
      .sort((a, b) => b.length - a.length)
      .map((n) => n.replace(/ /g, "\\s+"))
      .join("|") +
    ")\\b",
  "gi"
);

function capitalizeWord(word: string): string {
  // Handles internal punctuation: hyphens, slashes, apostrophes, periods.
  return word.replace(/[A-Za-z][A-Za-z'’.]*/g, (chunk) => {
    const upper = chunk.toUpperCase();
    if (KEEP_UPPER.has(upper)) return upper;
    let out = chunk.charAt(0).toUpperCase() + chunk.slice(1).toLowerCase();
    // Scottish/Irish name prefixes: MCDONALD -> McDonald, O'BRIEN -> O'Brien.
    if (/^Mc[a-z]{2,}$/.test(out)) out = "Mc" + out.charAt(2).toUpperCase() + out.slice(3);
    else if (/^Mac[a-z]{3,}$/.test(out)) out = "Mac" + out.charAt(3).toUpperCase() + out.slice(4);
    else if (/^O['’][a-z]{2,}$/.test(out)) out = out.slice(0, 2) + out.charAt(2).toUpperCase() + out.slice(3);
    return EXACT_FIXES[out] ?? out;
  });
}

// Title-cases one shouting segment (a line, or a sentence within a line).
function titleCaseSegment(segment: string): string {
  const parts = segment.split(/(\s+)/);
  const wordIdx: number[] = [];
  parts.forEach((p, i) => {
    if (/[A-Za-z]/.test(p)) wordIdx.push(i);
  });
  const first = wordIdx[0];
  const last = wordIdx[wordIdx.length - 1];
  return parts
    .map((part, i) => {
      if (!/[A-Za-z]/.test(part)) return part;
      const bare = part.replace(/[^A-Za-z'’.]/g, "").toLowerCase();
      if (
        i !== first &&
        i !== last &&
        SMALL_WORDS.has(bare) &&
        !KEEP_UPPER.has(bare.toUpperCase())
      ) {
        return part.toLowerCase();
      }
      return capitalizeWord(part);
    })
    .join("");
}

function isShouting(text: string): boolean {
  // At least two letters, and no lowercase letters at all.
  const letters = text.replace(/[^A-Za-z]/g, "");
  return letters.length >= 2 && letters === letters.toUpperCase();
}

/**
 * Rewrites ALL-CAPS text to Title Case, line by line, leaving anything that
 * already has lowercase letters untouched. Safe to run on any imported
 * string, including empty values and multi-line lists.
 */
export function smartTitleCase(raw: string | undefined | null): string {
  if (!raw) return "";
  return String(raw)
    .split("\n")
    .map((line) => (isShouting(line) ? titleCaseSegment(line) : line))
    .join("\n");
}

/**
 * Same idea for prose fields: 990 narrative boxes are sometimes entirely
 * uppercase. Sentence-case the field only when the whole field is shouting,
 * so a stray acronym-heavy sentence in otherwise normal prose is untouched.
 */
export function smartSentenceCase(raw: string | undefined | null): string {
  if (!raw) return "";
  const text = String(raw);
  if (!isShouting(text)) return text;
  // Lowercase everything, then restore known all-caps tokens, then capitalize
  // sentence starts. Proper nouns inside shouted prose cannot be recovered
  // reliably, so this trades that for readable text.
  const lowered = text.toLowerCase().replace(/[a-z][a-z'\u2019.]*/g, (chunk) => {
    const upper = chunk.toUpperCase();
    return ACRONYMS.has(upper) ? upper : chunk;
  });
  const sentenced = lowered.replace(/(^|[.!?]\s+|\n\s*)([a-z])/g, (_m, lead, ch) => lead + ch.toUpperCase());
  // Shouted prose loses proper nouns, so restore the ones that show up most in
  // 990 narrative boxes: place names, months, and country/region words.
  return sentenced.replace(PROSE_PROPER_NOUNS, (m) => PROPER_NOUN_MAP[m.toLowerCase()] ?? m);
}
