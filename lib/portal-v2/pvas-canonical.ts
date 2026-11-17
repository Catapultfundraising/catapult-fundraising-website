/** Coordinated cutover acceptance. Intentionally NOT an environment toggle.
 * Enable only in the reviewed release after frozen legacy capture, backend
 * migration/reconciliation and paired independent acceptance. */
export const PVAS_CANONICAL_ACCEPTED = false;
export const pvasCanonicalEnabled = (client: string) => client === "pvas" && PVAS_CANONICAL_ACCEPTED;
