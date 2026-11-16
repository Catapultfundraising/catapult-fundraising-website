import "server-only";
import type { PortalClient } from "./clients";
import { directSourceConfigured } from "./direct-source-transport.server";
/** Reviewed website pairing metadata, not SQL identifiers/authority. */
export interface WebsiteDirectRegistration {
  client: PortalClient; template: string;
  /** Only exact reviewed source aliases; never infer staff identities from donor data. */
  solicitorAliases: Readonly<Record<string, string>>;
}
/** JAG pilot only. Backend remains sole authority:
 * staff-notes-asks-v1; ask/note cutovers 2026-11-15;
 * registration revision 0e2d874c397faf153ac243c506b05b2d0f2a60c74a9fd8ff8640cf3a1e252069;
 * exact constituents client_id + cptid identity owner. No inferred staff aliases. */
export const APPROVED_WEBSITE_DIRECT_REGISTRATIONS: readonly WebsiteDirectRegistration[] = Object.freeze([
  Object.freeze({ client: "jag", template: "staff-notes-asks-v1", solicitorAliases: Object.freeze({}) }),
]);
/** Acceptance of this code path, NOT deployment/configuration or import approval.
 * Missing/malformed existing source transport configuration leaves every client OFF. */
export const DIRECT_WEBSITE_INTEGRATION_ACCEPTED = true;
export const directLaneEnabled = (client: PortalClient) => DIRECT_WEBSITE_INTEGRATION_ACCEPTED && directSourceConfigured() && APPROVED_WEBSITE_DIRECT_REGISTRATIONS.some(r => r.client === client);
