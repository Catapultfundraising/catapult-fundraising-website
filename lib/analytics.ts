/**
 * Fires a GA4 `generate_lead` event after a form is actually submitted.
 *
 * Why this exists: the GA4 property was configured with event-create rules
 * that turned a *page view* of /contact into conversion events, so simply
 * landing on the contact page counted as a lead (several times over, since
 * more than one rule matched the same page view). A real conversion is a
 * completed submission, which is what this reports.
 *
 * gtag is only present after the visitor accepts analytics cookies (see
 * components/cookie-consent.tsx), so this is a no-op when it is missing.
 */
export function trackLeadSubmission(formId: string) {
  if (typeof window === "undefined") return;
  const gtag = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag;
  if (typeof gtag !== "function") return;
  try {
    gtag("event", "generate_lead", { form_id: formId });
  } catch {
    // Analytics must never break a form submission.
  }
}
