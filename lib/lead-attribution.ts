/** Campaign labels only. Never retain visitor identity, arbitrary URLs, or private-tool paths. */
export const ATTRIBUTION_KEY = "catapult_lead_attribution";
export const ATTRIBUTION_FIELDS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;
export type LeadAttribution = Partial<Record<(typeof ATTRIBUTION_FIELDS)[number], string>>;

export function isMarketingPath(pathname: string): boolean {
  return pathname === "/" || pathname === "/contact" || pathname === "/services" || pathname.startsWith("/services/");
}

export function sanitizeAttribution(value: unknown): LeadAttribution {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const result: LeadAttribution = {};
  for (const key of ATTRIBUTION_FIELDS) {
    const item = (value as Record<string, unknown>)[key];
    // Fixed campaign labels only; reject HTML, URLs, control characters and email-shaped values.
    if (typeof item === "string" && /^[a-zA-Z0-9_.~ -]{1,120}$/.test(item)) result[key] = item;
  }
  return result;
}

export function attributionFromSearch(search: string): LeadAttribution {
  const params = new URLSearchParams(search);
  return sanitizeAttribution(Object.fromEntries(ATTRIBUTION_FIELDS.map(key => [key, params.get(key)])));
}

export function readLeadAttribution(): LeadAttribution {
  if (typeof window === "undefined") return {};
  try {
    if (window.localStorage.getItem("catapult_cookie_consent") !== "accepted" || !isMarketingPath(window.location.pathname)) return {};
    return sanitizeAttribution(JSON.parse(window.sessionStorage.getItem(ATTRIBUTION_KEY) || "{}"));
  } catch { return {}; }
}

export function captureLeadAttribution(): void {
  if (typeof window === "undefined") return;
  try {
    if (window.localStorage.getItem("catapult_cookie_consent") !== "accepted") {
      window.sessionStorage.removeItem(ATTRIBUTION_KEY);
      return;
    }
    if (!isMarketingPath(window.location.pathname)) return;
    const incoming = attributionFromSearch(window.location.search);
    // A new tagged visit replaces the prior campaign as a whole, never mixing ad labels.
    if (Object.keys(incoming).length) window.sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(incoming));
  } catch { /* Storage may be unavailable; never block navigation or a form. */ }
}

export function attributedBookingUrl(href: string, attribution: LeadAttribution): string {
  try {
    const url = new URL(href);
    if (url.protocol !== "https:" || url.hostname !== "go.catapultfr.com" || !url.pathname.startsWith("/meetings/")) return href;
    for (const [key, value] of Object.entries(sanitizeAttribution(attribution))) {
      if (!url.searchParams.has(key)) url.searchParams.set(key, value);
    }
    return url.toString();
  } catch { return href; }
}

export function attributionText(attribution: LeadAttribution): string {
  return Object.entries(sanitizeAttribution(attribution)).map(([key, value]) => `${key}: ${value}`).join("\n");
}
