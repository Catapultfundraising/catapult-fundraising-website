// Board / committee Prospect Review: per-client config and shared types.
// Safe for client components (no server imports).
export const BR_CLIENTS = ["jag", "csnf", "pvas", "wcbhc", "baq"] as const;
export type BrClient = (typeof BR_CLIENTS)[number];
export const isBrClient = (c: string): c is BrClient => (BR_CLIENTS as readonly string[]).includes(c);

export const BR_CLIENT_NAMES: Record<BrClient, string> = {
  jag: "JAG Nevada",
  csnf: "College of Southern Nevada Foundation",
  pvas: "Palm Valley Animal Society",
  wcbhc: "Washoe Children's Behavioral Health Center",
  baq: "Boerne Aquaplex",
};

export const BR_CHOICES = [
  { key: "A", label: "A = Fully comfortable making the ask to this prospect, serving as the primary solicitor" },
  { key: "B", label: "B = Comfortable in a secondary solicitor role with this prospect" },
  { key: "C", label: "C = Not comfortable making an ask, but could serve as a door opener to this prospect" },
  { key: "D", label: "D = Don't know this prospect" },
  { key: "O", label: "Other:" },
] as const;
export type BrChoice = (typeof BR_CHOICES)[number]["key"];
export const BR_CHOICE_SHORT: Record<string, string> = { A: "A", B: "B", C: "C", D: "D", O: "Other" };

/** One prospect on the shared review list. Only name, city and state are ever shown to members. */
export interface BrEntry { cptid: number; name: string; sortKey: string; city: string; state: string }
export interface BrList { name: string; entries: BrEntry[]; updatedAt: string; source: string }
export interface BrMemberPublic { id: string; name: string; email: string; role: string; invitedAt: string; lastSeen?: string; answered?: number }
export interface BrAnswer { choice: BrChoice | ""; other?: string; at: string }
export interface BrResponses { memberId: string; answers: Record<string, BrAnswer>; updatedAt: string }

/** Prospect row available to the Catapult setup screen (filters run server side). */
export interface BrPoolRow {
  cptid: number; name: string; kind: string; city: string; state: string;
  lifetime: number; gifts: number; largest: number; lastDate: string; lastAmt: number;
  ds: string; capacity: string; capMin: number; status: string; solicitor: string;
}
export interface BrFilters {
  capMin?: number; capMax?: number; ds?: string; assigned?: "any" | "yes" | "no";
  donor?: "any" | "donor" | "nondonor"; lifeMin?: number; lifeMax?: number;
  lastMin?: number; lastMax?: number; lastAfter?: string; lastBefore?: string;
  states?: string; kind?: "any" | "individual" | "organization"; status?: string; q?: string; limit?: number;
  sort?: "capacity" | "lifetime" | "name";
}

const SUFFIX = /^(jr|sr|ii|iii|iv|md|phd|esq|dds|cpa)\.?$/i;
const ORG = /\b(foundation|fund|trust|inc|llc|corp|corporation|company|co|bank|group|association|church|society|club|partners|university|college|school|hospital|council|enterprises|realty|insurance|ltd|lp|llp|pc)\b\.?/i;

/** Alphabetical key by LAST name ("Hugh and Denise Anderson" -> "anderson hugh and denise"). Organizations sort by full name. */
export function lastNameKey(name: string, kind = ""): string {
  const n = name.trim().replace(/\s+/g, " ");
  if (!n) return "";
  if (/org|business|corp|foundation/i.test(kind) || ORG.test(n)) return n.toLowerCase().replace(/^the /, "");
  if (n.includes(",")) { const [l, f] = n.split(","); return `${l.trim()} ${(f ?? "").trim()}`.toLowerCase(); }
  const parts = n.replace(/\(.*?\)/g, "").trim().split(" ");
  while (parts.length > 1 && SUFFIX.test(parts[parts.length - 1])) parts.pop();
  const last = parts.pop() ?? "";
  return `${last} ${parts.join(" ")}`.toLowerCase().trim();
}
