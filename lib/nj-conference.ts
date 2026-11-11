/** Public event configuration shared by the form and server validation. */
export const NJ_EVENT = "nj-conference-2026-11-12";
export const NJ_CUTOFF = "2026-11-12T20:15:00.000Z";
export const NJ_NOTE_PREFIX = "CATAPULT_GIVEAWAY_V1\n";
export const NJ_SERVICES = [
  "Capital campaign planning",
  "Legacy Call / planned giving",
  "Mid-level donor programs",
  "Annual fund / donor calling",
] as const;

export type NjFields = {
  firstName: string;
  lastName: string;
  email: string;
  organization: string;
  phone: string;
  serviceInterest: string;
  marketingConsent: boolean;
};

export function validateNjFields(body: Record<string, unknown>): NjFields | null {
  const text = (key: string, max: number, required = true) => {
    const value = body[key];
    if (!required && (value === undefined || value === "")) return "";
    if (typeof value !== "string") return null;
    const cleaned = value.trim();
    return (required && !cleaned) || cleaned.length > max || /[\u0000-\u001f\u007f<>]/.test(cleaned) ? null : cleaned;
  };
  const firstName = text("firstName", 80);
  const lastName = text("lastName", 80);
  const email = text("email", 254)?.toLowerCase();
  const organization = text("organization", 160);
  const phone = text("phone", 40, false);
  const serviceInterest = text("serviceInterest", 100, false);
  if (!firstName || !lastName || !email || !organization || phone === null || serviceInterest === null) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  if (serviceInterest && !(NJ_SERVICES as readonly string[]).includes(serviceInterest)) return null;
  if (body.marketingConsent !== undefined && typeof body.marketingConsent !== "boolean") return null;
  return { firstName, lastName, email, organization, phone, serviceInterest, marketingConsent: body.marketingConsent === true };
}

/** Staff and reserved QA domains cannot enter the live draw. */
export function excludedNjEmail(email: string) {
  const domain = email.split("@")[1];
  return domain === "catapultfr.com" || domain.endsWith(".catapultfr.com") ||
    ["example.com", "example.org", "example.net", "test.com", "localhost"].includes(domain) ||
    /\.(invalid|test|localhost|example)$/.test(domain);
}
